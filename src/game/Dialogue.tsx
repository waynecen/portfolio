import { useEffect, useRef } from "react";
import { advance, typer } from "./interact";
import { isTouch } from "./quality";
import { useGame } from "./store";

const CHARS_PER_SECOND = 40;
const PAUSE_SENTENCE = 0.25; // extra seconds after . ! ?
const PAUSE_COMMA = 0.15; // extra seconds after , ; :
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const KEY = isTouch ? "A" : "E";

// Seconds to wait after typing `ch` before the next letter.
function delayAfter(ch: string) {
  const base = 1 / CHARS_PER_SECOND;
  if (ch === "." || ch === "!" || ch === "?") return base + PAUSE_SENTENCE;
  if (ch === "," || ch === ";" || ch === ":") return base + PAUSE_COMMA;
  return base;
}

// The bubble's outline: a rounded blob whose edge ripples slowly, like the surface of a liquid.
// Points sit on a superellipse in a 400×130 box (stretched to fit the text). Each frame they're
// pushed in or out along the outline's normal by a few slow waves that travel around it, then
// joined into a smooth closed curve.
const W = 400;
const H = 250;
const POINTS = 64;
const SQUARENESS = 3; // superellipse exponent: 2 is an ellipse, higher is boxier
const RIPPLE = 1.4; // how far the edge moves in or out, viewBox units (about px vertically)
// [bumps around the outline, speed in radians/s, share of RIPPLE]. Mixed counts and opposite
// directions keep the motion from ever looking like a single rotating shape.
const WAVES = [
  [3, 0.9, 0.45],
  [5, -1.3, 0.35],
  [8, 0.7, 0.2],
] as const;
const LUMPS = 1; // a fixed, irregular cloudiness on top of the moving waves

const baseX = new Float32Array(POINTS);
const baseY = new Float32Array(POINTS);
const normX = new Float32Array(POINTS);
const normY = new Float32Array(POINTS);
const angle = new Float32Array(POINTS);
const ptX = new Float32Array(POINTS);
const ptY = new Float32Array(POINTS);
{
  const rx = W / 2 - RIPPLE - 4;
  const ry = H / 2 - RIPPLE - 4;
  const e = 2 / SQUARENESS;
  // Trace the superellipse finely, then pick points evenly by arc length, so the long flat edges
  // get as many as the corners and the waves travel at an even pace all the way round.
  const FINE = 720;
  const fx = new Float32Array(FINE + 1);
  const fy = new Float32Array(FINE + 1);
  const dist = new Float32Array(FINE + 1);
  for (let j = 0; j <= FINE; j++) {
    const a = (j / FINE) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    fx[j] = W / 2 + rx * Math.sign(c) * Math.abs(c) ** e;
    fy[j] = H / 2 + ry * Math.sign(s) * Math.abs(s) ** e;
    if (j)
      dist[j] = dist[j - 1] + Math.hypot(fx[j] - fx[j - 1], fy[j] - fy[j - 1]);
  }
  for (let i = 0, j = 0; i < POINTS; i++) {
    const want = (i / POINTS) * dist[FINE];
    while (dist[j + 1] < want) j++;
    const f = (want - dist[j]) / (dist[j + 1] - dist[j] || 1);
    baseX[i] = fx[j] + (fx[j + 1] - fx[j]) * f;
    baseY[i] = fy[j] + (fy[j + 1] - fy[j]) * f;
    angle[i] = (i / POINTS) * Math.PI * 2; // position round the outline, used as the wave phase
  }
  // Outward normal from the neighbours' tangent.
  for (let i = 0; i < POINTS; i++) {
    const p = (i + POINTS - 1) % POINTS;
    const n = (i + 1) % POINTS;
    const tx = baseX[n] - baseX[p];
    const ty = baseY[n] - baseY[p];
    const len = Math.hypot(tx, ty) || 1;
    normX[i] = ty / len;
    normY[i] = -tx / len;
  }
}

