/* animation.js — Gold Particles engine (mobile-first, touch + mouse)
   API:
     GoldParticles.init(options?)
     GoldParticles.attachTo(idOrEl, options?)
     GoldParticles.detachFrom(idOrEl)
     GoldParticles.setReducedMotion(boolean)
     GoldParticles.enableGlobalTrails(boolean)
     GoldParticles.setTrailsWhilePressing(boolean)
*/
(function (global) {
  "use strict";

  const DEFAULTS = {
    burstCountButton: 90,
    burstCountGlobal: 40,
    hoverRate: 12,              // per second on hover
    moveRate: 60,               // max emissions per second while moving
    trailCountPerTick: 1,       // particles per throttled move tick
    sizeMin: 1.6, sizeMax: 3.6, // px before DPR scaling
    speedMin: 90, speedMax: 260,
    gravity: 520,
    drag: 0.92,
    lifeMin: 0.6, lifeMax: 1.2,
    spinMin: -8,  spinMax: 8,
    spread: 0.9,
    colors: ["#f7d774","#e7b84b","#c9971a","#ffe7a3"],

    // Engine options
    globalTrails: true,
    trailsWhilePressing: false  // if true, trails only while pointer is down
  };

  const GP = {
    _cfg: { ...DEFAULTS },
    _canvas: null,
    _ctx: null,
    _DPR: 1,
    _particles: [],
    _lastTime: performance.now(),
    _attached: new Map(), // element -> handlers and timers
    _globalHandlersSet: false,
    _reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    _pressing: false,
    _lastMoveEmit: 0
  };

  /* Utilities */
  const rand = (a,b)=> a + Math.random()*(b-a);
  const pick = arr => arr[(Math.random()*arr.length)|0];
  const nowMs = ()=> performance.now();
  function toEl(idOrEl){
    if (!idOrEl) return null;
    return typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  }

  /* Canvas setup */
  function ensureCanvas(){
    if (GP._canvas) return;
    const c = document.createElement('canvas');
    c.id = 'gp-particles-canvas';
    Object.assign(c.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '9999'
    });
    document.body.appendChild(c);
    GP._canvas = c;
    GP._ctx = c.getContext('2d');
    resize();
    addEventListener('resize', resize);
  }
  function resize(){
    const w = innerWidth, h = innerHeight;
    GP._DPR = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    GP._canvas.width  = Math.floor(w * GP._DPR);
    GP._canvas.height = Math.floor(h * GP._DPR);
    GP._canvas.style.width = w + 'px';
    GP._canvas.style.height = h + 'px';
    GP._ctx.setTransform(GP._DPR, 0, 0, GP._DPR, 0, 0);
  }

  /* Particle system */
  function emit(x, y, opts = {}){
    const count = opts.count ?? 1;
    const directional = opts.directional ?? false;
    const dirAngle = opts.angle ?? (-90 * Math.PI/180);
    for (let i=0; i<count; i++){
      const angle = directional
        ? dirAngle + (rand(-GP._cfg.spread, GP._cfg.spread) * Math.PI/4)
        : rand(0, Math.PI*2);
      const speed = rand(GP._cfg.speedMin, GP._cfg.speedMax);
      GP._particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(GP._cfg.sizeMin, GP._cfg.sizeMax),
        life: rand(GP._cfg.lifeMin, GP._cfg.lifeMax),
        age: 0,
        rot: rand(0, 360),
        spin: rand(GP._cfg.spinMin, GP._cfg.spinMax),
        color: pick(GP._cfg.colors),
        shape: Math.random() < 0.25 ? 'star' : 'circle'
      });
    }
  }
  function drawStar(ctx, x, y, r, rot){
    const spikes = 5, step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    for (let i=0; i<spikes; i++){
      ctx.lineTo(x + Math.cos(rot + (i*2+1)*step) * r*0.45,
                 y + Math.sin(rot + (i*2+1)*step) * r*0.45);
      ctx.lineTo(x + Math.cos(rot + (i+1)*2*step) * r,
                 y + Math.sin(rot + (i+1)*2*step) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  function tick(t){
    const dt = Math.min(0.033, (t - GP._lastTime)/1000);
    GP._lastTime = t;
    const ctx = GP._ctx;

    ctx.clearRect(0,0,GP._canvas.width/GP._DPR,GP._canvas.height/GP._DPR);

    for (let i=GP._particles.length-1; i>=0; i--){
      const p = GP._particles[i];
      p.age += dt;
      if (p.age >= p.life){ GP._particles.splice(i,1); continue; }

      p.vx *= GP._cfg.drag;
      p.vy = p.vy * GP._cfg.drag + GP._cfg.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;

      const f = p.age / p.life;
      const alpha = f < 0.1 ? f/0.1 : 1 - Math.pow((f-0.1)/0.9, 1.5);

      ctx.globalAlpha = Math.max(0, alpha) * 0.55;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18;

      if (p.shape === 'star'){
        drawStar(ctx, p.x, p.y, p.size*1.4, p.rot * Math.PI/180);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
      }

      ctx.globalAlpha = Math.max(0, alpha);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff7d1";
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.6, p.size*0.35), 0, Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  /* Global interactions */
  function throttledTrailEmit(x, y){
    const minInterval = 1000 / GP._cfg.moveRate;
    const t = nowMs();
    if (t - GP._lastMoveEmit < minInterval) return;
    GP._lastMoveEmit = t;
    emit(x, y, { count: GP._cfg.trailCountPerTick, directional: true, angle: -90*Math.PI/180 });
  }

  function onGlobalPointerMove(e){
    if (GP._reducedMotion) return;
    if (GP._cfg.trailsWhilePressing && !GP._pressing) return;
    throttledTrailEmit(e.clientX, e.clientY);
  }
  function onGlobalTouchMove(e){
    if (GP._reducedMotion) return;
    if (GP._cfg.trailsWhilePressing && !GP._pressing) return;
    // Emit for all touches for richer trails
    for (const t of e.touches){
      throttledTrailEmit(t.clientX, t.clientY);
    }
  }
  function onGlobalPointerDown(e){
    if (GP._reducedMotion) return;
    GP._pressing = true;
    const isButton = e.target && GP._attached.has(e.target);
    const count = isButton ? GP._cfg.burstCountButton : GP._cfg.burstCountGlobal;
    emit(e.clientX, e.clientY, { count });
  }
  function onGlobalPointerUp(){
    GP._pressing = false;
  }

  function addGlobalHandlers(){
    if (GP._globalHandlersSet) return;
    // Pointer events
    addEventListener('pointerdown', onGlobalPointerDown, { passive: true });
    addEventListener('pointerup',   onGlobalPointerUp,   { passive: true });
    addEventListener('pointercancel', onGlobalPointerUp, { passive: true });
    if (GP._cfg.globalTrails){
      addEventListener('pointermove', onGlobalPointerMove, { passive: true });
      // Explicit touchmove for broader device support
      addEventListener('touchmove', onGlobalTouchMove, { passive: true });
    }
    GP._globalHandlersSet = true;
  }

  /* Element-specific interactions */
  function startHoverTimer(el){
    const st = GP._attached.get(el);
    if (!st) return;
    if (GP._reducedMotion) return;
    if (st.hoverTimer) return;
    const interval = 1000 / GP._cfg.hoverRate;
    st.hoverTimer = setInterval(() => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width/2 + rand(-20, 20);
      const y = r.top + r.height/2 + rand(-8, 8);
      emit(x, y, { count: 1, directional: true, angle: -90 * Math.PI/180 });
    }, interval);
  }
  function stopHoverTimer(el){
    const st = GP._attached.get(el);
    if (st && st.hoverTimer){
      clearInterval(st.hoverTimer);
      st.hoverTimer = null;
    }
  }

  function attachElement(el, options = {}){
    if (!el) return;
    if (GP._attached.has(el)) return;

    const opts = {
      hoverShimmer: true,
      clickBurst: GP._cfg.burstCountButton,
      trailOnMove: true,
      ...options
    };

    const state = { hoverTimer: null };
    GP._attached.set(el, state);

    // Hover shimmer
    function onEnter(){ if (opts.hoverShimmer) startHoverTimer(el); }
    function onLeave(){ stopHoverTimer(el); }

    // Click burst
    function onClick(e){
      if (GP._reducedMotion) return;
      const r = el.getBoundingClientRect();
      const x = r.left + (e.clientX - r.left);
      const y = r.top  + (e.clientY - r.top);
      emit(x, y, { count: opts.clickBurst });
    }

    // Trails on move within element
    function onMove(e){
      if (GP._reducedMotion) return;
      if (GP._cfg.trailsWhilePressing && !GP._pressing) return;
      throttledTrailEmit(e.clientX, e.clientY);
    }
    function onTouchMove(e){
      if (GP._reducedMotion) return;
      if (GP._cfg.trailsWhilePressing && !GP._pressing) return;
      for (const t of e.touches){
        throttledTrailEmit(t.clientX, t.clientY);
      }
    }

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('click', onClick);

    if (opts.trailOnMove){
      el.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: true }); // explicit touch trail
    }

    state.handlers = { onEnter, onLeave, onClick, onMove, onTouchMove };
  }

  function detachElement(el){
    if (!el) return;
    const st = GP._attached.get(el);
    if (!st) return;

    const h = st.handlers || {};
    el.removeEventListener('mouseenter', h.onEnter);
    el.removeEventListener('mouseleave', h.onLeave);
    el.removeEventListener('click',     h.onClick);
    el.removeEventListener('pointermove', h.onMove);
    el.removeEventListener('touchmove',   h.onTouchMove);
    stopHoverTimer(el);
    GP._attached.delete(el);
  }

  /* Public API */
  GP.init = function(options = {}){
    GP._cfg = { ...DEFAULTS, ...options };
    ensureCanvas();
    addGlobalHandlers();
    requestAnimationFrame(tick);

    // Respect system setting
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
      GP._reducedMotion = e.matches;
      // Stop all hover timers if reduced
      if (GP._reducedMotion){
        for (const el of GP._attached.keys()) stopHoverTimer(el);
      }
    });
  };

  GP.attachTo = function(idOrEl, options){
    attachElement(toEl(idOrEl), options);
  };

  GP.detachFrom = function(idOrEl){
    detachElement(toEl(idOrEl));
  };

  GP.setReducedMotion = function(v){
    GP._reducedMotion = !!v;
    if (GP._reducedMotion){
      for (const el of GP._attached.keys()) stopHoverTimer(el);
    }
  };

  GP.enableGlobalTrails = function(v){
    GP._cfg.globalTrails = !!v;
    // Rebind global listeners for trails
    if (v){
      addEventListener('pointermove', onGlobalPointerMove, { passive: true });
      addEventListener('touchmove', onGlobalTouchMove, { passive: true });
    } else {
      removeEventListener('pointermove', onGlobalPointerMove, { passive: true });
      removeEventListener('touchmove', onGlobalTouchMove, { passive: true });
    }
  };

  GP.setTrailsWhilePressing = function(v){
    GP._cfg.trailsWhilePressing = !!v;
  };

  // Expose
  global.GoldParticles = GP;

})(window);
