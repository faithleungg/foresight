/* Company page, "Our vision" art: a live glyph field.
   The pattern is rebuilt from assets/company/vision.png: the image is sampled into a grid,
   and each cell becomes a glyph whose character and opacity follow the image's brightness,
   so at rest it looks like the original artwork.
   Hover is a flat, dispersed trail (Agentation notes, after the appliedcompute.com hero): the grid
   faintly shows around the cursor, and scattered cells along its path light up as mint "." or "-"
   glyphs (the pattern's own characters) of random strength that fade out over about a second.
   Nothing moves, scales or bulges.
   Colours come from --glyph (glyphs) and --pixel (lit cells) on the host element.
   Used twice on the Company page: the vision art (.co-vision-art) and, dimmed behind the text,
   the founder-letter heading cell and the rail beside it (.co-letter-field; Agentation notes). */
(function () {
  if (!window.HTMLCanvasElement) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SRC = 'assets/company/vision.png';
  var CELL = 9;                 // px between glyph centres (matches the original pitch)
  var RAMP = '.:-+o0O8$@';      // light to dense
  var LIGHT_R = 40;             // px: cells this close to the cursor's path may light up (a touch tighter, Agentation note)
  var GRID_R = 56;              // px: the grid outline shows within this distance of the cursor
  var FADE = 1.1;               // lit cells fade out over about this many seconds
  var GRID_FADE = 3;            // grid outline fades faster

  // opts.cover: always fill the box ("cover"); opts.dim: glyph opacity factor;
  // opts.window: track the pointer over the whole page (the host lets clicks through to the text);
  // opts.fadeRight: fraction of the width over which the pattern lightens toward the right edge;
  // opts.avoid: an element the pattern lightens around (still continuous behind it);
  // opts.mask: an <img> under the canvas; glyphs only show on cells where it is plain background
  // (its corner colour), so the field reads as sitting behind whatever the image shows
  function field(art, opts) {
  if (!art) return;
  opts = opts || {};

  var canvas = document.createElement('canvas');
  canvas.className = 'co-vision-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  var img = new Image();
  var W = 0, H = 0, dpr = 1, cols = 0, rows = 0;
  var glyphColor = '#fff', pixelColor = '#96dddc';
  var cellGlyph = [], open = null;           // per cell: null or { ch, a }
  var heat, grid, litCh;        // per cell: lit strength, grid-outline strength (0..1), lit character
  var LIT = '.-';
  var mouse = { x: 0, y: 0, on: false, has: false }, raf = 0, last = 0;

  // Where the source image sits inside the box, matching the CSS it replaces:
  // desktop "left bottom / 150% auto", phones "center bottom / cover".
  function placement() {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var cover = opts.cover || window.matchMedia('(max-width: 900px)').matches;
    var s = cover ? Math.max(W / iw, H / ih) : (1.5 * W) / iw;
    var dw = iw * s, dh = ih * s;
    return { x: cover ? (W - dw) / 2 : 0, y: H - dh, w: dw, h: dh };
  }

  function build() {
    var b = art.getBoundingClientRect();
    W = Math.max(1, Math.round(b.width)); H = Math.max(1, Math.round(b.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    var cs = getComputedStyle(art);
    glyphColor = cs.getPropertyValue('--glyph').trim() || '#fff';
    pixelColor = cs.getPropertyValue('--pixel').trim() || '#96dddc';

    // Sample: draw the placed image onto a grid-sized canvas, one pixel per cell.
    cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL);
    var p = placement();
    var s = document.createElement('canvas'); s.width = cols; s.height = rows;
    var sc = s.getContext('2d', { willReadFrequently: true });
    sc.imageSmoothingQuality = 'high';
    sc.drawImage(img, p.x / CELL, p.y / CELL, p.w / CELL, p.h / CELL);
    var data = sc.getImageData(0, 0, cols, rows).data;

    // Cell values, normalised to the brightest cell so small glyphs in the source don't wash out.
    var n = cols * rows, vals = new Float32Array(n), vmax = 0;
    for (var j = 0; j < n; j++) {
      var q = j * 4;
      vals[j] = ((data[q] + data[q + 1] + data[q + 2]) / 765) * (data[q + 3] / 255);
      if (vals[j] > vmax) vmax = vals[j];
    }
    open = null;
    if (opts.mask && opts.mask.naturalWidth) {
      // Check every pixel (not a per-cell average: grey bar + white card averages out to paper),
      // and run right up to the UI (soft drop shadows count as paper; Agentation note).
      var mc = document.createElement('canvas'); mc.width = W; mc.height = H;
      var mx = mc.getContext('2d', { willReadFrequently: true });
      mx.drawImage(opts.mask, 0, 0, W, H);   // the image fills the box
      var md = mx.getImageData(0, 0, W, H).data;
      var q0 = (4 * W + 4) * 4, r0 = md[q0], g0 = md[q0 + 1], b0 = md[q0 + 2];   // paper colour, inside the rounded corner
      var busy = new Uint8Array(n);
      for (var py = 0; py < H; py++) for (var px = 0; px < W; px++) {
        var e = (py * W + px) * 4;
        if (Math.abs(md[e] - r0) + Math.abs(md[e + 1] - g0) + Math.abs(md[e + 2] - b0) > 30) busy[Math.floor(py / CELL) * cols + Math.floor(px / CELL)] = 1;
      }
      // open = paper cells connected to the box edge, so grey bars inside the cards stay clear
      open = new Uint8Array(n);
      var stack = [];
      for (var o = 0; o < n; o++) {
        var ox = o % cols, oy = Math.floor(o / cols);
        if ((ox === 0 || oy === 0 || ox === cols - 1 || oy === rows - 1) && !busy[o]) { open[o] = 1; stack.push(o); }
      }
      while (stack.length) {
        var c = stack.pop(), cx0 = c % cols, cy0 = Math.floor(c / cols);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = cx0 + d[0], ny = cy0 + d[1];
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
          var ni = ny * cols + nx;
          if (!open[ni] && !busy[ni]) { open[ni] = 1; stack.push(ni); }
        });
      }
    }
    var av = null;
    if (opts.avoid) {
      var ab = opts.avoid.getBoundingClientRect(), hb = art.getBoundingClientRect();
      av = { l: ab.left - hb.left, r: ab.right - hb.left, t: ab.top - hb.top, b: ab.bottom - hb.top };
    }
    cellGlyph = new Array(n);
    for (var i = 0; i < n; i++) {
      var v = vmax > 0 ? Math.pow(vals[i] / vmax, 0.8) : 0;
      // Lighten (not clear) near the text: scale the sampled brightness down, so glyphs step to lighter
      // characters and fainter alpha but the pattern stays continuous behind it (Agentation notes).
      var k = 1;
      if (av) {
        var gx = ((i % cols) + 0.5) * CELL, gy = (Math.floor(i / cols) + 0.5) * CELL;
        var ddx = Math.max(av.l - gx, 0, gx - av.r), ddy = Math.max(av.t - gy, 0, gy - av.b);
        var f = Math.min(1, Math.sqrt(ddx * ddx + ddy * ddy) / 140);
        k = 0.5 + 0.5 * f * f * (3 - 2 * f);
      }
      if (opts.fadeRight) {
        var fr = Math.min(1, Math.max(0, (1 - ((i % cols) + 0.5) * CELL / W) / opts.fadeRight));
        k *= 0.45 + 0.55 * fr;
      }
      v *= k;
      if (opts.thin) {
        // spread out: keep a stable share of cells (hash per cell, so a resize doesn't reshuffle) and lighten (Agentation note)
        var hsh = Math.sin((i % cols) * 12.9898 + Math.floor(i / cols) * 78.233) * 43758.5453;
        if (hsh - Math.floor(hsh) > opts.thin) v = 0;
        else v *= 0.8;
      }
      cellGlyph[i] = v < 0.12 || (open && !open[i]) ? null : { ch: RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))], a: (0.45 + 0.55 * v) * (opts.dim || 1) };
    }
    heat = new Float32Array(n); grid = new Float32Array(n); litCh = new Uint8Array(n);
    draw();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Grid outline near the cursor
    ctx.strokeStyle = glyphColor; ctx.lineWidth = 1 / dpr;
    for (var i = 0; i < grid.length; i++) {
      if (grid[i] < 0.02 || (open && !open[i])) continue;
      ctx.globalAlpha = 0.16 * grid[i];
      ctx.strokeRect((i % cols) * CELL + 0.5 / dpr, Math.floor(i / cols) * CELL + 0.5 / dpr, CELL - 1 / dpr, CELL - 1 / dpr);
    }

    // Glyphs (hidden where a cell is lit)
    ctx.fillStyle = glyphColor;
    ctx.font = '10px "Geist Mono", ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var k = 0; k < cellGlyph.length; k++) {
      var g = cellGlyph[k];
      if (!g) continue;
      var a = g.a * (1 - heat[k]);
      if (a < 0.01) continue;
      ctx.globalAlpha = a;
      ctx.fillText(g.ch, (k % cols) * CELL + CELL / 2, Math.floor(k / cols) * CELL + CELL / 2);
    }

    // Lit cells: a mint "." or "-" in place of the glyph
    ctx.fillStyle = pixelColor;
    ctx.font = '500 11px "Geist Mono", ui-monospace, Menlo, monospace';
    for (var m = 0; m < heat.length; m++) {
      if (heat[m] < 0.02) continue;
      ctx.globalAlpha = heat[m];
      ctx.fillText(LIT[litCh[m]], (m % cols) * CELL + CELL / 2, Math.floor(m / cols) * CELL + CELL / 2);
    }
    ctx.globalAlpha = 1;
  }

  // Light cells around one point on the cursor's path
  function ignite(x, y) {
    var r = Math.ceil(LIGHT_R / CELL);
    var cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (var yy = cy - r; yy <= cy + r; yy++) {
      if (yy < 0 || yy >= rows) continue;
      for (var xx = cx - r; xx <= cx + r; xx++) {
        if (xx < 0 || xx >= cols) continue;
        var dx = (xx + 0.5) * CELL - x, dy = (yy + 0.5) * CELL - y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > LIGHT_R) continue;
        if (Math.random() < 0.04 * Math.sqrt(1 - d / LIGHT_R)) {      // sparse and spread wide
          var i = yy * cols + xx;
          if (open && !open[i]) continue;
          if (heat[i] < 0.05) litCh[i] = Math.random() < 0.5 ? 0 : 1;
          heat[i] = Math.max(heat[i], 0.35 + Math.random() * 0.65);
        }
      }
    }
  }

  function step(t) {
    raf = 0;
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t;
    var active = false;
    var gr = Math.ceil(GRID_R / CELL), cx = Math.floor(mouse.x / CELL), cy = Math.floor(mouse.y / CELL);
    for (var i = 0; i < heat.length; i++) {
      if (heat[i] > 0) { heat[i] = Math.max(0, heat[i] - dt / FADE); active = true; }
      var target = 0;
      if (mouse.on) {
        var x = i % cols, y = Math.floor(i / cols);
        if (Math.abs(x - cx) <= gr && Math.abs(y - cy) <= gr) {
          var dx = (x + 0.5) * CELL - mouse.x, dy = (y + 0.5) * CELL - mouse.y;
          target = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / GRID_R);
        }
      }
      if (target > grid[i]) grid[i] = target;
      else if (grid[i] > 0) grid[i] = Math.max(target, grid[i] - dt * GRID_FADE);
      if (grid[i] > 0) active = true;
    }
    draw();
    if (active || mouse.on) raf = requestAnimationFrame(step);
    else last = 0;
  }
  function kick() { if (!raf && !reduce) raf = requestAnimationFrame(step); }

  function setMouse(e) {
    if (!heat) return;
    var b = art.getBoundingClientRect();
    var x = e.clientX - b.left, y = e.clientY - b.top;
    if (opts.window && (x < 0 || y < 0 || x > b.width || y > b.height)) {
      if (mouse.on) { mouse.on = false; kick(); }
      return;
    }
    if (mouse.has && mouse.on) {
      // light every few px along the segment, so fast moves leave a continuous trail
      var dx = x - mouse.x, dy = y - mouse.y, n = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / (CELL / 2)));
      for (var s = 1; s <= n; s++) ignite(mouse.x + dx * s / n, mouse.y + dy * s / n);
    } else ignite(x, y);
    mouse.x = x; mouse.y = y; mouse.on = true; mouse.has = true; kick();
  }
  if (opts.window) {
    window.addEventListener('pointermove', setMouse, { passive: true });
    document.addEventListener('pointerleave', function () { mouse.on = false; kick(); });
  } else {
    art.addEventListener('pointermove', setMouse);
    art.addEventListener('pointerenter', function (e) { mouse.on = false; setMouse(e); });
    art.addEventListener('pointerleave', function () { mouse.on = false; kick(); });
  }

  img.onload = function () {
    if (opts.mask && !opts.mask.complete) { opts.mask.addEventListener('load', img.onload, { once: true }); return; }
    art.appendChild(canvas);
    art.classList.add('is-live');
    var t = 0;
    new ResizeObserver(function () { clearTimeout(t); t = setTimeout(build, 60); }).observe(art);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    build();
  };
  img.src = SRC;
  }

  field(document.querySelector('.co-vision-art'));
  // Teal: black rail chunk beside the letter, glyph field in it (Agentation note)
  field(document.querySelector('.co-letter-railfield'), { cover: true, window: true, thin: 0.4 });
  field(document.querySelector('.co-letter-field'), { cover: true, dim: 1, window: true, fadeRight: 0.55, avoid: document.querySelector('#letter-h') });
  // Care Management: behind the three UI mockups (Agentation note)
  document.querySelectorAll('.cm-tile-art').forEach(function (el) {
    field(el, { cover: true, dim: 0.15, mask: el.querySelector('img') });
  });
})();
