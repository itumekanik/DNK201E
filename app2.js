// ─── Dynamic Parameters ───
let THETA_DOT = 3;   // rad/s (constant angular velocity)
let R_COEFF = 0.4;   // r = R_COEFF * θ
let THETA_EVAL = Math.PI / 3; // evaluation angle
let THETA_DDOT = 0;  // constant ω → α = 0

function recalcParams() {
    const td = parseFloat(document.getElementById('input-thetadot').value);
    const rc = parseFloat(document.getElementById('input-rcoeff').value);
    const te = parseFloat(document.getElementById('input-thetaeval').value);
    THETA_DOT = isNaN(td) ? 3 : td;
    R_COEFF = isNaN(rc) || rc <= 0 ? 0.4 : rc;
    THETA_EVAL = isNaN(te) || te <= 0 ? Math.PI / 3 : te;
    THETA_DDOT = 0;
}

// Spiral: r = R_COEFF * θ
function rOfTheta(th) { return R_COEFF * th; }
function rDot() { return R_COEFF * THETA_DOT; }   // ṙ = R_COEFF * θ̇
function rDDot() { return R_COEFF * THETA_DDOT; }  // r̈ = R_COEFF * θ̈ = 0

function getResults(th) {
    const r = rOfTheta(th);
    const rd = rDot();
    const rdd = rDDot();
    const vr = rd;
    const vth = r * THETA_DOT;
    const ar = rdd - r * THETA_DOT * THETA_DOT;
    const ath = r * THETA_DDOT + 2 * rd * THETA_DOT;
    const vMag = Math.sqrt(vr * vr + vth * vth);
    const aMag = Math.sqrt(ar * ar + ath * ath);
    return { r, rd, rdd, vr, vth, ar, ath, vMag, aMag };
}

// ─── SVG Helpers ───
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    return e;
}

// ─── Scene ───
const SW = 500, SH = 460;
const CX = 80, CY = SH - 60; // origin O position in SVG
let SCALE = 280; // pixels per meter

