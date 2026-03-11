// ─── Unit Conversion Helpers ───
const KM_PER_MI = 1.60934;
const MI_PER_KM = 1 / KM_PER_MI;
const M_PER_FT  = 0.3048;

function activeUnits() {
  return document.getElementById('units-select')?.value || 'SI';
}

// Convert values to display in selected unit system
const UNITS = {
  SI: {
    len: { factor: 1,          label: 'km'    },
    vel: { factor: 1,          label: 'km/h'  },
    vel_s: { factor: 1,        label: 'km/s'  },
    acc: { factor: 1,          label: 'm/s²'  }, // g stays m/s²
    R:   { factor: 1,          label: 'km'    },
  },
  US: {
    len: { factor: MI_PER_KM,  label: 'mi'    },
    vel: { factor: MI_PER_KM,  label: 'mi/h'  },
    vel_s: { factor: MI_PER_KM, label: 'mi/s' },
    acc: { factor: 1 / M_PER_FT, label: 'ft/s²' }, // converts m/s² → ft/s²
    R:   { factor: MI_PER_KM,  label: 'mi'    },
  }
};

function fmt(val, type, decimals = 1) {
  const u = UNITS[activeUnits()][type];
  return (val * u.factor).toFixed(decimals) + ' ' + u.label;
}

// ─── Core Physics ───
// All math in SI (km, km/s)
// g_ms2 → km/s²;  R in km;  v in km/h
function g_km(g_ms2) { return g_ms2 / 1000; }

function calcH_fromV(g_ms2, R_km, v_kmh) {
  const v_kms = v_kmh / 3600;
  const r = g_km(g_ms2) * R_km * R_km / (v_kms * v_kms);
  return { h_km: r - R_km, r_km: r };
}

function calcV_fromH(g_ms2, R_km, h_km) {
  const r = R_km + h_km;
  const v_kms = Math.sqrt(g_km(g_ms2) * R_km * R_km / r);
  return { v_kmh: v_kms * 3600, r_km: r };
}

// ─── Read per-problem inputs (always in their native units, convert internally) ───
function readP133() {
  const g_ft  = parseFloat(document.getElementById('p133-g').value) || 32.2;
  const R_mi  = parseFloat(document.getElementById('p133-R').value) || 3960;
  const v_mih = parseFloat(document.getElementById('p133-v').value) || 16500;
  // Convert to SI
  const g_ms2 = g_ft * M_PER_FT;
  const R_km  = R_mi * KM_PER_MI;
  const v_kmh = v_mih * KM_PER_MI;
  const { h_km, r_km } = calcH_fromV(g_ms2, R_km, v_kmh);
  return { g_ms2, R_km, v_kmh, h_km, r_km, g_ft, R_mi, v_mih };
}

function readP134() {
  const g_ft  = parseFloat(document.getElementById('p133-g').value) || 32.2;
  const R_mi  = parseFloat(document.getElementById('p133-R').value) || 3960;
  const h_mi  = parseFloat(document.getElementById('p134-h').value) || 140;
  const g_ms2 = g_ft * M_PER_FT;
  const R_km  = R_mi * KM_PER_MI;
  const h_km  = h_mi * KM_PER_MI;
  const { v_kmh, r_km } = calcV_fromH(g_ms2, R_km, h_km);
  return { g_ms2, R_km, h_km, v_kmh, r_km, g_ft, R_mi, h_mi };
}

function readP135() {
  const g_ms2 = parseFloat(document.getElementById('p135-g').value) || 9.81;
  const R_km  = parseFloat(document.getElementById('p135-R').value) || 6370;
  const v_kmh = parseFloat(document.getElementById('p135-v').value) || 25000;
  const { h_km, r_km } = calcH_fromV(g_ms2, R_km, v_kmh);
  return { g_ms2, R_km, v_kmh, h_km, r_km };
}

