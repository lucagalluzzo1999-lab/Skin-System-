/* ─────────────────────────────────────────────────────────────
   Skin System Men — site configuration (single source of truth)
   Values marked  PLACEHOLDER  must be filled in / confirmed by the owner.
   Server-side secrets (Klaviyo keys, KV tokens) are NOT here: they are
   Vercel environment variables, see /api/subscribe.js and /api/_ratelimit.js.
   ───────────────────────────────────────────────────────────── */
window.SSM_CONFIG = {
  /* Meta Pixel ID (Events Manager → Data sources).
     Set to '' to disable the pixel entirely. The pixel only loads after the
     visitor clicks "Accept" in the cookie banner. */
  META_PIXEL_ID: '1086249570848477', // ID already used on the live site — confirm it is the right dataset

  /* localStorage key used to remember the cookie choice ("granted" | "denied") */
  CONSENT_STORAGE_KEY: 'ssm_consent_v1',

  /* Shown next to the AI face scan upload button. Matches privacy.html §4 + §7:
     /api/analyze never saves the photo; it only forwards it to the AI provider. */
  PHOTO_NOTICE: 'Your photo is only used to generate your result. We don\'t store it.',

  /* "Who's behind Skin System" block (homepage, before the FAQ).
     PLACEHOLDER — write a 2-line story. While the text starts with
     "PLACEHOLDER" it is NOT shown on the site. */
  FOUNDERS_STORY: 'PLACEHOLDER: Two lines on why you started Skin System Men and who it is for.',

  /* PLACEHOLDER — optional founder photos (square, at least 240×240), e.g.
     'img/founders/luca.jpg'. Leave '' to show the initials instead. */
  FOUNDER_PHOTOS: { luca: '', lorenzo: '' },

  /* thank-you.html — PLACEHOLDER for a future "upgrade credit" offer
     (e.g. "Your guide counts toward the bundle"). Leave '' to hide it.
     Only fill this in once the credit really exists in Shopify. */
  UPGRADE_CREDIT_NOTE: '',

  /* Endpoint of the optional email capture card */
  SUBSCRIBE_ENDPOINT: '/api/subscribe',

  /* Launch promo — used only for analytics values / structured data.
     The visible prices on the page are NOT driven by this. */
  CURRENCY: 'USD'
};
