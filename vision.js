/* Company page, "Our vision" art: a live glyph field.
   The pattern is rebuilt from assets/company/vision.png: the image is sampled into a grid,
   and each cell becomes a glyph whose character and opacity follow the image's brightness,
   so at rest it looks like the original artwork. The cursor pushes glyphs away (they shrink
   and thin out near it) and they spring back when it leaves - the pattern is moved, not painted over.
   Colour comes from the --glyph custom property on .co-vision-art (white on black by default). */
(function () {
  var art = document.querySelector('.co-vision-art');
  if (!art || !window.HTMLCanvasElement) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SRC = 'assets/company/vision.png';
  var CELL = 9;                         // px between glyph centres (matches the original pitch)
  var RAMP = '.:-+o0O8$@';              // light to dense
  var RADIUS = 120, PUSH = 26;          // cursor reach and push distance (px)

  var canvas = document.createElement('canvas');
  canvas.className = 'co-vision-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  var img = new Image();
  var glyphs = [], W = 0, H = 0, dpr = 1, color = '#fff';
  var mouse = { x: -9999, y: -9999, on: false }, raf = 0;

  // Where the source image sits inside the box, matching the CSS it replaces:
  // desktop "left bottom / 150% auto", phones "center bottom / cover".
  function placement() {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var cover = window.matchMedia('(max-width: 900px)').matches;
    var s = cover ? Math.max(W / iw, H / ih) : (1.5 * W) / iw;
    var dw = iw * s, dh = ih * s;
    return { x: cover ? (W - dw) / 2 : 0, y: H - dh, w: dw, h: dh };
  }

  function build() {
    var b = art.getBoundingClientRect();
    W = Math.max(1, Math.round(b.width)); H = Math.max(1, Math.round(b.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    color = getComputedStyle(art).getPropertyValue('--glyph').trim() || '#fff';

    // Sample: draw the placed image onto a grid-sized canvas, one pixel per cell.
    var cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
    var p = placement();
    var s = document.createElement('canvas'); s.width = cols; s.height = rows;
    var sc = s.getContext('2d', { willReadFrequently: true });
    sc.imageSmoothingQuality = 'high';
    sc.drawImage(img, p.x / CELL, p.y / CELL, p.w / CELL, p.h / CELL);
    var data = sc.getImageData(0, 0, cols, rows).data;

    // Cell values, normalised to the brightest cell so small glyphs in the source don't wash out.
    var vals = new Float32Array(cols * rows), vmax = 0;
    for (var j = 0; j < vals.length; j++) {
      var q = j * 4;
      vals[j] = ((data[q] + data[q + 1] + data[q + 2]) / 765) * (data[q + 3] / 255);
      if (vals[j] > vmax) vmax = vals[j];
    }
    glyphs = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var v = vmax > 0 ? Math.pow(vals[r * cols + c] / vmax, 0.8) : 0;
        if (v < 0.12) continue;
        var ch = RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
        var hx = c * CELL + CELL / 2, hy = r * CELL + CELL / 2;
        glyphs.push({ ch: ch, a: 0.45 + 0.55 * v, hx: hx, hy: hy, x: hx, y: hy, vx: 0, vy: 0, k: 1 });
      }
    }
    draw();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var base = 'px "Geist Mono", ui-monospace, Menlo, monospace';
    var lastSize = 0;
    for (var i = 0; i < glyphs.length; i++) {
      var g = glyphs[i];
      var size = Math.max(4, Math.round(10 * g.k * 2) / 2);
      if (size !== lastSize) { ctx.font = size + base; lastSize = size; }
      ctx.globalAlpha = g.a * (0.35 + 0.65 * g.k);
      ctx.fillText(g.ch, g.x, g.y);
    }
    ctx.globalAlpha = 1;
  }

  function step() {
    raf = 0;
    var moving = false;
    for (var i = 0; i < glyphs.length; i++) {
      var g = glyphs[i];
      var tx = g.hx, ty = g.hy, tk = 1;
      if (mouse.on) {
        var dx = g.hx - mouse.x, dy = g.hy - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < RADIUS) {
          var f = 1 - d / RADIUS; f = f * f * (3 - 2 * f);           // smooth falloff
          var n = d > 0.001 ? 1 / d : 0;
          tx += dx * n * PUSH * f; ty += dy * n * PUSH * f;           // pushed outward
          tk = 1 - 0.55 * f;                                         // and shrunk near the cursor
        }
      }
      // spring toward the target, damped
      g.vx = (g.vx + (tx - g.x) * 0.16) * 0.72;
      g.vy = (g.vy + (ty - g.y) * 0.16) * 0.72;
      g.x += g.vx; g.y += g.vy;
      g.k += (tk - g.k) * 0.18;
      if (Math.abs(g.vx) > 0.02 || Math.abs(g.vy) > 0.02 || Math.abs(tk - g.k) > 0.005) moving = true;
    }
    draw();
    if (moving) raf = requestAnimationFrame(step);
  }
  function kick() { if (!raf && !reduce) raf = requestAnimationFrame(step); }

  function setMouse(e) {
    var b = art.getBoundingClientRect();
    mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; mouse.on = true; kick();
  }
  art.addEventListener('pointermove', setMouse);
  art.addEventListener('pointerenter', setMouse);
  art.addEventListener('pointerleave', function () { mouse.on = false; kick(); });

  img.onload = function () {
    art.appendChild(canvas);
    art.classList.add('is-live');
    var t = 0;
    new ResizeObserver(function () { clearTimeout(t); t = setTimeout(build, 60); }).observe(art);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    build();
  };
  img.src = SRC;
})();
