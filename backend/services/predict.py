import io
import os
import sys
import torch
import numpy as np
from fastapi import UploadFile, HTTPException
from PIL import Image, ImageDraw
import torchvision.transforms as T
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from backend.schemas.predictedResponseSchema import PredictedResponse
from backend.model.model import load_gesture_model

# Core Singletons
_MODEL = None
_LABELS = None
_DETECTOR = None

# Static Topology Links for the Drawing Engine
HAND_LINKS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (17, 18), (18, 19), (19, 20),
    (0, 17)
]

def _init_systems():
    """Safely mounts model weights and detector graph exactly once"""
    global _MODEL, _LABELS, _DETECTOR
    if _MODEL is not None:
        return

    # 1. Initialize High-Precision Task Graph
    task_p = os.path.abspath("backend/model/config/hand_landmarker.task")
    if not os.path.exists(task_p):
        raise RuntimeError(f"MediaPipe task file not found at: {task_p}")
        
    base_options = python.BaseOptions(model_asset_path=task_p)
    options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=1)
    _DETECTOR = vision.HandLandmarker.create_from_options(options)

    # 2. Secure Final Validated Geometry Weights
    model_p = os.path.abspath("backend/model/config/asl_cnn_skeleton_ultimate.pth")
    if not os.path.exists(model_p):
        raise RuntimeError(f"Weights not found. Please ensure 'asl_cnn_skeleton_ultimate.pth' is in configuration folder.")

    checkpoint = torch.load(model_p, map_location="cpu")
    _LABELS = checkpoint["classes"]
    _MODEL = load_gesture_model(model_p)
    _MODEL.eval()
    print("✅ Hybrid Inference Engine initialized successfully.")

def render_skeleton_art(lms, should_mirror=False, size=100):
    """Digitally reconstructs geometry and optionally mirrors to right-hand orientation"""
    # Perform coordinate space projection
    xs = [lm.x for lm in lms]
    ys = [lm.y for lm in lms]
    
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    
    side = max((xmax - xmin), (ymax - ymin)) * 1.3
    midx, midy = (xmin + xmax) / 2, (ymin + ymax) / 2
    
    canvas = Image.new("RGB", (size, size), (0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    
    pts = []
    for lm in lms:
        lx = (lm.x - midx) / side + 0.5
        ly = (lm.y - midy) / side + 0.5
        
        # KEY FIX: If left hand, flip the X position to match RIGHT hand domain
        if should_mirror:
            lx = 1.0 - lx
            
        pts.append((int(lx * size), int(ly * size)))
        
    for s, e in HAND_LINKS:
        draw.line([pts[s], pts[e]], fill=(255, 255, 255), width=3)
        
    for pt in pts:
        draw.ellipse([pt[0] - 2, pt[1] - 2, pt[0] + 2, pt[1] + 2], fill=(255, 255, 255))
        
    return canvas

async def run_prediction(file: UploadFile) -> PredictedResponse:
    """Final Master Pipeline: Multi-Perspective Geometry Consensus"""
    _init_systems()
    
    contents = await file.read()
    pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.array(pil_img))
    results = _DETECTOR.detect(mp_img)
    
    if not results.hand_landmarks:
        # Semantic Definition: Absence of recognizable hand structures is defined as 'nothing'
        return PredictedResponse(
            predicted_class="nothing",
            confidence=1.0
        )
        
    lms = results.hand_landmarks[0]
    
    # 1. Render BOTH orientations to guarantee dataset-alignment consensus
    skel_a = render_skeleton_art(lms, should_mirror=False)
    skel_b = render_skeleton_art(lms, should_mirror=True)
    
    pipe = T.Compose([
        T.ToTensor(),
        T.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
    ])
    
    # Batch execute for instantaneous inference response
    t_input = torch.cat([pipe(skel_a).unsqueeze(0), pipe(skel_b).unsqueeze(0)], dim=0)
    
    with torch.no_grad():
        output = _MODEL(t_input)
        probs = torch.softmax(output, dim=1) # shape: (2, 29)
        
    # Find top candidate from both views
    max_vals, max_idxs = torch.max(probs, dim=1)
    
    # Select the dominant perspective with supreme consensus
    if max_vals[0] >= max_vals[1]:
        conf, final_idx = max_vals[0], max_idxs[0]
    else:
        conf, final_idx = max_vals[1], max_idxs[1]
    
    return PredictedResponse(
        predicted_class=_LABELS[final_idx.item()],
        confidence=float(conf.item())
    )
