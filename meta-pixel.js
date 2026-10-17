/* Meta Pixel: click & interaction tracking for Skin System for Men */
(function () {
  var PRODUCTS = {
    '64842750951801': { name: 'Oily skin & acne', full: 29.90, promo: 23.92 },
    '64842765959545': { name: 'First signs of aging', full: 29.90, promo: 23.92 },
    '64842766975353': { name: 'Razor burn & irritation', full: 29.90, promo: 23.92 },
    '64842772316537': { name: 'Dull, tired-looking skin', full: 29.90, promo: 23.92 },
    '64842773234041': { name: 'Enlarged pores & texture', full: 29.90, promo: 23.92 },
    '64842773627257': { name: 'Maintenance routine', full: 29.90, promo: 23.92 },
    '64842773922169': { name: 'All 6 guides bundle', full: 119.90, promo: 95.92 }
  };

  function track(type, event, params) {
    if (typeof window.fbq === 'function') window.fbq(type, event, params || {});
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';

    // Buy buttons -> Shopify cart
    var m = href.match(/myshopify\.com\/cart\/(\d+)/);
    if (m) {
      var p = PRODUCTS[m[1]] || { name: 'Guide', full: 29.90, promo: 23.92 };
      var promoOn = !document.documentElement.classList.contains('promo-ended');
      track('track', 'InitiateCheckout', {
        content_ids: [m[1]],
        content_name: p.name,
        content_type: 'product',
        num_items: 1,
        value: promoOn ? p.promo : p.full,
        currency: 'USD'
      });
      return;
    }

    // Quiz entry points
    if (/quiz\.html|#quiz-spot/.test(href)) {
      track('trackCustom', 'QuizClick', { location: location.pathname });
    }
  }, true);
})();