// ─── Update Panels ───
function updateSubPanels() {
  const u = activeUnits();
  const p133 = readP133();
  const p134 = readP134();
  const p135 = readP135();

  // ── 11.133 ──
  const v133_s = p133.v_kmh / 3600;  // km/s
  document.getElementById('p133-v-ms').textContent = fmt(v133_s, 'vel_s', 3);
  document.getElementById('p133-r-out').textContent = fmt(p133.r_km, 'len', 0);
  document.getElementById('p133-h-out').textContent = fmt(p133.h_km, 'len', 0);
  // show native inputs in native units
  document.getElementById('p133-v-disp').textContent = u === 'US'
    ? `${p133.v_mih.toFixed(0)} mi/h → ${fmt(p133.v_kmh,'vel',1)}`
    : `${p133.v_mih.toFixed(0)} mi/h = ${p133.v_kmh.toFixed(1)} km/h`;

  // ── 11.134 ──
  const v134_s = p134.v_kmh / 3600;
  document.getElementById('p134-r-out').textContent = fmt(p134.r_km, 'len', 0);
  document.getElementById('p134-v-ms').textContent = fmt(v134_s, 'vel_s', 3);
  document.getElementById('p134-v-out').textContent = fmt(p134.v_kmh, 'vel', 0);
  document.getElementById('p134-h-disp').textContent = u === 'US'
    ? `${p134.h_mi.toFixed(0)} mi`
    : `${p134.h_mi.toFixed(0)} mi = ${p134.h_km.toFixed(1)} km`;

  // ── 11.135 ──
  const v135_s = p135.v_kmh / 3600;
  document.getElementById('p135-v-ms').textContent = fmt(v135_s, 'vel_s', 3);
  document.getElementById('p135-r-out').textContent = fmt(p135.r_km, 'len', 0);
  document.getElementById('p135-h-out').textContent = fmt(p135.h_km, 'len', 0);
  document.getElementById('p135-v-disp').textContent = u === 'US'
    ? `${p135.v_kmh.toFixed(0)} km/h = ${fmt(p135.v_kmh,'vel',0)}`
    : `${p135.v_kmh.toFixed(0)} km/h`;

  // ── Update unit labels in result boxes ──
  const lenLbl = u === 'SI' ? 'km' : 'mi';
  const velLbl = u === 'SI' ? 'km/h' : 'mi/h';
  document.querySelectorAll('.lbl-len').forEach(e => e.textContent = lenLbl);
  document.querySelectorAll('.lbl-vel').forEach(e => e.textContent = velLbl);
  document.querySelectorAll('.meta-unit').forEach(e => {
    e.style.background = u === 'SI' ? '#dbeafe' : '#fef9c3';
    e.style.color      = u === 'SI' ? '#1d4ed8' : '#92400e';
    e.textContent      = u;
  });
  // Update global badge
  const badge = document.getElementById('global-unit-badge');
  if (badge) {
    badge.textContent = u;
    badge.style.background = u === 'SI' ? '#dbeafe' : '#fef9c3';
    badge.style.color      = u === 'SI' ? '#1d4ed8' : '#92400e';
  }

  // ── Simulation orbit from p135 ──
  simState.hKm    = p135.h_km;
  simState.vKmh   = p135.v_kmh;
  simState.orbitRpx = BASE_Rpx + Math.min((p135.h_km / p135.R_km) * BASE_Rpx * 1.8, 130);
  document.getElementById('card-sim-title').textContent =
    `🌍 Simulation — h = ${fmt(p135.h_km,'len',0)}, v = ${fmt(p135.v_kmh,'vel',0)}`;
  if (!isPlaying) updateScene(currentAngle, simState.orbitRpx, p135.v_kmh, p135.h_km, p135.R_km);
}

// ─── SVG Scene ───
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

let animTimeline = null, isPlaying = false, currentAngle = 0;
const BASE_Rpx = 72;
const W = 480, H = 390;
const CX = W / 2, CY = H / 2;
const simState = { hKm: 3000, vKmh: 25000, orbitRpx: BASE_Rpx + 50 };

function addStars(svg) {
  for (let i = 0; i < 140; i++) {
    const x = ((Math.sin(i * 7.3 + 42) * 0.5 + 0.5) * W) | 0;
    const y = ((Math.cos(i * 3.7 + 42) * 0.5 + 0.5) * H) | 0;
    const rr = i % 10 === 0 ? 1.5 : 0.8;
    const op = (0.25 + ((Math.sin(i * 1.7) * 0.5 + 0.5) * 0.6)).toFixed(2);
    svg.appendChild(el('circle', { cx: x, cy: y, r: rr, fill: 'white', opacity: op }));
  }
}

