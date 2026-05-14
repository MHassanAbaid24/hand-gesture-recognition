# Hand Gesture Recognition

Machine learning API that predicts hand gestures from image uploads.

## Directory Structure

```
hand-gesture-recognition/
├── backend/                        # FastAPI backend application
│   ├── main.py                    # FastAPI app with /health and /predict routes
│   ├── requirements.txt            # Python dependencies (FastAPI, PyTorch, MediaPipe, etc.)
│   ├── model/                     # PyTorch model code and configuration
│   │   ├── config/                # Model weights, configurations, and training reference
│   │   │   ├── asl_cnn_skeleton_ultimate.pth  # Pre-trained skeletal CNN weights
│   │   │   ├── config.json        # Model setup configuration
│   │   │   ├── hand_landmarker.task  # MediaPipe landmarker task for skeletal extraction
│   │   │   ├── metadata.json      # Class labels and model metadata
│   │   │   └── model_training_code_reference.ipynb # Reference training notebook
│   │   └── model.py               # PyTorch CNN model architecture definition
│   ├── services/                  # Business logic
│   │   └── predict.py             # Prediction service using MediaPipe & PyTorch
│   ├── schemas/                   # Pydantic request/response schemas
│   │   └── predictedResponseSchema.py  # API response schema
│   └── test-images/               # Sample images for local inference testing
├── frontend/                      # Full Single-Page Application (SPA)
│   ├── index.html                 # Entry point of the UI
│   ├── package.json               # Frontend dependencies & test scripts (Jest, etc.)
│   ├── css/                       # Modular stylesheets (layout, neurosign components, etc.)
│   ├── js/                        # ES6 modules for app logic (visualizers, orchestrator, upload)
│   └── tests/                     # Jest unit tests for frontend ES modules
├── docs/                          # Documentation, research papers, and guides
└── .env.example                   # Environment variables template
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
- **asl_cnn_skeleton_ultimate.pth** - Pre-trained PyTorch skeletal CNN model weights for inference

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

