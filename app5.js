const UI = {
    wAB: document.getElementById('input-w'),
    slider: document.getElementById('time-slider'),
    sliderVal: document.getElementById('slider-val'),
    btnApply: document.getElementById('btn-apply'),
    btnPlay: document.getElementById('btn-play'),
    btnReset: document.getElementById('btn-reset'),
    btnTheory: document.getElementById('btn-theory'),
    modal: document.getElementById('theory-modal'),
    btnClose: document.getElementById('modal-close'),
    
    // Live data
    valWab: document.getElementById('val-wab'),
    valWbc: document.getElementById('val-wbc'),
    valWcd: document.getElementById('val-wcd'),
    valVr: document.getElementById('val-vr'),
    
    valPosB: document.getElementById('val-posb'),
    valPosC: document.getElementById('val-posc'),
    
    // SVGs
    simSvg: document.getElementById('mechanism'),
    gearGroup: document.getElementById('gearGroup'),
    rackGroup: document.getElementById('rackGroup'),
    linkAb: document.getElementById('link-ab'),
    linkBc: document.getElementById('link-bc'),
    linkCd: document.getElementById('link-cd'),
    pinBab: document.getElementById('pin-b-ab'),
    pinBbc: document.getElementById('pin-b-bc'),
    pinC: document.getElementById('pin-c'),
    labelB: document.getElementById('label-b'),
    labelC: document.getElementById('label-c'),
    vecVb: document.getElementById('vec-vb'),
    vecVc: document.getElementById('vec-vc')
};

// Generate teeth for gear and rack
const gearTeethPath = document.getElementById('gear-teeth');
const rackTeethPath = document.getElementById('rack-teeth');

let nTeeth = 20;
let rOuterOuter = 66, rInnerInner = 54;
let path = '';
for(let i=0; i<nTeeth; i++) {
  let a1 = (i*2*Math.PI)/nTeeth, a2 = ((i+0.3)*2*Math.PI)/nTeeth;
  let a3 = ((i+0.5)*2*Math.PI)/nTeeth, a4 = ((i+0.8)*2*Math.PI)/nTeeth;
  path += `M ${220 + rInnerInner*Math.cos(a1)} ${rInnerInner*Math.sin(a1)} `;
  path += `L ${220 + rOuterOuter*Math.cos(a2)} ${rOuterOuter*Math.sin(a2)} `;
  path += `L ${220 + rOuterOuter*Math.cos(a3)} ${rOuterOuter*Math.sin(a3)} `;
  path += `L ${220 + rInnerInner*Math.cos(a4)} ${rInnerInner*Math.sin(a4)} `;
  path += `Z `;
}
gearTeethPath.setAttribute('d', path);

let rPath = '';
for(let i=-60; i<60; i++) {
  let y = i * (Math.PI*2*60)/nTeeth;
  rPath += `M 280 ${y} L 273 ${y+4} L 273 ${y+14} L 280 ${y+18} Z `;
}
rackTeethPath.setAttribute('d', rPath);

let animation = null;
let isPlaying = false;
let time = 0;
let inputW = -10; // Clockwise by default

const state = {
    xD: 22, yD: 0,
    L_AB: 13.41640786, L_BC: 16.1245155, L_CD: 10,
    thetaAB_0: 1.1071487, thetaCD_0: 1.5707963
};

function solveKinematics(t) {
    let w_AB = inputW;
    let thetaAB = state.thetaAB_0 + w_AB * t;
    
    let xB = state.L_AB * Math.cos(thetaAB);
    let yB = state.L_AB * Math.sin(thetaAB);
    
    let dx = state.xD - xB, dy = state.yD - yB;
    let d = Math.sqrt(dx*dx + dy*dy);
    
    // Check bounds to prevent NaN when linkage breaks
    if(d > state.L_BC + state.L_CD || d < Math.abs(state.L_BC - state.L_CD)) {
        return null;
    }
    
    let a = (state.L_BC*state.L_BC - state.L_CD*state.L_CD + d*d) / (2*d);
    let h = Math.sqrt(Math.max(0, state.L_BC*state.L_BC - a*a));
    let P2x = xB + (a/d) * dx;
    let P2y = yB + (a/d) * dy;
    
    // We analyzed root direction and minus-plus matches geometry.
    let xC = P2x - (h/d) * dy;
    let yC = P2y + (h/d) * dx;
    
    let vBx = -yB * w_AB;
    let vBy = xB * w_AB;
    
    let dxCB = xC - xB, dyCB = yC - yB;
    let dxCD = xC - state.xD, dyCD = yC - state.yD;
    
    let det = dyCB * dxCD - dyCD * dxCB;
    let w_BC = 0, w_CD = 0;
    if(Math.abs(det) > 1e-6) {
        w_BC = (-dxCD * (-vBx) - dyCD * (-vBy)) / det;
        w_CD = (-dyCB * (-vBy) - dxCB * (-vBx)) / det;
    }
    
    let thetaCD = Math.atan2(yC - state.yD, xC - state.xD);
    
    return {
        xB, yB, xC, yC, w_AB, w_BC, w_CD, vRack: w_CD * 6, thetaCD
    };
}

