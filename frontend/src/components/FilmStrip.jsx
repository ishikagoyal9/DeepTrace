import { useEffect, useRef, useState } from "react";
import { clamp01, timelineColorFor, mmss } from "../lib.js";
import { useT } from "../i18n.tsx";

/**
 * One block per analyzed frame, colored by score.
 * With a videoRef the playhead follows the video and clicking seeks it.
 */
export default function FilmStrip({ points, duration, segments = [], videoRef, small = false }) {
  const t = useT();
  const filmRef = useRef(null);
  const [head, setHead] = useState(0); // 0..1
  const [tip, setTip] = useState(null);
  const dur = duration || 1;
  const live = Boolean(videoRef);

  useEffect(() => {
    const v = videoRef?.current;
    if (!v) return;
    let raf = null;
    const sync = () => setHead(clamp01(v.currentTime / dur));
    const loop = () => {
      sync();
      raf = requestAnimationFrame(loop);
    };
    const onPlay = () => {
      if (!raf) loop();
    };
    const onPause = () => {
      cancelAnimationFrame(raf);
      raf = null;
      sync();
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("seeked", sync);
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("seeked", sync);
    };
  }, [videoRef, dur]);

  const timeAt = (clientX) => {
    const r = filmRef.current.getBoundingClientRect();
    return clamp01((clientX - r.left - 6) / (r.width - 12)) * dur;
  };

  const seek = (t) => {
    const v = videoRef?.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(dur, t));
    setHead(clamp01(v.currentTime / dur));
  };

  const onMove = (e) => {
    if (!points.length) return;
    const t = timeAt(e.clientX);
    const i = Math.min(points.length - 1, Math.round((t / dur) * (points.length - 1)));
    const r = filmRef.current.getBoundingClientRect();
    setTip({ x: e.clientX - r.left, text: mmss(t) + " · " + Math.round(points[i].probability * 100) + "%" });
  };

  const onKey = (e) => {
    const v = videoRef?.current;
    if (!v) return;
    if (e.key === "ArrowRight") { seek(v.currentTime + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { seek(v.currentTime - 1); e.preventDefault(); }
  };

  return (
    <div className={"strip" + (small ? " small" : "")}>
      <div
        ref={filmRef}
        className={"film" + (live ? " live" : "")}
        onClick={live ? (e) => seek(timeAt(e.clientX)) : undefined}
        onPointerMove={onMove}
        onPointerLeave={() => setTip(null)}
        onKeyDown={onKey}
        tabIndex={live ? 0 : -1}
        role={live ? "slider" : "img"}
        aria-label={t(live ? "Video position" : "Per-frame score timeline")}
      >
        <div className="cells">
          {points.map((p, i) => (
            <div key={i} className="cell" style={{ background: timelineColorFor(p.probability) }} />
          ))}
        </div>
        {live && <div className="playhead" style={{ left: `calc(6px + ${head} * (100% - 12px))` }} />}
        {tip && (
          <div className="tip" style={{ left: tip.x }}>
            {tip.text}
          </div>
        )}
      </div>

      {segments.length > 0 && (
        <div className="marks" aria-hidden="true">
          {segments.map((s, i) => (
            <span
              key={i}
              className="mark-seg"
              style={{
                left: `calc(6px + ${clamp01(s.start / dur)} * (100% - 12px))`,
                width: `max(4px, calc(${clamp01((s.end - s.start) / dur)} * (100% - 12px)))`,
              }}
            />
          ))}
        </div>
      )}

      <div className="strip-foot">
        <span>0:00</span>
        <span>{mmss(dur)}</span>
      </div>
    </div>
  );
}
