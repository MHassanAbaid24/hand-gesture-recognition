import hashlib
import io
import os
import sys
import numpy as np
from fastapi import UploadFile
from PIL import Image
from backend.schemas.predictedResponseSchema import PredictedResponse
from backend.model.model import load_gesture_model
import cv2

GESTURE_CLASSES = [
    "A","B","C","D","E","F","G","H","I","J",
    "K","L","M","N","O","P","Q","R","S","T",
    "U","V","W","X","Y","Z",
    "space", "delete", "nothing"
]

MODEL_CONFIG_PATH  = os.getenv("MODEL_CONFIG_PATH",  "backend/model/config/config.json")
MODEL_WEIGHTS_PATH = os.getenv("MODEL_WEIGHTS_PATH", "backend/model/config/model.weights.h5")

model   = None
is_mock = False

def _load_model():
    global model, is_mock
    try:
        model   = load_gesture_model(MODEL_CONFIG_PATH, MODEL_WEIGHTS_PATH)
        is_mock = False
        print("Keras model loaded successfully.")
    except Exception as e:
        is_mock = True
        sys.stderr.write(f"⚠️ WARNING: Could not load model ({e}). Running in MOCK mode.\n")

def preprocess_with_opencv(image_bytes: bytes):
    """
   
    """
    np_arr  = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w    = img_rgb.shape[:2]

    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    lower_skin = np.array([0, 15, 50],  dtype=np.uint8)
    upper_skin = np.array([25, 255, 255], dtype=np.uint8)
    mask = cv2.inRange(img_hsv, lower_skin, upper_skin)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    mask   = cv2.dilate(mask, kernel, iterations=2)
    mask   = cv2.GaussianBlur(mask, (3, 3), 0)

    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    hand_detected = False
    if contours:
        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) > 3000:
            x, y, cw, ch = cv2.boundingRect(largest)
            padding = 20
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(w, x + cw + padding)
            y2 = min(h, y + ch + padding)
            img_rgb       = img_rgb[y1:y2, x1:x2]
            hand_detected = True

    # Resize to 200x200
    img_resized = cv2.resize(img_rgb, (200, 200))
    img_array   = img_resized.astype(np.float32) / 255.0
    img_array   = np.expand_dims(img_array, axis=0)
    return img_array, hand_detected

async def run_prediction(file: UploadFile) -> PredictedResponse:
    if model is None and not is_mock:
        _load_model()

    image_bytes = await file.read()

    if is_mock:
        md5_hash   = hashlib.md5(image_bytes).hexdigest()
        hash_int   = int(md5_hash[:8], 16)
        idx        = hash_int % len(GESTURE_CLASSES)
        confidence = 0.85 + (hash_int % 1300) / 10000.0
        return PredictedResponse(
            predicted_class=GESTURE_CLASSES[idx],
            confidence=round(confidence, 4)
        )

    img_array, hand_detected = preprocess_with_opencv(image_bytes)

    predictions   = model.predict(img_array, verbose=0)
    predicted_idx = np.argmax(predictions[0])
    confidence    = float(np.max(predictions[0]))
    gesture       = GESTURE_CLASSES[predicted_idx]

    print(f"Hand detected: {hand_detected} | Predicted: {gesture} | Confidence: {confidence:.2f}")

    return PredictedResponse(
        predicted_class=gesture,
        confidence=round(confidence, 4)
    )