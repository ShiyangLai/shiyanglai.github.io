import React from 'react';
import config from '../../../config.json';
import { useIsDark } from '../../utils/theme';
import { SCENES, PALETTES, Frame, Scene, View, rgba } from './scenes';
import { CocreationOverlay } from './CocreationOverlay';
import { ContradictionOverlay } from './ContradictionOverlay';
import { FacesOverlay } from './FacesOverlay';

// The "desktop" behind the terminal once it leaves full screen: a slideshow of
// generative pieces, one per research line (see config.json -> desktop), that
// crossfade every `intervalMs`. Only the visible piece(s) are animated.

export type DesktopMode = 'window' | 'hidden';

// Terminal window geometry in desktop mode (kept to the right, so the art and
// caption have the left side of the screen).
const WIN_MAX_W = 880;
const WIN_VW = 0.56;
const WIN_RIGHT_VW = 0.04;
export const WINDOW_STYLE: React.CSSProperties = {
  position: 'fixed',
  zIndex: 10,
  width: `min(${WIN_MAX_W}px, ${WIN_VW * 100}vw)`,
  height: 'min(680px, 78vh)',
  right: `${WIN_RIGHT_VW * 100}vw`,
  top: '50%',
  transform: 'translateY(-50%)',
};

const FADE_MS = 1200;
const PITCH_RANGE: [number, number] = [-0.6, 0.9]; // drag limits (radians)

const frameFor = (mode: DesktopMode, w: number, h: number): Frame => {
  if (mode === 'hidden') {
    return { w, h, fx: w / 2, fy: h * 0.45, R: Math.min(w, h) * 0.32 };
  }
  const open = w - Math.min(WIN_MAX_W, w * WIN_VW) - w * WIN_RIGHT_VW;
  const fx = open / 2;
  return { w, h, fx, fy: h * 0.42, R: Math.min(fx, h * 0.4) * 0.85 };
};

const useViewport = () => {
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  React.useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return size;
};