// Outline at time `t` (seconds) as a closed Catmull-Rom curve written as cubic Béziers.
function cloudPath(t: number): string {
  for (let i = 0; i < POINTS; i++) {
    const a = angle[i];
    let off = LUMPS * Math.sin(7 * a + 1.3) * Math.sin(3 * a);
    for (const [k, speed, share] of WAVES)
      off += RIPPLE * share * Math.sin(k * a + speed * t);
    ptX[i] = baseX[i] + normX[i] * off;
    ptY[i] = baseY[i] + normY[i] * off;
  }
  let d = `M${ptX[0].toFixed(1)} ${ptY[0].toFixed(1)}`;
  for (let i = 0; i < POINTS; i++) {
    const i0 = (i + POINTS - 1) % POINTS;
    const i2 = (i + 1) % POINTS;
    const i3 = (i + 2) % POINTS;
    const c1x = ptX[i] + (ptX[i2] - ptX[i0]) / 6;
    const c1y = ptY[i] + (ptY[i2] - ptY[i0]) / 6;
    const c2x = ptX[i2] - (ptX[i3] - ptX[i]) / 6;
    const c2y = ptY[i2] - (ptY[i3] - ptY[i]) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${ptX[i2].toFixed(1)} ${ptY[i2].toFixed(1)}`;
  }
  return d + "Z";
}

const STILL = cloudPath(0);

function LiquidCloud() {
  const path = useRef<SVGPathElement>(null);
  useEffect(() => {
    const el = path.current;
    if (!el || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      el.setAttribute("d", cloudPath((now - start) / 1000));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <svg
      className="dialogue-cloud"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <path ref={path} d={STILL} />
    </svg>
  );
}

/** The dialogue bubble: pops in, types each line out, advanced with E / Enter / Space / A or a tap. */
export function Dialogue() {
  const d = useGame((s) => s.dialogue);
  const line = d ? d.lines[d.index] : "";
  const index = d ? d.index : -1;
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  // Typewriter: writes straight to the DOM node, so React renders once per line, not per letter.
  useEffect(() => {
    const el = text.current;
    const bubble = box.current;
    if (!d || !el || !bubble) return;
    let n = reduced ? line.length : 0;
    let raf = 0;
    let due = performance.now();
    const show = () => {
      el.textContent = line.slice(0, n);
      typer.done = n >= line.length;
      if (typer.done) bubble.dataset.done = "";
      else delete bubble.dataset.done;
    };
    const tick = (t: number) => {
      const before = n;
      while (n < line.length && t >= due) {
        due += delayAfter(line[n]) * 1000;
        n++;
      }
      if (n !== before) show();
      if (n < line.length) raf = requestAnimationFrame(tick);
    };
    typer.finish = () => {
      cancelAnimationFrame(raf);
      n = line.length;
      show();
    };
    // A little squash between lines (the first line gets the CSS pop-in instead).
    if (index > 0 && !reduced) {
      bubble.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.03, 0.95)" },
          { transform: "scale(1)" },
        ],
        { duration: 180, easing: "ease-out" },
      );
    }
    show();
    if (n < line.length) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      typer.done = true;
    };
  }, [d, line, index]);

  return (
    <div className="dialogue-region">
      {/* Screen readers get the whole line at once instead of every typed letter. */}
      <p className="sr-only" aria-live="polite">
        {line}
      </p>
      {d && (
        <div
          ref={box}
          className="dialogue"
          aria-hidden="true"
          title={`${KEY} to continue`}
          onClick={() => advance()}
        >
          <LiquidCloud />
          <p className="dialogue-text">
            <span ref={text} />
          </p>
          <svg className="dialogue-next" viewBox="0 0 20 12">
            <path d="M2 2h16L10 11Z" />
          </svg>
        </div>
      )}
    </div>
  );
}

/** "E Read" chip for focused interactables that don't show a project card. */
export function Prompt() {
  const focus = useGame((s) => s.focus);
  const talking = useGame((s) => s.dialogue !== null || s.panel !== null);
  const show = focus && !focus.card && !talking;
  return (
    <div className="prompt-region" aria-live="polite">
      {show && (
        <p className="prompt">
          <kbd>{KEY}</kbd> {focus.prompt}
        </p>
      )}
    </div>
  );
}
