import torch
import torch.nn as nn
import torchvision.transforms as transforms
import timm
import numpy as np
import os

WINDOW_SIZE = 10


class ResNextLSTM(nn.Module):
    def __init__(self, hidden_size=512, num_layers=2, dropout=0.4):
        super(ResNextLSTM, self).__init__()

        resnext = timm.create_model(
            'resnext50_32x4d',
            pretrained=False,
            num_classes=0,
            global_pool='avg'
        )
        self.cnn = resnext

        self.lstm = nn.LSTM(
            input_size=2048,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout,
            bidirectional=True
        )

        self.classifier = nn.Sequential(
            nn.Linear(hidden_size * 2, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        batch, frames, C, H, W = x.shape
        x = x.view(batch * frames, C, H, W)
        features = self.cnn(x)
        features = features.view(batch, frames, -1)
        lstm_out, _ = self.lstm(features)
        last = lstm_out[:, -1, :]
        return self.classifier(last)


class FeatureExtractor:
    def __init__(self, model_path=None):
        self.model = ResNextLSTM()

        if model_path and os.path.exists(model_path):
            self.model.load_state_dict(
                torch.load(model_path, map_location='cpu')
            )
            print("Trained model loaded!")
        else:
            print("No trained model found — using base features")

        self.model.eval()

        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def extract(self, face_frames, batch_size=32):
        """CNN features, batch mein (frame-by-frame se kaafi tez)."""
        feats = []
        with torch.no_grad():
            for i in range(0, len(face_frames), batch_size):
                chunk = face_frames[i:i + batch_size]
                batch = torch.stack([self.transform(f) for f in chunk])
                feats.append(self.model.cnn(batch).numpy())
        if not feats:
            return np.zeros((0, 2048), dtype=np.float32)
        return np.concatenate(feats, axis=0)

    def predict_from_features(self, features):
        """
        Already nikale hue CNN features se LSTM+classifier chalata hai,
        taaki CNN dobara na chalana pade. Poore video par 10-10 frame ki
        windows ka average leta hai.
        """
        n = len(features)
        if n == 0:
            return 0.5

        feats = torch.from_numpy(np.asarray(features, dtype=np.float32))
        W = WINDOW_SIZE

        if n < W:
            idx = list(range(n)) + [n - 1] * (W - n)
            windows = feats[idx].unsqueeze(0)
        else:
            starts = list(range(0, n - W + 1, W))
            if starts[-1] + W < n:
                starts.append(n - W)  # bachi hui tail frames bhi cover ho
            windows = torch.stack([feats[s:s + W] for s in starts])

        with torch.no_grad():
            lstm_out, _ = self.model.lstm(windows)
            probs = self.model.classifier(lstm_out[:, -1, :]).reshape(-1)

        print(f"[windows] n={len(probs)} min={probs.min():.2f} "
              f"median={probs.median():.2f} max={probs.max():.2f}")

        return float(probs.mean().item())

    def predict_video(self, face_frames):
        if len(face_frames) == 0:
            return 0.5
        return self.predict_from_features(self.extract(face_frames))