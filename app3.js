// ─── Physics Constants & Unit Systems ───
const EARTH = {
  SI:  { R: 6370,   g: 9.81,  Ru: 'km',   vu: 'km/h', hu: 'km'  },
  US:  { R: 3960,   g: 32.2,  Ru: 'mi',   vu: 'mi/h', hu: 'mi'  }
};

// Conversion: g must be in (length/s²) matching the distance unit
// SI: g=9.81 m/s²=0.00981 km/s², R in km, v in km/s → convert results to km/h
// US: g=32.2 ft/s²=32.2/5280 mi/s², R in mi, v in mi/s → results in mi/h

function calcOrbit(units) {
  const E = EARTH[units];
  return {
    // v_orbit = sqrt(g * R² / r),  solve for r given v: r = g*R²/v²
    vFromH: (h) => {
      const r = E.R + h;
      // v in base length/s
      const gBase = units === 'SI' ? E.g / 1000 : E.g / 5280;  // km/s² or mi/s²
      const v_s = Math.sqrt(gBase * E.R * E.R / r); // km/s or mi/s
      return v_s * 3600; // km/h or mi/h
    },
    hFromV: (v_h) => {
      const v_s = v_h / 3600; // to/s
      const gBase = units === 'SI' ? E.g / 1000 : E.g / 5280;
      const r = gBase * E.R * E.R / (v_s * v_s);
      return r - E.R; // height in km or mi
    },
    R: E.R, Ru: E.Ru, vu: E.vu, hu: E.hu, g: E.g
  };
}

// Sub-problem answers
function getAnswers() {
  const o_us = calcOrbit('US');
  const o_si = calcOrbit('SI');
  const p133_v = 16500; // mi/h
  const p133_h = o_us.hFromV(p133_v);
  const p134_h = 140; // mi
  const p134_v = o_us.vFromH(p134_h);
  const p135_v = 25000; // km/h
  const p135_h = o_si.hFromV(p135_v);
  return { p133_h, p134_v, p135_h };
}

// ─── SVG (space simulation) ───
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

let animTimeline = null, isPlaying = false;
let currentOrbitH = 0; // current displayed orbit height in km

const W = 480, H = 400;
const CX = W / 2, CY = H / 2;

function addStars(svg) {
  // Background starfield
  const seed = 42;
  for (let i = 0; i < 120; i++) {
    const x = ((Math.sin(i * 7.3 + seed) * 0.5 + 0.5) * W)|0;
    const y = ((Math.cos(i * 3.7 + seed) * 0.5 + 0.5) * H)|0;
    const r = Math.random() < 0.1 ? 1.5 : 0.8;
    const op = 0.3 + Math.random() * 0.6;
    svg.appendChild(el('circle', { cx: x, cy: y, r, fill: 'white', opacity: op }));
  }
}

