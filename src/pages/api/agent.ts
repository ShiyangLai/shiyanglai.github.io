import type { NextApiRequest, NextApiResponse } from 'next';
import siteConfig from '../../../config.json';

// "Digital double" chat endpoint (Node serverless). Streams OpenAI tokens to the
// client via res.write; if the platform buffers, it degrades gracefully to a
// single delivery. Key stays server-side; persona comes from a GitHub-hosted
// persona.md. Cost/abuse controls: per-IP daily cap, global daily cap, and a
// hard USD budget kill-switch driven by real token spend (all KV-backed).
//
// SECRET MODE: if the latest user message equals AGENT_SECRET_PHRASE, the client
// is told to "unlock". Once unlocked it sends { secret:true, key:<phrase> } and
// the endpoint switches to a separate API key, a stronger model, a vanilla
// (default) persona, a separate $30 budget, and no per-IP cap. The interface
// language is handled client-side; replies default to Chinese via the persona.

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// --- public agent config ---
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini';
const PER_IP_DAILY = 10;
const GLOBAL_DAILY = 500;
const MAX_TOKENS = 400;
const BUDGET_USD = parseFloat(process.env.AGENT_BUDGET_USD || '5');
const PRICE_IN = parseFloat(process.env.AGENT_PRICE_IN_PER_1M || '0.15');
const PRICE_OUT = parseFloat(process.env.AGENT_PRICE_OUT_PER_1M || '0.60');

// --- secret-mode config (owner-only; gated by a passphrase) ---
const SECRET_PHRASE = process.env.AGENT_SECRET_PHRASE || '';
const SECRET_KEY =
  process.env.OPENAI_API_KEY_SECRET || process.env.AGENT_SECRET_OPENAI_KEY || '';
const SECRET_MODEL = process.env.AGENT_SECRET_MODEL || 'gpt-5.5';
const SECRET_BUDGET_USD = parseFloat(process.env.AGENT_SECRET_BUDGET_USD || '30');
const SECRET_MAX_TOKENS = parseInt(process.env.AGENT_SECRET_MAX_TOKENS || '1200', 10);
// GPT-5.5 prices are unknown to this code — set these env vars to the real
// per-1M-token prices. Defaults are deliberately high so the $30 kill-switch
// trips conservatively (early) rather than overspending if left unset.
const SECRET_PRICE_IN = parseFloat(process.env.AGENT_SECRET_PRICE_IN_PER_1M || '2.5');
const SECRET_PRICE_OUT = parseFloat(process.env.AGENT_SECRET_PRICE_OUT_PER_1M || '20');
const SECRET_PERSONA =
  process.env.AGENT_SECRET_PERSONA ||
  '你是一个聪明、严谨、乐于助人的 AI 助手。请默认用简体中文回答；如果用户使用其他语言，就用对应语言回答。回答要准确、清晰、有条理。';

const CONTACT = siteConfig.email;
const mailto = `<u><a href="mailto:${CONTACT}" style="color:#568bbf" target="_blank">${CONTACT}</a></u>`;
const BUDGET_MESSAGE = `Ah — my agent just ran out of budget. Turns out running an AI clone of a broke PhD student isn't free...
If you'd like to keep the conversation going, email the real me: ${mailto}
And if you're hiring a research intern, I'm genuinely interested — please reach out! (Land me a well-paid gig and I promise to top up the budget so my digital twin can ramble on for hours.)`;

// Shown (in Chinese) when the secret passphrase is accepted.
const SECRET_WELCOME = `<b>已进入秘密模式。</b>现在由更强的模型驱动，使用独立的预算。问我任何问题吧 —— 输入 <b>exit</b>（或 <b>退出</b>）离开。`;
const SECRET_BUDGET_MESSAGE = `秘密模式的预算已用完。请到 OpenAI 后台查看用量，或调整服务器上的 AGENT_SECRET_BUDGET_USD。`;

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

function clientIp(req: NextApiRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd || '';
  return raw.split(',')[0].trim() || 'unknown';
}

async function overBudget(spendKey: string, limit: number): Promise<boolean> {
  const res = await kv([['GET', spendKey]]);
  if (!res) return false;
  const spent = parseFloat(String(res[0]?.result ?? '0')) || 0;
  return spent >= limit;
}