function buildScene() {
    const maxR = rOfTheta(THETA_EVAL * 1.3);
    SCALE = Math.min(280, (SW - CX - 40) / Math.max(maxR, 0.3));

    const svg = document.getElementById('sim-svg');
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${SW} ${SH}`);

    const defs = el('defs');
    defs.innerHTML = `
        <marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0 8 3 0 6" fill="#059669"/>
        </marker>
        <marker id="ah-red" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0 8 3 0 6" fill="#dc2626"/>
        </marker>
        <marker id="ah-blue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0 8 3 0 6" fill="#2563eb"/>
        </marker>
        <marker id="ah-orange" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0 8 3 0 6" fill="#d97706"/>
        </marker>`;
    svg.appendChild(defs);

    // Background
    svg.appendChild(el('rect', { x: 0, y: 0, width: SW, height: SH, fill: '#fafbfe', rx: 8 }));

    // Grid
    const g = el('g', { opacity: '0.3' });
    for (let i = -1; i <= 5; i++) {
        const px = CX + i * SCALE * 0.2;
        g.appendChild(el('line', { x1: px, y1: 20, x2: px, y2: SH - 20, stroke: '#cbd5e1', 'stroke-width': 0.5 }));
    }
    for (let i = -5; i <= 1; i++) {
        const py = CY + i * SCALE * 0.2;
        g.appendChild(el('line', { x1: 20, y1: py, x2: SW - 20, y2: py, stroke: '#cbd5e1', 'stroke-width': 0.5 }));
    }
    svg.appendChild(g);

    // Spiral path (full)
    let spiralD = '';
    const spiralEnd = THETA_EVAL * 1.3;
    for (let i = 0; i <= 200; i++) {
        const th = (i / 200) * spiralEnd;
        const r = rOfTheta(th);
        const px = CX + r * SCALE * Math.cos(th);
        const py = CY - r * SCALE * Math.sin(th);
        spiralD += (i === 0 ? 'M' : 'L') + `${px.toFixed(1)},${py.toFixed(1)} `;
    }
    svg.appendChild(el('path', { d: spiralD, fill: 'none', stroke: '#94a3b8', 'stroke-width': 2, 'stroke-dasharray': '6,4' }));

    // Animated spiral trace
    const trace = el('path', { d: `M${CX},${CY}`, fill: 'none', stroke: '#7c3aed', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    trace.id = 'spiral-trace';
    svg.appendChild(trace);

    // Slotted link line
    const link = el('line', { x1: CX, y1: CY, x2: CX + 100, y2: CY, stroke: '#475569', 'stroke-width': 3, 'stroke-linecap': 'round' });
    link.id = 'link-line';
    svg.appendChild(link);

    // Origin O
    svg.appendChild(el('circle', { cx: CX, cy: CY, r: 6, fill: '#1e293b' }));
    svg.appendChild(el('circle', { cx: CX, cy: CY, r: 3, fill: 'white' }));
    const oLabel = el('text', { x: CX - 16, y: CY + 18, fill: '#1e293b', 'font-size': '14px', 'font-weight': '700', 'font-family': "'Inter', sans-serif" });
    oLabel.textContent = 'O';
    svg.appendChild(oLabel);

    // Peg P
    const peg = el('circle', { cx: CX, cy: CY, r: 7, fill: '#2563eb' });
    peg.id = 'peg';
    svg.appendChild(peg);
    const pLabel = el('text', { x: CX + 12, y: CY - 12, fill: '#2563eb', 'font-size': '13px', 'font-weight': '700', 'font-family': "'Inter', sans-serif" });
    pLabel.textContent = 'P';
    pLabel.id = 'peg-label';
    svg.appendChild(pLabel);

    // Velocity arrows (vr and vθ)
    const vrArrow = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: '#dc2626', 'stroke-width': 2.5, 'marker-end': 'url(#ah-red)' });
    vrArrow.id = 'vr-arrow';
    svg.appendChild(vrArrow);
    const vrLabel = el('text', { x: 0, y: 0, fill: '#dc2626', 'font-size': '12px', 'font-weight': '700', 'font-family': "'JetBrains Mono', monospace" });
    vrLabel.textContent = 'vᵣ';
    vrLabel.id = 'vr-label';
    svg.appendChild(vrLabel);

    const vtArrow = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: '#2563eb', 'stroke-width': 2.5, 'marker-end': 'url(#ah-blue)' });
    vtArrow.id = 'vt-arrow';
    svg.appendChild(vtArrow);
    const vtLabel = el('text', { x: 0, y: 0, fill: '#2563eb', 'font-size': '12px', 'font-weight': '700', 'font-family': "'JetBrains Mono', monospace" });
    vtLabel.textContent = 'vθ';
    vtLabel.id = 'vt-label';
    svg.appendChild(vtLabel);

    // Resultant v arrow
    const vArrow = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: '#d97706', 'stroke-width': 2, 'stroke-dasharray': '4,3', 'marker-end': 'url(#ah-orange)' });
    vArrow.id = 'v-arrow';
    svg.appendChild(vArrow);

    // Angle arc
    const arc = el('path', { d: '', fill: 'none', stroke: '#059669', 'stroke-width': 1.5 });
    arc.id = 'angle-arc';
    svg.appendChild(arc);
    const thLabel = el('text', { x: 0, y: 0, fill: '#059669', 'font-size': '12px', 'font-weight': '600', 'font-family': "'JetBrains Mono', monospace" });
    thLabel.textContent = 'θ';
    thLabel.id = 'theta-label';
    svg.appendChild(thLabel);

    // r label
    const rLabel = el('text', { x: 0, y: 0, fill: '#7c3aed', 'font-size': '11px', 'font-weight': '600', 'font-family': "'JetBrains Mono', monospace" });
    rLabel.textContent = 'r';
    rLabel.id = 'r-label';
    svg.appendChild(rLabel);

    // θ label on scene
    const tLabel = el('text', { x: SW - 90, y: SH - 10, fill: '#475569', 'font-size': '13px', 'font-weight': '500', 'font-family': "'JetBrains Mono', monospace" });
    tLabel.textContent = 'θ = 0.00 rad';
    tLabel.id = 'theta-display';
    svg.appendChild(tLabel);

    // Equation label
    const eqLabel = el('text', { x: SW - 140, y: 25, fill: '#94a3b8', 'font-size': '12px', 'font-family': "'JetBrains Mono', monospace" });
    eqLabel.textContent = `r = ${R_COEFF}θ  (spiral)`;
    svg.appendChild(eqLabel);
}

function updateScene(theta) {
    theta = Math.max(0, Math.min(theta, THETA_EVAL));
    const r = rOfTheta(theta);
    const px = CX + r * SCALE * Math.cos(theta);
    const py = CY - r * SCALE * Math.sin(theta);

    // Peg position
    document.getElementById('peg').setAttribute('cx', px);
    document.getElementById('peg').setAttribute('cy', py);
    document.getElementById('peg-label').setAttribute('x', px + 12);
    document.getElementById('peg-label').setAttribute('y', py - 12);

    // Link line
    const linkLen = Math.max(r * SCALE + 30, 50);
    document.getElementById('link-line').setAttribute('x2', CX + linkLen * Math.cos(theta));
    document.getElementById('link-line').setAttribute('y2', CY - linkLen * Math.sin(theta));

    // Spiral trace
    let traceD = '';
    const steps = Math.max(Math.round(theta / THETA_EVAL * 150), 2);
    for (let i = 0; i <= steps; i++) {
        const th = (i / steps) * theta;
        const ri = rOfTheta(th);
        const tx = CX + ri * SCALE * Math.cos(th);
        const ty = CY - ri * SCALE * Math.sin(th);
        traceD += (i === 0 ? 'M' : 'L') + `${tx.toFixed(1)},${ty.toFixed(1)} `;
    }
    document.getElementById('spiral-trace').setAttribute('d', traceD);

    // Angle arc
    const arcR = 40;
    const arcSteps = 30;
    let arcD = '';
    for (let i = 0; i <= arcSteps; i++) {
        const a = (i / arcSteps) * theta;
        const ax = CX + arcR * Math.cos(a);
        const ay = CY - arcR * Math.sin(a);
        arcD += (i === 0 ? 'M' : 'L') + `${ax.toFixed(1)},${ay.toFixed(1)} `;
    }
    document.getElementById('angle-arc').setAttribute('d', arcD);
    document.getElementById('theta-label').setAttribute('x', CX + (arcR + 10) * Math.cos(theta / 2));
    document.getElementById('theta-label').setAttribute('y', CY - (arcR + 10) * Math.sin(theta / 2) + 4);

    // r label
    const midR = r / 2;
    document.getElementById('r-label').setAttribute('x', CX + midR * SCALE * Math.cos(theta) - 10);
    document.getElementById('r-label').setAttribute('y', CY - midR * SCALE * Math.sin(theta) - 8);

    // Velocity arrows (scale for visibility)
    const res = getResults(theta);
    const vScale = SCALE * 0.25;

    // vr: radial direction (along r)
    const vrLen = res.vr * vScale;
    const vrx2 = px + vrLen * Math.cos(theta);
    const vry2 = py - vrLen * Math.sin(theta);
    document.getElementById('vr-arrow').setAttribute('x1', px);
    document.getElementById('vr-arrow').setAttribute('y1', py);
    document.getElementById('vr-arrow').setAttribute('x2', vrx2);
    document.getElementById('vr-arrow').setAttribute('y2', vry2);
    document.getElementById('vr-label').setAttribute('x', vrx2 + 5);
    document.getElementById('vr-label').setAttribute('y', vry2 - 5);

    // vθ: transverse direction (perpendicular to r, CCW)
    const vtLen = res.vth * vScale;
    const vtx2 = px + vtLen * Math.cos(theta + Math.PI / 2);
    const vty2 = py - vtLen * Math.sin(theta + Math.PI / 2);
    document.getElementById('vt-arrow').setAttribute('x1', px);
    document.getElementById('vt-arrow').setAttribute('y1', py);
    document.getElementById('vt-arrow').setAttribute('x2', vtx2);
    document.getElementById('vt-arrow').setAttribute('y2', vty2);
    document.getElementById('vt-label').setAttribute('x', vtx2 + 5);
    document.getElementById('vt-label').setAttribute('y', vty2 - 5);

    // Resultant v
    const vx2 = px + (res.vr * Math.cos(theta) + res.vth * Math.cos(theta + Math.PI / 2)) * vScale;
    const vy2 = py - (res.vr * Math.sin(theta) + res.vth * Math.sin(theta + Math.PI / 2)) * vScale;
    document.getElementById('v-arrow').setAttribute('x1', px);
    document.getElementById('v-arrow').setAttribute('y1', py);
    document.getElementById('v-arrow').setAttribute('x2', vx2);
    document.getElementById('v-arrow').setAttribute('y2', vy2);

    // Labels
    document.getElementById('theta-display').textContent = `θ = ${theta.toFixed(3)} rad`;

    // Live data
    document.getElementById('live-theta').textContent = theta.toFixed(3) + ' rad';
    document.getElementById('live-r').textContent = r.toFixed(4) + ' m';
    document.getElementById('live-vr').textContent = res.vr.toFixed(2) + ' m/s';
    document.getElementById('live-vt').textContent = res.vth.toFixed(2) + ' m/s';

    // Result boxes
    document.getElementById('res-vr').textContent = res.vr.toFixed(3) + ' m/s';
    document.getElementById('res-vt').textContent = res.vth.toFixed(3) + ' m/s';
    document.getElementById('res-ar').textContent = res.ar.toFixed(3) + ' m/s²';
    document.getElementById('res-at').textContent = res.ath.toFixed(3) + ' m/s²';

    document.getElementById('time-slider').value = theta;
    document.getElementById('slider-val').textContent = theta.toFixed(3) + ' rad';
}

// ─── Animation ───
let animTimeline = null, isPlaying = false;

function rebuildAll() {
    if (animTimeline) animTimeline.pause();
    isPlaying = false;
    document.getElementById('btn-play').textContent = '▶ Play';
    recalcParams();
    buildScene();
    updateScene(0);
    document.querySelectorAll('.step-card').forEach(el => el.classList.remove('visible'));
    updateSolutionCards();
}

function updateSolutionCards() {
    const res = getResults(THETA_EVAL);
    const cards = document.querySelectorAll('.step-card');
    if (cards.length < 4) return;
    // Derivatives
    cards[0].querySelector('.formula:nth-child(3)').innerHTML = `ṙ = ${R_COEFF}·θ̇ = ${R_COEFF}×${THETA_DOT} = ${(R_COEFF * THETA_DOT).toFixed(2)}`;
    cards[0].querySelector('.formula:nth-child(4)').innerHTML = `r̈ = ${R_COEFF}·θ̈ = 0`;
    // At θ
    cards[1].querySelector('.formula').innerHTML = `r = ${R_COEFF}×${THETA_EVAL.toFixed(4)} = ${res.r.toFixed(4)} m`;
    cards[1].querySelector('.result').innerHTML = `ṙ = ${res.rd.toFixed(2)} | r̈ = ${res.rdd.toFixed(2)}`;
    // Velocity
    cards[2].querySelector('.formula:nth-child(3)').innerHTML = `vᵣ = ṙ = ${res.vr.toFixed(2)} m/s`;
    cards[2].querySelector('.formula:nth-child(4)').innerHTML = `vθ = rθ̇ = ${res.r.toFixed(4)}×${THETA_DOT} = ${res.vth.toFixed(2)} m/s`;
    // Acceleration
    cards[3].querySelector('.formula:nth-child(3)').innerHTML = `aᵣ = r̈ − rθ̇² = 0 − ${res.r.toFixed(4)}×${THETA_DOT}² = ${res.ar.toFixed(2)} m/s²`;
    cards[3].querySelector('.formula:nth-child(4)').innerHTML = `aθ = rθ̈ + 2ṙθ̇ = 0 + 2×${res.rd.toFixed(2)}×${THETA_DOT} = ${res.ath.toFixed(2)} m/s²`;
}

function playAnimation() {
    if (isPlaying) return;
    isPlaying = true;
    document.getElementById('btn-play').textContent = '⏸ Pause';
    const duration = (THETA_EVAL / THETA_DOT) * 1000; // real-time
    const animObj = { theta: parseFloat(document.getElementById('time-slider').value) || 0 };
    animTimeline = anime({
        targets: animObj, theta: THETA_EVAL,
        duration: duration * (1 - animObj.theta / THETA_EVAL),
        easing: 'linear',
        update: () => updateScene(animObj.theta),
        complete: () => {
            isPlaying = false;
            document.getElementById('btn-play').textContent = '▶ Play';
            document.querySelectorAll('.step-card').forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 200));
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
    isPlaying = false;
    document.getElementById('btn-play').textContent = '▶ Play';
    updateScene(0);
    document.querySelectorAll('.step-card').forEach(el => el.classList.remove('visible'));
}

// ─── Modal ───
function openModal() {
    const res = getResults(THETA_EVAL);
    document.getElementById('modal-result-vel').innerHTML =
        `vᵣ = <b>${res.vr.toFixed(2)} m/s</b> &nbsp;|&nbsp; vθ = <b>${res.vth.toFixed(2)} m/s</b> &nbsp;|&nbsp; |v| = <b>${res.vMag.toFixed(2)} m/s</b>`;
    document.getElementById('modal-result-acc').innerHTML =
        `aᵣ = <b>${res.ar.toFixed(2)} m/s²</b> &nbsp;|&nbsp; aθ = <b>${res.ath.toFixed(2)} m/s²</b> &nbsp;|&nbsp; |a| = <b>${res.aMag.toFixed(2)} m/s²</b>`;
    document.getElementById('theory-modal').classList.add('active');
    if (window.MathJax && MathJax.typeset) MathJax.typeset();
}
function closeModal() {
    document.getElementById('theory-modal').classList.remove('active');
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    recalcParams();
    buildScene();
    updateScene(0);

    document.getElementById('btn-play').addEventListener('click', () => {
        if (isPlaying) pauseAnimation(); else playAnimation();
    });
    document.getElementById('btn-reset').addEventListener('click', resetAnimation);
    document.getElementById('btn-apply').addEventListener('click', rebuildAll);
    document.getElementById('btn-theory').addEventListener('click', openModal);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('theory-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    const slider = document.getElementById('time-slider');
    slider.max = THETA_EVAL.toFixed(4);
    slider.step = '0.001';
    slider.addEventListener('input', (e) => {
        if (isPlaying) pauseAnimation();
        updateScene(parseFloat(e.target.value));
    });
});