function buildScene() {
  const svg = document.getElementById('sim-svg');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // Space background
  svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#040d1a' }));
  addStars(svg);

  // Earth radius in px
  const Rpx = 72;

  // Earth glow
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: Rpx + 18, fill: 'rgba(37,99,235,0.08)' }));
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: Rpx + 8, fill: 'rgba(37,99,235,0.12)' }));

  // Earth body
  const earthGrad = el('radialGradient', { id: 'earthGrad', cx: '40%', cy: '35%', r: '65%' });
  earthGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#60a5fa' }));
  earthGrad.appendChild(el('stop', { offset: '50%', 'stop-color': '#2563eb' }));
  earthGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#1e3a8a' }));
  const defs = el('defs');
  defs.innerHTML = `
    <radialGradient id="earthGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="50%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </radialGradient>
    <radialGradient id="satGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
    <marker id="velArrow" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
      <polygon points="0 0 6 2.5 0 5" fill="#34d399"/>
    </marker>
    <filter id="glow2"><feGaussianBlur stdDeviation="3" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
  svg.appendChild(defs);

  svg.appendChild(el('circle', { cx: CX, cy: CY, r: Rpx, fill: 'url(#earthGrad)' }));

  // Continent blobs (simplified)
  const continents = [
    [CX-15, CY-20, 18, 14], [CX+10, CY-25, 14, 10],
    [CX-25, CY+10, 12, 8],  [CX+20, CY+15, 10, 7],
    [CX+5,  CY+5,  15, 9]
  ];
  continents.forEach(([x, y, rx, ry]) => {
    svg.appendChild(el('ellipse', { cx: x, cy: y, rx, ry, fill: '#16a34a', opacity: '0.6' }));
  });

  // Atmosphere halo
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: Rpx + 4, fill: 'none',
    stroke: 'rgba(147,197,253,0.35)', 'stroke-width': 5 }));

  // Orbit path
  const orbitPath = el('circle', { cx: CX, cy: CY, r: Rpx + 30,
    fill: 'none', stroke: 'rgba(148,163,184,0.25)', 'stroke-width': 1.5, 'stroke-dasharray': '6,5' });
  orbitPath.id = 'orbit-path';
  svg.appendChild(orbitPath);

  // Orbit trace (animated)
  const orbitTrace = el('path', { d: `M${CX},${CY}`, fill: 'none',
    stroke: 'rgba(52,211,153,0.5)', 'stroke-width': 2 });
  orbitTrace.id = 'orbit-trace';
  svg.appendChild(orbitTrace);

  // R line
  const rLine = el('line', { x1: CX, y1: CY, x2: CX + Rpx, y2: CY,
    stroke: 'rgba(148,163,184,0.4)', 'stroke-width': 1, 'stroke-dasharray': '3,3' });
  rLine.id = 'r-line';
  svg.appendChild(rLine);

  // R label
  const rLabel = el('text', { x: CX + 20, y: CY - 8, fill: '#94a3b8',
    'font-size': '10px', 'font-family': "'JetBrains Mono', monospace" }, 'R');
  rLabel.id = 'r-label';
  svg.appendChild(rLabel);

  // h bracket line
  const hLine = el('line', { x1: CX, y1: CY, x2: CX, y2: CY,
    stroke: 'rgba(251,191,36,0.6)', 'stroke-width': 1.5, 'stroke-dasharray': '3,3' });
  hLine.id = 'h-line';
  svg.appendChild(hLine);

  // h label
  const hLabel = el('text', { x: 0, y: 0, fill: '#fbbf24',
    'font-size': '10px', 'font-family': "'JetBrains Mono', monospace", 'font-weight': '600' }, 'h');
  hLabel.id = 'h-label';
  svg.appendChild(hLabel);

  // Satellite glow
  const satGlow = el('circle', { cx: CX, cy: CY - 100, r: 14, fill: 'url(#satGlow)' });
  satGlow.id = 'sat-glow';
  svg.appendChild(satGlow);

  // Satellite body
  const sat = el('circle', { cx: CX, cy: CY - 100, r: 5,
    fill: '#fbbf24', filter: 'url(#glow2)' });
  sat.id = 'satellite';
  svg.appendChild(sat);

  // Velocity arrow
  const velArrow = el('line', { x1: CX, y1: CY - 100, x2: CX + 25, y2: CY - 100,
    stroke: '#34d399', 'stroke-width': 2, 'marker-end': 'url(#velArrow)' });
  velArrow.id = 'vel-arrow';
  svg.appendChild(velArrow);

  // Center dot
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: 3, fill: 'white', opacity: '0.6' }));
  svg.appendChild(el('text', { x: CX + 6, y: CY + 14, fill: 'rgba(255,255,255,0.5)',
    'font-size': '10px', 'font-family': "'Inter', sans-serif" }, 'Earth'));

  // Time + speed display
  const tDisp = el('text', { x: W - 8, y: H - 8, fill: 'rgba(148,163,184,0.8)',
    'font-size': '11px', 'font-family': "'JetBrains Mono', monospace",
    'text-anchor': 'end' }, 'v = 0 km/h');
  tDisp.id = 'v-display';
  svg.appendChild(tDisp);

  const hDisp = el('text', { x: 8, y: H - 8, fill: 'rgba(251,191,36,0.8)',
    'font-size': '11px', 'font-family': "'JetBrains Mono', monospace" }, 'h = 0 km');
  hDisp.id = 'h-display';
  svg.appendChild(hDisp);
}

const BASE_Rpx = 72;

function updateScene(angle, orbitRpx, vKmh, hKm) {
  const px = CX + orbitRpx * Math.cos(angle - Math.PI / 2);
  const py = CY + orbitRpx * Math.sin(angle - Math.PI / 2);

  document.getElementById('satellite').setAttribute('cx', px);
  document.getElementById('satellite').setAttribute('cy', py);
  document.getElementById('sat-glow').setAttribute('cx', px);
  document.getElementById('sat-glow').setAttribute('cy', py);

  // Velocity arrow (tangential)
  const vLen = 28;
  const vx = px - Math.sin(angle - Math.PI / 2) * vLen;
  const vy = py + Math.cos(angle - Math.PI / 2) * vLen;
  document.getElementById('vel-arrow').setAttribute('x1', px);
  document.getElementById('vel-arrow').setAttribute('y1', py);
  document.getElementById('vel-arrow').setAttribute('x2', vx);
  document.getElementById('vel-arrow').setAttribute('y2', vy);

  // Orbit path circle
  document.getElementById('orbit-path').setAttribute('r', orbitRpx);

  // Orbit trace
  const steps = Math.max(Math.round(angle / (2 * Math.PI) * 200), 2);
  let trD = '';
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * angle - Math.PI / 2;
    const tx = CX + orbitRpx * Math.cos(a);
    const ty = CY + orbitRpx * Math.sin(a);
    trD += (i === 0 ? 'M' : 'L') + `${tx.toFixed(1)},${ty.toFixed(1)} `;
  }
  document.getElementById('orbit-trace').setAttribute('d', trD);

  // h line (from Earth surface to satellite)
  const hFrac = hKm > 0 ? (orbitRpx - BASE_Rpx) / orbitRpx : 0;
  const surfX = CX + BASE_Rpx * Math.cos(angle - Math.PI / 2);
  const surfY = CY + BASE_Rpx * Math.sin(angle - Math.PI / 2);
  document.getElementById('h-line').setAttribute('x1', surfX);
  document.getElementById('h-line').setAttribute('y1', surfY);
  document.getElementById('h-line').setAttribute('x2', px);
  document.getElementById('h-line').setAttribute('y2', py);

  const midX = (surfX + px) / 2;
  const midY = (surfY + py) / 2;
  document.getElementById('h-label').setAttribute('x', midX + 5);
  document.getElementById('h-label').setAttribute('y', midY);

  // R line
  document.getElementById('r-line').setAttribute('x2', surfX);
  document.getElementById('r-line').setAttribute('y2', surfY);
  document.getElementById('r-label').setAttribute('x', (CX + surfX) / 2 - 8);
  document.getElementById('r-label').setAttribute('y', (CY + surfY) / 2 - 6);

  // displays
  document.getElementById('v-display').textContent = `v = ${(vKmh).toFixed(0)} km/h`;
  document.getElementById('h-display').textContent = `h = ${hKm.toFixed(0)} km`;

  // live data
  document.getElementById('live-angle').textContent = (angle * 180 / Math.PI).toFixed(1) + '°';
  document.getElementById('live-r').textContent = (hKm + 6370).toFixed(0) + ' km';
  document.getElementById('live-v').textContent = vKmh.toFixed(0) + ' km/h';
  document.getElementById('live-h').textContent = hKm.toFixed(0) + ' km';
}

// ─── Sub-problem tab content ───
function updateSubPanels() {
  const ans = getAnswers();

  // 11.133 US: h given v=16500 mi/h
  document.getElementById('p133-r').textContent = (ans.p133_h + 3960).toFixed(0) + ' mi';
  document.getElementById('p133-h').textContent = ans.p133_h.toFixed(0) + ' mi';

  // 11.134: v given h=140 mi
  document.getElementById('p134-v').textContent = ans.p134_v.toFixed(0) + ' mi/h';

  // 11.135 SI: h given v=25000 km/h
  document.getElementById('p135-r').textContent = (ans.p135_h + 6370).toFixed(0) + ' km';
  document.getElementById('p135-h').textContent = ans.p135_h.toFixed(0) + ' km';
}

// ─── Animation ───
let currentAngle = 0;

function playAnimation() {
  if (isPlaying) return;
  isPlaying = true;
  document.getElementById('btn-play').textContent = '⏸ Pause';

  const ans = getAnswers();
  // Use p135 (SI) for visualization
  const hKm = ans.p135_h;
  const vKmh = 25000;
  const orbitRpx = BASE_Rpx + Math.min((hKm / 6370) * BASE_Rpx * 1.8, 130);
  currentOrbitH = hKm;

  const startAngle = currentAngle;
  const endAngle = startAngle + 2 * Math.PI;
  // Period T = 2πr/v (in hours), animate real-time scaled to ~6s per orbit
  const animObj = { a: startAngle };
  const duration = 6000 * (1 - startAngle / endAngle);

  animTimeline = anime({
    targets: animObj,
    a: endAngle,
    duration: Math.max(duration, 500),
    easing: 'linear',
    update: () => {
      currentAngle = animObj.a % (2 * Math.PI);
      updateScene(animObj.a, orbitRpx, vKmh, hKm);
      document.getElementById('time-slider').value = (animObj.a % (2 * Math.PI)) / (2 * Math.PI);
    },
    complete: () => {
      isPlaying = false;
      currentAngle = 0;
      document.getElementById('btn-play').textContent = '▶ Play';
      document.getElementById('time-slider').value = 0;
      document.querySelectorAll('.step-card').forEach((c, i) =>
        setTimeout(() => c.classList.add('visible'), i * 200));
    }
  });
}

function pauseAnimation() {
  if (animTimeline) animTimeline.pause();
  isPlaying = false;
  document.getElementById('btn-play').textContent = '▶ Play';
}

function resetAnimation() {
  if (animTimeline) animTimeline.pause();
  isPlaying = false; currentAngle = 0;
  document.getElementById('btn-play').textContent = '▶ Play';
  document.getElementById('time-slider').value = 0;
  const ans = getAnswers();
  const hKm = ans.p135_h;
  const orbitRpx = BASE_Rpx + Math.min((hKm / 6370) * BASE_Rpx * 1.8, 130);
  updateScene(0, orbitRpx, 0, hKm);
  document.querySelectorAll('.step-card').forEach(c => c.classList.remove('visible'));
}

// ─── Modal ───
function openModal() {
  document.getElementById('theory-modal').classList.add('active');
  if (window.MathJax && MathJax.typeset) MathJax.typeset();
}
function closeModal() {
  document.getElementById('theory-modal').classList.remove('active');
}

// ─── Tabs ───
function switchTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${id}"]`).classList.add('active');
  document.getElementById(id).classList.add('active');
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  buildScene();
  updateSubPanels();
  const ans = getAnswers();
  const hKm = ans.p135_h;
  const orbitRpx = BASE_Rpx + Math.min((hKm / 6370) * BASE_Rpx * 1.8, 130);
  updateScene(0, orbitRpx, 25000, hKm);

  document.getElementById('btn-play').addEventListener('click', () => {
    if (isPlaying) pauseAnimation(); else playAnimation();
  });
  document.getElementById('btn-reset').addEventListener('click', resetAnimation);
  document.getElementById('btn-theory').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('theory-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  const slider = document.getElementById('time-slider');
  slider.min = 0; slider.max = 1; slider.step = 0.005;
  slider.addEventListener('input', e => {
    if (isPlaying) pauseAnimation();
    const frac = parseFloat(e.target.value);
    const a = frac * 2 * Math.PI;
    currentAngle = a;
    const orb = BASE_Rpx + Math.min((hKm / 6370) * BASE_Rpx * 1.8, 130);
    updateScene(a, orb, 25000, hKm);
    document.getElementById('slider-val').textContent = (frac * 360).toFixed(1) + '°';
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });
});
