// Client-side state for the `agent` chat mode: whether it's active, the running
// conversation (persisted in sessionStorage so it survives exit/re-enter within
// the tab), and a streaming reader that updates the terminal token-by-token.
//
// SECRET MODE: typing the secret passphrase while in agent mode unlocks a
// private mode (validated server-side). It uses a separate key/model/budget and
// switches the interface to Chinese. Secret state + its conversation are kept in
// memory only — gone on reload or `exit`; the normal conversation is untouched.

import config from '../../config.json';
import { TAG } from './format';

const LABEL = `${config.name.split(' ')[0].toLowerCase()}-ai`; // e.g. "shiyang-ai"
const STORE_KEY = 'agent-convo';

// Sentinel stored in a history entry's ps1 so <History> renders it as a chat
// turn ("you ›" instead of the shell prompt).
export const AGENT_TURN = ' agent-turn';

type Msg = { role: 'user' | 'assistant'; content: string };

let active = false;
let secret = false;
let secretKey = '';
let messages: Msg[] = []; // normal conversation (persisted)
let secretMessages: Msg[] = []; // secret conversation (memory only)

// The conversation currently in play, and a persist that's a no-op in secret
// mode (so the private chat never touches storage).
const convo = (): Msg[] => (secret ? secretMessages : messages);

const loadStore = (): Msg[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.sessionStorage.getItem(STORE_KEY) || '[]');
  } catch (e) {
    return [];
  }
};
const saveStore = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-24)));
  } catch (e) {
    // ignore (private mode / quota)
  }
};
const persist = (): void => {
  if (!secret) saveStore();
};

export const isAgentActive = (): boolean => active;
export const isSecret = (): boolean => secret;

export const enterAgent = (): string => {
  active = true;
  secret = false; // always start in the normal (public) agent
  messages = loadStore(); // resume the conversation within this browser session
  const resumed = messages.length > 0 ? ' (picking up where we left off)' : '';
  return `<b style="color:${TAG}">agent activated</b>${resumed} — you're chatting with an AI imitation of ${config.name} (not the real person).
Ask away. Type <b style="color:${TAG}">exit</b> to leave, or <b style="color:${TAG}">reset</b> to start fresh.`;
};

export const exitAgent = (): void => {
  active = false; // keep normal messages persisted so re-entering resumes
  secret = false; // leaving agent always drops out of (and forgets) secret mode
  secretMessages = [];
  secretKey = '';
};

export const resetAgent = (): void => {
  if (secret) {
    secretMessages = [];
  } else {
    messages = [];
    saveStore();
  }
};

const unlockSecret = (key: string): void => {
  secret = true;
  secretKey = key;
  secretMessages = []; // fresh, private conversation
};

// --- localized bits (English in the public agent, Chinese in secret mode) ---
const labelName = (): string => (secret ? '助手' : LABEL);
export const youLabel = (): string => (secret ? '你' : 'you');
export const thinkingHtml = (): string =>
  secret
    ? '<span style="color:#807c75">思考中…</span>'
    : '<span style="color:#807c75">thinking…</span>';
const SECRET_WELCOME_FALLBACK = '<b>已进入秘密模式。</b>问我任何问题吧。';

// LLM output is rendered via dangerouslySetInnerHTML, so escape it. Server-sent
// "system" messages (budget/limit/disclaimer) are trusted HTML (e.g. a mailto).
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Minimal, safe markdown on already-escaped text: **bold**, __bold__, `code`.
const md = (s: string): string =>
  s
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/__(.+?)__/g, '<b>$1</b>')
    .replace(
      /`([^`]+)`/g,
      '<code style="background:rgba(127,127,127,0.18);padding:0 3px;border-radius:3px">$1</code>',
    );

// Tidy whitespace from the model (trim, collapse 3+ blank lines to one).
const clean = (s: string): string => s.trim().replace(/\n{3,}/g, '\n\n');

const wrap = (body: string): string =>
  `<b style="color:${TAG}">${labelName()} ›</b>  ${body}`;
const CURSOR = '<span style="opacity:0.55">▌</span>';

// Streams the reply, calling onUpdate(html) repeatedly as tokens arrive.
export const streamAgent = async (
  text: string,
  onUpdate: (html: string) => void,
): Promise<void> => {
  const list = convo();
  list.push({ role: 'user', content: text });
  persist();
  onUpdate(wrap(thinkingHtml()));
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: list.slice(-10), secret, key: secretKey }),
    });

    const ct = res.headers.get('content-type') || '';
    // System notices (budget / rate-limit / not-configured) come back as JSON.
    if (!res.body || ct.includes('application/json')) {
      const data = await res.json().catch(() => ({ reply: 'No response.' }));

      // Secret-mode unlock handshake: drop the passphrase from the visible
      // conversation context and flip into secret mode.
      if (data && data.unlocked && !secret) {
        list.pop();
        persist();
        unlockSecret(text);
        onUpdate(
          wrap(
            typeof data.reply === 'string' ? data.reply : SECRET_WELCOME_FALLBACK,
          ),
        );
        return;
      }

      const reply = typeof data.reply === 'string' ? data.reply : 'No response.';
      onUpdate(wrap(data && data.system ? reply : md(esc(reply))));
      if (data && !data.system) {
        list.push({ role: 'assistant', content: reply });
      } else {
        list.pop(); // don't keep the un-answered user turn
      }
      persist();
      return;
    }

    // Streamed plain-text tokens.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      onUpdate(wrap(md(esc(full)) + CURSOR));
    }
    onUpdate(wrap(md(esc(clean(full))) || '(no response)'));
    list.push({ role: 'assistant', content: full });
    if (list.length > 24) list.splice(0, list.length - 24);
    persist();
  } catch (e) {
    list.pop();
    persist();
    onUpdate(
      wrap(
        secret
          ? '（无法连接到助手 —— 请检查网络后重试。）'
          : "(couldn't reach the agent — check your connection and try again.)",
      ),
    );
  }
};
