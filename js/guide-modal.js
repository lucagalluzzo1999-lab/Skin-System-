/* ── Guide modal (index): accessible dialog with the guide details ──
   Opens from any [data-guide="<slug>"] trigger or from a #guide-<slug> hash
   (deep link, e.g. skin-system.vercel.app/#guide-oily-acne).
   - focus trap, Esc / ✕ / backdrop close, body scroll lock, full-screen on mobile
   - "Look inside" reuses the inline PDF viewer from guide-preview.js (SkinPreview)
   - primary CTA = the existing Shopify cart link for that guide
   - reviews summary only when /data/reviews.json has reviews for that guide
   Data: window.SSM_GUIDES (js/guides-data.js). */
(function () {
  var DATA = window.SSM_GUIDES;
  if (!DATA) return;

  var root = null, lastFocus = null, current = null, pushed = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Number(n).toFixed(2); }
  function cartHref(g) { return window.skinPromoUrl ? window.skinPromoUrl(g.cartUrl) : g.cartUrl; }

  var ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';

  function reviewsHTML(g) {
    var R = window.SSM_REVIEWS;
    var s = R && R.summaryFor ? R.summaryFor(g) : null;
    if (!s || !s.count) return '';
    var stars = Math.round(s.average * 2) / 2;
    return '<p class="gm-reviews"><span class="gm-stars" aria-hidden="true">' + '★★★★★'.slice(0, Math.round(stars)) + '<span>' + '★★★★★'.slice(Math.round(stars)) + '</span></span>' +
      '<span>' + s.average.toFixed(1) + ' out of 5 · ' + s.count + (s.count === 1 ? ' review' : ' reviews') + '</span></p>';
  }

  function build(g) {
    var id = 'gm-' + g.slug;
    return '' +
      '<div class="gm-backdrop" data-gm-close></div>' +
      '<div class="gm-dialog" role="dialog" aria-modal="true" aria-labelledby="' + id + '-title" tabindex="-1">' +
        '<button type="button" class="gm-close" data-gm-close aria-label="Close">' + ICON_X + '</button>' +
        '<div class="gm-grid" tabindex="0">' +
          '<div class="gm-media">' +
            '<div class="gm-cover"><img src="' + esc(g.cover) + '" width="1224" height="1584" alt="Cover of the ' + esc(g.name) + ' guide" draggable="false"></div>' +
            '<div class="gm-viewer" hidden></div>' +
            '<button type="button" class="gm-look" aria-expanded="false">Look inside: free preview</button>' +
          '</div>' +
          '<div class="gm-info">' +
            '<span class="gm-zone">' + esc(g.zone) + '</span>' +
            '<h2 class="gm-title" id="' + id + '-title">' + esc(g.name) + '</h2>' +
            reviewsHTML(g) +
            '<p class="gm-meta">PDF guide · ' + g.pages + ' pages · 6-week plan</p>' +
            '<h3 class="gm-h">Who it\'s for</h3>' +
            '<p class="gm-who">' + esc(g.whoFor) + '</p>' +
            '<h3 class="gm-h">What\'s inside</h3>' +
            '<ol class="gm-toc">' + g.toc.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
            '<h3 class="gm-h">What\'s included</h3>' +
            '<ul class="gm-incl">' + g.included.map(function (t) { return '<li>' + ICON_CHECK + esc(t) + '</li>'; }).join('') + '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="gm-buy">' +
          '<div class="gm-price">' +
            '<span class="promo-only"><s class="gm-was">' + money(g.price) + '</s>' + money(g.salePrice) + '<small>Launch price · ends Oct 31</small></span>' +
            '<span class="full-only">' + money(g.price) + '<small>One-time payment</small></span>' +
          '</div>' +
          '<div class="gm-ctas">' +
            '<a class="gm-cta" href="' + esc(cartHref(g)) + '">Get the guide</a>' +
            '<a class="gm-quiz" href="quiz.html">Not sure? Take the 2-min quiz</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function focusables() {
    return Array.prototype.filter.call(
      root.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.closest('[hidden]') && el.offsetParent !== null; }
    );
  }

  function onKey(e) {
    if (!root) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function lockScroll() {
    var sw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.add('modal-open');
    document.body.style.paddingRight = sw > 0 ? sw + 'px' : '';
  }
  function unlockScroll() {
    document.documentElement.classList.remove('modal-open');
    document.body.style.paddingRight = '';
  }

  function open(slug, opts) {
    var g = DATA.bySlug(slug);
    if (!g) return;
    opts = opts || {};
    if (root) close({ keepHash: true, silent: true });
    current = g;
    lastFocus = opts.trigger || document.activeElement;

    root = document.createElement('div');
    root.className = 'gm';
    root.innerHTML = build(g);
    document.body.appendChild(root);
    lockScroll();
    document.addEventListener('keydown', onKey, true);

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-gm-close]')) close();
    });

    var look = root.querySelector('.gm-look');
    look.addEventListener('click', function () {
      var viewer = root.querySelector('.gm-viewer');
      var cover = root.querySelector('.gm-cover');
      var showing = look.getAttribute('aria-expanded') === 'true';
      if (showing) {
        viewer.hidden = true; cover.hidden = false;
        look.setAttribute('aria-expanded', 'false'); look.textContent = 'Look inside: free preview';
        return;
      }
      if (window.SkinPreview && !viewer.firstChild) {
        viewer.setAttribute('data-href', g.cartUrl);
        viewer.setAttribute('data-gp-nobuy', '');
        viewer.hidden = false;
        window.SkinPreview.mount(viewer);
      }
      viewer.hidden = false; cover.hidden = true;
      look.setAttribute('aria-expanded', 'true'); look.textContent = 'Back to the cover';
    });

    var hash = '#guide-' + g.slug;
    pushed = false;
    if (!opts.fromHash && location.hash !== hash) {
      try { history.pushState({ gm: g.slug }, '', hash); pushed = true; } catch (e) { /* ignore */ }
    }

    requestAnimationFrame(function () {
      if (!root) return;
      root.classList.add('is-open');
      root.querySelector('.gm-dialog').focus({ preventScroll: true });
    });

    if (window.ssmTrack && window.ssmProductParams) {
      var p = window.ssmProductParams(g.variantId); p.content_category = 'guide_modal';
      window.ssmTrack('ViewContent', p);
    }
    document.dispatchEvent(new CustomEvent('ssm:modal', { detail: { open: true } }));
  }

  function close(opts) {
    if (!root) return;
    opts = opts || {};
    var r = root; root = null;
    var slug = current && current.slug; current = null;
    document.removeEventListener('keydown', onKey, true);
    r.classList.remove('is-open');
    setTimeout(function () { r.remove(); }, 220);
    unlockScroll();
    if (!opts.keepHash && slug && location.hash === '#guide-' + slug) {
      if (pushed) { pushed = false; history.back(); }
      else { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }
    }
    if (!opts.silent && lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
    document.dispatchEvent(new CustomEvent('ssm:modal', { detail: { open: false } }));
  }

  function fromHash() {
    var m = /^#guide-([a-z0-9-]+)$/.exec(location.hash);
    if (m && DATA.bySlug(m[1])) {
      if (!current || current.slug !== m[1]) open(m[1], { fromHash: true });
    } else if (root) {
      close({ keepHash: true });
    }
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target.closest && e.target.closest('[data-guide]');
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute('data-guide'), { trigger: t });
  });

  window.addEventListener('popstate', fromHash);
  window.addEventListener('hashchange', fromHash);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromHash);
  else fromHash();

  window.SSMGuideModal = { open: open, close: close };
})();
