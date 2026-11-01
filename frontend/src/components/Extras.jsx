import { useEffect, useState } from "react";
import { api } from "../api.js";
import { clamp01, fmtDate, mmss } from "../lib.js";
import { useLanguage, useT } from "../i18n.tsx";

const b64 = (s) => "data:image/jpeg;base64," + s;

/** How much evidence the verdict rests on: share of sampled frames where a face was found. */
export function Reliability({ data }) {
  const t = useT();
  const total = data.frames_sampled;
  const found = data.faces_found;
  if (!total || typeof found !== "number") return null;
  const ratio = clamp01(found / total);
  let level = "good";
  let title = "Good evidence";
  let note =
    "A face was found in most frames, so the score rests on plenty of data.";
  if (ratio < 0.4 || found < 20) {
    level = "low";
    title = "Low evidence";
    note =
      "A face was found in few frames. Treat this result with extra caution and try a clip where the face stays clearly in view.";
  } else if (ratio < 0.7) {
    level = "mid";
    title = "Moderate evidence";
    note =
      "A face was missing in a fair share of frames, so the score is less certain.";
  }
  return (
    <div className={"rel " + level}>
      <div className="rel-top">
        <b>{t(title)}</b>
        <span>
          {t("Face found in")} {found} {t("of")} {total} {t("frames")}
        </span>
      </div>
      <div className="track">
        <div className="fill" style={{ width: ratio * 100 + "%" }} />
      </div>
      <p className="small">{t(note)}</p>
    </div>
  );
}

/** What would the verdict be at a different cutoff? Uses the score already returned, no re-analysis. */
export function Sensitivity({ data }) {
  const t = useT();
  const p = data.model_prediction.fake_probability;
  const verdict = data.model_prediction.verdict;
  const base = Math.round((data.threshold_used ?? 0.5) * 100);
  const [cut, setCut] = useState(base);
  if (verdict !== "REAL" && verdict !== "FAKE") {
    return <p className="small">{t("Cutoff comparison is unavailable because this record has an unsupported verdict.")}</p>;
  }
  const fakeAt = p * 100 > cut;
  const changed = fakeAt !== (verdict === "FAKE");
  return (
    <div className="sens">
      <div className="sens-top">
        <h3 className="sec">{t("What if the cutoff changed?")}</h3>
        {cut !== base && (
          <button
            type="button"
            className="linklike"
            onClick={() => setCut(base)}
          >
            {t("Reset")}
          </button>
        )}
      </div>
      <label className="sens-row">
        <span>{t("Flag as fake above")}</span>
        <b>{cut}%</b>
        <input
          type="range"
          min="20"
          max="80"
          step="1"
          value={cut}
          onChange={(e) => setCut(Number(e.target.value))}
          aria-label={t("Fake score cutoff")}
        />
      </label>
      <p className="small">
        {t("With a cutoff of ")}{cut}{t("%, this video would be judged")}{" "}
        <b className={fakeAt ? "t-fake" : "t-real"}>
          {t(fakeAt ? "Fake" : "Real")}
        </b>
        {changed ? t(" (different from the official verdict).") : "."} {t("A lower cutoff catches more fakes but also flags more real videos.")}
      </p>
    </div>
  );
}

