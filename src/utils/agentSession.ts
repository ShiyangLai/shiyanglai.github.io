// Client-side state for the `agent` chat mode. Holds whether the agent is
// active and the running conversation, and talks to /api/agent. The shell
// routes input here while active (see shell.ts).

import config from '../../config.json';
import { TAG } from './format';

const LABEL = `${config.name.split(' ')[0].toLowerCase()}-ai`; // e.g. "shiyang-ai"

type Msg = { role: 'user' | 'assistant'; content: string };

let active = false;
let messages: Msg[] = [];

export const isAgentActive = (): boolean => active;

export const enterAgent = (): string => {
  active = true;
  messages = [];
  return `<b style="color:${TAG}">agent activated</b> — you're chatting with an AI imitation of ${config.name} (not the real person).
Ask about his research, projects, or background. Type <b style="color:${TAG}">exit</b> to leave.`;
};

export const exitAgent = (): void => {
  active = false;
  messages = [];
};

// LLM output is rendered via dangerouslySetInnerHTML, so escape it. Server-sent
// "system" messages (budget/limit/disclaimer) are trusted and may contain HTML
// (e.g. a mailto link), so they are rendered as-is.
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const wrap = (body: string): string =>
  `<b style="color:${TAG}">${LABEL}</b>  ${body}`;

export const handleAgentInput = async (text: string): Promise<string> => {
  messages.push({ role: 'user', content: text });
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.slice(-10) }),
    });
    const data = await res.json();
    const reply =
      data && typeof data.reply === 'string' ? data.reply : 'No response.';
    if (data && data.system) {
      // budget / rate-limit / not-configured notice — trusted HTML, not a turn
      return wrap(reply);
    }
    messages.push({ role: 'assistant', content: reply });
    if (messages.length > 20) messages = messages.slice(-20);
    return wrap(esc(reply));
  } catch (e) {
    messages.pop(); // drop the unanswered user turn
    return wrap("(couldn't reach the agent — check your connection and try again.)");
  }
};
