import React from 'react';
import { useIsDark } from '../../utils/theme';
import { FacesState, PALETTES, Scene, rgba } from './scenes';

// The HTML layer of the many-faces piece: the person's state (a
// superposition, or the face a context collapsed it to), controls, and the
// data — measurements per context and a χ² test of whether the face depends
// on the context (entangled: many faces) or not (separable: one self). The
// "one self" world is a control in which every context has the same odds.
// Faces are told apart by hatch angle, as on the canvas.

const POLL_MS = 120;
const MIN_N = 12; // measurements before the test says anything

const btn =
  'pointer-events-auto border px-2 py-0.5 text-sm transition-colors border-light-foreground/40 dark:border-dark-foreground/40 hover:border-light-foreground dark:hover:border-dark-foreground';
const heading =
  'text-[11px] uppercase tracking-[0.25em] text-light-gray dark:text-dark-gray';

const formatP = (p: number) =>
  p < 0.001 ? 'p < .001' : `p = ${p.toFixed(3).replace(/^0/, '')}`;

export const FacesOverlay: React.FC<{
  getScene: () => Scene | undefined;
  width: number;
}> = ({ getScene, width }) => {
  const dark = useIsDark();
  const ink = rgba(PALETTES[dark ? 'night' : 'day'].fg, 0.85);
  const [s, setS] = React.useState<FacesState | null>(null);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setS(getScene()?.faces?.() ?? null);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [getScene]);

  if (!s) return null;
  const scene = getScene();
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  // A face's hatching as CSS (canvas angle 0 = horizontal lines).
  const hatch = (j: number, gap = 4): React.CSSProperties => ({
    backgroundImage: `repeating-linear-gradient(${
      (s.faces[j].angle * 180) / Math.PI
    }deg, ${ink} 0 1px, transparent 1px ${gap}px)`,
  });
  const swatch = (j: number) => (
    <span
      className="inline-block w-2.5 h-2.5 mr-1 align-[-1px] border border-light-foreground/50 dark:border-dark-foreground/50"
      style={hatch(j, 3)}
    />
  );
  const term = (j: number) => (
    <span key={j} className="whitespace-nowrap">
      {swatch(j)}
      {s.faces[j].amp.toFixed(2)}|{s.faces[j].name}⟩
    </span>
  );
  const { N, x2, df, p } = s.test;
  const verdict =
    N < MIN_N || p === null
      ? `measure ${Math.max(0, MIN_N - N)} more times to test`
      : p < 0.05
      ? 'entangled: the face depends on the context → many faces'
      : 'separable so far: the same face everywhere → one self';
  const world = (one: boolean, text: string) => (
    <button
      type="button"
      aria-pressed={(s.world === 'one') === one}
      className={`${btn} ${
        (s.world === 'one') === one
          ? 'bg-light-foreground/10 dark:bg-dark-foreground/10 border-light-foreground dark:border-dark-foreground'
          : 'text-light-gray dark:text-dark-gray'
      }`}
      onClick={(e) => {
        stop(e);
        scene?.setWorld?.(one);
      }}
    >
      {text}
    </button>
  );

  return (
    <div
      data-ui
      className="absolute left-6 top-6 pointer-events-none text-light-foreground dark:text-dark-foreground space-y-2 text-sm"
      style={{ width: Math.min(480, Math.max(280, width - 48)) }}
      onPointerDown={stop}
      onClick={stop}
    >
      <div className="flex items-center flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          disabled={s.auto}
          onClick={(e) => {
            stop(e);
            scene?.measureMany?.(20);
          }}
        >
          ▶ measure ×20
        </button>
        <button
          type="button"
          className={btn}
          onClick={(e) => {
            stop(e);
            scene?.reset?.();
          }}
        >
          ↺ reset
        </button>
        <span className="text-light-gray dark:text-dark-gray">
          drag the person into a context
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={heading}>world</span>
        {world(false, 'many faces')}
        {world(true, 'one self (control)')}
      </div>

      <div className="pointer-events-auto border border-light-foreground/30 dark:border-dark-foreground/30 bg-[#F5F2EA]/90 dark:bg-[#101112]/90 px-3 py-2 leading-relaxed">
        {/* The state. */}
        <div className={heading}>state</div>
        {s.face === null ? (
          <div>
            |ψ⟩ ={' '}
            {s.faces.map((_, j) => (
              <React.Fragment key={j}>
                {j > 0 && ' + '}
                {term(j)}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div>
            <span className="text-light-gray dark:text-dark-gray">
              measured in {s.contexts[s.where]} →{' '}
            </span>
            {swatch(s.face)}|{s.faces[s.face].name}⟩
            <div className="text-light-gray dark:text-dark-gray">
              collapsed, and bound to its context: |{s.faces[s.face].name}⟩ ⊗ |
              {s.contexts[s.where]}⟩
            </div>
          </div>
        )}

        {/* The data. */}
        {N > 0 && (
          <div className="mt-2 pt-2 border-t border-light-foreground/20 dark:border-dark-foreground/20">
            <div className={heading}>measurements</div>
            {s.contexts.map((c, k) => {
              const row = s.counts[k];
              const n = row.reduce((a, b) => a + b, 0);
              return (
                <div key={c} className="flex items-center gap-2">
                  <span className="w-12 text-light-gray dark:text-dark-gray">
                    {c}
                  </span>
                  <div className="flex-1 h-2.5 flex overflow-hidden border border-light-foreground/30 dark:border-dark-foreground/30">
                    {n > 0 &&
                      row.map((m, j) =>
                        m ? (
                          <div
                            key={j}
                            className="border-r border-light-foreground/40 dark:border-dark-foreground/40 last:border-r-0"
                            style={{ width: `${(100 * m) / n}%`, ...hatch(j) }}
                          />
                        ) : null,
                      )}
                  </div>
                  <span className="w-6 text-right text-light-gray dark:text-dark-gray">
                    {n}
                  </span>
                </div>
              );
            })}
            <div className="mt-2 text-light-gray dark:text-dark-gray">
              N = {N}
              {df > 0 && N >= MIN_N && (
                <>
                  {' '}
                  · χ² = {x2.toFixed(1)} (df {df}) · {formatP(p)}
                </>
              )}
            </div>
            <div
              className={
                N >= MIN_N && p !== null && p < 0.05 ? 'font-bold' : ''
              }
            >
              {verdict}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacesOverlay;
