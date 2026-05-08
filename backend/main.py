# Routes + Implementation (FastAPI)

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from backend.schemas.predictedResponseSchema import PredictedResponse
from backend.services.predict import run_prediction

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*']
)


    

@app.get('/health')
def health():
    return {"status": "ok"}


@app.post('/predict', response_model=PredictedResponse)
async def predict(file: UploadFile = File(...)):
    return await run_prediction(file)