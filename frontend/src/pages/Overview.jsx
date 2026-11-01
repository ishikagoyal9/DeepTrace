import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.tsx";
import { DayBars, Donut, ScoreBars } from "../components/Charts.jsx";
import { fmtDate, pct } from "../lib.js";
import { useLanguage, useT } from "../i18n.tsx";

const isSupportedVerdict = (value) => value === "REAL" || value === "FAKE";
const labelVerdict = (value) => value === "FAKE" ? "Fake" : value === "REAL" ? "Real" : "Unsupported verdict";
const verdictClass = (value) => value === "FAKE" ? "fake" : value === "REAL" ? "real" : "unsupported";

export default function Overview() {
  const t = useT();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.analyses().then(setItems).catch((e) => setError(e.message));
  }, []);

  const stats = useMemo(() => {
    if (!items) return null;
    const fake = items.filter((a) => a.verdict === "FAKE").length;
    const real = items.filter((a) => a.verdict === "REAL").length;
    const classified = fake + real;
    const unsupported = items.filter((a) => !isSupportedVerdict(a.verdict)).length;
    const average = classified
      ? items.filter((a) => isSupportedVerdict(a.verdict)).reduce((sum, a) => sum + a.fake_probability, 0) / classified
      : 0;
    return { fake, real, classified, unsupported, average };
  }, [items]);

  if (error) return <div className="page-state error-state"><span>{t("CONNECTION / 00")}</span><h1>{t("The archive is out of reach.")}</h1><p>{t(error)}</p></div>;
  if (!items || !stats) return <div className="page-state loading-state"><span className="loading-mark" /><p>{t("Opening your case archive…")}</p></div>;

  const first = user.name.split(" ")[0];
  const recent = items.slice(0, 5);
  const sequence = items.slice(0, 10).reverse();
  const latest = items[0];

  return (
    <div className="page overview-page">
      <header className="workspace-page-head">
        <div><p className="eyebrow">{t("SIGNAL ROOM")} <span>/</span> {t("PERSONAL ARCHIVE")}</p><h1>{t("Good to see you,")}<br /><em>{first}.</em></h1><p className="page-deck">{t("A record of what you have examined, and what the evidence said.")}</p></div>
        <Link to="/analyze" className="button button-accent">{t("Run a new analysis")} <span>↗</span></Link>
      </header>

      {items.length === 0 ? (
        <section className="first-case">
          <div className="first-case-index">{t("FIRST CASE / 001")}</div>
          <div className="first-case-copy"><h2>{t("Your archive")}<br />{t("starts with one video.")}</h2><p>{t("Upload a clear face clip to create a report with a verdict, frame timeline, evidence meter and heatmaps.")}</p><Link to="/analyze" className="text-action">{t("Start the first analysis")} <span>↗</span></Link></div>
          <div className="first-case-graphic" aria-hidden="true"><span /><span /><span /><b>—</b></div>
          <Tips />
        </section>
      ) : (
        <>
          {stats.unsupported > 0 && <div className="error verdict-contract-warning" role="alert">{stats.unsupported} {t(stats.unsupported === 1 ? "record has" : "records have")} {t("an unsupported verdict. They are labeled separately and excluded from REAL/FAKE summaries.")}</div>}
          <section className="archive-summary">
            <div className="summary-label"><span>{t("ARCHIVE TOTAL")}</span><b>{String(items.length).padStart(2, "0")}</b></div>
            <dl className="summary-stats">
              <div><dt>{t("Fake verdicts")}</dt><dd className="tone-fake">{stats.fake}<small>{stats.classified ? Math.round(stats.fake / stats.classified * 100) : 0}% {t("of REAL/FAKE cases")}</small></dd></div>
              <div><dt>{t("Real verdicts")}</dt><dd className="tone-real">{stats.real}<small>{stats.classified ? Math.round(stats.real / stats.classified * 100) : 0}% {t("of REAL/FAKE cases")}</small></dd></div>
              <div><dt>{t("Average fake score")}</dt><dd>{stats.classified ? pct(stats.average) : "—"}<small>{t("across REAL/FAKE cases")}</small></dd></div>
            </dl>
          </section>

          {latest && <section className="latest-case">
            <div className="latest-case-top"><span>{t("LAST EXAMINED")} / {fmtDate(latest.created_at, language)}</span><span className="case-number">{t("CASE")} {String(latest.id).slice(-6).toUpperCase()}</span></div>
            <div className="latest-case-main"><div><p className="eyebrow">{t("MOST RECENT FILE")}</p><h2>{latest.filename}</h2><p className="latest-case-note">{t("Open the report to inspect the full frame signal and supporting evidence.")}</p></div><div className="latest-score"><span>{t("FAKE SCORE")}</span><b>{pct(latest.fake_probability)}</b></div><span className={`verdict-stamp ${verdictClass(latest.verdict)}`}>{t(labelVerdict(latest.verdict))}</span><Link to={`/history/${latest.id}`} aria-label={`${t("Open report for")} ${latest.filename}`} className="latest-open">↗</Link></div>
          </section>}

          <section className="data-board" aria-label={t("Analysis overview charts")}>
            <article className="data-panel score-panel"><div className="panel-heading"><span>{t("01 / SCORE HISTORY")}</span><h2>{t("Pattern over time")}</h2><p className="chart-description">{t("Fake score for each analyzed video, oldest first.")}</p></div><ScoreBars items={sequence} /><div className="score-legend" role="img" aria-label={t("Cyan is lower fake score, blue is mid-range, violet is higher fake score")}><span><i className="score-key-cyan" />0% · {t("LOWER")}</span><span><i className="score-key-blue" />55% · {t("MID")}</span><span><i className="score-key-violet" />100% · {t("HIGHER")}</span></div><p className="chart-footnote">{t("Each bar represents one video. Dates are shown below the bars.")}</p></article>
            <article className="data-panel verdict-panel"><div className="panel-heading"><span>{t("02 / VERDICT MIX")}</span><h2>{t("REAL and FAKE")}</h2><p className="chart-description">{t("Share of saved REAL and FAKE verdicts.")}</p></div><Donut fake={stats.fake} real={stats.real} /></article>
            <article className="data-panel activity-panel"><div className="panel-heading"><span>{t("03 / RECENT ACTIVITY")}</span><h2>{t("Seven-day rhythm")}</h2><p className="chart-description">{t("Number of analyses per day, local time.")}</p></div><DayBars items={items} /><p className="chart-footnote">{t("The number above each bar is that day's analysis count.")}</p></article>
            <aside className="data-note"><span className="note-mark">!</span><div><b>{t("Read the evidence, not just the verdict.")}</b><p>{t("Borderline scores, partial face visibility and non-original uploads are reasons to look more closely.")}</p><Link to="/history" className="text-action">{t("Review all cases")} <span>↗</span></Link></div></aside>
          </section>

          <section className="recent-cases">
            <div className="section-rail"><span>{t("04 / RECENT CASES")}</span><Link to="/history">{t("OPEN ARCHIVE")} <span>↗</span></Link></div>
            <div className="case-table-head"><span aria-hidden="true" /><span>{t("VERDICT")}</span><span>{t("FILE")}</span><span>{t("FAKE SCORE")}</span><span>{t("EXAMINED")}</span><span aria-hidden="true" /></div>
            {recent.map((item, i) => <Link to={`/history/${item.id}`} className="case-row" key={item.id}><span className="case-seq">{String(i + 1).padStart(2, "0")}</span><span className={`case-verdict ${verdictClass(item.verdict)}`}>{t(labelVerdict(item.verdict))}</span><b className="case-file">{item.filename}</b><span className="case-prob">{pct(item.fake_probability)}</span><span className="case-date">{fmtDate(item.created_at, language)}</span><span className="case-arrow">↗</span></Link>)}
          </section>
        </>
      )}
    </div>
  );
}

function Tips() {
  const t = useT();
  return <ul className="first-case-tips"><li>{t("Keep one face clearly visible for several seconds.")}</li><li>{t("Use the original file when possible.")}</li><li>{t("Treat the score as an estimate, not proof.")}</li></ul>;
}
