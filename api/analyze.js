// Vercel serverless function — POST /api/analyze
// Proxy to the Anthropic API for the AI face scan and the ingredient scanner.
// The API key lives only here (env ANTHROPIC_API_KEY), never in the browser.
//
// Protection:
//  - per-IP rate limit: 5 requests / 10 min, separate buckets for the face scan
//    and the ingredient scanner (see ./_ratelimit.js — Upstash/Vercel KV if
//    configured, otherwise in-memory fallback, TODO in production)
//  - images: JPG, PNG or WebP only (declared type AND file signature), max 5 MB
//  - the request shape is fixed: one user message, capped text and max_tokens,
//    model chosen on the server (env ANTHROPIC_MODEL)
// Errors are returned as { error: { message } } with friendly text.

import { rateLimit, clientIp } from './_ratelimit.js';

const LIMIT = 5;
const WINDOW_SEC = 600;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 6000;
const MAX_TOKENS = 1000;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function fail(res, status, message, extraHeaders) {
  if (extraHeaders) Object.entries(extraHeaders).forEach(([k, v]) => res.setHeader(k, v));
  return res.status(status).json({ error: { message } });
}

function base64Bytes(b64) {
  const clean = b64.replace(/\s/g, '');
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - pad;
}

function sniffType(b64) {
  let head;
  try { head = Buffer.from(b64.slice(0, 32), 'base64'); } catch { return null; }
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head.length >= 8 && head.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (head.length >= 12 && head.slice(0, 4).toString('ascii') === 'RIFF' && head.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

// Returns { ok, kind, content } or { ok:false, status, message }
function validate(body) {
  const messages = body && body.messages;
  if (!Array.isArray(messages) || messages.length !== 1 || messages[0].role !== 'user') {
    return { ok: false, status: 400, message: 'Invalid request.' };
  }
  const content = messages[0].content;

  if (typeof content === 'string') {
    if (!content.trim()) return { ok: false, status: 400, message: 'Please type an ingredient first.' };
    if (content.length > MAX_TEXT_CHARS) return { ok: false, status: 413, message: 'That text is too long. Paste a shorter ingredient list.' };
    return { ok: true, kind: 'ingredient', content };
  }

  if (!Array.isArray(content) || !content.length || content.length > 4) return { ok: false, status: 400, message: 'Invalid request.' };

  let images = 0, textLen = 0;
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string') { textLen += block.text.length; continue; }
    if (block && block.type === 'image' && block.source && block.source.type === 'base64') {
      images += 1;
      const declared = String(block.source.media_type || '').toLowerCase();
      const data = String(block.source.data || '');
      if (!ALLOWED_TYPES.includes(declared)) return { ok: false, status: 415, message: 'Please upload a JPG, PNG or WebP photo.' };
      if (!data) return { ok: false, status: 400, message: "We couldn't read that photo. Please try another one." };
      if (base64Bytes(data) > MAX_IMAGE_BYTES) return { ok: false, status: 413, message: 'That photo is larger than 5 MB. Please use a smaller one.' };
      const real = sniffType(data);
      if (!real || real !== declared) return { ok: false, status: 415, message: 'Please upload a JPG, PNG or WebP photo.' };
      continue;
    }
    return { ok: false, status: 400, message: 'Invalid request.' };
  }
  if (images !== 1) return { ok: false, status: 400, message: 'Please upload one photo of your face.' };
  if (textLen > MAX_TEXT_CHARS) return { ok: false, status: 413, message: 'Invalid request.' };
  return { ok: true, kind: 'scan', content };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed.', { Allow: 'POST' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail(res, 500, 'The AI tools are not available right now. Please try again later.');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }

  const v = validate(body);
  if (!v.ok) return fail(res, v.status, v.message);

  const rl = await rateLimit(`${v.kind}:${clientIp(req)}`, { limit: LIMIT, windowSec: WINDOW_SEC });
  if (!rl.ok) {
    const mins = Math.max(1, Math.ceil(rl.retryAfter / 60));
    const what = v.kind === 'scan' ? 'scans' : 'ingredient lookups';
    return fail(res, 429, `You've reached the limit of ${LIMIT} ${what} in 10 minutes. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`, { 'Retry-After': String(rl.retryAfter) });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS),
        messages: [{ role: 'user', content: v.content }],
      }),
    });

    const data = await anthropicRes.json().catch(() => ({}));
    if (!anthropicRes.ok) {
      console.error('[analyze] upstream', anthropicRes.status, JSON.stringify(data).slice(0, 300));
      return fail(res, 502, 'The AI is busy right now. Please try again in a moment.');
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('[analyze]', String(err));
    return fail(res, 502, "Couldn't reach the AI. Please try again in a moment.");
  }
}
