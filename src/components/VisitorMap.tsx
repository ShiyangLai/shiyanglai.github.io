import React from 'react';
import {
  buildLandGrid,
  project,
  GRID_W,
  GRID_H,
  SAMPLE_POINTS,
  VisitPoint,
} from '../utils/worldMap';
import { ActivityChart } from './ActivityChart';

export { MAP_TOKEN } from '../utils/mapToken';

type RGB = [number, number, number];
type Palette = {
  ocean: string;
  border: string;
  landBase: RGB; // tile color with no visits
  landHot: RGB; // tile color at peak density (whiter in dark, darker in light)
  dot: string;
  dotGlow: string;
  ring: string;
  text: string;
  muted: string;
  accent: string;
};

const paletteFor = (dark: boolean): Palette =>
  dark
    ? {
        ocean: '#0b1c2c',
        border: '#8bbf56',
        landBase: [43, 61, 79],
        landHot: [234, 241, 248],
        dot: '#bf568b',
        dotGlow: 'rgba(191,86,139,0.30)',
        ring: '#8bbf56',
        text: '#cbd6e2',
        muted: '#627e99',
        accent: '#568bbf',
      }
    : {
        ocean: '#eef3f7',
        border: '#9bbf6b',
        landBase: [176, 190, 203],
        landHot: [18, 30, 41],
        dot: '#c2477f',
        dotGlow: 'rgba(194,71,127,0.22)',
        ring: '#5a9e2f',
        text: '#1c2b3a',
        muted: '#6b7b8a',
        accent: '#2f6da8',
      };

