import cv2
import numpy as np
from mtcnn import MTCNN

detector = MTCNN()

# Detection chhoti copy par (tez + bade/close-up faces bhi pakde jaate hain)
DETECT_WIDTH = 480

_haar = (cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
         if hasattr(cv2, "CascadeClassifier") else None)


def _largest_box_mtcnn(small_rgb):
    try:
        results = detector.detect_faces(small_rgb)
    except Exception as e:
        print(f"MTCNN error on frame: {e}")
        return None
    if not results:
        return None
    best = max(results, key=lambda r: r['box'][2] * r['box'][3])
    return best['box']


def _largest_box_haar(small_rgb):
    if _haar is None or _haar.empty():
        return None
    gray = cv2.cvtColor(small_rgb, cv2.COLOR_RGB2GRAY)
    boxes = _haar.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5,
                                   minSize=(40, 40))
    if len(boxes) == 0:
        return None
    x, y, w, h = max(boxes, key=lambda b: b[2] * b[3])
    return [int(x), int(y), int(w), int(h)]


def detect_and_crop_face(frame, target_size=(224, 224), stats=None):
    H, W = frame.shape[:2]
    scale = 1.0
    small = frame
    if W > DETECT_WIDTH:
        scale = DETECT_WIDTH / float(W)
        small = cv2.resize(frame, (DETECT_WIDTH, int(H * scale)),
                           interpolation=cv2.INTER_AREA)

    box = _largest_box_mtcnn(small)
    source = "mtcnn"
    if box is None:
        box = _largest_box_haar(small)
        source = "haar"
    if box is None:
        return None

    x, y, w, h = [int(round(v / scale)) for v in box]
    x, y = max(0, x), max(0, y)
    x2, y2 = min(W, x + w), min(H, y + h)

    face = frame[y:y2, x:x2]
    if face.size == 0 or face.shape[0] < 20 or face.shape[1] < 20:
        return None

    if stats is not None:
        stats[source] = stats.get(source, 0) + 1
    return cv2.resize(face, target_size)


def process_frames_for_faces(frames):
    face_frames = []
    valid_indices = []
    stats = {}

    for i, frame in enumerate(frames):
        face = detect_and_crop_face(frame, stats=stats)
        if face is not None:
            face_frames.append(face)
            valid_indices.append(i)

    print(f"[faces] {len(face_frames)}/{len(frames)} frames mein face mila "
          f"(MTCNN: {stats.get('mtcnn', 0)}, Haar fallback: {stats.get('haar', 0)})")
    return face_frames, valid_indices
