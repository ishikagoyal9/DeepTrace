import cv2

MAX_SECONDS = 15   # sirf pehle 15 sec analyze honge (CPU pe speed ke liye)
MAX_WIDTH = 640    # badi frames ko chhota karo, MTCNN tez chalega


def extract_frames(video_path, fps=5, max_seconds=MAX_SECONDS, max_width=MAX_WIDTH):
    cap = cv2.VideoCapture(video_path)

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    if not video_fps or video_fps != video_fps or video_fps <= 0:
        video_fps = 25.0

    frame_interval = max(1, int(round(video_fps / fps)))
    max_frame = int(video_fps * max_seconds)

    frames = []
    timestamps = []
    idx = 0

    while idx < max_frame:
        if idx % frame_interval == 0:
            ret, frame = cap.read()
            if not ret:
                break
            h, w = frame.shape[:2]
            if w > max_width:
                scale = max_width / float(w)
                frame = cv2.resize(frame, (max_width, int(h * scale)),
                                   interpolation=cv2.INTER_AREA)
            frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            timestamps.append(round(idx / video_fps, 2))
        else:
            # decode kiye bina frame skip (read() se tez)
            if not cap.grab():
                break
        idx += 1

    cap.release()
    return frames, timestamps