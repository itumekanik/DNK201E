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
  const vmx = -vM * Math.cos(phiR);
  const vmy =  vM * Math.sin(phiR);
  const Vx = (mS * vS + mM * vmx) / mTot;
  const Vy = (mS * 0  + mM * vmy) / mTot;
  const V  = Math.sqrt(Vx * Vx + Vy * Vy);
  const beta = Math.atan2(Math.abs(Vy), Vx) * 180 / Math.PI;
  return { mTot, vmx, vmy, Vx, Vy, V, beta, phiR };
}

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
const ANIM_DUR = 3.5; // Longer duration for dramatic effect

function buildScene() {
  const svg = document.getElementById('sim-svg');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // Dark Space BG with deep gradient
  const bgGrad = elSVG('linearGradient', {id:'bgGrad', x1:'0%', y1:'0%', x2:'0%', y2:'100%'});
  bgGrad.innerHTML = `<stop offset="0%" stop-color="#020617"/>
                      <stop offset="50%" stop-color="#0f172a"/>
                      <stop offset="100%" stop-color="#020617"/>`;
  svg.appendChild(bgGrad);
  svg.appendChild(elSVG('rect', { x:0,y:0,width:W,height:H, fill:'url(#bgGrad)' }));

  // Parallax Stars Groups
  const starsBg = elSVG('g', {id:'stars-bg'});
  const starsFg = elSVG('g', {id:'stars-fg'});
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * W * 1.5 - W*0.2; // wider for parallax
    const y = Math.random() * H;
    const r = Math.random() * 1.5;
    const op = (Math.random() * 0.8 + 0.2).toFixed(2);
    if(r < 0.8) starsBg.appendChild(elSVG('circle',{cx:x,cy:y,r,fill:'white',opacity:op}));
    else starsFg.appendChild(elSVG('circle',{cx:x,cy:y,r,fill:'white',opacity:op}));
  }
  svg.appendChild(starsBg);
  svg.appendChild(starsFg);

  // Defs (Gradients & Filters)
  const defs = elSVG('defs');
  defs.innerHTML = `
    <linearGradient id="satGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <linearGradient id="panelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#cbd5e1"/><stop offset="50%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <radialGradient id="meteorGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fde047"/><stop offset="40%" stop-color="#ea580c"/><stop offset="100%" stop-color="#78350f"/>
    </radialGradient>
    <marker id="arrowS" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0 0 6 3 0 6" fill="#60a5fa"/></marker>
    <marker id="arrowM" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0 0 6 3 0 6" fill="#fbbf24"/></marker>
    <marker id="arrowV" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0 0 6 3 0 6" fill="#34d399"/></marker>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="trailGlow"><feGaussianBlur stdDeviation="2" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="explodeGlow"><feGaussianBlur stdDeviation="8" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  `;
  svg.appendChild(defs);

  // Dashed reference line for trajectory
  const refLine = elSVG('line',{x1: 0, y1: CY, x2: W, y2: CY, stroke:'rgba(59,130,246,0.15)', 'stroke-width':1.5, 'stroke-dasharray':'10,8'});
  svg.appendChild(refLine);

  // Beta Info Arc
  const betaArc = elSVG('path',{d:'M0,0',fill:'none',stroke:'rgba(52,211,153,0.8)','stroke-width':2, 'stroke-dasharray':'4,4'});
  betaArc.id='beta-arc'; svg.appendChild(betaArc);
  const betaLbl = elSVG('text',{x:0,y:0,fill:'#34d399','font-size':'12px','font-weight':'700','font-family':"'Inter',sans-serif",'text-anchor':'middle'});
  betaLbl.id='beta-lbl'; svg.appendChild(betaLbl);

  // --- Satellite S ---
  const satGroup = elSVG('g'); satGroup.id='sat-group';
  // Central Body
  satGroup.appendChild(elSVG('rect',{x:-22,y:-12,width:44,height:24,rx:6,fill:'url(#satGrad)',stroke:'#93c5fd','stroke-width':1.5}));
  satGroup.appendChild(elSVG('circle',{cx:0,cy:0,r:6,fill:'#0f172a',stroke:'#60a5fa','stroke-width':1})); // Lens/core
  // Solar Panels (Top & Bottom)
  satGroup.appendChild(elSVG('rect',{x:-16,y:-35,width:32,height:20,rx:2,fill:'url(#panelGrad)',stroke:'#60a5fa','stroke-width':1}));
  satGroup.appendChild(elSVG('rect',{x:-16,y:15,width:32,height:20,rx:2,fill:'url(#panelGrad)',stroke:'#60a5fa','stroke-width':1}));
  // Panel grid lines
  for(let i=1; i<4; i++) {
    satGroup.appendChild(elSVG('line',{x1:-16+i*8,y1:-35,x2:-16+i*8,y2:-15,stroke:'#0f172a',opacity:'0.5'}));
    satGroup.appendChild(elSVG('line',{x1:-16+i*8,y1:15,x2:-16+i*8,y2:35,stroke:'#0f172a',opacity:'0.5'}));
  }
  svg.appendChild(satGroup);

  // --- Meteor M ---
  const metContainer = elSVG('g'); metContainer.id='met-container';
  const metTrail = elSVG('polygon',{id:'met-trail',points:'0,-6 60,0 0,6',fill:'#f59e0b',opacity:'0.4',filter:'url(#trailGlow)'});
  metContainer.appendChild(metTrail);
  const metGroup = elSVG('g'); metGroup.id='met-group';
  metGroup.appendChild(elSVG('circle',{cx:0,cy:0,r:9,fill:'url(#meteorGrad)',stroke:'#fef3c7','stroke-width':1,filter:'url(#glow)'}));
  // Meteor craters
  metGroup.appendChild(elSVG('circle',{cx:-3,cy:-3,r:2,fill:'#451a03',opacity:'0.6'}));
  metGroup.appendChild(elSVG('circle',{cx:2,cy:4,r:1.5,fill:'#451a03',opacity:'0.5'}));
  metContainer.appendChild(metGroup);
  svg.appendChild(metContainer);

  // --- Explosion Shockwaves & Particles ---
  const explode = elSVG('g'); explode.id='explode'; explode.setAttribute('opacity','0');
  explode.appendChild(elSVG('circle',{id:'shockwave1',cx:0,cy:0,r:0,fill:'none',stroke:'#fde047','stroke-width':4,opacity:'0.8'}));
  explode.appendChild(elSVG('circle',{id:'shockwave2',cx:0,cy:0,r:0,fill:'none',stroke:'#f97316','stroke-width':8,opacity:'0.5',filter:'url(#explodeGlow)'}));
  explode.appendChild(elSVG('circle',{id:'flash',cx:0,cy:0,r:20,fill:'#ffffff',filter:'url(#explodeGlow)'}));
  // Debris
  const debris = elSVG('g'); debris.id = 'debris';
  for(let i=0; i<12; i++) {
    const ang = Math.random()*Math.PI*2;
    debris.appendChild(elSVG('circle',{cx:0,cy:0,r:Math.random()*2+1,fill: i%2===0?'#f59e0b':'#94a3b8',
      'data-ang':ang, 'data-spd':Math.random()*60+40}));
  }
  explode.appendChild(debris);
  svg.appendChild(explode);

  // --- Velocity Vectors & Labels ---
  const vSarrow = elSVG('line',{id:'vs-arrow',x1:0,y1:0,x2:0,y2:0,stroke:'#60a5fa','stroke-width':2.5,'marker-end':'url(#arrowS)'});
  svg.appendChild(vSarrow);
  const vSLbl = elSVG('text',{id:'vs-lbl',x:0,y:0,fill:'#93c5fd','font-size':'11px','font-weight':'700','font-family':"'JetBrains Mono',monospace"});
  svg.appendChild(vSLbl);

  const vMarrow = elSVG('line',{id:'vm-arrow',x1:0,y1:0,x2:0,y2:0,stroke:'#fbbf24','stroke-width':2.5,'marker-end':'url(#arrowM)'});
  svg.appendChild(vMarrow);
  const vMLbl = elSVG('text',{id:'vm-lbl',x:0,y:0,fill:'#fde047','font-size':'11px','font-weight':'700','font-family':"'JetBrains Mono',monospace"});
  svg.appendChild(vMLbl);

  const Varrow = elSVG('line',{id:'V-arrow',x1:0,y1:0,x2:0,y2:0,stroke:'#34d399','stroke-width':3,'marker-end':'url(#arrowV)','opacity':'0'});
  svg.appendChild(Varrow);
  const VLbl = elSVG('text',{id:'V-lbl',x:0,y:0,fill:'#6ee7b7','font-size':'12px','font-weight':'700','font-family':"'JetBrains Mono',monospace",'opacity':'0'});
  svg.appendChild(VLbl);

  // Labels
  svg.appendChild(elSVG('text',{id:'s-lbl',x:0,y:0,fill:'#bfdbfe','font-size':'13px','font-weight':'800','font-family':"'Inter',sans-serif"},'S'));
  svg.appendChild(elSVG('text',{id:'m-lbl',x:0,y:0,fill:'#fef3c7','font-size':'11px','font-weight':'800','font-family':"'Inter',sans-serif"},'M'));
  svg.appendChild(elSVG('text',{id:'phi-lbl',x:CX+65,y:CY+28,fill:'#fbbf24','font-size':'11px','font-weight':'700','font-family':"'Inter',sans-serif",'opacity':'0.8'}));
}