/** Several heatmap frames, with an original-vs-heatmap slider. */
export function HeatGallery({ data }) {
  const t = useT();
  const list =
    data.heatmaps && data.heatmaps.length
      ? data.heatmaps
      : data.heatmap
        ? [{ timestamp: null, original: null, heatmap: data.heatmap }]
        : [];
  const [i, setI] = useState(0);
  const [mix, setMix] = useState(100);

  if (!list.length) {
    return (
      <div className="heat-none small">
        {t("No heatmap for this video. It is only drawn when the model flags manipulation.")}
      </div>
    );
  }
  const cur = list[Math.min(i, list.length - 1)];
  return (
    <div>
      <div className="cmp">
        {cur.original && (
          <img
            className="heat"
            alt={t("Original face frame")}
            src={b64(cur.original)}
          />
        )}
        <img
          className={"heat" + (cur.original ? " over" : "")}
          alt={t("Heatmap over the face frame. Warmer areas influenced the model more.")}
          src={b64(cur.heatmap)}
          style={
            cur.original
              ? { clipPath: `inset(0 ${100 - mix}% 0 0)` }
              : undefined
          }
        />
      </div>
      {cur.original && (
        <label className="cmp-slide">
          <span>{t("Original")}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={mix}
            onChange={(e) => setMix(Number(e.target.value))}
            aria-label={t("Slide between original and heatmap")}
          />
          <span>{t("Heatmap")}</span>
        </label>
      )}
      {list.length > 1 && (
        <div className="thumbs" role="group" aria-label={t("Choose a frame")}>
          {list.map((h, k) => (
            <button
              key={k}
              type="button"
              className={k === i ? "on" : ""}
              onClick={() => setI(k)}
              aria-label={
                t("Frame at ") + (h.timestamp != null ? mmss(h.timestamp) : k + 1)
              }
            >
              <img alt="" src={b64(h.original || h.heatmap)} />
              {h.timestamp != null && <span>{mmss(h.timestamp)}</span>}
            </button>
          ))}
        </div>
      )}
      <p className="small" style={{ marginTop: 8 }}>
        {t("Warmer areas influenced the score more.")}
        {cur.timestamp != null ? " " + t("Frame at ") + mmss(cur.timestamp) + "." : ""}
      </p>
    </div>
  );
}

/** Forensic-style details: what exactly was analyzed, and with what. */
export function Forensics({ data }) {
  const t = useT();
  const { language } = useLanguage();
  const f = data.forensics;
  const [copied, setCopied] = useState(false);
  if (!f) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(f.sha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };
  return (
    <div>
      <h3 className="sec">{t("Forensic details")}</h3>
      <dl className="forensic">
        <dt>{t("Video SHA-256")}</dt>
        <dd className="mono">
          {f.sha256}{" "}
          <button type="button" className="linklike" onClick={copy}>
            {t(copied ? "Copied" : "Copy")}
          </button>
        </dd>
        <dt>{t("Analyzed at")}</dt>
        <dd>{fmtDate(f.analyzed_at, language)}</dd>
        <dt>{t("Model version")}</dt>
        <dd className="mono">{f.model_version}</dd>
        <dt>{t("Verdict cutoff")}</dt>
        <dd>{Math.round(f.threshold * 100)}% {t("fake score")}</dd>
        {data.frames_sampled != null && (
          <>
            <dt>{t("Frames")}</dt>
            <dd>
              {data.faces_found} {t("with a face, out of")} {data.frames_sampled}{" "}
              {t("sampled")}
            </dd>
          </>
        )}
      </dl>
      <p className="small">
        {t("The hash identifies the exact file that was analyzed. If the file changes by even one byte, the hash changes.")}
      </p>
    </div>
  );
}

/** Plain statement of what the model can and cannot do. Shows real test numbers when the backend has them. */
export function Limitations() {
  const t = useT();
  const [info, setInfo] = useState(null);
  useEffect(() => {
    api
      .modelInfo()
      .then(setInfo)
      .catch(() => {});
  }, []);
  return (
    <details className="limbox">
      <summary>{t("What this result can and cannot tell you")}</summary>
      <ul>
        <li>
          {t("The model was trained on academic datasets (Celeb-DF v2, FaceForensics++ and a DFDC sample). It can be wrong on phone, webcam, screen-recorded or heavily compressed video, and on deepfake tools newer than its training data.")}
        </li>
        <li>
          {t("Only the first 15 seconds are analyzed, and only the largest face in each frame.")}
        </li>
        <li>
          {t("Blink, mouth movement and audio checks are rule-based. They add context and do not change the verdict.")}
        </li>
        <li>{t("A score is an estimate. Do not treat it as proof on its own.")}</li>
        {info && info.available && (
          <li>
            {t("On ")}{info.n_test}{t(" videos held out from training, the model scored ")}
            {Math.round(info.test_accuracy * 1000) / 10}{t("% accuracy")}
            {typeof info.test_auc === "number"
              ? t(" (AUC ") + info.test_auc.toFixed(2) + ")"
              : ""}
            {t("). Results on other kinds of video can be lower.")}
          </li>
        )}
      </ul>
    </details>
  );
}

export function PrivacyBadge() {
  const t = useT();
  return (
    <p className="privacy">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      {t("The server deletes the uploaded video when analysis ends. Saved reports may retain scores, metadata, face crops and available heatmaps, not the source video.")}
    </p>
  );
}