function buildScene() {
  const svg = document.getElementById('sim-svg');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#040d1a' }));
  addStars(svg);

  const defs = el('defs');
  defs.innerHTML = `
    <radialGradient id="eG" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="50%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </radialGradient>
    <radialGradient id="sG" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
    <marker id="velMk" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
      <polygon points="0 0 6 2.5 0 5" fill="#34d399"/></marker>
    <filter id="gf"><feGaussianBlur stdDeviation="2.5" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svg.appendChild(defs);

  svg.appendChild(el('circle', { cx: CX, cy: CY, r: BASE_Rpx+18, fill: 'rgba(37,99,235,0.06)' }));
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: BASE_Rpx+8,  fill: 'rgba(37,99,235,0.10)' }));
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: BASE_Rpx,    fill: 'url(#eG)' }));
  [[CX-14,CY-20,17,13],[CX+10,CY-24,13,9],[CX-23,CY+10,11,7],[CX+20,CY+14,10,6],[CX+4,CY+5,14,8]]
    .forEach(([x,y,rx,ry]) => svg.appendChild(el('ellipse', {cx:x,cy:y,rx,ry,fill:'#16a34a',opacity:'0.55'})));
  svg.appendChild(el('circle', { cx:CX, cy:CY, r:BASE_Rpx+4, fill:'none', stroke:'rgba(147,197,253,0.3)', 'stroke-width':5 }));
  svg.appendChild(el('text', { x:CX+6, y:CY+14, fill:'rgba(255,255,255,0.4)', 'font-size':'10px', 'font-family':"'Inter',sans-serif" }, 'Earth'));

  const op = el('circle', { cx:CX, cy:CY, r:BASE_Rpx+50, fill:'none',
    stroke:'rgba(148,163,184,0.2)', 'stroke-width':1.5, 'stroke-dasharray':'6,5' });
  op.id = 'orbit-path'; svg.appendChild(op);

  const ot = el('path', { d:`M${CX},${CY}`, fill:'none', stroke:'rgba(52,211,153,0.45)', 'stroke-width':2 });
  ot.id = 'orbit-trace'; svg.appendChild(ot);

  const rl = el('line', { x1:CX,y1:CY,x2:CX+BASE_Rpx,y2:CY, stroke:'rgba(148,163,184,0.35)', 'stroke-width':1, 'stroke-dasharray':'3,3' });
  rl.id = 'r-line'; svg.appendChild(rl);
  const rLbl = el('text', { x:CX+20,y:CY-8, fill:'#94a3b8', 'font-size':'10px', 'font-family':"'JetBrains Mono',monospace" }, 'R');
  rLbl.id = 'r-label'; svg.appendChild(rLbl);

  const hl = el('line', { x1:CX,y1:CY,x2:CX,y2:CY, stroke:'rgba(251,191,36,0.6)', 'stroke-width':1.5, 'stroke-dasharray':'3,3' });
  hl.id = 'h-line'; svg.appendChild(hl);
  const hLbl = el('text', { x:0,y:0, fill:'#fbbf24', 'font-size':'10px', 'font-weight':'600', 'font-family':"'JetBrains Mono',monospace" }, 'h');
  hLbl.id = 'h-label'; svg.appendChild(hLbl);

  const sg = el('circle', { cx:CX,cy:CY-120,r:13, fill:'url(#sG)' }); sg.id='sat-glow'; svg.appendChild(sg);
  const sat = el('circle', { cx:CX,cy:CY-120,r:5, fill:'#fbbf24', filter:'url(#gf)' }); sat.id='satellite'; svg.appendChild(sat);
  const va = el('line', { x1:CX,y1:CY-120,x2:CX+28,y2:CY-120, stroke:'#34d399', 'stroke-width':2, 'marker-end':'url(#velMk)' });
  va.id='vel-arrow'; svg.appendChild(va);
  svg.appendChild(el('circle', { cx:CX, cy:CY, r:3, fill:'white', opacity:'0.5' }));

  const vd = el('text', { x:W-6,y:H-6, fill:'rgba(148,163,184,0.8)', 'font-size':'10px', 'text-anchor':'end', 'font-family':"'JetBrains Mono',monospace" }, '');
  vd.id='v-display'; svg.appendChild(vd);
  const hd = el('text', { x:6,y:H-6, fill:'rgba(251,191,36,0.8)', 'font-size':'10px', 'font-family':"'JetBrains Mono',monospace" }, '');
  hd.id='h-display'; svg.appendChild(hd);
}

function updateScene(angle, orbitRpx, vKmh, hKm, R_km = 6370) {
  if (!orbitRpx || orbitRpx < BASE_Rpx) orbitRpx = BASE_Rpx + 20;
  const px = CX + orbitRpx * Math.cos(angle - Math.PI / 2);
  const py = CY + orbitRpx * Math.sin(angle - Math.PI / 2);

  document.getElementById('satellite').setAttribute('cx', px);
  document.getElementById('satellite').setAttribute('cy', py);
  document.getElementById('sat-glow').setAttribute('cx', px);
  document.getElementById('sat-glow').setAttribute('cy', py);

  const vLen = 28;
  const vx = px - Math.sin(angle - Math.PI/2) * vLen;
  const vy = py + Math.cos(angle - Math.PI/2) * vLen;
  ['x1','y1','x2','y2'].forEach((a,i) =>
    document.getElementById('vel-arrow').setAttribute(a, [px,py,vx,vy][i]));

  document.getElementById('orbit-path').setAttribute('r', orbitRpx);

  const steps = Math.max(Math.round(angle / (2*Math.PI) * 200), 2);
  let trD = '';
  for (let i = 0; i <= steps; i++) {
    const a = (i/steps)*angle - Math.PI/2;
    trD += (i===0?'M':'L') + `${(CX+orbitRpx*Math.cos(a)).toFixed(1)},${(CY+orbitRpx*Math.sin(a)).toFixed(1)} `;
  }
  document.getElementById('orbit-trace').setAttribute('d', trD);

  const sX = CX + BASE_Rpx*Math.cos(angle-Math.PI/2);
  const sY = CY + BASE_Rpx*Math.sin(angle-Math.PI/2);
  document.getElementById('h-line').setAttribute('x1', sX);
  document.getElementById('h-line').setAttribute('y1', sY);
  document.getElementById('h-line').setAttribute('x2', px);
  document.getElementById('h-line').setAttribute('y2', py);
  document.getElementById('h-label').setAttribute('x', (sX+px)/2+5);
  document.getElementById('h-label').setAttribute('y', (sY+py)/2);
  document.getElementById('r-line').setAttribute('x2', sX);
  document.getElementById('r-line').setAttribute('y2', sY);
  document.getElementById('r-label').setAttribute('x', (CX+sX)/2-8);
  document.getElementById('r-label').setAttribute('y', (CY+sY)/2-5);

  document.getElementById('v-display').textContent = `v = ${fmt(vKmh,'vel',0)}`;
  document.getElementById('h-display').textContent = `h = ${fmt(hKm,'len',0)}`;

  document.getElementById('live-angle').textContent = (angle*180/Math.PI).toFixed(1) + '°';
  document.getElementById('live-r').textContent = fmt(hKm + R_km, 'len', 0);
  document.getElementById('live-v').textContent = fmt(vKmh, 'vel', 0);
  document.getElementById('live-h').textContent = fmt(hKm, 'len', 0);
}

// ─── Animation ───
function playAnimation() {
  if (isPlaying) return;
  isPlaying = true;
  document.getElementById('btn-play').textContent = '⏸ Pause';
  const { hKm, vKmh, orbitRpx } = simState;
  const start = currentAngle;
  const animObj = { a: start };
  animTimeline = anime({
    targets: animObj, a: start + 2*Math.PI,
    duration: Math.max(6000 * (1 - start/(2*Math.PI)), 500),
    easing: 'linear',
    update: () => {
      currentAngle = animObj.a % (2*Math.PI);
      updateScene(animObj.a, orbitRpx, vKmh, hKm);
      document.getElementById('time-slider').value = (animObj.a%(2*Math.PI))/(2*Math.PI);
    },
    complete: () => {
      isPlaying = false; currentAngle = 0;
      document.getElementById('btn-play').textContent = '▶ Play';
      document.getElementById('time-slider').value = 0;
      document.querySelectorAll('.step-card').forEach((c,i) => setTimeout(()=>c.classList.add('visible'),i*200));
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
  const { hKm, vKmh, orbitRpx } = simState;
  updateScene(0, orbitRpx, 0, hKm);
  document.querySelectorAll('.step-card').forEach(c => c.classList.remove('visible'));
}

function openModal() {
  const u = activeUnits();
  const p133 = readP133();
  const p134 = readP134();
  const p135 = readP135();




  // Active unit label
  setText('modal-active-unit', u);
  setText('modal-unit-lbl2', u);
  const uc = u === 'SI' ? '#2563eb' : '#92400e';
  document.getElementById('modal-active-unit').style.color = uc;

  // Unit systems section — highlight active unit
  setText('modal-g-si',    `${p135.g_ms2.toFixed(2)} m/s²`);
  setText('modal-g-si-km', `${(p135.g_ms2/1000).toFixed(5)} km/s²`);
  setText('modal-R-si',    `${p135.R_km.toLocaleString()} km`);
  const g_us_fts2 = p133.g_ms2 / 0.3048;
  setText('modal-g-us',    `${g_us_fts2.toFixed(1)} ft/s²`);
  setText('modal-g-us-mi', `${(g_us_fts2/5280).toExponential(3)} mi/s²`);
  setText('modal-R-us',    `${p133.R_km * MI_PER_KM < 4000 ? (p133.R_km * MI_PER_KM).toFixed(0) : (p133.R_km * MI_PER_KM).toFixed(0)} mi`);

  // 11.133 results (v given → find h)
  setText('modal-133-v', fmt(p133.v_kmh, 'vel', 0));
  setText('modal-133-g', u === 'SI' ? `${p133.g_ms2.toFixed(2)} m/s²` : `${(p133.g_ms2/0.3048).toFixed(1)} ft/s²`);
  setText('modal-133-R', fmt(p133.R_km, 'len', 0));
  setText('modal-133-r', fmt(p133.r_km, 'len', 0));
  setText('modal-133-h', fmt(p133.h_km, 'len', 0));

  // 11.134 results (h given → find v)
  setText('modal-134-h', fmt(p134.h_km, 'len', 0));
  setText('modal-134-g', u === 'SI' ? `${p134.g_ms2.toFixed(2)} m/s²` : `${(p134.g_ms2/0.3048).toFixed(1)} ft/s²`);
  setText('modal-134-R', fmt(p134.R_km, 'len', 0));
  setText('modal-134-r', fmt(p134.r_km, 'len', 0));
  setText('modal-134-v', fmt(p134.v_kmh, 'vel', 0));

  // 11.135 results (v given → find h)
  setText('modal-135-v', fmt(p135.v_kmh, 'vel', 0));
  setText('modal-135-g', u === 'SI' ? `${p135.g_ms2.toFixed(2)} m/s²` : `${(p135.g_ms2/0.3048).toFixed(1)} ft/s²`);
  setText('modal-135-R', fmt(p135.R_km, 'len', 0));
  setText('modal-135-r', fmt(p135.r_km, 'len', 0));
  setText('modal-135-h', fmt(p135.h_km, 'len', 0));

  document.getElementById('theory-modal').classList.add('active');
  if (window.MathJax && MathJax.typeset) MathJax.typeset();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function closeModal() { document.getElementById('theory-modal').classList.remove('active'); }
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
  updateScene(0, simState.orbitRpx, simState.vKmh, simState.hKm);

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

  // Global units toggle
  document.getElementById('units-select').addEventListener('change', updateSubPanels);

  // Apply buttons
  ['133','134','135'].forEach(id => {
    document.getElementById(`btn-apply-${id}`)?.addEventListener('click', updateSubPanels);
  });

  // Slider
  const slider = document.getElementById('time-slider');
  slider.min = 0; slider.max = 1; slider.step = 0.005;
  slider.addEventListener('input', e => {
    if (isPlaying) pauseAnimation();
    currentAngle = parseFloat(e.target.value) * 2 * Math.PI;
    const { hKm, vKmh, orbitRpx } = simState;
    updateScene(currentAngle, orbitRpx, vKmh, hKm);
    document.getElementById('slider-val').textContent = (parseFloat(e.target.value)*360).toFixed(1) + '°';
  });

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });
});
