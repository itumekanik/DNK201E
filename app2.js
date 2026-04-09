// ─── Dynamic Parameters ───
let THETA_DOT   = 3;          // rad/s (constant angular velocity)
let R_COEFF     = 0.4;        // r = R_COEFF * θ
let THETA_EVAL  = Math.PI / 3; // evaluation angle
let THETA_DDOT  = 0;          // constant ω → α = 0

function recalcParams() {
    const td = parseFloat(document.getElementById('input-thetadot').value);
    const rc = parseFloat(document.getElementById('input-rcoeff').value);
    const te = parseFloat(document.getElementById('input-thetaeval').value);
    THETA_DOT  = isNaN(td) ? 3 : td;
    R_COEFF    = isNaN(rc) || rc <= 0 ? 0.4 : rc;
    THETA_EVAL = isNaN(te) || te <= 0 ? Math.PI / 3 : te;
    THETA_DDOT = 0;
}

// Spiral: r = R_COEFF * θ
function rOfTheta(th) { return R_COEFF * th; }
function rDot() { return R_COEFF * THETA_DOT; }   
function rDDot() { return R_COEFF * THETA_DDOT; }  

function getResults(th) {
    const r   = rOfTheta(th);
    const rd  = rDot();
    const rdd = rDDot();
    const vr  = rd;
    const vth = r * THETA_DOT;
    const ar  = rdd - r * THETA_DOT * THETA_DOT;
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
    SCALE = Math.min(300, (SW - CX - 60) / Math.max(maxR, 0.3));

    const svg = document.getElementById('sim-svg');
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${SW} ${SH}`);

    // Definitions
    const defs = el('defs');
    defs.innerHTML = `
        <pattern id="cadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <line x1="40" y1="0" x2="40" y2="40" stroke="#1e293b" stroke-width="1.5" opacity="0.6"/>
            <line x1="0" y1="40" x2="40" y2="40" stroke="#1e293b" stroke-width="1.5" opacity="0.6"/>
        </pattern>
        <pattern id="cadGridSmall" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="8" y1="0" x2="8" y2="8" stroke="#0f172a" stroke-width="0.5" opacity="0.5"/>
            <line x1="0" y1="8" x2="8" y2="8" stroke="#0f172a" stroke-width="0.5" opacity="0.5"/>
        </pattern>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#020617"/>
        </radialGradient>
        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#e2e8f0" />
            <stop offset="50%" stop-color="#94a3b8" />
            <stop offset="100%" stop-color="#64748b" />
        </linearGradient>
        <radialGradient id="pegGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#7dd3fc" />
            <stop offset="50%" stop-color="#0284c7" />
            <stop offset="100%" stop-color="#0c4a6e" />
        </radialGradient>
        <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
            <feOffset dx="2" dy="5" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.6"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="g"/>
            <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <marker id="vr-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0 0 6 3 0 6" fill="#f87171"/></marker>
        <marker id="vt-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0 0 6 3 0 6" fill="#38bdf8"/></marker>
        <marker id="v-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0 0 6 3 0 6" fill="#fbbf24"/></marker>
    `;
    svg.appendChild(defs);

    // Dynamic background (dark CAD aesthetics)
    svg.appendChild(el('rect', { x: 0, y: 0, width: SW, height: SH, fill: 'url(#bgGlow)' }));
    svg.appendChild(el('rect', { x: 0, y: 0, width: SW, height: SH, fill: 'url(#cadGridSmall)' }));
    svg.appendChild(el('rect', { x: 0, y: 0, width: SW, height: SH, fill: 'url(#cadGrid)' }));

    // Reference axis
    svg.appendChild(el('line', { x1: 20, y1: CY, x2: SW - 20, y2: CY, stroke: '#334155', 'stroke-width': 2, 'stroke-dasharray': '8,6' }));
    svg.appendChild(el('line', { x1: CX, y1: 20, x2: CX, y2: SH - 20, stroke: '#334155', 'stroke-width': 2, 'stroke-dasharray': '8,6' }));

    // Spiral path geometry
    let spiralD = '';
    const spiralEnd = THETA_EVAL * 1.4;
    const stepsPath = 150;
    for (let i = 0; i <= stepsPath; i++) {
        const th = (i / stepsPath) * spiralEnd;
        const r = rOfTheta(th);
        const px = CX + r * SCALE * Math.cos(th);
        const py = CY - r * SCALE * Math.sin(th);
        spiralD += (i === 0 ? 'M' : 'L') + `${px.toFixed(2)},${py.toFixed(2)} `;
    }

    // Outer thick rail track
    svg.appendChild(el('path', { d: spiralD, fill: 'none', stroke: '#1e293b', 'stroke-width': 16, 'stroke-linecap': 'round', filter: 'url(#drop-shadow)' }));
    svg.appendChild(el('path', { d: spiralD, fill: 'none', stroke: '#334155', 'stroke-width': 12, 'stroke-linecap': 'round' }));
    // Inner glowing channel
    svg.appendChild(el('path', { d: spiralD, fill: 'none', stroke: '#0ea5e9', 'stroke-width': 2.5, filter: 'url(#glow)' }));

    // Angle Sweep Region (Solid fan)
    const angleSweep = el('path', { id: 'angle-sweep', d: '', fill: 'rgba(16, 185, 129, 0.15)', stroke: '#10b981', 'stroke-width': 1.5 });
    svg.appendChild(angleSweep);
    const thLabel = el('text', { id: 'theta-label', x: 0, y: 0, fill: '#34d399', 'font-size': '14px', 'font-weight': '700', 'font-family': "'Inter', sans-serif" });
    thLabel.textContent = 'θ';
    svg.appendChild(thLabel);

    // Interactive Animated Slotted Arm
    const armGrp = el('g', { id: 'arm-group', filter: 'url(#drop-shadow)' });
    const armLen = maxR * SCALE + 60;
    armGrp.appendChild(el('rect', { x: -25, y: -18, width: armLen + 20, height: 36, rx: 18, fill: 'url(#metalGrad)' }));
    // Mechanical details on arm
    for(let i=1; i<armLen/30; i++) {
        armGrp.appendChild(el('line', {x1: i*30, y1: -18, x2: i*30, y2: 18, stroke:'#cbd5e1', 'stroke-width':0.5, opacity:0.8}));
    }
    // The slot itself
    armGrp.appendChild(el('rect', { x: 15, y: -5, width: armLen - 25, height: 10, rx: 5, fill: '#020617', stroke: '#475569', 'stroke-width':1.5 }));
    svg.appendChild(armGrp);

    // Animated PEG P
    const pegGrp = el('g', { id: 'peg-group' });
    pegGrp.appendChild(el('circle', { cx: 0, cy: 0, r: 12, fill: '#1e293b' }));
    pegGrp.appendChild(el('circle', { cx: 0, cy: 0, r: 9, fill: 'url(#pegGrad)' }));
    pegGrp.appendChild(el('circle', { cx: 0, cy: 0, r: 4, fill: '#f8fafc' }));
    pegGrp.appendChild(el('circle', { cx: -2, cy: -2, r: 2, fill: '#ffffff', opacity:0.6 })); // Highlight reflection
    const pLbl = el('text', { id: 'peg-label', x: 18, y: -18, fill: '#7dd3fc', 'font-size': '16px', 'font-weight': '800', 'font-family': "'Inter', sans-serif", filter:'url(#glow)' });
    pLbl.textContent = 'P';
    pegGrp.appendChild(pLbl);
    svg.appendChild(pegGrp);

    // Origin Base O
    const pivot = el('g');
    pivot.appendChild(el('circle', { cx: CX, cy: CY, r: 26, fill: '#1e293b', stroke: '#475569', 'stroke-width': 2, filter: 'url(#drop-shadow)' }));
    pivot.appendChild(el('circle', { cx: CX, cy: CY, r: 10, fill: 'url(#metalGrad)' }));
    pivot.appendChild(el('circle', { cx: CX, cy: CY, r: 4, fill: '#0f172a' }));
    // Pivot bolts
    for(let i=0; i<6; i++) {
        const ax = CX + 18 * Math.cos(i*Math.PI/3);
        const ay = CY + 18 * Math.sin(i*Math.PI/3);
        pivot.appendChild(el('circle', {cx:ax, cy:ay, r:2.5, fill:'#64748b'}));
    }
    const oLabel = el('text', { x: CX - 38, y: CY + 28, fill: '#f8fafc', 'font-size': '15px', 'font-weight': '800', 'font-family': "'Inter', sans-serif" });
    oLabel.textContent = 'O';
    pivot.appendChild(oLabel);
    svg.appendChild(pivot);

    // Velocity Vectors
    const vrArr = el('line', { id: 'vr-arrow', x1: 0, y1: 0, x2: 0, y2: 0, stroke: '#f87171', 'stroke-width': 3, 'marker-end': 'url(#vr-head)', filter:'url(#glow)' });
    svg.appendChild(vrArr);
    const vrLbl = el('text', { id: 'vr-label', x: 0, y: 0, fill: '#fca5a5', 'font-size': '14px', 'font-weight': '700', 'font-family': "'JetBrains Mono', monospace" });
    vrLbl.textContent = 'vᵣ';
    svg.appendChild(vrLbl);

    const vtArr = el('line', { id: 'vt-arrow', x1: 0, y1: 0, x2: 0, y2: 0, stroke: '#38bdf8', 'stroke-width': 3, 'marker-end': 'url(#vt-head)', filter:'url(#glow)' });
    svg.appendChild(vtArr);
    const vtLbl = el('text', { id: 'vt-label', x: 0, y: 0, fill: '#7dd3fc', 'font-size': '14px', 'font-weight': '700', 'font-family': "'JetBrains Mono', monospace" });
    vtLbl.textContent = 'vθ';
    svg.appendChild(vtLbl);

    // V Resultant
    const vArr = el('line', { id: 'v-arrow', x1: 0, y1: 0, x2: 0, y2: 0, stroke: '#fbbf24', 'stroke-width': 3.5, 'stroke-dasharray':'5,3', 'marker-end': 'url(#v-head)', filter:'url(#glow)' });
    svg.appendChild(vArr);
    const vLbl = el('text', { id: 'v-label', x: 0, y: 0, fill: '#fde047', 'font-size': '14px', 'font-weight': '700', 'font-family': "'JetBrains Mono', monospace" });
    vLbl.textContent = 'v';
    svg.appendChild(vLbl);

    // Global Title Overlay
    const titleLbl = el('text', { x: 20, y: 30, fill: '#94a3b8', 'font-size': '13px', 'font-weight':'600', 'font-family': "'JetBrains Mono', monospace" });
    titleLbl.textContent = `SPIRAL KINEMATICS ENGINE | r = ${R_COEFF}θ`;
    svg.appendChild(titleLbl);
}

function updateScene(theta) {
    theta = Math.max(0, Math.min(theta, THETA_EVAL));
    const r = rOfTheta(theta);
    const px = CX + r * SCALE * Math.cos(theta);
    const py = CY - r * SCALE * Math.sin(theta);

    // Arm Transformation (SVG Rotate uses CW for positive, so we use -theta for CCW mathematical sweep)
    document.getElementById('arm-group').setAttribute('transform', `translate(${CX},${CY}) rotate(${-theta * 180 / Math.PI})`);

    // Peg Translation
    document.getElementById('peg-group').setAttribute('transform', `translate(${px},${py})`);

    // Angle Sweep Arc
    const arcR = 55;
    if (theta > 0.05) {
        // large arc flag: if angle > 180 (Math.PI) it's 1, else 0.
        const largeArc = theta > Math.PI ? 1 : 0;
        const ax = CX + arcR * Math.cos(theta);
        const ay = CY - arcR * Math.sin(theta);
        // Draw pizza slice
        const arcPath = `M ${CX} ${CY} L ${CX + arcR} ${CY} A ${arcR} ${arcR} 0 ${largeArc} 0 ${ax} ${ay} Z`;
        document.getElementById('angle-sweep').setAttribute('d', arcPath);
        document.getElementById('theta-label').setAttribute('x', CX + (arcR + 15) * Math.cos(theta / 2) - 5);
        document.getElementById('theta-label').setAttribute('y', CY - (arcR + 15) * Math.sin(theta / 2) + 5);
        document.getElementById('theta-label').setAttribute('opacity', 1);
    } else {
        document.getElementById('angle-sweep').setAttribute('d', '');
        document.getElementById('theta-label').setAttribute('opacity', 0);
    }

    // Velocity Vectors (Scaling them cleanly relative to SVG size)
    const res = getResults(theta);
    // Base vector length for visual comfort (increased for better visibility at 0 rad)
    const vScale = Math.min(70, (180 / Math.max(res.vMag, 0.1)));

    const vrLen = Math.abs(res.vr) * vScale;
    const vrDir = res.vr >= 0 ? 1 : -1;
    const vrx2 = px + vrDir * vrLen * Math.cos(theta);
    const vry2 = py - vrDir * vrLen * Math.sin(theta);
    
    if (vrLen < 2) {
        document.getElementById('vr-arrow').setAttribute('opacity', '0');
        document.getElementById('vr-label').setAttribute('opacity', '0');
    } else {
        document.getElementById('vr-arrow').setAttribute('opacity', '1');
        document.getElementById('vr-label').setAttribute('opacity', '1');
        document.getElementById('vr-arrow').setAttribute('x1', px);
        document.getElementById('vr-arrow').setAttribute('y1', py);
        document.getElementById('vr-arrow').setAttribute('x2', vrx2);
        document.getElementById('vr-arrow').setAttribute('y2', vry2);
        document.getElementById('vr-label').setAttribute('x', vrx2 + 8 * Math.cos(theta));
        document.getElementById('vr-label').setAttribute('y', vry2 - 8 * Math.sin(theta));
    }

    const vtLen = Math.abs(res.vth) * vScale;
    const vtDir = res.vth >= 0 ? 1 : -1;
    // Transverse direction is theta + 90 deg (Pi/2)
    const vtx2 = px + vtDir * vtLen * Math.cos(theta + Math.PI / 2);
    const vty2 = py - vtDir * vtLen * Math.sin(theta + Math.PI / 2);
    
    if (vtLen < 2) {
        document.getElementById('vt-arrow').setAttribute('opacity', '0');
        document.getElementById('vt-label').setAttribute('opacity', '0');
    } else {
        document.getElementById('vt-arrow').setAttribute('opacity', '1');
        document.getElementById('vt-label').setAttribute('opacity', '1');
        document.getElementById('vt-arrow').setAttribute('x1', px);
        document.getElementById('vt-arrow').setAttribute('y1', py);
        document.getElementById('vt-arrow').setAttribute('x2', vtx2);
        document.getElementById('vt-arrow').setAttribute('y2', vty2);
        document.getElementById('vt-label').setAttribute('x', vtx2 + 8 * Math.cos(theta + Math.PI/2));
        document.getElementById('vt-label').setAttribute('y', vty2 - 8 * Math.sin(theta + Math.PI/2));
    }

    const vMagLen = res.vMag * vScale;
    const vx2 = px + res.vr * vScale * Math.cos(theta) + res.vth * vScale * Math.cos(theta + Math.PI / 2);
    const vy2 = py - res.vr * vScale * Math.sin(theta) - res.vth * vScale * Math.sin(theta + Math.PI / 2);
    
    if (vMagLen < 2) {
        document.getElementById('v-arrow').setAttribute('opacity', '0');
        document.getElementById('v-label').setAttribute('opacity', '0');
    } else {
        document.getElementById('v-arrow').setAttribute('opacity', '1');
        document.getElementById('v-label').setAttribute('opacity', '1');
        document.getElementById('v-arrow').setAttribute('x1', px);
        document.getElementById('v-arrow').setAttribute('y1', py);
        document.getElementById('v-arrow').setAttribute('x2', vx2);
        document.getElementById('v-arrow').setAttribute('y2', vy2);
        document.getElementById('v-label').setAttribute('x', vx2 + 10);
        // Prevent overlap of concurrent resultant text at theta=0
        if (vtLen < 2) {
            document.getElementById('v-label').setAttribute('y', vy2 - 25);
        } else {
            document.getElementById('v-label').setAttribute('y', vy2 - 10);
        }
    }

    // Live Dashboard Update
    document.getElementById('live-theta').textContent = theta.toFixed(3) + ' rad';
    document.getElementById('live-r').textContent = r.toFixed(4) + ' m';
    document.getElementById('live-vr').textContent = res.vr.toFixed(2) + ' m/s';
    document.getElementById('live-vt').textContent = res.vth.toFixed(2) + ' m/s';

    document.getElementById('time-slider').value = theta;
    document.getElementById('slider-val').textContent = theta.toFixed(3) + ' rad';
}

// ─── Animation Control ───
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
    cards[0].querySelector('.formula:nth-child(3)').innerHTML = `\\( \\dot{r} = ${R_COEFF} \\dot{\\theta} = ${R_COEFF} \\times ${THETA_DOT} = ${(R_COEFF * THETA_DOT).toFixed(2)} \\)`;
    cards[0].querySelector('.formula:nth-child(4)').innerHTML = `\\( \\ddot{r} = ${R_COEFF} \\ddot{\\theta} = 0 \\)`;
    cards[1].querySelector('.formula').innerHTML = `\\( r = ${R_COEFF} \\times ${THETA_EVAL.toFixed(4)} = ${res.r.toFixed(4)}\\text{ m} \\)`;
    cards[1].querySelector('.result').innerHTML = `\\( \\dot{r} = ${res.rd.toFixed(2)} \\quad | \\quad \\ddot{r} = ${res.rdd.toFixed(2)} \\)`;
    cards[2].querySelector('.formula:nth-child(3)').innerHTML = `\\( v_r = \\dot{r} = ${res.vr.toFixed(2)}\\text{ m/s} \\)`;
    cards[2].querySelector('.formula:nth-child(4)').innerHTML = `\\( v_{\\theta} = r \\dot{\\theta} = ${res.r.toFixed(4)} \\times ${THETA_DOT} = ${res.vth.toFixed(2)}\\text{ m/s} \\)`;
    cards[3].querySelector('.formula:nth-child(3)').innerHTML = `\\( a_r = \\ddot{r} - r \\dot{\\theta}^2 = 0 - ${res.r.toFixed(4)} \\times ${THETA_DOT}^2 = ${res.ar.toFixed(2)}\\text{ m/s}^2 \\)`;
    cards[3].querySelector('.formula:nth-child(4)').innerHTML = `\\( a_{\\theta} = r \\ddot{\\theta} + 2 \\dot{r} \\dot{\\theta} = 0 + 2 \\times ${res.rd.toFixed(2)} \\times ${THETA_DOT} = ${res.ath.toFixed(2)}\\text{ m/s}^2 \\)`;
    
    // Auto re-typeset using MathJax if loaded
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise();
    
    // Result grid upper
    document.getElementById('res-vr').textContent = res.vr.toFixed(3) + ' m/s';
    document.getElementById('res-vt').textContent = res.vth.toFixed(3) + ' m/s';
    document.getElementById('res-ar').textContent = res.ar.toFixed(3) + ' m/s²';
    document.getElementById('res-at').textContent = res.ath.toFixed(3) + ' m/s²';
}

function playAnimation() {
    if (isPlaying) {
        pauseAnimation();
        return;
    }
    isPlaying = true;
    document.getElementById('btn-play').textContent = '⏸ Pause';
    const duration = (THETA_EVAL / THETA_DOT) * 1000 * 2.5; // Scaled for better viewing speed
    const animObj = { theta: parseFloat(document.getElementById('time-slider').value) || 0 };
    if (animObj.theta >= THETA_EVAL - 0.001) animObj.theta = 0;
    
    animTimeline = anime({
        targets: animObj, theta: THETA_EVAL,
        duration: duration * (1 - animObj.theta / THETA_EVAL),
        easing: 'easeOutSine', // Cinematic slow approaching to final angle
        update: () => updateScene(animObj.theta),
        complete: () => {
            isPlaying = false;
            document.getElementById('btn-play').textContent = '▶ Play';
            document.querySelectorAll('.step-card').forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 150));
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
    document.getElementById('time-slider').value = 0;
    updateScene(0);
    document.querySelectorAll('.step-card').forEach(el => el.classList.remove('visible'));
}

// ─── Modal ───
function openModal() {
    document.getElementById('theory-modal').classList.add('active');
}
function closeModal() {
    document.getElementById('theory-modal').classList.remove('active');
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    recalcParams();
    buildScene();
    updateScene(0);

    document.getElementById('btn-play').addEventListener('click', playAnimation);
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
    
    // Initial Latex render trigger
    updateSolutionCards();
});
