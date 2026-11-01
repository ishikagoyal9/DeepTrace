import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth.tsx";
import Layout from "./components/Layout.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Landing from "./pages/Landing.tsx";
import Overview from "./pages/Overview.jsx";
import Analyze from "./pages/Analyze.jsx";
import History from "./pages/History.jsx";
import Detail from "./pages/Detail.jsx";
import Feedback from "./pages/Feedback.jsx";
import FeedbackHub from "./pages/FeedbackHub.jsx";
import { useT } from "./i18n.tsx";

function Protected({ children }) {
  const t = useT();
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="boot">{t("Loading?")}</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

function GuestOnly({ children }) {
  const t = useT();
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">{t("Loading?")}</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><AuthPage mode="signup" /></GuestOnly>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="dashboard" element={<Overview />} />
        <Route path="analyze" element={<Analyze />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<Detail />} />
        <Route path="feedback" element={<FeedbackHub />} />
        <Route path="feedback/:id" element={<Feedback />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
