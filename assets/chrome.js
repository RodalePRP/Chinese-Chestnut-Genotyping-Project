/* Shared utility bar, header, navigation and footer so every page stays consistent. */
(function () {
  var PAGES = [['index.html', 'Overview'], ['database.html', 'Database'], ['map.html', 'Field map'], ['analysis.html', 'Results'], ['submit.html', 'Submit trees', 'nav-cta']];
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var cfg = window.CHESTNUT_CONFIG || {};
  var MARK = '<svg class="brand-mark" viewBox="0 0 34 34" aria-hidden="true">' +
    '<rect width="34" height="34" rx="5" fill="#133326"/>' +
    '<path d="M17 6.2c-.8 0-1.5.45-1.9 1.2C13.2 10.9 7.3 14 7.3 20.3c0 5.1 4.4 8 9.7 8s9.7-2.9 9.7-8c0-6.3-5.9-9.4-7.8-12.9-.4-.75-1.1-1.2-1.9-1.2z" fill="#fff"/>' +
    '<path d="M7.6 22.3c1.4 3.7 5.2 6 9.4 6s8-2.3 9.4-6c-2.8 1.2-6 1.8-9.4 1.8s-6.6-.6-9.4-1.8z" fill="#d79a68"/></svg>';
  var BRAND = '<a class="brand" href="index.html">' + MARK + '<span class="brand-text"><span class="brand-name">Chestnut Genotyping Project</span><span class="brand-sub">Chinese chestnut germplasm in the US</span></span></a>';

  var h = document.getElementById('site-header');
  if (h) {
    var util = document.createElement('div');
    util.className = 'util-bar';
    util.innerHTML = '<div class="container"><span>A research collaboration of Rodale Institute and Savanna Institute</span><span class="util-right"><span class="hide-md">Supported by the Northern Nut Growers Association and the Edwards Mother Earth Foundation</span><button type="button" class="access-btn" data-access>Member access</button></span></div>';
    h.parentNode.insertBefore(util, h);
    h.className = 'site-header';
    h.innerHTML = '<div class="container">' + BRAND +
      '<button class="nav-toggle" aria-expanded="false" aria-controls="siteNav">Menu</button>' +
      '<nav class="site-nav" id="siteNav" aria-label="Primary">' + PAGES.map(function (p) {
        return '<a href="' + p[0] + '"' + (p[2] ? ' class="' + p[2] + '"' : '') + (p[0] === here ? ' aria-current="page"' : '') + '>' + p[1] + '</a>';
      }).join('') + '</nav></div>';
    var t = h.querySelector('.nav-toggle'), n = h.querySelector('.site-nav');
    t.onclick = function () { var o = n.classList.toggle('open'); t.setAttribute('aria-expanded', o); };
  }
  var f = document.getElementById('site-footer');
  if (f) {
    f.className = 'site-footer';
    f.innerHTML = '<div class="container">' +
      '<div>' + BRAND + '<p>Population-scale DArTag genotyping of Chinese chestnut germplasm to guide future breeding strategies.</p></div>' +
      '<div><h4>Project</h4><p><a href="index.html">Overview</a></p><p><a href="database.html">Tree database</a></p><p><a href="map.html">Field map</a></p><p><a href="analysis.html">Results</a></p><p><a href="submit.html">Submit trees</a></p><p><a href="policy.html">Data policy</a></p><p><a href="#" data-access>Member &amp; collaborator access</a></p></div>' +
      '<div><h4>Partners</h4><p>Rodale Institute</p><p>Savanna Institute</p><p>The American Chestnut Foundation (DArTag panel)</p></div>' +
      '<div><h4>Contact</h4><p>Dr. Richard Tegtmeier<br>Project Director</p>' + (cfg.CONTACT_EMAIL ? '<p><a href="mailto:' + cfg.CONTACT_EMAIL + '">Email the project team</a></p>' : '') + '</div>' +
      '<div class="privacy-line"><b>Data sharing.</b> Raw genotype data are released only on request and with the contributing breeder\'s permission, before publication. Genotype and phenotype visualizations and exact GPS positions are seen by the project team only, unless the breeder also releases them to research collaborators and NNGA members (access code required). <a href="policy.html">Read the data policy</a></div>' +
      '<div class="legal"><span>Funded by the Northern Nut Growers Association (2026) and the Edwards Mother Earth Foundation</span><span>Data managed by Rodale Institute</span></div></div>';
  }

  /* ---------- access-code sign-in (project team / research collaborators & NNGA members) ---------- */
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function refreshAccessLabels(role) {
    document.querySelectorAll('[data-access]').forEach(function (b) {
      if (b.tagName === 'BUTTON') b.innerHTML = role && role !== 'public' ? '<i class="dot-on"></i>' + esc(window.Access.LABEL[role]) : 'Member access';
    });
  }
  function openAccess() {
    var role = window.__accessRole || 'public';
    var m = document.getElementById('accessModal');
    if (!m) { m = document.createElement('div'); m.id = 'accessModal'; m.className = 'access-modal'; document.body.appendChild(m); }
    m.innerHTML = '<div class="access-card" role="dialog" aria-modal="true" aria-labelledby="accTitle">' +
      (role !== 'public'
        ? '<h3 id="accTitle">Signed in</h3><p>You are viewing as <b>' + esc(window.Access.LABEL[role]) + '</b>. You can see the data breeders have released to this group.</p><div class="acc-actions"><button class="btn secondary" data-close>Close</button><button class="btn" data-out>Sign out</button></div>'
        : '<h3 id="accTitle">Member &amp; collaborator access</h3><p>Research collaborators, NNGA members and the project team can enter their access code to see exact tree positions and results that breeders have released to them. <a href="policy.html">How access works</a></p>' +
          '<label for="accCode">Access code</label><input type="text" id="accCode" autocomplete="off" spellcheck="false"><p class="acc-err" id="accErr" hidden></p>' +
          '<div class="acc-actions"><button class="btn secondary" data-close>Cancel</button><button class="btn" data-in>Sign in</button></div>' +
          '<p class="acc-small">Need a code? ' + (cfg.CONTACT_EMAIL ? '<a href="mailto:' + cfg.CONTACT_EMAIL + '?subject=Chestnut%20genotyping%20access%20code">Ask the project team</a>' : 'Ask the project team') + '.</p>') +
      '</div>';
    m.hidden = false;
    var close = function () { m.hidden = true; };
    m.onclick = function (e) { if (e.target === m || e.target.hasAttribute('data-close')) close(); };
    var out = m.querySelector('[data-out]'); if (out) out.onclick = function () { window.Access.signOut(); location.reload(); };
    var go = m.querySelector('[data-in]'), inp = m.querySelector('#accCode');
    if (go) {
      var submit = function () {
        var code = inp.value.trim(); if (!code) return;
        go.disabled = true; go.textContent = 'Checking…';
        window.Access.signIn(code).then(function () { location.reload(); }).catch(function (e) { var er = m.querySelector('#accErr'); er.textContent = e.message || 'Could not check the code.'; er.hidden = false; go.disabled = false; go.textContent = 'Sign in'; });
      };
      go.onclick = submit; inp.onkeydown = function (e) { if (e.key === 'Enter') submit(); if (e.key === 'Escape') close(); };
      setTimeout(function () { inp.focus(); }, 30);
    }
  }
  window.openAccess = openAccess;
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-access]'); if (a) { e.preventDefault(); openAccess(); } });
  if (window.Access) window.Access.resolve().then(function (r) { window.__accessRole = r; refreshAccessLabels(r); document.documentElement.setAttribute('data-role', r); });
})();
