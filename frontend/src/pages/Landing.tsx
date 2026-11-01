import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.tsx";
import Compare from "../components/Compare.tsx";
import FaceScanScene from "../components/FaceScanScene.tsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useT } from "../i18n.tsx";

type CSSVariables = CSSProperties & { [key: `--${string}`]: string | number };

function cssVariables(values: CSSVariables): CSSVariables {
  return values;
}

const STEPS = [
  { name: "Source", marker: "01", note: "A sample view of the submitted video." },
  { name: "Signals", marker: "02", note: "Model output and heuristic signals are shown in context." },
  { name: "Evidence", marker: "03", note: "A completed report brings the verdict and available evidence together." },
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d={diagonal ? "M5 15 15 5M6 5h9v9" : "M3 10h13m-5-5 5 5-5 5"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BrandMark() {
  return <span className="ct-mark" aria-hidden="true"><i /><i /><i /><i /></span>;
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`ct-reveal ${shown ? "is-shown" : ""} ${className}`}>{children}</div>;
}

function ScanInstrument() {
  const t = useT();
  const instrument = useRef<HTMLDivElement | null>(null);
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !instrument.current) return;
    const bounds = instrument.current.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    instrument.current.style.setProperty("--ct-tilt-x", `${-y * 3.5}deg`);
    instrument.current.style.setProperty("--ct-tilt-y", `${x * 5}deg`);
  };
  const resetPointer = () => {
    if (!instrument.current) return;
    instrument.current.style.setProperty("--ct-tilt-x", "0deg");
    instrument.current.style.setProperty("--ct-tilt-y", "0deg");
  };
  return (
    <div className="ct-instrument" ref={instrument} onPointerMove={handlePointerMove} onPointerLeave={resetPointer} aria-label={t("Illustrative animation of a video frame undergoing facial signal analysis")}>
      <div className="ct-instrument-top"><span><i className="ct-live" /> {t("3D CONCEPT / FACE SIGNAL")}</span><span>{t("ILLUSTRATIVE VIEW")}</span></div>
      <div className="ct-instrument-body">
        <div className="ct-gutter"><span>{t("DEPTH")}</span><b>3D</b><i /><span>{t("VIEW")}</span><b>{t("FACE")}</b><i /><span>{t("MODE")}</span><b>{t("STUDY")}</b></div>
        <div className="ct-viewfinder"><div className="ct-view-grid" /><FaceScanScene className="ct-hero-face" /><span className="ct-focus-note ct-note-a">{t("FACIAL MESH")} <b>{t("CONCEPT")}</b></span><span className="ct-focus-note ct-note-b">{t("SIGNAL TRACE")} <b>{t("VISUAL")}</b></span><span className="ct-view-corner">DT / {t("VISUAL STUDY")}</span></div>
      </div>
      <div className="ct-wave-label"><span>{t("ANIMATED SIGNAL STUDY")}</span><div className="ct-wave" aria-hidden="true">{Array.from({ length: 50 }, (_, i) => <i key={i} style={cssVariables({ "--bar": `${16 + Math.abs(Math.sin(i * .44)) * (i % 7 === 0 ? 55 : 31)}%`, "--delay": `${(i % 9) * -120}ms` })} />)}</div><span>{t("DEMO")}</span></div>
      <div className="ct-scan-status"><span className="ct-status-ring" /><span>{t("NOT A LIVE ANALYSIS")}</span><b>{t("VISUAL CONCEPT")} <Arrow diagonal /></b></div>
    </div>
  );
}

function SignalStrip({ active = 1 }: { active?: number }) {
  return <div className={`ct-signal-strip ct-strip-${active}`} aria-hidden="true">{Array.from({ length: 44 }, (_, i) => <i key={i} style={cssVariables({ "--i": i, "--bar": `${13 + Math.abs(Math.sin(i * .83)) * 82}%` })} />)}</div>;
}

