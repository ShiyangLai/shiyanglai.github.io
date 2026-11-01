import React from 'react';
import { useIsDark } from '../../utils/theme';
import { PALETTES, PairState, RGB, Scene, rgba } from './scenes';

// The HTML layer of the self-contradiction piece: zoom controls, and the
// pair energy for the two particles being inspected, floating between them.
// The term currently acting (repulsive core or attraction) is highlighted,
// and a small plot shows where the pair sits on the energy curve.
//
//   U(x) = κ·(1/(3x³) + x − 4/3)           for x < 1        (hard core)
//   U(x) = λ(t)·β·(1 − cos(π(x − 1)/1.2))  for 1 ≤ x < 2.2  (attraction)
//
// with x = d/r0, flat beyond 2.2. It is continuous, its minimum is at x = 1,
// and its slope is the force the simulation applies (scenes.ts, pairForce).
// λ(t) is the attract/repel cycle; β is 1 for opposite kinds, 0.6 for like.
//
// Separately, each particle feels the global cycle on its own (globalForce):
//
//   V(ρ) = c·λ(t)·ρ² − p·(1 − λ(t))·(ρ − ρ²/4)      ρ = distance from centre / R
//
// confinement while attracting, outward pressure while repelling (plus a
// soft wall). The card shows both, and how much of the push on the pair
// comes from each other versus from the cycle.

const COL_W = 300; // one column of the card; two side by side when there's room

// The curve's shape, for the plot (κ = 1; the terms are not to scale).
const energy = (x: number, lambdaBeta: number, reach: number) =>
  x < 1
    ? 1 / (3 * x * x * x) + x - 4 / 3
    : lambdaBeta * (1 - Math.cos((Math.PI * (Math.min(x, reach) - 1)) / 1.2));

const Plot: React.FC<{
  s: PairState;
  rep: string;
  att: string;
  ink: string;
}> = ({ s, rep, att, ink }) => {
  const W = 284;
  const H = 64;
  const [x0, x1] = [0.6, 2.5];
  const [y0, y1] = [-0.15, 2.2];
  const px = (x: number) => ((x - x0) / (x1 - x0)) * W;
  const py = (y: number) =>
    H - ((Math.max(y0, Math.min(y1, y)) - y0) / (y1 - y0)) * H;
  const lb = s.lambda * s.beta;
  const path = (from: number, to: number) => {
    let d = '';
    for (let k = 0; k <= 40; k++) {
      const x = from + ((to - from) * k) / 40;
      d += `${k ? 'L' : 'M'}${px(x).toFixed(1)},${py(
        energy(x, lb, s.reach),
      ).toFixed(1)}`;
    }
    return d;
  };
  const cx = Math.max(x0, Math.min(x1, s.x));
  return (
    <svg width={W} height={H + 14} className="mt-2 block">
      <line
        x1={0}
        x2={W}
        y1={py(0)}
        y2={py(0)}
        stroke={ink}
        strokeOpacity={0.3}
      />
      {[1, s.reach].map((x) => (
        <line
          key={x}
          x1={px(x)}
          x2={px(x)}
          y1={0}
          y2={H}
          stroke={ink}
          strokeOpacity={0.3}
          strokeDasharray="2 3"
        />
      ))}
      <path d={path(x0, 1)} fill="none" stroke={rep} strokeWidth={1.5} />
      <path d={path(1, s.reach)} fill="none" stroke={att} strokeWidth={1.5} />
      <path
        d={path(s.reach, x1)}
        fill="none"
        stroke={ink}
        strokeOpacity={0.4}
      />
      <circle cx={px(cx)} cy={py(energy(cx, lb, s.reach))} r={4} fill={ink} />
      <text x={px(1)} y={H + 12} fontSize={10} fill={ink} textAnchor="middle">
        r₀
      </text>
      <text
        x={px(s.reach)}
        y={H + 12}
        fontSize={10}
        fill={ink}
        textAnchor="middle"
      >
        {s.reach}r₀
      </text>
    </svg>
  );
};

