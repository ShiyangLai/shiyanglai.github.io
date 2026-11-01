// Generative "wallpapers" for desktop mode, one per research line. Each scene
// draws into its own canvas around a focus point (the open area beside the
// terminal window) and is advanced by Desktop.tsx one frame at a time.

import { STORIES, Story } from './stories';

export type RGB = [number, number, number];

export type Palette = {
  dark: boolean;
  bg: RGB;
  fg: RGB;
  warm: RGB;
  cool: RGB;
  accent: RGB;
  green: RGB;
};

// A drafting palette, after Agnes Denes' drawings and architectural plates:
// paper and ink, one red accent, and two quiet secondary inks. fg is the ink;
// accent the red; warm a sepia; cool a graphite; green a blue-black ink.
export const PALETTES: Record<'day' | 'night', Palette> = {
  night: {
    dark: true,
    bg: [16, 17, 18],
    fg: [226, 222, 212],
    warm: [200, 170, 122],
    cool: [150, 152, 156],
    accent: [228, 108, 86],
    green: [140, 170, 198],
  },
  day: {
    dark: false,
    bg: [245, 242, 234],
    fg: [38, 36, 33],
    warm: [150, 112, 62],
    cool: [118, 116, 112],
    accent: [182, 54, 40],
    green: [44, 78, 118],
  },
};

