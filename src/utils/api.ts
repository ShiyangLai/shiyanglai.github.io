import axios from 'axios';
import config from '../../config.json';

// --- Terminal text styling helpers -----------------------------------------
// Output is rendered as HTML (dangerouslySetInnerHTML), so we use inline styles
// with the theme's ansi colors (identical in light/dark, so they read on both
// backgrounds). Tailwind classes are unreliable here because the Tailwind
// `content` glob does not scan src/utils.
const HL = '#BF568B'; // magenta accent — for **highlights**
const TAG = '#568BBF'; // cyan accent — for date / name tags / links
const GOLD = '#BF8B56'; // amber accent — awards / money / in-progress
const GREEN = '#56BF8B'; // green accent — done
const LINK_CLASS = 'text-light-blue dark:text-dark-blue underline';

// --- Pixel-art icons --------------------------------------------------------
// Color emoji don't render reliably in the terminal font, so icons are built as
// inline SVGs from ASCII grids ('#' = a filled pixel) with crisp edges, giving
// a retro pixel look that always renders. Used via `:token:` markup in the
// content files (e.g. news.md / projects.md).
const pixel = (grid: string[], color: string): string => {
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  let rects = '';
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row.charAt(x) === '#') {
        rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      }
    }
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="0.85em" height="0.85em" fill="${color}" style="shape-rendering:crispEdges;vertical-align:-0.05em;margin-right:0.4em">${rects}</svg>`;
};

const ICONS: Record<string, string> = {
  paper: pixel(
    ['.######.', '.#....#.', '.#.##.#.', '.#....#.', '.#.##.#.', '.#....#.', '.######.'],
    TAG,
  ),
  trophy: pixel(
    ['.######.', '.#....#.', '.#....#.', '..####..', '...##...', '..####..', '.######.'],
    GOLD,
  ),
  coin: pixel(
    ['..####..', '.#.##.#.', '#..##..#', '#.####.#', '#..##..#', '.#.##.#.', '..####..'],
    GOLD,
  ),
  terminal: pixel(
    ['########', '#......#', '#.#....#', '#..#...#', '#.#....#', '#......#', '########', '..####..'],
    TAG,
  ),
  hourglass: pixel(['######', '.####.', '..##..', '..##..', '.####.', '######'], GOLD),
  check: pixel(['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'], GREEN),
};

const renderIcons = (s: string): string =>
  s.replace(/:([a-z]+):/g, (m, name) => ICONS[name] ?? m);

// Lightweight markup: `**text**` -> bold highlight. Raw HTML (e.g. <i>…</i>)
// passes straight through.
const renderMarkup = (s: string): string =>
  s.replace(/\*\*(.+?)\*\*/g, `<b style="color:${HL}">$1</b>`);

// Apply both icon tokens and markup to a user-supplied string.
const render = (s: string): string => renderMarkup(renderIcons(s));

const link = (label: string, url: string): string =>
  `<u><a class="${LINK_CLASS}" style="color:${TAG}" href="${url}" target="_blank">${label}</a></u>`;

type Project = { done: boolean; name: string; desc: string; url: string };

// Listed by the `ls` command. Reads a GitHub-hosted projects.md
// (config.projectsUrl) of `status | name | description | optional-url` lines
// and groups them into ongoing vs finished.
export const getProjects = async () => {
  try {
    const { data } = await axios.get(config.projectsUrl);
    const rows: Project[] = String(data)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((line) => {
        const [status, name, desc, url] = line.split('|').map((s) => s.trim());
        return {
          done: ['done', 'finished', 'complete', 'completed'].includes(
            (status ?? '').toLowerCase(),
          ),
          name: name ?? '',
          desc: desc ?? '',
          url: url ?? '',
        };
      });

    const fmt = (p: Project): string => {
      const title = p.url
        ? link(p.name, p.url)
        : `<b style="color:${TAG}">${p.name}</b>`;
      const desc = p.desc ? ` — ${render(p.desc)}` : '';
      const icon = p.done ? ICONS.check : ICONS.hourglass;
      return `  ${icon}${title}${desc}`;
    };

    const wip = rows.filter((p) => !p.done).map(fmt);
    const done = rows.filter((p) => p.done).map(fmt);

    if (wip.length === 0 && done.length === 0) {
      return 'No projects listed yet — check back soon!';
    }

    return [
      `${ICONS.hourglass}ongoing/`,
      wip.length ? wip.join('\n') : '  (nothing in flight right now)',
      '',
      `${ICONS.check}finished/`,
      done.length ? done.join('\n') : '  (nothing here yet)',
    ].join('\n');
  } catch (error) {
    return 'Could not load projects right now. Please try again later.';
  }
};

export const getReadme = async () => {
  const { data } = await axios.get(config.readmeUrl);
  return data;
};

export const getNews = async () => {
  try {
    const { data } = await axios.get(config.newsUrl);
    const items = String(data)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const [date, text, url] = line.split('|').map((s) => s.trim());
        const label = render(text ?? '');
        const body = url ? link(label, url) : label;
        return `<span style="color:${TAG}">${date}</span>  ${body}`;
      });
    if (items.length === 0) {
      return 'No news yet — check back soon!';
    }
    return `<b style="color:${TAG}">Recent news &amp; achievements:</b>\n\n${items.join('\n')}\n`;
  } catch (error) {
    return 'Could not load news right now. Please try again later.';
  }
};

export const getWeather = async (city: string) => {
  try {
    const { data } = await axios.get(`https://wttr.in/${city}?ATm`);
    return data;
  } catch (error) {
    return error;
  }
};

export const getQuote = async () => {
  try {
    const { data } = await axios.get('https://dummyjson.com/quotes/random');
    return {
      quote: `“${data.quote}” — ${data.author}`,
    };
  } catch (error) {
    return {
      quote: 'Could not fetch a quote right now. Please try again later.',
    };
  }
};
