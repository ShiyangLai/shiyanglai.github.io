// Backs the `publications` (list) and `cite <key>` (BibTeX) commands.
//
// Source of truth is a GitHub-hosted BibTeX file (config.publicationsUrl ->
// publications.bib). `publications` lists SELECTED recent work (year >=
// SELECTED_SINCE), newest first. `cite <key>` prints the *verbatim* BibTeX
// entry for ANY key (older papers included); `cite all` dumps everything.

import axios from 'axios';
import config from '../../config.json';
import { HL, TAG, link } from './format';

const MUTED = '#627e99';
const SELECTED_SINCE = 2024; // `publications` shows this year onward
const SELF = 'shiyang lai'; // author name to highlight

export type Pub = {
  key: string;
  type: string; // article | inproceedings | misc | ...
  fields: Record<string, string>;
  raw: string; // verbatim entry text, for `cite`
};

let cache: Pub[] | null = null;

// --- BibTeX parsing -------------------------------------------------------

// Read `name = value` pairs from an entry body (value is {braced}, "quoted",
// or a bare token). Field names are lower-cased.
const parseFields = (body: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const n = body.length;
  let i = 0;
  while (i < n) {
    while (i < n && /[\s,]/.test(body[i])) i++; // skip separators
    if (i >= n) break;
    const nameStart = i;
    while (i < n && /[A-Za-z0-9_-]/.test(body[i])) i++;
    const name = body.slice(nameStart, i).trim().toLowerCase();
    while (i < n && body[i] !== '=') i++; // skip to '='
    if (i >= n) break;
    i++; // consume '='
    while (i < n && /\s/.test(body[i])) i++;
    let value = '';
    if (body[i] === '{') {
      let depth = 0;
      for (; i < n; i++) {
        const c = body[i];
        if (c === '{') {
          depth++;
          if (depth === 1) continue;
        } else if (c === '}') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        value += c;
      }
    } else if (body[i] === '"') {
      i++;
      while (i < n && body[i] !== '"') value += body[i++];
      i++;
    } else {
      while (i < n && body[i] !== ',' && body[i] !== '\n') value += body[i++];
    }
    if (name) out[name] = value.trim();
  }
  return out;
};

const parseBib = (text: string): Pub[] => {
  const s = String(text);
  const pubs: Pub[] = [];
  let i = 0;
  while (i < s.length) {
    const at = s.indexOf('@', i);
    if (at < 0) break;
    const open = s.indexOf('{', at);
    if (open < 0) break;
    const type = s.slice(at + 1, open).trim().toLowerCase();
    // find the matching close brace for this entry
    let depth = 0;
    let end = -1;
    for (let j = open; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}' && --depth === 0) {
        end = j;
        break;
      }
    }
    if (end < 0) break;
    const raw = s.slice(at, end + 1).trim();
    const body = s.slice(open + 1, end);
    const comma = body.indexOf(',');
    const key = (comma < 0 ? body : body.slice(0, comma)).trim();
    const fields = comma < 0 ? {} : parseFields(body.slice(comma + 1));
    if (key && /^[a-z]+$/.test(type)) pubs.push({ key, type, fields, raw });
    i = end + 1;
  }
  return pubs;
};

const load = async (): Promise<Pub[]> => {
  if (cache) return cache;
  try {
    const { data } = await axios.get(config.publicationsUrl);
    cache = parseBib(String(data));
  } catch (e) {
    cache = [];
  }
  return cache;
};

// --- display helpers ------------------------------------------------------

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Strip braces / common LaTeX escapes for human-readable display.
const clean = (s: string): string =>
  (s || '')
    .replace(/[{}]/g, '')
    .replace(/\\&/g, '&')
    .replace(/\\_/g, '_')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/~/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const yearOf = (p: Pub): number => parseInt(p.fields.year || '0', 10) || 0;

const VENUE_MAP: [RegExp, string][] = [
  [/learning representations/i, 'ICLR'],
  [/international conference on machine learning/i, 'ICML'],
  [/empirical methods in natural language processing/i, 'EMNLP'],
  [/neural information processing systems/i, 'NeurIPS'],
  [/aaai conference on artificial intelligence/i, 'AAAI'],
];

const venueOf = (p: Pub): string => {
  const f = p.fields;
  const rawVenue =
    p.type === 'inproceedings'
      ? f.booktitle
      : p.type === 'article'
      ? f.journal
      : f.howpublished;
  const v = clean(rawVenue || '');
  if (!v) {
    if (/arxiv/i.test(f.archiveprefix || '') || f.eprint) return 'arXiv preprint';
    return 'Preprint';
  }
  if (/arxiv/i.test(v)) return 'arXiv preprint';
  for (const [re, short] of VENUE_MAP) if (re.test(v)) return short;
  return v;
};

const linkLabel = (url: string): string =>
  /arxiv/i.test(url) ? 'arXiv' : /openreview/i.test(url) ? 'OpenReview' : 'link';

// "Last, First and Foo, Bar and others" -> highlighted "First Last, Bar Foo, et al."
const authorsHtml = (raw: string): string =>
  clean(raw)
    .split(/\s+and\s+/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => {
      if (/^others$/i.test(a)) return '<i>et al.</i>';
      let name = a;
      if (a.includes(',')) {
        const [last, ...rest] = a.split(',');
        name = `${rest.join(',').trim()} ${last.trim()}`.trim();
      }
      return name.toLowerCase() === SELF
        ? `<b style="color:${HL}">${esc(name)}</b>`
        : esc(name);
    })
    .join(', ');

export const getPublications = async (): Promise<string> => {
  const all = await load();
  const sel = all
    .filter((p) => yearOf(p) >= SELECTED_SINCE)
    .sort((a, b) => yearOf(b) - yearOf(a));
  if (!sel.length) return 'No publications listed yet — check back soon!';
  const items = sel.map((p) => {
    const url = clean(p.fields.url || '');
    const linkHtml = url ? '   ' + link(linkLabel(url), url) : '';
    const vy = [venueOf(p), clean(p.fields.year || '')].filter(Boolean).join(' ');
    return (
      `<span style="color:${TAG}">[${esc(p.key)}]</span> <b>${esc(
        clean(p.fields.title),
      )}</b>\n` +
      `   <span style="color:${MUTED}">${authorsHtml(p.fields.author || '')}${
        vy ? ` — ${esc(vy)}` : ''
      }</span>${linkHtml}`
    );
  });
  const scholar = config.google_scholar
    ? `\n\nOlder work is still here — '<b>cite &lt;id&gt;</b>' it, or see the ${link(
        'full list on Google Scholar',
        config.google_scholar,
      )}.`
    : '';
  return `<b style="color:${TAG}">Selected publications</b>  (type '<b>cite &lt;id&gt;</b>' for BibTeX)\n\n${items.join(
    '\n\n',
  )}${scholar}\n`;
};

export const getCitation = async (idArg?: string): Promise<string> => {
  const all = await load();
  if (!all.length) return 'No publications available right now.';
  if (!idArg) {
    const ids = all
      .map((p) => `<span style="color:${TAG}">${esc(p.key)}</span>`)
      .join(', ');
    return `Usage: cite <id>   (or 'cite all')\nAvailable: ${ids}`;
  }
  const wanted =
    idArg.toLowerCase() === 'all'
      ? all
      : all.filter((p) => p.key.toLowerCase() === idArg.toLowerCase());
  if (!wanted.length) {
    return `No publication with id '${esc(
      idArg,
    )}'. Type 'publications' to see the list (or 'cite' for all ids).`;
  }
  return wanted.map((p) => esc(p.raw)).join('\n\n');
};
