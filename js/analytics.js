/* ── Skin System Men — consent + Meta Pixel ──
   • Shows a small cookie banner (Accept / Decline) until the visitor chooses.
   • The choice is stored in localStorage (key from SSM_CONFIG.CONSENT_STORAGE_KEY).
   • Meta Pixel is loaded ONLY if SSM_CONFIG.META_PIXEL_ID is set AND consent = "granted".
   • A Global Privacy Control signal (navigator.globalPrivacyControl) counts as "Decline"
     until the visitor explicitly accepts.
   • Any element with [data-consent-open] (e.g. the footer "Do Not Sell or Share…" link)
     reopens the banner.
   • window.ssmTrack(event, params)        → standard Meta event
     window.ssmTrackCustom(event, params)  → custom Meta event
     Both are safe no-ops when there is no consent.
   • InitiateCheckout fires on every click on a Shopify cart link.
   • Vercel Web Analytics (cookieless) always counts visits + mirrors the events. */
(function () {
  var CFG = window.SSM_CONFIG || {};
  var KEY = CFG.CONSENT_STORAGE_KEY || 'ssm_consent_v1';
  var PIXEL_ID = String(CFG.META_PIXEL_ID || '').trim();
  var CURRENCY = CFG.CURRENCY || 'USD';
  var pixelLoaded = false;

  /* ---------- storage (always wrapped: private mode can throw) ---------- */
  function getChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ }
  }
  function gpc() { return navigator.globalPrivacyControl === true; }
  function hasConsent() { return getChoice() === 'granted'; }

  /* ---------- Meta Pixel ---------- */
  function loadPixel() {
    if (pixelLoaded || !PIXEL_ID) return;
    pixelLoaded = true;
    /* official Meta base code */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('consent', 'grant');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  /* ---------- Vercel Web Analytics (cookieless, no personal data) ----------
     Counts page views and mirrors the main events (max 2 properties each,
     Pro plan) so clicks are visible in Vercel → Analytics → Events even for
     visitors who decline cookies. Not loaded on localhost. */
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    var vs = document.createElement('script');
    vs.defer = true; vs.src = '/_vercel/insights/script.js';
    document.head.appendChild(vs);
  }
  var VA_PROPS = {
    InitiateCheckout: function (p) { return { product: p.content_name, value: p.value }; },
    ViewContent:      function (p) { return { product: p.content_name, source: p.content_category }; },
    QuizComplete:     function (p) { return { guide: p.recommended_guide, skin_type: p.skin_type }; },
    AIScanComplete:   function (p) { return { guide: p.recommended_guide, skin_type: p.skin_type }; },
    Lead:             function (p) { return { guide: p.content_name, source: p.content_category }; },
    QuizClick:        function (p) { return { page: p.location }; }
  };
  function vaEvent(event, params) {
    var map = VA_PROPS[event]; if (!map) return;
    var data = map(params || {}), clean = {};
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      if (v === undefined || v === '') return;
      clean[k] = typeof v === 'number' ? v : String(v).slice(0, 255);
    });
    try { window.va('event', { name: event, data: clean }); } catch (e) { /* ignore */ }
  }

  function track(type, event, params) {
    vaEvent(event, params);
    if (!pixelLoaded || !hasConsent() || typeof window.fbq !== 'function') return;
    window.fbq(type, event, params || {});
  }
  window.ssmTrack = function (event, params) { track('track', event, params); };
  window.ssmTrackCustom = function (event, params) { track('trackCustom', event, params); };

  /* ---------- product values for events ---------- */
  var FALLBACK_PRODUCTS = {
    '64842750951801': { name: 'Oily skin & acne', full: 29.90, promo: 23.92 },
    '64842765959545': { name: 'First signs of aging', full: 29.90, promo: 23.92 },
    '64842766975353': { name: 'Razor burn & irritation', full: 29.90, promo: 23.92 },
    '64842772316537': { name: 'Dull, tired-looking skin', full: 29.90, promo: 23.92 },
    '64842773234041': { name: 'Enlarged pores & texture', full: 29.90, promo: 23.92 },
    '64842773627257': { name: 'Maintenance routine', full: 29.90, promo: 23.92 },
    '64842773922169': { name: 'All 6 guides bundle', full: 119.90, promo: 95.92 }
  };
  function promoOn() { return !document.documentElement.classList.contains('promo-ended'); }
  function productFor(variantId) {
    var shared = window.SSM_GUIDES && window.SSM_GUIDES.byVariant && window.SSM_GUIDES.byVariant(variantId);
    if (shared) return { name: shared.name, full: shared.price, promo: shared.salePrice };
    return FALLBACK_PRODUCTS[variantId] || null;
  }
  /* exposed so other scripts (guide modal, quiz preview) send consistent values */
  window.ssmProductParams = function (variantId) {
    var p = productFor(variantId) || { name: 'Guide', full: 29.90, promo: 23.92 };
    return {
      content_ids: [variantId],
      content_name: p.name,
      content_type: 'product',
      value: promoOn() ? p.promo : p.full,
      currency: CURRENCY
    };
  };

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var m = href.match(/myshopify\.com\/cart\/(\d+)/);
    if (m) {
      var params = window.ssmProductParams(m[1]);
      params.num_items = 1;
      window.ssmTrack('InitiateCheckout', params);
      return;
    }
    if (/quiz\.html|#quiz-spot/.test(href)) {
      window.ssmTrackCustom('QuizClick', { location: location.pathname });
    }
  }, true);

  /* ---------- banner ---------- */
  var banner = null, lastFocus = null;

  function buildBanner() {
    banner = document.createElement('div');
    banner.className = 'consent';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie preferences');
    banner.innerHTML =
      '<div class="consent-inner">' +
        '<p class="consent-text" id="consentText"><b>Cookies, your call.</b> We use essential cookies to run the site. ' +
        'With your OK we also use the Meta Pixel to measure visits and improve our ads. ' +
        '<a href="privacy.html#cookies">Learn more</a></p>' +
        '<div class="consent-actions">' +
          '<button type="button" class="consent-btn consent-decline" data-consent="denied">Decline</button>' +
          '<button type="button" class="consent-btn consent-accept" data-consent="granted">Accept</button>' +
        '</div>' +
      '</div>';
    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (b) choose(b.getAttribute('data-consent'));
    });
    banner.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideBanner(); });
    document.body.insertBefore(banner, document.body.firstChild); // early in tab order
  }

  function showBanner(focus) {
    if (!banner) buildBanner();
    banner.hidden = false;
    document.documentElement.classList.add('consent-open');
    requestAnimationFrame(function () { banner.classList.add('is-in'); });
    var cur = getChoice();
    banner.querySelectorAll('[data-consent]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-consent') === cur));
    });
    if (focus) {
      lastFocus = document.activeElement;
      var target = banner.querySelector(cur === 'granted' ? '.consent-decline' : '.consent-accept');
      if (target) target.focus();
    }
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('is-in');
    banner.hidden = true;
    document.documentElement.classList.remove('consent-open');
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }

  function choose(v) {
    setChoice(v);
    if (v === 'granted') loadPixel();
    else if (pixelLoaded && typeof window.fbq === 'function') window.fbq('consent', 'revoke');
    hideBanner();
    document.dispatchEvent(new CustomEvent('ssm:consent', { detail: { value: v } }));
  }

  window.ssmOpenConsent = function () { showBanner(true); };

  function init() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-consent-open]');
      if (!t) return;
      e.preventDefault();
      showBanner(true);
    });
    var choice = getChoice();
    if (choice === 'granted') { loadPixel(); return; }
    if (choice === 'denied') return;
    if (gpc()) return;            // GPC = opt-out; banner can still be reopened from the footer
    showBanner(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
