import Head from 'next/head';
import React from 'react';
import config from '../../config.json';
import { Input } from '../components/input';
import { useHistory } from '../components/history/hook';
import { History } from '../components/history/History';
import { ThemeToggle } from '../components/ThemeToggle';
import { WindowControls } from '../components/WindowControls';
import {
  Desktop,
  DesktopMode,
  WINDOW_STYLE,
} from '../components/desktop/Desktop';
import { banner } from '../utils/bin';

interface IndexPageProps {
  inputRef: React.MutableRefObject<HTMLInputElement>;
}

const IndexPage: React.FC<IndexPageProps> = ({ inputRef }) => {
  const containerRef = React.useRef(null);
  const {
    history,
    command,
    lastCommandIndex,
    setCommand,
    setHistory,
    appendEntry,
    updateEntry,
    clearHistory,
    setLastCommandIndex,
  } = useHistory([]);

  const init = React.useCallback(() => setHistory(banner()), []);

  React.useEffect(() => {
    init();
  }, [init]);

  // Record this visit once per session (powers the `map` command). Coarse
  // location only — handled server-side via Vercel geo headers; no IPs stored.
  React.useEffect(() => {
    try {
      if (!window.sessionStorage.getItem('visit-recorded')) {
        window.sessionStorage.setItem('visit-recorded', '1');
        fetch('/api/visit', { method: 'POST' }).catch(() => undefined);
      }
    } catch (e) {
      // no-op (storage unavailable, e.g. private mode)
    }
  }, []);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.scrollIntoView();
      inputRef.current.focus({ preventScroll: true });
    }
  }, [history]);

  // Drag the window by its top edge. The offset is clamped so the top edge
  // always stays reachable on screen.
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const winDrag = React.useRef<{
    px: number;
    py: number;
    ox: number;
    oy: number;
    rect: DOMRect;
  } | null>(null);
  const onWinDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    winDrag.current = {
      px: e.clientX,
      py: e.clientY,
      ox: offset.x,
      oy: offset.y,
      rect: e.currentTarget.parentElement.getBoundingClientRect(),
    };
  };
  const onWinMove = (e: React.PointerEvent) => {
    const d = winDrag.current;
    if (!d) return;
    const dx = Math.min(
      window.innerWidth - d.rect.left - 120,
      Math.max(120 - d.rect.right, e.clientX - d.px),
    );
    const dy = Math.min(
      window.innerHeight - d.rect.top - 40,
      Math.max(12 - d.rect.top, e.clientY - d.py),
    );
    setOffset({ x: d.ox + dx, y: d.oy + dy });
  };
  const onWinUp = () => {
    winDrag.current = null;
  };

  // Full screen (default) / window over the research desktop / put away.
  // Phones always stay full screen.
  const [mode, setMode] = React.useState<'full' | DesktopMode>('full');
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => {
      if (!mq.matches) setMode('full');
    };
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  React.useEffect(() => {
    if (mode === 'window') inputRef.current?.focus({ preventScroll: true });
    if (mode === 'full') setOffset({ x: 0, y: 0 });
  }, [mode]);

  return (
    <>
      <Head>
        <title>{config.title}</title>
      </Head>

      {mode !== 'full' && (
        <Desktop mode={mode} onOpen={() => setMode('window')} />
      )}

      {/* Wrapper so the tabs can sit on the border without being clipped. */}
      <div
        className={
          mode === 'full'
            ? 'relative h-full'
            : `window-in ${mode === 'hidden' ? 'hidden' : ''}`
        }
        style={
          mode === 'full'
            ? undefined
            : {
                ...WINDOW_STYLE,
                transform: `translate(${offset.x}px, calc(-50% + ${offset.y}px))`,
              }
        }
      >
        <div
          className={`p-8 overflow-hidden h-full border border-light-foreground/60 dark:border-dark-foreground/50 ${
            mode === 'full'
              ? ''
              : 'bg-light-background dark:bg-dark-background shadow-2xl'
          }`}
        >
          <div
            ref={containerRef}
            className={`overflow-y-auto h-full ${mode === 'full' ? '' : 'cq'}`}
          >
            <History history={history} />

            <Input
              inputRef={inputRef}
              containerRef={containerRef}
              command={command}
              history={history}
              lastCommandIndex={lastCommandIndex}
              setCommand={setCommand}
              setHistory={setHistory}
              appendEntry={appendEntry}
              updateEntry={updateEntry}
              setLastCommandIndex={setLastCommandIndex}
              clearHistory={clearHistory}
            />
          </div>
        </div>

        {mode !== 'full' && (
          <div
            className="absolute inset-x-0 top-0 h-8 cursor-move select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={onWinDown}
            onPointerMove={onWinMove}
            onPointerUp={onWinUp}
            onPointerCancel={onWinUp}
            title="Drag to move"
          />
        )}

        <WindowControls
          fullscreen={mode === 'full'}
          onHide={() => setMode('hidden')}
          onToggleFullscreen={() =>
            setMode((m) => (m === 'full' ? 'window' : 'full'))
          }
        />
        <ThemeToggle />
      </div>
    </>
  );
};

export default IndexPage;
