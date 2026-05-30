import React from 'react';
import {
  buildLandGrid,
  project,
  GRID_W,
  GRID_H,
  SAMPLE_POINTS,
  VisitPoint,
} from '../utils/worldMap';

export { MAP_TOKEN } from '../utils/mapToken';

const OCEAN = '#0b1c2c';
const LAND = '#33485f';
const DOT = '#bf568b';
const DOT_GLOW = 'rgba(191, 86, 139, 0.30)';
const RING = '#8bbf56';
const TEXT = '#cbd6e2';
const MUTED = '#627e99';
const ACCENT = '#568bbf';

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

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

  const [points, setPoints] = React.useState<VisitPoint[]>([]);
  const [total, setTotal] = React.useState(0);
  const [status, setStatus] = React.useState<Status>('loading');
  const [hover, setHover] = React.useState<Hover | null>(null);

  if (land.current.length === 0) land.current = buildLandGrid();

  const load = React.useCallback(() => {
    fetch('/api/visit')
      .then((r) => r.json())
      .then((d) => {
        if (d.configured && Array.isArray(d.points) && d.points.length > 0) {
          setPoints(d.points);
          setTotal(d.total ?? 0);
          setStatus('live');
        } else if (d.configured) {
          setPoints([]);
          setTotal(0);
          setStatus('empty');
        } else {
          setPoints(SAMPLE_POINTS);
          setTotal(SAMPLE_POINTS.reduce((s, p) => s + p.count, 0));
          setStatus('demo');
        }
      })
      .catch(() => {
        setPoints(SAMPLE_POINTS);
        setTotal(SAMPLE_POINTS.reduce((s, p) => s + p.count, 0));
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
    ctx.fillStyle = OCEAN;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    // land as spaced square tiles (dot-matrix look). Base map fills the
    // canvas at scale 1.
    const cw = cssW / GRID_W;
    const ch = cssH / GRID_H;
    const tw = cw * 0.7; // ~30% gap between tiles
    const th = ch * 0.7;
    const tox = (cw - tw) / 2;
    const toy = (ch - th) / 2;
    ctx.fillStyle = LAND;
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        if (land.current[gy * GRID_W + gx]) {
          ctx.fillRect(gx * cw + tox, gy * ch + toy, tw, th);
        }
      }
    }

    // visitor dots
    points.forEach((p) => {
      const { x, y } = project(p.lng, p.lat, cssW, cssH);
      const r = clamp(2 + Math.log2(p.count + 1), 2.5, 8) / scale;
      ctx.fillStyle = DOT_GLOW;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = DOT;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (hover && hover.p === p) {
        ctx.strokeStyle = RING;
        ctx.lineWidth = 1.5 / scale;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [points, hover, clampView]);

  React.useEffect(() => {
    draw();
  }, [draw]);

  React.useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // wheel zoom (native listener so we can preventDefault)
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
      const hit = hitTest(mx, my);
      // avoid needless re-renders
      if ((hit?.p ?? null) !== (hover?.p ?? null)) setHover(hit);
      else if (hit) setHover(hit);
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
    // zoom about center
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
      ? 'no visits recorded yet'
      : `${total} visit${total === 1 ? '' : 's'} from ${points.length} place${
          points.length === 1 ? '' : 's'
        }`;

  const btn: React.CSSProperties = {
    background: 'transparent',
    color: ACCENT,
    border: `1px solid ${MUTED}`,
    borderRadius: 4,
    padding: '1px 8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.85em',
  };

  return (
    <div style={{ margin: '4px 0 12px', maxWidth: 860 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 6,
          color: MUTED,
          fontSize: '0.9em',
        }}
      >
        <span style={{ color: TEXT }}>visitor map</span>
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
            background: OCEAN,
            border: '1px solid #8bbf56',
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
              background: '#0b1c2cf0',
              border: `1px solid ${ACCENT}`,
              borderRadius: 4,
              padding: '2px 7px',
              color: TEXT,
              fontSize: '0.85em',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: ACCENT }}>
              {hover.p.city}, {hover.p.country}
            </span>{' '}
            · {hover.p.count} visit{hover.p.count === 1 ? '' : 's'}
          </div>
        )}
      </div>

      <div style={{ color: MUTED, fontSize: '0.8em', marginTop: 4 }}>
        scroll/▢ to zoom · drag to pan · hover a dot for details · coarse
        location only, no IPs stored
      </div>
    </div>
  );
};

export default VisitorMap;
