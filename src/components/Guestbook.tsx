import React from 'react';

export { GUESTBOOK_TOKEN } from '../utils/mapToken';

type Entry = { name: string; msg: string; country: string; at: number };
type Status = 'loading' | 'ready' | 'off';

const NAME_MAX = 40;
const MSG_MAX = 280;

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

const paletteFor = (dark: boolean) =>
  dark
    ? {
        text: '#cbd6e2',
        muted: '#627e99',
        accent: '#568bbf',
        border: '#2b3d4f',
        inputBorder: '#33485f',
        rule: '#1c2c3c',
      }
    : {
        text: '#1c2b3a',
        muted: '#6b7b8a',
        accent: '#2f6da8',
        border: '#c2cfdb',
        inputBorder: '#c2cfdb',
        rule: '#e2e9f0',
      };

const rel = (at: number): string => {
  const s = Math.max(0, (Date.now() - (at || 0)) / 1000);
  if (s < 45) return 'just now';
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.floor(d)}d ago`;
  const mo = d / 30;
  if (mo < 12) return `${Math.floor(mo)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

export const Guestbook: React.FC<{ dark?: boolean }> = ({ dark: darkProp }) => {
  const internalDark = useDark();
  const dark = darkProp ?? internalDark;
  const P = paletteFor(dark);

  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [status, setStatus] = React.useState<Status>('loading');
  const [name, setName] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    fetch('/api/guestbook')
      .then((r) => r.json())
      .then((d) => {
        if (d.configured) {
          setEntries(Array.isArray(d.entries) ? d.entries : []);
          setStatus('ready');
        } else {
          setEntries([]);
          setStatus('off');
        }
      })
      .catch(() => setStatus('off'));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = msg.trim();
    if (!m || sending) return;
    setSending(true);
    setNote(null);
    try {
      const r = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), msg: m }),
      });
      const d = await r.json();
      if (d.ok && d.entry) {
        setEntries((prev) => [d.entry, ...prev]);
        setMsg('');
        setNote('thanks for signing :)');
      } else {
        setNote(d.error || 'Could not save — please try again.');
      }
    } catch (err) {
      setNote('Could not save — please try again.');
    }
    setSending(false);
  };

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    color: P.text,
    border: `1px solid ${P.inputBorder}`,
    borderRadius: 4,
    padding: '3px 8px',
    fontFamily: 'inherit',
    fontSize: '0.9em',
    outline: 'none',
  };
  const btn: React.CSSProperties = {
    background: 'transparent',
    color: sending ? P.muted : P.accent,
    border: `1px solid ${sending ? P.inputBorder : P.accent}`,
    borderRadius: 4,
    padding: '3px 12px',
    cursor: sending ? 'default' : 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.9em',
  };

  return (
    <div style={{ margin: '4px 0 14px', maxWidth: 860, color: P.text }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
          color: P.muted,
          fontSize: '0.9em',
        }}
      >
        <span style={{ color: P.text }}>guestbook</span>
        <span style={{ color: P.accent }}>
          ·{' '}
          {status === 'ready'
            ? `${entries.length} note${entries.length === 1 ? '' : 's'}`
            : status === 'loading'
            ? 'loading…'
            : 'offline'}
        </span>
        <span style={{ flexGrow: 1 }} />
        <button
          style={{ ...btn, color: P.accent, border: `1px solid ${P.inputBorder}` }}
          onClick={load}
        >
          refresh
        </button>
      </div>

      <form
        onSubmit={submit}
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <input
          style={{ ...inputStyle, width: 150 }}
          value={name}
          maxLength={NAME_MAX}
          placeholder="name (optional)"
          onChange={(e) => setName(e.target.value)}
          disabled={status === 'off'}
        />
        <input
          style={{ ...inputStyle, flexGrow: 1, minWidth: 200 }}
          value={msg}
          maxLength={MSG_MAX}
          placeholder="leave a note…"
          onChange={(e) => setMsg(e.target.value)}
          disabled={status === 'off'}
        />
        <button type="submit" style={btn} disabled={sending || status === 'off'}>
          {sending ? 'signing…' : 'sign'}
        </button>
      </form>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 3,
          color: P.muted,
          fontSize: '0.78em',
          minHeight: '1.1em',
        }}
      >
        {note ? <span style={{ color: P.accent }}>{note}</span> : <span />}
        <span style={{ flexGrow: 1 }} />
        <span>
          {msg.length}/{MSG_MAX}
        </span>
      </div>

      <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto' }}>
        {status === 'off' && (
          <div style={{ color: P.muted, fontSize: '0.88em' }}>
            The guestbook is warming up — storage isn&apos;t configured on the
            server yet.
          </div>
        )}
        {status === 'ready' && entries.length === 0 && (
          <div style={{ color: P.muted, fontSize: '0.88em' }}>
            No notes yet — be the first to sign!
          </div>
        )}
        {entries.map((en, i) => (
          <div
            key={`${en.at}-${i}`}
            style={{
              padding: '6px 0',
              borderTop: i === 0 ? 'none' : `1px solid ${P.rule}`,
            }}
          >
            <div style={{ fontSize: '0.82em', color: P.muted }}>
              <span style={{ color: P.accent, fontWeight: 'bold' }}>
                {en.name || 'anonymous'}
              </span>
              {en.country ? <span> · {en.country}</span> : null}
              <span> · {rel(en.at)}</span>
            </div>
            <div
              style={{
                fontSize: '0.92em',
                color: P.text,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {en.msg}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Guestbook;
