import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth.tsx";
import ThemeToggle from "./ThemeToggle.jsx";
import LanguageToggle from "./LanguageToggle.jsx";
import { useT } from "../i18n.tsx";

function Mark() {
  return <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const t = useT();
  const nav = ({ isActive }) => "workspace-tab" + (isActive ? " active" : "");
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "D";
  return (
    <div className="workspace-shell">
      <header className="workspace-bar">
        <Link to="/dashboard" className="brand workspace-brand"><Mark /><span>DEEPTRACE<small>{t("VIDEO FORENSICS")}</small></span></Link>
        <nav className="workspace-nav" aria-label={t("Workspace")}>
          <NavLink to="/dashboard" end className={nav}>{t("Signal room")}</NavLink>
          <NavLink to="/analyze" className={nav}>{t("New analysis")} <span className="tab-plus">+</span></NavLink>
          <NavLink to="/history" className={nav}>{t("Case archive")}</NavLink>
          <NavLink to="/feedback" className={nav}>{t("Feedback")}</NavLink>
        </nav>
        <div className="workspace-tools">
          <span className="secure-status"><i /> {t("PRIVATE SESSION")}</span>
          <ThemeToggle className="workspace-theme" />
          <LanguageToggle className="workspace-language" />
          <details className="account-menu">
            <summary aria-label={`${t("Account for")} ${user.name}`}><span className="avatar">{initial}</span><span className="account-name">{user.name}</span><span className="account-caret">⌄</span></summary>
            <div className="account-popover"><b>{user.name}</b><small>{user.email}</small><button type="button" onClick={logout}>{t("Sign out")} <span>↗</span></button></div>
          </details>
        </div>
      </header>
      <main className="workspace-main"><Outlet /></main>
      <footer className="workspace-footer"><span>DEEPTRACE / {t("FORENSIC WORKSPACE")}</span><span>{t("Every result is an estimate. Review the evidence.")}</span></footer>
    </div>
  );
}
