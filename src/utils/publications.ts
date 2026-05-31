// Backs the `publications` (list) and `cite <id>` (BibTeX) commands. Reads a
// GitHub-hosted publications.md (config.publicationsUrl) of
// `id | title | authors | venue | year | optional-url` lines.

import axios from 'axios';
import config from '../../config.json';
import { TAG, link } from './format';

const MUTED = '#627e99';

export type Pub = {
  id: string;
  title: string;
  authors: string;
  venue: string;
  year: string;
  url: string;
};

let cache: Pub[] | null = null;

const parse = (data: string): Pub[] =>
  String(data)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((line) => {
      const [id, title, authors, venue, year, url] = line
        .split('|')
        .map((s) => s.trim());
      return {
        id: id ?? '',
        title: title ?? '',
        authors: authors ?? '',
        venue: venue ?? '',
        year: year ?? '',
        url: url ?? '',
      };
    })
    .filter((p) => p.id && p.title);

const load = async (): Promise<Pub[]> => {
  if (cache) return cache;
  try {
    const { data } = await axios.get(config.publicationsUrl);
    cache = parse(data);
  } catch (e) {
    cache = [];
  }
  return cache;
};

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const getPublications = async (): Promise<string> => {
  const pubs = await load();
  if (!pubs.length) return 'No publications listed yet — check back soon!';
  const items = pubs.map((p) => {
    const label = /arxiv/i.test(p.url) ? 'arXiv' : 'link';
    const linkHtml = p.url ? '   ' + link(label, p.url) : '';
    const venueYear = [p.venue, p.year].filter(Boolean).join(' ');
    return (
      `<span style="color:${TAG}">[${esc(p.id)}]</span> <b>${esc(p.title)}</b>\n` +
      `   <span style="color:${MUTED}">${esc(p.authors)}${
        venueYear ? ` — ${esc(venueYear)}` : ''
      }</span>${linkHtml}`
    );
  });
  return `<b style="color:${TAG}">Publications</b>  (type '<b>cite &lt;id&gt;</b>' for BibTeX)\n\n${items.join(
    '\n\n',
  )}\n`;
};

const bibtex = (p: Pub): string => {
  const preprint = /arxiv|preprint|working paper|under review|submitted/i.test(
    p.venue,
  );
  const type = preprint ? 'misc' : 'inproceedings';
  const authors = p.authors
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .join(' and ');
  const lines = [
    `@${type}{${p.id},`,
    `  title        = {${p.title}},`,
    authors ? `  author       = {${authors}},` : '',
    p.venue
      ? preprint
        ? `  howpublished = {${p.venue}},`
        : `  booktitle    = {${p.venue}},`
      : '',
    p.year ? `  year         = {${p.year}},` : '',
    p.url ? `  url          = {${p.url}},` : '',
    `}`,
  ].filter(Boolean);
  return esc(lines.join('\n'));
};

export const getCitation = async (idArg?: string): Promise<string> => {
  const pubs = await load();
  if (!pubs.length) return 'No publications available right now.';
  const ids = pubs
    .map((p) => `<span style="color:${TAG}">${esc(p.id)}</span>`)
    .join(', ');
  if (!idArg) {
    return `Usage: cite <id>   (or 'cite all')\nAvailable: ${ids}`;
  }
  const wanted =
    idArg.toLowerCase() === 'all'
      ? pubs
      : pubs.filter((p) => p.id.toLowerCase() === idArg.toLowerCase());
  if (!wanted.length) {
    return `No publication with id '${esc(idArg)}'. Type 'publications' to see the list.`;
  }
  return wanted.map(bibtex).join('\n\n');
};
