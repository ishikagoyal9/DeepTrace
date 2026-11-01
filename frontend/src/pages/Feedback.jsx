import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useT } from "../i18n.tsx";

export default function Feedback() {
  const t = useT();
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [expectedVerdict, setExpectedVerdict] = useState("");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadAnalysis = () => {
    setLoadError("");
    setAnalysis(null);
    api.analysis(id).then(setAnalysis).catch((error) => setLoadError(error.message));
  };

  useEffect(() => {
    loadAnalysis();
  }, [id]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    if (expectedVerdict !== "REAL" && expectedVerdict !== "FAKE") {
      setSubmitError("Choose the verdict you believe is correct.");
      return;
    }

    setSubmitting(true);
    try {
      await api.submitFeedback(id, expectedVerdict, reason.trim());
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error.message || "Feedback could not be saved. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!analysis && !loadError) {
    return <div className="page-state loading-state"><span className="loading-mark" /><p>{t("Opening the case for review…")}</p></div>;
  }

  if (loadError) {
    return <div className="page feedback-page"><div className="error" role="alert"><b>{t("Could not open this report.")}</b><p>{t(loadError)}</p></div><button type="button" className="text-action" onClick={loadAnalysis}>{t("Try again")}</button><p><Link to="/history" className="linklike">{t("Back to archive")}</Link></p></div>;
  }

  const modelVerdict = analysis?.model_prediction?.verdict;
  const supportedVerdict = modelVerdict === "REAL" || modelVerdict === "FAKE";

  return (
    <div className="page feedback-page">
      <header className="workspace-page-head feedback-page-head">
        <div>
          <p className="eyebrow">{t("CASE FILE")} <span>/</span> {t("RESULT FEEDBACK")}</p>
          <h1>{t("Help us review")}<br /><em>{t("this result.")}</em></h1>
          <p className="page-deck">{t("Tell us which verdict you believe fits this video. Your response will be saved with this report for later review.")}</p>
        </div>
        <Link to={`/history/${encodeURIComponent(id)}`} className="text-action">{t("Back to report")} <span>↗</span></Link>
      </header>

      <section className="feedback-case" aria-label={t("Report being reviewed")}>
        <div><span className="eyebrow">{t("FILE")}</span><b title={analysis.filename}>{analysis.filename}</b></div>
        <div><span className="eyebrow">{t("CURRENT MODEL VERDICT")}</span><b className={supportedVerdict ? `feedback-verdict ${modelVerdict.toLowerCase()}` : "feedback-verdict"}>{supportedVerdict ? t(modelVerdict) : t("Unsupported value")}</b></div>
        <Link to={`/history/${encodeURIComponent(id)}`} className="text-action">{t("Review evidence")} <span>↗</span></Link>
      </section>

      {submitted ? (
        <section className="feedback-success" role="status">
          <span className="feedback-success-mark" aria-hidden="true">✓</span>
          <div><p className="eyebrow">{t("FEEDBACK SAVED")}</p><h2>{t("Thank you for the review.")}</h2><p>{t("Your assessment is linked to this report. It does not change the saved verdict or automatically retrain the model.")}</p></div>
          <Link to={`/history/${encodeURIComponent(id)}`} className="button button-accent">{t("Return to report")} <span>↗</span></Link>
        </section>
      ) : (
        <form className="feedback-form" onSubmit={submit}>
          <fieldset className="feedback-verdict-fieldset">
            <legend>{t("Which result do you believe is correct?")}</legend>
            <p>{t("Select the expected verdict for this video.")}</p>
            <div className="feedback-verdict-options">
              {["REAL", "FAKE"].map((verdict) => (
                <label key={verdict} className={`feedback-verdict-option ${expectedVerdict === verdict ? "selected" : ""} ${verdict.toLowerCase()}`}>
                  <input type="radio" name="expected-verdict" value={verdict} checked={expectedVerdict === verdict} onChange={() => setExpectedVerdict(verdict)} />
                  <span className="feedback-radio" aria-hidden="true" />
                  <span><b>{t(verdict)}</b><small>{t(verdict === "REAL" ? "The video appears authentic" : "The video appears manipulated")}</small></span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="feedback-reason-label" htmlFor="feedback-reason">{t("Anything that supports your choice?")} <span>{t("OPTIONAL")}</span></label>
          <textarea id="feedback-reason" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 1000))} maxLength={1000} rows={5} placeholder={t("Share a brief note about what you noticed in the video or report.")} />
          <div className="feedback-form-meta"><span>{t("Do not include sensitive personal information.")}</span><span>{reason.length}/1000</span></div>
          {submitError && <p className="field-error" role="alert">{t(submitError)}</p>}
          <div className="feedback-form-actions"><button type="submit" className="button button-accent" disabled={submitting}>{t(submitting ? "Saving feedback…" : "Submit feedback")}<span>↗</span></button><Link to={`/history/${encodeURIComponent(id)}`} className="text-action">{t("Cancel")}</Link></div>
          <p className="feedback-disclaimer">{t("Feedback is stored with this report for future review. It does not alter this result, and the model does not learn automatically from submissions.")}</p>
        </form>
      )}
    </div>
  );
}
