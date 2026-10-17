/* ── Guide preview: inline scrollable PDF-style viewer ──
   Used on the quiz result: <div data-gp-inline data-href="…shopify cart url…">.
   The reader scrolls the cover and the first half of page 2; scrolling then
   stops smoothly and the buy button slides in (it links to the cart URL, so
   promo code handling is preserved). Only pre-rendered images of page 1 and
   the top of page 2 are shipped (preview-guide-N-p1/p2.webp) — never the PDF.
   Guide data: js/guides-data.js (must load first). Reused by the guide modal
   (js/guide-modal.js) with data-gp-nobuy to hide the built-in buy bar. */
(function () {
  /* guide data comes from js/guides-data.js (window.SSM_GUIDES) */


  /* page images: 1224 × 1584 (US Letter @144dpi); page 2 is cropped to 60% */
  var P_W = 1224, P1_H = 1584, P2_H = 950;

  var css = '' +
    '.gp-modal{position:relative;background:#2B3134;width:100%;max-width:720px;height:calc(100vh - 32px);height:calc(100dvh - 32px);max-height:980px;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden;transform:translateY(16px) scale(.98);transition:transform .35s cubic-bezier(.22,1,.36,1)}' +
    /* toolbar (PDF-reader style) */
    '.gp-bar{flex:none;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 16px;background:#1E2427;color:#E8EDEE;border-bottom:1px solid rgba(255,255,255,.06)}' +
    '.gp-file{display:flex;align-items:center;gap:10px;min-width:0;flex:1}' +
    '.gp-file svg{flex:none;width:18px;height:18px;stroke:#C9D6D9;stroke-width:1.8;fill:none}' +
    '.gp-file-txt{min-width:0}' +
    '.gp-title{font-size:15px;font-weight:600;color:#fff;line-height:1.3;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    /* scroll area */
    '.gp-scroll{position:relative;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scroll-behavior:auto}' +
    '.gp-doc{padding:22px 22px 0;transition:transform .45s cubic-bezier(.22,1,.36,1);will-change:transform}' +
    '.gp-doc.gp-pull{transition:none}' +
    '.gp-sheet{position:relative;margin:0 auto 18px;max-width:600px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25),0 12px 32px rgba(0,0,0,.25);overflow:hidden}' +
    '.gp-sheet img{display:block;width:100%;height:auto;user-select:none;-webkit-user-select:none;-webkit-user-drag:none;pointer-events:none;-webkit-touch-callout:none}' +
    '.gp-sheet.gp-half{margin-bottom:0;box-shadow:0 -2px 6px rgba(0,0,0,.18)}' +
    '.gp-sheet.gp-half:after{content:"";position:absolute;left:0;right:0;bottom:0;height:52%;background:linear-gradient(to bottom,rgba(43,49,52,0) 0%,rgba(43,49,52,.7) 40%,#2B3134 75%)}' +
    /* lock card sitting on the fade */
    '.gp-lock{position:relative;z-index:1;max-width:600px;margin:-120px auto 0;padding:0 16px 26px;text-align:center;color:#E8EDEE}' +
    '.gp-lock-ico{width:44px;height:44px;margin:0 auto 10px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center}' +
    '.gp-lock-ico svg{width:20px;height:20px;stroke:#fff;stroke-width:2;fill:none}' +
    '.gp-lock h4{margin:0 0 6px;font-size:17px;font-weight:700;color:#fff}' +
    '.gp-lock p{margin:0 auto;max-width:400px;font-size:13.5px;line-height:1.55;color:#B9C7CA}' +
    /* spacer so the lock card can scroll clear of the sliding buy bar */
    '.gp-spacer{height:96px}' +
    /* scroll hint + buy bar */
    '.gp-hint{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:8px;background:rgba(18,24,27,.82);color:#fff;font-size:12.5px;font-weight:500;padding:8px 14px;border-radius:999px;white-space:nowrap;pointer-events:none;transition:opacity .3s ease,transform .3s ease}' +
    '.gp-hint svg{width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;animation:gp-bob 1.4s ease-in-out infinite}' +
    '@keyframes gp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(3px)}}' +
    '.gp-buybar{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:14px;padding:14px 18px;background:#fff;box-shadow:0 -10px 30px rgba(0,0,0,.25);transform:translateY(105%);transition:transform .5s cubic-bezier(.22,1,.36,1)}' +
    '.gp-unlocked .gp-buybar{transform:none}' +
    '.gp-unlocked .gp-hint{opacity:0;transform:translateX(-50%) translateY(8px)}' +
    '.gp-price{font-size:20px;font-weight:700;color:var(--ink-2,#1A272C);white-space:nowrap;line-height:1.15}' +
    '.gp-price s{font-size:14px;font-weight:500;color:var(--muted,#7C8B8F);margin-right:6px}' +
    '.gp-price small{display:block;font-size:11.5px;font-weight:500;color:var(--muted,#7C8B8F)}' +
    '.gp-buy{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:12px 20px;border-radius:999px;background:var(--clay,#2C4A52);color:#fff;font-weight:600;font-size:15.5px;text-decoration:none;text-align:center;white-space:nowrap}' +
    '.gp-buy:hover{background:var(--clay-dark,#1F363D)}' +
    '.gp-buy svg{width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none}' +
    '.gp-unlocked .gp-buy{animation:gp-pulse 1.6s ease .5s 1}' +
    '@keyframes gp-pulse{0%{box-shadow:0 0 0 0 rgba(44,74,82,.45)}100%{box-shadow:0 0 0 16px rgba(44,74,82,0)}}' +
    /* inline variant */
    '.gp-modal.gp-inline{height:620px;max-height:none;max-width:none;border-radius:22px;transform:none;box-shadow:0 20px 50px rgba(18,28,32,.18)}' +
    '.gp-inline .gp-scroll{overscroll-behavior:auto}' +
    '.gp-nobuy .gp-buybar,.gp-nobuy .gp-hint{display:none}' +
    '.gp-nobuy .gp-spacer{height:8px}' +
    '@media (max-width:560px){.gp-modal{height:94vh;height:94dvh;max-height:none;border-radius:18px 18px 0 0}.gp-doc{padding:14px 12px 0}.gp-sheet{margin-bottom:12px}.gp-lock{margin-top:-96px}.gp-buybar{padding:12px 14px calc(12px + env(safe-area-inset-bottom))}.gp-price{font-size:18px}.gp-buy{font-size:14.5px;padding:12px 14px;gap:6px}}' +
    '@media (max-width:560px){.gp-modal.gp-inline{height:540px;border-radius:18px}}' +
    '@media (prefers-reduced-motion:reduce){.gp-doc,.gp-buybar,.gp-hint{transition:none}.gp-hint svg,.gp-unlocked .gp-buy{animation:none}}';

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  function guideFor(href) {
    var g = window.SSM_GUIDES && window.SSM_GUIDES.byCartUrl(href);
    return g ? { n: g.n, title: g.pdfTitle, pages: g.pages } : null;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var LOCK_ICO = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  function viewerHTML(g, href, inline) {
    var promo = !document.documentElement.classList.contains('promo-ended');
    var price = promo ? '<s>$29.90</s>$23.92<small>Launch price · 20% off</small>' : '$29.90<small>One-time payment</small>';
    var base = 'preview-guide-' + g.n;
    return '<div class="gp-modal' + (inline ? ' gp-inline' : '') + '">' +
        '<div class="gp-bar">' +
          '<div class="gp-file"><svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>' +
            '<div class="gp-file-txt"><h3 class="gp-title">' + esc(g.title) + '</h3></div></div>' +
        '</div>' +
        '<div class="gp-scroll" tabindex="0" aria-label="Guide preview, scrollable">' +
          '<div class="gp-doc">' +
            '<div class="gp-sheet" data-page="1"><img src="' + base + '-p1.webp" width="' + P_W + '" height="' + P1_H + '" alt="' + esc(g.title) + ' guide, cover" draggable="false"' + (inline ? ' loading="lazy"' : '') + '></div>' +
            '<div class="gp-sheet gp-half" data-page="2"><img src="' + base + '-p2.webp" width="' + P_W + '" height="' + P2_H + '" alt="' + esc(g.title) + ' guide, page 2 (preview)" draggable="false"' + (inline ? ' loading="lazy"' : '') + '></div>' +
            '<div class="gp-lock"><div class="gp-lock-ico">' + LOCK_ICO + '</div>' +
              '<h4>The preview ends here</h4>' +
              '<p>Unlock all ' + g.pages + ' pages: full routine, product checklist, week-by-week plan, tracker and FAQ. Instant PDF download.</p></div>' +
            '<div class="gp-spacer"></div>' +
          '</div>' +
        '</div>' +
        '<div class="gp-hint" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>Scroll to read the preview</div>' +
        '<div class="gp-buybar"><div class="gp-price">' + price + '</div>' +
          '<a class="gp-buy" data-no-preview href="' + esc(href) + '">' + LOCK_ICO + 'Unlock the full guide</a></div>' +
      '</div>';
  }

  /* wires scrolling behaviour; returns a cleanup function */
  function wire(modal, inline) {
    var scroller = modal.querySelector('.gp-scroll');
    var doc = modal.querySelector('.gp-doc');

    function unlock() { modal.classList.add('gp-unlocked'); }

    /* reveal the buy bar once the reader reaches the middle of page 2 */
    function onScroll() {
      var st = scroller.scrollTop, vh = scroller.clientHeight;
      var max = scroller.scrollHeight - vh;
      if (max <= 4 || st >= max - 80) unlock();
    }
    scroller.addEventListener('scroll', onScroll, { passive: true });

    /* soft elastic resistance when trying to scroll past the end
       (inline: only a light bounce, the page keeps scrolling normally) */
    var pull = 0, releaseT = null, touchY = null;
    var maxPull = inline ? 40 : 90;
    function atEnd() { return scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2; }
    function setPull(px) {
      pull = Math.max(0, Math.min(px, maxPull));
      doc.classList.add('gp-pull');
      doc.style.transform = 'translateY(' + (-pull * 0.55) + 'px)';
    }
    function release() {
      pull = 0;
      doc.classList.remove('gp-pull');
      doc.style.transform = '';
    }
    function onWheel(e) {
      if (e.deltaY > 0 && atEnd()) {
        unlock();
        if (inline) { if (!pull) { setPull(28); clearTimeout(releaseT); releaseT = setTimeout(release, 120); } return; }
        e.preventDefault();
        setPull(pull + Math.min(e.deltaY, 40) * 0.35);
        clearTimeout(releaseT);
        releaseT = setTimeout(release, 140);
      }
    }
    scroller.addEventListener('wheel', onWheel, { passive: !!inline });
    scroller.addEventListener('touchstart', function (e) { touchY = e.touches[0].clientY; }, { passive: true });
    scroller.addEventListener('touchmove', function (e) {
      if (touchY === null) return;
      var dy = touchY - e.touches[0].clientY;
      if (dy > 0 && atEnd()) { unlock(); setPull(dy * 0.5); }
    }, { passive: true });
    scroller.addEventListener('touchend', function () { touchY = null; if (pull) release(); }, { passive: true });

    /* if everything fits without scrolling, show the button right away */
    function checkFit() { if (!scroller.clientHeight) return; if (scroller.scrollHeight <= scroller.clientHeight + 4) unlock(); onScroll(); }
    modal.querySelectorAll('img').forEach(function (im) { im.addEventListener('load', checkFit); });
    window.addEventListener('resize', checkFit);
    modal.addEventListener('contextmenu', function (e) { if (e.target.closest('.gp-sheet')) e.preventDefault(); });
    requestAnimationFrame(checkFit);
    /* re-check when the viewer becomes visible (e.g. quiz result step shown later) */
    var ro = window.ResizeObserver ? new ResizeObserver(checkFit) : null;
    if (ro) ro.observe(scroller);
    return function () { window.removeEventListener('resize', checkFit); clearTimeout(releaseT); if (ro) ro.disconnect(); };
  }

  /* ── Inline viewer (e.g. quiz result): <div data-gp-inline data-href="…cart url…"> ── */
  function mount(el) {
    if (!el) return;
    if (el._gpStop) { el._gpStop(); el._gpStop = null; }
    var href = el.getAttribute('data-href');
    var g = guideFor(href);
    if (!g) { el.innerHTML = ''; el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = viewerHTML(g, href, true);
    var nobuy = el.hasAttribute('data-gp-nobuy');
    if (nobuy) el.firstChild.classList.add('gp-nobuy');
    el._gpStop = wire(el.firstChild, true);
    if (nobuy) return;
    var vm = /\/cart\/(\d+):/.exec(href || '');
    if (vm && window.ssmTrack && window.ssmProductParams) {
      var p = window.ssmProductParams(vm[1]); p.content_category = 'guide_preview';
      window.ssmTrack('ViewContent', p);
    }
  }
  window.SkinPreview = { mount: mount };
  document.querySelectorAll('[data-gp-inline][data-href]').forEach(mount);

})();
