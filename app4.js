// ─── Problem Parameters ───
let mS  = 400;      // kg  satellite mass
let mM  = 1;        // kg  meteor mass
let vS  = 7;        // km/s satellite speed (horizontal →)
let vM  = 12;       // km/s meteor speed
let phi = 45;       // deg  meteor angle below horizontal (into satellite)

// ─── Core Physics ───
function solve() {
  const phiR = phi * Math.PI / 180;
  const mTot = mS + mM;

  // Momentum components before impact
  const px_before = mS * vS + mM * vM * Math.cos(Math.PI - phiR); // meteor comes from lower-right
  const py_before = 0       + mM * vM * (-Math.sin(phiR));         // upward = +y, meteor goes upward at φ above negative x

  // Actually: satellite moves in +x, meteor at 45° above negative-x axis (as drawn)
  // Meteor direction: upper-right to lower-left means vector = (-cos45, -sin45)? 
  // From the figure: meteor travels at 45° BELOW the satellite path, going UP-LEFT into satellite
  // i.e. meteor velocity = vM * (-cos(phi), +sin(phi))  [going left and up toward satellite]
  // But the figure shows M at bottom, moving up-left at 45°.
  // satellite: vS in +x direction.  meteor: 12 km/s at 45° from below (up-left).
  // meteor velocity vector: (-vM cos45, +vM sin45)
  const vmx = -vM * Math.cos(phiR);  // − x component
  const vmy =  vM * Math.sin(phiR);  // + y component (upward)

  // Conservation of linear momentum
  const Vx = (mS * vS + mM * vmx) / mTot;
  const Vy = (mS * 0  + mM * vmy) / mTot;

  const V  = Math.sqrt(Vx * Vx + Vy * Vy);  // km/s
  // β = angle between post-impact velocity and satellite's original path (+x axis)
  const beta = Math.atan2(Math.abs(Vy), Vx) * 180 / Math.PI; // degrees

  return { mTot, vmx, vmy, Vx, Vy, V, beta, phiR };
}

// ─── Update Results Display ───
function updateResults() {
  const r = solve();

  document.getElementById('res-mTot').textContent  = r.mTot.toFixed(0) + ' kg';
  document.getElementById('res-px').textContent    = ((mS*vS + mM*r.vmx)).toFixed(3) + ' kg·km/s';
  document.getElementById('res-py').textContent    = (mM * r.vmy).toFixed(3)          + ' kg·km/s';
  document.getElementById('res-Vx').textContent    = r.Vx.toFixed(5) + ' km/s';
  document.getElementById('res-Vy').textContent    = r.Vy.toFixed(5) + ' km/s';
  document.getElementById('res-V').textContent     = r.V.toFixed(4)  + ' km/s';
  document.getElementById('res-V-kmh').textContent = (r.V * 3600).toFixed(0) + ' km/h';
  document.getElementById('res-beta').textContent  = r.beta.toFixed(3) + '°';

  updateSim(0);
}

