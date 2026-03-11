// ─── Unit Conversion Constants ───
const KM_PER_MI = 1.60934;
const MI_PER_KM = 1 / KM_PER_MI;
const M_PER_FT  = 0.3048;

function activeUnits() {
  return document.getElementById('units-select')?.value || 'SI';
}

// ─── Display formatting ───
const UNITS = {
  SI: {
    len:   { factor: 1,           label: 'km'    },
    vel:   { factor: 1,           label: 'km/h'  },
    vel_s: { factor: 1,           label: 'km/s'  },
    acc:   { factor: 1,           label: 'm/s²'  },
  },
  US: {
    len:   { factor: MI_PER_KM,   label: 'mi'    },
    vel:   { factor: MI_PER_KM,   label: 'mi/h'  },
    vel_s: { factor: MI_PER_KM,   label: 'mi/s'  },
    acc:   { factor: 1/M_PER_FT,  label: 'ft/s²' },
  }
};
function fmt(val, type, dec = 1) {
  const u = UNITS[activeUnits()][type];
  return (val * u.factor).toFixed(dec) + ' ' + u.label;
}

// ─── Core Physics (all SI internally: km, km/s, m/s²) ───
function g_km(g_ms2) { return g_ms2 / 1000; }

function calcH_fromV(g_ms2, R_km, v_kmh) {
  const v = v_kmh / 3600;
  const r = g_km(g_ms2) * R_km * R_km / (v * v);
  return { h_km: r - R_km, r_km: r };
}
function calcV_fromH(g_ms2, R_km, h_km) {
  const r = R_km + h_km;
  const v = Math.sqrt(g_km(g_ms2) * R_km * R_km / r);
  return { v_kmh: v * 3600, r_km: r };
}

// ─── Canonical SI Values (ground truth, never mutated by display) ───
// Original problem is US: convert once to SI for canonical storage.
const CANONICAL = {
  p133: {
    g_ms2: 32.2 * M_PER_FT,                  // ≈ 9.8106 m/s²
    R_km:  3960 * KM_PER_MI,                  // ≈ 6372.9 km
    v_kmh: 16500 * KM_PER_MI                  // ≈ 26554 km/h
  },
  p134: {
    h_km:  140 * KM_PER_MI                    // ≈ 225.3 km
  },
  p135: {
    g_ms2: 9.81,
    R_km:  6370,
    v_kmh: 25000
  }
};

// Tracks the unit system that the inputs are currently showing
let prevUnit = 'SI';  // updated after every sync

// ─── Helpers: read a single input as SI, given the unit it is displayed in ───
function readInputAsSI_len(id, displayUnit) {
  const v = parseFloat(document.getElementById(id)?.value);
  if (isNaN(v)) return null;
  return displayUnit === 'SI' ? v : v * KM_PER_MI;
}
function readInputAsSI_vel(id, displayUnit) {
  const v = parseFloat(document.getElementById(id)?.value);
  if (isNaN(v)) return null;
  return displayUnit === 'SI' ? v : v * KM_PER_MI;
}
function readInputAsSI_acc(id, displayUnit) {
  const v = parseFloat(document.getElementById(id)?.value);
  if (isNaN(v)) return null;
  return displayUnit === 'SI' ? v : v * M_PER_FT;
}

