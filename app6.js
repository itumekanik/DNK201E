const UI = {
    m: document.getElementById('input-m'),
    k: document.getElementById('input-k'),
    c: document.getElementById('input-c'),
    x0: document.getElementById('input-x0'),
    v0: document.getElementById('input-v0'),
    
    slider: document.getElementById('time-slider'),
    sliderVal: document.getElementById('slider-val'),
    
    btnApply: document.getElementById('btn-apply'),
    btnPlay: document.getElementById('btn-play'),
    btnReset: document.getElementById('btn-reset'),
    btnTheory: document.getElementById('btn-theory'),
    
    modal: document.getElementById('theory-modal'),
    btnClose: document.getElementById('modal-close'),
    
    // Live Data
    valT: document.getElementById('val-t'),
    valX: document.getElementById('val-x'),
    valV: document.getElementById('val-v'),
    valA: document.getElementById('val-a'),
    
    // SVG Elements
    cartGroup: document.getElementById('cartGroup'),
    springPath: document.getElementById('spring-path'),
    damperCyl: document.getElementById('damper-cylinder'),
    damperWall: document.getElementById('damper-line-wall'),
    damperPiston: document.getElementById('damper-piston'),
    damperRod: document.getElementById('damper-rod'),
    
    // MathJax Steps
    stepWn: document.getElementById('step-wn'),
    stepZeta: document.getElementById('step-zeta'),
    stepRegime: document.getElementById('step-regime'),
    stepDeq: document.getElementById('step-deq'),
    stepRoots: document.getElementById('step-roots'),
    stepFunc1: document.getElementById('step-func1'),
    stepFunc2: document.getElementById('step-func2')
};

let state = {
    m: 2, k: 8, c: 1, x0: 0.1, v0: 0,
    wn: 2, zeta: 0.125, wd: 1.9843,
    A: 0.1, B: 0.0126,
    s1: 0, s2: 0,
    regime: 'underdamped'
};

let animation = null;
let isPlaying = false;
let currentTime = 0;

function calculateSystem() {
    let m = parseFloat(UI.m.value) || 2;
    let k = parseFloat(UI.k.value) || 8;
    let c = parseFloat(UI.c.value) || 0;
    let x0 = parseFloat(UI.x0.value) || 0;
    let v0 = parseFloat(UI.v0.value) || 0;
    
    if(m <= 0) m = 0.1;
    if(k <= 0) k = 0.1;
    if(c < 0) c = 0;
    
    let wn = Math.sqrt(k / m);
    let zeta = c / (2 * Math.sqrt(k * m));
    let wd = 0, A = 0, B = 0, s1 = 0, s2 = 0;
    let regime = 'underdamped';
    
    if (Math.abs(zeta - 1) < 1e-4) {
        regime = 'critical';
        zeta = 1;
        A = x0;
        B = v0 + wn * x0;
    } else if (zeta < 1) {
        regime = 'underdamped';
        wd = wn * Math.sqrt(1 - zeta * zeta);
        B = x0;
        A = (v0 + zeta * wn * x0) / wd;
    } else {
        regime = 'overdamped';
        let term = wn * Math.sqrt(zeta * zeta - 1);
        s1 = -zeta * wn + term;
        s2 = -zeta * wn - term;
        A = (v0 - s2 * x0) / (s1 - s2);
        B = (s1 * x0 - v0) / (s1 - s2);
    }
    
    state = { m, k, c, x0, v0, wn, zeta, wd, A, B, s1, s2, regime };
    updateSolutionCards();
    initGraph();
}