// ─── SVG Animation ───
const NS = 'http://www.w3.org/2000/svg';
function elSVG(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

const W = 560, H = 380, CX = W * 0.52, CY = H * 0.48;

let animId = null, isPlaying = false, animT = 0;
const ANIM_DUR = 2.5; // seconds total

function buildScene() {
  const svg = document.getElementById('sim-svg');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // Dark space BG
  svg.appendChild(elSVG('rect', { x:0,y:0,width:W,height:H, fill:'#0c0f1a' }));

  // Stars
  for (let i = 0; i < 100; i++) {
    const x = ((Math.sin(i*9.1+3)*0.5+0.5)*W)|0;
    const y = ((Math.cos(i*4.7+1)*0.5+0.5)*H)|0;
    const r = i%8===0?1.5:0.7;
    svg.appendChild(elSVG('circle',{cx:x,cy:y,r,fill:'white',opacity:(0.2+Math.abs(Math.sin(i))*0.5).toFixed(2)}));
  }

  // Defs
  const defs = elSVG('defs');
  defs.innerHTML = `
    <marker id="arrowS" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0 8 3 0 6" fill="#3b82f6"/></marker>
    <marker id="arrowM" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0 8 3 0 6" fill="#f59e0b"/></marker>
    <marker id="arrowV" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0 8 3 0 6" fill="#34d399"/></marker>
    <marker id="arrowB" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0 8 3 0 6" fill="#a78bfa"/></marker>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="explodeGlow"><feGaussianBlur stdDeviation="6" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svg.appendChild(defs);

  // Dashed reference line (satellite path extended)
  const refLen = 220;
  const refLine = elSVG('line',{
    x1: CX - refLen, y1: CY, x2: CX + refLen, y2: CY,
    stroke:'rgba(59,130,246,0.2)', 'stroke-width':1, 'stroke-dasharray':'8,5'
  });
  refLine.id='ref-line'; svg.appendChild(refLine);

  // β angle arc (drawn after impact)
  const betaArc = elSVG('path',{d:'M0,0',fill:'none',stroke:'rgba(167,139,250,0.7)','stroke-width':1.5});
  betaArc.id='beta-arc'; svg.appendChild(betaArc);
  const betaLbl = elSVG('text',{x:0,y:0,fill:'#a78bfa','font-size':'11px','font-weight':'700',
    'font-family':"'Inter',sans-serif",'text-anchor':'middle'},'β');
  betaLbl.id='beta-lbl'; svg.appendChild(betaLbl);

  // Meteor path line (pre-impact ghost)
  const meteorTrail = elSVG('line',{x1:0,y1:0,x2:0,y2:0,
    stroke:'rgba(245,158,11,0.15)','stroke-width':1,'stroke-dasharray':'5,4'});
  meteorTrail.id='meteor-trail'; svg.appendChild(meteorTrail);

  // --- Satellite S ---
  const satGroup = elSVG('g');
  satGroup.id='sat-group';
  // Body
  satGroup.appendChild(elSVG('rect',{x:-20,y:-10,width:40,height:20,rx:4,fill:'#1d4ed8',stroke:'#60a5fa','stroke-width':1.5}));
  // Solar panels
  satGroup.appendChild(elSVG('rect',{x:-50,y:-6,width:28,height:12,rx:2,fill:'#1e40af',stroke:'#93c5fd','stroke-width':1}));
  satGroup.appendChild(elSVG('rect',{x:22, y:-6,width:28,height:12,rx:2,fill:'#1e40af',stroke:'#93c5fd','stroke-width':1}));
  // Grid lines on panels
  for (let i = 1; i < 4; i++) {
    satGroup.appendChild(elSVG('line',{x1:-50+i*7,y1:-6,x2:-50+i*7,y2:6,stroke:'#93c5fd',opacity:'0.4','stroke-width':0.5}));
    satGroup.appendChild(elSVG('line',{x1:22+i*7,y1:-6,x2:22+i*7,y2:6,stroke:'#93c5fd',opacity:'0.4','stroke-width':0.5}));
  }
  svg.appendChild(satGroup);

  // --- Meteor M ---
  const metGroup = elSVG('g');
  metGroup.id='met-group';
  metGroup.appendChild(elSVG('circle',{cx:0,cy:0,r:7,fill:'#b45309',stroke:'#f59e0b','stroke-width':1.5,filter:'url(#glow)'}));
  metGroup.appendChild(elSVG('circle',{cx:-2,cy:-2,r:2,fill:'#fef3c7',opacity:'0.6'}));
  svg.appendChild(metGroup);

  // --- Explosion (hidden until impact) ---
  const explode = elSVG('g');
  explode.id='explode'; explode.setAttribute('opacity','0');
  for (let i = 0; i < 8; i++) {
    const ang = (i/8)*2*Math.PI;
    const len = 18 + (i%3)*10;
    explode.appendChild(elSVG('line',{x1:0,y1:0,
      x2: Math.cos(ang)*len, y2: Math.sin(ang)*len,
      stroke:'#fbbf24','stroke-width':2,opacity:'0.9',filter:'url(#explodeGlow)'}));
  }
  explode.appendChild(elSVG('circle',{cx:0,cy:0,r:12,fill:'#fbbf24',opacity:'0.7',filter:'url(#explodeGlow)'}));
  svg.appendChild(explode);

  // --- Velocity arrows (pre-impact shown, post-impact shown after t=1) ---
  // vS arrow
  const vSarrow = elSVG('line',{x1:0,y1:0,x2:0,y2:0,stroke:'#3b82f6','stroke-width':2,'marker-end':'url(#arrowS)'});
  vSarrow.id='vs-arrow'; svg.appendChild(vSarrow);
  const vSLbl = elSVG('text',{x:0,y:0,fill:'#60a5fa','font-size':'10px','font-weight':'700','font-family':"'JetBrains Mono',monospace"});
  vSLbl.id='vs-lbl'; svg.appendChild(vSLbl);

  // vM arrow
  const vMarrow = elSVG('line',{x1:0,y1:0,x2:0,y2:0,stroke:'#f59e0b','stroke-width':2,'marker-end':'url(#arrowM)'});
  vMarrow.id='vm-arrow'; svg.appendChild(vMarrow);
  const vMLbl = elSVG('text',{x:0,y:0,fill:'#fbbf24','font-size':'10px','font-weight':'700','font-family':"'JetBrains Mono',monospace"});
  vMLbl.id='vm-lbl'; svg.appendChild(vMLbl);

  // V post-impact arrow
  const Varrow = elSVG('line',{x1:0,y1:0,x2:0,y2:0,stroke:'#34d399','stroke-width':2.5,'marker-end':'url(#arrowV)','opacity':'0'});
  Varrow.id='V-arrow'; svg.appendChild(Varrow);
  const VLbl = elSVG('text',{x:0,y:0,fill:'#34d399','font-size':'10px','font-weight':'700','font-family':"'JetBrains Mono',monospace",'opacity':'0'});
  VLbl.id='V-lbl'; svg.appendChild(VLbl);

  // Labels S, M
  const sLbl = elSVG('text',{x:0,y:0,fill:'#93c5fd','font-size':'12px','font-weight':'700','font-family':"'Inter',sans-serif"},'S');
  sLbl.id='s-lbl'; svg.appendChild(sLbl);
  const mLbl = elSVG('text',{x:0,y:0,fill:'#fbbf24','font-size':'11px','font-weight':'700','font-family':"'Inter',sans-serif"},'M');
  mLbl.id='m-lbl'; svg.appendChild(mLbl);

  // φ angle label in the scene
  const phiLabel = elSVG('text',{x: CX+55, y: CY+28, fill:'#fbbf24','font-size':'10px','font-weight':'600',
    'font-family':"'Inter',sans-serif",'opacity':'0.7'}, `φ=${phi}°`);
  phiLabel.id='phi-lbl'; svg.appendChild(phiLabel);
}

// positions in animation
function getPositions(t) {
  // t: 0→1 = pre-impact approach, 1→2 = post-impact drift
  const r = solve();
  const phiR = r.phiR;

  const PRE = 0.55;  // fraction of animation for approach
  if (t <= PRE) {
    const frac = t / PRE;
    // Satellite moves from left → impact point
    const sX = CX - 160 + frac * 160;
    const sY = CY;
    // Meteor moves from its start position → impact point
    // Meteor comes from lower-right (45° below +x axis, so direction = upper-left)
    const mStartX = CX + 130;
    const mStartY = CY + 110;
    const mX = mStartX + frac*(CX - mStartX);
    const mY = mStartY + frac*(CY - mStartY);
    return { phase:'pre', frac, sX, sY, mX, mY };
  } else {
    const frac = (t - PRE) / (1 - PRE);
    // Combined object drifts along V direction
    const Vmag = r.V;
    const betaR = r.beta * Math.PI / 180;
    const dirX = r.Vx / Vmag;
    const dirY = -r.Vy / Vmag; // SVG y flipped
    const drift = frac * 100;
    const cX = CX + dirX * drift;
    const cY = CY + dirY * drift;
    return { phase:'post', frac, cX, cY, r };
  }
}

function updateSim(t) {
  const r = solve();
  const phiR = r.phiR;
  const pos = getPositions(Math.min(t, 1));
  const SCALE_S = 60;  // px per km/s for satellite arrow
  const SCALE_M = 30;

  if (pos.phase === 'pre') {
    const { sX, sY, mX, mY } = pos;

    // Satellite
    document.getElementById('sat-group').setAttribute('transform', `translate(${sX},${sY})`);
    document.getElementById('s-lbl').setAttribute('x', sX - 6);
    document.getElementById('s-lbl').setAttribute('y', sY - 14);

    // vS arrow
    const vsLen = vS * 1.8;
    const vsArrow = document.getElementById('vs-arrow');
    vsArrow.setAttribute('x1', sX + 22);
    vsArrow.setAttribute('y1', sY);
    vsArrow.setAttribute('x2', sX + 22 + vsLen);
    vsArrow.setAttribute('y2', sY);
    vsArrow.setAttribute('opacity', pos.frac < 0.85 ? '1' : String(1-(pos.frac-0.85)/0.15));
    const vsLbl = document.getElementById('vs-lbl');
    vsLbl.setAttribute('x', sX + 22 + vsLen/2);
    vsLbl.setAttribute('y', sY - 7);
    vsLbl.textContent = `v_S=${vS} km/s`;
    vsLbl.setAttribute('opacity', pos.frac < 0.85 ? '1' : String(1-(pos.frac-0.85)/0.15));

    // Meteor
    document.getElementById('met-group').setAttribute('transform', `translate(${mX},${mY})`);
    document.getElementById('m-lbl').setAttribute('x', mX + 9);
    document.getElementById('m-lbl').setAttribute('y', mY + 4);

    // vM arrow (points upper-left, from M's current position)
    const vmArrow = document.getElementById('vm-arrow');
    const vmLen = vM * 1.5;
    const vmDx = -Math.cos(phiR) * vmLen;
    const vmDy =  Math.sin(phiR) * vmLen;
    vmArrow.setAttribute('x1', mX + vmDx*0.1);
    vmArrow.setAttribute('y1', mY - vmDy*0.1);
    vmArrow.setAttribute('x2', mX + vmDx*0.95);
    vmArrow.setAttribute('y2', mY - vmDy*0.95);
    vmArrow.setAttribute('opacity', pos.frac < 0.85 ? '1' : String(1-(pos.frac-0.85)/0.15));
    const vmLbl = document.getElementById('vm-lbl');
    vmLbl.setAttribute('x', mX + vmDx*0.5 - 6);
    vmLbl.setAttribute('y', mY - vmDy*0.5 - 6);
    vmLbl.textContent = `v_M=${vM} km/s`;
    vmLbl.setAttribute('opacity', pos.frac < 0.85 ? '1' : String(1-(pos.frac-0.85)/0.15));

    // Meteor trail
    document.getElementById('meteor-trail').setAttribute('x1', CX+130);
    document.getElementById('meteor-trail').setAttribute('y1', CY+110);
    document.getElementById('meteor-trail').setAttribute('x2', mX);
    document.getElementById('meteor-trail').setAttribute('y2', mY);

    // Explosion hidden
    document.getElementById('explode').setAttribute('opacity','0');
    document.getElementById('V-arrow').setAttribute('opacity','0');
    document.getElementById('V-lbl').setAttribute('opacity','0');

    // β arc hidden
    document.getElementById('beta-arc').setAttribute('d','M0,0');
    document.getElementById('beta-lbl').setAttribute('opacity','0');

    // phi label
    document.getElementById('phi-lbl').textContent = `φ=${phi}°`;

  } else {
    // Post-impact
    const { frac, cX, cY } = pos;
    const betaR = r.beta * Math.PI / 180;
    const Vmag = r.V;
    const dirXn = r.Vx / Vmag;
    const dirYn = -r.Vy / Vmag;

    // Satellite moves to impact point then drifts
    document.getElementById('sat-group').setAttribute('transform', `translate(${cX},${cY})`);
    document.getElementById('s-lbl').setAttribute('x', cX - 6);
    document.getElementById('s-lbl').setAttribute('y', cY - 14);

    // Meteor at satellite (embedded)
    document.getElementById('met-group').setAttribute('transform', `translate(${cX+8},${cY+8})`);
    document.getElementById('m-lbl').setAttribute('x', cX + 15);
    document.getElementById('m-lbl').setAttribute('y', cY + 14);

    // Pre-impact arrows fade out
    document.getElementById('vs-arrow').setAttribute('opacity','0');
    document.getElementById('vs-lbl').setAttribute('opacity','0');
    document.getElementById('vm-arrow').setAttribute('opacity','0');
    document.getElementById('vm-lbl').setAttribute('opacity','0');

    // Explosion flash
    const explOp = frac < 0.15 ? frac/0.15 : Math.max(0, 1 - (frac-0.15)/0.25);
    document.getElementById('explode').setAttribute('opacity', explOp.toFixed(2));
    document.getElementById('explode').setAttribute('transform', `translate(${cX},${cY})`);

    // Post-impact V arrow
    const Vop = Math.min(1, frac/0.3);
    const Varrow = document.getElementById('V-arrow');
    const VLen = 80;
    Varrow.setAttribute('x1', cX);
    Varrow.setAttribute('y1', cY);
    Varrow.setAttribute('x2', cX + dirXn*VLen);
    Varrow.setAttribute('y2', cY + dirYn*VLen);
    Varrow.setAttribute('opacity', Vop.toFixed(2));
    const VLbl = document.getElementById('V-lbl');
    VLbl.setAttribute('x', cX + dirXn*VLen*0.6 + 8);
    VLbl.setAttribute('y', cY + dirYn*VLen*0.6 - 6);
    VLbl.textContent = `V=${r.V.toFixed(3)} km/s`;
    VLbl.setAttribute('opacity', Vop.toFixed(2));

    // β arc
    if (Vop > 0.3) {
      const arcR = 50;
      const arcPath = `M ${cX + arcR} ${cY} A ${arcR} ${arcR} 0 0 ${r.Vy > 0 ? 1 : 0} ${cX + dirXn*arcR} ${cY + dirYn*arcR}`;
      document.getElementById('beta-arc').setAttribute('d', arcPath);
      document.getElementById('beta-arc').setAttribute('opacity', Math.min(1,(Vop-0.3)/0.3).toFixed(2));
      const midAngR = betaR/2;
      document.getElementById('beta-lbl').setAttribute('x', cX + (arcR+14)*Math.cos(-midAngR));
      document.getElementById('beta-lbl').setAttribute('y', cY + (arcR+14)*Math.sin(-midAngR) + 4);
      document.getElementById('beta-lbl').textContent = `β=${r.beta.toFixed(1)}°`;
      document.getElementById('beta-lbl').setAttribute('opacity', Math.min(1,(Vop-0.3)/0.3).toFixed(2));
    }
  }

  // Live data
  document.getElementById('live-Vx').textContent  = r.Vx.toFixed(4) + ' km/s';
  document.getElementById('live-Vy').textContent  = r.Vy.toFixed(4) + ' km/s';
  document.getElementById('live-V').textContent   = r.V.toFixed(4)  + ' km/s';
  document.getElementById('live-beta').textContent = r.beta.toFixed(2) + '°';
}

// ─── Animation Control ───
let lastTime = null;
function animFrame(ts) {
  if (!lastTime) lastTime = ts;
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;
  animT += dt / ANIM_DUR;
  if (animT >= 1) {
    animT = 1;
    isPlaying = false;
    document.getElementById('btn-play').textContent = '▶ Play';
    document.querySelectorAll('.step-card').forEach((c,i) =>
      setTimeout(() => c.classList.add('visible'), i * 200));
  }
  document.getElementById('time-slider').value = animT;
  updateSim(animT);
  if (isPlaying) animId = requestAnimationFrame(animFrame);
}

function playAnim() {
  if (isPlaying) {
    isPlaying = false;
    cancelAnimationFrame(animId);
    document.getElementById('btn-play').textContent = '▶ Play';
    return;
  }
  if (animT >= 1) animT = 0;
  isPlaying = true; lastTime = null;
  document.getElementById('btn-play').textContent = '⏸ Pause';
  animId = requestAnimationFrame(animFrame);
}

function resetAnim() {
  cancelAnimationFrame(animId);
  isPlaying = false; animT = 0; lastTime = null;
  document.getElementById('btn-play').textContent = '▶ Play';
  document.getElementById('time-slider').value = 0;
  document.querySelectorAll('.step-card').forEach(c => c.classList.remove('visible'));
  buildScene();
  updateSim(0);
}

// ─── Modal ───
function openModal() {
  document.getElementById('theory-modal').classList.add('active');
  if (window.MathJax && MathJax.typeset) MathJax.typeset();
}
function closeModal() {
  document.getElementById('theory-modal').classList.remove('active');
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  buildScene();
  updateResults();

  document.getElementById('btn-play').addEventListener('click', playAnim);
  document.getElementById('btn-reset').addEventListener('click', resetAnim);
  document.getElementById('btn-theory').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('theory-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  document.getElementById('btn-apply').addEventListener('click', () => {
    mS  = parseFloat(document.getElementById('inp-mS').value)  || 400;
    mM  = parseFloat(document.getElementById('inp-mM').value)  || 1;
    vS  = parseFloat(document.getElementById('inp-vS').value)  || 7;
    vM  = parseFloat(document.getElementById('inp-vM').value)  || 12;
    phi = parseFloat(document.getElementById('inp-phi').value) || 45;
    resetAnim();
    updateResults();
  });

  const slider = document.getElementById('time-slider');
  slider.addEventListener('input', e => {
    if (isPlaying) { cancelAnimationFrame(animId); isPlaying = false; document.getElementById('btn-play').textContent = '▶ Play'; }
    animT = parseFloat(e.target.value);
    updateSim(animT);
    document.getElementById('slider-val').textContent = (animT * 100).toFixed(0) + '%';
  });
});
