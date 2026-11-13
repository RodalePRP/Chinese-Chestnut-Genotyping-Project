/* Shared bridge between the static site and the Google Sheets backend (Apps Script web app). */
(function () {
  var cfg = window.CHESTNUT_CONFIG || {};
  var params = new URLSearchParams(location.search);
  var DEMO = !cfg.API_URL || params.get('demo') === '1';
  window.CHESTNUT_DEMO = DEMO;

  var demoReady = null;
  function loadDemo() {
    if (!demoReady) demoReady = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'assets/demo.js'; s.onload = res; s.onerror = function () { rej(new Error('Could not load demo data')); };
      document.head.appendChild(s);
    });
    return demoReady;
  }
  window.call = function (action) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (DEMO) {
      return loadDemo().then(function () {
        return new Promise(function (res, rej) { setTimeout(function () { try { res(window.DEMO_API[action].apply(null, args)); } catch (e) { rej(e); } }, 200); });
      });
    }
    // text/plain avoids a CORS preflight, which Apps Script does not answer.
    return fetch(cfg.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, args: args }), redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw new Error('Server responded ' + r.status); return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Request failed'); return j.data; });
  };
  window.getParams = function () { return Promise.resolve(Object.fromEntries(params)); };

  /* Access codes for restricted views (project team; research collaborators & NNGA members).
     The code is checked by the server on every request; it is kept in this browser until "Sign out". */
  var KEY = 'chestnut_access';
  var store = function (v) { try { if (v === undefined) return localStorage.getItem(KEY) || ''; if (v === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) { return ''; } };
  if (params.get('access')) store(params.get('access'));
  window.Access = {
    LABEL: { team: 'Project team', member: 'Research collaborators & NNGA members', public: 'Public' },
    code: function () { return store(); },
    signIn: function (code) {
      return window.call('checkAccess', code).then(function (r) {
        if (!r || r.role === 'public') throw new Error('That access code was not recognized.');
        store(code); window.__accessRole = r.role; return r.role;
      });
    },
    signOut: function () { store(null); window.__accessRole = 'public'; },
    resolve: function () {
      if (!store()) return Promise.resolve('public');
      if (window.__accessRole) return Promise.resolve(window.__accessRole);
      return window.call('checkAccess', store()).then(function (r) { window.__accessRole = r.role; if (r.role === 'public') store(null); return r.role; }).catch(function () { return 'public'; });
    }
  };

  if (DEMO) document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('div');
    b.setAttribute('role', 'status'); b.className = 'demo-banner';
    b.innerHTML = '<i></i>Preview · Rodale plates 001–002 · live database not connected';
    document.body.appendChild(b);
  });
})();