function activationAt(index: number, frame: number) {
  const column = index % 12;
  const row = Math.floor(index / 12);
  const drift = Math.sin(frame * .055);
  const gaussian = (centerX: number, centerY: number, spreadX: number, spreadY: number) =>
    Math.exp(-(((column - centerX) ** 2) / (2 * spreadX ** 2) + ((row - centerY) ** 2) / (2 * spreadY ** 2)));
  const violet = gaussian(4.5 + drift * .7, 5.2, 2.15, 2.5);
  const cyan = gaussian(8.2 - drift * .45, 3.1, 1.45, 1.75);
  return {
    heat: Math.min(1, .035 + violet * .82 + cyan * .64),
    cyan: Math.min(1, cyan),
  };
}

function SignalMap() {
  const t = useT();
  const tracks = [
    { name: "TEMPORAL", path: "M0 40h40l9-22 11 42 13-26h38l10 14 11-9h40l10-27 10 38 13-14h38l10 8 12-4h40l10-18 11 32 12-18h40l10 7 11-5h44l11-19 12 37 10-16h47" },
    { name: "FACIAL", path: "M0 37h33l8-7 10 14 12-9h35l11-17 11 31 11-19h40l10 10 12-6h38l11 9 10-14 12 12h40l10-19 12 32 11-18h41l11 8 10-6h41l10-12 11 22 12-13h40" },
    { name: "AUDIO / VIDEO", path: "M0 39h37l9-13 11 27 12-14h44l10 4 11-9h36l11 15 11-29 12 32 10-14h38l12 5 10-7h40l10-11 11 24 12-11h42l10-4 11 10h42l11-19 12 29 10-16h46" },
  ];
  return (
    <div className="ct-signal-art">
      <div className="ct-signal-art-top"><span>{t("OBSERVATION MAP / 03 CHANNELS")}</span><span>{t("ILLUSTRATIVE")}</span></div>
      <div className="ct-signal-tracks">
        {tracks.map((track, index) => <div className={`ct-signal-track ct-signal-track-${index}`} key={track.name}>
          <span>{t(track.name)}</span>
          <svg viewBox="0 0 540 72" preserveAspectRatio="none" aria-hidden="true">
            <path className="ct-track-grid" d="M0 18H540M0 36H540M0 54H540M90 0V72M180 0V72M270 0V72M360 0V72M450 0V72" />
            <path className="ct-track-line" d={track.path} />
          </svg>
        </div>)}
        <i className="ct-signal-cursor" />
      </div>
      <div className="ct-signal-legend"><span><i className="ct-dot ct-dot-violet" /> {t("TEMPORAL")}</span><span><i className="ct-dot ct-dot-cyan" /> {t("FACIAL")}</span><span><i className="ct-dot ct-dot-blue" /> {t("AUDIO / VIDEO")}</span></div>
      <SignalStrip />
    </div>
  );
}