// ─── Sync input fields: convert CURRENT values from prevUnit → newUnit ───
function syncInputsToUnits() {
  const newUnit = activeUnits();
  const from    = prevUnit;   // what the inputs are currently showing

  // ── Read current inputs as SI (regardless of display unit) ──
  const g133_si  = readInputAsSI_acc('p133-g', from) ?? CANONICAL.p133.g_ms2;
  const R133_si  = readInputAsSI_len('p133-R', from) ?? CANONICAL.p133.R_km;
  const v133_si  = readInputAsSI_vel('p133-v', from) ?? CANONICAL.p133.v_kmh;
  const h134_si  = readInputAsSI_len('p134-h', from) ?? CANONICAL.p134.h_km;
  const g135_si  = readInputAsSI_acc('p135-g', from) ?? CANONICAL.p135.g_ms2;
  const R135_si  = readInputAsSI_len('p135-R', from) ?? CANONICAL.p135.R_km;
  const v135_si  = readInputAsSI_vel('p135-v', from) ?? CANONICAL.p135.v_kmh;

  // ── Write as new unit ──
  if (newUnit === 'SI') {
    setInput('p133-g', g133_si.toFixed(4),           'lbl-133-g', 'g (m/s²)');
    setInput('p133-R', R133_si.toFixed(1),            'lbl-133-R', 'R (km)');
    setInput('p133-v', v133_si.toFixed(0),            'lbl-133-v', 'v (km/h)');
    setInput('p134-h', h134_si.toFixed(1),            'lbl-134-h', 'h (km)');
    setLbl('lbl-134-g', 'g (m/s²)');  setLbl('lbl-134-R', 'R (km)');
    setInput('p135-g', g135_si.toFixed(4),            'lbl-135-g', 'g (m/s²)');
    setInput('p135-R', R135_si.toFixed(1),            'lbl-135-R', 'R (km)');
    setInput('p135-v', v135_si.toFixed(0),            'lbl-135-v', 'v (km/h)');
  } else {
    setInput('p133-g', (g133_si / M_PER_FT).toFixed(2), 'lbl-133-g', 'g (ft/s²)');
    setInput('p133-R', (R133_si * MI_PER_KM).toFixed(1),'lbl-133-R', 'R (mi)');
    setInput('p133-v', (v133_si * MI_PER_KM).toFixed(0),'lbl-133-v', 'v (mi/h)');
    setInput('p134-h', (h134_si * MI_PER_KM).toFixed(1),'lbl-134-h', 'h (mi)');
    setLbl('lbl-134-g', 'g (ft/s²)');  setLbl('lbl-134-R', 'R (mi)');
    setInput('p135-g', (g135_si / M_PER_FT).toFixed(2), 'lbl-135-g', 'g (ft/s²)');
    setInput('p135-R', (R135_si * MI_PER_KM).toFixed(1),'lbl-135-R', 'R (mi)');
    setInput('p135-v', (v135_si * MI_PER_KM).toFixed(0),'lbl-135-v', 'v (mi/h)');
  }

  prevUnit = newUnit;  // remember for next switch
}

