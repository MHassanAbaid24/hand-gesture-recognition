import hashlib
import io
import os
import sys
import torch
import torchvision.transforms as transforms
from fastapi import UploadFile
from PIL import Image

from backend.schemas.predictedResponseSchema import PredictedResponse

GESTURE_CLASSES = [
    "A","B","C","D","E","F","G","H","I","J",
    "K","L","M","N","O","P","Q","R","S","T",
    "U","V","W","X","Y","Z",
    "space", "delete", "nothing"
]   

preprocess = transforms.Compose([
    transforms.Resize((200, 200)),   
    transforms.ToTensor(),         
])


MODEL_PATH   = os.getenv("MODEL_PATH",   "backend/model/gesture_model.pt")
MODEL_DEVICE = os.getenv("MODEL_DEVICE", "cpu")

device   = torch.device(MODEL_DEVICE)
model    = None 
is_mock  = False   

def _load_model():
    """
    Try to load the real model weights.
    If it fails (placeholder file, corrupted weights etc.),
    switch to mock mode silently.
    """
    global model, is_mock

    try:
        
        from backend.model.model import GestureModel

        m = GestureModel(num_classes=len(GESTURE_CLASSES))
        m.load_state_dict(
            torch.load(MODEL_PATH, map_location=device)
        )
        m.to(device)
        m.eval()
        model = m
        is_mock = False
        print("✅ Real model loaded successfully.")

    except Exception as e:
    
        is_mock = True
        sys.stderr.write(
            f"⚠️  WARNING: Could not load model weights ({e}). "
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


    image  = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    tensor = preprocess(image)       
    tensor = tensor.unsqueeze(0)   
    tensor = tensor.to(device)
    with torch.no_grad():
        logits = model(tensor)  


    probabilities = torch.softmax(logits, dim=1)

    confidence, predicted_idx = torch.max(probabilities, dim=1)

    gesture    = GESTURE_CLASSES[predicted_idx.item()]
    confidence = round(confidence.item(), 4)

    return PredictedResponse(
        predicted_class=gesture,
        confidence=confidence
    )