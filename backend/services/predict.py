# Task 3
from schemas.predictedResponseSchema import PredictedResponse
from fastapi import File, UploadFile


def run_prediction(file: UploadFile) -> PredictedResponse:
    pass