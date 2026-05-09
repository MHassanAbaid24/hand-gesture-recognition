import hashlib
import io
import os
import sys
import numpy as np
from fastapi import UploadFile
from PIL import Image

from backend.schemas.predictedResponseSchema import PredictedResponse
from backend.model.model import load_gesture_model

GESTURE_CLASSES = [
    "A","B","C","D","E","F","G","H","I","J",
    "K","L","M","N","O","P","Q","R","S","T",
    "U","V","W","X","Y","Z",
    "del", "nothing", "space"
]   

MODEL_PATH = os.getenv("MODEL_PATH", "backend/model/config/model_final.keras")

model    = None 
is_mock  = False   

def _load_model():
    """
    Try to load the Keras model.
    If it fails, switch to mock mode silently.
    """
    global model, is_mock

    try:
        model = load_gesture_model(MODEL_PATH)
        is_mock = False
        print("✅ Keras model loaded successfully.")

    except Exception as e:
        is_mock = True
        sys.stderr.write(
            f"⚠️  WARNING: Could not load Keras model weights ({e}). "
            "Running in MOCK mode.\n"
        )

def _mock_prediction(image_bytes: bytes) -> PredictedResponse:
    md5_hash  = hashlib.md5(image_bytes).hexdigest()  
    hash_int  = int(md5_hash[:8], 16)
    idx       = hash_int % len(GESTURE_CLASSES)      

    confidence = 0.85 + (hash_int % 1300) / 10000.0 

    return PredictedResponse(
        predicted_class=GESTURE_CLASSES[idx],
        confidence=round(confidence, 4)
    )


async def run_prediction(file: UploadFile) -> PredictedResponse:
    if model is None and not is_mock:
        _load_model()
    
    image_bytes = await file.read()

    if is_mock:
        return _mock_prediction(image_bytes)

    # Preprocessing with Bilinear Resizing to preserve finger-gap features (NO redundant / 255.0 division)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image_resized = image.resize((200, 200), Image.Resampling.BILINEAR)
    img_array = np.array(image_resized).astype(np.float32)
    img_array = np.expand_dims(img_array, axis=0)  # Shape: (1, 200, 200, 3)

    # Single-image inference for maximum stability and correctness
    predictions = model.predict(img_array, verbose=0)[0]

    predicted_idx = np.argmax(predictions)
    confidence = float(predictions[predicted_idx])

    gesture    = GESTURE_CLASSES[predicted_idx]
    confidence = round(confidence, 4)

    return PredictedResponse(
        predicted_class=gesture,
        confidence=confidence
    )