function updateVisuals(t) {
    let res = solveKinematics(t);
    if(!res) {
        if(animation) animation.pause();
        isPlaying = false;
        return; // Singularity / toggle position reached
    }
    
    // 1 in = 10 px
    let sxB = res.xB * 10, syB = -res.yB * 10;
    let sxC = res.xC * 10, syC = -res.yC * 10;
    
    UI.linkAb.setAttribute('x2', sxB);
    UI.linkAb.setAttribute('y2', syB);
    UI.pinBab.setAttribute('cx', sxB);
    UI.pinBab.setAttribute('cy', syB);
    
    UI.linkBc.setAttribute('x1', sxB);
    UI.linkBc.setAttribute('y1', syB);
    UI.linkBc.setAttribute('x2', sxC);
    UI.linkBc.setAttribute('y2', syC);
    UI.pinBbc.setAttribute('cx', sxB);
    UI.pinBbc.setAttribute('cy', syB);
    
    UI.labelB.setAttribute('x', sxB - 15);
    UI.labelB.setAttribute('y', syB - 15);
    UI.labelC.setAttribute('x', sxC - 15);
    UI.labelC.setAttribute('y', syC - 15);
    
    // Draw Velocity Vectors (Scale: 0.5 for visual limits)
    let vScale = 0.5;
    let vBx = -res.yB * res.w_AB;
    let vBy = res.xB * res.w_AB;
    let vCx = -res.yC * res.w_CD;
    let vCy = (res.xC - state.xD) * res.w_CD;
    
    UI.vecVb.setAttribute('x1', sxB);
    UI.vecVb.setAttribute('y1', syB);
    UI.vecVb.setAttribute('x2', sxB + vBx * vScale);
    UI.vecVb.setAttribute('y2', syB - vBy * vScale); // SVG y is inverted
    
    UI.vecVc.setAttribute('x1', sxC);
    UI.vecVc.setAttribute('y1', syC);
    UI.vecVc.setAttribute('x2', sxC + vCx * vScale);
    UI.vecVc.setAttribute('y2', syC - vCy * vScale);
    
    let rot = -(res.thetaCD - state.thetaCD_0) * 180 / Math.PI;
    UI.gearGroup.setAttribute('transform', `rotate(${rot} 220 0)`);
    
    let rackDisp = -60 * (res.thetaCD - state.thetaCD_0);
    UI.rackGroup.setAttribute('transform', `translate(0, ${rackDisp})`);
    
    // UNIT Display Conversion
    let isSI = document.getElementById('units-select')?.value === 'SI';
    let mult = isSI ? 25.4 : 1;
    let lenU = isSI ? 'mm' : 'in';
    let velU = isSI ? 'mm/s' : 'in/s';

    UI.valWab.textContent = res.w_AB.toFixed(2) + " rad/s";
    UI.valWbc.textContent = res.w_BC.toFixed(2) + " rad/s";
    UI.valWcd.textContent = res.w_CD.toFixed(2) + " rad/s";
    
    let vr_val = res.vRack * mult;
    let vr_alt = isSI ? (res.vRack * 0.0254).toFixed(3) + " m/s" : (res.vRack / 12).toFixed(3) + " ft/s";
    UI.valVr.textContent = vr_val.toFixed(2) + " " + velU + " (" + vr_alt + ")";
    
    UI.valPosB.textContent = (res.xB * mult).toFixed(2) + ", " + (res.yB * mult).toFixed(2) + " " + lenU;
    UI.valPosC.textContent = (res.xC * mult).toFixed(2) + ", " + (res.yC * mult).toFixed(2) + " " + lenU;
    
    let svgDot = document.getElementById('graph-dot');
    if(svgDot && window.graphSpan) {
        let maxT = window.graphMaxT || 0.25;
        let x = 60 + (t / maxT) * 400;
        let y = 220 - ((vr_val - window.graphMinV) / window.graphSpan) * 190;
        svgDot.setAttribute('cx', x);
        svgDot.setAttribute('cy', y);
    }
    
    UI.slider.value = t;
    UI.sliderVal.textContent = t.toFixed(3) + " s";
}

