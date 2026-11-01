import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { fmtDate, pct } from "../lib.js";
import { useLanguage, useT } from "../i18n.tsx";

const verdictLabel = (value) => value === "REAL" ? "Real" : value === "FAKE" ? "Fake" : "Unsupported verdict";
const verdictTone = (value) => value === "REAL" ? "real" : value === "FAKE" ? "fake" : "unsupported";

export default function FeedbackHub() {
  const t = useT();
  const { language } = useLanguage();
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");

  const loadReports = () => {
    setError("");
    setReports(null);
    api.analyses().then(setReports).catch((requestError) => setError(requestError.message));
  };

  useEffect(() => {
    api.analyses().then(setReports).catch((requestError) => setError(requestError.message));
  }, []);

  if (!reports && !error) {
    return <div className="page-state loading-state"><span className="loading-mark" /><p>{t("Loading saved reports…")}</p></div>;
  }

  if (error && !reports) {
    return (
      <div className="page feedback-hub">
        <header className="workspace-page-head">
          <div><p className="eyebrow">{t("CASE REVIEW / FEEDBACK")}</p><h1>{t("Give feedback.")}<br /><em>{t("Help us review.")}</em></h1></div>
        </header>
        <div className="error archive-error" role="alert"><b>{t("Could not load saved reports.")}</b><p>{t(error)}</p></div>
        <button type="button" className="text-action" onClick={loadReports}>{t("Try loading the reports again.")}</button>
      </div>
    );
  }

  return (
    <div className="page feedback-hub">
      <header className="workspace-page-head">
        <div>
          <p className="eyebrow">{t("CASE REVIEW / FEEDBACK")}</p>
          <h1>{t("Give feedback.")}<br /><em>{t("Help us review.")}</em></h1>
          <p className="page-deck">{t("Choose a saved report and tell us whether its verdict seems right. Your feedback stays linked to that case for later review.")}</p>
        </div>
        <Link to="/history" className="text-action">{t("Open case archive")} <span>↗</span></Link>
      </header>

      <aside className="feedback-hub-note">
        <span className="feedback-hub-note-mark" aria-hidden="true">i</span>
        <p>{t("Your feedback is attached to the selected report for review. It does not change the saved verdict or automatically retrain the model.")}</p>
      </aside>

      {reports.length === 0 ? (
        <section className="archive-empty feedback-hub-empty">
          <span className="eyebrow">{t("SAVED REPORTS")}</span>
          <h2>{t("No saved reports yet.")}</h2>
          <p>{t("Analyze a video first. Once its report is saved, you can share feedback about its verdict here.")}</p>
          <Link to="/analyze" className="button button-accent">{t("Start an analysis")} <span>↗</span></Link>
        </section>
      ) : (
        <section className="feedback-hub-section" aria-label={t("SAVED REPORTS")}>
          <div className="feedback-hub-section-head">
            <div><p className="eyebrow">{t("FEEDBACK REVIEW")}</p><h2>{t("SAVED REPORTS")}</h2></div>
            <span className="feedback-hub-count"><b>{reports.length}</b> {t("reports available")}</span>
          </div>
          <div className="feedback-hub-table">
            <div className="feedback-hub-table-head" aria-hidden="true">
              <span>{t("FILE / CASE")}</span><span>{t("VERDICT")}</span><span>{t("FAKE SCORE")}</span><span>{t("EXAMINED AT")}</span><span>{t("ACTION")}</span>
            </div>
            {reports.map((report, index) => (
              <article className="feedback-hub-row" key={report.id}>
                <div className="feedback-hub-file"><small>{String(index + 1).padStart(2, "0")}</small><Link to={`/history/${encodeURIComponent(report.id)}`} title={report.filename}>{report.filename || t("Untitled video")}</Link></div>
                <span className={`feedback-hub-verdict ${verdictTone(report.verdict)}`}><i aria-hidden="true" />{t(verdictLabel(report.verdict))}</span>
                <span className="feedback-hub-score">{pct(report.fake_probability)}</span>
                <time className="feedback-hub-date" dateTime={report.created_at}>{fmtDate(report.created_at, language)}</time>
                <Link to={`/feedback/${encodeURIComponent(report.id)}`} className="button button-feedback">{t("Give feedback")} <span>↗</span></Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
