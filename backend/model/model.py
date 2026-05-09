import json
import os
import tensorflow as tf

def load_gesture_model(model_path="backend/model/config/model_final.keras"):
    """
    Loads the Keras model directly from the self-contained .keras file.
    """
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
    
    return tf.keras.models.load_model(model_path)

class GestureModel:
    """
    A wrapper or placeholder if needed for compatibility, 
    but we'll primarily use load_gesture_model directly.
    """
    pass
