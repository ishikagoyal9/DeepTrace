import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import ResultView from "../components/ResultView.jsx";
import { PrivacyBadge } from "../components/Extras.jsx";
import { useT } from "../i18n.tsx";

const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function Analyze() {
  const t = useT();
  const [phase, setPhase] = useState("pick");
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef(null);
  const submitting = useRef(false);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const run = async (nextFile) => {
    if (!nextFile || submitting.current) return;
    if (!nextFile.type.startsWith("video/")) {
      setError("Your browser did not identify this as a video. Choose a video file; server decoding support can vary.");
      return;
    }
    if (nextFile.size > MAX_UPLOAD_BYTES) {
      setError("This video is larger than the 300 MB upload limit. Choose a smaller file.");
      return;
    }
    submitting.current = true;
    setError("");
    setFile(nextFile);
    setVideoUrl(URL.createObjectURL(nextFile));
    setPhase("working");
    try {
      const result = await api.analyze(nextFile);
      setData(result);
      setPhase("done");
    } catch (e) {
      setError(e.message);
      setPhase("pick");
      setVideoUrl(null);
    } finally {
      submitting.current = false;
    }
  };

  const reset = () => {
    setData(null); setVideoUrl(null); setFile(null); setError(""); setPhase("pick");
    if (input.current) input.current.value = "";
  };

  if (phase === "working") return (
    <div className="page scan-page" aria-live="polite">
      <header className="workspace-page-head scan-page-head"><div><p className="eyebrow">{t("NEW CASE")} <span>/</span> {t("REQUEST IN PROGRESS")}</p><h1>{t("Reading the")} <em>{t("signal.")}</em></h1><p className="page-deck">{t("Uploading and analyzing video. This synchronous request returns a report when it finishes.")}</p></div><span className="working-stamp"><i /> {t("REQUEST RUNNING")}</span></header>
      <section className="processing-stage">
        <div className="processing-preview">{videoUrl && <video src={videoUrl} muted playsInline preload="metadata" />}</div>
        <div className="processing-copy"><span className="eyebrow">{t("SOURCE FILE")}</span><h2>{file?.name}</h2><p>{formatSize(file?.size)} <span>·</span> {file?.type || t("Video file")}</p><p className="request-status" role="status"><i /> {t("Uploading and analyzing video.")}</p><p className="small">{t("The server does not provide live stage progress. Keep this page open until the report appears.")}</p></div>
      </section>
      <PrivacyBadge />
    </div>
  );

  if (phase === "done" && data) return (
    <div className="page">
      <header className="workspace-page-head result-page-head"><div><p className="eyebrow">{t("CASE FILE")} <span>/</span> {t("ANALYSIS COMPLETE")}</p><h1>{t("Evidence")} <em>{t("report.")}</em></h1></div><button type="button" className="text-action" onClick={reset}>{t("Start another scan")} <span>↗</span></button></header>
      <ResultView data={data} videoUrl={videoUrl} />
    </div>
  );

  return (
    <div className="page scan-page">
      <header className="workspace-page-head scan-page-head"><div><p className="eyebrow">{t("NEW CASE")} <span>/</span> {t("PRIVATE ANALYSIS")}</p><h1>{t("Bring the video.")}<br /><em>{t("We’ll read between frames.")}</em></h1><p className="page-deck">{t("Use a clip with one clearly visible face. DeepTrace examines up to the first 15 seconds.")}</p></div><span className="scan-serial">{t("INGESTION / 01")}</span></header>
      <button type="button" className={`ingest-well ${over ? "is-over" : ""}`} onClick={() => input.current?.click()} onDragEnter={(e) => {e.preventDefault();setOver(true);}} onDragOver={(e) => {e.preventDefault();setOver(true);}} onDragLeave={() => setOver(false)} onDrop={(e) => {e.preventDefault();setOver(false);run(e.dataTransfer.files[0]);}}>
        <span className="ingest-target" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M32 41V12m0 0L21 23m11-11 11 11"/><path d="M14 38v12a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V38"/><path d="M8 8h9M8 8v9M56 8h-9m9 0v9M8 56h9m-9 0v-9m48 9h-9m9 0v-9"/></svg></span>
        <span className="ingest-main"><span className="eyebrow">{t("DROP SOURCE VIDEO")}</span><strong>{t("Choose a clip to examine")}</strong><span>{t("or drag it into this field")}</span></span>
        <span className="ingest-action">{t("Browse files")} <b>↗</b></span>
        <span className="ingest-format">{t("MP4 / MOV / WEBM EXAMPLES | DECODER SUPPORT VARIES | 300 MB MAX")}</span>
      </button>
      <input ref={input} type="file" accept="video/*" hidden onChange={(e) => run(e.target.files[0])} />
      <div className="ingest-notes"><div><span>01</span><p><b>{t("15 seconds sampled")}</b><small>{t("Only the opening segment is analyzed.")}</small></p></div><div><span>02</span><p><b>{t("Report saved to your archive")}</b><small>{t("Revisit timelines and supporting evidence.")}</small></p></div><div><span>03</span><p><b>{t("Source video removed")}</b><small>{t("Saved reports may retain scores, metadata, face crops and available heatmaps.")}</small></p></div></div>
      <PrivacyBadge />
      {error && <div className="error ingest-error" role="alert"><b>{t("We couldn’t read that file.")}</b><p>{t(error)}</p></div>}
    </div>
  );
}
