import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { clamp01, fmtDate, pct, secs } from "../lib.js";
import { ConfidenceLine } from "./Charts.jsx";
import FilmStrip from "./FilmStrip.jsx";
import { Forensics, HeatGallery, PrivacyBadge, Reliability, Sensitivity } from "./Extras.jsx";
import { useLanguage, useT } from "../i18n.tsx";

function SignalReadout({ name, value, tag }) {
  const t = useT();
  if (typeof value !== "number") return null;
  const safe = clamp01(value);
  return <div className="signal-readout"><div><span>{t(name)}{tag && <small className="signal-tag">{t(tag)}</small>}</span><b>{value.toFixed(2)}</b></div><div className="signal-track"><i style={{ width: `${safe * 100}%` }} /></div></div>;
}

const verdictLabel = (value) => value === "FAKE" ? "Fake" : value === "REAL" ? "Real" : "Unsupported verdict";

export default function ResultView({ data, videoUrl }) {
  const t = useT();
  const { language } = useLanguage();
  const videoRef = useRef(null);
  const resultTabRefs = useRef([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const verdict = data.model_prediction.verdict;
  const supportedVerdict = verdict === "REAL" || verdict === "FAKE";
  const fake = verdict === "FAKE";
  const probability = clamp01(data.model_prediction.fake_probability);
  const tone = !supportedVerdict ? "var(--mute)" : fake ? "var(--signal-fake)" : "var(--signal-real)";
  const points = data.confidence_over_time || [];
  const duration = data.duration || points[points.length - 1]?.timestamp || 1;
  const segments = data.fake_segments || [];
  const breakdown = data.breakdown || {};
  const audio = data.audio_analysis || {};
  const lip = data.lip_sync_analysis || {};
  const resultTabs = ["overview", "report", "heatmaps"];

  const handleTabKeyDown = (event, index) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % resultTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + resultTabs.length) % resultTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = resultTabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(resultTabs[nextIndex]);
    resultTabRefs.current[nextIndex]?.focus();
  };

  const seekTo = (time) => { if (videoRef.current) videoRef.current.currentTime = time; };
  const download = async () => {
    setPdfBusy(true); setPdfError("");
    try { await api.downloadReport(data.analysis_id, language); }
    catch (e) { setPdfError(e.message); }
    finally { setPdfBusy(false); }
  };

  return (
    <article className="forensic-report" style={{ "--verdict-tone": tone }}>
      <div className="report-masthead"><span>DEEPTRACE <i>/</i> {t("FORENSIC READOUT")}</span><span>{t("REPORT ID")} <b>{String(data.analysis_id || "—").slice(-10).toUpperCase()}</b></span><span>{data.created_at ? fmtDate(data.created_at, language) : t("LIVE ANALYSIS")}</span></div>
      <div className="report-tabs" role="tablist" aria-label={t("Analysis result sections")}>
        {resultTabs.map((tab, index) => (
          <button
            key={tab}
            ref={(element) => { resultTabRefs.current[index] = element; }}
            id={`result-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`result-panel-${tab}`}
            tabIndex={activeTab === tab ? 0 : -1}
            className="report-tab"
            onClick={() => setActiveTab(tab)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {t(tab === "overview" ? "Overview" : tab === "report" ? "Report" : "Heatmaps")}
            <span>0{index + 1}</span>
          </button>
        ))}
      </div>
      <div id="result-panel-overview" className="report-tab-panel report-panel-overview" role="tabpanel" aria-labelledby="result-tab-overview" tabIndex={0} hidden={activeTab !== "overview"}>
      <section className={`report-cover ${!supportedVerdict ? "is-unsupported" : fake ? "is-fake" : "is-real"}`}>
        <div className="cover-copy">
          <p className="eyebrow">{t("MODEL VERDICT")} <span>/</span> {data.filename}</p>
          <h2>{t(verdictLabel(verdict))}<span className="verdict-period">.</span></h2>
          <p>{t(!supportedVerdict ? "The response contains a verdict outside the supported REAL/FAKE values. This report is not interpreted as either result." : fake ? "The model found signs consistent with manipulation. Inspect the moments and signals below." : "The model found no strong sign of manipulation in the sampled frames.")}</p>
          {(data.reasons || []).length > 0 && <ul className="report-reasons">{data.reasons.map((reason, i) => <li key={i}>{t(reason)}</li>)}</ul>}
          <div className="cover-caveat">{t("An estimate from a model — not proof.")}</div>
        </div>
        <div className="cover-score">
          <div className="score-label"><span>{t("FAKE PROBABILITY")}</span><span>{t("AUTHENTICITY")}</span></div>
          <div className="score-values"><b>{pct(probability)}</b><b>{data.authenticity ? `${data.authenticity.score}%` : `${Math.round((1 - probability) * 100)}%`}</b></div>
          <div className="probability-track" role="img" aria-label={`${pct(probability)} ${t("fake probability")}`}><i style={{ left: `${probability * 100}%` }} /></div>
          <div className="probability-labels"><span>{t("LOWER SCORE")}</span><span>{t("HIGHER SCORE")}</span></div>
          <div className="authenticity-line"><span>{t("Authenticity index")}</span><b>{t(data.authenticity?.risk || "estimated")} {t("risk")}</b></div>
        </div>
        <div className="cover-coordinate" aria-hidden="true">D / T<br />{String(data.analysis_id || "0000").slice(-4)}</div>
      </section>

      <section className="report-section report-timeline report-overview-signal">
        <div className="report-section-head"><span>01</span><div><p className="eyebrow">{t("TEMPORAL EVIDENCE")}</p><h3>{t("Read the signal over time.")}</h3></div><small>{t(videoUrl ? "SELECT A FRAME TO SEEK" : "HOVER A FRAME FOR SCORE")}</small></div>
        {points.length > 0 && <ConfidenceLine points={points} duration={duration} />}
        {videoUrl ? <div className="report-video"><video ref={videoRef} src={videoUrl} controls playsInline preload="metadata" /></div> : <p className="report-note">{t("The original video is not stored. This timeline and report remain in your archive.")}</p>}
        <FilmStrip points={points} duration={duration} segments={segments} videoRef={videoUrl ? videoRef : null} />
        {points.length > 0 && <div className="timeline-color-key" role="group" aria-label={t("Timeline color key")}>
          <div className="timeline-color-key-head"><span>{t("COLOR KEY")}</span><span>{t("TIMELINE VALUE: 0-100%")}</span></div>
          <div className="timeline-color-key-ramp" role="img" aria-label={t("Green means lower fake scores, yellow marks 40 percent, orange marks 70 percent, and red means higher fake scores")}><i /></div>
          <div className="timeline-color-key-stops">
            <span><i className="key-green" aria-hidden="true" /><b>{t("GREEN")}</b><small>{t("Lower: 0%")}</small></span>
            <span><i className="key-yellow" aria-hidden="true" /><b>{t("YELLOW")}</b><small>{t("Mid: 40%")}</small></span>
            <span><i className="key-orange" aria-hidden="true" /><b>{t("ORANGE")}</b><small>{t("Raised: 70%")}</small></span>
            <span><i className="key-red" aria-hidden="true" /><b>{t("RED")}</b><small>{t("Higher: 100%")}</small></span>
          </div>
          {segments.length > 0 && <div className="timeline-marker-key"><i aria-hidden="true" /><span>{t("Pink markers below the strip = flagged intervals")}</span></div>}
        </div>}
        <p className="timeline-explainer">{t(!supportedVerdict ? "These are returned timeline values, not per-frame REAL or FAKE verdicts." : fake ? "For FAKE results, values are smoothed feature-drift heuristics, not separate deepfake-model predictions for each frame." : "For REAL results, each bar repeats the video-level model score; it is not a separate prediction for that frame.")}</p>
        {segments.length > 0 && <div className="flagged-register"><div className="subsection-title"><span>{t("FLAGGED INTERVALS")}</span><small>{segments.length} {t(segments.length === 1 ? "MOMENT" : "MOMENTS")}</small></div>{segments.map((segment, i) => <button type="button" key={i} className="flagged-row" disabled={!videoUrl} onClick={() => seekTo(segment.start)}><span className="flagged-index">{String(i + 1).padStart(2, "0")}</span><span className="flagged-time">{secs(segment.start)} -&gt; {secs(segment.end)}</span><span className="flagged-reasons">{(segment.reasons || []).map((reason) => t(reason)).join(" | ")}</span><span className="flagged-confidence" data-severity={String(segment.severity || "").toLowerCase()}>{t(segment.severity)} / {Math.round(segment.avg_confidence * 100)}%</span>{(segment.thumbs || []).length > 0 && <span className="flagged-thumbs">{segment.thumbs.map((thumb, k) => <img key={k} alt="" src={`data:image/jpeg;base64,${thumb}`} />)}</span>}<span className="flagged-arrow">&#8599;</span></button>)}</div>}
      </section>

      </div>
      <div id="result-panel-report" className="report-tab-panel report-panel-report" role="tabpanel" aria-labelledby="result-tab-report" tabIndex={0} hidden={activeTab !== "report"}>
            <section className="report-section report-diagnostics">
        <div className="report-section-head"><span>02</span><div><p className="eyebrow">{t("SUPPORTING SIGNALS")}</p><h3>{t("What else was present?")}</h3></div><small>{t("CONTEXT, NOT VERDICT")}</small></div>
        <div className="diagnostic-grid">
          <div className="diagnostic-column"><div className="subsection-title"><span>{t("FACIAL SIGNALS")}</span><small>{t("RULE-BASED")}</small></div><SignalReadout name="Blink pattern" value={breakdown.blink} tag="experimental" /><SignalReadout name="Mouth movement" value={breakdown.lip_sync} /><SignalReadout name="Face feature drift" value={breakdown.feature_drift} /><p className="diagnostic-note">{t("These checks add context; they do not alter the model verdict.")}</p></div>
          <div className="diagnostic-column evidence-column"><div className="subsection-title"><span>{t("EVIDENCE COVERAGE")}</span><small>{t("FACE DETECTION")}</small></div><Reliability data={data} /></div>
        </div>
        <div className="audio-register"><div className="subsection-title"><span>{t("AUDIO / VIDEO CONSISTENCY")}</span><small>{t(audio.audio_available ? "AUDIO PRESENT" : "NO AUDIO TRACK")}</small></div>{audio.audio_available ? <><div className="audio-score"><b>{Number(audio.consistency_score).toFixed(2)}</b><span>{t("LOUDNESS CONSISTENCY")}</span><i style={{ "--audio-value": `${clamp01(audio.consistency_score || 0) * 100}%` }} /></div><p>{(audio.audio_reasons || ["No additional audio flags were returned."]).map((reason) => t(reason)).join(" ")}</p>{lip.lip_sync_reason && <p>{t(lip.lip_sync_reason)}.</p>}</> : <p>{(audio.audio_reasons || ["No audio track was available for analysis."]).map((reason) => t(reason)).join(" ")}</p>}</div>
        {supportedVerdict && <Sensitivity data={data} />}
      </section>

      <section className="report-section report-provenance">
        <div className="report-section-head"><span>04</span><div><p className="eyebrow">{t("CHAIN OF CUSTODY")}</p><h3>{t("Keep the record traceable.")}</h3></div><small>{t("FILE METADATA")}</small></div>
        <Forensics data={data} />
      </section>

      <div className="report-actions"><div><span className="eyebrow">{t("EXPORT THIS READOUT")}</span><p>{t("PDF summary: verdict, scores, flagged intervals, heuristic findings, audio notes and provenance. It excludes the web timeline visualization and heatmap images.")}</p>{pdfError && <p className="field-error" role="alert">{t(pdfError)}</p>}</div><div className="report-action-buttons">{supportedVerdict && data.analysis_id && <Link className="button button-feedback" to={`/feedback/${encodeURIComponent(data.analysis_id)}`}>{t("Ye result galat tha?")} <span>↗</span></Link>}<button type="button" className="button button-ink" onClick={download} disabled={pdfBusy}>{t(pdfBusy ? "Preparing report…" : "Download PDF report")}<span>↗</span></button></div></div>
      <PrivacyBadge />
      <div className="report-endmark">{t("END OF READOUT")} <span>///</span></div>
      </div>

      <div id="result-panel-heatmaps" className="report-tab-panel report-panel-heatmaps" role="tabpanel" aria-labelledby="result-tab-heatmaps" tabIndex={0} hidden={activeTab !== "heatmaps"}>
        <section className="report-section report-heatmap">
          <div className="report-section-head"><span>03</span><div><p className="eyebrow">{t("MODEL ATTENTION")}</p><h3>{t("Where the model looked.")}</h3></div><small>{t("GRAD-CAM / FACE REGION")}</small></div>
          <HeatGallery data={data} />
        </section>
      </div>
    </article>
  );
}
