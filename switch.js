/* Preview switch (not part of the site): floating Dark / Hybrid / Light / Gradient toggle.
   Each version lives in its own folder (dark/, hybrid/, light/, gradient/); this jumps to the same page and
   scroll position in another version. Works from any base path (e.g. GitHub Pages /<repo>/). */
(function () {
  var VERSIONS = ['dark', 'hybrid', 'light', 'gradient'];
  var m = location.pathname.match(/^(.*\/)(dark|hybrid|light|gradient)\/(.*)$/);
  if (!m) return;
  var base = m[1], cur = m[2], rest = m[3];

  try {
    var y = sessionStorage.getItem('mode-switch-y');
    if (y !== null) { sessionStorage.removeItem('mode-switch-y'); addEventListener('load', function () { scrollTo(0, +y); }); }
  } catch (e) {}

  var css = document.createElement('style');
  css.textContent =
    '#mode-switch{position:fixed;z-index:2147483000;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:2px;padding:3px;' +
    'border-radius:999px;background:rgba(20,20,20,.82);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);' +
    'box-shadow:0 4px 18px rgba(0,0,0,.25),inset 0 0 0 1px rgba(255,255,255,.12);font:500 12px/1 -apple-system,BlinkMacSystemFont,Inter,sans-serif;letter-spacing:.01em}' +
    '#mode-switch button{all:unset;cursor:pointer;padding:8px 14px;border-radius:999px;color:rgba(255,255,255,.7);transition:background .15s,color .15s}' +
    '#mode-switch button:hover{color:#fff;background:rgba(255,255,255,.08)}' +
    '#mode-switch button[aria-pressed="true"]{color:#111;background:#fff}' +
    '#mode-switch button:focus-visible{outline:2px solid #96dddc;outline-offset:1px}';
  document.head.appendChild(css);

  var bar = document.createElement('div');
  bar.id = 'mode-switch';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Preview version (not part of the site)');
  VERSIONS.forEach(function (v) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = v.charAt(0).toUpperCase() + v.slice(1);
    if (v === cur) b.setAttribute('aria-pressed', 'true');
    b.addEventListener('click', function () {
      if (v === cur) return;
      try { sessionStorage.setItem('mode-switch-y', String(scrollY)); } catch (e) {}
      location.href = base + v + '/' + rest + location.search + location.hash;
    });
    bar.appendChild(b);
  });
  document.body.appendChild(bar);
})();
