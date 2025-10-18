/* =========================================================
   Triangle Studio — Full JS
   Target HTML ids are defined in your index.html
   ========================================================= */

(() => {
  // ---------- DOM ----------
  const cvs = document.getElementById('canvas');
  const ctx = cvs.getContext('2d');
  const stage = document.getElementById('stage');

  // Top actions
  const btnHelp = document.getElementById('btn-help');
  const helpDialog = document.getElementById('help-dialog');

  // Mode & history
  const modeDrawBtn = document.getElementById('mode-draw');
  const modeEditBtn = document.getElementById('mode-edit');
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');

  // Style controls
  const fillInput   = document.getElementById('fill-color');
  const strokeInput = document.getElementById('stroke-color');
  const opacityInput= document.getElementById('opacity');
  const opacityOut  = document.getElementById('opacity-out');
  const lwInput     = document.getElementById('stroke-width');
  const lwOut       = document.getElementById('lw-out');

  // Transform controls
  const scaleInput  = document.getElementById('scale');
  const scaleOut    = document.getElementById('scale-out');
  const rotInput    = document.getElementById('rotation');
  const rotOut      = document.getElementById('rot-out');

  // Actions
  const dupBtn   = document.getElementById('btn-duplicate');
  const delBtn   = document.getElementById('btn-delete');
  const clearBtn = document.getElementById('btn-clear');
  const saveBtn  = document.getElementById('btn-save');

  // HUD / Toasts
  const hud = document.getElementById('hud');
  const selectionLabel = document.getElementById('selection-label');
  const toastRoot = document.getElementById('toast');
  const toastTpl = document.getElementById('toast-template');

  // ---------- State ----------
  let mode = 'draw'; // 'draw' | 'edit'
  let clickPts = []; // for drawing 3 points

  /** Triangle model:
   * {
   *   id: number,
   *   base: [{x,y},{x,y},{x,y}], // original vertices in canvas CSS px
   *   tx: number, ty: number,    // translation
   *   scale: number,             // percent (100 = 1x)
   *   rot: number,               // degrees
   *   style: { fill, stroke, lw, opacity }
   * }
   */
  let tris = [];
  let selected = -1; // index in tris

  // History (undo/redo)
  const past = [];   // stack of serialized states
  const future = [];

  // Gestures / interactions
  let dragging = false;
  let dragStart = null; // {p:{x,y}, tx0, ty0}
  let draggingVertex = -1; // 0/1/2 if dragging a vertex in edit mode
  let gesture = null; // pinch/rotate: { ids:[id1,id2], p0:[p1,p2], dist0, ang0, scale0, rot0 }

  // Canvas & DPR
  function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const pad = 24;
    const rect = stage.getBoundingClientRect();
    const w = Math.max(320, rect.width - pad * 2);
    const h = Math.max(280, rect.height - pad * 2);

    cvs.style.width = w + 'px';
    cvs.style.height = h + 'px';
    cvs.width  = Math.round(w * dpr);
    cvs.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  // ---------- Helpers ----------
  function toast(msg, ms = 1800) {
    if (!toastTpl) return;
    const node = toastTpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.toast-text').textContent = msg;
    toastRoot.appendChild(node);
    const timeout = parseInt(node.dataset.timeout || ms, 10);
    setTimeout(() => node.remove(), timeout);
  }

  function centroid(pts) {
    return {
      x: (pts[0].x + pts[1].x + pts[2].x) / 3,
      y: (pts[0].y + pts[1].y + pts[2].y) / 3
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const deg2rad = d => d * Math.PI / 180;
  const rad2deg = r => r * 180 / Math.PI;

  function canvasPoint(evt) {
    const rect = cvs.getBoundingClientRect();
    if (evt.touches && evt.touches.length) {
      const t = evt.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    if (evt.changedTouches && evt.changedTouches.length) {
      const t = evt.changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

  function transformPoints(t) {
    const c = centroid(t.base);
    const s = t.scale / 100;
    const a = deg2rad(t.rot);
    const cos = Math.cos(a), sin = Math.sin(a);
    return t.base.map(p => {
      const dx = p.x - c.x, dy = p.y - c.y;
      const rx = dx * s, ry = dy * s;
      const x = c.x + (rx * cos - ry * sin) + t.tx;
      const y = c.y + (rx * sin + ry * cos) + t.ty;
      return { x, y };
    });
  }

  // Hit testing point in triangle (barycentric)
  function pointInTri(pt, triPts) {
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
    return u >= 0 && v >= 0 && u + v <= 1;
  }

  // Distance & angle helpers
  const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const angleBetween = (p1, p2) => Math.atan2(p2.y - p1.y, p2.x - p1.x);

  // History serialization
  function snapshot() {
    return JSON.stringify({
      tris,
      selected
    });
  }
  function restore(json) {
    const obj = JSON.parse(json);
    tris = obj.tris.map(t => ({
      id: t.id,
      base: t.base.map(p => ({ x: p.x, y: p.y })),
      tx: t.tx, ty: t.ty,
      scale: t.scale, rot: t.rot,
      style: { ...t.style }
    }));
    selected = obj.selected;
    syncUIWithSelection();
    redraw();
  }
  function commit(label = '') {
    past.push(snapshot());
    future.length = 0;
    updateHistoryButtons();
    if (label) toast(label);
  }
  function undo() {
    if (!past.length) return;
    future.push(snapshot());
    const prev = past.pop();
    restore(prev);
    updateHistoryButtons();
  }
  function redo() {
    if (!future.length) return;
    past.push(snapshot());
    const next = future.pop();
    restore(next);
    updateHistoryButtons();
  }
  function updateHistoryButtons() {
    undoBtn.disabled = past.length === 0;
    redoBtn.disabled = future.length === 0;
  }

  // ---------- Drawing ----------
  function redraw() {
    const rect = cvs.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // draw triangles
    tris.forEach((t, i) => {
      const pts = transformPoints(t);

      // filled
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.closePath();

      ctx.globalAlpha = t.style.opacity;
      ctx.fillStyle = t.style.fill;
      ctx.fill();

      ctx.globalAlpha = 1;
      if (t.style.lw > 0) {
        ctx.lineWidth = t.style.lw;
        ctx.strokeStyle = t.style.stroke;
        ctx.stroke();
      }

      // selection outline + vertex handles
      if (i === selected && mode === 'edit') {
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(96,165,250,.95)';
        ctx.stroke();
        ctx.setLineDash([]);

        // vertex handles
        const r = 8;
        pts.forEach((p, vi) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = vi === draggingVertex ? 'rgba(96,165,250,0.95)' : 'rgba(96,165,250,0.7)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#0b1022';
          ctx.stroke();
        });
      }
    });

    // Draw markers for current drawing points
    if (mode === 'draw' && clickPts.length) {
      ctx.fillStyle = '#fca5a5';
      clickPts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // HUD state
    if (selected !== -1 && mode === 'edit') {
      selectionLabel.hidden = false;
    } else {
      selectionLabel.hidden = true;
    }
  }

  // ---------- Selection & UI ----------
  function setMode(next) {
    if (mode === next) return;
    mode = next;
    modeDrawBtn.setAttribute('aria-selected', String(next === 'draw'));
    modeEditBtn.setAttribute('aria-selected', String(next === 'edit'));
    clickPts = [];
    draggingVertex = -1;
    redraw();
  }

  function selectAtPoint(p) {
    let found = -1;
    for (let i = tris.length - 1; i >= 0; i--) {
      if (pointInTri(p, transformPoints(tris[i]))) {
        found = i; break;
      }
    }
    selected = found;
    syncUIWithSelection();
    redraw();
  }

  function syncUIWithSelection() {
    const hasSel = selected !== -1;
    dupBtn.disabled = !hasSel;
    delBtn.disabled = !hasSel;

    if (!hasSel) return;
    const t = tris[selected];
    // style
    fillInput.value   = t.style.fill;
    strokeInput.value = t.style.stroke;
    opacityInput.value= t.style.opacity;
    opacityOut.textContent = String(t.style.opacity);
    lwInput.value     = t.style.lw;
    lwOut.textContent = String(t.style.lw);

    // transforms
    scaleInput.value = t.scale;
    scaleOut.textContent = String(t.scale);
    rotInput.value = (Math.round(((t.rot % 360) + 360) % 360));
    rotOut.textContent = String(rotInput.value);
  }

  function createTriangleFromPoints(points) {
    const t = {
      id: Date.now() + Math.random(),
      base: points.map(p => ({ x: p.x, y: p.y })),
      tx: 0, ty: 0,
      scale: parseInt(scaleInput.value || '100', 10) || 100,
      rot: parseInt(rotInput.value || '0', 10) || 0,
      style: {
        fill:   fillInput.value || '#60a5fa',
        stroke: strokeInput.value || '#ffffff',
        lw:     parseFloat(lwInput.value || '2'),
        opacity: parseFloat(opacityInput.value || '0.6')
      }
    };
    return t;
  }

  // ---------- Pointer Handlers ----------
  function onTap(e) {
    const p = canvasPoint(e);

    if (mode === 'draw') {
      clickPts.push(p);
      if (clickPts.length === 3) {
        const t = createTriangleFromPoints(clickPts);
        tris.push(t);
        selected = tris.length - 1;
        clickPts = [];
        commit('Triangle added');
        syncUIWithSelection();
      }
      redraw();
      return;
    }

    // edit mode: vertex hit detection first
    if (mode === 'edit' && selected !== -1) {
      const t = tris[selected];
      const pts = transformPoints(t);
      const r = 12; // larger area for finger
      for (let i = 0; i < 3; i++) {
        if (dist(p, pts[i]) <= r) {
          draggingVertex = i;
          commit(); // commit state before modifying vertex
          return;
        }
      }
    }

    // otherwise select triangle
    selectAtPoint(p);
    if (selected !== -1) {
      // start dragging the whole triangle
      dragging = true;
      dragStart = { p, tx0: tris[selected].tx, ty0: tris[selected].ty };
    }
  }

  function onPointerMove(e) {
    if (mode !== 'edit') return;
    const p = canvasPoint(e);

    // drag vertex
    if (draggingVertex !== -1 && selected !== -1) {
      const t = tris[selected];
      // We need to update base so that transformed vertex moves to 'p'.
      // Approach: inverse of transform: map 'p' back to base-space.
      const c = centroid(t.base);
      const s = t.scale / 100;
      const a = deg2rad(t.rot);
      const cos = Math.cos(-a), sin = Math.sin(-a);
      const px = p.x - t.tx - c.x;
      const py = p.y - t.ty - c.y;
      const rx = (px * cos - py * sin) / s;
      const ry = (px * sin + py * cos) / s;
      t.base[draggingVertex] = { x: c.x + rx, y: c.y + ry };
      redraw();
      e.preventDefault();
      return;
    }

    // drag whole triangle
    if (dragging && selected !== -1) {
      const t = tris[selected];
      t.tx = dragStart.tx0 + (p.x - dragStart.p.x);
      t.ty = dragStart.ty0 + (p.y - dragStart.p.y);
      redraw();
      e.preventDefault();
    }
  }

  function onPointerEnd() {
    // finalize drags
    if (draggingVertex !== -1 || dragging) {
      commit('Edited');
    }
    draggingVertex = -1;
    dragging = false;
  }

  // ---------- Touch Gestures: Pinch (scale) + Rotate ----------
  function onTouchStart(e) {
    if (mode !== 'edit') return;
    if (e.touches.length === 2) {
      // initialize gesture if a triangle is selected under midpoint
      if (selected === -1) return;
      const p1 = touchPoint(e.touches[0]);
      const p2 = touchPoint(e.touches[1]);
      gesture = {
        ids: [e.touches[0].identifier, e.touches[1].identifier],
        p0: [p1, p2],
        dist0: dist(p1, p2),
        ang0: angleBetween(p1, p2),
        scale0: tris[selected].scale,
        rot0: tris[selected].rot
      };
      commit(); // snapshot before continuous transform
      e.preventDefault();
    }
  }

  function onTouchMove(e) {
    if (!gesture || selected === -1) return;
    const t1 = findTouchById(e.touches, gesture.ids[0]);
    const t2 = findTouchById(e.touches, gesture.ids[1]);
    if (!t1 || !t2) return;

    const p1 = touchPoint(t1);
    const p2 = touchPoint(t2);

    const d = dist(p1, p2);
    const a = angleBetween(p1, p2);

    const scaleFactor = (d / gesture.dist0);
    let newScale = clamp(Math.round(gesture.scale0 * scaleFactor), 10, 400);

    // rotation delta (degrees)
    let deltaDeg = rad2deg(a - gesture.ang0);
    // normalize small jitter
    if (!Number.isFinite(deltaDeg)) deltaDeg = 0;

    const t = tris[selected];
    t.scale = newScale;
    t.rot = (gesture.rot0 + deltaDeg);
    syncUIWithSelection();
    redraw();
    e.preventDefault();
  }

  function onTouchEnd(e) {
    if (gesture) {
      // if one of the gesture touches ended, finish gesture
      const endedIds = Array.from(e.changedTouches).map(t => t.identifier);
      if (endedIds.includes(gesture.ids[0]) || endedIds.includes(gesture.ids[1])) {
        gesture = null;
      }
    }
  }

  function touchPoint(t) {
    const rect = cvs.getBoundingClientRect();
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  function findTouchById(touchList, id) {
    for (let i = 0; i < touchList.length; i++) {
      if (touchList[i].identifier === id) return touchList[i];
    }
    return null;
  }

  // ---------- Controls wiring ----------
  function onStyleChange() {
    opacityOut.textContent = opacityInput.value;
    lwOut.textContent = lwInput.value;
    if (selected !== -1) {
      const t = tris[selected];
      t.style.fill = fillInput.value;
      t.style.stroke = strokeInput.value;
      t.style.opacity = parseFloat(opacityInput.value);
      t.style.lw = parseFloat(lwInput.value);
      redraw();
      // do not commit every tiny change; commit on pointerup/changeend below
    }
  }
  function onTransformChange() {
    scaleOut.textContent = scaleInput.value;
    rotOut.textContent = rotInput.value;
    if (selected !== -1) {
      const t = tris[selected];
      t.scale = parseInt(scaleInput.value, 10);
      t.rot   = parseInt(rotInput.value, 10);
      redraw();
    }
  }

  // pointer-up commits for sliders
  function commitOnChangeEnd(e) {
    // For keyboard users, change fires; for pointers, 'mouseup' won't trigger on input.
    // So we commit on 'change' which happens after interaction.
    if (selected !== -1) commit('Edited');
  }

  // History buttons
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  // Mode
  modeDrawBtn.addEventListener('click', () => setMode('draw'));
  modeEditBtn.addEventListener('click', () => setMode('edit'));

  // Style
  [fillInput, strokeInput, opacityInput, lwInput].forEach(inp => {
    inp.addEventListener('input', onStyleChange);
    inp.addEventListener('change', commitOnChangeEnd);
  });

  // Transform
  [scaleInput, rotInput].forEach(inp => {
    inp.addEventListener('input', onTransformChange);
    inp.addEventListener('change', commitOnChangeEnd);
  });

  // Actions
  dupBtn.addEventListener('click', () => {
    if (selected === -1) return;
    const t = tris[selected];
    const cloned = {
      id: Date.now() + Math.random(),
      base: t.base.map(p => ({ x: p.x + 8, y: p.y + 8 })), // slight offset
      tx: t.tx, ty: t.ty,
      scale: t.scale, rot: t.rot,
      style: { ...t.style }
    };
    tris.push(cloned);
    selected = tris.length - 1;
    commit('Duplicated');
    syncUIWithSelection();
    redraw();
  });

  delBtn.addEventListener('click', () => {
    if (selected === -1) return;
    tris.splice(selected, 1);
    selected = -1;
    commit('Deleted');
    syncUIWithSelection();
    redraw();
  });

  clearBtn.addEventListener('click', () => {
    if (!tris.length) return;
    tris = [];
    selected = -1;
    commit('Cleared');
    syncUIWithSelection();
    redraw();
  });

  saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'triangles.png';
    link.href = cvs.toDataURL('image/png', 1.0);
    link.click();
    toast('Saved as PNG');
  });

  // Help
  btnHelp.addEventListener('click', () => {
    if (typeof helpDialog.showModal === 'function') {
      helpDialog.showModal();
    } else {
      alert('Draw: tap 3 points.\nEdit: tap to select, drag to move, drag a dot to reshape.\nPinch to scale, twist to rotate. Sliders & colors update styles. Undo/Redo supported.');
    }
  });

  // Close dialog with Esc / overlay handled by browser

  // ---------- Canvas Events ----------
  // mouse
  cvs.addEventListener('mousedown', e => {
    if (mode === 'draw') return; // handled on click
    // For edit mode: start drag if selection under point
    const p = canvasPoint(e);
    if (mode === 'edit') {
      // try to select/vertex
      // mimic tap logic:
      // vertex check
      if (selected !== -1) {
        const pts = transformPoints(tris[selected]);
        const r = 10;
        for (let i = 0; i < 3; i++) {
          if (dist(p, pts[i]) <= r) {
            draggingVertex = i;
            commit();
            return;
          }
        }
      }
      selectAtPoint(p);
      if (selected !== -1) {
        dragging = true;
        dragStart = { p, tx0: tris[selected].tx, ty0: tris[selected].ty };
      }
    }
  });
  cvs.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerEnd);

  // clicks (for both modes)
  cvs.addEventListener('click', onTap);

  // touch
  cvs.addEventListener('touchstart', e => {
    if (mode === 'draw' && e.touches.length === 1) {
      // allow tap in draw mode; wait for touchend to synthesize click
    } else {
      // edit interactions
      const p = canvasPoint(e);
      if (mode === 'edit') {
        // vertex hit?
        if (selected !== -1) {
          const pts = transformPoints(tris[selected]);
          const r = 16;
          for (let i = 0; i < 3; i++) {
            if (dist(p, pts[i]) <= r) {
              draggingVertex = i;
              commit();
              break;
            }
          }
        }
        if (draggingVertex === -1) {
          selectAtPoint(p);
          if (selected !== -1 && e.touches.length === 1) {
            dragging = true;
            dragStart = { p, tx0: tris[selected].tx, ty0: tris[selected].ty };
          }
        }
      }
      onTouchStart(e);
    }
  }, { passive: false });

  cvs.addEventListener('touchmove', e => {
    if (gesture) {
      onTouchMove(e);
      return;
    }
    onPointerMove(e);
  }, { passive: false });

  cvs.addEventListener('touchend', e => {
    // synthesize a click for draw taps (when not dragging)
    if (mode === 'draw' && e.changedTouches.length === 1 && !dragging && draggingVertex === -1 && !gesture) {
      const t = e.changedTouches[0];
      const rect = cvs.getBoundingClientRect();
      const fake = new MouseEvent('click', { clientX: t.clientX, clientY: t.clientY });
      cvs.dispatchEvent(fake);
    }
    onTouchEnd(e);
    onPointerEnd(e);
  });

  // ---------- Init ----------
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('orientationchange', resizeCanvas);

  // default UI numbers
  opacityOut.textContent = opacityInput.value;
  lwOut.textContent = lwInput.value;
  scaleOut.textContent = scaleInput.value;
  rotOut.textContent = rotInput.value;
  modeDrawBtn.setAttribute('aria-selected', 'true');
  modeEditBtn.setAttribute('aria-selected', 'false');
  updateHistoryButtons();

  resizeCanvas();
  redraw();

  // Small starter hint
  setTimeout(() => toast('Draw mode: tap 3 points'), 400);
})();
