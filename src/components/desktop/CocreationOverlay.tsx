import React from 'react';
import { CoState, Scene } from './scenes';

// The HTML layer of the co-creativity piece: hints, the story card for a
// followed light, the "you intervened" dialog, and the co-create / reset
// controls. It polls the scene's state a few times a second; clicks on the
// canvas itself are routed to the scene by Desktop.tsx.

const POLL_MS = 120;

const INTERVENTIONS = [
  'A ripple runs down the stream of outputs, and then it is the same narrow band again. Tuning the AI alone barely changes what comes out: the sameness comes from how everyone routes their ideas through it.',
  'Another nudge, another ripple that fades. The outputs still converge.',
  'Still the same band. Fixing the model is not the lever here; changing how people work with it might be.',
];

const panel =
  'pointer-events-auto border border-light-foreground/30 dark:border-dark-foreground/30 bg-[#F5F2EA]/90 dark:bg-[#101112]/90';
const btn =
  'pointer-events-auto border px-2 py-0.5 text-sm transition-colors border-light-foreground/40 dark:border-dark-foreground/40 hover:border-light-foreground dark:hover:border-dark-foreground';

export const CocreationOverlay: React.FC<{
  getScene: () => Scene | undefined;
  width: number;
}> = ({ getScene, width }) => {
  const [s, setS] = React.useState<CoState | null>(null);
  const [dialog, setDialog] = React.useState<number | null>(null); // poke #
  const seenPokes = React.useRef(0);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      const next = getScene()?.state?.();
      if (!next) return;
      if (next.pokes > seenPokes.current) {
        seenPokes.current = next.pokes;
        if (next.mode === 'absorb') setDialog(next.pokes);
      }
      setS(next);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [getScene]);

  if (!s) return null;
  const scene = getScene();
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const cocreate = (e: React.MouseEvent) => {
    stop(e);
    setDialog(null);
    scene?.cocreate?.();
  };
  const reset = (e: React.MouseEvent) => {
    stop(e);
    scene?.reset?.();
  };

  return (
    <div
      data-ui
      className="absolute left-6 top-6 pointer-events-none text-light-foreground dark:text-dark-foreground space-y-3"
      style={{ width: Math.min(470, Math.max(260, width - 48)) }}
      onPointerDown={stop}
      onClick={stop}
    >
      {/* Controls + what is happening right now. */}
      <div className="flex items-center flex-wrap gap-2 text-sm">
        {s.mode === 'absorb' && (
          <>
            <button type="button" className={btn} onClick={cocreate}>
              ⟲ co-create with the AI
            </button>
            <span className="text-light-gray dark:text-dark-gray">
              click a light · click the AI
            </span>
          </>
        )}
        {s.mode === 'loop' && (
          <div className={`${panel} px-3 py-2 w-full`}>
            <div className="flex justify-between">
              <span>co-creation · round {s.iteration}</span>
              <span className="text-light-gray dark:text-dark-gray">
                AI's grip on the output: {Math.round((1 - s.energy) * 100)}%
              </span>
            </div>
            <div className="h-1 mt-2 rounded-full bg-light-gray/30 dark:bg-dark-gray/30 overflow-hidden">
              <div
                className="h-full bg-light-foreground dark:bg-dark-foreground"
                style={{ width: `${Math.round((1 - s.energy) * 100)}%` }}
              />
            </div>
            <div className="mt-2 text-light-gray dark:text-dark-gray leading-snug">
              The AI still standardizes everything. But a copy of each idea goes
              around it, corrects the flattened output, and sends it back in,
              more each round.
            </div>
          </div>
        )}
        {(s.mode === 'burst' || s.mode === 'amplified') && (
          <div className={`${panel} px-3 py-2 w-full`}>
            <div className="leading-snug">
              The AI can no longer flatten what comes in. The band unzips into
              branches: more ideas, in more directions, than went in.
            </div>
            <button type="button" className={`${btn} mt-2`} onClick={reset}>
              ↺ reset
            </button>
          </div>
        )}
      </div>

      {/* Story of the followed light (the dialog takes its place while open). */}
      {s.story && !(dialog !== null && s.mode === 'absorb') && (
        <div className={`${panel} px-3 py-3 text-sm leading-snug`}>
          <div className="flex justify-between text-light-gray dark:text-dark-gray mb-2">
            <span>user #{String(s.story.user).padStart(2, '0')}</span>
            <button
              type="button"
              className="pointer-events-auto hover:text-light-foreground dark:hover:text-dark-foreground"
              onClick={(e) => {
                stop(e);
                scene?.click?.(null);
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="text-sm">“{s.story.before}”</div>
          <div
            className="mt-3 transition-opacity duration-700"
            style={{ opacity: s.phase === 'before' ? 0.25 : 1 }}
          >
            <div className="text-light-gray dark:text-dark-gray mb-1">
              {s.phase === 'co'
                ? '↓ after co-creating with the AI'
                : '↓ after many rounds of handing it to the AI'}
            </div>
            <div
              className={`text-sm ${
                s.phase === 'co'
                  ? 'font-bold'
                  : 'text-light-gray dark:text-dark-gray'
              }`}
            >
              “{s.phase === 'co' ? s.story.co : s.story.after}”
            </div>
            {s.phase === 'after' && (
              <div className="mt-2 text-light-gray dark:text-dark-gray">
                {s.mode === 'loop'
                  ? 'Still flattened, for now. But a copy of it goes around the AI, corrects the output, and sends it back in.'
                  : 'Same as everyone else now. Try ⟲ co-create and follow it again.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* "You intervened in the AI." */}
      {dialog !== null && s.mode === 'absorb' && (
        <div className={`${panel} px-3 py-3 text-sm leading-snug`}>
          <div className="font-bold mb-1">You intervened in the AI</div>
          <div>{INTERVENTIONS[Math.min(dialog, INTERVENTIONS.length) - 1]}</div>
          <div className="flex gap-2 mt-3">
            <button type="button" className={btn} onClick={cocreate}>
              ⟲ try co-creating instead
            </button>
            <button
              type="button"
              className="pointer-events-auto px-2 text-light-gray dark:text-dark-gray hover:underline"
              onClick={(e) => {
                stop(e);
                setDialog(null);
              }}
            >
              ok
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CocreationOverlay;
