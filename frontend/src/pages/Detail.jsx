import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import ResultView from "../components/ResultView.jsx";
import { useT } from "../i18n.tsx";

export default function Detail() {
  const t = useT();
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    api.analysis(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="page narrow">
        <div className="error" role="alert">
          <b>{t("Could not open this analysis")}</b>
          <p>{t(error)}</p>
        </div>
        <p><Link to="/history" className="linklike">{t("Back to history")}</Link></p>
      </div>
    );
  }
  if (!data) return <p className="small">{t("Loading…")}</p>;

  return (
    <div className="page">
      <header className="workspace-page-head detail-page-head">
        <div><p className="eyebrow">{t("CASE FILE")} <span>/</span> {t("ARCHIVE RECORD")}</p><h1>{t("Evidence")} <em>{t("report.")}</em></h1><p className="page-deck">{t("Reconstructed from the analysis saved in your archive.")}</p></div>
        <button type="button" className="text-action" onClick={() => nav("/history")}>{t("Back to archive")} <span>↗</span></button>
      </header>
      <ResultView data={data} videoUrl={null} />
    </div>
  );
}
