/* ── Skin System Men — shared guide data ──
   One source for the guide modal (index), the quiz result preview and analytics.
   Cart URLs are the EXISTING Shopify links (do not edit here unless they change in Shopify).
   Page counts and tables of contents come from the actual PDF guides.
   Covers: pre-rendered page 1 of each PDF (preview-guide-N-p1.webp). */
(function () {
  var SHOP = 'https://0qv1z1-ag.myshopify.com/cart/';
  var INCLUDED = ['Printable one-page cheat sheet', '6-week progress tracker', 'PDF, instant download'];

  /* sections shared by every guide (same order in all PDFs) */
  function toc(phases, extraFirst) {
    return [].concat(
      ['The plan in 30 seconds', 'What to buy: your shopping list'],
      extraFirst || [],
      phases,
      ['How to apply your products', 'The right order, every time', 'How to track your results',
       'If something goes wrong (troubleshooting)', 'Your 6 weeks on one page (printable cheat sheet)']
    );
  }

  var LIST = [
    {
      slug: 'oily-acne', key: 'acne', n: 1, variantId: '64842750951801',
      name: 'Oily skin & acne', pdfTitle: 'Oily & Acne-Prone Skin', zone: 'Cheeks',
      pages: 11,
      whoFor: 'Your face gets shiny a few hours after washing, and blackheads or breakouts keep coming back, especially on the T-zone.',
      toc: toc(['Phase 1 · Weeks 1–2: Get started', 'Phase 2 · Weeks 3–4: Treat', 'Phase 3 · Weeks 5–6: Lock it in'])
    },
    {
      slug: 'early-aging', key: 'aging', n: 2, variantId: '64842765959545',
      name: 'First signs of aging', pdfTitle: 'Early Signs of Aging', zone: 'Eye area',
      pages: 11,
      whoFor: "You're starting to notice fine lines or expression lines, or your skin feels less firm than it did a few years ago.",
      toc: toc(['Phase 1 · Weeks 1–2: Protect', 'Phase 2 · Weeks 3–4: Start retinol', 'Phase 3 · Weeks 5–6: Lock it in'])
    },
    {
      slug: 'razor-irritation', key: 'shaving', n: 3, variantId: '64842766975353',
      name: 'Razor burn & irritation', pdfTitle: 'Razor-Irritated Skin', zone: 'Jawline & beard area',
      pages: 12,
      whoFor: 'Shaving leaves you with redness, burning, razor bumps or ingrown hairs.',
      toc: toc(['Phase 1 · Weeks 1–2: Calm down', 'Phase 2 · Weeks 3–4: Prevent', 'Phase 3 · Weeks 5–6: Lock it in'],
               ['How to shave without irritation'])
    },
    {
      slug: 'dull-skin', key: 'dullness', n: 4, variantId: '64842772316537',
      name: 'Dull, tired-looking skin', pdfTitle: 'Dull Skin & Uneven Tone', zone: 'Forehead',
      pages: 11,
      whoFor: 'Your skin looks dull, tired or uneven, even after a good night\'s sleep.',
      toc: toc(['Phase 1 · Weeks 1–2: Rehydrate', 'Phase 2 · Weeks 3–4: Exfoliate', 'Phase 3 · Weeks 5–6: Lock it in'])
    },
    {
      slug: 'pores-texture', key: 'pores', n: 5, variantId: '64842773234041',
      name: 'Enlarged pores & texture', pdfTitle: 'Enlarged Pores & Texture', zone: 'Nose',
      pages: 11,
      whoFor: 'Your pores look bigger than you\'d like, especially on the nose, and your skin texture feels uneven.',
      toc: toc(['Phase 1 · Weeks 1–2: Prepare', 'Phase 2 · Weeks 3–4: Clear pores', 'Phase 3 · Weeks 5–6: Lock it in'])
    },
    {
      slug: 'maintenance', key: 'maintenance', n: 6, variantId: '64842773627257',
      name: 'Maintenance routine', pdfTitle: 'Maintenance Routine', zone: 'No specific issue',
      pages: 11,
      whoFor: 'Nothing specific to fix: you want a simple, correct routine that keeps your skin balanced and heads off problems before they start.',
      toc: toc(['Phase 1 · Weeks 1–2: Build the habit', 'Phase 2 · Weeks 3–4: Light exfoliation', 'Phase 3 · Weeks 5–6: Fine-tune'])
    }
  ];

  LIST.forEach(function (g) {
    g.cartUrl = SHOP + g.variantId + ':1?discount=SKIN20';
    g.price = 29.90;        // regular price (as shown on the page)
    g.salePrice = 23.92;    // launch price, until Oct 31, 2026
    g.cover = 'preview-guide-' + g.n + '-p1.webp';
    g.included = INCLUDED;
  });

  var BUNDLE = {
    slug: 'all-guides', variantId: '64842773922169', name: 'All 6 guides bundle',
    cartUrl: SHOP + '64842773922169:1?discount=SKIN20', price: 119.90, salePrice: 95.92
  };

  function find(field, value) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i][field] === value) return LIST[i];
    return null;
  }

  window.SSM_GUIDES = {
    list: LIST,
    bundle: BUNDLE,
    bySlug: function (s) { return find('slug', s); },
    byKey: function (k) { return find('key', k); },
    byVariant: function (id) { return find('variantId', String(id)) || (String(id) === BUNDLE.variantId ? BUNDLE : null); },
    byCartUrl: function (href) { var m = /\/cart\/(\d+):/.exec(href || ''); return m ? find('variantId', m[1]) : null; },
    promoActive: function () { return !document.documentElement.classList.contains('promo-ended'); }
  };
})();
