// app.js
// Multi mini-editors: JSON timeline + optional video + seek + play/pause toggle
// Shows ONLY read-only textarea while playing, ONLY editable while paused.

// ===================== CONFIG: autoload map =====================
// Each entry: [ recordingJsonUrl, nodeIndex (1-based in .menu_editor list), optionalVideoUrl ]
const AUTO_MAP = [
   ["recording1.json", 2, "video5.mp4"],
  ["recording2.json", 1, "video6.mp4"],
];

// ===================== Utilities =====================
const fmtTime = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

// Turn {line,ch} into offset in a string
function posToOffset(text, pos) {
  const lines = text.split("\n");
  let off = 0;
  const L = Math.max(0, Math.min((pos?.line ?? 0), lines.length - 1));
  for (let i = 0; i < L; i++) off += lines[i].length + 1;
  const ch = Math.max(0, Math.min((pos?.ch ?? 0), (lines[L] || "").length));
  return off + ch;
}
// Apply CodeMirror-style change to plain string
function applyChangeToText(text, chg) {
  const from = posToOffset(text, chg?.from || { line: 0, ch: 0 });
  const to = posToOffset(text, chg?.to || { line: 0, ch: 0 });
  const ins = (chg?.text || []).join("\n");
  return text.slice(0, from) + ins + text.slice(to);
}