function AnalysisDemo() {
  const t = useT();
  const [active, setActive] = useState(0);
  const [frame, setFrame] = useState(8);
  return (
    <>
      <div className="ct-demo-heading"><h2>{t("From a moving image to a traceable record.")}</h2></div>
      <div className="ct-demo-layout">
      <div className="ct-demo-source">
        <p className="ct-eyebrow">{t("A REPORT SHOULD BE INSPECTABLE")}</p>
        <div className="ct-demo-console">
        <div className="ct-demo-topline"><span>{t("DEEPTRACE / ANALYSIS VIEW")}</span><span><i className="ct-live" /> {t("INTERACTIVE DEMO")}</span></div>
        <div className="ct-demo-tabs" role="tablist" aria-label={t("Analysis stages")}>
          {STEPS.map((step, index) => <button type="button" role="tab" aria-selected={active === index} className={active === index ? "active" : ""} key={step.name} onClick={() => setActive(index)}><span>{step.marker}</span>{t(step.name)}<Arrow diagonal /></button>)}
        </div>
        <div className={`ct-demo-screen ct-demo-mode-${active}`} role="tabpanel">
          <div className="ct-demo-screen-head"><span>{t(active === 0 ? "SOURCE / SAMPLE FRAME" : active === 1 ? "DEMO HEATMAP / ILLUSTRATIVE" : "REPORT / EVIDENCE TRAIL")}</span><span>{t("FRAME")} {String(frame).padStart(3, "0")} <i>/ 150</i></span></div>
          {active === 0 ? <div className="ct-demo-frames" aria-label={t("Sampled video frames")}>
            {Array.from({ length: 7 }, (_, index) => <div key={index} className={`ct-demo-frame ct-demo-frame-${index}`}><i aria-hidden="true" /><span>F {String(frame + index).padStart(3, "0")}</span></div>)}
            <div className="ct-demo-frame-cursor" style={{ left: `${Math.min(94, 18 + (frame / 149) * 76)}%` }} />
          </div> : active === 1 ? <div className="ct-demo-analysis-map" aria-label={t("Illustrative model attention heatmap")}>
            <div className="ct-attention-target" aria-hidden="true"><i /><i /><i /><i /><span>REGION 02 / 04</span></div>
            <div className="ct-attention-grid" aria-hidden="true">{Array.from({ length: 120 }, (_, index) => {
              const activation = activationAt(index, frame);
              return <i key={index} style={cssVariables({ "--heat": activation.heat, "--heat-cyan": activation.cyan })} />;
            })}</div>
            <div className="ct-attention-labels"><span>{t("MODEL FOCUS / FRAME")} {String(frame).padStart(3, "0")}</span><span>{t("FEATURE ACTIVATION")}</span></div>
          </div> : <div className="ct-demo-report"><div className="ct-report-word">{t("Evidence in context.")}</div><div className="ct-report-wave"><SignalStrip active={active} /><div className="ct-report-marker"><i /><span>{t("FLAGGED MOMENT")}</span></div><p>{t("Review the moment alongside the frame signal and supporting checks.")}</p></div></div>}
          <div className="ct-demo-timeline"><span>00:00</span><input type="range" min="0" max="149" value={frame} aria-label={t("Explore illustrative video frames")} onChange={(event) => setFrame(Number(event.target.value))} /><span>00:15</span></div>
        </div>
        <div className="ct-demo-foot"><span>{STEPS[active].marker} / {t(STEPS[active].name).toUpperCase()}</span><p>{t(STEPS[active].note)}</p><small>{t("ILLUSTRATIVE DEMO · NO VIDEO ANALYZED")}</small></div>
        </div>
      </div>
      <div className="ct-demo-story">
        <aside className="ct-demo-aside"><span className="ct-eyebrow">{t("THE REPORT, OPENED UP")}</span><h3>{t(active === 0 ? "Start with the source." : active === 1 ? "Follow the signal." : "Keep every clue.")}</h3><p>{t(active === 0 ? "This sample view is illustrative. In the product, analysis runs synchronously and returns a completed report." : active === 1 ? "This heatmap is a visual stand-in. The real report labels heuristic signals separately from model output." : "A completed report brings the verdict beside its timeline and available supporting evidence.")}</p><div className="ct-demo-controls"><button type="button" aria-label={t("Previous analysis stage")} onClick={() => setActive((active + STEPS.length - 1) % STEPS.length)}>←</button><span>0{active + 1} <i>/ 03</i></span><button type="button" aria-label={t("Next analysis stage")} onClick={() => setActive((active + 1) % STEPS.length)}>→</button></div></aside>
      </div>
      </div>
    </>
  );
}

