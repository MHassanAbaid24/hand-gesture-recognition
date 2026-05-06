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

---

## Frontend Application

The project includes a professional, responsive, and animated single-page application (SPA) for the hand gesture recognition interface. It features:
- **Rich Aesthetics**: Light-theme styling with beautiful indigo-to-purple and cyan-to-teal gradients, backdrop-blurred glassmorphic cards, and tactile button feedback.
- **GSAP Animations**: Fluid landing page entrance sequences, background parallax elements, dynamic score tickers, and smooth loading skeletons.
- **Dual Inputs**: Choose between drag-and-drop file uploads (with MIME-type verification) or live camera streams to capture and predict on-demand.
- **Accessibility**: Semantic HTML5 markup, full keyboard tab focus outlines, and high-contrast color choices meeting WCAG AA standards.

### Running the Frontend Locally

Since the frontend is built entirely using vanilla HTML/CSS/JS ES6 modules, no complex build tools or compilers are needed. You can serve the static files using any local web server:

1. **Using Python's Built-in Server:**
   ```bash
   # Navigate to the frontend directory
   cd frontend
   # Start the HTTP server on port 8080 (or any other port)
   python -m http.server 8080
   ```

2. **Using Node's live-server (if installed):**
   ```bash
   cd frontend
   npx live-server
   ```

3. **Accessing the App:**
   Open your browser and navigate to `http://localhost:8080` (or the port specified by your server). Ensure the backend is running concurrently on `http://localhost:8000` to execute real-time gesture predictions.

