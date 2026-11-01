from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
import hashlib
import os
import sys
import uuid
import time
import threading

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.frame_extractor import extract_frames
from utils.face_detector import process_frames_for_faces
from utils.feature_extractor import FeatureExtractor
from utils.temporal_model import TemporalAnalyzer
from utils.analyzer import WhyFakeEngine
from utils.gradcam import GradCAM
from utils.report_generator import generate_pdf_report, HindiFontUnavailable
from utils.audio_analyzer import (load_audio_once, analyze_audio_consistency,
                                  analyze_lip_sync, analyze_voice_clone)
from model_artifact import ensure_production_checkpoint
import accounts
import extras

import numpy as np

# ---------------- Settings ----------------
FRAME_SAMPLE_FPS = 10
ENABLE_VOICE_CLONE = False   # Wav2Vec2 har request pe load hota tha -> bahut slow. True karne se pehle sochna.
FAKE_THRESHOLD = 0.5         # models/threshold.json mile to wahi use hota hai (neeche dekho)
MAX_UPLOAD_MB = 300
HEATMAP_FRAMES = 4           # kitne frames ka heatmap dikhana hai
THUMBS_PER_SEGMENT = 3
# ------------------------------------------

app = FastAPI(title="DeepTrace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, 'models', 'best_model.pth')
ensure_production_checkpoint(model_path)
feature_extractor = FeatureExtractor(model_path=model_path)
temporal_analyzer = TemporalAnalyzer(threshold=0.65)
if temporal_analyzer.lstm_model is None:
    print("NOTE: No trained temporal LSTM model found — using heuristic frame-drift analysis for confidence-over-time timeline.")
why_fake_engine = WhyFakeEngine()
gradcam = GradCAM(feature_extractor)

FAKE_THRESHOLD, _from_file = extras.load_threshold(FAKE_THRESHOLD)
MODEL_VERSION = extras.model_version(model_path)
print(f"[config] verdict cutoff = {FAKE_THRESHOLD} ({'models/threshold.json' if _from_file else 'default in main.py'}) | model = {MODEL_VERSION}")

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

accounts.init_db()
app.include_router(accounts.router)
app.include_router(extras.router)

# Ek time par ek hi analysis (CPU heavy hai, aur GradCAM ke hooks shared hain)
_analysis_lock = threading.Lock()


def save_upload(file: UploadFile):
    """Safe UUID naam se save karta hai. Return: (path, sha256 hex)."""
    original_ext = os.path.splitext(file.filename)[1] if file.filename else ".mp4"
    video_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{original_ext}")
    h = hashlib.sha256()
    size = 0
    try:
        with open(video_path, "wb") as f:
            while True:
                block = file.file.read(1024 * 1024)
                if not block:
                    break
                size += len(block)
                if size > MAX_UPLOAD_MB * 1024 * 1024:
                    raise HTTPException(413, f"Video is larger than {MAX_UPLOAD_MB} MB.")
                h.update(block)
                f.write(block)
    except Exception:
        if os.path.exists(video_path):
            os.remove(video_path)
        raise
    return video_path, h.hexdigest()


def pick_indices(n, k):
    """0..n-1 mein se k barabar doori wale index."""
    if n <= 0:
        return []
    if n <= k:
        return list(range(n))
    return sorted(set(int(round(i)) for i in np.linspace(0, n - 1, k)))


def run_core_analysis(video_path: str):
    t0 = time.time()

    frames, timestamps = extract_frames(video_path, fps=FRAME_SAMPLE_FPS)
    if len(frames) == 0:
        return {"error": "No frames extracted from video"}
    print(f"[timing] frames: {len(frames)} in {time.time()-t0:.1f}s")

    face_frames, valid_indices = process_frames_for_faces(frames)
    if len(face_frames) == 0:
        return {"error": "No faces detected in video"}
    print(f"[timing] faces: {len(face_frames)} done at {time.time()-t0:.1f}s")

    frames_sampled = len(frames)
    del frames  # memory: ab sirf face crops chahiye

    valid_timestamps = [timestamps[i] for i in valid_indices]
    total_duration = valid_timestamps[-1] if valid_timestamps else 1

    # CNN features sirf ek baar nikalte hain, prediction unhi se hoti hai
    features = feature_extractor.extract(face_frames)
    video_fake_prob = feature_extractor.predict_from_features(features)
    print(f"[timing] model done at {time.time()-t0:.1f}s, fake_prob={video_fake_prob:.3f}")

    drift_scores = temporal_analyzer.compute_feature_drift(features)
    fake_probs = temporal_analyzer.compute_fake_probability(features, drift_scores)

    is_fake = video_fake_prob > FAKE_THRESHOLD

    if is_fake:
        fake_segments = temporal_analyzer.get_fake_segments(fake_probs, valid_timestamps)
        if not fake_segments:
            fake_segments = [{
                "start": 0,
                "end": total_duration,
                "avg_confidence": round(video_fake_prob, 3)
            }]

        ts_arr = np.array(valid_timestamps)
        for seg in fake_segments:
            # timestamp -> frame index (face-less frames skip hone ke baad bhi sahi)
            start_idx = int(np.searchsorted(ts_arr, seg['start'], side='left'))
            end_idx = int(np.searchsorted(ts_arr, seg['end'], side='right'))
            end_idx = min(end_idx, len(face_frames))
            start_idx = min(start_idx, len(face_frames) - 1)
            seg_faces = face_frames[start_idx:end_idx]
            seg_features = features[start_idx:end_idx]
            if len(seg_faces) > 0:
                seg_blink = why_fake_engine.analyze_blink(seg_faces)
                seg_lip = why_fake_engine.analyze_lip_sync(seg_faces)
                seg_drift = why_fake_engine.analyze_feature_drift(seg_features) if len(seg_features) > 1 else 0.5
                seg['reasons'] = why_fake_engine.get_reasons(seg_blink, seg_lip, seg_drift)
                seg['severity'] = 'High' if seg['avg_confidence'] >= 0.8 else 'Medium' if seg['avg_confidence'] >= 0.6 else 'Low'
                seg['thumbs'] = [extras.jpeg_b64(seg_faces[i], size=(112, 112), quality=75)
                                 for i in pick_indices(len(seg_faces), THUMBS_PER_SEGMENT)]
            else:
                seg['reasons'] = ["Manipulation detected"]
                seg['severity'] = 'Medium'
                seg['thumbs'] = []
    else:
        fake_probs = [video_fake_prob] * len(valid_timestamps)
        fake_segments = []

    blink_score = why_fake_engine.analyze_blink(face_frames)
    lip_score = why_fake_engine.analyze_lip_sync(face_frames)
    drift_score = why_fake_engine.analyze_feature_drift(features)

    if is_fake:
        reasons = why_fake_engine.get_reasons(blink_score, lip_score, drift_score)
        authenticity_score = round((1 - video_fake_prob) * 100, 1)
        authenticity_score = max(10.0, min(45.0, authenticity_score))
        risk = "high"
        color = "red"
    else:
        reasons = ["No manipulation detected", "Video appears authentic"]
        authenticity_score = round((1 - video_fake_prob) * 100, 1)
        authenticity_score = max(75.0, min(99.0, authenticity_score))
        risk = "low"
        color = "green"

    audio_y, audio_sr = load_audio_once(video_path)
    audio_analysis = analyze_audio_consistency(audio_y, audio_sr)
    print(f"[timing] all done at {time.time()-t0:.1f}s")

    return {
        "face_frames": face_frames,
        "frames_sampled": frames_sampled,
        "features": features,
        "valid_timestamps": valid_timestamps,
        "total_duration": total_duration,
        "video_fake_prob": video_fake_prob,
        "is_fake": is_fake,
        "fake_probs": fake_probs,
        "fake_segments": fake_segments,
        "blink_score": blink_score,
        "lip_score": lip_score,
        "drift_score": drift_score,
        "reasons": reasons,
        "authenticity": {"score": authenticity_score, "risk": risk, "color": color},
        "audio_y": audio_y,
        "audio_sr": audio_sr,
        "audio_analysis": audio_analysis,
    }


@app.get("/")
def root():
    return {"status": "DeepTrace backend running"}


# NOTE: "def" (async def nahi) — heavy CPU kaam FastAPI ke threadpool mein chalta hai,
# isse server block nahi hota.
@app.post("/analyze")
def analyze_video(file: UploadFile = File(...), user=Depends(accounts.current_user)):
    video_path, video_sha = save_upload(file)

    try:
        with _analysis_lock:
            core = run_core_analysis(video_path)
            if "error" in core:
                return core

            face_frames = core["face_frames"]
            stamps = core["valid_timestamps"]

            # Heatmap gallery: kai frames, original ke saath (sirf jab model manipulation flag kare)
            heatmaps, heatmap_b64 = [], None
            if core["fake_segments"] and len(face_frames) > 0:
                for idx in pick_indices(len(face_frames), HEATMAP_FRAMES):
                    try:
                        hm = gradcam.generate_heatmap(face_frames[idx])
                        heatmaps.append({
                            "timestamp": stamps[idx],
                            "original": extras.jpeg_b64(face_frames[idx]),
                            "heatmap": extras.jpeg_b64(hm),
                        })
                    except Exception as e:
                        print(f"Heatmap generation failed: {e}")
                if heatmaps:
                    heatmap_b64 = heatmaps[len(heatmaps) // 2]["heatmap"]

            lip_sync_analysis = analyze_lip_sync(face_frames, core["audio_y"], core["audio_sr"])

        if ENABLE_VOICE_CLONE:
            voice_clone_analysis = analyze_voice_clone(core["audio_y"], core["audio_sr"])
        else:
            voice_clone_analysis = {
                "voice_clone_available": False,
                "voice_authenticity_score": None,
                "voice_clone_detected": False,
                "voice_clone_reason": "Voice clone analysis disabled for speed"
            }

        result = {
            "filename": file.filename,
            "total_frames_analyzed": len(face_frames),
            "frames_sampled": core["frames_sampled"],
            "faces_found": len(face_frames),
            "duration": core["total_duration"],
            "threshold_used": FAKE_THRESHOLD,
            "model_prediction": {
                "fake_probability": round(core["video_fake_prob"], 3),
                "verdict": "FAKE" if core["is_fake"] else "REAL"
            },
            "authenticity": core["authenticity"],
            "fake_segments": core["fake_segments"],
            "confidence_over_time": [
                {"timestamp": t, "probability": p}
                for t, p in zip(stamps, core["fake_probs"])
            ],
            "breakdown": {
                "blink": core["blink_score"],
                "lip_sync": core["lip_score"],
                "feature_drift": core["drift_score"]
            },
            "reasons": core["reasons"],
            "heatmap": heatmap_b64,
            "heatmaps": heatmaps,
            "audio_analysis": core["audio_analysis"],
            "lip_sync_analysis": lip_sync_analysis,
            "voice_clone_analysis": voice_clone_analysis,
            "forensics": {
                "sha256": video_sha,
                "analyzed_at": accounts.now_iso(),
                "model_version": MODEL_VERSION,
                "threshold": FAKE_THRESHOLD,
            },
        }
        # History mein save; video delete ho jaati hai (neeche finally), sirf scores + chhote crops rehte hain
        _, saved = accounts.save_analysis(user["id"], result)
        return saved
    finally:
        if os.path.exists(video_path):
            os.remove(video_path)


@app.get("/report/{analysis_id}")
def download_saved_report(analysis_id: str, lang: str = "en", user=Depends(accounts.current_user)):
    """History mein saved analysis ki PDF report (video dobara upload ya analyze kiye bina)."""
    saved = accounts.get_saved(analysis_id, user["id"])
    report_data = {
        "filename": saved.get("filename"),
        "verdict": saved["model_prediction"]["verdict"],
        "fake_probability": saved["model_prediction"]["fake_probability"],
        "authenticity": saved["authenticity"],
        "fake_segments": saved["fake_segments"],
        "breakdown": saved["breakdown"],
        "reasons": saved["reasons"],
        "audio_analysis": saved["audio_analysis"],
        "forensics": saved.get("forensics"),
        "frames_sampled": saved.get("frames_sampled"),
        "faces_found": saved.get("faces_found"),
    }
    language = "hi" if lang.lower() == "hi" else "en"
    try:
        pdf_buffer = generate_pdf_report(report_data, language=language)
    except HindiFontUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=DeepTrace_Report.pdf"}
    )


if __name__ == "__main__":
    # reload=False: reload=True mein model do baar load hota tha
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
