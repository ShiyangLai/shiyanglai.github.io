// Client-side state for the `agent` chat mode: whether it's active, the running
// conversation (persisted in sessionStorage so it survives exit/re-enter within
// the tab), and a streaming reader that updates the terminal token-by-token.

import config from '../../config.json';
import { TAG } from './format';

const LABEL = `${config.name.split(' ')[0].toLowerCase()}-ai`; // e.g. "shiyang-ai"
const STORE_KEY = 'agent-convo';

type Msg = { role: 'user' | 'assistant'; content: string };

let active = false;
let messages: Msg[] = [];

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

export const isAgentActive = (): boolean => active;

export const enterAgent = (): string => {
  active = true;
  messages = loadStore(); // resume the conversation within this browser session
  const resumed = messages.length > 0 ? ' (picking up where we left off)' : '';
  return `<b style="color:${TAG}">agent activated</b>${resumed} — you're chatting with an AI imitation of ${config.name} (not the real person).
Ask away. Type <b style="color:${TAG}">exit</b> to leave, or <b style="color:${TAG}">reset</b> to start fresh.`;
};

export const exitAgent = (): void => {
  active = false; // keep messages persisted so re-entering resumes
};

export const resetAgent = (): void => {
  messages = [];
  saveStore();
};

// LLM output is rendered via dangerouslySetInnerHTML, so escape it. Server-sent
// "system" messages (budget/limit/disclaimer) are trusted HTML (e.g. a mailto).
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = (body: string): string =>
  `<b style="color:${TAG}">${LABEL}</b>  ${body}`;
const CURSOR = '<span style="opacity:0.55">▌</span>';

// Streams the reply, calling onUpdate(html) repeatedly as tokens arrive.
export const streamAgent = async (
  text: string,
  onUpdate: (html: string) => void,
): Promise<void> => {
  messages.push({ role: 'user', content: text });
  saveStore();
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.slice(-10) }),
    });

    const ct = res.headers.get('content-type') || '';
    // System notices (budget / rate-limit / not-configured) come back as JSON.
    if (!res.body || ct.includes('application/json')) {
      const data = await res.json().catch(() => ({ reply: 'No response.' }));
      const reply = typeof data.reply === 'string' ? data.reply : 'No response.';
      onUpdate(wrap(data && data.system ? reply : esc(reply)));
      if (data && !data.system) {
        messages.push({ role: 'assistant', content: reply });
      } else {
        messages.pop(); // don't keep the un-answered user turn
      }
      saveStore();
      return;
    }

    // Streamed plain-text tokens.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    onUpdate(wrap(CURSOR));
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      onUpdate(wrap(esc(full) + CURSOR));
    }
    onUpdate(wrap(esc(full) || '(no response)'));
    messages.push({ role: 'assistant', content: full });
    if (messages.length > 24) messages = messages.slice(-24);
    saveStore();
  } catch (e) {
    messages.pop();
    saveStore();
    onUpdate(
      wrap("(couldn't reach the agent — check your connection and try again.)"),
    );
  }
};
