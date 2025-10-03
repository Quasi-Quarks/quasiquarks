/* app.js — Refraction (Snell’s Law) — Dynamic Touch Graph (Mobile-first)
   Features:
   - Drag on the canvas:
       • Mode “Move marker (θ₁)”: set θ₁ directly, compute θ₂.
       • Mode “Bend line (adjust n₂ or n₁)”: update the chosen index so the curve passes through your drag point.
   - Sliders + number inputs stay in sync (5-decimal precision).
   - Critical angle handling + warnings.
*/

/* ========================= Utilities ========================= */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

const PREC = 5;                 // 5 decimal places
const STEP = 1e-5;              // slider step & “epsilon” for angles
const EPS  = 1e-9;              // math epsilon for divisions

const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));
const roundN = (n,p=PREC)=> Number.isFinite(n) ? Math.round(n * 10**p) / 10**p : NaN;
const toFixedN = (n,p=PREC)=> Number.isFinite(n) ? roundN(n,p).toFixed(p) : '—';

const deg2rad = (d)=> d * Math.PI / 180;
const rad2deg = (r)=> r * 180 / Math.PI;

/* ========================= Elements ========================= */
// Canvas + status
const canvas   = $('#snell_canvas');
const markerOut= $('#marker_out');
const critOut  = $('#crit_out');
const modeOut  = $('#mode_out');
const warnNote = $('#warn_note');

// Drag modes
const modeMarker = $('#drag_mode_marker');
const modeN2     = $('#drag_mode_n2');
const modeN1     = $('#drag_mode_n1');

// Sliders + inputs + readouts
const n1Slider = $('#n1_slider'), n1Input = $('#n1_input'), n1Out = $('#n1_out');
const n2Slider = $('#n2_slider'), n2Input = $('#n2_input'), n2Out = $('#n2_out');
const t1Slider = $('#t1_slider'), t1Input = $('#t1_input'), t1Out = $('#t1_out');
const t2Slider = $('#t2_slider'), t2Input = $('#t2_input'), t2Out = $('#t2_out');
const t1maxSlider = $('#t1max_slider'), t1maxInput = $('#t1max_input'), t1maxOut = $('#t1max_out');

// Buttons
const resetBtn = $('#reset_btn');
const clearBtn = $('#clear_btn');

/* ========================= State ========================= */
let dragMode = 'marker'; // 'marker' | 'n2' | 'n1'
let isDragging = false;
let mapCache = null; // axes mapping for pointer/value conversion

/* ========================= Snell math ========================= */
function theta2FromTheta1(n1, n2, t1deg){
  const s = n1 * Math.sin(deg2rad(t1deg)) / n2;
  if (Math.abs(s) > 1) return NaN;     // total internal reflection
  return rad2deg(Math.asin(s));
}
function theta1FromTheta2(n1, n2, t2deg){
  const s = n2 * Math.sin(deg2rad(t2deg)) / n1;
  if (Math.abs(s) > 1) return NaN;     // invalid combination
  return rad2deg(Math.asin(s));
}
function criticalAngle(n1, n2){
  if (n1 > n2){
    const s = n2 / n1;
    if (s <= 1) return rad2deg(Math.asin(s));
  }
  return NaN;
}

/* ========================= Canvas helpers ========================= */
function sizeCanvasToContainer(cv){
  const parent = cv.parentElement;
  const pad = 24;
  const deviceW = Math.min(window.innerWidth || 320, 700);
  const targetW = Math.max(280, Math.min((parent?.clientWidth || deviceW) - pad, deviceW - pad));
  const aspect = 16/11;
  cv.width  = Math.round(targetW);
  cv.height = Math.round(targetW / aspect);
}

