import type { NextApiRequest, NextApiResponse } from 'next';
import config from '../../../config.json';

// "Digital double" chat endpoint. Calls OpenAI server-side (key never reaches
// the client), persona from a GitHub-hosted persona.md. Cost/abuse controls:
//   - per-IP daily message cap
//   - global daily cap (safety net)
//   - a hard USD budget kill-switch driven by real token spend
// All counters live in KV; if KV is absent, limits/budget are simply skipped.

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini';

// --- cost / abuse knobs (override via env) ---------------------------------
const PER_IP_DAILY = 10; // messages per IP per day
const GLOBAL_DAILY = 500; // across everyone per day (safety net)
const MAX_TOKENS = 400;
const BUDGET_USD = parseFloat(process.env.AGENT_BUDGET_USD || '5'); // hard cap
// gpt-4o-mini pricing, USD per 1M tokens. Update if you switch models.
const PRICE_IN = parseFloat(process.env.AGENT_PRICE_IN_PER_1M || '0.15');
const PRICE_OUT = parseFloat(process.env.AGENT_PRICE_OUT_PER_1M || '0.60');

const CONTACT = config.email;
const mailto = `<u><a href="mailto:${CONTACT}" style="color:#568bbf" target="_blank">${CONTACT}</a></u>`;

const BUDGET_MESSAGE = `Ah — my agent just ran out of budget. Turns out running an AI clone of a broke PhD student isn't free...
If you'd like to keep the conversation going, email the real me: ${mailto}
And if you're hiring a research intern, I'm genuinely interested — please reach out! (Land me a well-paid gig and I promise to top up the budget so my digital twin can ramble on for hours.)`;

const FALLBACK_PERSONA =
  'You are a friendly AI imitation of the owner of this website. You are not the real person. Answer questions about them concisely, never invent facts, and decline anything harmful.';

let personaCache: { text: string; at: number } | null = null;
async function getPersona(): Promise<string> {
  if (personaCache && Date.now() - personaCache.at < 5 * 60 * 1000) {
    return personaCache.text;
  }
  try {
    const r = await fetch(config.personaUrl);
    if (r.ok) {
      const raw = await r.text();
      const text = raw
        .split('\n')
        .filter((l) => !l.trimStart().startsWith('//'))
        .join('\n')
        .trim();
      personaCache = { text: text || FALLBACK_PERSONA, at: Date.now() };
      return personaCache.text;
    }
  } catch (e) {
    // fall through
  }
  return FALLBACK_PERSONA;
}

type Cmd = (string | number)[];
async function kv(commands: Cmd[]): Promise<Array<{ result: unknown }> | null> {
  if (!REST_URL || !REST_TOKEN) return null;
  try {
    const r = await fetch(`${REST_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });
    if (!r.ok) return null;
    return r.json();
  } catch (e) {
    return null;
  }
}

function clientIp(req: NextApiRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd || '';
  return raw.split(',')[0].trim() || 'unknown';
}

async function overBudget(): Promise<boolean> {
  const res = await kv([['GET', 'agent:spend']]);
  if (!res) return false; // no KV -> can't track -> don't block
  const spent = parseFloat(String(res[0]?.result ?? '0')) || 0;
  return spent >= BUDGET_USD;
}

async function addSpend(promptTokens: number, completionTokens: number) {
  const cost = (promptTokens * PRICE_IN + completionTokens * PRICE_OUT) / 1e6;
  if (cost > 0) await kv([['INCRBYFLOAT', 'agent:spend', cost]]);
}

// Returns a message (HTML allowed) if the request should be blocked, else null.
async function rateLimited(req: NextApiRequest): Promise<string | null> {
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = `agent:rl:${clientIp(req)}:${day}`;
  const globalKey = `agent:rl:global:${day}`;
  const res = await kv([
    ['INCR', ipKey],
    ['EXPIRE', ipKey, 86400],
    ['INCR', globalKey],
    ['EXPIRE', globalKey, 86400],
  ]);
  if (!res) return null; // KV not configured — skip limiting
  const ipCount = Number(res[0]?.result || 0);
  const globalCount = Number(res[2]?.result || 0);
  if (ipCount > PER_IP_DAILY) {
    return `That's your ${PER_IP_DAILY} messages for today! Come back tomorrow — or email the real me to keep chatting: ${mailto}`;
  }
  if (globalCount > GLOBAL_DAILY) {
    return `The agent got popular and is taking a breather for today. Try again tomorrow, or reach me at ${mailto}.`;
  }
  return null;
}

type Msg = { role: 'user' | 'assistant'; content: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Method not allowed.' });
  }
  if (!OPENAI_KEY) {
    return res.status(200).json({
      reply:
        "The agent isn't switched on yet — the site owner needs to set OPENAI_API_KEY on the server.",
      system: true,
      configured: false,
    });
  }

  // Budget kill-switch takes precedence over everything.
  if (await overBudget()) {
    return res.status(200).json({ reply: BUDGET_MESSAGE, system: true, banned: true });
  }

  const limit = await rateLimited(req);
  if (limit) return res.status(200).json({ reply: limit, system: true, limited: true });

  const incoming: Msg[] = Array.isArray(req.body?.messages)
    ? req.body.messages
    : [];
  const history = incoming
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string',
    )
    .slice(-10)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1500) }));
  if (history.length === 0) {
    return res.status(200).json({ reply: 'Say something to get started.', system: true });
  }

  const persona = await getPersona();
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: persona }, ...history],
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
      }),
    });
    if (!r.ok) {
      return res.status(200).json({
        reply:
          'The agent had trouble responding just now. Please try again in a moment.',
        error: r.status,
      });
    }
    const data = await r.json();
    const usage = data?.usage || {};
    await addSpend(
      Number(usage.prompt_tokens || 0),
      Number(usage.completion_tokens || 0),
    );
    const reply =
      data?.choices?.[0]?.message?.content?.trim() || '(no response)';
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(200).json({
      reply: 'The agent is unavailable right now. Please try again later.',
    });
  }
}
