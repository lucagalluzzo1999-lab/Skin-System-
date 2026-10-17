// Shared per-IP rate limiter for the serverless functions.
// (Files starting with "_" inside /api are not exposed as endpoints by Vercel.)
//
// Uses Upstash Redis / Vercel KV over REST when configured:
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   or (Vercel KV)  KV_REST_API_URL + KV_REST_API_TOKEN
// Otherwise falls back to an in-memory counter.
// TODO: configure Upstash/Vercel KV in production. The in-memory fallback only
// lives inside one warm function instance, so it is a best-effort limit, not a
// guarantee (instances are recycled and several can run in parallel).

const memory = new Map();

function restConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : String(fwd || '')).split(',')[0].trim();
  return ip || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

/**
 * Fixed-window limiter.
 * @returns {Promise<{ok:boolean, remaining:number, retryAfter:number}>}
 */
export async function rateLimit(key, { limit = 5, windowSec = 600 } = {}) {
  const cfg = restConfig();
  const k = `rl:${key}`;

  if (cfg) {
    try {
      const r = await fetch(`${cfg.url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['INCR', k],
          ['EXPIRE', k, String(windowSec), 'NX'],
          ['TTL', k],
        ]),
      });
      if (r.ok) {
        const out = await r.json();
        const count = Number(out[0] && out[0].result) || 0;
        const ttl = Number(out[2] && out[2].result);
        const retryAfter = ttl > 0 ? ttl : windowSec;
        return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter };
      }
    } catch (e) {
      // fall through to the in-memory limiter if the store is unreachable
    }
  }

  const now = Date.now();
  let entry = memory.get(k);
  if (!entry || entry.reset <= now) {
    entry = { count: 0, reset: now + windowSec * 1000 };
    memory.set(k, entry);
  }
  entry.count += 1;
  if (memory.size > 5000) {               // keep memory bounded
    for (const [mk, mv] of memory) if (mv.reset <= now) memory.delete(mk);
  }
  const retryAfter = Math.max(1, Math.ceil((entry.reset - now) / 1000));
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count), retryAfter };
}
