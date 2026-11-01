import numpy as np
import os
import subprocess
import cv2

def get_ffmpeg_path():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except:
        return 'ffmpeg'

def extract_audio(video_path):
    audio_path = video_path + '_audio.wav'
    ffmpeg_path = get_ffmpeg_path()
    try:
        subprocess.run([
            ffmpeg_path, '-i', video_path,
            '-vn', '-acodec', 'pcm_s16le',
            '-ar', '16000', '-ac', '1',
            audio_path, '-y', '-loglevel', 'quiet'
        ], timeout=30, check=True)
        return audio_path
    except Exception as e:
        print(f"Audio extraction failed: {e}")
        return None


def load_audio_once(video_path):
    """Extract + load audio exactly ONE time. Returns (y, sr) or (None, None)."""
    try:
        import librosa
        audio_path = extract_audio(video_path)
        if not audio_path or not os.path.exists(audio_path):
            return None, None

        y, sr = librosa.load(audio_path, sr=16000)
        os.remove(audio_path)

        if len(y) < sr * 0.5:
            return None, None

        return y, sr
    except Exception as e:
        print(f"Audio loading error: {e}")
        return None, None


def analyze_audio_consistency(y, sr):
    if y is None:
        return {
            "audio_available": False,
            "consistency_score": None,
            "voice_clone_score": None,
            "lip_sync_score": None,
            "audio_anomaly": False,
            "audio_reasons": ["No audio track found or audio too short"]
        }

    try:
        import librosa

        frame_length = int(sr * 0.025)
        hop_length = int(sr * 0.010)
        rms = librosa.feature.rms(
            y=y,
            frame_length=frame_length,
            hop_length=hop_length
        )[0]
        rms_diffs = np.abs(np.diff(rms))
        mean_rms = np.mean(rms) + 1e-6
        normalized_diffs = rms_diffs / mean_rms
        consistency_score = float(max(0, 1 - np.mean(normalized_diffs)))
        consistency_score = round(min(1.0, consistency_score), 3)

        audio_anomaly = consistency_score < 0.3

        audio_reasons = []
        if audio_anomaly:
            audio_reasons.append("Audio energy inconsistency detected — possible splice")
        else:
            audio_reasons.append("Audio appears natural and consistent")

        return {
            "audio_available": True,
            "consistency_score": consistency_score,
            "audio_anomaly": audio_anomaly,
            "audio_reasons": audio_reasons
        }

    except Exception as e:
        print(f"Audio analysis error: {e}")
        return {
            "audio_available": False,
            "consistency_score": None,
            "voice_clone_score": None,
            "lip_sync_score": None,
            "audio_anomaly": False,
            "audio_reasons": [f"Audio analysis failed: {str(e)}"]
        }


def analyze_lip_sync(face_frames, y, sr):
    if y is None:
        return {
            "lip_sync_available": False,
            "lip_sync_score": None,
            "lip_sync_anomaly": False,
            "lip_sync_reason": "No audio found for lip sync analysis"
        }

    try:
        import librosa

        hop_length = int(sr / 10)
        rms = librosa.feature.rms(
            y=y,
            frame_length=hop_length * 2,
            hop_length=hop_length
        )[0]

        mouth_openings = []
        for face in face_frames:
            gray = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)
            h, w = gray.shape
            mouth_region = gray[int(h * 0.65):int(h * 0.95),
                               int(w * 0.25):int(w * 0.75)]
            _, thresh = cv2.threshold(
                mouth_region, 0, 255,
                cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
            opening = float(np.sum(thresh == 255)) / thresh.size
            mouth_openings.append(opening)

        mouth_openings = np.array(mouth_openings)

        min_len = min(len(mouth_openings), len(rms))
        mouth_signal = mouth_openings[:min_len]
        audio_signal = rms[:min_len]

        if min_len < 5:
            return {
                "lip_sync_available": False,
                "lip_sync_score": None,
                "lip_sync_anomaly": False,
                "lip_sync_reason": "Not enough frames for lip sync analysis"
            }

        mouth_norm = (mouth_signal - np.mean(mouth_signal)) / (np.std(mouth_signal) + 1e-6)
        audio_norm = (audio_signal - np.mean(audio_signal)) / (np.std(audio_signal) + 1e-6)

        correlation = float(np.corrcoef(mouth_norm, audio_norm)[0, 1])
        lip_sync_score = round(max(0, correlation), 3)
        lip_sync_anomaly = correlation < -0.1

        if lip_sync_anomaly:
            reason = f"Lip-audio correlation low ({lip_sync_score}) — possible lip sync mismatch"
        else:
            reason = f"Lips and audio appear synchronized (correlation: {lip_sync_score})"

        return {
            "lip_sync_available": True,
            "lip_sync_score": lip_sync_score,
            "lip_sync_anomaly": lip_sync_anomaly,
            "lip_sync_reason": reason
        }

    except Exception as e:
        print(f"Lip sync analysis error: {e}")
        return {
            "lip_sync_available": False,
            "lip_sync_score": None,
            "lip_sync_anomaly": False,
            "lip_sync_reason": f"Lip sync analysis failed: {str(e)}"
        }


def analyze_voice_clone(y, sr):
    if y is None:
        return {
            "voice_clone_available": False,
            "voice_authenticity_score": None,
            "voice_clone_detected": False,
            "voice_clone_reason": "No audio found"
        }

    try:
        from transformers import Wav2Vec2Processor, Wav2Vec2Model
        import torch

        processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base")
        model = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base")
        model.eval()

        inputs = processor(
            y,
            sampling_rate=sr,
            return_tensors="pt",
            padding=True
        )

        with torch.no_grad():
            outputs = model(**inputs)
            hidden_states = outputs.last_hidden_state

        variance = float(torch.var(hidden_states).item())
        authenticity_score = round(min(1.0, variance / 0.05), 3)
        voice_clone_detected = authenticity_score < 0.3

        reason = (
            "Unnatural voice patterns detected — possible voice clone"
            if voice_clone_detected
            else f"Voice appears natural (authenticity: {authenticity_score})"
        )

        return {
            "voice_clone_available": True,
            "voice_authenticity_score": authenticity_score,
            "voice_clone_detected": voice_clone_detected,
            "voice_clone_reason": reason
        }

    except Exception as e:
        print(f"Voice clone analysis error: {e}")
        return {
            "voice_clone_available": False,
            "voice_authenticity_score": None,
            "voice_clone_detected": False,
            "voice_clone_reason": f"Voice clone analysis failed: {str(e)}"
        }