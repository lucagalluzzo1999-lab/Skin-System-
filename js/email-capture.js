/* ── Optional email capture card ("free 1-page routine cheat sheet") ──
   SSMEmailCard.render(container, { skinType, guide, source })
   - never blocks the result: the card sits under it and can be dismissed
   - POSTs to SSM_CONFIG.SUBSCRIBE_ENDPOINT (/api/subscribe)
   - honeypot field "company" (bots fill it, humans never see it)
   - fires the Meta "Lead" event on success (only if cookies were accepted) */
(function () {
  var uid = 0;

  function validEmail(v) { return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function render(container, ctx) {
    if (!container) return;
    ctx = ctx || {};
    var id = 'ec' + (++uid);
    container.hidden = false;
    container.innerHTML =
      '<section class="email-card" aria-labelledby="' + id + '-t">' +
        '<div class="email-card-body">' +
          '<h3 class="email-card-title" id="' + id + '-t">Want your free 1-page routine cheat sheet?</h3>' +
          '<p class="email-card-sub">We\'ll email it with your results.</p>' +
          '<form class="email-card-form" novalidate>' +
            '<label class="sr-only" for="' + id + '-e">Email address</label>' +
            '<input class="email-card-input" id="' + id + '-e" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required aria-describedby="' + id + '-s ' + id + '-m">' +
            '<div class="email-card-hp" aria-hidden="true"><label for="' + id + '-c">Company</label><input id="' + id + '-c" name="company" type="text" tabindex="-1" autocomplete="off"></div>' +
            '<button class="email-card-btn" type="submit">Send it</button>' +
          '</form>' +
          '<p class="email-card-status" id="' + id + '-s" role="status" aria-live="polite"></p>' +
          '<div class="email-card-foot"><span class="email-card-micro" id="' + id + '-m">No spam. Unsubscribe anytime.</span>' +
            '<button type="button" class="email-card-dismiss">No thanks</button></div>' +
        '</div>' +
      '</section>';

    var card = container.firstChild;
    var form = card.querySelector('form');
    var input = card.querySelector('.email-card-input');
    var hp = card.querySelector('[name="company"]');
    var btn = card.querySelector('.email-card-btn');
    var status = card.querySelector('.email-card-status');

    function setStatus(msg, kind) {
      status.textContent = msg;
      status.className = 'email-card-status' + (kind ? ' is-' + kind : '');
    }

    card.querySelector('.email-card-dismiss').addEventListener('click', function () {
      card.classList.add('is-collapsed');
      setTimeout(function () { container.hidden = true; container.innerHTML = ''; }, 280);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!validEmail(email)) {
        input.setAttribute('aria-invalid', 'true');
        setStatus('Please enter a valid email address.', 'error');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      btn.disabled = true; btn.textContent = 'Sending…';
      setStatus('', '');

      var endpoint = (window.SSM_CONFIG && window.SSM_CONFIG.SUBSCRIBE_ENDPOINT) || '/api/subscribe';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          company: hp.value,
          skin_type: ctx.skinType || '',
          guide: ctx.guide || '',
          source: ctx.source || ''
        })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, data: d }; });
      }).then(function (res) {
        if (!res.ok || !res.data.ok) throw new Error(res.data.error || 'Something went wrong. Please try again.');
        card.classList.add('is-done');
        form.hidden = true;
        card.querySelector('.email-card-foot').hidden = true;
        setStatus('Done! Check your inbox for your cheat sheet.', 'success');
        if (window.ssmTrack) window.ssmTrack('Lead', { content_name: ctx.guide || '', content_category: ctx.source || '' });
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'Send it';
        setStatus(err && err.message && err.message.length < 140 ? err.message : 'Something went wrong. Please try again.', 'error');
      });
    });
  }

  window.SSMEmailCard = { render: render };
})();