// Custom Easing for dramatic impact
// t goes from 0 to 1
function getLogic(t) {
  const r = solve();
  const T_IMPACT = 0.45; 
  // We use easing to slow down right before impact, bang, then drift
  let phase, frac, sX, sY, mX, mY, cX, cY, shock;
  
  if (t <= T_IMPACT) {
    phase = 'pre';
    // easeInQuad for approaching
    frac = Math.pow(t / T_IMPACT, 1.2);
    sX = CX - 220 + frac * 220;
    sY = CY;
    // Meteor starting point
    const mStartX = CX + 160;
    const mStartY = CY + 140;
    mX = mStartX + frac * (CX - mStartX);
    mY = mStartY + frac * (CY - mStartY);
    shock = 0;
  } else {
    phase = 'post';
    frac = (t - T_IMPACT) / (1 - T_IMPACT);
    // easeOut cubic for explosion
    shock = 1 - Math.pow(1 - frac, 4);
    
    // Drift
    const Vmag = r.V;
    const dirX = r.Vx / Vmag;
    const dirY = -r.Vy / Vmag;
    const drift = frac * 140; 
    cX = CX + dirX * drift;
    cY = CY + dirY * drift;
    
    // Parallax background drift
    document.getElementById('stars-bg').setAttribute('transform', `translate(${-dirX*drift*0.2}, ${-dirY*drift*0.2})`);
    document.getElementById('stars-fg').setAttribute('transform', `translate(${-dirX*drift*0.5}, ${-dirY*drift*0.5})`);
  }
  return { phase, frac, sX, sY, mX, mY, cX, cY, shock, r };
}