const FORENSIC_FEATURES = [
  { title: "Temporal evidence", note: "A frame-aligned drift heuristic can mark intervals in Fake results; these are not per-frame model verdicts." },
  { title: "Visual explainability", note: "When available, Grad-CAM overlays visualize model activation on sampled face crops for Fake results; treat them as cues, not proof." },
  { title: "Behavioral signals", note: "Experimental eye-region, mouth-motion, frame-drift and mouth/audio checks add heuristic context; none determines the verdict." },
  { title: "A traceable record", note: "Saved reports preserve available provenance: file hash, model version, cutoff and analysis time." },
] as const;

function FeatureVisual({ index }: { index: number }) {
  if (index === 0) return <div className="ct-feature-visual ct-feature-wave" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} style={cssVariables({ "--height": `${20 + Math.abs(Math.sin(i * 0.63)) * 72}%` })} />)}<b /></div>;
  if (index === 1) return <div className="ct-feature-visual ct-feature-heat" aria-hidden="true"><div>{Array.from({ length: 30 }, (_, i) => <i key={i} />)}</div></div>;
  if (index === 2) return <div className="ct-feature-visual ct-feature-sync" aria-hidden="true"><span>{Array.from({ length: 15 }, (_, i) => <i key={i} style={cssVariables({ "--height": `${20 + Math.abs(Math.sin(i * 0.72)) * 65}%` })} />)}</span><span>{Array.from({ length: 15 }, (_, i) => <i key={i} style={cssVariables({ "--height": `${20 + Math.abs(Math.sin(i * 0.72 + 0.3)) * 65}%` })} />)}</span><b /></div>;
  return <div className="ct-feature-visual ct-feature-hash" aria-hidden="true"><span>SHA-256</span><code>9F2A · 71C4 · D80B<br />A14E · 3C92 · 65FD</code></div>;
}

function FeaturesSection() {
  const t = useT();
  return (
    <Reveal>
      <section className="ct-features" id="features">
        <div className="ct-section-meta"><span>{t("THE DEEPTRACE FEATURES")}</span><span>{t("FOUR FORENSIC CAPABILITIES")}</span></div>
        <div className="ct-feature-layout">
          <div className="ct-feature-heading">
            <p className="ct-eyebrow">{t("THE DEEPTRACE FEATURES")}</p>
            <h2>{t("Four ways to read the evidence.")}</h2>
            <p>{t("Temporal evidence, visual explainability, heuristic behavior signals and a traceable record each answer a different review question.")}</p>
          </div>
          <div className="ct-feature-list">
            {FORENSIC_FEATURES.map((feature, index) => (
              <article className="ct-feature-row" key={feature.title}>
                <span className="ct-feature-index">0{index + 1}</span>
                <div className="ct-feature-copy"><h3>{t(feature.title)}</h3><p>{t(feature.note)}</p></div>
                <FeatureVisual index={index} />
                <span className="ct-feature-glyph" aria-hidden="true">↗</span>
              </article>
            ))}
            <aside className="ct-feature-notes" aria-label={t("Privacy and evidence coverage")}>
              <div className="ct-feature-privacy">
                <span className="ct-privacy-shield" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 19 6v5.2c0 4.4-2.8 7.6-7 9.3-4.2-1.7-7-4.9-7-9.3V6l7-2.5Z" /><path d="m9 12 2 2 4-4" /></svg></span>
                <div className="ct-privacy-copy"><h3>{t("Your video doesn't stay. Your evidence does.")}</h3><p>{t("Uploaded source videos are deleted after analysis, while saved reports and derived evidence remain available.")}</p></div>
              </div>
              <div className="ct-evidence-meter-note"><span className="ct-eyebrow">{t("EVIDENCE COVERAGE")}</span><p>{t("Share of sampled frames with a detected face; it is coverage, not verdict confidence.")}</p></div>
            </aside>
          </div>
        </div>
        <div className="ct-feature-baseline"><span>{t("MODEL OUTPUT")}</span><i /><span>{t("VISIBLE EVIDENCE")}</span><i /><span>{t("TRACEABLE RECORD")}</span></div>
      </section>
    </Reveal>
  );
}

