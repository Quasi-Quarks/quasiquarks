/* Mobile Triangle Studio - app.js (with tap buffer) */
(() => {
  // ------- DOM -------
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');

  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const colorPanel = document.getElementById('colorPanel');
  const fillColor = document.getElementById('fillColor');

  const rotateNotice = document.getElementById('rotateNotice');
  const hint = document.getElementById('hint');

  // ------- State -------
  let tris = [];                // array of triangle models
  let selected = -1;            // selected triangle index
  let facingToggle = 0;         // alternate left/right for new triangles
  let gesture = null;           // current gesture state

  // history (simple full-scene snapshots)
  const undoStack = [];
  const redoStack = [];

  // ------- Visual / Interaction constants (CSS pixels) -------
  const HANDLE_RADIUS = 33;       // visual radius for corner dots
  const CENTER_HIT_R  = 28;       // tap radius for center (move/select)
  const NEW_TRI_SIZE  = 140;      // baseline “medium” triangle size

  // ***** Tap buffer near edges/border (adjust to taste) *****
  const TAP_BUFFER    = 40;       // <- increase/decrease sensitivity
  const HANDLE_HIT_R  = HANDLE_RADIUS + Math.max(0, TAP_BUFFER - 8);

  // Triangle model:
  // {
  //   base: [{x,y},{x,y},{x,y}],   // canonical vertices in "model space"
  //   tx: number, ty: number,      // translation in canvas space
  //   scale: number,               // 1 = 100%
  //   rot: number,                 // radians
  //   fill: string                 // CSS color
  // }

  // ------- Canvas sizing (hi-DPI) -------
  function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.floor(document.documentElement.clientWidth);
    const h = Math.floor(document.documentElement.clientHeight);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  // Show rotate overlay in portrait
  function updateOrientationOverlay() {
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    rotateNotice.setAttribute('aria-hidden', String(!isPortrait));
  }

  // ------- Math helpers -------
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angleOf = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

  function centroid(pts) {
    return {
      x: (pts[0].x + pts[1].x + pts[2].x) / 3,
      y: (pts[0].y + pts[1].y + pts[2].y) / 3
    };
  }

  // Apply triangle transform -> world vertices
  function triWorldPoints(t) {
    const c = centroid(t.base);
    const s = t.scale;
    const cos = Math.cos(t.rot), sin = Math.sin(t.rot);
    return t.base.map(p => {
      const dx = p.x - c.x, dy = p.y - c.y;
      const rx = dx * s, ry = dy * s;
      const x = c.x + (rx * cos - ry * sin) + t.tx;
      const y = c.y + (rx * sin + ry * cos) + t.ty;
      return { x, y };
    });
  }

  // Inverse map a world point back into the triangle's model space
  function worldToModel(t, worldPoint) {
    const c = centroid(t.base);
    const x = worldPoint.x - t.tx - c.x;
    const y = worldPoint.y - t.ty - c.y;
    const cos = Math.cos(-t.rot), sin = Math.sin(-t.rot);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    const invS = 1 / t.scale;
    return { x: rx * invS + c.x, y: ry * invS + c.y };
  }

  // Barycentric point-in-triangle (world points)
  function pointInTriangle(pt, triPts) {
    const [a, b, c] = triPts;
    const v0 = { x: c.x - a.x, y: c.y - a.y };
    const v1 = { x: b.x - a.x, y: b.y - a.y };
    const v2 = { x: pt.x - a.x, y: pt.y - a.y };

    const dot00 = v0.x * v0.x + v0.y * v0.y;
    const dot01 = v0.x * v1.x + v0.y * v1.y;
    const dot02 = v0.x * v2.x + v0.y * v2.y;
    const dot11 = v1.x * v1.x + v1.y * v1.y;
    const dot12 = v1.x * v2.x + v1.y * v2.y;

    const invDen = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDen;
    const v = (dot00 * dot12 - dot01 * dot02) * invDen;

    return (u >= 0) && (v >= 0) && (u + v <= 1);
  }

  // distance from point P to line segment AB
  function pointToSegDist(p, a, b) {
    const vx = b.x - a.x, vy = b.y - a.y;
    const wx = p.x - a.x, wy = p.y - a.y;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);
    const t = c1 / c2;
    const proj = { x: a.x + t * vx, y: a.y + t * vy };
    return Math.hypot(p.x - proj.x, p.y - proj.y);
  }

  // near triangle edges (or inside), with buffer
  function nearTriangle(pt, triPts, buffer) {
    if (pointInTriangle(pt, triPts)) return true;
    const d0 = pointToSegDist(pt, triPts[0], triPts[1]);
    const d1 = pointToSegDist(pt, triPts[1], triPts[2]);
    const d2 = pointToSegDist(pt, triPts[2], triPts[0]);
    return Math.min(d0, d1, d2) <= buffer;
  }

  // ------- Scene helpers -------
  function addTriangleAt(x, y) {
    // Make a medium isosceles triangle "facing" left/right.
    const size = NEW_TRI_SIZE;
    const half = size / 2;

    // Define base triangle centered near (0,0) in model space, pointing right.
    const base = [
      { x: -half * 0.6, y: -half }, // top
      { x: -half * 0.6, y:  half }, // bottom
      { x:  half,       y:   0   }  // nose (points right)
    ];

    const faceLeft = (facingToggle++ % 2) === 1;
    const rot = faceLeft ? Math.PI : 0;

    const tri = {
      base,
      tx: x,
      ty: y,
      scale: 1,
      rot,
      fill: fillColor.value || '#60a5fa'
    };

    tris.push(tri);
    selectTriangle(tris.length - 1);
    pushHistory();
    redraw();
  }

  function selectTriangle(i) {
    selected = i;
    updateColorPanel();
  }

  function updateColorPanel() {
    const visible = selected !== -1;
    colorPanel.setAttribute('aria-hidden', String(!visible));
    if (visible) {
      fillColor.value = tris[selected].fill || '#60a5fa';
    }
  }

  // ------- Drawing -------
  function redraw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    tris.forEach((t, i) => {
      const pts = triWorldPoints(t);

      // fill
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.closePath();
      ctx.fillStyle = t.fill || '#60a5fa';
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;

      // selected outline + handles
      if (i === selected) {
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = 'rgba(96,165,250,0.95)';
        ctx.stroke();
        ctx.setLineDash([]);

        // draw corner handle dots
        pts.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, HANDLE_RADIUS * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(96,165,250,0.95)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, HANDLE_RADIUS * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = '#0b1022';
          ctx.fill();
        });

        // center marker (subtle)
        const c = centroid(pts);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();
      }
    });
  }

  // ------- Touch utilities -------
  function primaryTouch(e) {
    const t = e.touches[0] || e.changedTouches[0];
    return { id: t.identifier, x: t.clientX, y: t.clientY };
  }

  function twoTouches(e) {
    if (e.touches.length < 2) return null;
    const t0 = e.touches[0];
    const t1 = e.touches[1];
    return [
      { id: t0.identifier, x: t0.clientX, y: t0.clientY },
      { id: t1.identifier, x: t1.clientX, y: t1.clientY }
    ];
  }

  function canvasPointFromClient(x, y) {
    const rect = canvas.getBoundingClientRect();
    return { x: x - rect.left, y: y - rect.top };
  }

  // ------- Hit testing -------
  function hitTestTriangleIndex(pt) {
    for (let i = tris.length - 1; i >= 0; i--) {
      const pts = triWorldPoints(tris[i]);
      if (pointInTriangle(pt, pts)) return i;
    }
    return -1;
  }

  function nearestHandleIndex(t, pt) {
    const pts = triWorldPoints(t);
    for (let i = 0; i < 3; i++) {
      if (dist(pts[i], pt) <= HANDLE_HIT_R) return i;
    }
    return -1;
  }

  function centerHit(t, pt) {
    const pts = triWorldPoints(t);
    const c = centroid(pts);
    return dist(c, pt) <= CENTER_HIT_R;
  }

  // ------- History -------
  function snapshot() {
    return JSON.stringify({ tris, selected });
  }
  function restore(json) {
    const { tris: T, selected: S } = JSON.parse(json);
    tris = T;
    selected = S;
    updateColorPanel();
    redraw();
  }
  function pushHistory() {
    undoStack.push(snapshot());
    redoStack.length = 0;
    updateUndoRedoState();
  }
  function undo() {
    if (undoStack.length <= 1) return;
    const current = undoStack.pop();
    redoStack.push(current);
    restore(undoStack[undoStack.length - 1]);
    updateUndoRedoState();
  }
  function redo() {
    if (!redoStack.length) return;
    const next = redoStack.pop();
    undoStack.push(next);
    restore(next);
    updateUndoRedoState();
  }
  function updateUndoRedoState() {
    undoBtn.classList.toggle('is-disabled', undoStack.length <= 1);
    redoBtn.classList.toggle('is-disabled', redoStack.length === 0);
  }

  // ------- Gestures -------
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();

    // Pinch start?
    if (e.touches.length === 2) {
      if (selected === -1) return; // nothing to pinch
      const [t0, t1] = twoTouches(e);
      const p0 = canvasPointFromClient(t0.x, t0.y);
      const p1 = canvasPointFromClient(t1.x, t1.y);
      gesture = {
        type: 'pinch',
        t0id: t0.id,
        t1id: t1.id,
        startDist: dist(p0, p1),
        startAngle: angleOf(p0, p1),
        initScale: tris[selected].scale,
        initRot: tris[selected].rot
      };
      return;
    }

    // Single touch
    const t = primaryTouch(e);
    const p = canvasPointFromClient(t.x, t.y);

    // If touch hits an existing triangle (inside), handle as before
    let hit = hitTestTriangleIndex(p);
    if (hit !== -1) {
      selectTriangle(hit);
      redraw();

      const tri = tris[selected];
      const handleIdx = nearestHandleIndex(tri, p);
      if (handleIdx !== -1) {
        const m0 = worldToModel(tri, p);
        gesture = { type: 'vertex', handleIdx, startModel: m0 };
        return;
      }
      if (centerHit(tri, p)) {
        gesture = { type: 'move', start: p, initTx: tri.tx, initTy: tri.ty };
        return;
      }
      gesture = { type: 'none', start: p };
      return;
    }

    // ***** New: near any triangle edge? (within TAP_BUFFER) *****
    for (let i = tris.length - 1; i >= 0; i--) {
      const pts = triWorldPoints(tris[i]);
      if (nearTriangle(p, pts, TAP_BUFFER)) {
        selectTriangle(i);
        redraw();
        gesture = { type: 'none', start: p };
        return;
      }
    }

    // Truly empty area: create new triangle
    addTriangleAt(p.x, p.y);
    gesture = { type: 'none' };
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!gesture) return;

    // Pinch/rotate
    if (gesture.type === 'pinch') {
      if (e.touches.length < 2 || selected === -1) return;
      const [t0, t1] = twoTouches(e);
      const p0 = canvasPointFromClient(t0.x, t0.y);
      const p1 = canvasPointFromClient(t1.x, t1.y);

      const d = dist(p0, p1);
      const ang = angleOf(p0, p1);

      const tri = tris[selected];
      tri.scale = Math.max(0.1, gesture.initScale * (d / gesture.startDist));
      tri.rot = gesture.initRot + (ang - gesture.startAngle);

      redraw();
      return;
    }

    // Single-finger gestures
    const t = primaryTouch(e);
    const p = canvasPointFromClient(t.x, t.y);

    if (gesture.type === 'move' && selected !== -1) {
      const tri = tris[selected];
      tri.tx = gesture.initTx + (p.x - gesture.start.x);
      tri.ty = gesture.initTy + (p.y - gesture.start.y);
      redraw();
      return;
    }

    if (gesture.type === 'vertex' && selected !== -1) {
      const tri = tris[selected];
      const m = worldToModel(tri, p);
      tri.base = tri.base.map((v, idx) =>
        idx === gesture.handleIdx ? { x: m.x, y: m.y } : v
      );
      redraw();
      return;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (gesture) {
      if (gesture.type === 'pinch' || gesture.type === 'move' || gesture.type === 'vertex') {
        pushHistory();
      }
    }
    gesture = null;
  }, { passive: false });

  // Color changes
  fillColor.addEventListener('input', () => {
    if (selected === -1) return;
    tris[selected].fill = fillColor.value;
    redraw();
  });
  fillColor.addEventListener('change', () => {
    if (selected !== -1) pushHistory();
  });

  // Undo/Redo
  undoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (undoBtn.classList.contains('is-disabled')) return;
    undo();
  });
  redoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (redoBtn.classList.contains('is-disabled')) return;
    redo();
  });

  // ------- Init -------
  function init() {
    updateOrientationOverlay();
    resizeCanvas();
    pushHistory(); // initial empty scene snapshot
    if (hint) {
      hint.style.opacity = '0.9';
      setTimeout(() => { hint.style.opacity = '0'; }, 2000);
      setTimeout(() => { hint.classList.add('is-hidden'); }, 2600);
    }
  }

  // Keep canvas correct on viewport/orientation changes
  window.addEventListener('resize', () => {
    updateOrientationOverlay();
    resizeCanvas();
  }, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      updateOrientationOverlay();
      resizeCanvas();
    }, { passive: true });
  }

  window.addEventListener('orientationchange', () => {
    updateOrientationOverlay();
    resizeCanvas();
  });

  // hard-disable mouse/keyboard (mobile-only UX)
  ['mousedown','mousemove','mouseup','wheel','keydown','keyup'].forEach(evt =>
    window.addEventListener(evt, (e) => e.preventDefault(), { passive: false })
  );

  init();
})();
