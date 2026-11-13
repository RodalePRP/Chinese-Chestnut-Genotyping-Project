/* Shared data-visualization helpers: one categorical palette used across pages so a
   maternal family or species keeps the same color everywhere. */
(function () {
  var PALETTE = ['#1f6f5c', '#d4793a', '#3b6fb6', '#c2477a', '#8a9a2b', '#7a4fa8', '#2a9db0', '#b5872f', '#5b7f3a', '#a3563f', '#4d5fa3', '#c06c9c', '#3d8f7e', '#9c7b55', '#5f6b66', '#d1a33a'];
  var NONE = '#c9cfca';
  var maps = {};
  /** Assign colors to a list of category values in a stable order (by frequency, then name). */
  function scale(name, counts) {
    var keys = Object.keys(counts).filter(function (k) { return !isNone(k); })
      .sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
    var m = {}; keys.forEach(function (k, i) { m[k] = PALETTE[i % PALETTE.length]; });
    maps[name] = m; return m;
  }
  function isNone(k) { return !k || /^(not recorded|not given|unknown|none)$/i.test(k); }
  function color(name, value) { return isNone(value) ? NONE : ((maps[name] || {})[value] || NONE); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tip() {
    var t = document.getElementById('vizTip');
    if (!t) { t = document.createElement('div'); t.id = 'vizTip'; t.className = 'viz-tip'; t.hidden = true; document.body.appendChild(t); }
    return {
      show: function (html, e) { t.innerHTML = html; t.hidden = false; var x = e.clientX + 14, y = e.clientY + 14; var r = t.getBoundingClientRect(); if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14; t.style.left = x + 'px'; t.style.top = y + 'px'; },
      hide: function () { t.hidden = true; }
    };
  }
  window.Viz = { PALETTE: PALETTE, NONE: NONE, scale: scale, color: color, isNone: isNone, esc: esc, tip: tip };
})();