// ===================== Player factory =====================
function createMiniPlayer(root) {
  // Elements inside this editor block (support both class-based and id-based markup)
  const btnLoad   = root.querySelector(".btnLoad")   || root.querySelector("#btnLoad");
  const fileJson  = root.querySelector(".fileJson")  || root.querySelector("#fileJson");
  const btnToggle = root.querySelector(".btnToggle") || root.querySelector("#btnToggle")
                  || null; // if null, we’ll try separate play/pause buttons
  const btnPlay   = root.querySelector(".btnPlay")   || root.querySelector("#btnPlay");
  const btnPause  = root.querySelector(".btnPause")  || root.querySelector("#btnPause");
  const btnReset  = root.querySelector(".btnReset")  || root.querySelector("#btnReset");

  const seek      = root.querySelector(".seek");
  const timeLabel = root.querySelector(".timeLabel");
  const statusEl  = root.querySelector(".status") || root.querySelector("#status");

  const video     = root.querySelector(".editorVideo") || root.querySelector("video");

  const roWrap    = root.querySelector(".roWrap")   || root.querySelector("#roWrap");
  const editWrap  = root.querySelector(".editWrap") || root.querySelector("#editWrap");
  const txtRO     = root.querySelector(".txtReadonly") || root.querySelector("#txtReadonly");
  const txtEdit   = root.querySelector(".txtEdit")     || root.querySelector("#txtEdit");
  const frame     = root.querySelector(".outputFrame") || root.querySelector("#outputFrame");

  // State
  let events      = [];       // [{time, change:{...}}]
  let initial     = "";
  let durationMs  = 0;        // overall timeline length (max of video/timeline)
  let appliedIdx  = 0;        // next event index to apply
  let appliedTime = 0;        // last applied time in ms
  let topCode     = "";       // canonical (readonly)
  let playing     = false;
  let rafId       = null;     // synthetic clock when no video
  let offsetMs    = 0;        // base for synthetic clock
  let startTs     = 0;

  // Helpers
  const setStatus = (m) => { if (statusEl) statusEl.textContent = m || ""; };
  const showRO = () => { if (roWrap) roWrap.style.display = ""; if (editWrap) editWrap.style.display = "none"; };
  const showED = () => { if (roWrap) roWrap.style.display = "none"; if (editWrap) editWrap.style.display = ""; };
  const render = (src) => { if (frame) frame.srcdoc = src || ""; };

  function recalcDuration() {
    const lastEventTime = events.length ? (events[events.length - 1].time || 0) : 0;
    const vidMs = (video && isFinite(video.duration)) ? (video.duration * 1000) : 0;
    durationMs = Math.max(vidMs, lastEventTime);
    if (seek) {
      seek.max = String(durationMs || lastEventTime || 0);
      seek.step = seek.step || "50"; // 50ms default
      if (!seek.value) seek.value = "0";
    }
    updateTimeLabel(seek?.value || "0");
  }

  function updateTimeLabel(v) {
    if (!timeLabel || !seek) return;
    const cur = Number(v || 0);
    const total = Number(seek.max || 0);
    timeLabel.textContent = `${fmtTime(cur)} / ${fmtTime(total)}`;
  }

  function resetEditorsEmpty() {
    if (txtRO) txtRO.value = "";
    if (txtEdit) txtEdit.value = "";
    render("");
    showED();
    appliedIdx = 0;
    appliedTime = 0;
    topCode = "";
    if (seek) { seek.value = "0"; updateTimeLabel(seek.value); }
    if (btnToggle) btnToggle.textContent = "▶ Play";
    if (btnPlay && btnPause) { btnPlay.disabled = false; btnPause.disabled = true; }
  }

  function applyForwardUntil(targetMs) {
    // If seeking backwards, rebuild from scratch
    if (targetMs < appliedTime - 1) {
      appliedIdx = 0;
      appliedTime = 0;
      topCode = initial || "";
    }
    // Apply forward from current appliedIdx up to targetMs
    while (appliedIdx < events.length && (events[appliedIdx].time || 0) <= targetMs) {
      topCode = applyChangeToText(topCode, events[appliedIdx].change || {});
      appliedIdx++;
    }
    appliedTime = targetMs;
    if (txtRO) txtRO.value = topCode;
  }

  function syncPreview() {
    if (!frame) return;
    if (playing) render(txtRO?.value || "");
    else         render(txtEdit?.value || "");
  }

  // --- Playback control ---
  function play() {
    if (!events.length) {
      setStatus("Load a JSON recording first.");
      alert("Load a JSON recording first.");
      return;
    }
    if (playing) return;
    playing = true;
    if (btnToggle) btnToggle.textContent = "❚❚ Pause";
    if (btnPlay && btnPause) { btnPlay.disabled = true; btnPause.disabled = false; }

    // Align to current seek time
    const targetMs = Number(seek?.value || 0);
    applyForwardUntil(targetMs);
    if (txtEdit && txtRO) txtEdit.value = txtRO.value; // sync once (no branching)
    showRO(); // only read-only while playing
    syncPreview();
    setStatus(`Playing… (${appliedIdx}/${events.length})`);

    if (video && isFinite(video.duration)) {
      video.currentTime = targetMs / 1000;
      video.play();
    } else {
      // Synthetic clock via RAF
      offsetMs = targetMs;
      startTs = performance.now();
      const tick = () => {
        const now = performance.now();
        const cur = offsetMs + (now - startTs);
        const capped = Math.min(cur, durationMs);
        if (seek) {
          seek.value = String(capped);
          updateTimeLabel(seek.value);
        }
        applyForwardUntil(capped);
        syncPreview();
        if (playing && capped < durationMs) {
          rafId = requestAnimationFrame(tick);
        } else {
          pause(true); // silent pause at end
        }
      };
      rafId = requestAnimationFrame(tick);
    }
  }

  function pause(silent = false) {
    if (!playing && !silent) {
      // Even if already paused, keep UX consistent
      if (txtEdit && txtRO) txtEdit.value = txtRO.value;
      showED(); // only editable while paused
      syncPreview();
      setStatus("Paused.");
      return;
    }
    playing = false;
    if (btnToggle) btnToggle.textContent = "▶ Play";
    if (btnPlay && btnPause) { btnPlay.disabled = false; btnPause.disabled = true; }
    if (video) video.pause();
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    // On pause: show editable, sync once, preview from editable
    if (txtEdit && txtRO) txtEdit.value = txtRO.value;
    showED();
    syncPreview();
    if (!silent) setStatus("Paused.");
  }

  function resetKeepJson() {
    if (video) { video.pause(); video.currentTime = 0; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    playing = false;
    appliedIdx = 0;
    appliedTime = 0;
    topCode = "";
    if (txtRO) txtRO.value = "";
    if (txtEdit) txtEdit.value = "";
    if (seek) { seek.value = "0"; updateTimeLabel(seek.value); }
    showED();
    render("");
    if (btnToggle) btnToggle.textContent = "▶ Play";
    if (btnPlay && btnPause) { btnPlay.disabled = false; btnPause.disabled = true; }
    setStatus(events.length ? "Reset. JSON loaded; press Play to start." : "Reset. No JSON loaded.");
  }

  // --- Seek handling ---
  function seekTo(ms) {
    const max = Number(seek?.max || 0);
    ms = Math.max(0, Math.min(ms, max));
    if (seek) {
      seek.value = String(ms);
      updateTimeLabel(seek.value);
    }
    if (video && isFinite(video.duration)) {
      video.currentTime = ms / 1000;
    }
    applyForwardUntil(ms);
    if (!playing && txtEdit && txtRO) {
      // while paused, keep editable equal to latest top
      txtEdit.value = txtRO.value;
    }
    syncPreview();
  }

  // --- JSON loading ---
  function loadData(data) {
    if (Array.isArray(data)) {
      events = data; initial = "";
    } else if (data && Array.isArray(data.events)) {
      events = data.events; initial = data.initial || "";
    } else {
      throw new Error("Unsupported JSON format.");
    }
    appliedIdx = 0; appliedTime = 0; topCode = initial || "";
    if (txtRO) txtRO.value = "";
    if (txtEdit) txtEdit.value = "";
    render("");
    showED(); // start paused view
    recalcDuration();
    setStatus(`Loaded ${events.length} events. Press Play.`);
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // --- Wire UI ---
  if (btnLoad && fileJson) {
    btnLoad.addEventListener("click", () => fileJson.click());
    fileJson.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          loadData(data);
        } catch (err) {
          console.error(err);
          alert("Invalid JSON file.");
          setStatus("Invalid JSON file.");
        }
      };
      reader.readAsText(f);
      e.target.value = ""; // allow reselect same file later
    });
  }

  if (btnToggle) {
    btnToggle.addEventListener("click", () => (playing ? pause() : play()));
  } else if (btnPlay && btnPause) {
    btnPlay.addEventListener("click", play);
    btnPause.addEventListener("click", () => pause());
    // initial disable pause
    btnPause.disabled = true;
  }

  if (btnReset) btnReset.addEventListener("click", resetKeepJson);

  if (seek) {
    seek.addEventListener("input", (e) => {
      const v = Number(e.target.value || 0);
      seekTo(v);
    });
  }

  if (video) {
    // Update duration when metadata available
    video.addEventListener("loadedmetadata", () => {
      recalcDuration();
    });
    // Keep slider in sync with video while playing
    video.addEventListener("timeupdate", () => {
      if (!isFinite(video.duration)) return;
      const ms = video.currentTime * 1000;
      if (playing && seek) {
        seek.value = String(ms);
        updateTimeLabel(seek.value);
        applyForwardUntil(ms);
        syncPreview();
      }
    });
    video.addEventListener("ended", () => {
      pause(true); // silent pause at end
      seekTo(durationMs);
    });
  }

  // Editable textarea live preview while paused
  if (txtEdit) {
    txtEdit.addEventListener("input", () => {
      if (!playing) render(txtEdit.value);
    });
  }

  // Initial state
  resetEditorsEmpty();

  // Public API for autoloaders
  return {
    loadFromUrl: async (url) => {
      try {
        const data = await fetchJson(url);
        loadData(data);
      } catch (err) {
        setStatus(`Auto-load failed (${err.message}). Use “Load JSON…”.`);
      }
    },
    setVideoSrc: (src) => { if (video && src) { video.src = src; } },
    seekTo,
  };
}

// ===================== Boot =====================
document.addEventListener("DOMContentLoaded", () => {
  const editors = Array.from(document.querySelectorAll(".menu_editor")).map((el) =>
    createMiniPlayer(el)
  );

  // Apply AUTO_MAP autoloads
  for (const entry of AUTO_MAP) {
    const [recSrc, nodeIndex, vidSrc] = entry;
    const idx = Number(nodeIndex) - 1;
    if (!editors[idx]) continue;
    if (vidSrc) editors[idx].setVideoSrc(vidSrc);
    editors[idx].loadFromUrl(recSrc);
  }

  // Optional: URL params ?src1=...&video1=...&src2=...
  const p = new URLSearchParams(location.search);
  editors.forEach((player, i) => {
    const k = i + 1;
    const src  = p.get(`src${k}`);
    const video = p.get(`video${k}`);
    if (video) player.setVideoSrc(video);
    if (src) player.loadFromUrl(src);
  });
});