function ReportSection() {
  const t = useT();
  return (
    <Reveal>
      <section className="ct-report-section" id="report">
        <div className="ct-section-meta"><span>{t("04 / WHAT THE REPORT HOLDS")}</span><span>{t("OUTCOME, EVIDENCE, PROVENANCE")}</span></div>
        <div className="ct-report-layout">
          <div className="ct-report-heading">
            <p className="ct-eyebrow">{t("A COMPLETED ANALYSIS, MADE REVIEWABLE")}</p>
            <h2>{t("More than a verdict.")}</h2>
            <p>{t("The report brings together the binary Real or Fake result, fake probability, heuristic-flagged intervals and the supporting information available for that analysis.")}</p>
            <p>{t("The PDF is a narrower summary: it lists scores, intervals, heuristic findings, audio notes and provenance, but not the web report’s timeline visualization or Grad-CAM images.")}</p>
          </div>
          <div className="ct-report-sheet" role="group" aria-label={t("Illustrative report structure, not a real analysis result")}>
            <div className="ct-report-sheet-head"><span>{t("DEEPTRACE / REPORT INDEX")}</span><span>{t("STRUCTURE / ILLUSTRATIVE")}</span></div>
            <div className="ct-report-outcome">
              <div><span>{t("VERDICT")}</span><strong>{t("REAL")} <i>/</i> {t("FAKE")}</strong></div>
              <div><span>{t("MODEL SCORE")}</span><strong>{t("FAKE PROBABILITY")}</strong></div>
            </div>
            <div className="ct-report-timeline">
              <div><span>{t("FLAGGED SEGMENTS")}</span><span>{t("TIMELINE")}</span></div>
              <div className="ct-report-track" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><b /></div>
            </div>
            <div className="ct-report-fields">
              <div><span>{t("EXPLAINABILITY")}</span><strong>{t("Grad-CAM when available")}</strong></div>
              <div><span>{t("HEURISTICS")}</span><strong>{t("Signals identified as heuristics")}</strong></div>
              <div><span>{t("PROVENANCE")}</span><strong>{t("File hash / model / cutoff / time")}</strong></div>
            </div>
            <div className="ct-report-sheet-foot"><span>{t("PDF REPORT / EXISTING EXPORT")}</span><span>{t("RESULTS ARE ESTIMATES")}</span></div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

export default function Landing() {
  const t = useT();
  const { user } = useAuth();
  const startPath = user ? "/analyze" : "/signup";
  return (
    <div className="ct-page">
      <header className="ct-nav">
        <Link to="/" className="ct-brand"><BrandMark /><span>DEEPTRACE<small>{t("VIDEO FORENSICS")}</small></span></Link>
        <nav className="ct-nav-links" aria-label={t("Main navigation")}><a href="#approach">{t("Method")}</a><a href="#features">{t("Features")}</a><a href="#report">{t("Report")}</a><a href="#evidence">{t("Compare")}</a></nav>
        <div className="ct-nav-actions"><ThemeToggle className="ct-theme" /><LanguageToggle className="ct-language" />{user ? <Link className="ct-nav-login" to="/dashboard">{t("Workspace")} <Arrow diagonal /></Link> : <><Link className="ct-nav-login" to="/login">{t("Sign in")}</Link><Link className="ct-nav-cta" to="/signup">{t("Open the lab")} <Arrow /></Link></>}</div>
      </header>

      <main>
        <section className="ct-hero">
          <div className="ct-hero-aura" aria-hidden="true"><i /><i /><i /></div>
          <div className="ct-hero-copy">
            <p className="ct-eyebrow"><span className="ct-live" /> {t("VIDEO FORENSICS / FIELD NOTE 001")}</p>
            <h1>{t("A video can")}<br /><em>{t("look real.")}</em><br />{t("Frames tell.")}</h1>
            <p className="ct-hero-description">{t("DeepTrace pairs a binary model estimate with reviewable intervals and clearly labelled heuristic signals, so you can inspect the report instead of taking a score on faith.")}</p>
            <div className="ct-hero-actions"><Link className="ct-primary" to={startPath}>{t("Start detecting")} <Arrow /></Link><a className="ct-secondary" href="#demonstration">{t("See the analysis")} <span>↓</span></a></div>
            <div className="ct-trust-line"><span className="ct-shield">SYNC</span> {t("One synchronous analysis request")} <i /> {t("Review the completed report")}</div>
          </div>
          <div className="ct-hero-art"><div className="ct-orbit-label ct-orbit-left">{t("FACE / MESH STUDY")}</div><ScanInstrument /><div className="ct-orbit-label ct-orbit-right">DT-001 <i>{t("VISUAL CONCEPT")}</i></div></div>
          <div className="ct-hero-index"><span>00 / 07</span><span>{t("LOOK CLOSER")}</span><span>{t("SCROLL TO INVESTIGATE ↓")}</span></div>
        </section>

        <div className="ct-marquee" aria-label={t("DeepTrace evidence capabilities")}><div><span>{t("SAMPLED FRAMES")}</span><b>+</b><span>{t("EVIDENCE IN CONTEXT")}</span><b>+</b><span>{t("HEURISTICS LABELLED CLEARLY")}</span><b>+</b><span>{t("SAMPLED FRAMES")}</span><b>+</b><span>{t("EVIDENCE IN CONTEXT")}</span><b>+</b><span>{t("HEURISTICS LABELLED CLEARLY")}</span><b>+</b></div></div>

        <FeaturesSection />

        <Reveal>
          <section className="ct-approach" id="approach">
            <div className="ct-section-meta"><span>{t("01 / THE APPROACH")}</span><span>{t("HOW IT WORKS / FROM VIDEO TO EVIDENCE")}</span></div>
            <div className="ct-approach-heading">
              <div className="ct-approach-title">
                <p className="ct-eyebrow">{t("LOOK BEYOND THE VERDICT")}</p>
                <h2>{t("See the story")}<br />{t("inside the signal.")}</h2>
              </div>
              <p>{t("A verdict is only the starting point. DeepTrace presents its REAL or FAKE result alongside available supporting evidence, so you can review the signals behind the result.")}</p>
            </div>
            <div className="ct-step-rail"><article><span>01</span><div><h3>{t("Sample the video")}</h3><p>{t("The opening frames become a timeline of observable signals.")}</p></div><small>{t("INPUT")}</small></article><article><span>02</span><div><h3>{t("Trace what changes")}</h3><p>{t("Frame-to-frame changes and supporting signals add heuristic context.")}</p></div><small>{t("ANALYSIS")}</small></article><article><span>03</span><div><h3>{t("Review the evidence")}</h3><p>{t("Inspect the Real or Fake verdict, flagged intervals and supporting checks.")}</p></div><small>{t("REPORT")}</small></article></div>
          </section>
        </Reveal>

        <Reveal>
          <section className="ct-signal-section" id="signals">
            <div className="ct-signal-copy"><p className="ct-eyebrow">{t("02 / A VERDICT WITH CONTEXT")}</p><h2>{t("One clip.")}<br /><em>{t("More than")}<br />{t("one signal.")}</em></h2><p>{t("The report brings model output together with frame-to-frame drift, experimental eye-region and mouth/audio heuristics, and Grad-CAM when available. These cues add context; they do not independently determine the verdict.")}</p><Link to={startPath} className="ct-text-link">{t("Explore your own video")} <Arrow diagonal /></Link></div>
            <SignalMap />
          </section>
        </Reveal>

        <Reveal>
          <section className="ct-demo-section" id="demonstration">
            <div className="ct-section-meta"><span>{t("03 / INSIDE AN ANALYSIS")}</span><span>{t("MOVE THROUGH THE EVIDENCE")}</span></div>
            <AnalysisDemo />
          </section>
        </Reveal>

        <ReportSection />
        <Reveal>
          <section className="ct-evidence-compare" id="evidence">
            <div className="ct-section-meta"><span>{t("05 / FACE COMPARISON")}</span><span>{t("DRAG TO REVEAL")}</span></div>
            <div className="ct-compare-heading"><p className="ct-eyebrow">{t("A RESULT SHOULD BE INSPECTABLE")}</p><h2>{t("See what the score is made of.")}</h2></div>
            <Compare />
          </section>
        </Reveal>

        <Reveal>
          <section className="ct-methodology" id="methodology">
            <div className="ct-section-meta"><span>{t("06 / METHODOLOGY & LIMITATIONS")}</span><span>{t("READ THE RESULT WITH CARE")}</span></div>
            <div className="ct-methodology-layout">
              <div className="ct-methodology-intro">
                <p className="ct-eyebrow">{t("WHAT THE REPORT CAN AND CANNOT SAY")}</p>
                <h2>{t("A binary result.")}<br />{t("A human review.")}</h2>
                <p>{t("DeepTrace reports a Real or Fake verdict and a fake probability. The score is an estimate from the model, not proof about a video’s origin.")}</p>
              </div>
              <div className="ct-methodology-ledger">
                <article><span>{t("01 / VERDICT")}</span><div><h3>{t("Real or Fake")}</h3><p>{t("The current product uses a binary verdict; it does not return an Uncertain class.")}</p></div></article>
                <article><span>{t("02 / SCORE")}</span><div><h3>{t("Fake probability")}</h3><p>{t("Read the score as model output and review it alongside the report evidence.")}</p></div></article>
                <article><span>{t("03 / HEURISTICS")}</span><div><h3>{t("Supporting signals")}</h3><p>{t("Eye-region variation is an experimental blink proxy; mouth movement, frame-to-frame feature drift and mouth/audio correlation are also heuristics, not independent verdicts.")}</p></div></article>
                <article><span>{t("04 / EXPLAINABILITY")}</span><div><h3>{t("Grad-CAM when available")}</h3><p>{t("The backend attempts heatmaps for Fake results; generation can fail or return none. They visualize activation and do not establish why a verdict is correct.")}</p></div></article>
              </div>
            </div>
            <div className="ct-methodology-limit"><span>{t("LIMITATION")}</span><p>{t("Automated analysis can be wrong. Review the original video and the available evidence before relying on a result.")}</p></div>
          </section>
        </Reveal>



        <section className="ct-close">
          <div className="ct-close-graphic" aria-hidden="true"><div className="ct-close-line" /><span>{t("TRUTH / TRACE / TIME")}</span><i /><i /><i /></div>
          <p className="ct-eyebrow">{t("THE NEXT FRAME IS YOURS")}</p><h2>{t("Look again.")}<br /><em>{t("Know more.")}</em></h2><p>{t("Bring a clip. Follow the evidence. Make your own call.")}</p><Link className="ct-primary" to={startPath}>{t("Start a video analysis")} <Arrow /></Link><small>{t("Results are estimates. Always review the evidence.")}</small>
        </section>
      </main>

      <footer className="ct-footer"><Link to="/" className="ct-brand"><BrandMark /><span>DEEPTRACE<small>{t("VIDEO FORENSICS")}</small></span></Link><p>{t("Evidence over assertion.")}</p><div><a href="#approach">{t("Method")}</a><a href="#features">{t("Features")}</a><a href="#report">{t("Report")}</a><a href="#evidence">{t("Compare")}</a><a href="#methodology">{t("Limitations")}</a>{user ? <Link to="/dashboard">{t("Workspace")}</Link> : <Link to="/login">{t("Sign in")}</Link>}</div><small>DEEPTRACE / {t("RESULTS ARE ESTIMATES")}</small></footer>
    </div>
  );
}
