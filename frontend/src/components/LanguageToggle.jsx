import { useLanguage } from "../i18n.tsx";

export default function LanguageToggle({ className = "" }) {
  const { language, setLanguage, t } = useLanguage();
  const next = language === "en" ? "hi" : "en";
  return (
    <button
      type="button"
      className={`language-toggle ${className}`}
      onClick={() => setLanguage(next)}
      aria-label={t(next === "hi" ? "Switch language to Hindi" : "Switch language to English")}
      aria-pressed={language === "hi"}
    >
      {language === "en" ? "हिन्दी" : "English"}
    </button>
  );
}