export const rgba = (c: RGB, a = 1): string =>
  `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// Canvas size (CSS px), focus point, and the radius of the area to fill.
export type Frame = { w: number; h: number; fx: number; fy: number; R: number };

// What a click landed on, in an interactive piece.
export type Hit =
  | { kind: 'dot'; id: number }
  | { kind: 'ai' }
  | { kind: 'particle'; id: number }
  | { kind: 'person' };

// The pair inspected in the self-contradiction piece (screen positions, the
// distance in units of r0, and the terms of the pair energy), read by
// ContradictionOverlay.tsx.
export type PairState = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  x: number;
  reach: number;
  lambda: number;
  beta: number;
  same: boolean;
  force: number;
  follow: boolean; // partner re-picked as the current nearest neighbour
  rhoA: number; // distance from the nucleus centre, in units of R
  rhoB: number;
  globalA: number; // the global cycle's radial force (> 0 outward)
  globalB: number;
  wall: number; // soft wall radius, in units of R
};

// Snapshot of the co-creativity piece, read by CocreationOverlay.tsx.
export type CoState = {
  mode: 'absorb' | 'loop' | 'burst' | 'amplified';
  iteration: number;
  energy: number;
  pokes: number;
  phase: 'before' | 'after' | 'co';
  selected: number | null;
  story: (Story & { user: number }) | null;
};

// Every piece can `step`; the rest is optional. `draggable` pieces can be
// orbited with the mouse; interactive ones answer clicks and say when they
// are `busy` (the slideshow then waits).
export type Scene = {
  step: (dt: number) => void;
  draggable?: boolean;
  busy?: () => boolean;
  hit?: (x: number, y: number) => Hit | null;
  click?: (hit: Hit | null) => void;
  cocreate?: () => void;
  reset?: () => void;
  state?: () => CoState;
  pair?: () => PairState | null;
  zoomBy?: (k: number) => void;
  zoomLevel?: () => number;
  resetView?: () => void;
  setFollow?: (on: boolean) => void;
  // Pieces with something to pick up and drag (the person in Many faces).
  grab?: (x: number, y: number) => boolean;
  dragTo?: (x: number, y: number) => void;
  release?: (x: number, y: number) => void;
  measureMany?: (n: number) => void;
  faces?: () => FacesState;
  setWorld?: (oneSelf: boolean) => void;
};

// Snapshot of the many-faces piece, read by FacesOverlay.tsx.
export type FacesState = {
  faces: { name: string; col: RGB; amp: number; angle: number }[];
  contexts: string[];
  where: number | null;
  face: number | null;
  counts: number[][]; // [context][face]
  auto: boolean;
  world: 'many' | 'one'; // 'one': the control, same odds in every context
  test: { N: number; x2: number; df: number; p: number | null };
};

// Camera offset from mouse dragging (radians), added to a scene's own
// camera motion. Shared and mutated by Desktop.tsx; 2D scenes ignore it.
export type View = { yaw: number; pitch: number };

export type SceneFactory = (
  ctx: CanvasRenderingContext2D,
  f: Frame,
  p: Palette,
  view: View,
) => Scene;

const TAU = Math.PI * 2;

const gauss = (): number => {
  const u = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random());
};

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

const smooth = (x: number): number => x * x * (3 - 2 * x);

// Upper tail of the χ² distribution, P(X ≥ x) with df degrees of freedom,
// via the regularized incomplete gamma function (series / continued fraction).
const chiSquareP = (x: number, df: number): number => {
  const a = df / 2;
  const z = x / 2;
  if (z <= 0) return 1;
  const lnGamma = (v: number): number => {
    const c = [
      76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
    ];
    let y = v;
    const tmp = v + 5.5 - (v + 0.5) * Math.log(v + 5.5);
    let ser = 1.000000000190015;
    for (const ci of c) ser += ci / ++y;
    return -tmp + Math.log((2.5066282746310005 * ser) / v);
  };
  const front = Math.exp(-z + a * Math.log(z) - lnGamma(a));
  if (z < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 200; n++) {
      term *= z / (a + n);
      sum += term;
      if (term < sum * 1e-12) break;
    }
    return Math.max(0, 1 - sum * front);
  }
  let b = z + 1 - a;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let n = 1; n < 200; n++) {
    const an = -n * (n - a);
    b += 2;
    d = an * d + b;
    c = b + an / c;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return Math.min(1, h * front);
};

const mix = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

// ---- The drafting look, shared by all pieces ----

// Paper with a faint graph grid (minor and major lines).
const paper = (ctx: CanvasRenderingContext2D, f: Frame, p: Palette) => {
  ctx.fillStyle = rgba(p.bg);
  ctx.fillRect(0, 0, f.w, f.h);
  ctx.lineWidth = 1;
  for (const [gap, a] of [
    [16, p.dark ? 0.03 : 0.04],
    [80, p.dark ? 0.05 : 0.07],
  ] as [number, number][]) {
    ctx.strokeStyle = rgba(p.fg, a);
    ctx.beginPath();
    for (let x = 0.5; x < f.w; x += gap) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, f.h);
    }
    for (let y = 0.5; y < f.h; y += gap) {
      ctx.moveTo(0, y);
      ctx.lineTo(f.w, y);
    }
    ctx.stroke();
  }
};

// Short heavy bars on the four sides of a drawing, as on a printed plate.
const regMarks = (
  ctx: CanvasRenderingContext2D,
  p: Palette,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
) => {
  ctx.fillStyle = rgba(p.fg, 0.85);
  ctx.fillRect(cx - 9 + rx * 0.06, cy - ry, 18, 3);
  ctx.fillRect(cx - 9 - rx * 0.06, cy + ry - 3, 18, 3);
  ctx.fillRect(cx - rx, cy - 9 - ry * 0.08, 3, 18);
  ctx.fillRect(cx + rx - 3, cy - 9 + ry * 0.08, 3, 18);
};

// A leader line from a point, ending in a short shelf and a small label.
const label = (
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  dx: number,
  dy: number,
  text: string,
  a = 0.7,
) => {
  const ex = x + dx;
  const ey = y + dy;
  const right = dx >= 0;
  ctx.strokeStyle = rgba(p.fg, a * 0.7);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.lineTo(ex + (right ? 8 : -8), ey);
  ctx.stroke();
  ctx.font = '13px Hack, monospace';
  ctx.fillStyle = rgba(p.fg, a);
  ctx.textAlign = right ? 'left' : 'right';
  ctx.fillText(text, ex + (right ? 11 : -11), ey + 4);
  ctx.textAlign = 'left';
};

// Hairline marks, one per "kind" of idea: 0 dot, 1 ring, 2 square,
// 3 triangle, 4 cross, 5 diamond, 6 ring-and-dot, 7 plus.
const mark = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  col: RGB,
  a: number,
  glyph: number,
) => {
  ctx.strokeStyle = rgba(col, a);
  ctx.fillStyle = rgba(col, a);
  ctx.lineWidth = 1;
  ctx.beginPath();
  switch (glyph % 8) {
    case 0:
      ctx.arc(x, y, s, 0, TAU);
      ctx.fill();
      return;
    case 1:
      ctx.arc(x, y, s, 0, TAU);
      break;
    case 2:
      ctx.rect(x - s, y - s, s * 2, s * 2);
      break;
    case 3:
      ctx.moveTo(x, y - s * 1.2);
      ctx.lineTo(x + s * 1.1, y + s * 0.8);
      ctx.lineTo(x - s * 1.1, y + s * 0.8);
      ctx.closePath();
      break;
    case 4:
      ctx.moveTo(x - s, y - s);
      ctx.lineTo(x + s, y + s);
      ctx.moveTo(x + s, y - s);
      ctx.lineTo(x - s, y + s);
      break;
    case 5:
      ctx.moveTo(x, y - s * 1.3);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + s * 1.3);
      ctx.lineTo(x - s, y);
      ctx.closePath();
      break;
    case 6:
      ctx.arc(x, y, s * 1.2, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, s * 0.35, 0, TAU);
      ctx.fill();
      return;
    default:
      ctx.moveTo(x - s * 1.2, y);
      ctx.lineTo(x + s * 1.2, y);
      ctx.moveTo(x, y - s * 1.2);
      ctx.lineTo(x, y + s * 1.2);
  }
  ctx.stroke();
};

// A disc filled with parallel hatching at the given angle.
const hatchDisk = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  angle: number,
  gap: number,
  col: RGB,
  a: number,
) => {
  if (r <= 0 || a <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = rgba(col, a);
  ctx.lineWidth = 0.7;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  ctx.beginPath();
  for (let d = -r; d <= r; d += gap) {
    const px = cx - uy * d;
    const py = cy + ux * d;
    ctx.moveTo(px - ux * r, py - uy * r);
    ctx.lineTo(px + ux * r, py + uy * r);
  }
  ctx.stroke();
  ctx.restore();
};

// 01 — Human–AI co-creativity vs. collective homogenization (interactive).
// Human ideas stream in from the left, each with its own mark and line
// style. By default every stream is swallowed by the AI (the hatched sphere)
// and comes out as one narrow band of identical marks. Visitors can:
//   - click a light to follow one person's idea and read what it becomes;
//   - click the AI to "intervene": a ripple runs down the band, then fades;
//   - start co-creating: the AI keeps standardizing, but a copy of each idea
//     goes around it, corrects the flattened output, and sends it back in —
//     more each round. The AI strains, its band frays, and once it can no
//     longer flatten what comes in, the band unzips into a branching tree.
// The HTML side of this (cards, buttons) lives in CocreationOverlay.tsx.
const cocreation: SceneFactory = (ctx, f, p) => {
  const L = Math.min(f.w, f.fx * 2); // visible span (left of the window)
  const H = Math.min(f.h * 0.22, L * 0.4); // half-height of the stream
  const yc = f.fy + f.h * 0.06; // a little low, leaving room for the cards
  const hx = L * (L < f.w ? 0.42 : 0.5); // the AI
  const r = Math.max(11, H * 0.12);
  const LOOP_SECONDS = 9; // co-creation rounds before the AI gives way
  const BREAK_SECONDS = 2.4; // the band unzipping into a tree

  // Drafting inks. Individuality is carried by each idea's mark and line
  // style rather than by color.
  const palette: RGB[] = [p.fg, p.fg, p.cool, p.warm];
  const hole: RGB = p.fg;
  const ink: RGB = p.fg;
  const plain: RGB = p.fg; // the standardized output
  const DASHES = [[], [], [5, 3], [1, 3], [7, 2, 1, 2]];
  const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

  // Cubic Bézier through 4 points packed as [x0,y0, x1,y1, x2,y2, x3,y3].
  const bez = (c: number[], u: number): [number, number] => {
    const v = 1 - u;
    const a = v * v * v;
    const b = 3 * v * v * u;
    const d = 3 * v * u * u;
    const e = u * u * u;
    return [
      a * c[0] + b * c[2] + d * c[4] + e * c[6],
      a * c[1] + b * c[3] + d * c[5] + e * c[7],
    ];
  };
  // A curve from a point on the left into the AI.
  const intoAI = (
    x0: number,
    y0: number,
    k1: number,
    k2: number,
    k3: number,
  ) => [
    x0,
    y0,
    x0 + (hx - x0) * k1,
    yc + (y0 - yc) * k2,
    hx - (hx - x0) * k3,
    yc + (y0 - yc) * 0.1,
    hx - r * 0.5,
    yc,
  ];

  type Stream = {
    c: number[];
    glyph: number;
    dash: number[];
    col: RGB;
    size: number;
    speed: number;
    phase: number;
    story: number;
  };
  const inputs: Stream[] = Array.from({ length: 34 }, (_, i) => ({
    c: intoAI(
      rand(10, L * 0.14),
      yc + rand(-1, 1) * H,
      rand(0.3, 0.5),
      rand(0.6, 1.2),
      rand(0.18, 0.3),
    ),
    glyph: Math.floor(rand(0, 8)),
    dash: pick(DASHES),
    col: pick(palette),
    size: rand(1.8, 3.4),
    speed: rand(0.1, 0.18),
    phase: Math.random(),
    story: i % STORIES.length,
  }));
  const dotU = (s: Stream) => (t * s.speed + s.phase) % 1;

  // The tree the band unzips into: each fork mixes its parent's color with a
  // new one, so the outputs end up more varied than what went in.
  type Branch = {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    cx: number;
    cy: number;
    depth: number;
    col: RGB;
    glyph: number;
    born: number;
    kids: number[];
  };
  const branches: Branch[] = [];
  const DEPTH = 6;
  const TRUNK = Math.min(L, f.h * 1.2) * 0.13; // keeps the tree on screen
  const grow = (
    x: number,
    y: number,
    ang: number,
    depth: number,
    col: RGB,
  ): number => {
    const len = TRUNK * Math.pow(0.8, depth) * rand(0.85, 1.15);
    const x1 = x + Math.cos(ang) * len;
    const y1 = y + Math.sin(ang) * len;
    const bend = rand(-0.2, 0.2) * len;
    const id = branches.length;
    branches.push({
      x0: x,
      y0: y,
      x1,
      y1,
      cx: (x + x1) / 2 - Math.sin(ang) * bend,
      cy: (y + y1) / 2 + Math.cos(ang) * bend,
      depth,
      col,
      glyph: Math.floor(rand(0, 8)),
      born: depth * 0.3 + rand(0, 0.1),
      kids: [],
    });
    if (depth < DEPTH) {
      const spread = rand(0.3, 0.5) * Math.pow(0.88, depth);
      for (const side of [-1, 1]) {
        const kidCol =
          depth === 0 ? pick(palette) : mix(col, pick(palette), 0.5);
        branches[id].kids.push(
          grow(
            x1,
            y1,
            ang + side * spread + rand(-0.08, 0.08),
            depth + 1,
            kidCol,
          ),
        );
      }
    }
    return id;
  };
  grow(hx + r, yc, 0, 0, ink);
  const along = (br: Branch, u: number): [number, number] => {
    const v = 1 - u;
    return [
      v * v * br.x0 + 2 * v * u * br.cx + u * u * br.x1,
      v * v * br.y0 + 2 * v * u * br.cy + u * u * br.y1,
    ];
  };

  let t = 0;
  let mode: CoState['mode'] = 'absorb';
  let energy = 0; // how hard the AI is straining (0..1)
  let breakAge = 0;
  let pokes = 0;
  let lastTouch = -1e9;
  let selected: number | null = null;
  let selU = 0; // progress of the followed light through its journey
  const ripples: number[] = []; // ages
  const pulses: { age: number; big: boolean }[] = [];

  // Echoes: a person keeps a copy of their idea. Stage 0, the copy travels
  // around the AI and meets the flattened output downstream, correcting it
  // back to the original; stage 1, the corrected output curls back into the
  // AI from the other side. Together the two stages draw a petal-shaped loop.
  type Echo = {
    stage: 0 | 1;
    u: number;
    dur: number;
    copy: number[];
    back: number[];
    col: RGB;
    trail: number[];
  };
  const echoes: Echo[] = [];
  let echoAcc = 0;
  const fixes: { x: number; age: number; col: RGB }[] = []; // corrections
  const spawnEcho = () => {
    const s = pick(inputs);
    const side = Math.random() < 0.5 ? -1 : 1;
    const d = rand(r * 3, Math.min(L * 0.24, (L - hx) * 0.85)); // downstream
    const bx = hx + d;
    const [x0, y0] = [s.c[0], s.c[1]];
    echoes.push({
      stage: 0,
      u: 0,
      dur: rand(2.2, 3),
      copy: [
        x0,
        y0,
        hx - (hx - x0) * 0.3,
        yc + side * (r * 3 + H * 0.45),
        bx - d * 0.35,
        yc + side * r * 2.4,
        bx,
        yc,
      ],
      back: [
        bx,
        yc,
        bx + d * 0.45,
        yc - side * d * 0.85,
        hx + r * 0.3,
        yc - side * d * 1.05,
        hx,
        yc - side * r * 0.9,
      ],
      col: s.col,
      trail: [],
    });
  };

  type Spark = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    col: RGB;
    size: number;
  };
  const sparks: Spark[] = [];
  type Runner = { branch: number; u: number; col: RGB };
  const runners: Runner[] = [];
  let runnerAcc = 0;

  // The homogenized band: columns of identical dots. Ripples nudge it; strain
  // makes it wobble, widen, and leak color.
  const BAND_SPEED = 28;
  const bandY = (x: number, k = 0) => {
    let dy = 0;
    for (const age of ripples) {
      const front = hx + r * 2 + age * L * 0.16;
      const a = r * 1.1 * Math.exp(-age * 1.5);
      const q = (x - front) / (r * 3);
      dy += a * Math.exp(-q * q) * Math.sin((x - front) / (r * 0.7));
    }
    if (energy > 0) {
      dy += energy * energy * r * 1.6 * Math.sin(x * 0.045 + t * 3.1 + k * 1.7);
    }
    return yc + dy;
  };

  // A hairline stream, fading as it nears the AI.
  const strokeCurve = (
    c: number[],
    col: RGB,
    a: number,
    w: number,
    dash: number[] = [],
  ) => {
    const g = ctx.createLinearGradient(c[0], 0, c[6], 0);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.7, rgba(col, a * 0.8));
    g.addColorStop(1, rgba(col, a * 0.3));
    ctx.strokeStyle = g;
    ctx.lineWidth = w;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(c[0], c[1]);
    ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const dot = (
    x: number,
    y: number,
    s: number,
    col: RGB,
    a = 0.92,
    glyph = 0,
  ) => mark(ctx, x, y, s, col, a, glyph);

  // The followed light's route through the tree (fixed per light).
  const routeFor = (i: number) => {
    const route = [0];
    let seed = i * 7 + 3;
    while (branches[route[route.length - 1]].kids.length) {
      const kids = branches[route[route.length - 1]].kids;
      route.push(kids[seed % 2]);
      seed = Math.floor(seed / 2) + i;
    }
    return route;
  };

  const step = (dt: number) => {
    t += dt;

    // ---- simulate ----
    if (mode === 'loop') {
      energy = Math.min(1, energy + dt / LOOP_SECONDS);
      if (energy >= 1) {
        mode = 'burst';
        breakAge = 0;
        pulses.push({ age: 0, big: true });
        for (let i = 0; i < 90; i++) {
          const a = rand(-1.2, 1.2);
          const v = rand(80, 260);
          sparks.push({
            x: hx + r,
            y: yc,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: rand(0.6, 1),
            col: pick(palette),
            size: rand(1.2, 2.8),
          });
        }
      }
    }
    if (mode === 'burst' || mode === 'amplified') {
      // breakAge keeps counting after the break: it drives the tree's growth.
      breakAge += dt;
      energy = Math.max(0, energy - dt * 0.8);
      if (mode === 'burst' && breakAge > BREAK_SECONDS) mode = 'amplified';
    }

    // More echoes each round; a steady trickle once the tree has opened.
    const echoRate =
      mode === 'loop' ? 2 + 26 * energy : mode === 'absorb' ? 0 : 3;
    echoAcc += dt * echoRate;
    while (echoAcc > 1) {
      if (echoes.length < 140) spawnEcho();
      echoAcc -= 1;
    }
    for (let i = echoes.length - 1; i >= 0; i--) {
      const e = echoes[i];
      e.u += dt / e.dur;
      if (e.u >= 1) {
        if (e.stage === 1) {
          echoes.splice(i, 1);
          continue;
        }
        fixes.push({ x: e.copy[6], age: 0, col: e.col });
        e.stage = 1;
        e.u = 0;
        e.dur = rand(1.6, 2.2);
      }
    }
    for (let i = fixes.length - 1; i >= 0; i--) {
      fixes[i].age += dt;
      if (fixes[i].age > 0.7) fixes.splice(i, 1);
    }

    // A straining AI starts to spill: color escapes the standardization.
    if (
      mode === 'loop' &&
      energy > 0.55 &&
      Math.random() < dt * (energy - 0.55) * 60
    ) {
      const a = rand(-1, 1);
      sparks.push({
        x: hx + r * Math.cos(a),
        y: yc + r * Math.sin(a),
        vx: Math.cos(a) * rand(30, 90),
        vy: Math.sin(a) * rand(30, 90),
        life: rand(0.4, 0.7),
        col: pick(palette),
        size: rand(1, 2),
      });
    }
    const drag = Math.exp(-1.4 * dt);
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= drag;
      s.vy *= drag;
      s.life -= dt * 0.5;
      if (s.life <= 0) sparks.splice(i, 1);
    }

    // Light running out along the tree, once it has grown.
    const treeT = mode === 'burst' || mode === 'amplified' ? breakAge : -1;
    if (treeT > 1) {
      runnerAcc += dt * 14;
      while (runnerAcc > 1) {
        runners.push({ branch: 0, u: 0, col: ink });
        runnerAcc -= 1;
      }
    }
    for (let i = runners.length - 1; i >= 0; i--) {
      const rn = runners[i];
      const br = branches[rn.branch];
      rn.u += (dt * 140) / Math.hypot(br.x1 - br.x0, br.y1 - br.y0);
      if (rn.u >= 1) {
        if (!br.kids.length) {
          runners.splice(i, 1);
          continue;
        }
        rn.branch = pick(br.kids);
        rn.u = 0;
        rn.col = branches[rn.branch].col;
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i] += dt;
      if (ripples[i] > 3.5) ripples.splice(i, 1);
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].age += dt;
      if (pulses[i].age > (pulses[i].big ? 1.8 : 1.2)) pulses.splice(i, 1);
    }
    if (selected !== null) selU = (selU + dt / 6) % 1;

    // ---- draw ----
    paper(ctx, f, p);
    regMarks(ctx, p, L / 2, yc, L * 0.47, H * 1.5);
    const dim = selected === null ? 1 : mode === 'absorb' ? 0.14 : 0.35;
    const bandA =
      mode === 'absorb' || mode === 'loop'
        ? 1
        : Math.max(0, 1 - breakAge / 0.9);
    const opened = mode === 'burst' || mode === 'amplified';

    // Band (fraying under strain, unzipping at the break).
    if (bandA > 0) {
      const bandH = r * 1.2 * (1 + energy * 1.2);
      ctx.fillStyle = rgba(
        ink,
        (p.dark ? 0.08 : 0.14) * bandA * (1 - energy * 0.5),
      );
      ctx.beginPath();
      for (let x = hx; x <= f.w; x += 6) ctx.lineTo(x, bandY(x) - bandH / 2);
      for (let x = f.w; x >= hx; x -= 6) ctx.lineTo(x, bandY(x) + bandH / 2);
      ctx.fill();
      const spacing = r * 1.5;
      const offset = (t * BAND_SPEED) % spacing;
      let col = 0;
      for (let x = hx + r * 1.4 + offset; x < f.w; x += spacing, col++) {
        for (let k = -2; k <= 2; k++) {
          const leak = energy * energy * 0.85;
          const c = mix(
            plain,
            palette[(col * 5 + k + 40) % palette.length],
            leak,
          );
          const jx =
            energy * energy * r * 0.6 * Math.sin(col * 3.7 + k * 1.3 + t * 2);
          const y = bandY(x, k) + k * bandH * 0.17;
          // Under strain the identical squares start to become marks of
          // their own again.
          const g = (col * 5 + k + 40) % 8;
          if (leak > 0.25 && (col + k) % 3 !== 0) {
            mark(ctx, x + jx, y, 1.4 + energy, c, 0.8 * bandA * dim, g);
          } else {
            ctx.fillStyle = rgba(c, 0.75 * bandA * dim);
            ctx.fillRect(x + jx - 1.1, y - 1.1, 2.2, 2.2);
          }
        }
      }
    }

    // The tree.
    if (opened) {
      for (const br of branches) {
        const g = Math.min(1, Math.max(0, (breakAge - br.born) / 0.35));
        if (g <= 0) continue;
        const steps = 10;
        ctx.strokeStyle = rgba(br.col, 0.75 * dim);
        ctx.lineWidth = Math.max(0.6, 2 * Math.pow(0.75, br.depth));
        ctx.setLineDash(br.depth > 3 ? DASHES[br.glyph % DASHES.length] : []);
        ctx.beginPath();
        ctx.moveTo(br.x0, br.y0);
        for (let k = 1; k <= steps; k++) {
          const [x, y] = along(br, (k / steps) * g);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        if (!br.kids.length && g >= 1) {
          dot(
            br.x1,
            br.y1,
            2.4 + Math.sin(t * 2 + br.x1) * 0.4,
            br.col,
            0.95 * dim,
            br.glyph,
          );
        }
      }
      for (const rn of runners) {
        const [x, y] = along(branches[rn.branch], rn.u);
        dot(x, y, 1.6, rn.col, 0.9 * dim);
      }
    }

    // Input streams.
    for (let i = 0; i < inputs.length; i++) {
      if (i === selected) continue;
      const s = inputs[i];
      strokeCurve(s.c, s.col, (p.dark ? 0.55 : 0.6) * dim, 0.8, s.dash);
    }

    // Echoes, with short trails: the copy travels faint, the corrected output
    // returns at full strength.
    for (const e of echoes) {
      const path = e.stage === 0 ? e.copy : e.back;
      const [x, y] = bez(path, e.u);
      if (e.stage === 1 && e.u === 0) e.trail.length = 0;
      e.trail.push(x, y);
      if (e.trail.length > 28) e.trail.splice(0, 2);
      const strength = e.stage === 0 ? 0.55 : 1;
      ctx.strokeStyle = rgba(e.col, 0.45 * strength * dim);
      ctx.lineWidth = e.stage === 0 ? 0.7 : 1;
      ctx.setLineDash(e.stage === 0 ? [2, 3] : []);
      ctx.beginPath();
      for (let k = 0; k < e.trail.length; k += 2) {
        if (k === 0) ctx.moveTo(e.trail[k], e.trail[k + 1]);
        else ctx.lineTo(e.trail[k], e.trail[k + 1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      dot(x, y, e.stage === 0 ? 1.3 : 2, e.col, 0.9 * strength * dim, e.stage);
    }
    // Where a copy meets the band, the flattened output is corrected.
    for (const fx of fixes) {
      const k = fx.age / 0.7;
      ctx.strokeStyle = rgba(p.accent, (1 - k) * 0.8 * dim);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(fx.x, bandY(fx.x), 3 + k * r * 0.9, 0, TAU);
      ctx.stroke();
    }

    // The AI: halo, rings (wobbling under strain), core. Once it gives way
    // it becomes hollow, a junction rather than a sink.
    const hollow = opened ? Math.min(1, breakAge / 1.2) : 0;
    const jx = energy > 0.3 ? rand(-1, 1) * energy * 1.5 : 0;
    const jy = energy > 0.3 ? rand(-1, 1) * energy * 1.5 : 0;
    const cx = hx + jx;
    const cy = yc + jy;
    // A halo drawn as line density: many fine concentric circles.
    ctx.lineWidth = 0.6;
    for (let k = 0; k < 14; k++) {
      ctx.strokeStyle = rgba(ink, 0.2 * (1 - k / 14) * (1 - hollow * 0.6));
      ctx.beginPath();
      ctx.arc(cx, cy, r * (1.15 + k * 0.17 * (1 + energy * 0.3)), 0, TAU);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    [1.55, 2.25, 3.0].forEach((k, i) => {
      const wob = 1 + 0.03 * Math.sin(t * 1.6 + i);
      const rx = r * k * wob * (1 + energy * 0.12 * Math.sin(t * 7 + i * 2));
      const ry = r * k * wob * (1 + energy * 0.12 * Math.cos(t * 6 + i * 3));
      ctx.strokeStyle = rgba(ink, 0.4 * (1 - hollow * 0.4));
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, t * energy * 2 + i, 0, TAU);
      ctx.stroke();
    });
    for (const pl of pulses) {
      const life = pl.big ? 1.8 : 1.2;
      const rad = pl.big ? r + pl.age * L * 0.55 : r * (1.2 + pl.age * 3.2);
      ctx.strokeStyle = rgba(
        p.accent,
        (1 - pl.age / life) * (pl.big ? 0.7 : 0.6),
      );
      ctx.lineWidth = pl.big ? 2 : 1.5;
      ctx.beginPath();
      ctx.arc(hx, yc, rad, 0, TAU);
      ctx.stroke();
    }
    // The sphere: cross-hatched dark, draining to an open ring at the break.
    ctx.fillStyle = rgba(p.bg);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    hatchDisk(ctx, cx, cy, r, -0.5, 1.8, ink, 0.85 * (1 - hollow * 0.9));
    hatchDisk(ctx, cx, cy, r * 0.8, 0.9, 2.2, ink, 0.6 * (1 - hollow));
    ctx.strokeStyle = rgba(ink, 0.9);
    ctx.lineWidth = 1 + hollow;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    for (let i = 0; i < inputs.length; i++) {
      if (i === selected) continue;
      const s = inputs[i];
      const u = dotU(s);
      const [x, y] = bez(s.c, u);
      const fade = u > 0.7 ? (u - 0.7) / 0.3 : 0;
      dot(s.c[0], s.c[1], s.size, s.col, 0.92 * dim, s.glyph);
      dot(
        x,
        y,
        s.size * (1 - u * 0.5),
        s.col,
        0.92 * dim * (1 - fade * 0.6),
        s.glyph,
      );
    }
    for (const s of sparks)
      dot(s.x, s.y, s.size, s.col, Math.max(0, s.life) * 0.9);

    annotate(opened, bandA);

    // The followed light, on top of everything.
    if (selected !== null) {
      const s = inputs[selected];
      strokeCurve(s.c, p.accent, 0.95, 1.6);
      dot(s.c[0], s.c[1], s.size, p.accent, 1, s.glyph);
      const ring = (x: number, y: number, _col: RGB) => {
        ctx.strokeStyle = rgba(p.accent, 0.9);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 9 + Math.sin(t * 5) * 1.5, 0, TAU);
        ctx.stroke();
      };
      if (selU < 0.6) {
        const u = selU / 0.6;
        const [x, y] = bez(s.c, u);
        const fade = u > 0.7 ? ((u - 0.7) / 0.3) * (opened ? 0.3 : 1) : 0;
        dot(
          x,
          y,
          s.size * 1.4 * (1 - u * 0.4),
          p.accent,
          1 - fade * 0.5,
          s.glyph,
        );
        ring(x, y, s.col);
      } else if (!opened) {
        // Out as one more identical dot in the band.
        const x = hx + r * 1.4 + ((selU - 0.6) / 0.4) * L * 0.5;
        const y = bandY(x);
        ctx.fillStyle = rgba(plain, 1);
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        ring(x, y, ink);
      } else {
        // Out along its own route through the tree, in its own colors.
        const route = routeFor(selected);
        const u = ((selU - 0.6) / 0.4) * route.length;
        const br = branches[route[Math.min(route.length - 1, Math.floor(u))]];
        const [x, y] = along(br, Math.min(1, u - Math.floor(u)));
        ctx.strokeStyle = rgba(p.accent, 0.9);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(branches[route[0]].x0, branches[route[0]].y0);
        for (const id of route) {
          const b2 = branches[id];
          ctx.quadraticCurveTo(b2.cx, b2.cy, b2.x1, b2.y1);
        }
        ctx.stroke();
        dot(x, y, s.size * (1 + u / route.length), p.accent, 1, br.glyph);
        ring(x, y, br.col);
      }
    }
  };

  // Plate annotations.
  const annotate = (opened: boolean, bandA: number) => {
    const a = selected === null ? 0.7 : 0.3;
    label(ctx, p, L * 0.07, yc - H * 0.95, 20, -26, 'H  human ideas', a);
    label(ctx, p, hx + r * 0.7, yc - r * 0.7, 34, -40, 'AI', a);
    if (bandA > 0.5) {
      // Point back from the right when the label would run under the window.
      const sx = hx + L * 0.32;
      const dx = sx + 230 > L ? -18 : 18;
      label(ctx, p, sx, yc + r, dx, 36, 'S  standardized output', a * bandA);
    }
    if (opened)
      label(
        ctx,
        p,
        hx + TRUNK * 1.6,
        yc + TRUNK * 0.5,
        26,
        60,
        'D  diverged ideas',
        a,
      );
  };

  const hit = (x: number, y: number): Hit | null => {
    if (Math.hypot(x - hx, y - yc) < r * 1.8) return { kind: 'ai' };
    let best: number | null = null;
    let bestD = 14;
    inputs.forEach((s, i) => {
      const [dx, dy] = bez(s.c, dotU(s));
      for (const [px, py] of [
        [s.c[0], s.c[1]],
        [dx, dy],
      ]) {
        const d = Math.hypot(x - px, y - py);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    });
    return best === null ? null : { kind: 'dot', id: best };
  };

  const phase = (): CoState['phase'] =>
    selU < 0.6
      ? 'before'
      : mode === 'burst' || mode === 'amplified'
      ? 'co'
      : 'after';

  return {
    step,
    hit,
    click: (h) => {
      lastTouch = t;
      if (!h) selected = null;
      else if (h.kind === 'dot') {
        selected = h.id;
        selU = 0;
      } else {
        pokes++;
        pulses.push({ age: 0, big: false });
        if (mode === 'absorb') ripples.push(0);
      }
    },
    cocreate: () => {
      lastTouch = t;
      if (mode !== 'absorb') return;
      mode = 'loop';
      energy = 0;
      if (selected !== null) selU = 0;
    },
    reset: () => {
      lastTouch = t;
      mode = 'absorb';
      energy = 0;
      breakAge = 0;
      echoes.length = 0;
      fixes.length = 0;
      runners.length = 0;
      sparks.length = 0;
      if (selected !== null) selU = 0;
    },
    busy: () =>
      selected !== null ||
      mode === 'loop' ||
      mode === 'burst' ||
      t - lastTouch < 15,
    state: () => ({
      mode,
      iteration: mode === 'loop' ? 1 + Math.floor(energy * 8) : 0,
      energy,
      pokes,
      phase: phase(),
      selected,
      story:
        selected === null
          ? null
          : { user: selected + 1, ...STORIES[inputs[selected].story] },
    }),
  };
};

// 02 — Self-contradiction as the engine of innovation.
// A 3D nucleus held together by its own contradiction, seen by a slowly
// orbiting camera. Every particle feels a short-range repulsive core and a
// slightly longer-range attraction (like the strong force), and opposites
// (filled / hollow) bind tighter than likes. On top of that, the whole system
// swings between attraction and repulsion: it condenses into a bonded
// structure, tears itself apart in an outward shell-wave, then re-forms —
// never in quite the same arrangement. Now and then a particle flips kind and
// throws off a spark (a nod to weak-force decay).
const contradiction: SceneFactory = (ctx, f, p, view) => {
  const N = 220;
  const r0 = Math.max(12, f.R * 0.135); // equilibrium spacing
  const PERIOD = 7; // seconds per attract -> repel -> attract cycle
  const WALL = f.R * 1.35; // soft outer boundary (a sphere)
  const CAM = f.R * 3.2; // camera distance, for perspective
  const PITCH = 0.38; // camera looks slightly down on the nucleus
  type Particle = {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    kind: 0 | 1;
    flash: number;
  };
  type Shell = { r: number; v: number; a: number; col: RGB };
  type Spark = {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
  };

  // Uniform random direction on the unit sphere.
  const direction = (): [number, number, number] => {
    const z = rand(-1, 1);
    const a = Math.random() * TAU;
    const s = Math.sqrt(1 - z * z);
    return [Math.cos(a) * s, Math.sin(a) * s, z];
  };

  // Positions are relative to the nucleus centre.
  const parts: Particle[] = Array.from({ length: N }, () => {
    const [ux, uy, uz] = direction();
    const d = Math.cbrt(Math.random()) * f.R * 0.6;
    return {
      x: ux * d,
      y: uy * d,
      z: uz * d,
      vx: 0,
      vy: 0,
      vz: 0,
      kind: Math.random() < 0.5 ? 0 : 1,
      flash: 0,
    };
  });
  const shells: Shell[] = [];
  const sparks: Spark[] = [];
  let t = 0;
  let lastAtt = 1;
  let curAtt = 1;
  let yawAuto = 0;

  // Inspector: a selected pair the camera centers and zooms on. `screen`
  // holds each particle's last drawn position, for clicks.
  let pairA: number | null = null;
  let pairB: number | null = null;
  let userZoom = 1;
  let zoom = 1;
  const cam = { x: 0, y: 0, z: 0 };
  let shift = 0; // screen offset: the pair sits low, leaving room for its card
  let lastTouch = -1e9;
  let follow = true; // keep re-pairing A with its current nearest neighbour
  let followAcc = 0;
  let screen: { x: number; y: number; r: number }[] = [];
  const dist = (i: number, j: number) => {
    const a = parts[i];
    const b = parts[j];
    return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  };
  const nearest = (i: number) => {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const d = dist(i, j);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    return best;
  };

  // 1 = attraction dominates, 0 = repulsion dominates (with plateaus).
  const attraction = (time: number) =>
    0.5 + 0.5 * Math.tanh(3 * Math.cos((TAU * time) / PERIOD));

  // The pair rule, shared by the simulation and the inspector: the force
  // along a pair (> 0 pushes apart). A hard repulsive core inside r0, a
  // bounded attraction out to REACH·r0 (stronger between opposite kinds).
  const REACH = 2.2;
  const BETA_SAME = 0.6;
  const pairForce = (d: number, same: boolean, att: number) => {
    if (d < r0) return Math.min(20000, 2500 * ((r0 / d) ** 4 - 1));
    if (d < REACH * r0) {
      const beta = same ? BETA_SAME : 1;
      return -260 * att * beta * Math.sin((Math.PI * (d - r0)) / (1.2 * r0));
    }
    return 0;
  };

  // The global cycle, felt by each particle on its own: a pull toward the
  // centre while attracting, an outward pressure while repelling, and a soft
  // wall. Returns the radial force (> 0 pushes outward) at distance d.
  const globalForce = (d: number, att: number) =>
    -1.2 * att * d +
    300 * (1 - att) * Math.max(0, 1 - d / (2 * f.R)) -
    (d > WALL ? (d - WALL) * 8 : 0);

  const physics = (dt: number, att: number) => {
    const ax = new Float32Array(N);
    const ay = new Float32Array(N);
    const az = new Float32Array(N);
    const reach2 = (REACH * r0) ** 2;
    for (let i = 0; i < N; i++) {
      const a = parts[i];
      for (let j = i + 1; j < N; j++) {
        const b = parts[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > reach2) continue;
        const d = Math.sqrt(d2) || 0.01;
        const k = pairForce(d, a.kind === b.kind, att) / d;
        ax[i] -= dx * k;
        ay[i] -= dy * k;
        az[i] -= dz * k;
        ax[j] += dx * k;
        ay[j] += dy * k;
        az[j] += dz * k;
      }
    }
    const damp = Math.exp(-1.8 * dt);
    for (let i = 0; i < N; i++) {
      const a = parts[i];
      const d = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) || 0.01;
      const radial = globalForce(d, att);
      ax[i] += (a.x / d) * radial + (Math.random() - 0.5) * 40;
      ay[i] += (a.y / d) * radial + (Math.random() - 0.5) * 40;
      az[i] += (a.z / d) * radial + (Math.random() - 0.5) * 40;
      a.vx = (a.vx + ax[i] * dt) * damp;
      a.vy = (a.vy + ay[i] * dt) * damp;
      a.vz = (a.vz + az[i] * dt) * damp;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.z += a.vz * dt;
      if (a.flash > 0) a.flash -= dt * 2;
    }
  };

  const advance = (dt: number) => {
    t += dt;
    const att = attraction(t);
    curAtt = att;
    // Camera: slow the orbit and follow the pair while one is inspected,
    // zooming in just enough to keep both particles in view.
    yawAuto += dt * (pairA !== null ? 0.05 : 0.18);
    let target = { x: 0, y: 0, z: 0 };
    let targetZoom = userZoom;
    if (pairA !== null && pairB !== null) {
      const a = parts[pairA];
      const b = parts[pairB];
      target = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
      const half = Math.max(r0, dist(pairA, pairB) / 2);
      targetZoom = Math.max(
        1,
        Math.min(Math.max(userZoom, 3), (f.R * 0.55) / half),
      );
    }
    const ease = Math.min(1, dt * 3);
    cam.x += (target.x - cam.x) * ease;
    cam.y += (target.y - cam.y) * ease;
    cam.z += (target.z - cam.z) * ease;
    zoom += (targetZoom - zoom) * ease;
    shift += ((pairA !== null ? f.h * 0.13 : 0) - shift) * ease;
    if (pairA !== null && follow) {
      followAcc += dt;
      if (followAcc > 0.4) {
        followAcc = 0;
        pairB = nearest(pairA);
      }
    }
    // Shell-waves at each turn: outward as repulsion takes over, inward as
    // attraction pulls everything back.
    if (lastAtt >= 0.5 && att < 0.5) {
      shells.push({ r: r0 * 3, v: f.R * 0.7, a: 0.6, col: p.accent });
    } else if (lastAtt < 0.5 && att >= 0.5) {
      shells.push({ r: WALL, v: -f.R * 0.6, a: 0.5, col: p.fg });
    }
    lastAtt = att;
    const sub = dt > 1 / 50 ? 4 : 2;
    for (let s = 0; s < sub; s++) physics(dt / sub, att);

    // Occasional decay: a particle flips kind and emits a spark.
    if (Math.random() < dt * 1.5) {
      const a = parts[Math.floor(Math.random() * N)];
      a.kind = a.kind === 0 ? 1 : 0;
      a.flash = 1;
      const [ux, uy, uz] = direction();
      const v = f.R * rand(0.9, 1.4);
      sparks.push({
        x: a.x,
        y: a.y,
        z: a.z,
        vx: ux * v,
        vy: uy * v,
        vz: uz * v,
        life: 1,
      });
    }
    for (const s of shells) {
      s.r += s.v * dt;
      s.a -= dt * 0.3;
    }
    for (const s of sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.life -= dt * 0.8;
    }
    for (let i = shells.length - 1; i >= 0; i--) {
      if (shells[i].a <= 0 || shells[i].r <= 0) shells.splice(i, 1);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      if (sparks[i].life <= 0) sparks.splice(i, 1);
    }
    return att;
  };

  // Orbiting camera: yaw around the vertical axis, fixed pitch, perspective.
  // Returns screen x, y, scale, and depth (0 = far, 1 = near).
  let sinP = 0;
  let cosP = 1;
  let cosY = 1;
  let sinY = 0;
  const project = (wx: number, wy: number, wz: number) => {
    const x = wx - cam.x;
    const y = wy - cam.y;
    const z = wz - cam.z;
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    const y2 = y * cosP - z1 * sinP;
    const z2 = y * sinP + z1 * cosP;
    const s = CAM / (CAM + z2);
    return {
      x: f.fx + x1 * s * zoom,
      y: f.fy + shift + y2 * s * zoom,
      s: s * Math.pow(zoom, 0.75),
      depth: Math.min(1, Math.max(0, 0.5 - z2 / (2.6 * f.R))),
    };
  };

  // Fog: far things fade toward the background.
  const fogged = (col: RGB, depth: number) =>
    mix(p.bg, col, 0.25 + 0.75 * depth);

  // A circle on the sphere's equator plane (lifted by `off`), or on one of
  // the two vertical planes.
  const circle3d = (
    r: number,
    plane: 0 | 1 | 2,
    col: RGB,
    a: number,
    off = 0,
  ) => {
    ctx.strokeStyle = rgba(col, a);
    ctx.beginPath();
    for (let k = 0; k <= 64; k++) {
      const u = (k / 64) * TAU;
      const c = Math.cos(u) * r;
      const s = Math.sin(u) * r;
      const pt =
        plane === 0
          ? project(c, off, s)
          : plane === 1
          ? project(c, s, 0)
          : project(0, c, s);
      if (k === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  };

  const draw = (att: number) => {
    const yaw = yawAuto + view.yaw;
    const pitch = PITCH + view.pitch;
    cosY = Math.cos(yaw);
    sinY = Math.sin(yaw);
    cosP = Math.cos(pitch);
    sinP = Math.sin(pitch);
    paper(ctx, f, p);
    regMarks(ctx, p, f.fx, f.fy, f.R * 1.5, f.R * 1.4);

    // Reference frame: a faint dotted equator gives the space depth.
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    circle3d(WALL, 0, p.fg, p.dark ? 0.16 : 0.22);
    ctx.setLineDash([]);

    // Shell-waves drawn as line-density spheres: parallels plus two
    // meridians, in hairline.
    for (const s of shells) {
      ctx.lineWidth = 0.6;
      for (let k = 1; k < 12; k++) {
        const lat = -Math.PI / 2 + (k * Math.PI) / 12;
        circle3d(
          s.r * Math.cos(lat),
          0,
          s.col,
          s.a * 0.55,
          s.r * Math.sin(lat),
        );
      }
      circle3d(s.r, 1, s.col, s.a * 0.7);
      circle3d(s.r, 2, s.col, s.a * 0.7);
    }

    const pr = parts.map((a, i) => ({ a, i, q: project(a.x, a.y, a.z) }));
    screen = pr.map(({ q }) => ({
      x: q.x,
      y: q.y,
      r: 2.7 * q.s * (0.7 + 0.6 * q.depth),
    }));
    const inspecting = pairA !== null && pairB !== null;
    const others = inspecting ? 0.3 : 1; // dim everything but the pair

    // Bonds, bucketed by depth so far ones fade.
    const bond2 = (1.35 * r0) ** 2; // nearest neighbours only, keeps the lattice legible
    const buckets: number[][] = [[], [], [], []];
    for (let i = 0; i < N; i++) {
      const a = parts[i];
      for (let j = i + 1; j < N; j++) {
        const b = parts[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        if (dx * dx + dy * dy + dz * dz < bond2) {
          const depth = (pr[i].q.depth + pr[j].q.depth) / 2;
          buckets[Math.min(3, Math.floor(depth * 4))].push(i, j);
        }
      }
    }
    buckets.forEach((list, k) => {
      ctx.strokeStyle = rgba(
        p.fg,
        ((p.dark ? 0.06 : 0.08) + k * (p.dark ? 0.07 : 0.08)) * others,
      );
      ctx.lineWidth = 0.6 + k * 0.25;
      ctx.beginPath();
      for (let n = 0; n < list.length; n += 2) {
        const qa = pr[list[n]].q;
        const qb = pr[list[n + 1]].q;
        ctx.moveTo(qa.x, qa.y);
        ctx.lineTo(qb.x, qb.y);
      }
      ctx.stroke();
    });

    for (const s of sparks) {
      const q0 = project(s.x, s.y, s.z);
      const q1 = project(
        s.x - s.vx * 0.06,
        s.y - s.vy * 0.06,
        s.z - s.vz * 0.06,
      );
      ctx.strokeStyle = rgba(
        fogged(p.accent, q0.depth),
        Math.max(0, s.life) * 0.9,
      );
      ctx.lineWidth = 1.5 * q0.s;
      ctx.beginPath();
      ctx.moveTo(q0.x, q0.y);
      ctx.lineTo(q1.x, q1.y);
      ctx.stroke();
    }

    // Particles, far to near, sized and fogged by depth.
    pr.sort((m, n) => m.q.depth - n.q.depth);
    // Two kinds: filled and hollow. A flipping particle flashes red.
    for (const { a, i, q } of pr) {
      const base = fogged(p.fg, q.depth);
      const size = 2.5 * q.s * (0.7 + 0.6 * q.depth);
      const alpha = i === pairA || i === pairB ? 1 : others;
      if (a.flash > 0) {
        ctx.strokeStyle = rgba(p.accent, a.flash * alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(q.x, q.y, size + 3 + (1 - a.flash) * 6, 0, TAU);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(q.x, q.y, size, 0, TAU);
      if (a.kind === 0) {
        ctx.fillStyle = rgba(base, 0.95 * alpha);
        ctx.fill();
      } else {
        ctx.fillStyle = rgba(p.bg, alpha);
        ctx.fill();
        ctx.strokeStyle = rgba(base, 0.95 * alpha);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    // A few particles are labelled, like points on a plate.
    if (!inspecting) {
      for (let i = 0; i < 5; i++) {
        const q = screen[i];
        label(ctx, p, q.x, q.y, i % 2 ? -18 : 18, -16, `P${i + 1}`, 0.6);
      }
    }

    // The inspected pair: the force between them, as a link and two arrows.
    if (inspecting) {
      const a = parts[pairA];
      const b = parts[pairB];
      const d = dist(pairA, pairB);
      const F = pairForce(d, a.kind === b.kind, att);
      const col = d < r0 ? p.accent : d < REACH * r0 ? p.green : p.fg;
      const qa = screen[pairA];
      const qb = screen[pairB];
      const len = Math.hypot(qb.x - qa.x, qb.y - qa.y) || 1;
      const ux = (qb.x - qa.x) / len;
      const uy = (qb.y - qa.y) / len;
      ctx.strokeStyle = rgba(col, 0.9);
      ctx.lineWidth = 2;
      if (F === 0) ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(qa.x, qa.y);
      ctx.lineTo(qb.x, qb.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const arrow = (q: { x: number; y: number; r: number }, dir: number) => {
        if (F === 0) return;
        const m = 10 + Math.min(1, Math.abs(F) / 400) * 40;
        const sx = q.x + ux * dir * (q.r + 6);
        const sy = q.y + uy * dir * (q.r + 6);
        const ex = sx + ux * dir * m;
        const ey = sy + uy * dir * m;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - (ux * dir * 7 - uy * 4), ey - (uy * dir * 7 + ux * 4));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - (ux * dir * 7 + uy * 4), ey - (uy * dir * 7 - ux * 4));
        ctx.stroke();
      };
      // Repulsion pushes each away from the other; attraction pulls together.
      const out = F > 0 ? -1 : 1;
      ctx.lineWidth = 2;
      arrow(qa, out);
      arrow(qb, -out);
      for (const q of [qa, qb]) {
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r * 2.2 + 5 + Math.sin(t * 5) * 1.2, 0, TAU);
        ctx.stroke();
      }
      // The global cycle's push on each, as a faint dashed arrow (radial).
      ctx.strokeStyle = rgba(p.fg, 0.55);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      for (const i of [pairA, pairB]) {
        const m = parts[i];
        const dm = Math.hypot(m.x, m.y, m.z) || 1;
        const g = globalForce(dm, att);
        if (Math.abs(g) < 5) continue;
        const k = (Math.sign(g) * r0 * 0.6) / dm;
        const q0 = screen[i];
        const q1 = project(m.x * (1 + k), m.y * (1 + k), m.z * (1 + k));
        const len = Math.hypot(q1.x - q0.x, q1.y - q0.y) || 1;
        const gx = (q1.x - q0.x) / len;
        const gy = (q1.y - q0.y) / len;
        const L2 = 10 + Math.min(1, Math.abs(g) / 300) * 30;
        const sx = q0.x + gx * (q0.r + 4);
        const sy = q0.y + gy * (q0.r + 4);
        const ex = sx + gx * L2;
        const ey = sy + gy * L2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.lineTo(ex - gx * 6 + gy * 3.5, ey - gy * 6 - gx * 3.5);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - gx * 6 - gy * 3.5, ey - gy * 6 + gx * 3.5);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Phase meter: where the system is in its attract / repel cycle.
    const mx = f.fx - f.R;
    const my = f.fy - f.R * 1.25;
    const mw = Math.min(160, f.R * 0.9);
    ctx.font = '14px Hack, monospace';
    ctx.fillStyle = rgba(p.fg, 0.7);
    ctx.fillText(
      att >= 0.5 ? 'attraction: building' : 'repulsion: breaking',
      mx,
      my,
    );
    ctx.strokeStyle = rgba(p.fg, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k <= 60; k++) {
      const x = mx + (k / 60) * mw;
      const y = my + 14 - (attraction((k / 60) * PERIOD) - 0.5) * 12;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const ph = (t % PERIOD) / PERIOD;
    ctx.fillStyle = rgba(att >= 0.5 ? p.fg : p.accent);
    ctx.beginPath();
    ctx.arc(mx + ph * mw, my + 14 - (att - 0.5) * 12, 3, 0, TAU);
    ctx.fill();
  };

  // Settle into a first structure before it is shown.
  for (let i = 0; i < 120; i++) advance(1 / 60);
  const clear = () => {
    pairA = null;
    pairB = null;
  };

  return {
    // Slow motion while a pair is inspected, so the terms can be read.
    step: (dt: number) => draw(advance(pairA !== null ? dt * 0.4 : dt)),
    draggable: true,
    hit: (x, y) => {
      let best: number | null = null;
      let bestD = Infinity;
      screen.forEach((q, i) => {
        const d = Math.hypot(x - q.x, y - q.y);
        // Generous: particles move fast, especially zoomed in mid-repulsion.
        if (d < Math.max(16, q.r * 3) && d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best === null ? null : { kind: 'particle', id: best };
    },
    click: (h) => {
      lastTouch = t;
      if (!h || h.kind !== 'particle') clear();
      else if (pairA === null) {
        pairA = h.id;
        pairB = nearest(h.id);
        follow = true;
      } else if (h.id === pairA) clear();
      else {
        pairB = h.id;
        follow = false; // an explicit partner stays put
      }
    },
    zoomBy: (k) => {
      lastTouch = t;
      userZoom = Math.min(6, Math.max(1, userZoom * k));
    },
    resetView: () => {
      lastTouch = t;
      userZoom = 1;
      clear();
    },
    busy: () => pairA !== null || t - lastTouch < 15,
    pair: () => {
      if (pairA === null || pairB === null) return null;
      const a = parts[pairA];
      const b = parts[pairB];
      const d = dist(pairA, pairB);
      const same = a.kind === b.kind;
      const qa = screen[pairA];
      const qb = screen[pairB];
      return {
        ax: qa.x,
        ay: qa.y,
        bx: qb.x,
        by: qb.y,
        x: d / r0,
        reach: REACH,
        lambda: curAtt,
        beta: same ? BETA_SAME : 1,
        same,
        force: pairForce(d, same, curAtt),
        follow,
        rhoA: Math.hypot(a.x, a.y, a.z) / f.R,
        rhoB: Math.hypot(b.x, b.y, b.z) / f.R,
        globalA: globalForce(Math.hypot(a.x, a.y, a.z), curAtt),
        globalB: globalForce(Math.hypot(b.x, b.y, b.z), curAtt),
        wall: WALL / f.R,
      };
    },
    zoomLevel: () => zoom,
    setFollow: (on) => {
      lastTouch = t;
      follow = on;
      if (on && pairA !== null) pairB = nearest(pairA);
    },
  };
};

// 03 — One self or many faces? (interactive, a quantum metaphor)
// Drawn like an orthographic plate: the person at the centre, four contexts
// (work, family, online, alone) as views around it, tied by construction
// lines. The person starts in a superposition of faces — overlapping hatched
// discs, one hatch angle per face, whose interference makes a moiré. Drag
// them into a context and the context "measures" them: they collapse to one
// definite face, drawn at random from that context's own probabilities, and
// person and context are bound by a braided ring. Every context visited
// leaves a thread. The tally of measurements is the data: if the face does
// not depend on the context, the state is separable (one self); if it does,
// it is entangled (many faces). A control world, where every context has the
// same probabilities, shows what "one self" would look like. The HTML side
// lives in FacesOverlay.tsx.
const faces: SceneFactory = (ctx, f, p) => {
  const FACES = ['focused', 'warm', 'witty', 'quiet'];
  const CONTEXTS = ['work', 'family', 'online', 'alone'];
  const ANGLE = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]; // hatch per face
  const DASH = [[], [6, 3], [1, 3], [6, 2, 1, 2]]; // line style per face
  // P(face | context): each context brings out a different face.
  const MANY = [
    [0.6, 0.1, 0.2, 0.1],
    [0.1, 0.6, 0.2, 0.1],
    [0.1, 0.1, 0.65, 0.15],
    [0.15, 0.05, 0.05, 0.75],
  ];
  // The control world: every context measures with the same probabilities
  // (the average of the above), so the face cannot depend on the context.
  const avg = FACES.map((_, j) => MANY.reduce((a, r) => a + r[j], 0) / 4);
  const ONE = CONTEXTS.map(() => avg);
  let oneSelf = false;
  const prob = () => (oneSelf ? ONE : MANY);

  const ro = f.R * 0.15; // the person
  const rc = f.R * 0.2; // a context
  const ox = Math.min(f.R * 0.85, f.fx - rc - 20);
  // Leave room below for the caption, and above for the state card — unless
  // there is space to slide the plate right of the card (x ≈ 520), in which
  // case it can use the full height.
  const half = ox + rc + 16; // half-width of the plate
  const cx0 = Math.max(f.fx, 520 + half);
  const beside = cx0 + half <= f.fx * 2 - 10;
  const top = beside ? 140 : 330;
  const bottom = f.h - 215; // clears the caption
  const home = { x: beside ? cx0 : f.fx, y: (top + bottom) / 2 };
  const oy = Math.min(f.R * 0.75, (bottom - top) / 2 - rc - 20);
  const ctxPos = [
    { x: home.x, y: home.y - oy }, // work, above
    { x: home.x + ox, y: home.y }, // family, right
    { x: home.x, y: home.y + oy }, // online, below
    { x: home.x - ox, y: home.y }, // alone, left
  ];

  const pos = { ...home };
  let goal: { x: number; y: number } | null = null; // where it is easing to
  let dragging = false;
  let where: number | null = null; // context the person is in
  let face: number | null = null; // the measured face
  let collapse = 0; // 0 = superposed, 1 = collapsed (eased)
  let flash = 0;
  let t = 0;
  let lastTouch = -1e9;
  let autoLeft = 0; // remaining automatic measurements
  let autoWait = 0;
  let autoTo: number | null = null;
  const counts = CONTEXTS.map(() => [0, 0, 0, 0]);
  const lastFace: (number | null)[] = CONTEXTS.map(() => null);
  const spin = FACES.map((_, k) => (k * TAU) / FACES.length);

  // Amplitudes drift toward what has been observed: the self is built up
  // from its contexts.
  const amps = () => {
    const tot = counts.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0);
    return FACES.map((_, j) => {
      const n = counts.reduce((a, r) => a + r[j], 0);
      return Math.sqrt((1 + n) / (FACES.length + tot));
    });
  };

  const measure = (k: number) => {
    where = k;
    let u = Math.random();
    let j = 0;
    while (j < FACES.length - 1 && u > prob()[k][j]) {
      u -= prob()[k][j];
      j++;
    }
    face = j;
    counts[k][j]++;
    lastFace[k] = j;
    flash = 1;
    goal = ctxPos[k];
  };
  const leave = () => {
    where = null;
    face = null;
  };
  const inside = (x: number, y: number) => {
    for (let k = 0; k < CONTEXTS.length; k++) {
      if (Math.hypot(x - ctxPos[k].x, y - ctxPos[k].y) < rc) return k;
    }
    return null;
  };
  const clearData = () => {
    counts.forEach((r) => r.fill(0));
    lastFace.fill(null);
  };

  // Pearson's χ² test of independence between context and face.
  const chi2 = () => {
    const rows = counts.filter((r) => r.some((n) => n > 0));
    const N = rows.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0);
    const cols = FACES.map((_, j) => rows.reduce((a, r) => a + r[j], 0));
    const usedCols = cols.filter((c) => c > 0).length;
    let x2 = 0;
    for (const r of rows) {
      const rs = r.reduce((x, y) => x + y, 0);
      cols.forEach((c, j) => {
        if (!c) return;
        const e = (rs * c) / N;
        x2 += ((r[j] - e) * (r[j] - e)) / e;
      });
    }
    const df = (rows.length - 1) * (usedCols - 1);
    return { N, x2, df, p: df > 0 ? chiSquareP(x2, df) : null };
  };

  const step = (dt: number) => {
    t += dt;

    // Automatic measurements: fly to a random context, collapse, move on.
    if (autoLeft > 0 && !dragging) {
      autoWait -= dt;
      if (autoTo === null && autoWait <= 0) {
        leave();
        autoTo = Math.floor(Math.random() * CONTEXTS.length);
        goal = ctxPos[autoTo];
      } else if (
        autoTo !== null &&
        Math.hypot(pos.x - ctxPos[autoTo].x, pos.y - ctxPos[autoTo].y) < 6
      ) {
        measure(autoTo);
        autoTo = null;
        autoLeft--;
        autoWait = 0.25;
        if (autoLeft === 0) goal = ctxPos[where];
      }
    }

    if (!dragging) {
      const g = goal ?? (where === null ? home : ctxPos[where]);
      const k = Math.min(1, dt * (autoLeft > 0 ? 12 : 5));
      pos.x += (g.x - pos.x) * k;
      pos.y += (g.y - pos.y) * k;
    }
    collapse += ((face === null ? 0 : 1) - collapse) * Math.min(1, dt * 5);
    flash = Math.max(0, flash - dt * 1.8);
    for (let k = 0; k < spin.length; k++) spin[k] += dt * 0.6;

    // ---- draw ----
    paper(ctx, f, p);
    const s = 1 - collapse; // how superposed
    const A = amps();
    const ink = p.fg;
    const P = prob();

    // The plate: a frame around the four views, construction lines from the
    // centre to each, and registration marks.
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(ink, 0.28);
    const fx0 = home.x - ox - rc - 16;
    const fy0 = home.y - oy - rc - 16;
    ctx.strokeRect(fx0, fy0, (ox + rc + 16) * 2, (oy + rc + 16) * 2);
    ctx.setLineDash([2, 4]);
    ctxPos.forEach((c) => {
      ctx.beginPath();
      ctx.moveTo(home.x, home.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(fx0, home.y - oy);
    ctx.lineTo(home.x - rc, home.y - oy);
    ctx.moveTo(home.x + ox, fy0);
    ctx.lineTo(home.x + ox, home.y - rc);
    ctx.stroke();
    ctx.setLineDash([]);
    regMarks(ctx, p, home.x, home.y, ox + rc + 30, oy + rc + 30);

    // Contexts: each measures in its own basis — an inner dial with one arc
    // per face (in that face's line style), sized by its probability there.
    ctx.font = '13px Hack, monospace';
    ctx.textAlign = 'center';
    CONTEXTS.forEach((name, k) => {
      const c = ctxPos[k];
      const here = where === k && face !== null;
      ctx.fillStyle = rgba(p.bg, 0.85);
      ctx.beginPath();
      ctx.arc(c.x, c.y, rc, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(ink, here ? 0.25 : 0.6);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * TAU;
        const r1 = rc * (i % 3 === 0 ? 0.86 : 0.91);
        ctx.moveTo(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1);
        ctx.lineTo(
          c.x + Math.cos(a) * rc * 0.97,
          c.y + Math.sin(a) * rc * 0.97,
        );
      }
      ctx.strokeStyle = rgba(ink, 0.35);
      ctx.stroke();
      let a0 = -Math.PI / 2;
      P[k].forEach((pj, j) => {
        const a1 = a0 + pj * TAU;
        ctx.strokeStyle = rgba(ink, here ? 0.3 : 0.75);
        ctx.lineWidth = 2;
        ctx.setLineDash(DASH[j]);
        ctx.beginPath();
        ctx.arc(c.x, c.y, rc * 0.72, a0 + 0.05, a1 - 0.05);
        ctx.stroke();
        a0 = a1;
      });
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(ink, 0.75);
      // The top view is labelled above, the others below, so no label sits
      // between a context and the person.
      ctx.fillText(
        name.toUpperCase().split('').join(' '),
        c.x,
        k === 0 ? c.y - rc - 8 : c.y + rc + 18,
      );
      // Entanglement: a braid of two strands, the face (ink) and the
      // context (red).
      if (here) {
        hatchDisk(
          ctx,
          c.x,
          c.y,
          rc * 0.62,
          ANGLE[face],
          4,
          ink,
          0.18 * collapse,
        );
        for (const [ph, col, w] of [
          [0, ink, 1.2],
          [Math.PI, p.accent, 1.2],
        ] as [number, RGB, number][]) {
          ctx.strokeStyle = rgba(col, 0.9 * collapse);
          ctx.lineWidth = w;
          ctx.beginPath();
          for (let i = 0; i <= 120; i++) {
            const a = (i / 120) * TAU;
            const rr = rc + 4 * Math.sin(7 * a + t * 3 + ph);
            const x = c.x + Math.cos(a) * rr;
            const y = c.y + Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    });
    ctx.textAlign = 'left';

    // Threads to every context visited before: still part of who you are,
    // each in the line style of the face it last brought out.
    CONTEXTS.forEach((_, k) => {
      if (lastFace[k] === null || k === where) return;
      const c = ctxPos[k];
      const dx = pos.x - c.x;
      const dy = pos.y - c.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      ctx.strokeStyle = rgba(ink, 0.5);
      ctx.lineWidth = 1;
      ctx.setLineDash(DASH[lastFace[k]].length ? DASH[lastFace[k]] : [8, 0]);
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const w = 4 * Math.sin(u * 14 - t * 4) * Math.sin(u * Math.PI);
        const x = c.x + dx * u + nx * w;
        const y = c.y + dy * u + ny * w;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      const u = (t * 0.5 + k * 0.25) % 1;
      mark(ctx, c.x + dx * u, c.y + dy * u, 2, ink, 0.8, 0);
    });

    // The person. Superposed: one hatched disc per face, weighted by
    // amplitude, orbiting so their hatches interfere. Collapsed: one disc,
    // densely hatched in the measured face, with a red mark.
    ctx.fillStyle = rgba(p.bg, 0.6 * s);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ro * 1.35, 0, TAU);
    ctx.fill();
    FACES.forEach((_, j) => {
      const w = s * A[j] * A[j] * FACES.length;
      if (w < 0.02) return;
      const cx = pos.x + Math.cos(spin[j]) * ro * 0.5 * s;
      const cy = pos.y + Math.sin(spin[j]) * ro * 0.5 * s;
      const rad = ro * (0.55 + 0.3 * Math.min(1.6, w));
      hatchDisk(ctx, cx, cy, rad, ANGLE[j], 3, ink, 0.6 * Math.min(1, w));
      ctx.strokeStyle = rgba(ink, 0.55 * Math.min(1, w));
      ctx.lineWidth = 0.8;
      ctx.setLineDash(DASH[j]);
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    if (s > 0.05) {
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = rgba(ink, 0.16 * s);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(
          pos.x,
          pos.y,
          ro * (1.2 + k * 0.18) * (1 + 0.03 * Math.sin(t * 2 + k)),
          0,
          TAU,
        );
        ctx.stroke();
      }
      for (let i = 0; i < 30; i++) {
        mark(
          ctx,
          pos.x + gauss() * ro * 0.55,
          pos.y + gauss() * ro * 0.55,
          rand(0.5, 1.1),
          ink,
          0.6 * s,
          0,
        );
      }
    }
    if (face !== null) {
      const rad = ro * 0.55 * collapse;
      ctx.fillStyle = rgba(p.bg, 0.9);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rad, 0, TAU);
      ctx.fill();
      hatchDisk(ctx, pos.x, pos.y, rad, ANGLE[face], 2, ink, 0.9);
      ctx.strokeStyle = rgba(ink, 0.9);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rad, 0, TAU);
      ctx.stroke();
      mark(ctx, pos.x, pos.y, 2.5, p.accent, collapse, 0);
    }
    if (flash > 0) {
      ctx.strokeStyle = rgba(p.accent, flash);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ro * (0.5 + (1 - flash) * 2.5), 0, TAU);
      ctx.stroke();
    }
    if (s > 0.5 && !dragging && where === null) {
      label(
        ctx,
        p,
        pos.x - ro * 0.75,
        pos.y - ro * 0.75,
        -24,
        -26,
        'you · drag me',
        0.7 * s,
      );
    }
  };

  const near = (x: number, y: number) =>
    Math.hypot(x - pos.x, y - pos.y) < ro * 1.3;

  return {
    step,
    hit: (x, y) => (near(x, y) ? { kind: 'person' } : null),
    click: () => undefined,
    grab: (x, y) => {
      if (!near(x, y) || autoLeft > 0) return false;
      lastTouch = t;
      dragging = true;
      goal = null;
      leave(); // lifted out of its context, it spreads out again
      return true;
    },
    dragTo: (x, y) => {
      pos.x = x;
      pos.y = y;
    },
    release: (x, y) => {
      lastTouch = t;
      dragging = false;
      const k = inside(x, y);
      if (k === null) goal = home;
      else measure(k);
    },
    measureMany: (n) => {
      lastTouch = t;
      autoLeft = n;
      autoWait = 0;
      autoTo = null;
    },
    reset: () => {
      lastTouch = t;
      autoLeft = 0;
      autoTo = null;
      leave();
      goal = home;
      clearData();
    },
    setWorld: (one) => {
      lastTouch = t;
      if (one === oneSelf) return;
      oneSelf = one;
      autoLeft = 0;
      autoTo = null;
      leave();
      goal = home;
      clearData(); // data from the other world would mix two experiments
    },
    busy: () => dragging || autoLeft > 0 || t - lastTouch < 15,
    faces: () => ({
      faces: FACES.map((name, j) => ({
        name,
        col: p.fg,
        amp: amps()[j],
        angle: ANGLE[j],
      })),
      contexts: CONTEXTS,
      where,
      face,
      counts: counts.map((r) => [...r]),
      auto: autoLeft > 0,
      world: oneSelf ? 'one' : 'many',
      test: chi2(),
    }),
  };
};

export const SCENES: Record<string, SceneFactory> = {
  cocreation,
  contradiction,
  faces,
};