function updateSim(t) {
  const state = getLogic(Math.min(t, 1));
  const r = state.r;

  if (state.phase === 'pre') {
    const { sX, sY, mX, mY, frac } = state;
    
    // Reset BGs
    document.getElementById('stars-bg').setAttribute('transform', `translate(0,0)`);
    document.getElementById('stars-fg').setAttribute('transform', `translate(0,0)`);
    
    document.getElementById('sat-group').setAttribute('transform', `translate(${sX},${sY})`);
    document.getElementById('s-lbl').setAttribute('x', sX - 25);
    document.getElementById('s-lbl').setAttribute('y', sY - 45);
    document.getElementById('s-lbl').setAttribute('opacity', 1);

    document.getElementById('met-container').setAttribute('transform', `translate(${mX},${mY}) rotate(${r.phiR*180/Math.PI})`);
    document.getElementById('m-lbl').setAttribute('x', mX + 15);
    document.getElementById('m-lbl').setAttribute('y', mY + 15);
    document.getElementById('m-lbl').setAttribute('opacity', 1);

    // Fade out vectors right before impact
    const op = frac < 0.85 ? 1 : 1 - (frac-0.85)/0.15;
    
    const vsLen = Math.max(40, vS * 8);
    const vsArr = document.getElementById('vs-arrow');
    vsArr.setAttribute('x1', sX + 30); vsArr.setAttribute('y1', sY);
    vsArr.setAttribute('x2', sX + 30 + vsLen); vsArr.setAttribute('y2', sY);
    vsArr.setAttribute('opacity', op);
    document.getElementById('vs-lbl').setAttribute('x', sX + 30 + vsLen/2 - 20);
    document.getElementById('vs-lbl').setAttribute('y', sY - 10);
    document.getElementById('vs-lbl').textContent = `v_S=${vS} km/s`;
    document.getElementById('vs-lbl').setAttribute('opacity', op);

    // Meteor vector points towards satellite
    const vmLen = Math.max(50, vM * 5);
    const vmArr = document.getElementById('vm-arrow');
    const vmDx = -Math.cos(r.phiR)*vmLen;
    const vmDy = Math.sin(r.phiR)*vmLen;
    vmArr.setAttribute('x1', mX + vmDx*0.2); vmArr.setAttribute('y1', mY - vmDy*0.2);
    vmArr.setAttribute('x2', mX + vmDx); vmArr.setAttribute('y2', mY - vmDy);
    vmArr.setAttribute('opacity', op);
    
    document.getElementById('vm-lbl').setAttribute('x', mX + vmDx*0.5 + 5);
    document.getElementById('vm-lbl').setAttribute('y', mY - vmDy*0.5 - 15);
    document.getElementById('vm-lbl').textContent = `v_M=${vM} km/s`;
    document.getElementById('vm-lbl').setAttribute('opacity', op);

    document.getElementById('explode').setAttribute('opacity','0');
    document.getElementById('V-arrow').setAttribute('opacity','0');
    document.getElementById('V-lbl').setAttribute('opacity','0');
    document.getElementById('beta-arc').setAttribute('opacity','0');
    document.getElementById('beta-lbl').setAttribute('opacity','0');
    
    document.getElementById('phi-lbl').textContent = `φ=${phi}°`;
    document.getElementById('phi-lbl').setAttribute('opacity', op);

  } else {
    // POST IMPACT
    const { frac, cX, cY, shock } = state;
    const dirXn = r.Vx / r.V;
    const dirYn = -r.Vy / r.V;

    // Sat & Meteor merged
    document.getElementById('sat-group').setAttribute('transform', `translate(${cX},${cY})`);
    document.getElementById('s-lbl').setAttribute('x', cX - 25);
    document.getElementById('s-lbl').setAttribute('y', cY - 45);
    
    // Meteor is embedded
    document.getElementById('met-container').setAttribute('transform', `translate(${cX+8},${cY+8}) rotate(${r.phiR*180/Math.PI}) scale(0.6)`);
    document.getElementById('m-lbl').setAttribute('opacity', '0'); // M visually merges

    // Hide pre arrows
    document.getElementById('vs-arrow').setAttribute('opacity','0'); document.getElementById('vs-lbl').setAttribute('opacity','0');
    document.getElementById('vm-arrow').setAttribute('opacity','0'); document.getElementById('vm-lbl').setAttribute('opacity','0');
    document.getElementById('phi-lbl').setAttribute('opacity','0');

    // Explosion Effect
    const explOp = frac < 0.1 ? frac/0.1 : Math.max(0, 1 - (frac-0.1)/0.4);
    const expGroup = document.getElementById('explode');
    expGroup.setAttribute('opacity', explOp.toFixed(2));
    expGroup.setAttribute('transform', `translate(${CX},${CY})`); // explosion stays at impact origin
    
    // Shockwaves grow
    document.getElementById('shockwave1').setAttribute('r', shock * 80);
    document.getElementById('shockwave2').setAttribute('r', shock * 40);
    document.getElementById('flash').setAttribute('opacity', Math.max(0, 1-shock*3));
    
    // Debris burst
    Array.from(document.getElementById('debris').children).forEach(p => {
      const ang = parseFloat(p.getAttribute('data-ang'));
      const spd = parseFloat(p.getAttribute('data-spd'));
      const dist = shock * spd;
      p.setAttribute('cx', Math.cos(ang)*dist);
      p.setAttribute('cy', Math.sin(ang)*dist);
    });

    // Post vector V
    const Vop = Math.min(1, frac/0.2);
    const Vlen = Math.max(60, r.V * 9);
    const Varr = document.getElementById('V-arrow');
    Varr.setAttribute('x1', cX); Varr.setAttribute('y1', cY);
    Varr.setAttribute('x2', cX + dirXn*Vlen); Varr.setAttribute('y2', cY + dirYn*Vlen);
    Varr.setAttribute('opacity', Vop);
    
    const Vlb = document.getElementById('V-lbl');
    Vlb.setAttribute('x', cX + dirXn*Vlen + 10);
    Vlb.setAttribute('y', cY + dirYn*Vlen + 5);
    Vlb.textContent = `V=${r.V.toFixed(2)} km/s`;
    Vlb.setAttribute('opacity', Vop);

    // Beta arc
    if (Vop > 0.5) {
      const arcR = 60;
      const arcOp  = Math.min(1, (Vop-0.5)*2);
      const arcPath = `M ${CX + arcR} ${CY} A ${arcR} ${arcR} 0 0 ${r.Vy > 0 ? 0 : 1} ${CX + dirXn*arcR} ${CY + dirYn*arcR}`;
      const ba = document.getElementById('beta-arc');
      ba.setAttribute('d', arcPath);
      ba.setAttribute('opacity', arcOp);
      
      const midAngR = (r.beta * Math.PI/180) / 2;
      const blb = document.getElementById('beta-lbl');
      blb.setAttribute('x', CX + (arcR+18)*Math.cos(-midAngR)); // SVG y flipped
      blb.setAttribute('y', CY + (arcR+18)*Math.sin(-midAngR) + 4);
      blb.textContent = `β=${r.beta.toFixed(1)}°`;
      blb.setAttribute('opacity', arcOp);
    }
  }

  // Live Dashboard Data
  document.getElementById('live-Vx').textContent  = r.Vx.toFixed(4) + ' km/s';
  document.getElementById('live-Vy').textContent  = r.Vy.toFixed(4) + ' km/s';
  document.getElementById('live-V').textContent   = r.V.toFixed(4)  + ' km/s';
  document.getElementById('live-beta').textContent = r.beta.toFixed(2) + '°';
}

function animFrame(ts) {
  if (!lastTime) lastTime = ts;
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;
  animT += dt / ANIM_DUR;
  if (animT >= 1) {
    animT = 1; isPlaying = false;
    document.getElementById('btn-play').textContent = '▶ Play';
    document.querySelectorAll('.step-card').forEach((c,i) => setTimeout(() => c.classList.add('visible'), i * 150));
  }
  document.getElementById('time-slider').value = animT;
  document.getElementById('slider-val').textContent = (animT * 100).toFixed(0) + '%';
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
  document.getElementById('slider-val').textContent = '0%';
  document.querySelectorAll('.step-card').forEach(c => c.classList.remove('visible'));
  buildScene();
  updateSim(0);
}

function openModal() {
  document.getElementById('theory-modal').classList.add('active');
  if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise();
}
function closeModal() { document.getElementById('theory-modal').classList.remove('active'); }

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
    document.getElementById('slider-val').textContent = (animT * 100).toFixed(0) + '%';
    if(animT===0) buildScene(); // reset state for fresh drawing
    updateSim(animT);
  });
});
