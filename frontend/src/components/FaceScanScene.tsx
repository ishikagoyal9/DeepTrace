import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useT } from "../i18n.tsx";

interface FaceScanSceneProps {
  className?: string;
  forensic?: boolean;
}

const FaceScanWebGL = lazy(() => import("./FaceScanWebGL.tsx").then((module) => ({ default: module.FaceScanWebGL })));
function StaticFace({ forensic }: { forensic: boolean }) {
  return (
    <svg className="ct-face-static" viewBox="0 0 420 420" role="presentation" aria-hidden="true">
      <defs>
        <radialGradient id="face-glow"><stop stopColor="#8f78ec" stopOpacity=".46" /><stop offset="1" stopColor="#8f78ec" stopOpacity="0" /></radialGradient>
        <linearGradient id="face-shell" x2="0" y2="1"><stop stopColor="#aebbd8" /><stop offset="1" stopColor="#465b83" /></linearGradient>
      </defs>
      <ellipse cx="210" cy="205" rx="102" ry="137" fill="url(#face-shell)" fillOpacity=".57" stroke="#a58bff" strokeOpacity=".66" />
      <path d="M115 136Q210 75 305 136M126 166h73m22 0h73M209 162v93m-59 33q60 42 120 0" fill="none" stroke="#91dffa" strokeOpacity=".72" />
      {forensic && Array.from({ length: 28 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 28;
        const x = 210 + Math.cos(angle) * (index < 17 ? 83 : 45);
        const y = 205 + Math.sin(angle) * (index < 17 ? 119 : 44);
        return <circle key={index} cx={x} cy={y} r="2.4" fill={index % 2 ? "#a58bff" : "#5edcf3"} />;
      })}
      <ellipse cx="210" cy="202" rx="158" ry="170" fill="url(#face-glow)" />
    </svg>
  );
}
export default function FaceScanScene({ className = "", forensic = true }: FaceScanSceneProps) {
  const t = useT();
  const [light, setLight] = useState(() => document.documentElement.dataset.theme === "light");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 640px)").matches);
  const [webglAvailable, setWebglAvailable] = useState(false);
  const [visible, setVisible] = useState(false);
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      setWebglAvailable(Boolean(context));
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => setLight(document.documentElement.dataset.theme === "light"));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const viewport = window.matchMedia("(max-width: 640px)");
    const syncMotion = () => setReducedMotion(motion.matches);
    const syncViewport = () => setCompact(viewport.matches);
    syncMotion();
    syncViewport();
    motion.addEventListener("change", syncMotion);
    viewport.addEventListener("change", syncViewport);
    return () => {
      motion.removeEventListener("change", syncMotion);
      viewport.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const useCanvas = webglAvailable && visible && !compact && !reducedMotion;
  return (
    <div ref={host} className={`ct-face-scene ${className}`} role="img" aria-label={t("Illustrative three-dimensional face mesh with animated landmark markers and connected signal nodes; not a live analysis")}>
      {!useCanvas && <StaticFace forensic={forensic} />}
      {useCanvas && <Suspense fallback={null}><FaceScanWebGL light={light} reducedMotion={reducedMotion} compact={compact} forensic={forensic} visible={visible} /></Suspense>}
    </div>
  );
}
