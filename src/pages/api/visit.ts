import type { NextApiRequest, NextApiResponse } from 'next';

// Visitor map backend. Uses Vercel's free geolocation headers and an
// Upstash/Vercel KV store (REST). Stores ONLY coarse, rounded location +
// counts — never raw IPs. Degrades gracefully (empty result) if KV env vars
// are not set, so the site works before the store is provisioned.

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

type Cmd = (string | number)[];

async function pipeline(commands: Cmd[]): Promise<Array<{ result: unknown }>> {
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  return res.json();
}

const first = (v?: string | string[]): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const toMap = (flat: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (Array.isArray(flat)) {
    for (let i = 0; i + 1 < flat.length; i += 2) {
      out[String(flat[i])] = String(flat[i + 1]);
    }
  }
  return out;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader('Cache-Control', 'no-store');

  if (!REST_URL || !REST_TOKEN) {
    return res.status(200).json({ points: [], total: 0, configured: false });
  }

  try {
    if (req.method === 'POST') {
      const lat = parseFloat(first(req.headers['x-vercel-ip-latitude']) || '');
      const lng = parseFloat(first(req.headers['x-vercel-ip-longitude']) || '');
      const city =
        decodeURIComponent(first(req.headers['x-vercel-ip-city']) || '').trim() ||
        'Somewhere';
      const country = (
        first(req.headers['x-vercel-ip-country']) || '??'
      ).toUpperCase();

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const rLat = Math.round(lat); // ~1° buckets (anonymizes within ~111km)
        const rLng = Math.round(lng);
        const bucket = `${rLat}_${rLng}`;
        await pipeline([
          ['HINCRBY', 'visits:count', bucket, 1],
          [
            'HSET',
            'visits:meta',
            bucket,
            JSON.stringify({ lat: rLat, lng: rLng, city, country }),
          ],
        ]);
      }
      return res.status(200).json({ ok: true });
    }

    const results = await pipeline([
      ['HGETALL', 'visits:count'],
      ['HGETALL', 'visits:meta'],
    ]);
    const counts = toMap(results[0]?.result);
    const metas = toMap(results[1]?.result);

    const points = Object.keys(metas).map((bucket) => {
      const m = JSON.parse(metas[bucket]);
      return {
        lat: m.lat,
        lng: m.lng,
        city: m.city,
        country: m.country,
        count: parseInt(counts[bucket] || '0', 10),
      };
    });
    const total = points.reduce((sum, p) => sum + p.count, 0);
    return res.status(200).json({ points, total, configured: true });
  } catch (err) {
    return res
      .status(200)
      .json({ points: [], total: 0, configured: false, error: String(err) });
  }
}
