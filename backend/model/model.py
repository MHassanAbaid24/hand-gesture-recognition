import json
import os
import tensorflow as tf

def load_gesture_model(config_path="backend/model/config/config.json", weights_path="backend/model/config/model.weights.h5"):
    """
    Loads the Keras model architecture from config.json and weights from model.weights.h5.
    """
    if not os.path.exists(config_path) or not os.path.exists(weights_path):
        raise FileNotFoundError(f"Model config or weights not found at {config_path} / {weights_path}")

    with open(config_path, "r") as f:
        model_config = f.read()
    
    # Keras 3 model_from_json handles the serialized JSON string
    model = tf.keras.models.model_from_json(model_config)
    model.load_weights(weights_path)
    return model

class GestureModel:
    """
    A wrapper or placeholder if needed for compatibility, 
    but we'll primarily use load_gesture_model directly.
    """
    pass