function solvePosition(t) {
    let { wn, zeta, wd, A, B, s1, s2, regime } = state;
    let x = 0, v = 0, a = 0;
    
    if (regime === 'critical') {
        let e = Math.exp(-wn * t);
        x = (A + B * t) * e;
        v = (B - wn * (A + B * t)) * e;
        a = (-2 * wn * B + wn * wn * (A + B * t)) * e;
    } else if (regime === 'underdamped') {
        let e = Math.exp(-zeta * wn * t);
        let cw = Math.cos(wd * t);
        let sw = Math.sin(wd * t);
        x = e * (A * sw + B * cw);
        
        let dx_trig = A * wd * cw - B * wd * sw;
        v = -zeta * wn * x + e * dx_trig;
        
        let d2x_trig = -A * wd * wd * sw - B * wd * wd * cw;
        a = -zeta * wn * v + (-zeta * wn * e * dx_trig) + e * d2x_trig;
    } else {
        // overdamped
        let e1 = Math.exp(s1 * t);
        let e2 = Math.exp(s2 * t);
        x = A * e1 + B * e2;
        v = A * s1 * e1 + B * s2 * e2;
        a = A * s1 * s1 * e1 + B * s2 * s2 * e2;
    }
    return { x, v, a };
}

function drawSpring(xEnd, yOffset, loops) {
    let xStart = 20;
    // Flat ends for a more realistic mechanical spring
    let flatLen = 15;
    let flexLen = (xEnd - flatLen) - (xStart + flatLen);
    let w = flexLen / (loops * 2);
    let path = `M ${xStart} ${yOffset} L ${xStart + flatLen} ${yOffset} `;
    for (let i = 0; i < loops; i++) {
        path += `L ${xStart + flatLen + w * (2*i + 0.5)} ${yOffset - 12} `;
        path += `L ${xStart + flatLen + w * (2*i + 1.5)} ${yOffset + 12} `;
    }
    path += `L ${xEnd - flatLen} ${yOffset} L ${xEnd} ${yOffset}`;
    return path;
}

function updateVisuals(t) {
    let res = solvePosition(t);
    let px_per_m = 500; // Scale: 0.1m = 50px
    let dx = res.x * px_per_m;
    
    // Cart position (equilibrium shifted to x=280)
    let cartX = 280 + dx;
    UI.cartGroup.setAttribute('transform', `translate(${cartX}, 0)`);
    
    // Spring (yOffset = 10, connecting to left side of cart)
    let springAttachX = cartX - 50;
    UI.springPath.setAttribute('d', drawSpring(springAttachX, 10, 8));
    
    // Damper
    // Piston center connects to rod.
    let rodLength = 120;
    let pistonX = cartX - 50 - rodLength; 
    
    UI.damperPiston.setAttribute('x', pistonX);
    UI.damperRod.setAttribute('x', pistonX + 8);
    UI.damperRod.setAttribute('width', (cartX - 50) - (pistonX + 8));
    
    // Cart shadow
    let elShadow = document.getElementById('cart-shadow');
    if(elShadow) elShadow.setAttribute('cx', cartX);
    
    // Update labels
    UI.valT.textContent = t.toFixed(2) + " s";
    UI.valX.textContent = res.x.toFixed(4) + " m";
    UI.valV.textContent = res.v.toFixed(3) + " m/s";
    UI.valA.textContent = res.a.toFixed(3) + " m/s²";
    
    // Dot on graph
    let svgDot = document.getElementById('graph-dot');
    if(svgDot && window.graphSpan) {
        let maxT = window.graphMaxT || 15;
        let xG = 50 + (t / maxT) * 420;
        let yG = 130 - (res.x / window.graphMaxX) * 100;
        svgDot.setAttribute('cx', xG);
        svgDot.setAttribute('cy', yG);
    }
    
    UI.slider.value = t;
    UI.sliderVal.textContent = t.toFixed(2) + " s";
}

