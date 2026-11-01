import { type CSSProperties, useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { useT } from "../i18n.tsx";

type CSSVariables = CSSProperties & { [key: `--${string}`]: string | number };

// Stylized portrait illustration used only in this clearly labeled comparison demo.
function Head({ glass = false, id }: { glass?: boolean; id: string }) {
  return (
    <svg
      className="cmp-art"
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-background`} cx=".54" cy=".38" r=".82">
          <stop offset="0" stopColor={glass ? "#344a72" : "#30374a"} />
          <stop offset=".54" stopColor="#182137" />
          <stop offset="1" stopColor="#090f1d" />
        </radialGradient>
        <linearGradient id={`${id}-skin`} x1=".12" y1=".08" x2=".88" y2=".94">
          <stop offset="0" stopColor="#ead8cd" />
          <stop offset=".36" stopColor="#d0b4a6" />
          <stop offset=".74" stopColor="#b18f89" />
          <stop offset="1" stopColor="#786a78" />
        </linearGradient>
        <linearGradient id={`${id}-skin-shade`} x1="0" y1="0" x2="1" y2=".12">
          <stop offset="0" stopColor="#333754" stopOpacity=".34" />
          <stop offset=".23" stopColor="#7d687b" stopOpacity=".06" />
          <stop offset=".56" stopColor="#fff" stopOpacity=".12" />
          <stop offset="1" stopColor="#282b43" stopOpacity=".4" />
        </linearGradient>
        <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34415e" />
          <stop offset=".55" stopColor="#202a42" />
          <stop offset="1" stopColor="#111a2c" />
        </linearGradient>
        <radialGradient id={`${id}-cheek-light`} cx=".35" cy=".3" r=".72">
          <stop offset="0" stopColor="#f4dfd1" stopOpacity=".62" />
          <stop offset="1" stopColor="#f4dfd1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-heat-violet`}>
          <stop offset="0" stopColor="#b6a1ff" stopOpacity=".82" />
          <stop offset=".5" stopColor="#7d8fff" stopOpacity=".4" />
          <stop offset="1" stopColor="#7d8fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-heat-cyan`}>
          <stop offset="0" stopColor="#5ddcf1" stopOpacity=".72" />
          <stop offset="1" stopColor="#9a7cff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-hair`} x1=".1" y1="0" x2=".9" y2="1">
          <stop offset="0" stopColor="#25283b" />
          <stop offset=".48" stopColor="#171c2e" />
          <stop offset="1" stopColor="#35344a" />
        </linearGradient>
        <linearGradient id={`${id}-lip`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8797d" />
          <stop offset="1" stopColor="#725866" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-25%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect width="600" height="400" fill={`url(#${id}-background)`} />
      <ellipse cx="300" cy="343" rx="132" ry="54" fill="#060b15" opacity=".55" filter={`url(#${id}-shadow)`} />
      <path
        d="M88 400 C102 337 164 304 243 294 L268 273 H332 L357 294 C436 304 498 337 512 400 Z"
        fill={`url(#${id}-shirt)`}
      />
      <path d="M265 241 Q300 261 335 241 L328 304 Q300 328 272 304 Z" fill={`url(#${id}-skin)`} />
      <path d="M267 279 Q300 301 333 279 L332 295 Q300 316 268 295 Z" fill="#6e606f" opacity=".24" />
      <path d="M248 302 Q300 327 352 302 L382 400 H218 Z" fill="#111a2c" opacity=".84" />
      <path d="M286 304 L300 326 L314 304" fill="none" stroke="#8fa8d6" strokeOpacity=".52" strokeWidth="2" />
      <ellipse cx="218" cy="178" rx="18" ry="31" fill={`url(#${id}-skin)`} />
      <ellipse cx="382" cy="178" rx="18" ry="31" fill={`url(#${id}-skin)`} />
      <path d="M216 171 Q226 162 232 178 Q227 194 218 191" fill="none" stroke="#806f7c" strokeOpacity=".72" strokeWidth="2" />
      <path d="M384 171 Q374 162 368 178 Q373 194 382 191" fill="none" stroke="#806f7c" strokeOpacity=".72" strokeWidth="2" />
      <path
        d="M300 57 C252 57 220 94 218 148 C216 204 237 239 266 260 Q278 270 278 290 Q300 307 322 290 Q322 270 334 260 C363 239 384 204 382 148 C380 94 348 57 300 57 Z"
        fill={`url(#${id}-skin)`}
        stroke="#f3ded2"
        strokeOpacity=".22"
        strokeWidth="2"
      />
      <path
        d="M300 57 C252 57 220 94 218 148 C216 204 237 239 266 260 Q278 270 278 290 Q300 307 322 290 Q322 270 334 260 C363 239 384 204 382 148 C380 94 348 57 300 57 Z"
        fill={`url(#${id}-skin-shade)`}
      />
      <ellipse cx="270" cy="170" rx="44" ry="68" fill={`url(#${id}-cheek-light)`} opacity=".48" />
      <ellipse cx="333" cy="170" rx="39" ry="66" fill={`url(#${id}-cheek-light)`} opacity=".24" />
      <path d="M218 148 C213 109 221 76 253 58 C276 44 325 44 348 59 C379 79 387 109 382 149 C372 131 361 116 344 102 C324 119 285 131 246 128 C238 137 229 145 218 148 Z" fill={`url(#${id}-hair)`} />
      <path d="M231 111 Q248 75 278 65 M339 67 Q367 86 374 116" fill="none" stroke="#8397bd" strokeOpacity=".2" strokeWidth="3" />
      <path d="M246 151 Q267 138 286 151" fill="none" stroke="#625660" strokeOpacity=".75" strokeWidth="4" strokeLinecap="round" />
      <path d="M314 151 Q333 138 354 151" fill="none" stroke="#625660" strokeOpacity=".75" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="268" cy="164" rx="15" ry="8" fill="#e6d6cf" opacity=".83" />
      <ellipse cx="332" cy="164" rx="15" ry="8" fill="#e6d6cf" opacity=".83" />
      <ellipse cx="268" cy="164" rx="5.2" ry="6.6" fill="#465064" />
      <ellipse cx="332" cy="164" rx="5.2" ry="6.6" fill="#465064" />
      <circle cx="269" cy="162" r="1.7" fill="#fff" opacity=".9" />
      <circle cx="333" cy="162" r="1.7" fill="#fff" opacity=".9" />
      <path d="M247 164 Q267 150 287 164 M313 164 Q333 150 353 164" fill="none" stroke="#665561" strokeOpacity=".72" strokeWidth="2" />
      <path d="M300 164 C298 183 291 198 289 207 Q300 214 311 207" fill="none" stroke="#876c72" strokeOpacity=".66" strokeWidth="3" strokeLinecap="round" />
      <path d="M286 208 Q300 215 314 208" fill="none" stroke="#f0d7c9" strokeOpacity=".76" strokeWidth="2" strokeLinecap="round" />
      <path d="M286 229 Q300 223 314 229 Q306 238 300 237 Q293 238 286 229 Z" fill={`url(#${id}-lip)`} />
      <path d="M287 229 Q300 232 313 229" fill="none" stroke="#f2d8ce" strokeOpacity=".6" strokeWidth="1.5" />
      <path d="M286 247 Q300 252 314 247" fill="none" stroke="#795f6b" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
      <path d="M230 191 Q238 213 256 222 M370 191 Q362 213 344 222" fill="none" stroke="#f4dfd1" strokeOpacity=".28" strokeWidth="3" strokeLinecap="round" />
      {glass && (
        <g className="cmp-heat">
          <circle cx="268" cy="164" r="36" fill={`url(#${id}-heat-violet)`} />
          <circle cx="332" cy="164" r="34" fill={`url(#${id}-heat-cyan)`} />
          <ellipse
            cx="300"
            cy="230"
            rx="34"
            ry="20"
            fill={`url(#${id}-heat-violet)`}
            opacity=".62"
          />
        </g>
      )}
      {glass && (
        <g className="cmp-mesh" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M223 150 Q250 143 268 164 Q284 145 300 146 Q316 145 332 164 Q350 143 377 150" />
          <path d="M231 196 Q264 185 286 207 Q300 215 314 207 Q337 185 369 196" />
          <path d="M242 222 Q268 211 286 229 Q300 238 314 229 Q334 211 359 222" />
          <path d="M246 130 Q268 178 267 205 M354 130 Q332 178 333 205 M300 147 V226" />
          <path d="M249 246 Q300 269 351 246" />
          <circle cx="268" cy="164" r="3" fill="#77e0f0" />
          <circle cx="332" cy="164" r="3" fill="#a994ff" />
          <circle cx="300" cy="207" r="2.5" fill="#77e0f0" />
        </g>
      )}
      {glass && (
        <g className="cmp-corners" stroke="#a994ff" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M205 100 v-20 h20" />
          <path d="M395 100 v-20 h-20" />
          <path d="M205 262 v20 h20" />
          <path d="M395 262 v20 h-20" />
        </g>
      )}
    </svg>
  );
}

const Check = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export default function Compare() {
  const t = useT();
  const id = useId().replaceAll(":", "");
  const [pos, setPos] = useState(50);
  const wrap = useRef(null);
  const touched = useRef(false);

  // one gentle auto-demo the first time the section scrolls into view
  useEffect(() => {
    const el = wrap.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let raf = 0,
      done = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || done) return;
        done = true;
        io.disconnect();
        const t0 = performance.now(),
          D = 2600;
        const step = (now: number) => {
          if (touched.current) return;
          const k = Math.min((now - t0) / D, 1);
          setPos(50 + Math.sin(k * Math.PI * 2) * 22 * (1 - k * 0.3));
          if (k < 1) raf = requestAnimationFrame(step);
          else setPos(50);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="cmp-wrap">
      <div className="cmp" ref={wrap} style={{ "--pos": pos + "%" } as CSSVariables}>
        {/* LEFT: verdict-only illustration, not a competitor benchmark */}
        <div className="cmp-layer cmp-box">
          <Head id={`${id}-blackbox`} />
          <span className="cmp-tag">{t("Verdict-only example")}</span>
          <div className="cmp-verdict">
            <b>{t("FAKE")}</b>
            <i>{t("EXAMPLE")}</i>
          </div>
          <p className="cmp-unknown">
            {t("A verdict by itself")}
            <br />
            <em>{t("shows little context.")}</em>
          </p>
        </div>

        {/* RIGHT: illustrative DeepTrace report surface */}
        <div className="cmp-layer cmp-glass">
          <Head glass id={`${id}-deeptrace`} />
          <span className="cmp-tag good">DeepTrace</span>
          <span className="cmp-flag">{t("ILLUSTRATIVE / MODEL ATTENTION")}</span>
          <div className="cmp-chips">
            <span>
              <Check /> {t("Face coverage is reported")}
            </span>
            <span>
              <Check /> {t("Configured model cutoff")}
            </span>
            <span>
              <Check /> {t("PDF with file hash")}
            </span>
          </div>
          <div className="cmp-time" aria-hidden="true">
            <div className="cmp-strip">
              {Array.from({ length: 32 }, (_, i) => (
                <u
                  key={i}
                  style={{
                    "--h":
                      i > 11 && i < 20
                        ? "#b6a1ff"
                        : i > 8 && i < 24
                          ? "#7d8fff"
                          : "#5ddcf1",
                  } as CSSVariables}
                />
              ))}
            </div>
            <small>
              {t("DEMO INTERVAL")}
            </small>
          </div>
        </div>

        <div className="cmp-handle" aria-hidden="true">
          <span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
            </svg>
          </span>
        </div>
        <input
          className="cmp-range"
          type="range"
          min="4"
          max="96"
          step="0.1"
          value={pos}
          aria-label={t("Drag to explore an illustrative verdict-only result and a DeepTrace report")}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            touched.current = true;
            setPos(parseFloat(e.target.value));
          }}
          onPointerDown={() => {
            touched.current = true;
          }}
        />
      </div>
      <p className="cmp-note">
        {t("Illustrative comparison only. Values are placeholders, not a live analysis or benchmark. Drag the handle.")}
      </p>
    </div>
  );
}
