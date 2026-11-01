"""Chhote helpers: SHA-256, JPEG->base64, model version, aur GET /model-info."""
import base64
import hashlib
import json
import os

import cv2
from fastapi import APIRouter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

router = APIRouter()


def sha256_file(path, chunk=1024 * 1024):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def jpeg_b64(rgb, size=None, quality=82):
    """RGB uint8 image -> base64 JPEG text. size=(w,h) to shrink."""
    img = rgb
    if size is not None:
        img = cv2.resize(img, size, interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buf).decode("utf-8") if ok else None


def model_version(model_path):
    """Model file ka chhota fingerprint, taaki report mein pata rahe kaunsa model use hua."""
    if not os.path.exists(model_path):
        return "no trained model"
    return "resnext50+bilstm " + sha256_file(model_path)[:12]


def load_threshold(default):
    """models/threshold.json (Kaggle export se) ho to uska value, warna default."""
    path = os.path.join(MODELS_DIR, "threshold.json")
    try:
        with open(path) as f:
            value = float(json.load(f)["threshold"])
        if 0.05 <= value <= 0.95:
            return value, True
    except Exception:
        pass
    return default, False


@router.get("/model-info")
def model_info():
    """models/test_results.json ho to uske asli test numbers, warna available=False."""
    path = os.path.join(MODELS_DIR, "test_results.json")
    try:
        with open(path) as f:
            res = json.load(f)
        t = res.get("test_at_val_threshold") or res.get("test_at_0.5")
        return {"available": True, "n_test": t["n"], "test_accuracy": t["accuracy"], "test_auc": t.get("auc")}
    except Exception:
        return {"available": False}