function drawAxes(ctx, opts){
  const { xmin, xmax, ymin, ymax, labelX, labelY } = opts;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const pad = 36, x0=pad, y0=pad, x1=W-pad, y1=H-pad;

  // bg
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(0,0,W,H);

  // grid
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  const nx=5, ny=4;
  for(let k=0;k<=nx;k++){
    const x = x0 + (x1-x0)*k/nx;
    ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke();
  }
  for(let k=0;k<=ny;k++){
    const y = y0 + (y1-y0)*k/ny;
    ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
  }

  // axes
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x0,y1); ctx.lineTo(x1,y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x0,y1); ctx.stroke();

  // labels
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText(labelX, (x0+x1)/2 - 20, y1+22);
  ctx.save(); ctx.translate(x0-26, (y0+y1)/2); ctx.rotate(-Math.PI/2);
  ctx.fillText(labelY, -20, 0); ctx.restore();

  // ticks
  ctx.fillStyle = '#94a3b8';
  for(let k=0;k<=nx;k++){
    const x = x0 + (x1-x0)*k/nx;
    const xv = xmin + (xmax-xmin)*k/nx;
    ctx.fillText(roundN(xv,2).toFixed(2), x-12, y1+14);
  }
  for(let k=0;k<=ny;k++){
    const y = y0 + (y1-y0)*k/ny;
    const yv = ymax - (ymax-ymin)*k/ny;
    ctx.fillText(roundN(yv,2).toFixed(2), x0-36, y+4);
  }

  const X = (v)=> x0 + (v - xmin)/(xmax - xmin) * (x1 - x0);
  const Y = (v)=> y1 - (v - ymin)/(ymax - ymin) * (y1 - y0);
  return {X,Y,x0,y0,x1,y1, xmin,xmax,ymin,ymax};
}

