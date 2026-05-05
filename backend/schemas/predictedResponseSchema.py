from pydantic import BaseModel

class PredictedResponse(BaseModel):
    predicted_class: str
    confidence: float