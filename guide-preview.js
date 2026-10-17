/* ── Guide preview: shows page 1 + top 3/4 of page 2 before checkout ──
   Intercepts clicks on any link to a single-guide Shopify cart URL
   (index guide cards, AI scan result, quiz "Get my guide") and opens a
   preview modal. The "Get the full guide" button then continues to the
   original checkout link (promo code handling is preserved). */
(function () {
  var GUIDES = {
    '64842750951801': { n: 1, title: 'Oily skin & acne',         pages: 11 },
    '64842765959545': { n: 2, title: 'First signs of aging',     pages: 11 },
    '64842766975353': { n: 3, title: 'Razor burn & irritation',  pages: 12 },
    '64842772316537': { n: 4, title: 'Dull, tired-looking skin', pages: 11 },
    '64842773234041': { n: 5, title: 'Enlarged pores & texture', pages: 11 },
    '64842773627257': { n: 6, title: 'Maintenance routine',      pages: 11 }
  };

  var css = '' +
    '.gp-overlay{position:fixed;inset:0;z-index:9999;background:rgba(18,28,32,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .25s ease}' +
    '.gp-overlay.gp-open{opacity:1}' +
    '.gp-modal{background:var(--bg,#FAFAF8);width:100%;max-width:640px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);border-radius:20px;box-shadow:0 30px 80px rgba(18,28,32,.3);display:flex;flex-direction:column;overflow:hidden;transform:translateY(16px) scale(.98);transition:transform .35s cubic-bezier(.22,1,.36,1)}' +
    '.gp-open .gp-modal{transform:none}' +
    '.gp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--line,rgba(18,28,32,.09))}' +
    '.gp-eyebrow{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--clay-light,#6E969F);margin-bottom:4px}' +
    '.gp-title{font-size:19px;font-weight:700;color:var(--ink-2,#1A272C);line-height:1.25;margin:0}' +
    '.gp-close{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid var(--line,rgba(18,28,32,.12));background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink,#121C20)}' +
    '.gp-close:hover{background:var(--clay-faint,#E6EEEF)}' +
    '.gp-close svg{width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none}' +
    '.gp-body{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:20px;background:var(--bg-alt,#F1F4F3);flex:1;min-height:0}' +
    '.gp-page{display:block;width:100%;height:auto;border-radius:6px;box-shadow:0 6px 24px rgba(18,28,32,.12);background:#fff;user-select:none;-webkit-user-drag:none;pointer-events:none}' +
    '.gp-page+.gp-cut{margin-top:16px}' +
    '.gp-cut{position:relative;border-radius:6px 6px 0 0;overflow:hidden;box-shadow:0 6px 24px rgba(18,28,32,.12)}' +
    '.gp-cut .gp-page{border-radius:0;box-shadow:none}' +
    '.gp-cut:after{content:"";position:absolute;left:0;right:0;bottom:0;height:30%;background:linear-gradient(to bottom,rgba(241,244,243,0),var(--bg-alt,#F1F4F3) 90%)}' +
    '.gp-lock{position:relative;margin-top:-34px;z-index:1;text-align:center;padding:0 8px 4px}' +
    '.gp-lock-badge{display:inline-flex;align-items:center;gap:8px;background:var(--ink-2,#1A272C);color:#fff;font-size:13px;font-weight:600;padding:9px 16px;border-radius:999px}' +
    '.gp-lock-badge svg{width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none}' +
    '.gp-lock p{margin:10px 0 0;font-size:13.5px;color:var(--mid,#4A5B60);line-height:1.5}' +
    '.gp-foot{display:flex;align-items:center;gap:14px;padding:14px 20px;border-top:1px solid var(--line,rgba(18,28,32,.09));background:#fff}' +
    '.gp-price{font-size:20px;font-weight:700;color:var(--ink-2,#1A272C);white-space:nowrap}' +
    '.gp-price s{font-size:14px;font-weight:500;color:var(--muted,#7C8B8F);margin-right:6px}' +
    '.gp-price small{display:block;font-size:11.5px;font-weight:500;color:var(--muted,#7C8B8F)}' +
    '.gp-buy{flex:1;display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 20px;border-radius:999px;background:var(--clay,#2C4A52);color:#fff;font-weight:600;font-size:15px;text-decoration:none;text-align:center}' +
    '.gp-buy:hover{background:var(--clay-dark,#1F363D)}' +
    'html.gp-lockscroll,html.gp-lockscroll body{overflow:hidden}' +
    '@media (max-width:520px){.gp-overlay{padding:0;align-items:flex-end}.gp-modal{max-height:94vh;max-height:94dvh;border-radius:20px 20px 0 0}.gp-body{padding:14px}.gp-foot{padding:12px 16px calc(12px + env(safe-area-inset-bottom))}.gp-price{font-size:18px}}' +
    '@media (prefers-reduced-motion:reduce){.gp-overlay,.gp-modal{transition:none}}';

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  function guideFor(href) {
    var m = /\/cart\/(\d+):/.exec(href || '');
    return m && GUIDES[m[1]] ? GUIDES[m[1]] : null;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var overlay = null, lastFocus = null;

  function close() {
    if (!overlay) return;
    var o = overlay; overlay = null;
    o.classList.remove('gp-open');
    document.documentElement.classList.remove('gp-lockscroll');
    document.removeEventListener('keydown', onKey);
    setTimeout(function () { o.remove(); }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  function open(g, href) {
    lastFocus = document.activeElement;
    var promo = !document.documentElement.classList.contains('promo-ended');
    var price = promo ? '<s>$29.90</s>$23.92<small>Launch price · 20% off</small>' : '$29.90<small>One-time payment</small>';
    var base = 'previews/guide-' + g.n;
    var rest = g.pages - 2;

    overlay = document.createElement('div');
    overlay.className = 'gp-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Preview: ' + g.title);
    overlay.innerHTML =
      '<div class="gp-modal">' +
        '<div class="gp-head"><div><div class="gp-eyebrow">Free preview</div><h3 class="gp-title">' + esc(g.title) + '</h3></div>' +
          '<button type="button" class="gp-close" aria-label="Close preview"><svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></div>' +
        '<div class="gp-body">' +
          '<img class="gp-page" src="' + base + '-p1.webp" width="1105" height="1430" alt="' + esc(g.title) + ' guide, page 1 (cover)" draggable="false">' +
          '<div class="gp-cut"><img class="gp-page" src="' + base + '-p2.webp" width="1105" height="1072" alt="' + esc(g.title) + ' guide, page 2 (partial)" draggable="false"></div>' +
          '<div class="gp-lock"><span class="gp-lock-badge"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' + rest + ' more pages inside</span>' +
          '<p>Full routine, product checklist, week-by-week plan, tracker and FAQ. Instant PDF download.</p></div>' +
        '</div>' +
        '<div class="gp-foot"><div class="gp-price">' + price + '</div>' +
          '<a class="gp-buy" data-no-preview href="' + esc(href) + '">Get the full guide</a></div>' +
      '</div>';

    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.querySelector('.gp-close').addEventListener('click', close);
    overlay.addEventListener('contextmenu', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });
    document.body.appendChild(overlay);
    document.documentElement.classList.add('gp-lockscroll');
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(function () { overlay && overlay.classList.add('gp-open'); });
    overlay.querySelector('.gp-close').focus();
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('data-no-preview')) return;
    var g = guideFor(a.getAttribute('href'));
    if (!g) return;
    e.preventDefault();
    open(g, a.href);
  }, true);
})();
