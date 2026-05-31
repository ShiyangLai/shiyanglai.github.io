import type { NextApiRequest, NextApiResponse } from 'next';

// Guestbook backend (Node serverless), shown under the `map`/`guestbook`
// commands. Stores a capped list of short notes in Vercel/Upstash KV. Keeps
// only name + message + coarse country code — never raw IPs (IPs are used
// transiently for rate-limit keys only). Degrades gracefully if KV isn't set.

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const LIST_KEY = 'guestbook:entries';
const MAX_STORED = 200; // cap the stored list
const MAX_RETURN = 30; // newest N returned to the client
const NAME_MAX = 40;
const MSG_MAX = 280;
const PER_IP_DAILY = 5;
const GLOBAL_DAILY = 200;
const COOLDOWN_SEC = 15; // min seconds between notes from one IP

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

const first = (v?: string | string[]): string | undefined =>
  Array.isArray(v) ? v[0] : v;

function clientIp(req: NextApiRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd || '';
  return raw.split(',')[0].trim() || 'unknown';
}

// Replace control chars with spaces, collapse whitespace, clamp length.
// (Uses char codes to avoid embedding literal control bytes in source.)
// The rendering side renders these as React text nodes, so no markup injection.
const sanitize = (s: unknown, max: number): string =>
  Array.from(String(s ?? ''))
    .map((ch) =>
      ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? ' ' : ch,
    )
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

type Entry = { name: string; msg: string; country: string; at: number };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader('Cache-Control', 'no-store');

  if (!REST_URL || !REST_TOKEN) {
    if (req.method === 'POST') {
      return res
        .status(200)
        .json({ ok: false, configured: false, error: 'Guestbook storage is not set up yet.' });
    }
    return res.status(200).json({ entries: [], configured: false });
  }

  try {
    if (req.method === 'POST') {
      const name = sanitize(req.body?.name, NAME_MAX) || 'anonymous';
      const msg = sanitize(req.body?.msg, MSG_MAX);
      if (!msg) {
        return res
          .status(200)
          .json({ ok: false, error: 'Write a little something first :)' });
      }

      const day = new Date().toISOString().slice(0, 10);
      const ip = clientIp(req);
      const coolKey = `guestbook:cool:${ip}`;
      const ipKey = `guestbook:rl:${ip}:${day}`;
      const globalKey = `guestbook:rl:global:${day}`;
      const rl = await kv([
        ['INCR', coolKey],
        ['EXPIRE', coolKey, COOLDOWN_SEC],
        ['INCR', ipKey],
        ['EXPIRE', ipKey, 86400],
        ['INCR', globalKey],
        ['EXPIRE', globalKey, 86400],
      ]);
      if (rl) {
        const cool = Number(rl[0]?.result || 0);
        const ipCount = Number(rl[2]?.result || 0);
        const globalCount = Number(rl[4]?.result || 0);
        if (cool > 1) {
          return res
            .status(200)
            .json({ ok: false, error: 'Easy there — give it a few seconds between notes.' });
        }
        if (ipCount > PER_IP_DAILY) {
          return res
            .status(200)
            .json({ ok: false, error: `That's ${PER_IP_DAILY} notes today — thank you! Come back tomorrow.` });
        }
        if (globalCount > GLOBAL_DAILY) {
          return res
            .status(200)
            .json({ ok: false, error: 'The guestbook is napping after a busy day. Try again tomorrow!' });
        }
      }

      const country = (first(req.headers['x-vercel-ip-country']) || '')
        .toUpperCase()
        .slice(0, 2);
      const entry: Entry = { name, msg, country, at: Date.now() };
      await kv([
        ['LPUSH', LIST_KEY, JSON.stringify(entry)],
        ['LTRIM', LIST_KEY, 0, MAX_STORED - 1],
      ]);
      return res.status(200).json({ ok: true, entry });
    }

    // GET — newest first
    const r = await kv([['LRANGE', LIST_KEY, 0, MAX_RETURN - 1]]);
    const raw = r && Array.isArray(r[0]?.result) ? (r[0]!.result as string[]) : [];
    const entries: Entry[] = raw
      .map((s) => {
        try {
          return JSON.parse(s) as Entry;
        } catch (e) {
          return null;
        }
      })
      .filter((e): e is Entry => !!e && typeof e.msg === 'string');
    return res.status(200).json({ entries, configured: true });
  } catch (err) {
    if (req.method === 'POST') {
      return res
        .status(200)
        .json({ ok: false, error: 'Could not save just now — try again in a moment.' });
    }
    return res
      .status(200)
      .json({ entries: [], configured: false, error: String(err) });
  }
}
