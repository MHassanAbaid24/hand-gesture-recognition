import os
import torch
import torch.nn as nn

class HandGestureCNN(nn.Module):
    def __init__(self, num_classes: int = 29):
        super().__init__()

        def build_block(c_in, c_out, ks):
            return nn.Sequential(
                nn.Conv2d(c_in, c_out, kernel_size=ks, padding=ks//2, bias=False),
                nn.BatchNorm2d(c_out),
                nn.LeakyReLU(0.1, inplace=True),
                nn.MaxPool2d(kernel_size=2, stride=3)
            )

        self.feats = nn.Sequential(
            build_block(3, 8, 19),
            build_block(8, 16, 17),
            build_block(16, 32, 15)
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(p=0.3),
            nn.Linear(32 * 4 * 4, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.feats(x)
        return self.classifier(x)

def load_gesture_model(model_path="backend/model/config/asl_cnn_best.pth"):
    """
    Loads architecture and injects weights from the state dict.
    Sets model to evaluation mode.
    """
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"PyTorch model weights not found at {model_path}")
    
    model = HandGestureCNN()
    checkpoint = torch.load(model_path, map_location="cpu")
    
    if "model_state" in checkpoint:
        model.load_state_dict(checkpoint["model_state"])
    else:
        model.load_state_dict(checkpoint)
        
    model.eval()
    return model
