// A tiny virtual filesystem backing the `ls`, `cd`, `cat` and `pwd` commands,
// so visitors can browse projects like a real shell:
//
//   ~ $ ls                 ->  ongoing/   finished/
//   ~ $ cd ongoing
//   ~/ongoing $ ls         ->  <project-id>/  ...
//   ~/ongoing $ cd <id>
//   ~/ongoing/<id> $ ls    ->  readme   link
//   ~/ongoing/<id> $ cat readme
//
// Project data is sourced at runtime from a GitHub-hosted projects.md
// (config.projectsUrl) of `status | id | name | description | optional-url`
// lines. `cwd` is module-level state that persists across commands.

import axios from 'axios';
import config from '../../config.json';
import { TAG, renderMarkup, link } from './format';
import { isAgentActive } from './agentSession';

type Proj = {
  id: string;
  name: string;
  desc: string;
  url: string;
  done: boolean;
};

const DONE_WORDS = ['done', 'finished', 'complete', 'completed'];

let projects: Proj[] | null = null; // cached after first load
let cwd: string[] = []; // path segments under ~
let promptSnapshotValue = '~'; // cwd captured at command submission

const parse = (data: string): Proj[] =>
  String(data)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((line) => {
      const [status, id, name, desc, url] = line.split('|').map((s) => s.trim());
      return {
        id: id ?? '',
        name: name ?? '',
        desc: desc ?? '',
        url: url ?? '',
        done: DONE_WORDS.includes((status ?? '').toLowerCase()),
      };
    })
    .filter((p) => p.id);

const load = async (): Promise<Proj[]> => {
  if (projects) return projects;
  try {
    const { data } = await axios.get(config.projectsUrl);
    projects = parse(data);
  } catch (error) {
    projects = [];
  }
  return projects;
};

const filesOf = (p: Proj): string[] => ['readme', ...(p.url ? ['link'] : [])];

type Node =
  | { type: 'root' }
  | { type: 'group'; done: boolean }
  | { type: 'project'; proj: Proj }
  | { type: 'file'; proj: Proj; file: string }
  | { type: 'none' };

// Resolve an absolute path (segments under ~) to a filesystem node.
const resolve = async (path: string[]): Promise<Node> => {
  const ps = await load();
  if (path.length === 0) return { type: 'root' };
  if (path[0] !== 'ongoing' && path[0] !== 'finished') return { type: 'none' };
  const done = path[0] === 'finished';
  if (path.length === 1) return { type: 'group', done };
  const proj = ps.find((p) => p.done === done && p.id === path[1]);
  if (!proj) return { type: 'none' };
  if (path.length === 2) return { type: 'project', proj };
  if (path.length === 3 && filesOf(proj).includes(path[2])) {
    return { type: 'file', proj, file: path[2] };
  }
  return { type: 'none' };
};

// Resolve a (possibly relative) path argument against the current directory.
const resolveRelative = (arg: string): string[] => {
  const base = arg.startsWith('/') || arg.startsWith('~') ? [] : [...cwd];
  for (const seg of arg.split('/')) {
    if (seg === '' || seg === '.' || seg === '~') continue;
    if (seg === '..') base.pop();
    else base.push(seg);
  }
  return base;
};

const dir = (name: string): string => `<b style="color:${TAG}">${name}/</b>`;

export const cwdString = (): string =>
  '~' + (cwd.length ? '/' + cwd.join('/') : '');

// Prompt label: the chat indicator when the agent is active, else the cwd.
export const promptPath = (): string =>
  isAgentActive() ? 'chat' : cwdString();

export const snapshotPrompt = (): void => {
  promptSnapshotValue = promptPath();
};

export const getPromptSnapshot = (): string => promptSnapshotValue;

const listAt = async (path: string[], label: string): Promise<string> => {
  const node = await resolve(path);
  switch (node.type) {
    case 'root':
      return [dir('ongoing'), dir('finished')].join('   ');
    case 'group': {
      const ps = await load();
      const ids = ps.filter((p) => p.done === node.done).map((p) => dir(p.id));
      return ids.length ? ids.join('   ') : '(empty)';
    }
    case 'project':
      return filesOf(node.proj).join('   ');
    case 'file':
      return node.file;
    default:
      return `ls: cannot access '${label}': No such file or directory`;
  }
};

export const lsCmd = async (args: string[]): Promise<string> =>
  args[0] ? listAt(resolveRelative(args[0]), args[0]) : listAt(cwd, '.');

export const cdCmd = async (args: string[]): Promise<string> => {
  const arg = args[0];
  const path = !arg || arg === '~' || arg === '/' ? [] : resolveRelative(arg);
  const node = await resolve(path);
  if (node.type === 'none') return `cd: no such file or directory: ${arg}`;
  if (node.type === 'file') return `cd: not a directory: ${arg}`;
  cwd = path;
  return '';
};

export const catCmd = async (args: string[]): Promise<string> => {
  const arg = args[0];
  if (!arg) return 'usage: cat <file>';
  const node = await resolve(resolveRelative(arg));
  if (node.type === 'none') return `cat: ${arg}: No such file or directory`;
  if (node.type !== 'file') return `cat: ${arg}: Is a directory`;
  if (node.file === 'readme') {
    return `<b style="color:${TAG}">${node.proj.name}</b>\n\n${renderMarkup(
      node.proj.desc,
    )}\n`;
  }
  return `${link(node.proj.url, node.proj.url)}\n`;
};

export const pwdCmd = async (): Promise<string> => cwdString();

// Tab-completion candidates for a (possibly relative) path argument. Returns
// matching child names (directories keep their trailing '/') with the typed
// directory prefix preserved, e.g. complete('ongoing/s') -> ['ongoing/site/'].
export const complete = async (arg: string): Promise<string[]> => {
  await load();
  const slash = arg.lastIndexOf('/');
  const dirPart = slash >= 0 ? arg.slice(0, slash + 1) : '';
  const partial = slash >= 0 ? arg.slice(slash + 1) : arg;
  const node = await resolve(dirPart ? resolveRelative(dirPart) : [...cwd]);
  let names: string[] = [];
  if (node.type === 'root') {
    names = ['ongoing/', 'finished/'];
  } else if (node.type === 'group') {
    const ps = await load();
    names = ps.filter((p) => p.done === node.done).map((p) => `${p.id}/`);
  } else if (node.type === 'project') {
    names = filesOf(node.proj);
  }
  return names.filter((n) => n.startsWith(partial)).map((n) => dirPart + n);
};