async function addSpend(
  spendKey: string,
  priceIn: number,
  priceOut: number,
  promptTokens: number,
  completionTokens: number,
) {
  const cost = (promptTokens * priceIn + completionTokens * priceOut) / 1e6;
  if (cost > 0) await kv([['INCRBYFLOAT', spendKey, cost]]);
}

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Method not allowed.' });
  }

  const wantsSecret = req.body?.secret === true;
  const providedKey =
    typeof req.body?.key === 'string' ? req.body.key : '';
  const incoming: Msg[] = Array.isArray(req.body?.messages)
    ? req.body.messages
    : [];

  // Secret-mode unlock probe: if a NON-secret request's latest user message is
  // exactly the passphrase, tell the client to unlock. Free — no model call,
  // no rate-limit/budget impact. (Validated server-side; phrase never shipped.)
  if (!wantsSecret && SECRET_PHRASE) {
    const lastUser = [...incoming]
      .reverse()
      .find((m) => m && m.role === 'user' && typeof m.content === 'string');
    if (lastUser && String(lastUser.content).trim() === SECRET_PHRASE) {
      return res
        .status(200)
        .json({ unlocked: true, system: true, reply: SECRET_WELCOME });
    }
  }

  const secret = wantsSecret && !!SECRET_PHRASE && providedKey === SECRET_PHRASE;

  const apiKey = secret ? SECRET_KEY : OPENAI_KEY;
  if (!apiKey) {
    return res.status(200).json({
      reply: secret
        ? '秘密模式尚未配置：服务器需要设置 OPENAI_API_KEY_SECRET。'
        : "The agent isn't switched on yet — the site owner needs to set OPENAI_API_KEY on the server.",
      system: true,
    });
  }

  const spendKey = secret ? 'agent:spend:secret' : 'agent:spend';
  const budgetLimit = secret ? SECRET_BUDGET_USD : BUDGET_USD;
  const priceIn = secret ? SECRET_PRICE_IN : PRICE_IN;
  const priceOut = secret ? SECRET_PRICE_OUT : PRICE_OUT;
  const model = secret ? SECRET_MODEL : MODEL;
  const maxTokens = secret ? SECRET_MAX_TOKENS : MAX_TOKENS;

  if (await overBudget(spendKey, budgetLimit)) {
    return res
      .status(200)
      .json({ reply: secret ? SECRET_BUDGET_MESSAGE : BUDGET_MESSAGE, system: true });
  }

  // Public agent is rate-limited; secret mode (passphrase-authed owner) is not.
  if (!secret) {
    const limit = await rateLimited(req);
    if (limit) return res.status(200).json({ reply: limit, system: true });
  }

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
    return res.status(200).json({
      reply: secret ? '说点什么开始吧。' : 'Say something to get started.',
      system: true,
    });
  }

  const persona = secret ? SECRET_PERSONA : await getPersona();

  // GPT-5-family models use max_completion_tokens and only the default
  // temperature; the gpt-4o-mini public agent uses max_tokens + temperature.
  const reqBody: Record<string, unknown> = {
    model,
    messages: [{ role: 'system', content: persona }, ...history],
    stream: true,
    stream_options: { include_usage: true },
  };
  if (secret) {
    reqBody.max_completion_tokens = maxTokens;
  } else {
    reqBody.max_tokens = maxTokens;
    reqBody.temperature = 0.85;
  }

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reqBody),
  });
  if (!aiRes.ok || !aiRes.body) {
    return res.status(200).json({
      reply: secret
        ? '助手暂时无法响应，请稍后再试。'
        : 'The agent had trouble responding just now. Please try again in a moment.',
      system: true,
    });
  }

  // Stream tokens to the client as plain text (degrades to one delivery if
  // the platform buffers).
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200);
  const anyRes = res as unknown as { flushHeaders?: () => void };
  if (typeof anyRes.flushHeaders === 'function') anyRes.flushHeaders();

  const reader = (
    aiRes.body as unknown as ReadableStream<Uint8Array>
  ).getReader();
  const decoder = new TextDecoder();
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
          if (delta) res.write(delta);
          if (j.usage) usage = j.usage;
        } catch (e) {
          // ignore keep-alive / non-JSON lines
        }
      }
    }
  } catch (e) {
    // stream interrupted — end gracefully
  }
  if (usage) {
    await addSpend(
      spendKey,
      priceIn,
      priceOut,
      Number(usage.prompt_tokens || 0),
      Number(usage.completion_tokens || 0),
    );
  }
  res.end();
}