const mix = (a: RGB, b: RGB, t: number): string =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(
    a[1] + (b[1] - a[1]) * t,
  )},${Math.round(a[2] + (b[2] - a[2]) * t)})`;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// Per-tile visit density (0..1), as a smooth falloff around each visit point.
const SIGMA = 9; // degrees
const computeHeat = (land: boolean[], points: VisitPoint[]): Float32Array => {
  const h = new Float32Array(GRID_W * GRID_H);
  if (points.length === 0) return h;
  for (let gy = 0; gy < GRID_H; gy++) {
    const lat = 90 - ((gy + 0.5) / GRID_H) * 180;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    for (let gx = 0; gx < GRID_W; gx++) {
      const idx = gy * GRID_W + gx;
      if (!land[idx]) continue;
      const lng = ((gx + 0.5) / GRID_W) * 360 - 180;
      let s = 0;
      for (let k = 0; k < points.length; k++) {
        const p = points[k];
        let dLng = ((p.lng - lng + 540) % 360) - 180;
        dLng *= cosLat;
        const dLat = p.lat - lat;
        const d2 = dLng * dLng + dLat * dLat;
        s += p.count / (1 + d2 / (SIGMA * SIGMA));
      }
      h[idx] = s;
    }
  }
  let mx = 0;
  for (let i = 0; i < h.length; i++) if (h[i] > mx) mx = h[i];
  if (mx > 0) for (let i = 0; i < h.length; i++) h[i] = Math.pow(h[i] / mx, 0.6);
  return h;
};

const useDark = (): boolean => {
  const get = () =>
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [dark, setDark] = React.useState<boolean>(get);
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return dark;
};

// Synthetic 90-day series for demo mode (no backend yet).
const demoDaily = (): Record<string, number> => {
  const out: Record<string, number> = {};
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const base = 5 + 3 * Math.sin(i / 6) + 2 * Math.sin(i / 23);
    out[key] = Math.max(0, Math.round(base + (Math.random() * 4 - 1.5)));
  }
  return out;
};

type Status = 'loading' | 'live' | 'demo' | 'empty';
type Hover = { p: VisitPoint; sx: number; sy: number };

export const VisitorMap: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const land = React.useRef<boolean[]>([]);
  const view = React.useRef({ scale: 1, ox: 0, oy: 0 });
  const drag = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  const dark = useDark();
  const P = paletteFor(dark);

  const [points, setPoints] = React.useState<VisitPoint[]>([]);
  const [total, setTotal] = React.useState(0);
  const [status, setStatus] = React.useState<Status>('loading');
  const [hover, setHover] = React.useState<Hover | null>(null);
  const [daily, setDaily] = React.useState<Record<string, number>>({});

  if (land.current.length === 0) land.current = buildLandGrid();
  const heat = React.useMemo(() => computeHeat(land.current, points), [points]);

  const load = React.useCallback(() => {
    fetch('/api/visit')
      .then((r) => r.json())
      .then((d) => {
        if (d.configured && Array.isArray(d.points) && d.points.length > 0) {
          setPoints(d.points);
          setTotal(d.total ?? 0);
          setDaily(d.daily || {});
          setStatus('live');
        } else if (d.configured) {
          setPoints([]);
          setTotal(0);
          setDaily(d.daily || {});
          setStatus('empty');
        } else {
          setPoints(SAMPLE_POINTS);
          setTotal(SAMPLE_POINTS.reduce((s, p) => s + p.count, 0));
          setDaily(demoDaily());
          setStatus('demo');
        }
      })
      .catch(() => {
        setPoints(SAMPLE_POINTS);
        setTotal(SAMPLE_POINTS.reduce((s, p) => s + p.count, 0));
        setDaily(demoDaily());
        setStatus('demo');
      });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const clampView = React.useCallback((cssW: number, cssH: number) => {
    const v = view.current;
    v.scale = clamp(v.scale, 1, 12);
    v.ox = clamp(v.ox, cssW - cssW * v.scale, 0);
    v.oy = clamp(v.oy, cssH - cssH * v.scale, 0);
  }, []);

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW === 0 || cssH === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(cssW * dpr)) canvas.width = Math.round(cssW * dpr);
    if (canvas.height !== Math.round(cssH * dpr)) canvas.height = Math.round(cssH * dpr);

    clampView(cssW, cssH);
    const { scale, ox, oy } = view.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = P.ocean;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    // heat-tinted land tiles
    const cw = cssW / GRID_W;
    const ch = cssH / GRID_H;
    const tw = cw * 0.7;
    const th = ch * 0.7;
    const tox = (cw - tw) / 2;
    const toy = (ch - th) / 2;
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const idx = gy * GRID_W + gx;
        if (!land.current[idx]) continue;
        ctx.fillStyle = mix(P.landBase, P.landHot, heat[idx]);
        ctx.fillRect(gx * cw + tox, gy * ch + toy, tw, th);
      }
    }

    // No persistent dots — the heat shows density. Mark only the hovered spot.
    if (hover) {
      const { x, y } = project(hover.p.lng, hover.p.lat, cssW, cssH);
      const r = 3.5 / scale;
      ctx.fillStyle = P.dot;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = P.ring;
      ctx.lineWidth = 1.5 / scale;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }, [points, hover, heat, clampView, P]);

  React.useEffect(() => {
    draw();
  }, [draw]);

  React.useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const v = view.current;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const ns = clamp(v.scale * factor, 1, 12);
      v.ox = mx - ((mx - v.ox) / v.scale) * ns;
      v.oy = my - ((my - v.oy) / v.scale) * ns;
      v.scale = ns;
      draw();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [draw]);

  const hitTest = (mx: number, my: number): Hover | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const { scale, ox, oy } = view.current;
    let best: Hover | null = null;
    let bestD = 11;
    points.forEach((p) => {
      const { x, y } = project(p.lng, p.lat, cssW, cssH);
      const sx = x * scale + ox;
      const sy = y * scale + oy;
      const d = Math.hypot(sx - mx, sy - my);
      if (d < bestD) {
        bestD = d;
        best = { p, sx, sy };
      }
    });
    return best;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    drag.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      ox: view.current.ox,
      oy: view.current.oy,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (drag.current) {
      view.current.ox = drag.current.ox + (mx - drag.current.x);
      view.current.oy = drag.current.oy + (my - drag.current.y);
      draw();
      if (hover) setHover(null);
    } else {
      setHover(hitTest(mx, my));
    }
  };

  const endDrag = () => {
    drag.current = null;
  };

  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const v = view.current;
    const ns = clamp(v.scale * factor, 1, 12);
    v.ox = cssW / 2 - ((cssW / 2 - v.ox) / v.scale) * ns;
    v.oy = cssH / 2 - ((cssH / 2 - v.oy) / v.scale) * ns;
    v.scale = ns;
    draw();
  };

  const reset = () => {
    view.current = { scale: 1, ox: 0, oy: 0 };
    setHover(null);
    draw();
  };

  const statusLabel =
    status === 'loading'
      ? 'scanning…'
      : status === 'demo'
      ? 'demo data (set up Vercel KV to track real visits)'
      : status === 'empty'
      ? 'no visits in the last 12 months'
      : `${total} visit${total === 1 ? '' : 's'} from ${points.length} place${
          points.length === 1 ? '' : 's'
        }`;

  const btn: React.CSSProperties = {
    background: 'transparent',
    color: P.accent,
    border: `1px solid ${P.muted}`,
    borderRadius: 4,
    padding: '1px 8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.85em',
  };

  return (
    <div style={{ margin: '4px 0 12px', maxWidth: 860, color: P.text }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 6,
          color: P.muted,
          fontSize: '0.9em',
        }}
      >
        <span style={{ color: P.text }}>visitor map</span>
        <span style={{ color: P.accent }}>· last 12 months</span>
        <span>— {statusLabel}</span>
        <span style={{ flexGrow: 1 }} />
        <button style={btn} onClick={() => zoomBy(1.4)} aria-label="zoom in">
          +
        </button>
        <button style={btn} onClick={() => zoomBy(1 / 1.4)} aria-label="zoom out">
          −
        </button>
        <button style={btn} onClick={reset}>
          reset
        </button>
        <button style={btn} onClick={load}>
          refresh
        </button>
      </div>

      <div ref={wrapRef} style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            aspectRatio: '2 / 1',
            display: 'block',
            background: P.ocean,
            border: `1px solid ${P.border}`,
            borderRadius: 4,
            cursor: drag.current ? 'grabbing' : 'grab',
            imageRendering: 'pixelated',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={() => {
            endDrag();
            setHover(null);
          }}
        />

        {hover && (
          <div
            style={{
              position: 'absolute',
              left: clamp(hover.sx + 10, 0, 720),
              top: clamp(hover.sy + 10, 0, 9999),
              background: dark ? 'rgba(11,28,44,0.94)' : 'rgba(255,255,255,0.94)',
              border: `1px solid ${P.accent}`,
              borderRadius: 4,
              padding: '2px 7px',
              color: P.text,
              fontSize: '0.85em',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: P.accent }}>
              {hover.p.city}, {hover.p.country}
            </span>{' '}
            · {hover.p.count} visit{hover.p.count === 1 ? '' : 's'}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: P.muted,
          fontSize: '0.8em',
          marginTop: 4,
        }}
      >
        <span>fewer</span>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span
            key={f}
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              background: mix(P.landBase, P.landHot, f),
              borderRadius: 2,
            }}
          />
        ))}
        <span>more visits · last 12 months</span>
        <span style={{ flexGrow: 1 }} />
        <span>hover a hotspot for details · coarse location only, no IPs</span>
      </div>

      <ActivityChart daily={daily} dark={dark} />
    </div>
  );
};

export default VisitorMap;
