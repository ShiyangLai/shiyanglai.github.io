import axios from 'axios';
import config from '../../config.json';

// --- Terminal text styling helpers -----------------------------------------
// Output is rendered as HTML (dangerouslySetInnerHTML), so we use inline styles
// with the theme's ansi colors (identical in light/dark, so they read on both
// backgrounds). Tailwind classes are unreliable here because the Tailwind
// `content` glob does not scan src/utils.
const HL = '#BF568B'; // magenta accent — for **highlights**
const TAG = '#568BBF'; // cyan accent — for date / name tags
const LINK_CLASS = 'text-light-blue dark:text-dark-blue underline';

// Lightweight markup: `**text**` -> bold highlight. Emojis and raw HTML
// (e.g. <i>…</i>) in the source pass straight through.
const renderMarkup = (s: string): string =>
  s.replace(/\*\*(.+?)\*\*/g, `<b style="color:${HL}">$1</b>`);

const link = (label: string, url: string): string =>
  `<u><a class="${LINK_CLASS}" href="${url}" target="_blank">${label}</a></u>`;

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
      const desc = p.desc ? ` — ${renderMarkup(p.desc)}` : '';
      const icon = p.done ? '✅' : '🚧';
      return `  ${icon} ${title}${desc}`;
    };

    const wip = rows.filter((p) => !p.done).map(fmt);
    const done = rows.filter((p) => p.done).map(fmt);

    if (wip.length === 0 && done.length === 0) {
      return 'No projects listed yet — check back soon!';
    }

    return [
      '🚧 ongoing/',
      wip.length ? wip.join('\n') : '  (nothing in flight right now)',
      '',
      '✅ finished/',
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
        const label = text ?? '';
        const body = url ? link(label, url) : label;
        return `<span style="color:${TAG}">${date}</span>  ${renderMarkup(body)}`;
      });
    if (items.length === 0) {
      return 'No news yet — check back soon!';
    }
    return `📰 Recent news & achievements:\n\n${items.join('\n')}\n`;
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