export const Desktop: React.FC<{ mode: DesktopMode; onOpen: () => void }> = ({
  mode,
  onOpen,
}) => {
  const { scenes, intervalMs } = config.desktop;
  const dark = useIsDark();
  const { w, h } = useViewport();
  const canvases = React.useRef<HTMLCanvasElement[]>([]);
  const [active, setActive] = React.useState(0);
  const [cycle, setCycle] = React.useState(0); // bumps to restart the timer
  const live = React.useRef<{ scene: Scene; until: number }[]>([]);
  const activeRef = React.useRef(0);

  // Drag on the desktop to orbit the 3D (`draggable`) pieces; a flick keeps
  // spinning and eases out. On interactive pieces a click goes to the scene.
  // The slideshow pauses while the mouse is held down.
  // One camera offset per piece, so switching pieces doesn't jolt the one
  // fading out; a piece starts from its default view each time it appears.
  const views = React.useRef<View[]>(scenes.map(() => ({ yaw: 0, pitch: 0 })));
  const spin = React.useRef({ yaw: 0, pitch: 0 }); // radians per second
  const drag = React.useRef<{ x: number; y: number; at: number } | null>(null);
  const press = React.useRef<{ x: number; y: number } | null>(null);
  const carrying = React.useRef(false); // dragging an object inside a piece
  const [holding, setHolding] = React.useState(false);
  const [pointer, setPointer] = React.useState(false); // hovering a clickable
  const activeScene = () => live.current[activeRef.current]?.scene;

  // Scroll / pinch to zoom pieces that support it. A native listener, since
  // React's wheel handler is passive and can't stop the browser's own
  // pinch-zoom (which arrives as ctrl + wheel).
  const root = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const sc = live.current[activeRef.current]?.scene;
      if (!sc?.zoomBy) return;
      e.preventDefault();
      sc.zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  // Mutates the active view in place: the scenes hold a reference to it.
  const rotate = (dyaw: number, dpitch: number) => {
    const v = views.current[activeRef.current];
    v.yaw += dyaw;
    v.pitch = Math.min(
      PITCH_RANGE[1],
      Math.max(PITCH_RANGE[0], v.pitch + dpitch),
    );
  };

  // Build every scene for the current size / layout / palette.
  React.useEffect(() => {
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const frame = frameFor(mode, w, h);
    const palette = PALETTES[dark ? 'night' : 'day'];
    live.current = scenes.map((s, i) => {
      const canvas = canvases.current[i];
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const scene = SCENES[s.art](ctx, frame, palette, views.current[i]);
      scene.step(1 / 60); // draw a first frame right away
      return { scene, until: i === activeRef.current ? Infinity : 0 };
    });
  }, [w, h, mode, dark, scenes]);

  // Animation loop: step the active piece, plus the outgoing one mid-fade.
  React.useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!drag.current) {
        const decay = Math.exp(-2.5 * dt);
        rotate(spin.current.yaw * dt, spin.current.pitch * dt);
        spin.current.yaw *= decay;
        spin.current.pitch *= decay;
      }
      for (const s of live.current) if (now < s.until) s.scene.step(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const show = React.useCallback((next: number) => {
    const prev = live.current[activeRef.current];
    if (prev) prev.until = performance.now() + FADE_MS;
    if (live.current[next]) live.current[next].until = Infinity;
    Object.assign(views.current[next], { yaw: 0, pitch: 0 });
    spin.current = { yaw: 0, pitch: 0 };
    activeRef.current = next;
    setActive(next);
  }, []);

  React.useEffect(() => {
    if (holding) return;
    const id = window.setInterval(() => {
      if (activeScene()?.busy?.()) return; // someone is exploring this piece
      show((activeRef.current + 1) % scenes.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [show, scenes.length, intervalMs, cycle, holding]);

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (e.button !== 0 || target.closest('button, [data-ui]')) return;
    press.current = { x: e.clientX, y: e.clientY };
    setHolding(true);
    // Picking something up (the person in Many faces) takes the drag.
    if (activeScene()?.grab?.(e.clientX, e.clientY)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      carrying.current = true;
      return;
    }
    if (!activeScene()?.draggable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, at: performance.now() };
    spin.current = { yaw: 0, pitch: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (carrying.current) {
      activeScene()?.dragTo?.(e.clientX, e.clientY);
      return;
    }
    const d = drag.current;
    if (!d) {
      const sc = activeScene();
      const over = !!sc?.hit?.(e.clientX, e.clientY);
      if (over !== pointer) setPointer(over);
      return;
    }
    const now = performance.now();
    const dyaw = (e.clientX - d.x) * 0.008;
    const dpitch = (e.clientY - d.y) * 0.006;
    rotate(dyaw, dpitch);
    const dt = Math.max(0.008, (now - d.at) / 1000);
    spin.current = { yaw: dyaw / dt, pitch: dpitch / dt };
    drag.current = { x: e.clientX, y: e.clientY, at: now };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const p0 = press.current;
    press.current = null;
    setHolding(false);
    if (carrying.current) {
      carrying.current = false;
      activeScene()?.release?.(e.clientX, e.clientY);
      return;
    }
    // A click (not a drag) on an interactive piece goes to the scene.
    const sc = activeScene();
    if (p0 && sc?.click && Math.hypot(e.clientX - p0.x, e.clientY - p0.y) < 6) {
      sc.click(sc.hit?.(e.clientX, e.clientY) ?? null);
    }
    if (!drag.current) return;
    // A pause before letting go means "place it here", not "flick it".
    if (performance.now() - drag.current.at > 80)
      spin.current = { yaw: 0, pitch: 0 };
    drag.current = null;
  };

  const pick = (i: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (i !== activeRef.current) show(i);
    setCycle((c) => c + 1);
  };

  const scene = scenes[active];
  const getActive = React.useCallback(
    () => live.current[activeRef.current]?.scene,
    [],
  );
  const captionWidth =
    mode === 'window' ? Math.max(220, frameFor(mode, w, h).fx * 2 - 64) : 520;

  return (
    <div
      ref={root}
      className={`fixed inset-0 z-0 overflow-hidden select-none ${
        pointer
          ? scene.art === 'faces'
            ? holding
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-pointer'
          : scene.art === 'contradiction'
          ? holding
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : ''
      }`}
      style={{
        background: rgba(PALETTES[dark ? 'night' : 'day'].bg),
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {scenes.map((s, i) => (
        <canvas
          key={s.art}
          ref={(el) => {
            if (el) canvases.current[i] = el;
          }}
          className="absolute inset-0 w-full h-full"
          style={{
            opacity: i === active ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease`,
          }}
          role="img"
          aria-label={`${s.title}: ${s.question}`}
        />
      ))}

      {scene.art === 'cocreation' && (
        <CocreationOverlay getScene={getActive} width={captionWidth + 64} />
      )}
      {scene.art === 'faces' && (
        <FacesOverlay getScene={getActive} width={captionWidth + 64} />
      )}
      {scene.art === 'contradiction' && (
        <ContradictionOverlay
          getScene={getActive}
          width={mode === 'window' ? captionWidth + 64 : w}
          height={h}
        />
      )}

      {/* Caption: which project, and the question behind it. */}
      <div
        className="absolute left-8 bottom-8 text-light-foreground dark:text-dark-foreground"
        style={{ maxWidth: captionWidth }}
      >
        <div className="text-sm text-light-gray dark:text-dark-gray mb-1">
          research · {String(active + 1).padStart(2, '0')} /{' '}
          {String(scenes.length).padStart(2, '0')}
        </div>
        <div className="text-lg uppercase tracking-[0.3em] text-light-foreground dark:text-dark-foreground">
          {scene.title}
        </div>
        {/* A small bracket under the title, as on a printed plate. */}
        <div className="mt-1 w-16 h-2 border-x border-b border-light-foreground/70 dark:border-dark-foreground/70" />
        <div className="text-base mt-2 leading-snug">{scene.question}</div>
        {/* Switcher: big tap targets (numbered), plus previous / next. */}
        <div className="flex items-stretch mt-3 -ml-2 text-sm">
          <button
            type="button"
            onClick={pick((active + scenes.length - 1) % scenes.length)}
            aria-label="Previous research piece"
            className="px-3 py-2 text-light-gray dark:text-dark-gray hover:text-light-foreground dark:hover:text-dark-foreground"
          >
            ‹
          </button>
          {scenes.map((s, i) => (
            <button
              key={s.art}
              type="button"
              onClick={pick(i)}
              aria-label={`Show ${s.title}`}
              title={s.title}
              className={`group px-3 py-2 min-w-[56px] flex flex-col items-center gap-1.5 ${
                i === active
                  ? 'text-light-foreground dark:text-dark-foreground'
                  : 'text-light-gray dark:text-dark-gray hover:text-light-foreground dark:hover:text-dark-foreground'
              }`}
            >
              {String(i + 1).padStart(2, '0')}
              <span
                className={`block h-0.5 transition-all ${
                  i === active
                    ? 'w-10 bg-light-foreground dark:bg-dark-foreground'
                    : 'w-5 bg-light-gray dark:bg-dark-gray opacity-60 group-hover:opacity-100'
                }`}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={pick((active + 1) % scenes.length)}
            aria-label="Next research piece"
            className="px-3 py-2 text-light-gray dark:text-dark-gray hover:text-light-foreground dark:hover:text-dark-foreground"
          >
            ›
          </button>
        </div>
      </div>

      {mode === 'hidden' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="absolute right-8 bottom-8 flex flex-col items-center text-xs text-light-foreground dark:text-dark-foreground group"
        >
          <span className="w-14 h-11 mb-1 flex items-center justify-center rounded border-2 border-light-foreground/60 dark:border-dark-foreground/50 bg-light-background dark:bg-dark-background text-light-green dark:text-dark-green group-hover:scale-105 transition-transform">
            &gt;_
          </span>
          terminal
        </button>
      )}
    </div>
  );
};

export default Desktop;