export const ContradictionOverlay: React.FC<{
  getScene: () => Scene | undefined;
  width: number;
  height: number;
}> = ({ getScene, width, height }) => {
  const dark = useIsDark();
  const P = PALETTES[dark ? 'night' : 'day'];
  const [s, setS] = React.useState<PairState | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const card = React.useRef<HTMLDivElement>(null);

  // Follow the pair every other frame (it moves, and the camera with it).
  React.useEffect(() => {
    let raf = 0;
    let n = 0;
    const loop = () => {
      if (n++ % 2 === 0) {
        const sc = getScene();
        setS(sc?.pair?.() ?? null);
        setZoom(sc?.zoomLevel?.() ?? 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getScene]);

  const scene = getScene();
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const btn =
    'pointer-events-auto w-6 h-6 border border-light-foreground/40 dark:border-dark-foreground/40 hover:border-light-foreground dark:hover:border-dark-foreground';

  const rep = rgba(P.accent);
  const att = rgba(P.green);
  const ink = rgba(P.fg);
  const tint = (on: boolean, col: RGB) => ({
    opacity: on ? 1 : 0.35,
    background: on ? rgba(col, 0.14) : 'transparent',
    borderLeft: `2px solid ${on ? rgba(col) : 'transparent'}`,
  });
  const regime = !s
    ? null
    : s.x < 1
    ? 'repel'
    : s.x < s.reach
    ? 'attract'
    : 'none';

  // Pair energy and global cycle side by side if they fit, else stacked.
  const twoCol = width >= 2 * COL_W + 60;
  const cardW = twoCol ? 2 * COL_W + 24 : COL_W;

  // Which global term is acting, and how the push on the pair splits
  // between the pair force and the cycle.
  const squeezing = !!s && s.lambda >= 0.5;
  const globalMag = s ? (Math.abs(s.globalA) + Math.abs(s.globalB)) / 2 : 0;
  const pairMag = s ? Math.abs(s.force) : 0;
  const pairShare =
    pairMag + globalMag > 0
      ? Math.round((100 * pairMag) / (pairMag + globalMag))
      : 0;

  // Float the card just above the pair (below it if there is no room),
  // kept inside the open area and clear of the pair itself.
  let left = 0;
  let top = 0;
  if (s) {
    const cardH = card.current?.offsetHeight ?? 300;
    const mx = (s.ax + s.bx) / 2;
    const above = Math.min(s.ay, s.by) - cardH - 40;
    const below = Math.max(s.ay, s.by) + 40;
    left = Math.max(12, Math.min(width - cardW - 12, mx - cardW / 2));
    top = above > 12 ? above : Math.min(height - cardH - 12, below);
  }

  return (
    <div
      data-ui
      className="absolute inset-0 pointer-events-none text-light-foreground dark:text-dark-foreground"
      onPointerDown={stop}
      onClick={stop}
    >
      {/* Zoom controls + hint, above the caption. */}
      <div
        className="absolute left-8 flex items-center gap-2 text-sm"
        style={{ bottom: 215 }}
      >
        <button
          type="button"
          className={btn}
          aria-label="Zoom out"
          onClick={(e) => {
            stop(e);
            scene?.zoomBy?.(1 / 1.4);
          }}
        >
          −
        </button>
        <span className="w-10 text-center text-light-gray dark:text-dark-gray">
          {zoom.toFixed(1)}×
        </span>
        <button
          type="button"
          className={btn}
          aria-label="Zoom in"
          onClick={(e) => {
            stop(e);
            scene?.zoomBy?.(1.4);
          }}
        >
          +
        </button>
        <button
          type="button"
          className={btn}
          aria-label="Reset view"
          onClick={(e) => {
            stop(e);
            scene?.resetView?.();
          }}
        >
          ⟲
        </button>
        {s && (
          <button
            type="button"
            className={`${btn} w-auto px-2 ${s.follow ? 'font-bold' : ''}`}
            aria-pressed={s.follow}
            title="Keep pairing the first particle with whichever is nearest right now"
            onClick={(e) => {
              stop(e);
              scene?.setFollow?.(!s.follow);
            }}
          >
            follow nearest: {s.follow ? 'on' : 'off'}
          </button>
        )}
        {/* Beside the window there's only room for the hint before a pick. */}
        {(!s || width > 760) && (
          <span className="text-light-gray dark:text-dark-gray">
            {s
              ? 'click another particle · click empty space to clear'
              : 'scroll to zoom · drag to rotate · click a particle'}
          </span>
        )}
      </div>

      {s && (
        <div
          className="absolute border border-light-foreground/30 dark:border-dark-foreground/30 bg-[#F5F2EA]/90 dark:bg-[#101112]/90 px-3 py-2 text-sm leading-relaxed"
          ref={card}
          style={{ left, top, width: cardW }}
        >
          <div className={twoCol ? 'grid grid-cols-2 gap-6' : ''}>
            <div>
              <div className="text-light-gray dark:text-dark-gray mb-1">
                pair energy U(x), &nbsp;x = d / r₀ &nbsp;(plot not to scale)
              </div>
              <div
                className="px-2 py-1 rounded-sm"
                style={tint(regime === 'repel', P.accent)}
              >
                <span style={{ color: rep }}>κ·(1/3x³ + x − 4/3)</span>
                <span className="float-right text-light-gray dark:text-dark-gray">
                  x &lt; 1
                </span>
                <div className="text-light-gray dark:text-dark-gray">
                  repulsion · hard core
                </div>
              </div>
              <div
                className="px-2 py-1 mt-1 rounded-sm"
                style={tint(regime === 'attract', P.green)}
              >
                <span style={{ color: att }}>λ(t)·β·(1 − cos(π(x−1)/1.2))</span>
                <span className="float-right text-light-gray dark:text-dark-gray">
                  x &lt; {s.reach}
                </span>
                <div className="text-light-gray dark:text-dark-gray">
                  attraction
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3">
                <span>x = {s.x.toFixed(2)}</span>
                <span>λ(t) = {s.lambda.toFixed(2)}</span>
                <span>
                  β = {s.beta} ({s.same ? 'same kind' : 'opposite kinds'})
                </span>
              </div>
              <div
                className="mt-1 font-bold"
                style={{
                  color:
                    regime === 'repel' ? rep : regime === 'attract' ? att : ink,
                }}
              >
                {regime === 'repel'
                  ? '→ too close: pushing apart'
                  : regime === 'attract'
                  ? s.lambda < 0.15
                    ? '→ in range, but attraction is off this phase'
                    : '→ pulling together'
                  : '→ out of range: no pair force'}
              </div>
              <Plot s={s} rep={rep} att={att} ink={ink} />
            </div>

            {/* The global cycle, acting on each particle on its own. */}
            <div
              className={
                twoCol
                  ? ''
                  : 'mt-2 pt-2 border-t border-light-gray/30 dark:border-dark-gray/30'
              }
            >
              <div className="text-light-gray dark:text-dark-gray mb-1">
                global cycle V(ρ), on each particle alone
              </div>
              <div
                className="px-2 py-1 rounded-sm"
                style={tint(squeezing, P.cool)}
              >
                <span style={{ color: rgba(P.cool) }}>c·λ(t)·ρ²</span>
                <span className="float-right text-light-gray dark:text-dark-gray">
                  pulls in
                </span>
                <div className="text-light-gray dark:text-dark-gray">
                  confinement
                </div>
              </div>
              <div
                className="px-2 py-1 mt-1 rounded-sm"
                style={tint(!squeezing, P.warm)}
              >
                <span style={{ color: rgba(P.warm) }}>
                  − p·(1−λ(t))·(ρ − ρ²/4)
                </span>
                <span className="float-right text-light-gray dark:text-dark-gray">
                  pushes out
                </span>
                <div className="text-light-gray dark:text-dark-gray">
                  pressure
                </div>
              </div>
              <div className="mt-2">
                ρ = {s.rhoA.toFixed(2)} · {s.rhoB.toFixed(2)}
                <span className="text-light-gray dark:text-dark-gray">
                  {' '}
                  (distance from centre / R, wall at {s.wall})
                </span>
              </div>
              <div className="mt-2 text-light-gray dark:text-dark-gray">
                push on the pair: each other {pairShare}% · the cycle{' '}
                {100 - pairShare}%
              </div>
              <div className="h-1.5 mt-1 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${pairShare}%`,
                    background:
                      regime === 'repel'
                        ? rep
                        : regime === 'attract'
                        ? att
                        : ink,
                  }}
                />
                <div
                  style={{
                    width: `${100 - pairShare}%`,
                    background: rgba(squeezing ? P.cool : P.warm),
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContradictionOverlay;
