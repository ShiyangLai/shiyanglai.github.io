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
        const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
        const month = day.slice(0, 7); // YYYY-MM
        await pipeline([
          // per-month location counts (heatmap sums a rolling 12-month window)
          ['HINCRBY', `visits:loc:${month}`, bucket, 1],
          ['EXPIRE', `visits:loc:${month}`, 34560000], // keep ~400 days
          // location labels (lat/lng/city/country), kept long-term
          [
            'HSET',
            'visits:meta',
            bucket,
            JSON.stringify({ lat: rLat, lng: rLng, city, country }),
          ],
          // daily totals (powers the 90-day chart)
          ['HINCRBY', 'visits:daily', day, 1],
        ]);
      }
      return res.status(200).json({ ok: true });
    }

    // Heatmap = rolling last 12 months. Sum per-location counts over the last
    // 12 monthly hashes; meta supplies labels; visits:daily powers the chart.
    const WINDOW_MONTHS = 12;
    const now = new Date();
    const months: string[] = [];
    for (let i = 0; i < WINDOW_MONTHS; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(d.toISOString().slice(0, 7)); // YYYY-MM
    }
    const cmds: Cmd[] = months.map((mo) => ['HGETALL', `visits:loc:${mo}`]);
    cmds.push(['HGETALL', 'visits:meta']);
    cmds.push(['HGETALL', 'visits:daily']);
    const results = await pipeline(cmds);

    const counts: Record<string, number> = {};
    for (let i = 0; i < WINDOW_MONTHS; i++) {
      const m = toMap(results[i]?.result);
      Object.keys(m).forEach((b) => {
        counts[b] = (counts[b] || 0) + parseInt(m[b] || '0', 10);
      });
    }
    const metas = toMap(results[WINDOW_MONTHS]?.result);
    const dailyRaw = toMap(results[WINDOW_MONTHS + 1]?.result);

    const points = Object.keys(counts)
      .filter((b) => counts[b] > 0)
      .map((bucket) => {
        const meta = metas[bucket] ? JSON.parse(metas[bucket]) : null;
        const [bLat, bLng] = bucket.split('_').map(Number);
        return {
          lat: meta ? meta.lat : bLat,
          lng: meta ? meta.lng : bLng,
          city: meta ? meta.city : 'Somewhere',
          country: meta ? meta.country : '??',
          count: counts[bucket],
        };
      });
    const total = points.reduce((sum, p) => sum + p.count, 0);
    const daily: Record<string, number> = {};
    Object.keys(dailyRaw).forEach((d) => {
      daily[d] = parseInt(dailyRaw[d] || '0', 10);
    });
    return res
      .status(200)
      .json({ points, total, daily, windowMonths: WINDOW_MONTHS, configured: true });
  } catch (err) {
    return res
      .status(200)
      .json({ points: [], total: 0, configured: false, error: String(err) });
  }
}
