import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.tsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useT } from "../i18n.tsx";

export default function AuthPage({ mode }) {
  const t = useT();
  const isSignup = mode === "signup";
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isSignup) await signup(name, email, password);
      else await login(email, password);
      nav(loc.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-tools"><ThemeToggle className="auth-theme" /><LanguageToggle className="auth-language" /></div>
      <section className="auth-pitch">
        <Link to="/" className="brand big brand-link">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>DEEPTRACE<small>{t("VIDEO FORENSICS")}</small></span>
        </Link>
        <h1>
          {t("Truth leaves a trace.")}
        </h1>
        <p>
          {t("Enter the evidence room. Examine video signals, trace suspicious moments, and keep every report tied to its source file.")}
        </p>
        <span className="auth-kicker">{t("PRIVATE ANALYSIS")} <i /> {t("TRACEABLE REPORTS")} <i /> {t("EXPLAINABLE SIGNALS")}</span>
        <div className="demo-strip" aria-hidden="true">
          {Array.from({ length: 48 }, (_, i) => {
            const p =
              0.25 +
              0.45 * Math.abs(Math.sin(i / 5)) +
              (i > 30 && i < 38 ? 0.25 : 0);
            const r = Math.round(55 + (255 - 55) * Math.min(1, p));
            const g = Math.round(205 - (205 - 84) * Math.min(1, p));
            const b = Math.round(182 - (182 - 104) * Math.min(1, p));
            return (
              <span key={i} style={{ background: `rgb(${r},${g},${b})` }} />
            );
          })}
        </div>
      </section>

      <section className="auth-card">
        <Link to="/" className="back-link">
          ← {t("Back to home")}
        </Link>
        <h2>{t(isSignup ? "Create your account" : "Sign in")}</h2>
        <form onSubmit={submit} noValidate>
          {isSignup && (
            <label>
              {t("Name")}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
          )}
          <label>
              {t("Email")}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
              {t("Password")}
            <span className="auth-password-control">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={t(showPassword ? "Hide password" : "Show password")}
                aria-pressed={showPassword}
                title={t(showPassword ? "Hide password" : "Show password")}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.5 4.7 9.5 6.5a1 1 0 0 1 0 1c-.5.8-1.4 2.1-3 3.4M6.2 6.2C4.1 7.4 2.8 9.3 2.5 11.5a1 1 0 0 0 0 1c.9 1.7 4.2 6.5 9.5 6.5 1 0 1.9-.2 2.7-.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2.5 12s3.3-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.3 6.5-9.5 6.5S2.5 12 2.5 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </span>
            {isSignup && <span className="hint">{t("At least 8 characters.")}</span>}
          </label>
          {error && (
            <p className="field-error" role="alert">
              {t(error)}
            </p>
          )}
          <button className="btn primary wide" disabled={busy}>
            {t(busy ? "Please wait…" : isSignup ? "Create account" : "Sign in")}
          </button>
        </form>
        <p className="swap">
          {isSignup ? (
            <>
              {t("Already have an account?")} <Link to="/login">{t("Sign in")}</Link>
            </>
          ) : (
            <>
              {t("New here?")} <Link to="/signup">{t("Create an account")}</Link>
            </>
          )}
        </p>
      </section>
    </div>
  );
}
