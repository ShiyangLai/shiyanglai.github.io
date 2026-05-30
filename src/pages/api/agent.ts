import siteConfig from '../../../config.json';

// Edge runtime so we can stream OpenAI tokens straight to the browser.
export const config = { runtime: 'experimental-edge' };

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini';

// --- cost / abuse knobs (override via env) ---------------------------------
const PER_IP_DAILY = 10;
const GLOBAL_DAILY = 500;
const MAX_TOKENS = 400;
const BUDGET_USD = parseFloat(process.env.AGENT_BUDGET_USD || '5');
const PRICE_IN = parseFloat(process.env.AGENT_PRICE_IN_PER_1M || '0.15');
const PRICE_OUT = parseFloat(process.env.AGENT_PRICE_OUT_PER_1M || '0.60');

const CONTACT = siteConfig.email;
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
    const r = await fetch(siteConfig.personaUrl);
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

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim() || 'unknown';
}

async function overBudget(): Promise<boolean> {
  const res = await kv([['GET', 'agent:spend']]);
  if (!res) return false;
  const spent = parseFloat(String(res[0]?.result ?? '0')) || 0;
  return spent >= BUDGET_USD;
}

async function addSpend(promptTokens: number, completionTokens: number) {
  const cost = (promptTokens * PRICE_IN + completionTokens * PRICE_OUT) / 1e6;
  if (cost > 0) await kv([['INCRBYFLOAT', 'agent:spend', cost]]);
}

async function rateLimited(req: Request): Promise<string | null> {
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = `agent:rl:${clientIp(req)}:${day}`;
  const globalKey = `agent:rl:global:${day}`;
  const res = await kv([
    ['INCR', ipKey],
    ['EXPIRE', ipKey, 86400],
    ['INCR', globalKey],
    ['EXPIRE', globalKey, 86400],
  ]);
  if (!res) return null;
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

const json = (obj: unknown): Response =>
  new Response(JSON.stringify(obj), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!OPENAI_KEY) {
    return json({
      reply:
        "The agent isn't switched on yet — the site owner needs to set OPENAI_API_KEY on the server.",
      system: true,
    });
  }

  // Budget kill-switch takes precedence over everything.
  if (await overBudget()) return json({ reply: BUDGET_MESSAGE, system: true });

  const limit = await rateLimited(req);
  if (limit) return json({ reply: limit, system: true });

  let body: { messages?: Msg[] } = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }
  const incoming: Msg[] = Array.isArray(body?.messages) ? body.messages : [];
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
    return json({ reply: 'Say something to get started.', system: true });
  }

  const persona = await getPersona();
  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: persona }, ...history],
      max_tokens: MAX_TOKENS,
      temperature: 0.85,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!aiRes.ok || !aiRes.body) {
    return json({
      reply:
        'The agent had trouble responding just now. Please try again in a moment.',
      system: true,
    });
  }

  // Transform OpenAI's SSE stream into a plain-text token stream for the client,
  // capturing token usage from the final chunk to bill against the budget.
  const reader = aiRes.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      let usage: { prompt_tokens?: number; completion_tokens?: number } | null =
        null;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const payload = t.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const j = JSON.parse(payload);
              const delta = j.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
              if (j.usage) usage = j.usage;
            } catch (e) {
              // ignore non-JSON keep-alive lines
            }
          }
        }
      } catch (e) {
        // stream interrupted — close gracefully
      }
      if (usage) {
        await addSpend(
          Number(usage.prompt_tokens || 0),
          Number(usage.completion_tokens || 0),
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
