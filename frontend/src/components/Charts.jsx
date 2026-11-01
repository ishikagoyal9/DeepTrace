import { clamp01, colorFor } from "../lib.js";
import { useLanguage, useT } from "../i18n.tsx";

/** Actual saved confidence-over-time values for the selected analysis. */
export function ConfidenceLine({ points, duration }) {
  const t = useT();
  if (!points.length) return null;
  const width = 1000;
  const height = 236;
  const left = 54;
  const right = 18;
  const top = 14;
  const bottom = 24;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const safeDuration = Math.max(1, duration || points[points.length - 1]?.timestamp || 1);
  const coords = points.map((point) => {
    const timestamp = Number.isFinite(point.timestamp) ? point.timestamp : 0;
    const probability = Number.isFinite(point.probability) ? clamp01(point.probability) : 0;
    return {
      x: left + clamp01(timestamp / safeDuration) * plotWidth,
      y: top + (1 - probability) * plotHeight,
    };
  });
  const path = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const markerStep = Math.max(1, Math.ceil(coords.length / 28));
  const ticks = [100, 75, 50, 25, 0];

  return (
    <div className="report-confidence-line">
      <div className="report-confidence-label"><span>{t("FAKE SCORE")}</span><span>0–100%</span></div>
      <div className="report-confidence-chart">
        <div className="report-confidence-axis" aria-hidden="true">
          {ticks.map((tick) => <span key={tick}>{tick}%</span>)}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${t("Saved confidence-over-time values across ")}${points.length}${t(" timeline points")}`}>
          <defs>
            <linearGradient id="report-confidence-ramp" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#4dc68f" />
              <stop offset="40%" stopColor="#e0cf5e" />
              <stop offset="70%" stopColor="#f29945" />
              <stop offset="100%" stopColor="#f15b6f" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => {
            const y = top + (1 - tick / 100) * plotHeight;
            return <line key={tick} x1={left} x2={width - right} y1={y} y2={y} className="report-confidence-grid" />;
          })}
          <path d={path} className="report-confidence-path" />
          {coords.filter((_, index) => index % markerStep === 0).map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="3" className="report-confidence-point" />
          ))}
        </svg>
      </div>
    </div>
  );
}

/** Fake vs real share. */
export function Donut({ fake, real }) {
  const t = useT();
  const total = fake + real;
  const r = 52;
  const c = 2 * Math.PI * r;
  const fakeLen = total ? (fake / total) * c : 0;
  const fakePct = total ? Math.round((fake / total) * 100) : 0;
  const realPct = total ? Math.round((real / total) * 100) : 0;
  return (
    <div className="donut">
      <svg
        viewBox="0 0 140 140"
        role="img"
          aria-label={`${total} ${t("REAL/FAKE verdicts")}: ${fake} ${t("FAKE")} (${fakePct}%), ${real} ${t("REAL")} (${realPct}%)`}
      >
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--real)"
          strokeWidth="16"
          opacity={total ? 1 : 0.2}
        />
        {fakeLen > 0 && (
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="var(--fake)"
            strokeWidth="16"
            strokeDasharray={`${fakeLen} ${c - fakeLen}`}
            transform="rotate(-90 70 70)"
          />
        )}
        <text x="70" y="68" textAnchor="middle" className="donut-n">
          {total}
        </text>
        <text x="70" y="88" textAnchor="middle" className="donut-l">
          {t("analyses")}
        </text>
      </svg>
      <ul className="legend">
        <li>
          <i style={{ background: "var(--fake)" }} />
          {fake} {t("FAKE verdicts")} · {fakePct}%
        </li>
        <li>
          <i style={{ background: "var(--real)" }} />
          {real} {t("REAL verdicts")} · {realPct}%
        </li>
      </ul>
    </div>
  );
}

/** Fake score of recent analyses, oldest to newest. */
export function ScoreBars({ items }) {
  const t = useT();
  const { language } = useLanguage();
  const locale = language === "hi" ? "hi-IN" : "en-US";
  if (!items.length) return null;
  const ticks = [100, 75, 50, 25, 0];
  return (
    <div className="score-chart" role="group" aria-label={t("Fake score history for recent analyses")}>
      <div className="score-axis" aria-hidden="true">
        {ticks.map((tick) => <span key={tick}>{tick}%</span>)}
      </div>
      <div className="score-plot" role="list" aria-label={t("Each bar is one analyzed video, oldest first")}>
        <div className="score-grid" aria-hidden="true">
          {ticks.map((tick) => <span key={tick} style={{ top: `${100 - tick}%` }} />)}
        </div>
        {items.map((a, index) => {
          const score = clamp01(a.fake_probability);
          const scoreHeight = Math.max(1.5, score * 100);
          const date = new Date(a.created_at);
          const dateLabel = Number.isNaN(date.getTime())
            ? String(index + 1).padStart(2, "0")
            : date.toLocaleDateString(locale, { month: "numeric", day: "numeric" });
          const scoreLabel = `${Math.round(score * 100)}%`;
          return (
            <div
              key={a.id}
              className="score-mark"
              role="listitem"
              aria-label={`${a.filename}: ${scoreLabel} ${t("fake score")}`}
              title={`${a.filename}: ${scoreLabel} ${t("fake score")}`}
              style={{ "--score-height": `${scoreHeight}%` }}
            >
              <span className="score-value">{scoreLabel}</span>
              <div className="bar-fill" style={{ background: colorFor(score) }} />
              <time className="score-date" dateTime={a.created_at || undefined}>{dateLabel}</time>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Analyses per day for the last 7 days (local time). */
export function DayBars({ items }) {
  const t = useT();
  const { language } = useLanguage();
  const locale = language === "hi" ? "hi-IN" : "en-US";
  const key = (d) => d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      k: key(d),
      label: d.toLocaleDateString(locale, { weekday: "short" }),
      n: 0,
    });
  }
  for (const a of items) {
    const hit = days.find((x) => x.k === key(new Date(a.created_at)));
    if (hit) hit.n += 1;
  }
  const max = Math.max(1, ...days.map((d) => d.n));
  return (
    <div className="days" role="list" aria-label={t("Analyses per day, last 7 days, local time")}>
      {days.map((d) => (
        <div key={d.k} className="day" role="listitem" title={`${d.label}: ${d.n} ${t("analyses")}`} aria-label={`${d.label}: ${d.n} ${t("analyses")}`}>
          <b className="day-count">{d.n}</b>
          <div
            className={"day-bar" + (d.n ? "" : " zero")}
            style={{ "--day-height": `${d.n ? 14 + (d.n / max) * 120 : 4}px` }}
          />
          <span className="day-l">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
