import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { fmtDate, pct } from "../lib.js";
import { useLanguage, useT } from "../i18n.tsx";

const FILTERS = [["ALL", "All cases"], ["FAKE", "Fake"], ["REAL", "Real"]];
const verdictLabel = (value) => value === "FAKE" ? "Fake" : value === "REAL" ? "Real" : "Unsupported verdict";
const verdictTone = (value) => value === "FAKE" ? "fake" : value === "REAL" ? "real" : "unsupported";

export default function History() {
  const t = useT();
  const { language } = useLanguage();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState(null);

  const loadItems = () => {
    setError("");
    setItems(null);
    api.analyses().then(setItems).catch((e) => setError(e.message));
  };
  useEffect(() => { api.analyses().then(setItems).catch((e) => setError(e.message)); }, []);
  const shown = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => (filter === "ALL" || item.verdict === filter) && (item.filename || "").toLowerCase().includes(query.trim().toLowerCase()));
  }, [items, filter, query]);

  const remove = async (id) => {
    try { await api.remove(id); setItems((current) => (current || []).filter((item) => item.id !== id)); }
    catch (e) { setError(e.message); }
    setConfirm(null);
  };

  if (!items && !error) return <div className="page-state loading-state"><span className="loading-mark" /><p>{t("Opening the case archive…")}</p></div>;
  if (!items) return <div className="page archive-page"><div className="error archive-error" role="alert"><b>{t("Could not load the case archive.")}</b><p>{t(error)}</p></div><button type="button" className="text-action" onClick={loadItems}>{t("Try again")}</button></div>;
  return (
    <div className="page archive-page">
      <header className="workspace-page-head"><div><p className="eyebrow">{t("RECORDS")} <span>/</span> {t("PRIVATE ARCHIVE")}</p><h1>{t("Every scan")}<br />{t("leaves a")} <em>{t("record.")}</em></h1><p className="page-deck">{t("Search past analyses and return to the evidence behind each verdict.")}</p></div><Link to="/analyze" className="button button-accent">{t("New analysis")} <span>↗</span></Link></header>
      {error && <div className="error archive-error" role="alert">{t(error)}</div>}
      {items.length === 0 ? <section className="archive-empty"><span className="eyebrow">{t("NO CASES FILED")}</span><h2>{t("Begin with a video.")}</h2><p>{t("Your reports will live here, with their timestamps and forensic details.")}</p><Link to="/analyze" className="text-action">{t("Start an analysis")} <span>↗</span></Link></section> : <>
        <div className="archive-controls"><label className="archive-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search file names")} aria-label={t("Search file names")} /></label><div className="archive-filters" role="group" aria-label={t("Filter by verdict")}>{FILTERS.map(([key, label]) => <button type="button" key={key} className={filter === key ? "active" : ""} aria-pressed={filter === key} onClick={() => setFilter(key)}>{t(label)}<small>{key === "ALL" ? items.length : items.filter((item) => item.verdict === key).length}</small></button>)}</div></div>
        {shown.length === 0 ? <div className="archive-empty compact"><h2>{t("No matching cases.")}</h2><p>{t("Try another file name or verdict filter.")}</p></div> : <div className="archive-register"><div className="register-heading"><span>{t("FILE / CASE")}</span><span>{t("VERDICT")}</span><span>{t("FAKE SCORE")}</span><span>{t("EXAMINED AT")}</span><span>{t("ACTION")}</span></div>{shown.map((item, index) => <div className="register-row" key={item.id}><span className="register-file"><small>{String(index + 1).padStart(2, "0")}</small><Link to={`/history/${item.id}`}>{item.filename}</Link></span><span className={`register-verdict ${verdictTone(item.verdict)}`}><i />{t(verdictLabel(item.verdict))}</span><span className="register-score">{pct(item.fake_probability)}</span><span className="register-date">{fmtDate(item.created_at, language)}</span><span className="register-action">{confirm === item.id ? <><button type="button" className="delete-confirm" onClick={() => remove(item.id)}>{t("Confirm delete")}</button><button type="button" className="keep-case" onClick={() => setConfirm(null)}>{t("Keep")}</button></> : <button type="button" aria-label={`${t("Delete")} ${item.filename}`} onClick={() => setConfirm(item.id)}>{t("Delete")}</button>}</span></div>)}</div>}
      </>}
      <footer className="archive-foot"><span>{shown.length} {t(shown.length === 1 ? "RECORD" : "RECORDS")} {t("SHOWN")}</span><span>{t("FILED IN DEEPTRACE / PRIVATE ARCHIVE")}</span></footer>
    </div>
  );
}