function setInput(id, val, lblId, lblTxt) {
  const el = document.getElementById(id);
  if (el) el.value = val;
  if (lblId) setLbl(lblId, lblTxt);
}
function setLbl(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

// ─── Read inputs → always return SI ───
function readP133() {
  const u = activeUnits();
  let g_ms2, R_km, v_kmh;
  const gV = parseFloat(document.getElementById('p133-g').value);
  const RV = parseFloat(document.getElementById('p133-R').value);
  const vV = parseFloat(document.getElementById('p133-v').value);
  if (u === 'SI') {
    g_ms2 = isNaN(gV) ? CANONICAL.p133.g_ms2 : gV;
    R_km  = isNaN(RV) ? CANONICAL.p133.R_km  : RV;
    v_kmh = isNaN(vV) ? CANONICAL.p133.v_kmh : vV;
  } else {
    g_ms2 = (isNaN(gV) ? 32.2 : gV) * M_PER_FT;
    R_km  = (isNaN(RV) ? 3960 : RV) * KM_PER_MI;
    v_kmh = (isNaN(vV) ? 16500: vV) * KM_PER_MI;
  }
  const { h_km, r_km } = calcH_fromV(g_ms2, R_km, v_kmh);
  return { g_ms2, R_km, v_kmh, h_km, r_km };
}

function readP134() {
  const u = activeUnits();
  const p133 = readP133(); // shares g and R
  const hV = parseFloat(document.getElementById('p134-h').value);
  const h_km = u === 'SI'
    ? (isNaN(hV) ? CANONICAL.p134.h_km : hV)
    : (isNaN(hV) ? CANONICAL.p134.h_km : hV * KM_PER_MI);
  const { v_kmh, r_km } = calcV_fromH(p133.g_ms2, p133.R_km, h_km);
  return { g_ms2: p133.g_ms2, R_km: p133.R_km, h_km, v_kmh, r_km };
}


function readP135() {
  const u = activeUnits();
  const gV = parseFloat(document.getElementById('p135-g').value);
  const RV = parseFloat(document.getElementById('p135-R').value);
  const vV = parseFloat(document.getElementById('p135-v').value);
  let g_ms2, R_km, v_kmh;
  if (u === 'SI') {
    g_ms2 = isNaN(gV) ? CANONICAL.p135.g_ms2 : gV;
    R_km  = isNaN(RV) ? CANONICAL.p135.R_km  : RV;
    v_kmh = isNaN(vV) ? CANONICAL.p135.v_kmh : vV;
  } else {
    g_ms2 = (isNaN(gV) ? (CANONICAL.p135.g_ms2 / M_PER_FT) : gV) * M_PER_FT;
    R_km  = (isNaN(RV) ? (CANONICAL.p135.R_km * MI_PER_KM)  : RV) * KM_PER_MI;
    v_kmh = (isNaN(vV) ? (CANONICAL.p135.v_kmh * MI_PER_KM) : vV) * KM_PER_MI;
  }
  const { h_km, r_km } = calcH_fromV(g_ms2, R_km, v_kmh);
  return { g_ms2, R_km, v_kmh, h_km, r_km };
}

// ─── Update Panels ───
function updateSubPanels(updateOrbit = true) {
  const u = activeUnits();
  const p133 = readP133();
  const p134 = readP134();
  const p135 = readP135();

  // ── 11.133 ──
  const v133_s = p133.v_kmh / 3600;
  document.getElementById('p133-v-ms').textContent = fmt(v133_s, 'vel_s', 3);
  document.getElementById('p133-r-out').textContent = fmt(p133.r_km, 'len', 0);
  document.getElementById('p133-h-out').textContent = fmt(p133.h_km, 'len', 0);
  document.getElementById('p133-v-disp').textContent =
    `${fmt(p133.v_kmh, 'vel', 0)}  (= ${(v133_s).toFixed(3)} ${u==='SI'?'km/s':'mi/s'})`;

  // ── 11.134 ──
  const v134_s = p134.v_kmh / 3600;
  document.getElementById('p134-r-out').textContent = fmt(p134.r_km, 'len', 0);
  document.getElementById('p134-v-ms').textContent = fmt(v134_s, 'vel_s', 3);
  document.getElementById('p134-v-out').textContent = fmt(p134.v_kmh, 'vel', 0);
  document.getElementById('p134-h-disp').textContent = fmt(p134.h_km, 'len', 1);

  // ── 11.135 ──
  const v135_s = p135.v_kmh / 3600;
  document.getElementById('p135-v-ms').textContent = fmt(v135_s, 'vel_s', 3);
  document.getElementById('p135-r-out').textContent = fmt(p135.r_km, 'len', 0);
  document.getElementById('p135-h-out').textContent = fmt(p135.h_km, 'len', 0);
  document.getElementById('p135-v-disp').textContent =
    `${fmt(p135.v_kmh, 'vel', 0)}  (= ${v135_s.toFixed(3)} ${u==='SI'?'km/s':'mi/s'})`;

  // ── Unit labels in result boxes ──
  const lenLbl = u === 'SI' ? 'km' : 'mi';
  const velLbl = u === 'SI' ? 'km/h' : 'mi/h';
  document.querySelectorAll('.lbl-len').forEach(e => e.textContent = lenLbl);
  document.querySelectorAll('.lbl-vel').forEach(e => e.textContent = velLbl);
  document.querySelectorAll('.meta-unit').forEach(e => {
    e.style.background = u === 'SI' ? '#dbeafe' : '#fef9c3';
    e.style.color      = u === 'SI' ? '#1d4ed8' : '#92400e';
    e.textContent      = u;
  });
  const badge = document.getElementById('global-unit-badge');
  if (badge) {
    badge.textContent = u;
    badge.style.background = u === 'SI' ? '#dbeafe' : '#fef9c3';
    badge.style.color      = u === 'SI' ? '#1d4ed8' : '#92400e';
  }

  // ── Simulation from p135 (only update orbit geometry on explicit Apply/init) ──
  simState.hKm  = p135.h_km;
  simState.vKmh = p135.v_kmh;
  simState.R_km = p135.R_km;

  const orbitValid = p135.h_km > 0;

  if (updateOrbit) {
    if (orbitValid) {
      // Physically proportional: orbit radius px = BASE_Rpx × r / R
      // Capped so satellite stays within SVG canvas
      const maxOrbit = CY - 16;
      simState.orbitRpx = Math.min(BASE_Rpx * p135.r_km / p135.R_km, maxOrbit);
    } else {
      simState.orbitRpx = BASE_Rpx; // parked on surface as warning
    }
  }

  // Show/hide invalid orbit warning in SVG
  const existing = document.getElementById('invalid-orbit-msg');
  if (!orbitValid) {
    if (!existing) {
      const warn = el('text', {
        id: 'invalid-orbit-msg',
        x: W / 2, y: H / 2 + BASE_Rpx + 22,
        fill: '#ef4444', 'font-size': '11px', 'font-weight': '700',
        'text-anchor': 'middle', 'font-family': "'JetBrains Mono',monospace"
      }, '⚠ Orbit inside Earth — increase v or decrease R');
      document.getElementById('sim-svg').appendChild(warn);
    }
    document.getElementById('btn-play').disabled = true;
    document.getElementById('btn-play').style.opacity = '0.4';
  } else {
    if (existing) existing.remove();
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-play').style.opacity = '';
  }

  document.getElementById('card-sim-title').textContent = orbitValid
    ? `🌍 Simulation — h = ${fmt(p135.h_km,'len',0)}, v = ${fmt(p135.v_kmh,'vel',0)}`
    : `⚠️ Invalid orbit (h = ${fmt(p135.h_km,'len',0)})`;
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
  // Also reset inputs to canonical problem values
  resetToCanonical();
}

// Restore problem inputs to the original textbook values
function resetToCanonical() {
  const u = activeUnits();
  prevUnit = u;  // treat canonical as already in current unit (we convert)
  // Temporarily force prevUnit to SI so the sync reads CANONICAL correctly,
  // then we reset inputs from canonical SI values.
  const c = CANONICAL;
  if (u === 'SI') {
    setInput('p133-g', c.p133.g_ms2.toFixed(4),            'lbl-133-g', 'g (m/s²)');
    setInput('p133-R', c.p133.R_km.toFixed(1),              'lbl-133-R', 'R (km)');
    setInput('p133-v', c.p133.v_kmh.toFixed(0),             'lbl-133-v', 'v (km/h)');
    setInput('p134-h', c.p134.h_km.toFixed(1),              'lbl-134-h', 'h (km)');
    setLbl('lbl-134-g','g (m/s²)'); setLbl('lbl-134-R','R (km)');
    setInput('p135-g', c.p135.g_ms2.toFixed(4),             'lbl-135-g', 'g (m/s²)');
    setInput('p135-R', c.p135.R_km.toFixed(1),              'lbl-135-R', 'R (km)');
    setInput('p135-v', c.p135.v_kmh.toFixed(0),             'lbl-135-v', 'v (km/h)');
  } else {
    setInput('p133-g', (c.p133.g_ms2 / M_PER_FT).toFixed(2), 'lbl-133-g', 'g (ft/s²)');
    setInput('p133-R', (c.p133.R_km * MI_PER_KM).toFixed(1),  'lbl-133-R', 'R (mi)');
    setInput('p133-v', (c.p133.v_kmh * MI_PER_KM).toFixed(0), 'lbl-133-v', 'v (mi/h)');
    setInput('p134-h', (c.p134.h_km * MI_PER_KM).toFixed(1),  'lbl-134-h', 'h (mi)');
    setLbl('lbl-134-g','g (ft/s²)'); setLbl('lbl-134-R','R (mi)');
    setInput('p135-g', (c.p135.g_ms2 / M_PER_FT).toFixed(2),  'lbl-135-g', 'g (ft/s²)');
    setInput('p135-R', (c.p135.R_km * MI_PER_KM).toFixed(1),   'lbl-135-R', 'R (mi)');
    setInput('p135-v', (c.p135.v_kmh * MI_PER_KM).toFixed(0),  'lbl-135-v', 'v (mi/h)');
  }
  updateSubPanels(true);
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
  syncInputsToUnits();  // set inputs to SI on load (converts original US problem data)
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

  // Global units toggle — sync inputs and refresh labels only (orbit stays fixed)
  document.getElementById('units-select').addEventListener('change', () => {
    syncInputsToUnits();
    updateSubPanels(false);   // false = don't move the orbit
  });

  // Apply buttons — user explicitly changed inputs → update orbit too
  ['133','134','135'].forEach(id => {
    document.getElementById(`btn-apply-${id}`)?.addEventListener('click', () => updateSubPanels(true));
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
