/* ── Reviews: renders data/reviews.json (real reviews only) ──
   - #reviews stays hidden while the file is empty, missing or invalid
   - window.SSM_REVIEWS.summaryFor(guide) → { count, average } for the guide modal
   - incentivized reviews show "Received a free guide for an honest review" */
(function () {
  var state = { list: [], loaded: false };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function valid(r) {
    return r && typeof r.name === 'string' && r.name.trim() && typeof r.text === 'string' && r.text.trim() &&
      typeof r.guide === 'string' && Number(r.rating) >= 1 && Number(r.rating) <= 5 && typeof r.incentivized === 'boolean';
  }
  function guideOf(r) {
    var G = window.SSM_GUIDES; if (!G) return null;
    var key = String(r.guide).trim();
    if (key === 'all-guides' || /bundle/i.test(key)) return G.bundle;
    return G.bySlug(key) || G.list.filter(function (g) { return g.name.toLowerCase() === key.toLowerCase(); })[0] || null;
  }
  function stars(n) {
    n = Math.round(Number(n));
    return '<span class="rv-stars" role="img" aria-label="Rated ' + n + ' out of 5">' + '★★★★★'.slice(0, n) + '<span aria-hidden="true">' + '★★★★★'.slice(n) + '</span></span>';
  }
  function fmtDate(d) {
    var t = Date.parse(d); if (isNaN(t)) return '';
    return new Date(t).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function render() {
    var sec = document.getElementById('reviews');
    var grid = sec && sec.querySelector('[data-reviews-grid]');
    if (!sec || !grid) return;
    if (!state.list.length) { sec.hidden = true; return; }
    grid.innerHTML = state.list.map(function (r) {
      var g = guideOf(r);
      var date = fmtDate(r.date);
      return '<figure class="rv-card">' +
        stars(r.rating) +
        '<blockquote class="rv-text">' + esc(r.text) + '</blockquote>' +
        '<figcaption class="rv-meta">' +
          (r.photo ? '<img class="rv-photo" src="' + esc(r.photo) + '" alt="" width="44" height="44" loading="lazy">' : '') +
          '<span><b>' + esc(r.name) + '</b>' + (r.location ? ' · ' + esc(r.location) : '') +
          (g ? '<span class="rv-guide">' + esc(g.name) + '</span>' : '') +
          (date ? '<span class="rv-date">' + esc(date) + '</span>' : '') + '</span>' +
        '</figcaption>' +
        (r.incentivized ? '<p class="rv-disclosure">Received a free guide for an honest review</p>' : '') +
      '</figure>';
    }).join('');
    sec.hidden = false;
  }

  window.SSM_REVIEWS = {
    get list() { return state.list.slice(); },
    summaryFor: function (guide) {
      if (!guide) return null;
      var rs = state.list.filter(function (r) { var g = guideOf(r); return g && g.slug === guide.slug; });
      if (!rs.length) return null;
      var sum = rs.reduce(function (a, r) { return a + Number(r.rating); }, 0);
      return { count: rs.length, average: sum / rs.length };
    }
  };

  fetch('data/reviews.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (data) {
      state.list = Array.isArray(data) ? data.filter(valid) : [];
      state.loaded = true;
      render();
    })
    .catch(function () { state.loaded = true; render(); });
})();
