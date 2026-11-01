import { getStoredLanguage } from "./i18n.tsx";

export const clamp01 = (x) => Math.min(1, Math.max(0, x));

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** 0 (real, cyan) -> 0.55 (blue) -> 1 (fake, violet) */
export function colorFor(p) {
  const real = [72, 203, 218];
  const warn = [112, 151, 227];
  const fake = [164, 133, 240];
  p = clamp01(p);
  const rgb = p < 0.55 ? mix(real, warn, p / 0.55) : mix(warn, fake, (p - 0.55) / 0.45);
  return "rgb(" + rgb.join(",") + ")";
}

/** 0 (lower fake score, green) -> 40% (yellow) -> 70% (orange) -> 100% (red). */
export function timelineColorFor(p) {
  const green = [77, 198, 143];
  const yellow = [224, 207, 94];
  const orange = [242, 153, 69];
  const red = [241, 91, 111];
  p = clamp01(p);
  const rgb = p < 0.4
    ? mix(green, yellow, p / 0.4)
    : p < 0.7
      ? mix(yellow, orange, (p - 0.4) / 0.3)
      : mix(orange, red, (p - 0.7) / 0.3);
  return "rgb(" + rgb.join(",") + ")";
}

export function mmss(t) {
  const s = Math.max(0, Math.round(t));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

/** 4.7 -> "4.7 s" (clips are short, so whole-second rounding hides short segments) */
export const secs = (t) => (Math.round(t * 10) / 10).toFixed(1) + " s";

export const pct =(p) => Math.round(p * 1000) / 10 + "%";

export function fmtDate(iso, language = getStoredLanguage()) {
  if (!iso) return "";
  const d = new Date(iso);
  const locale = language === "hi" ? "hi-IN" : "en-US";
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) +
    ", " + d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
