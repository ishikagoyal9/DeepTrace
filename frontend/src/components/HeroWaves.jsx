import { useEffect, useRef } from "react";
import HERO from "../heroBg.js";

// Animated version of the hero background image: a small WebGL shader gently warps the
// picture so the silk waves flow, and a soft sheen travels along the bright edges.
// If WebGL is unavailable (or the user prefers reduced motion) the static CSS image is shown.
const VERT = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const FRAG = `
precision mediump float;
varying vec2 v;
uniform sampler2D img;
uniform float t;
uniform vec2 scale;   // cover-fit scale
void main(){
  vec2 uv = vec2(v.x, 1.-v.y)*scale + vec2((1.-scale.x)*.5, 0.);
  float edge = smoothstep(.12,.42,abs(v.x-.5));     // waves live near the sides, keep the middle calm
  vec2 w = vec2(
    sin(uv.y*6.+t*.9)*.016 + sin(uv.y*15.-t*.6+uv.x*4.)*.006,
    cos(uv.x*5.+t*.8)*.018 + sin(uv.x*12.+t*.5+uv.y*5.)*.007
  );
  vec2 q = uv + w*(.45+.55*edge);
  vec3 c = texture2D(img,q).rgb;
  float lum = dot(c,vec3(.3,.5,.2));
  float sheen = .5+.5*sin(q.x*5.5 - q.y*3. - t*1.4 + lum*9.);
  c += c*sheen*smoothstep(.12,.5,lum)*.7;
  gl_FragColor = vec4(c,1.);
}`;

export default function HeroWaves() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const gl = cv.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uT = gl.getUniformLocation(prog, "t");
    const uS = gl.getUniformLocation(prog, "scale");
    let ratio = 1.96,
      raf = 0,
      alive = true,
      ready = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = cv.clientWidth,
        h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
      const a = w / h; // canvas aspect vs image aspect -> "cover"
      let sx = 1,
        sy = 1;
      if (a > ratio) sy = ratio / a;
      else sx = a / ratio;
      // mimic CSS "center top": anchor to the top edge of the image
      gl.uniform2f(uS, sx, sy);
    };

    const img = new Image();
    img.onerror = () =>
      console.warn("HeroWaves: /hero-bg.jpg not found in frontend/public");
    img.onload = () => {
      if (!alive) return;
      try {
        ratio = img.width / img.height;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        resize();
        ready = true;
        cv.style.opacity = "1";
        const t0 = performance.now();
        const frame = () => {
          if (!alive) return;
          gl.uniform1f(uT, (performance.now() - t0) / 1000);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          raf = requestAnimationFrame(frame);
        };
        frame();
      } catch (e) {
        console.warn("HeroWaves: WebGL failed, using static image", e);
        cv.style.opacity = "0";
      }
    };
    img.src = HERO;
    const onResize = () => ready && resize();
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return <canvas ref={ref} className="hero-gl" aria-hidden="true" />;
}