UI.btnApply.addEventListener('click', () => {
    let w = parseFloat(UI.wAB.value);
    inputW = -Math.abs(w); // Map to CW
    time = 0;
    if(animation) animation.pause();
    isPlaying = false;
    updateSolutionCards();
    initGraph();
    updateVisuals(0);
});

// Unit change trigger
document.getElementById('units-select')?.addEventListener('change', () => {
    updateSolutionCards();
    initGraph();
    updateVisuals(time);
});

UI.btnReset.addEventListener('click', () => {
    time = 0;
    if(animation) animation.pause();
    isPlaying = false;
    updateVisuals(0);
});

UI.slider.addEventListener('input', (e) => {
    if(animation) animation.pause();
    isPlaying = false;
    time = parseFloat(e.target.value);
    updateVisuals(time);
});

UI.btnPlay.addEventListener('click', () => {
    if(isPlaying) {
        animation.pause();
        isPlaying = false;
    } else {
        isPlaying = true;
        let maxTime = parseFloat(UI.slider.max);
        
        animation = anime({
            targets: { t: time },
            t: maxTime,
            duration: (maxTime - time) * 1000 * 10, // 10x slower for better visual
            easing: 'linear',
            update: function(anim) {
                time = anim.animatables[0].target.t;
                updateVisuals(time);
                if(time >= maxTime) {
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

function updateSolutionCards() {
    let u = document.getElementById('units-select')?.value || 'US';
    let isSI = (u === 'SI');
    let m = isSI ? 25.4 : 1;
    let lenU = isSI ? 'mm' : 'in';
    let velU = isSI ? 'mm/s' : 'in/s';
    
    let elLabc = document.getElementById('val-labc');
    if (elLabc) elLabc.textContent = (13.4164*m).toFixed(2) + ', ' + (16.1245*m).toFixed(2) + ' ' + lenU;
    let elLcd = document.getElementById('val-lcd');
    if (elLcd) elLcd.textContent = (10*m).toFixed(2) + ', ' + (6*m).toFixed(2) + ' ' + lenU;
    
    const stepCards = document.querySelectorAll('.step-card');
    if (stepCards.length < 3) return;
    
    let w = inputW;
    let xb = 6*m, yb = 12*m;
    let rcbx = 16*m, rcby = -2*m;
    let rcdy = 10*m;
    let rg = 6*m;
    
    let vbx = -w * yb;
    let vby = w * xb;
    
    let wbc = -vby / 16 / m; 
    let wcd = -(vbx - 2*m * wbc) / 10 / m;
    let vr = wcd * rg;
    
    let secText = isSI ? `(${(Math.abs(vr) / 1000).toFixed(4)} \\text{ m/s})` : `(${(Math.abs(vr) / 12).toFixed(3)} \\text{ ft/s})`;
    
    // Step Cards Update (Fix for DOM selector crash)
    let f0 = stepCards[0].querySelectorAll('.formula');
    f0[0].innerHTML = `\\( \\vec{r}_{B/A} = (${xb.toFixed(1)}\\hat{i} + ${yb.toFixed(1)}\\hat{j}) \\text{ ${lenU}} \\)`;
    f0[1].innerHTML = `\\( \\vec{v}_B = \\vec{\\omega}_{AB} \\times \\vec{r}_{B/A} = (${w}\\hat{k}) \\times (${xb.toFixed(1)}\\hat{i} + ${yb.toFixed(1)}\\hat{j}) \\)`;
    stepCards[0].querySelectorAll('.result')[0].innerHTML = `\\( \\vec{v}_B = ${vbx.toFixed(1)}\\hat{i} + ${vby.toFixed(1)}\\hat{j} \\text{ ${velU}} \\)`;
    
    let r1 = stepCards[1].querySelectorAll('.result');
    r1[0].innerHTML = `\\( (v_C)_x = ${vbx.toFixed(1)}${rcby<0?'+':'-'} ${Math.abs(rcby).toFixed(1)}\\omega_{BC} = -${rcdy.toFixed(1)}\\omega_{CD} \\)`;
    r1[1].innerHTML = `\\( (v_C)_y = ${vby.toFixed(1)}${rcbx>0?'+':'-'} ${Math.abs(rcbx).toFixed(1)}\\omega_{BC} = 0 \\)`;
    
    let f2 = stepCards[2].querySelectorAll('.formula');
    f2[0].innerHTML = `\\( \\omega_{BC} = \\frac{${-vby.toFixed(1)}}{${Math.abs(rcbx).toFixed(1)}} = ${wbc.toFixed(2)} \\text{ rad/s} \\)`;
    f2[1].innerHTML = `\\( \\omega_{CD} = \\frac{-(${vbx.toFixed(1)} ${rcby<0?'-':'+'} ${Math.abs(rcby).toFixed(1)}(${wbc.toFixed(2)}))}{${rcdy.toFixed(1)}} = ${wcd.toFixed(2)} \\text{ rad/s} \\)`;
    f2[2].innerHTML = `\\( v_R = \\omega_{CD} \\times r_{gear} = ${wcd.toFixed(2)} \\times ${rg.toFixed(1)} \\)`;
    stepCards[2].querySelectorAll('.result')[0].innerHTML = `\\( v_{Rack} = ${Math.abs(vr).toFixed(2)} \\text{ ${velU} } ${secText} \\quad [${vr < 0 ? '\\text{Downward}' : '\\text{Upward}'}] \\)`;

    // Theory Modal Update
    let dirW = w < 0 ? '\\text{clockwise}' : '\\text{counter-clockwise}';
    document.getElementById('mod-p1').innerHTML = `Bar AB rotates with a ${dirW} angular velocity of \\( \\omega_{AB} = ${Math.abs(w)} \\text{ rad/s} \\). Determine the vertical velocity \\( v_R \\) of the rack of the rack-and-pinion gear. System given parameters at the initial snapshot:`;
    document.getElementById('mod-ul').innerHTML = `
      <li>\\( A = (0, 0) \\), \\( B = (${xb.toFixed(1)}, ${yb.toFixed(1)}) \\), \\( C = (${(22*m).toFixed(1)}, ${(10*m).toFixed(1)}) \\), \\( D = (${(22*m).toFixed(1)}, 0) \\) in ${lenU}.</li>
      <li>Pinion touches the rack at radius \\( r_{gear} = ${rg.toFixed(1)} \\text{ ${lenU}} \\).</li>
    `;
    
    document.getElementById('mod-sol1').innerHTML = `Given \\( \\vec{\\omega}_{AB} = ${w} \\hat{k} \\) rad/s. Then:
      $$ \\vec{v}_B = (${w} \\hat{k}) \\times (${xb.toFixed(1)}\\hat{i} + ${yb.toFixed(1)}\\hat{j}) = ${vbx.toFixed(1)}\\hat{i} + ${vby.toFixed(1)}\\hat{j} \\text{ ${velU}} $$
    `;
    
    document.getElementById('mod-sol2').innerHTML = `For link BC:
      $$ \\vec{r}_{C/B} = (${(22*m).toFixed(1)} - ${xb.toFixed(1)})\\hat{i} + (${(10*m).toFixed(1)} - ${yb.toFixed(1)})\\hat{j} = ${rcbx.toFixed(1)}\\hat{i} ${rcby<0?'-':'+'} ${Math.abs(rcby).toFixed(1)}\\hat{j} $$
      $$ \\vec{v}_C = (${vbx.toFixed(1)}\\hat{i} + ${vby.toFixed(1)}\\hat{j}) + (\\omega_{BC}\\hat{k} \\times (${rcbx.toFixed(1)}\\hat{i} ${rcby<0?'-':'+'} ${Math.abs(rcby).toFixed(1)}\\hat{j})) $$
      $$ \\vec{v}_C = (${vbx.toFixed(1)} ${rcby<0?'+':'-'} ${Math.abs(rcby).toFixed(1)}\\omega_{BC})\\hat{i} + (${vby.toFixed(1)} ${rcbx>0?'+':'-'} ${Math.abs(rcbx).toFixed(1)}\\omega_{BC})\\hat{j} $$
    `;
    
    document.getElementById('mod-sol3').innerHTML = `For link CD:
      $$ \\vec{r}_{C/D} = (${(22*m).toFixed(1)} - ${(22*m).toFixed(1)})\\hat{i} + (${(10*m).toFixed(1)} - 0)\\hat{j} = ${rcdy.toFixed(1)}\\hat{j} $$
      $$ \\vec{v}_C = \\omega_{CD}\\hat{k} \\times ${rcdy.toFixed(1)}\\hat{j} = -${rcdy.toFixed(1)}\\omega_{CD}\\hat{i} $$
    `;
    
    document.getElementById('mod-con1').innerHTML = `Equating components of \\( \\vec{v}_C \\):
      $$ y\\text{-dir}: ${vby.toFixed(1)} ${rcbx>0?'+':'-'} ${Math.abs(rcbx).toFixed(1)}\\omega_{BC} = 0 \\implies \\omega_{BC} = ${wbc.toFixed(2)} \\text{ rad/s} $$
      $$ x\\text{-dir}: ${vbx.toFixed(1)} ${rcby<0?'+':'-'} ${Math.abs(rcby).toFixed(1)}(${wbc.toFixed(2)}) = -${rcdy.toFixed(1)}\\omega_{CD} \\implies \\omega_{CD} = ${wcd.toFixed(2)} \\text{ rad/s} $$
    `;
    
    document.getElementById('mod-con2').innerHTML = `The rack is vertically driven by the right edge of the gear.
      $$ \\vec{v}_{Rack} = \\vec{\\omega}_{CD} \\times \\vec{r}_{edge} = (${wcd.toFixed(2)} \\hat{k}) \\times (${rg.toFixed(1)} \\hat{i}) = ${vr.toFixed(1)} \\hat{j} \\text{ ${velU}} $$
    `;
    
    document.getElementById('modal-result-ans').innerHTML = `$$ v_{Rack} = ${Math.abs(vr).toFixed(2)} \\text{ ${velU} } ${secText} \\ (${vr < 0 ? '\\downarrow' : '\\uparrow'}) $$`;
    
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise();
}

function initGraph() {
    let u = document.getElementById('units-select')?.value || 'US';
    let isSI = (u === 'SI');
    let mult = isSI ? 25.4 : 1;
    let velU = isSI ? 'mm/s' : 'in/s';
    
    let svg = document.getElementById('v-graph');
    svg.setAttribute('viewBox', '0 0 500 250');
    
    let pts = [];
    let maxT = parseFloat(UI.slider.max);
    for(let t=0; t<=maxT; t+=0.005) {
        let res = solveKinematics(t);
        if(res) {
            pts.push({t: t, v: res.vRack * mult});
        }
    }
    if(pts.length === 0) return;
    
    let minV = Math.min(...pts.map(p=>p.v));
    let maxV = Math.max(...pts.map(p=>p.v));
    
    let span = maxV - minV;
    if(span === 0) span = 1;
    minV -= span * 0.15;
    maxV += span * 0.15;
    span = maxV - minV;
    
    window.graphMinV = minV;
    window.graphSpan = span;
    window.graphMaxT = maxT;
    
    function getX(t) { return 60 + (t / maxT) * 400; }
    function getY(v) { return 220 - ((v - minV) / span) * 190; }
    
    let html = `
      <line x1="60" y1="30" x2="60" y2="220" stroke="#94a3b8" stroke-width="2"/>
      <line x1="60" y1="220" x2="460" y2="220" stroke="#94a3b8" stroke-width="2"/>
      <text x="50" y="40" fill="#475569" font-size="11" font-family="'Inter', sans-serif" text-anchor="end">${maxV.toFixed(1)}</text>
      <text x="50" y="220" fill="#475569" font-size="11" font-family="'Inter', sans-serif" text-anchor="end">${minV.toFixed(1)}</text>
      <text x="460" y="238" fill="#475569" font-size="11" font-family="'Inter', sans-serif" text-anchor="middle">${maxT} s</text>
      <text x="60" y="238" fill="#475569" font-size="11" font-family="'Inter', sans-serif" text-anchor="middle">0 s</text>
      <text x="25" y="130" fill="#e11d48" font-size="12" font-family="'Inter', sans-serif" text-anchor="middle" transform="rotate(-90 25 130)">v_Rack (${velU})</text>
    `;

    // Zero line
    if(minV < 0 && maxV > 0) {
        let y0 = getY(0);
        html += `<line x1="60" y1="${y0}" x2="460" y2="${y0}" stroke="#cbd5e1" stroke-dasharray="4"/>`;
        html += `<text x="50" y="${y0+4}" fill="#94a3b8" font-size="11" font-family="'Inter', sans-serif" text-anchor="end">0</text>`;
    }

    let d = pts.map((p, i) => `${i===0?'M':'L'} ${getX(p.t)} ${getY(p.v)}`).join(' ');
    html += `<path d="${d}" fill="none" stroke="#e11d48" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    html += `<circle id="graph-dot" cx="${getX(0)}" cy="${getY(pts[0].v)}" r="5" fill="#be123c" stroke="#fff" stroke-width="2"/>`;
    
    svg.innerHTML = html;
}

// Initial render
updateSolutionCards();
initGraph();
updateVisuals(0);