function plotLine(ctx, fn, domain, range, color='#7dd3fc'){
  mapCache = drawAxes(ctx, {
    xmin: domain.min, xmax: domain.max,
    ymin: range.min,  ymax: range.max,
    labelX: fn.labelX, labelY: fn.labelY,
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  const steps = 280;
  let started = false;
  for(let s=0;s<=steps;s++){
    const x = domain.min + (domain.max - domain.min) * s / steps;
    const y = fn.f(x);
    if(!Number.isFinite(y)){ started = false; continue; }
    const px = mapCache.X(x), py = mapCache.Y(y);
    if(!started){ ctx.moveTo(px,py); started = true; }
    else ctx.lineTo(px,py);
  }
  ctx.stroke();
}

function drawMarker(ctx, x, y){
  if(!mapCache || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const px = mapCache.X(x), py = mapCache.Y(y);
  if(px < mapCache.x0 || px > mapCache.x1 || py < mapCache.y0 || py > mapCache.y1) return;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#e5e7eb'; ctx.font = '11px system-ui';
  ctx.fillText(`(${toFixedN(x)}, ${toFixedN(y)})`, px + 8, py - 8);
}

/* ========================= Setters (sync UI) ========================= */
function setN1(val, doDraw=true){
  const v = clamp(roundN(val), +n1Slider.min, +n1Slider.max);
  const txt = toFixedN(v);
  n1Slider.value = txt; n1Input.value = txt; n1Out.value = txt;
  if(doDraw) computeFromT1();
}
function setN2(val, doDraw=true){
  const v = clamp(roundN(val), +n2Slider.min, +n2Slider.max);
  const txt = toFixedN(v);
  n2Slider.value = txt; n2Input.value = txt; n2Out.value = txt;
  if(doDraw) computeFromT1();
}
function setT1Max(val, doDraw=true){
  const v = clamp(roundN(val), +t1maxSlider.min, +t1maxSlider.max);
  const txt = toFixedN(v);
  t1maxSlider.value = txt; t1maxInput.value = txt; t1maxOut.value = `${txt}°`;
  // If current θ1 is beyond new max, clamp it
  if(+t1Slider.value > v) setT1(v, false);
  if(doDraw) drawAll();
}
function setT1(val, doDraw=true){
  let v = clamp(roundN(val), +t1Slider.min, +t1Slider.max);
  // respect critical angle (stay just below)
  const tc = criticalAngle(+n1Slider.value, +n2Slider.value);
  if(Number.isFinite(tc)) v = Math.min(v, roundN(tc - STEP));
  const txt = toFixedN(v);
  t1Slider.value = txt; t1Input.value = txt; t1Out.value = `${txt}°`;
  if(doDraw) computeFromT1();
}
function setT2(val, doDraw=true){
  const v = clamp(roundN(val), +t2Slider.min, +t2Slider.max);
  const txt = toFixedN(v);
  t2Slider.value = txt; t2Input.value = txt; t2Out.value = `${txt}°`;
  if(doDraw) computeFromT2();
}

/* ========================= Compute flows ========================= */
function computeFromT1(){
  warnNote.textContent = '';
  const n1 = +n1Slider.value, n2 = +n2Slider.value;
  const t1 = +t1Slider.value;
  let t2 = theta2FromTheta1(n1,n2,t1);
  const tc = criticalAngle(n1,n2);

  critOut.textContent = Number.isFinite(tc) ? `${toFixedN(tc)}°` : '—';

  if(!Number.isFinite(t2)){
    if(Number.isFinite(tc)){
      const t1c = clamp(tc - STEP, +t1Slider.min, +t1Slider.max);
      setT1(t1c, false);
      t2 = theta2FromTheta1(n1,n2,t1c);
      warnNote.textContent = 'Total internal reflection: θ₁ limited to just below the critical angle.';
    } else {
      setT1(0, false);
      t2 = theta2FromTheta1(n1,n2,0);
    }
  }

  const t2txt = toFixedN(t2);
  t2Slider.value = t2txt; t2Input.value = t2txt; t2Out.value = `${t2txt}°`;

  drawAll();
  markerOut.value = `(θ₁, θ₂) = (${toFixedN(+t1Slider.value)}, ${toFixedN(+t2Slider.value)})`;
}

function computeFromT2(){
  warnNote.textContent = '';
  const n1 = +n1Slider.value, n2 = +n2Slider.value;
  const t2 = +t2Slider.value;
  let t1 = theta1FromTheta2(n1,n2,t2);
  const tc = criticalAngle(n1,n2);

  critOut.textContent = Number.isFinite(tc) ? `${toFixedN(tc)}°` : '—';

  if(!Number.isFinite(t1)){
    // Adjust to nearest valid (θ₂→<=90°, then pick θ₁ just below θc if needed)
    warnNote.textContent = 'Chosen θ₂ is not valid for current indices. Adjusted to nearest valid value.';
    const t1c = Number.isFinite(tc) ? clamp(tc - STEP, +t1Slider.min, +t1Slider.max) : 0;
    setT1(t1c, false);
    const t2ok = theta2FromTheta1(n1,n2,t1c);
    setT2(t2ok, false);
  } else {
    setT1(t1, false);
  }

  drawAll();
  markerOut.value = `(θ₁, θ₂) = (${toFixedN(+t1Slider.value)}, ${toFixedN(+t2Slider.value)})`;
}

/* ========================= Drawing ========================= */
function drawAll(){
  sizeCanvasToContainer(canvas);
  const ctx = canvas.getContext('2d');

  const n1 = +n1Slider.value, n2 = +n2Slider.value;
  const t1max = +t1maxSlider.value;
  const tc = criticalAngle(n1,n2);

  // Plot θ₂ vs θ₁
  plotLine(
    ctx,
    {
      labelX: 'θ₁ (deg)',
      labelY: 'θ₂ (deg)',
      f: (t1)=> {
        if(Number.isFinite(tc) && t1 > tc) return NaN;
        return theta2FromTheta1(n1,n2,t1);
      }
    },
    {min:0, max:t1max},
    {min:0, max:90},
    '#7dd3fc'
  );

  // Critical angle line
  if(Number.isFinite(tc)){
    const x = mapCache.X(tc);
    ctx.strokeStyle = 'rgba(248,113,113,.85)';
    ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(x, mapCache.y0); ctx.lineTo(x, mapCache.y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fecaca';
    ctx.font = '12px system-ui';
    ctx.fillText(`θc ≈ ${toFixedN(tc)}°`, x + 6, mapCache.y0 + 14);
  }

  // Marker
  const t1 = +t1Slider.value, t2 = +t2Slider.value;
  if(Number.isFinite(t1) && Number.isFinite(t2)) drawMarker(ctx, t1, t2);
}

/* ========================= Drag interactions ========================= */
canvas.style.touchAction = 'none'; // prevent scroll while dragging on mobile

function pixelToTheta1(px){
  if(!mapCache) return NaN;
  const frac = clamp((px - mapCache.x0)/(mapCache.x1 - mapCache.x0), 0, 1);
  const t1 = mapCache.xmin + frac * (mapCache.xmax - mapCache.xmin);
  return clamp(roundN(t1), +t1Slider.min, +t1maxSlider.value);
}
function pixelToTheta2(py){
  if(!mapCache) return NaN;
  const frac = clamp((mapCache.y1 - py)/(mapCache.y1 - mapCache.y0), 0, 1);
  const t2 = mapCache.ymin + frac * (mapCache.ymax - mapCache.ymin);
  return clamp(roundN(t2), +t2Slider.min, +t2Slider.max);
}

function startDrag(ev){
  isDragging = true;
  canvas.setPointerCapture?.(ev.pointerId);
  handleDrag(ev, true);
}
function moveDrag(ev){
  if(!isDragging) return;
  handleDrag(ev, false);
}
function endDrag(ev){
  isDragging = false;
  canvas.releasePointerCapture?.(ev.pointerId);
  modeOut.value = dragMode === 'marker' ? 'Drag to set θ₁' :
                  dragMode === 'n2'     ? 'Drag to bend (adjust n₂)' :
                                           'Drag to bend (adjust n₁)';
}

function handleDrag(ev, isStart){
  ev.preventDefault?.();

  const rect = canvas.getBoundingClientRect();
  const px = clamp(ev.clientX - rect.left, mapCache.x0, mapCache.x1);
  const py = clamp(ev.clientY - rect.top,  mapCache.y0, mapCache.y1);

  const n1 = +n1Slider.value, n2 = +n2Slider.value;

  if(dragMode === 'marker'){
    modeOut.value = 'Dragging θ₁';
    const t1 = pixelToTheta1(px);
    setT1(t1); // computeFromT1() runs inside
    return;
  }

  // For bending line, derive (θ1, θ2) from pixel and update chosen index so Snell holds exactly.
  let t1 = pixelToTheta1(px);
  let t2 = pixelToTheta2(py);

  // keep off exact 0/90 to avoid sin=0 or invalid arcsin
  t1 = clamp(t1, STEP, +t1maxSlider.value);
  t2 = clamp(t2, STEP, 90-STEP);

  if(dragMode === 'n2'){
    modeOut.value = 'Dragging curve (adjusting n₂)';
    const s1 = Math.sin(deg2rad(t1));
    const s2 = Math.sin(deg2rad(t2));
    if(Math.abs(s2) < EPS){
      warnNote.textContent = 'Angle too small/large for stable computation. Try a different drag point.';
      return;
    }
    const n2p = clamp(roundN((n1 * s1) / s2), +n2Slider.min, +n2Slider.max);
    setN2(n2p, false);
    // Now set θ1 to dragged x and recompute θ2 from Snell for consistency
    setT1(t1, false);
    const t2ok = theta2FromTheta1(+n1Slider.value, +n2Slider.value, +t1Slider.value);
    setT2(t2ok, false);
    drawAll();
    markerOut.value = `(θ₁, θ₂) = (${toFixedN(+t1Slider.value)}, ${toFixedN(+t2Slider.value)})`;
    return;
  }

  if(dragMode === 'n1'){
    modeOut.value = 'Dragging curve (adjusting n₁)';
    const s1 = Math.sin(deg2rad(t1));
    const s2 = Math.sin(deg2rad(t2));
    if(Math.abs(s1) < EPS){
      warnNote.textContent = 'Angle too small for stable computation. Try a different drag point.';
      return;
    }
    const n1p = clamp(roundN((n2 * s2) / s1), +n1Slider.min, +n1Slider.max);
    setN1(n1p, false);
    // Keep θ1 at dragged x and recompute θ2 for consistency
    setT1(t1, false);
    const t2ok = theta2FromTheta1(+n1Slider.value, +n2Slider.value, +t1Slider.value);
    setT2(t2ok, false);
    drawAll();
    markerOut.value = `(θ₁, θ₂) = (${toFixedN(+t1Slider.value)}, ${toFixedN(+t2Slider.value)})`;
    return;
  }
}

/* ========================= Wiring ========================= */
// Drag mode radios
function updateDragMode(){
  if(modeMarker.checked) dragMode = 'marker';
  else if(modeN2.checked) dragMode = 'n2';
  else dragMode = 'n1';

  modeOut.value = dragMode === 'marker' ? 'Drag to set θ₁' :
                  dragMode === 'n2'     ? 'Drag to bend (adjust n₂)' :
                                           'Drag to bend (adjust n₁)';
}
[modeMarker, modeN2, modeN1].forEach(r => r.addEventListener('change', updateDragMode));

// Sliders
n1Slider.addEventListener('input', ()=> setN1(+n1Slider.value));
n2Slider.addEventListener('input', ()=> setN2(+n2Slider.value));
t1Slider.addEventListener('input', ()=> setT1(+t1Slider.value));
t2Slider.addEventListener('input', ()=> setT2(+t2Slider.value));
t1maxSlider.addEventListener('input', ()=> setT1Max(+t1maxSlider.value));

// Number inputs
n1Input.addEventListener('input', ()=> setN1(parseFloat(n1Input.value)));
n2Input.addEventListener('input', ()=> setN2(parseFloat(n2Input.value)));
t1Input.addEventListener('input', ()=> setT1(parseFloat(t1Input.value)));
t2Input.addEventListener('input', ()=> setT2(parseFloat(t2Input.value)));
t1maxInput.addEventListener('input', ()=> setT1Max(parseFloat(t1maxInput.value)));

// Buttons
resetBtn.addEventListener('click', ()=>{
  setN1(1.0,false);
  setN2(1.5,false);
  setT1Max(80,false);
  setT1(0,false);
  setT2(0,false);
  warnNote.textContent = '';
  drawAll();
  markerOut.value = `(θ₁, θ₂) = (${toFixedN(0)}, ${toFixedN(0)})`;
});
clearBtn.addEventListener('click', ()=>{
  setT1(0,false);
  setT2(0,false);
  warnNote.textContent = 'Angles cleared to 0°. Drag or use controls to set values.';
  drawAll();
  markerOut.value = `(θ₁, θ₂) = (${toFixedN(0)}, ${toFixedN(0)})`;
});

// Pointer events (mobile-friendly)
canvas.addEventListener('pointerdown', startDrag);
canvas.addEventListener('pointermove', moveDrag);
canvas.addEventListener('pointerup',    endDrag);
canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('pointerleave', endDrag);

// Resize handling
window.addEventListener('resize', ()=>{
  if(document.activeElement && document.activeElement.tagName === 'INPUT') return; // avoid keyboard jank
  drawAll();
});

/* ========================= Boot ========================= */
(function init(){
  // Prime outputs
  n1Out.value    = toFixedN(+n1Slider.value);
  n2Out.value    = toFixedN(+n2Slider.value);
  t1Out.value    = `${toFixedN(+t1Slider.value)}°`;
  t2Out.value    = `${toFixedN(+t2Slider.value)}°`;
  t1maxOut.value = `${toFixedN(+t1maxSlider.value)}°`;
  critOut.textContent = '—';
  updateDragMode();

  // First draw
  computeFromT1(); // also draws
})();
