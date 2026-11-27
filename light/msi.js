/* Medical Superintelligence page: training-data tabs (Patients / Physicians / Medical Knowledge). */
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.msi-tab'));
  if (!tabs.length) return;
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!n) return;
      e.preventDefault();
      select(tabs[(i + n + tabs.length) % tabs.length], true);
    });
  });
})();

/* ---------- Loop graphic: redraw the SVG in pixels for the current box size (handoff from the prototype) ---------- */
(function () {
const lp = document.querySelector('.lp');
if (lp) {
  const svgEl = lp.querySelector('.lp-svg');
  const ship = svgEl.querySelector('#lp-ship');
  const learn = svgEl.querySelector('#lp-learn');
  const lanes = svgEl.querySelectorAll('.lp-lane');
  const heads = svgEl.querySelectorAll('.lp-head');
  const nodes = svgEl.querySelectorAll('.lp-node');
  const gate = svgEl.querySelector('.lp-gate');
  const shipBeads = svgEl.querySelectorAll('.lp-bead:not(.lp-bead--learn) animateMotion');
  const STOPS = [0.359, 0.515, 0.672];
  const draw = () => {
    const W = lp.clientWidth, H = lp.clientHeight;
    if (!W || !H) return;
    const inset = W < 560 ? 0.08 : 0.16; // phones: wider loop, no outside lanes
    const x0 = W * inset, x1 = W * (1 - inset), y0 = H * 0.15625, y1 = H * 0.84375, cx = W / 2;
    const r = Math.min(40, W * 0.06);
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    ship.setAttribute('d', `M${cx} ${y0}H${x0 + r}A${r} ${r} 0 0 0 ${x0} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 0 ${x0 + r} ${y1}H${cx}`);
    learn.setAttribute('d', `M${cx} ${y1}H${x1 - r}A${r} ${r} 0 0 0 ${x1} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 0 ${x1 - r} ${y0}H${cx}`);
    const lx = W * 0.11, rx = W * 0.89, a = H * 0.28, b = H * 0.73;
    lanes[0].setAttribute('d', `M${lx} ${a}V${b}`);
    heads[0].setAttribute('d', `M${lx - 5} ${b - 4}L${lx} ${b + 4}L${lx + 5} ${b - 4}`);
    lanes[1].setAttribute('d', `M${rx} ${b}V${a}`);
    heads[1].setAttribute('d', `M${rx - 5} ${a + 4}L${rx} ${a - 4}L${rx + 5} ${a + 4}`);
    const ys = STOPS.map((f) => H * f);
    [[x0, ys[0]], [x0, ys[1]], [x1, ys[2]], [x1, ys[1]], [x1, ys[0]]].forEach(([x, y], i) => { nodes[i].setAttribute('x', x - 3); nodes[i].setAttribute('y', y - 3); });
    const gw = W < 560 ? 6 : 12; // short gate so the WRITTEN BAR label lines up with the other tags
    gate.setAttribute("d", `M${x0 - gw} ${ys[2]}H${x0 + gw}`);
    // Ship beads pause at the written bar: find its fraction along the path.
    const L = ship.getTotalLength();
    const toGate = (cx - x0 - r) + (Math.PI * r) / 2 + (ys[2] - y0 - r);
    const g = (toGate / L).toFixed(4);
    shipBeads.forEach((m) => m.setAttribute('keyPoints', `0;${g};${g};1`));
  };
  new ResizeObserver(draw).observe(lp);
  draw();
}
})();
