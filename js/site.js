/* ── Skin System Men — small homepage enhancements ── */
(function () {
  var CFG = window.SSM_CONFIG || {};

  /* About block: story + optional founder photos from js/config.js */
  (function about() {
    var story = String(CFG.FOUNDERS_STORY || '').trim();
    var el = document.querySelector('[data-founders-story]');
    if (el && story && !/^PLACEHOLDER/i.test(story)) { el.textContent = story; el.hidden = false; }
    var photos = CFG.FOUNDER_PHOTOS || {};
    document.querySelectorAll('[data-founder]').forEach(function (slot) {
      var src = photos[slot.getAttribute('data-founder')];
      if (!src) return;
      var img = new Image();
      img.alt = '';
      img.width = 120; img.height = 120;
      img.loading = 'lazy';
      img.onload = function () { slot.textContent = ''; slot.appendChild(img); slot.classList.add('has-photo'); };
      img.src = src;
    });
  })();

  /* Mobile sticky CTA (< 768px): appears after the hero, hides over pricing,
     the footer, an open modal and the cookie banner */
  (function stickyCta() {
    var hero = document.querySelector('.hero');
    var blockers = [document.getElementById('pricing'), document.querySelector('footer')].filter(Boolean);
    if (!hero || !('IntersectionObserver' in window)) return;

    var bar = document.createElement('a');
    bar.className = 'sticky-cta';
    bar.href = 'quiz.html';
    bar.innerHTML = 'Take the free quiz — 2 min <span aria-hidden="true">→</span>';
    document.body.appendChild(bar);

    var mq = window.matchMedia('(max-width: 767.98px)');
    var pastHero = false, blocked = new Set();

    function update() {
      var html = document.documentElement;
      var show = mq.matches && pastHero && blocked.size === 0 &&
        !html.classList.contains('modal-open') && !html.classList.contains('consent-open');
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', String(!show));
      bar.tabIndex = show ? 0 : -1;
    }

    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; });
      update();
    }).observe(hero);

    var bo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) blocked.add(e.target); else blocked.delete(e.target); });
      update();
    });
    blockers.forEach(function (el) { bo.observe(el); });

    document.addEventListener('ssm:modal', update);
    document.addEventListener('ssm:consent', update);
    if (window.MutationObserver) new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    if (mq.addEventListener) mq.addEventListener('change', update); else if (mq.addListener) mq.addListener(update);
    update();
  })();
})();