function initGraph() {
    let svg = document.getElementById('x-graph');
    svg.setAttribute('viewBox', '0 0 500 260');
    
    let pts = [];
    let envPos = [];
    let envNeg = [];
    
    let maxT = parseFloat(UI.slider.max);
    let maxAbsX = 0;
    
    for(let t=0; t<=maxT; t+=0.05) {
        let res = solvePosition(t);
        pts.push({t, x: res.x});
        if(Math.abs(res.x) > maxAbsX) maxAbsX = Math.abs(res.x);
        
        if (state.regime === 'underdamped') {
            let env = Math.exp(-state.zeta * state.wn * t) * Math.sqrt(state.A*state.A + state.B*state.B);
            envPos.push({t, x: env});
            envNeg.push({t, x: -env});
        }
    }
    
    if(maxAbsX < 0.01) maxAbsX = 0.01; // prevent div by zero
    let padding = maxAbsX * 0.2;
    let limitY = maxAbsX + padding;
    
    window.graphMaxX = limitY;
    window.graphSpan = limitY * 2;
    window.graphMaxT = maxT;
    
    function getX(t) { return 50 + (t / maxT) * 420; }
    function getY(x) { return 130 - (x / limitY) * 100; }
    
    let html = `
      <!-- Axes -->
      <line x1="50" y1="30" x2="50" y2="230" stroke="#94a3b8" stroke-width="2"/>
      <line x1="50" y1="130" x2="470" y2="130" stroke="#94a3b8" stroke-width="2"/>
      
      <!-- Axis Labels -->
      <text x="40" y="35" fill="#475569" font-size="11" font-family="'Inter', sans-serif" text-anchor="end">${limitY.toFixed(2)}</text>
      <text x="40" y="235" fill="#475569" font-size="11" font-family="'Inter', sans-serif" text-anchor="end">-${limitY.toFixed(2)}</text>
      <text x="40" y="134" fill="#475569" font-size="11" font-family="'Inter', sans-serif" text-anchor="end">0</text>
      
      <text x="470" y="145" fill="#475569" font-size="11" font-family="'Inter', sans-serif" text-anchor="middle">${maxT} s</text>
      <text x="50" y="145" fill="#475569" font-size="11" font-family="'Inter', sans-serif" text-anchor="middle">0 s</text>
      <text x="20" y="130" fill="#059669" font-size="12" font-weight="600" font-family="'Inter', sans-serif" text-anchor="middle" transform="rotate(-90 20 130)">Position x(t) [m]</text>
    `;

    // Envelopes
    if (state.regime === 'underdamped') {
        let dEnvP = envPos.map((p, i) => `${i===0?'M':'L'} ${getX(p.t)} ${getY(p.x)}`).join(' ');
        let dEnvN = envNeg.map((p, i) => `${i===0?'M':'L'} ${getX(p.t)} ${getY(p.x)}`).join(' ');
        html += `<path d="${dEnvP}" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4"/>`;
        html += `<path d="${dEnvN}" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4"/>`;
    }

    // Main Curve
    let d = pts.map((p, i) => `${i===0?'M':'L'} ${getX(p.t)} ${getY(p.x)}`).join(' ');
    html += `<path d="${d}" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    
    // Dot marker
    html += `<circle id="graph-dot" cx="${getX(0)}" cy="${getY(pts[0].x)}" r="5" fill="#047857" stroke="#fff" stroke-width="2"/>`;
    
    svg.innerHTML = html;
}

function updateSolutionCards() {
    let s = state;
    let dec = 4;
    
    UI.stepWn.innerHTML = `\\( \\omega_n = \\sqrt{\\frac{k}{m}} = \\sqrt{\\frac{${s.k}}{${s.m}}} = ${s.wn.toFixed(dec)} \\text{ rad/s} \\)`;
    UI.stepZeta.innerHTML = `\\( \\zeta = \\frac{c}{2\\sqrt{km}} = \\frac{${s.c}}{2\\sqrt{${s.k}\\times${s.m}}} = ${s.zeta.toFixed(dec)} \\)`;
    
    let regText = '';
    let eqText = '';
    let rootText = '';
    let funcText = '';
    
    if (s.regime === 'underdamped') {
        regText = `\\( \\zeta < 1 \\implies \\text{Underdamped (Subcritical)} \\)`;
        let d = s.zeta * s.wn;
        eqText = `\\( \\ddot{x} + ${(2*s.zeta*s.wn).toFixed(dec)} \\dot{x} + ${(s.wn*s.wn).toFixed(dec)} x = 0 \\)`;
        rootText = `\\( \\omega_d = \\omega_n \\sqrt{1-\\zeta^2} = ${s.wd.toFixed(dec)} \\text{ rad/s} \\)`;
        
        UI.stepFunc1.innerHTML = `\\( A = \\frac{v_0 + \\zeta\\omega_n x_0}{\\omega_d} = ${s.A.toFixed(dec)}, \\quad B = x_0 = ${s.B.toFixed(dec)} \\)`;
        funcText = `\\( x(t) = e^{-${d.toFixed(dec)} t} \\left( ${s.A.toFixed(dec)} \\sin(${s.wd.toFixed(dec)} t) + ${s.B.toFixed(dec)} \\cos(${s.wd.toFixed(dec)} t) \\right) \\)`;
    } else if (s.regime === 'critical') {
        regText = `\\( \\zeta = 1 \\implies \\text{Critically Damped} \\)`;
        eqText = `\\( \\ddot{x} + ${(2*s.wn).toFixed(dec)} \\dot{x} + ${(s.wn*s.wn).toFixed(dec)} x = 0 \\)`;
        rootText = `\\( s_{1,2} = -\\omega_n = -${s.wn.toFixed(dec)} \\)`;
        
        UI.stepFunc1.innerHTML = `\\( A = x_0 = ${s.A.toFixed(dec)}, \\quad B = v_0 + \\omega_n x_0 = ${s.B.toFixed(dec)} \\)`;
        funcText = `\\( x(t) = (${s.A.toFixed(dec)} + ${s.B.toFixed(dec)} t) e^{-${s.wn.toFixed(dec)} t} \\)`;
    } else {
        regText = `\\( \\zeta > 1 \\implies \\text{Overdamped} \\)`;
        eqText = `\\( \\ddot{x} + ${(2*s.zeta*s.wn).toFixed(dec)} \\dot{x} + ${(s.wn*s.wn).toFixed(dec)} x = 0 \\)`;
        rootText = `\\( s_1 = ${s.s1.toFixed(dec)}, \\quad s_2 = ${s.s2.toFixed(dec)} \\)`;
        
        UI.stepFunc1.innerHTML = `\\( A = \\frac{v_0 - s_2 x_0}{s_1 - s_2} = ${s.A.toFixed(dec)}, \\quad B = \\frac{s_1 x_0 - v_0}{s_1 - s_2} = ${s.B.toFixed(dec)} \\)`;
        funcText = `\\( x(t) = ${s.A.toFixed(dec)} e^{${s.s1.toFixed(dec)} t} + ${s.B.toFixed(dec)} e^{${s.s2.toFixed(dec)} t} \\)`;
    }
    
    UI.stepRegime.innerHTML = regText;
    UI.stepDeq.innerHTML = eqText;
    UI.stepRoots.innerHTML = rootText;
    UI.stepFunc2.innerHTML = funcText;
    
    // Theory Modal Numerical Substitution
    let numHtml = `
      <p>For the current system parameters:</p>
      <ul>
        <li>Mass: \\( m = ${s.m} \\text{ kg} \\)</li>
        <li>Spring constant: \\( k = ${s.k} \\text{ N/m} \\)</li>
        <li>Damping coefficient: \\( c = ${s.c} \\text{ N-s/m} \\)</li>
      </ul>
      <p>The natural frequency and damping ratio are:</p>
      <div class="modal-formula">
        $$ \\omega_n = \\sqrt{\\frac{${s.k}}{${s.m}}} = ${s.wn.toFixed(dec)} \\text{ rad/s} $$
        $$ \\zeta = \\frac{${s.c}}{2\\sqrt{${s.k} \\cdot ${s.m}}} = ${s.zeta.toFixed(dec)} $$
      </div>
    `;
    
    if (s.regime === 'underdamped') {
        numHtml += `
          <p>Since \\( \\zeta < 1 \\), the system is underdamped. The damped natural frequency is:</p>
          <div class="modal-formula">
            $$ \\omega_d = ${s.wn.toFixed(dec)} \\sqrt{1 - ${s.zeta.toFixed(dec)}^2} = ${s.wd.toFixed(dec)} \\text{ rad/s} $$
          </div>
          <p>Applying the initial conditions \\( x(0) = ${s.x0} \\) and \\( \\dot{x}(0) = ${s.v0} \\) to find A and B:</p>
          <div class="modal-formula">
            $$ A = \\frac{${s.v0} + (${s.zeta.toFixed(dec)})(${s.wn.toFixed(dec)})(${s.x0})}{${s.wd.toFixed(dec)}} = ${s.A.toFixed(dec)} $$
            $$ B = ${s.x0} $$
          </div>
          <p>Final Position Function:</p>
          <div class="modal-result">
            $$ x(t) = e^{-${(s.zeta*s.wn).toFixed(dec)} t} \\left( ${s.A.toFixed(dec)} \\sin(${s.wd.toFixed(dec)} t) + ${s.B.toFixed(dec)} \\cos(${s.wd.toFixed(dec)} t) \\right) $$
          </div>
        `;
    } else if (s.regime === 'critical') {
        numHtml += `
          <p>Since \\( \\zeta = 1 \\), the system is critically damped. Applying initial conditions:</p>
          <div class="modal-formula">
            $$ A = ${s.x0} $$
            $$ B = ${s.v0} + (${s.wn.toFixed(dec)})(${s.x0}) = ${s.B.toFixed(dec)} $$
          </div>
          <p>Final Position Function:</p>
          <div class="modal-result">
            $$ x(t) = (${s.A.toFixed(dec)} + ${s.B.toFixed(dec)} t) e^{-${s.wn.toFixed(dec)} t} $$
          </div>
        `;
    } else {
        numHtml += `
          <p>Since \\( \\zeta > 1 \\), the system is overdamped. The roots are:</p>
          <div class="modal-formula">
            $$ s_1 = ${s.s1.toFixed(dec)}, \\quad s_2 = ${s.s2.toFixed(dec)} $$
          </div>
          <p>Applying initial conditions:</p>
          <div class="modal-formula">
            $$ A = \\frac{${s.v0} - (${s.s2.toFixed(dec)})(${s.x0})}{${s.s1.toFixed(dec)} - (${s.s2.toFixed(dec)})} = ${s.A.toFixed(dec)} $$
            $$ B = \\frac{(${s.s1.toFixed(dec)})(${s.x0}) - ${s.v0}}{${s.s1.toFixed(dec)} - (${s.s2.toFixed(dec)})} = ${s.B.toFixed(dec)} $$
          </div>
          <p>Final Position Function:</p>
          <div class="modal-result">
            $$ x(t) = ${s.A.toFixed(dec)} e^{${s.s1.toFixed(dec)} t} + ${s.B.toFixed(dec)} e^{${s.s2.toFixed(dec)} t} $$
          </div>
        `;
    }
    
    let elNumContent = document.getElementById('theory-num-content');
    if (elNumContent) elNumContent.innerHTML = numHtml;
    
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise();
    }
}

// Controls
UI.btnApply.addEventListener('click', () => {
    calculateSystem();
    currentTime = 0;
    if(animation) animation.pause();
    isPlaying = false;
    updateVisuals(0);
});

UI.btnReset.addEventListener('click', () => {
    UI.m.value = 2;
    UI.k.value = 8;
    UI.c.value = 1;
    UI.x0.value = 0.1;
    UI.v0.value = 0;
    calculateSystem();
    currentTime = 0;
    if(animation) animation.pause();
    isPlaying = false;
    updateVisuals(0);
});

UI.slider.addEventListener('input', (e) => {
    if(animation) animation.pause();
    isPlaying = false;
    currentTime = parseFloat(e.target.value);
    updateVisuals(currentTime);
});

UI.btnPlay.addEventListener('click', () => {
    if(isPlaying) {
        animation.pause();
        isPlaying = false;
    } else {
        isPlaying = true;
        let maxTime = parseFloat(UI.slider.max);
        
        animation = anime({
            targets: { t: currentTime },
            t: maxTime,
            duration: (maxTime - currentTime) * 1000,
            easing: 'linear',
            update: function(anim) {
                currentTime = anim.animatables[0].target.t;
                updateVisuals(currentTime);
                if(currentTime >= maxTime) {
                    anim.pause();
                    isPlaying = false;
                }
            }
        });
    }
});

// Modals
UI.btnTheory.addEventListener('click', () => UI.modal.classList.add('active'));
UI.btnClose.addEventListener('click', () => UI.modal.classList.remove('active'));

// Initial render
calculateSystem();
updateVisuals(0);
