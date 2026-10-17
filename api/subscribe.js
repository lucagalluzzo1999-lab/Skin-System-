// Vercel serverless function — POST /api/subscribe
// Optional email capture ("free 1-page routine cheat sheet").
//
// Body (JSON): { email, company, skin_type, guide, source }
//   company = honeypot: real users never see it, bots fill it in.
//
// Provider is chosen with environment variables (Vercel → Settings → Environment Variables):
//   EMAIL_PROVIDER        "klaviyo" (default when KLAVIYO_PRIVATE_KEY is set)
//   KLAVIYO_PRIVATE_KEY   TODO: Klaviyo private API key (scopes: profiles:write, lists:write, subscriptions:write)
//   KLAVIYO_LIST_ID       TODO: ID of the list people should be added to
//   KLAVIYO_REVISION      optional, API revision date (default below)
//
// To actually send the cheat sheet, create a Klaviyo flow triggered by
// "Added to list" on KLAVIYO_LIST_ID (TODO in Klaviyo). The profile gets the
// properties skin_type, recommended_guide and signup_source for personalization.

import { rateLimit, clientIp } from './_ratelimit.js';

const KLAVIYO_REVISION_DEFAULT = '2024-10-15';
const MAX_FIELD = 80;

function clean(v) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, MAX_FIELD);
}

function validEmail(v) {
  return typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

async function klaviyo(email, props) {
  const key = process.env.KLAVIYO_PRIVATE_KEY;
  const listId = process.env.KLAVIYO_LIST_ID;
  if (!key || !listId) return { ok: false, status: 503, error: "Email signup isn't available right now. Please try again later." };

  const headers = {
    Authorization: `Klaviyo-API-Key ${key}`,
    accept: 'application/vnd.api+json',
    'content-type': 'application/vnd.api+json',
    revision: process.env.KLAVIYO_REVISION || KLAVIYO_REVISION_DEFAULT,
  };

  // 1) create / update the profile with the quiz context as custom properties
  const upsert = await fetch('https://a.klaviyo.com/api/profile-import', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'profile',
        attributes: {
          email,
          properties: {
            skin_type: props.skin_type,
            recommended_guide: props.guide,
            signup_source: props.source,
          },
        },
      },
    }),
  });
  if (!upsert.ok) return { ok: false, status: 502, error: 'Something went wrong. Please try again.', detail: await upsert.text() };

  // 2) subscribe the profile to the list (email marketing consent)
  const sub = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          custom_source: `Website ${props.source || 'result'} cheat sheet`,
          profiles: {
            data: [{
              type: 'profile',
              attributes: {
                email,
                subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } },
              },
            }],
          },
        },
        relationships: { list: { data: { type: 'list', id: listId } } },
      },
    }),
  });
  if (!sub.ok) return { ok: false, status: 502, error: 'Something went wrong. Please try again.', detail: await sub.text() };
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const limited = await rateLimit(`subscribe:${clientIp(req)}`, { limit: 5, windowSec: 600 });
  if (!limited.ok) {
    res.setHeader('Retry-After', String(limited.retryAfter));
    return res.status(429).json({ ok: false, error: 'Too many attempts. Please try again in a few minutes.' });
  }

  const body = await readJson(req);

  // Honeypot: pretend everything went fine, store nothing.
  if (body.company) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  if (!validEmail(email)) return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });

  const props = { skin_type: clean(body.skin_type), guide: clean(body.guide), source: clean(body.source) };

  const provider = (process.env.EMAIL_PROVIDER || (process.env.KLAVIYO_PRIVATE_KEY ? 'klaviyo' : '')).toLowerCase();
  let result;
  try {
    if (provider === 'klaviyo') result = await klaviyo(email, props);
    else result = { ok: false, status: 503, error: "Email signup isn't available right now. Please try again later." };
  } catch (err) {
    result = { ok: false, status: 502, error: 'Something went wrong. Please try again.', detail: String(err) };
  }

  if (!result.ok) {
    if (result.detail) console.error('[subscribe]', provider, result.detail.slice(0, 500));
    return res.status(result.status || 500).json({ ok: false, error: result.error });
  }
  return res.status(200).json({ ok: true });
}
