# Hand Gesture Recognition

Machine learning API that predicts hand gestures from image uploads.

## Directory Structure

```
hand-gesture-recognition/
├── backend/                    # FastAPI backend application
│   ├── main.py                # FastAPI app with /health and /predict routes
│   ├── requirements.txt        # Python dependencies (FastAPI, Uvicorn)
│   ├── model/                 # PyTorch model code and weights
│   │   ├── model.py           # Model architecture definition
│   │   └── gesture_model.pt   # Pre-trained model weights
│   ├── services/              # Business logic
│   │   └── predict.py         # Prediction service implementation
│   └── schemas/               # Pydantic request/response models
│       └── predictedResponseSchema.py  # API response format
├── frontend/                  # Frontend application (placeholder)
├── docs/                      # Documentation and research materials
├── .env.example               # Environment variables template
└── venv/                      # Python virtual environment (git-ignored)
```

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Run backend:**
   ```bash
   cd backend && python -m uvicorn main:app --reload
   ```

4. **Test API:**
   ```bash
   curl http://localhost:8000/health
   ```

## Key Files

- **main.py** - Entry point for the FastAPI server
- **.env.example** - Template for configuration (MODEL_PATH, MODEL_DEVICE, CORS settings, file upload limits)
- **requirements.txt** - FastAPI and Uvicorn dependencies
- **gesture_model.pt** - Pre-trained PyTorch model for inference

## Architecture

The API accepts image uploads and returns predicted gesture class with confidence score via the `/predict` endpoint.
