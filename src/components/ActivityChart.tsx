import React from 'react';

type Day = { date: string; count: number };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (iso: string): string => {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]} ${d}`;
};

const themeFor = (dark: boolean) =>
  dark
    ? {
        bg: '#0b1c2c',
        grid: '#33485f',
        // curve matches the map's "hot" color: whiter in dark mode
        area: 'rgba(234,241,248,0.16)',
        line: '#eaf1f8',
        text: '#cbd6e2',
        muted: '#627e99',
        accent: '#bf568b',
        tip: 'rgba(11,28,44,0.95)',
      }
    : {
        bg: '#eef3f7',
        grid: '#c2cfdb',
        // curve matches the map's "hot" color: darker in light mode
        area: 'rgba(18,30,41,0.14)',
        line: '#121e29',
        text: '#1c2b3a',
        muted: '#6b7b8a',
        accent: '#c2477f',
        tip: 'rgba(255,255,255,0.95)',
      };

export const ActivityChart: React.FC<{
  daily: Record<string, number>;
  dark?: boolean;
}> = ({ daily, dark = true }) => {
  const C = themeFor(dark);
  const [mode, setMode] = React.useState<'day' | 'week'>('day');
  const [hover, setHover] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const days = React.useMemo<Day[]>(() => {
    const out: Day[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: daily[key] || 0 });
    }
    return out;
  }, [daily]);

  const series = React.useMemo<Day[]>(() => {
    if (mode === 'day') return days;
    const weeks: Day[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      weeks.push({
        date: chunk[0].date,
        count: chunk.reduce((s, d) => s + d.count, 0),
      });
    }
    return weeks;
  }, [days, mode]);

  const total = days.reduce((s, d) => s + d.count, 0);
  const W = 600;
  const H = 130;
  const padL = 6;
  const padR = 6;
  const padT = 12;
  const padB = 4;
  const n = series.length;
  const max = Math.max(1, ...series.map((s) => s.count));
  const xAt = (i: number) =>
    padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
  const yAt = (c: number) => padT + (1 - c / max) * (H - padT - padB);

  const line = series
    .map((s, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(s.count).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${xAt(n - 1).toFixed(1)},${H - padB} L${xAt(0).toFixed(
    1,
  )},${H - padB} Z`;

  const onMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
  };

  const btn = (active: boolean): React.CSSProperties => ({
    background: active ? `${C.line}26` : 'transparent',
    color: active ? C.line : C.muted,
    border: `1px solid ${active ? C.line : C.muted}`,
    borderRadius: 4,
    padding: '0 7px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.8em',
  });

  const hv = hover != null ? series[hover] : null;

  return (
    <div style={{ maxWidth: 860, marginTop: 10, color: C.text }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
          color: C.muted,
          fontSize: '0.9em',
        }}
      >
        <span style={{ color: C.text }}>visits · last 90 days</span>
        <span>— {total} total</span>
        <span style={{ flexGrow: 1 }} />
        <button style={btn(mode === 'day')} onClick={() => setMode('day')}>
          day
        </button>
        <button style={btn(mode === 'week')} onClick={() => setMode('week')}>
          week
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{
            width: '100%',
            height: 130,
            display: 'block',
            background: C.bg,
            border: `1px solid ${C.grid}`,
            borderRadius: 4,
          }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {[0, 0.5, 1].map((f, idx) => {
            const y = padT + f * (H - padT - padB);
            return (
              <line
                key={idx}
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke={C.grid}
                strokeWidth="0.5"
              />
            );
          })}
          <path d={area} fill={C.area} stroke="none" />
          <path d={line} fill="none" stroke={C.line} strokeWidth="1.5" />
          {hv && (
            <>
              <line
                x1={xAt(hover as number)}
                x2={xAt(hover as number)}
                y1={padT}
                y2={H - padB}
                stroke={C.accent}
                strokeWidth="0.75"
              />
              <circle cx={xAt(hover as number)} cy={yAt(hv.count)} r="2.5" fill={C.accent} />
            </>
          )}
          <text x={padL} y={padT - 3} fill={C.muted} fontSize="9" fontFamily="monospace">
            {max}
          </text>
        </svg>

        {hv && (
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: `${((hover as number) / Math.max(1, n - 1)) * 100}%`,
              transform: 'translateX(-50%)',
              background: C.tip,
              border: `1px solid ${C.accent}`,
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: '0.8em',
              color: C.text,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: C.accent }}>
              {fmt(hv.date)}
              {mode === 'week' ? ' +wk' : ''}
            </span>{' '}
            · {hv.count} visit{hv.count === 1 ? '' : 's'}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: C.muted,
          fontSize: '0.72em',
          marginTop: 2,
        }}
      >
        <span>{fmt(series[0]?.date)}</span>
        <span>{fmt(series[Math.floor(n / 2)]?.date)}</span>
        <span>today</span>
      </div>
    </div>
  );
};

export default ActivityChart;
