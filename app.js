// Physics constants
const V0 = 10, Y0 = 20, G = 9.81;
const T_TOP = V0 / G;
const Y_MAX = Y0 + V0 * T_TOP - 0.5 * G * T_TOP * T_TOP;
const T_GROUND = (V0 + Math.sqrt(V0 * V0 + 2 * G * Y0)) / G;
const V_GROUND = V0 - G * T_GROUND;

function velocity(t) { return V0 - G * t; }
function position(t) { return Y0 + V0 * t - 0.5 * G * t * t; }

// ─── SVG Scene ───
const SIM_W = 300, SIM_H = 460;
const GROUND_Y = SIM_H - 28;
const MAX_Y_SCENE = 28;
const mToPx = (m) => GROUND_Y - (m / MAX_Y_SCENE) * (GROUND_Y - 30);

function buildScene() {
    const svg = document.getElementById('sim-svg');
    svg.setAttribute('viewBox', `0 0 ${SIM_W} ${SIM_H}`);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bfdbfe"/>
      <stop offset="70%" stop-color="#dbeafe"/>
      <stop offset="100%" stop-color="#bbf7d0"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="2" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  `;
    svg.appendChild(defs);

    // Sky
    addRect(svg, 0, 0, SIM_W, SIM_H, 'url(#skyGrad)');
    // Ground
    addRect(svg, 0, GROUND_Y, SIM_W, SIM_H - GROUND_Y, '#86efac');
    addLine(svg, 0, GROUND_Y, SIM_W, GROUND_Y, '#22c55e', 2);
    for (let x = 0; x < SIM_W; x += 10) {
        addLine(svg, x, GROUND_Y, x - 6, SIM_H, '#4ade80', 1, 0.3);
    }

    // Building
    const bx = 50, bw = 55;
    addRect(svg, bx, mToPx(22), bw, GROUND_Y - mToPx(22), '#cbd5e1', '#94a3b8', 1);
    for (let floor = 0; floor < 4; floor++) {
        const fy = mToPx(5 + floor * 5);
        for (let wx = 0; wx < 2; wx++) {
            const wy = fy - 5;
            const wxx = bx + 8 + wx * 26;
            const isLaunch = floor === 3;
            addRect(svg, wxx, wy, 14, 11, isLaunch ? '#fbbf24' : '#e2e8f0', isLaunch ? '#f59e0b' : '#94a3b8', 1);
        }
    }

    // Y-axis
    for (let m = 0; m <= 25; m += 5) {
        const py = mToPx(m);
        addLine(svg, 14, py, 22, py, '#94a3b8', 1, 0.6);
        addText(svg, 2, py + 4, `${m}`, '#64748b', '9px');
    }
    addText(svg, 2, mToPx(27), 'y(m)', '#64748b', '9px');

    // Trajectory
    let pathD = '';
    for (let t = 0; t <= T_GROUND; t += 0.02) {
        const px = 145, py = mToPx(position(t));
        pathD += (t === 0 ? 'M' : 'L') + `${px},${py} `;
    }
    const trajPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trajPath.setAttribute('d', pathD);
    trajPath.setAttribute('fill', 'none');
    trajPath.setAttribute('stroke', '#2563eb');
    trajPath.setAttribute('stroke-width', '1.5');
    trajPath.setAttribute('stroke-dasharray', '4,4');
    trajPath.setAttribute('opacity', '0.25');
    svg.appendChild(trajPath);

    // Max height line
    addLine(svg, 28, mToPx(Y_MAX), 195, mToPx(Y_MAX), '#d97706', 1, 0.5, '5,4');
    addText(svg, 198, mToPx(Y_MAX) + 4, `y_max=${Y_MAX.toFixed(1)}m`, '#d97706', '9px');
    // Window line
    addLine(svg, 28, mToPx(Y0), 195, mToPx(Y0), '#7c3aed', 1, 0.35, '5,4');
    addText(svg, 198, mToPx(Y0) + 4, 'y₀=20m', '#7c3aed', '9px');
    // Ground label
    addText(svg, 198, GROUND_Y - 4, 'y=0', '#64748b', '9px');

    // Ball glow
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('cx', 145); glow.setAttribute('cy', mToPx(Y0));
    glow.setAttribute('r', 16);
    glow.setAttribute('fill', 'rgba(37,99,235,0.15)');
    glow.id = 'ball-glow';
    svg.appendChild(glow);

    // Ball
    const ball = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ball.setAttribute('cx', 145); ball.setAttribute('cy', mToPx(Y0));
    ball.setAttribute('r', 7);
    ball.setAttribute('fill', '#2563eb');
    ball.setAttribute('filter', 'url(#glow)');
    ball.id = 'ball';
    svg.appendChild(ball);

    // Velocity arrow
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    arrow.setAttribute('x1', 163); arrow.setAttribute('y1', mToPx(Y0));
    arrow.setAttribute('x2', 163); arrow.setAttribute('y2', mToPx(Y0) - 35);
    arrow.setAttribute('stroke', '#059669');
    arrow.setAttribute('stroke-width', '2.5');
    arrow.setAttribute('marker-end', 'url(#arrowHead)');
    arrow.id = 'vel-arrow';
    svg.appendChild(arrow);

    // Arrowhead
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowHead');
    marker.setAttribute('markerWidth', '10'); marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '10'); marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    const mp = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    mp.setAttribute('points', '0 0, 10 3.5, 0 7');
    mp.setAttribute('fill', '#059669');
    marker.appendChild(mp);
    defs.appendChild(marker);

    // Time label
    addText(svg, 120, SIM_H - 6, 't = 0.00 s', '#475569', '11px', 'time-label');
}

function addRect(svg, x, y, w, h, fill, stroke, sw, op) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y);
    r.setAttribute('width', w); r.setAttribute('height', h);
    r.setAttribute('fill', fill || 'none');
    if (stroke) { r.setAttribute('stroke', stroke); r.setAttribute('stroke-width', sw || 1); }
    if (op) r.setAttribute('opacity', op);
    svg.appendChild(r);
}

function addLine(svg, x1, y1, x2, y2, stroke, sw, op, dash) {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', x1); l.setAttribute('y1', y1);
    l.setAttribute('x2', x2); l.setAttribute('y2', y2);
    l.setAttribute('stroke', stroke); l.setAttribute('stroke-width', sw || 1);
    if (op) l.setAttribute('opacity', op);
    if (dash) l.setAttribute('stroke-dasharray', dash);
    svg.appendChild(l);
}

function addText(svg, x, y, text, fill, size, id) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('fill', fill);
    t.setAttribute('font-family', "'JetBrains Mono', monospace");
    t.setAttribute('font-size', size || '10px');
    t.textContent = text;
    if (id) t.id = id;
    svg.appendChild(t);
}

// ─── Graphs ───
function buildGraph(svgId, type) {
    const svg = document.getElementById(svgId);
    const W = 440, H = 300;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const margin = { t: 18, r: 16, b: 34, l: 48 };
    const pw = W - margin.l - margin.r, ph = H - margin.t - margin.b;

    const tMax = Math.ceil(T_GROUND * 10) / 10 + 0.2;
    let yMin, yMax;
    if (type === 'v') { yMin = Math.floor(V_GROUND / 5) * 5; yMax = 15; }
    else { yMin = -2; yMax = 28; }

    const scaleX = (t) => margin.l + (t / tMax) * pw;
    const scaleY = (val) => margin.t + ph - ((val - yMin) / (yMax - yMin)) * ph;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const yStep = 5;
    for (let v = yMin; v <= yMax; v += yStep) {
        addLine(g, margin.l, scaleY(v), W - margin.r, scaleY(v), '#e2e8f0', 1);
        addText(g, margin.l - 30, scaleY(v) + 3, v.toFixed(0), '#94a3b8', '9px');
    }
    for (let t = 0; t <= tMax; t += 0.5) {
        addLine(g, scaleX(t), margin.t, scaleX(t), H - margin.b, '#e2e8f0', 1);
        addText(g, scaleX(t) - 5, H - margin.b + 14, t.toFixed(1), '#94a3b8', '9px');
    }

    addLine(g, margin.l, margin.t, margin.l, H - margin.b, '#94a3b8', 1.5);
    addLine(g, margin.l, H - margin.b, W - margin.r, H - margin.b, '#94a3b8', 1.5);

    if (type === 'v') addLine(g, margin.l, scaleY(0), W - margin.r, scaleY(0), '#94a3b8', 1, 0.4, '4,4');

    addText(g, W / 2 - 8, H - 4, 't (s)', '#64748b', '10px');
    addText(g, 4, margin.t - 5, type === 'v' ? 'v (m/s)' : 'y (m)', '#64748b', '10px');
    svg.appendChild(g);

    const color = type === 'v' ? '#059669' : '#d97706';
    const STEPS = 200;

    // Pre-compute all point coordinates
    const points = [];
    for (let i = 0; i <= STEPS; i++) {
        const t = (i / STEPS) * T_GROUND;
        const val = type === 'v' ? velocity(t) : position(t);
        points.push({ x: scaleX(t).toFixed(1), y: scaleY(val).toFixed(1) });
    }

    const curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    curve.setAttribute('d', `M${points[0].x},${points[0].y}`);
    curve.setAttribute('fill', 'none');
    curve.setAttribute('stroke', color);
    curve.setAttribute('stroke-width', '2.5');
    curve.setAttribute('stroke-linecap', 'round');
    curve.id = `${type}-curve`;
    svg.appendChild(curve);

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', scaleX(0)); dot.setAttribute('cy', scaleY(type === 'v' ? V0 : Y0));
    dot.setAttribute('r', 5); dot.setAttribute('fill', color);
    dot.id = `${type}-dot`;
    svg.appendChild(dot);

    // Key points
    const keyPoints = type === 'v' ? [
        { t: 0, val: V0, label: `v₀=10 m/s` },
        { t: T_TOP, val: 0, label: `v=0 (t=${T_TOP.toFixed(2)}s)` },
        { t: T_GROUND, val: V_GROUND, label: `v=${V_GROUND.toFixed(1)} m/s` },
    ] : [
        { t: 0, val: Y0, label: `y₀=20m` },
        { t: T_TOP, val: Y_MAX, label: `y_max=${Y_MAX.toFixed(1)}m` },
        { t: T_GROUND, val: 0, label: `y=0 (t=${T_GROUND.toFixed(2)}s)` },
    ];

    keyPoints.forEach(p => {
        const cx = scaleX(p.t), cy = scaleY(p.val);
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', cx); c.setAttribute('cy', cy);
        c.setAttribute('r', 4); c.setAttribute('fill', 'white');
        c.setAttribute('stroke', color); c.setAttribute('stroke-width', 2);
        c.setAttribute('opacity', '0');
        c.classList.add('key-point');
        svg.appendChild(c);

        const offY = p.val > (yMax + yMin) / 2 ? -10 : 14;
        const offX = p.t > tMax * 0.7 ? -75 : 6;
        const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lbl.setAttribute('x', cx + offX); lbl.setAttribute('y', cy + offY);
        lbl.setAttribute('fill', '#1e293b');
        lbl.setAttribute('font-size', '9px');
        lbl.setAttribute('font-family', "'JetBrains Mono', monospace");
        lbl.setAttribute('font-weight', '600');
        lbl.setAttribute('opacity', '0');
        lbl.textContent = p.label;
        lbl.classList.add('key-point');
        svg.appendChild(lbl);
    });

    return { curve, dot, scaleX, scaleY, points, STEPS };
}

// ─── Animation ───
let animTimeline = null, isPlaying = false, vGraph, yGraph;

function initGraphs() {
    vGraph = buildGraph('v-graph', 'v');
    yGraph = buildGraph('y-graph', 'y');
}

function updateScene(t) {
    t = Math.min(t, T_GROUND);
    const y = Math.max(position(t), 0);
    const v = velocity(t);
    const ballPy = mToPx(y);

    document.getElementById('ball').setAttribute('cy', ballPy);
    document.getElementById('ball-glow').setAttribute('cy', ballPy);

    const arrow = document.getElementById('vel-arrow');
    const arrowLen = Math.abs(v) * 2;
    const arrowDir = v >= 0 ? -1 : 1;
    arrow.setAttribute('y1', ballPy);
    arrow.setAttribute('y2', ballPy + arrowDir * arrowLen);

    const tl = document.getElementById('time-label');
    if (tl) tl.textContent = `t = ${t.toFixed(2)} s`;

    document.getElementById('live-t').textContent = t.toFixed(3) + ' s';
    document.getElementById('live-v').textContent = v.toFixed(2) + ' m/s';
    document.getElementById('live-y').textContent = y.toFixed(2) + ' m';
    document.getElementById('live-a').textContent = '-9.81 m/s²';

    // Update graphs: rebuild path up to current step for perfect dot-curve sync
    function updateGraph(graph, dotId, t, val) {
        const stepIdx = Math.round((t / T_GROUND) * graph.STEPS);
        let d = `M${graph.points[0].x},${graph.points[0].y}`;
        for (let i = 1; i <= stepIdx; i++) {
            d += ` L${graph.points[i].x},${graph.points[i].y}`;
        }
        graph.curve.setAttribute('d', d);
        document.getElementById(dotId).setAttribute('cx', graph.scaleX(t));
        document.getElementById(dotId).setAttribute('cy', graph.scaleY(val));
    }
    if (vGraph) updateGraph(vGraph, 'v-dot', t, v);
    if (yGraph) updateGraph(yGraph, 'y-dot', t, y);

    document.getElementById('time-slider').value = t;
    document.getElementById('slider-val').textContent = t.toFixed(2) + ' s';
}

function playAnimation() {
    if (isPlaying) return;
    isPlaying = true;
    document.getElementById('btn-play').textContent = '⏸ Duraklat';

    const animObj = { t: parseFloat(document.getElementById('time-slider').value) || 0 };
    animTimeline = anime({
        targets: animObj,
        t: T_GROUND,
        duration: 5000 * (1 - animObj.t / T_GROUND),
        easing: 'linear',
        update: () => updateScene(animObj.t),
        complete: () => {
            isPlaying = false;
            document.getElementById('btn-play').textContent = '▶ Başlat';
            document.querySelectorAll('.key-point').forEach((el, i) => {
                setTimeout(() => el.setAttribute('opacity', '1'), i * 150);
            });
            document.querySelectorAll('.step-card').forEach((el, i) => {
                setTimeout(() => el.classList.add('visible'), i * 250);
            });
        }
    });
}

function pauseAnimation() {
    if (animTimeline) animTimeline.pause();
    isPlaying = false;
    document.getElementById('btn-play').textContent = '▶ Başlat';
}

function resetAnimation() {
    if (animTimeline) animTimeline.pause();
    isPlaying = false;
    document.getElementById('btn-play').textContent = '▶ Başlat';
    updateScene(0);
    document.querySelectorAll('.key-point').forEach(el => el.setAttribute('opacity', '0'));
    document.querySelectorAll('.step-card').forEach(el => el.classList.remove('visible'));
}

document.addEventListener('DOMContentLoaded', () => {
    buildScene();
    initGraphs();
    updateScene(0);

    document.getElementById('btn-play').addEventListener('click', () => {
        if (isPlaying) pauseAnimation(); else playAnimation();
    });
    document.getElementById('btn-reset').addEventListener('click', resetAnimation);

    const slider = document.getElementById('time-slider');
    slider.max = T_GROUND.toFixed(3);
    slider.addEventListener('input', (e) => {
        if (isPlaying) pauseAnimation();
        updateScene(parseFloat(e.target.value));
    });
});
