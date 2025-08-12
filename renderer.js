// renderer.js — game logic and UI glue
// Uses window.electronAPI for saving/loading (exposed by preload.js)

(() => {
  // ---------- Game state and defaults ----------
  const DEFAULT_STATE = {
    bytes: 0,
    bps: 0,
    clickValue: 1,
    upgrades: {
      // id: {level, baseCost, costMultiplier, value}
      "auto-1": { level: 0, baseCost: 10, costMultiplier: 1.6, value: 0.5 }, // bytes per second per level
      "auto-2": { level: 0, baseCost: 150, costMultiplier: 1.7, value: 3 },
      "click-1": { level: 0, baseCost: 50, costMultiplier: 1.5, value: 1 } // increases clickValue
    },
    prestigePoints: 0,
    totalBytesEarned: 0,
    ticks: 0,
    lastTick: Date.now()
  };

  let state = structuredClone(DEFAULT_STATE);

  // ---------- Helpers ----------
  const fmt = (v) => {
    // compact formatting for large numbers
    if (v < 1000) return Math.floor(v).toString();
    const units = ["K","M","B","T","Qa","Qi"];
    let u = 0;
    let n = v;
    while (n >= 1000 && u < units.length-1) { n /= 1000; u++; }
    return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + units[u];
  };

  function computeBPS() {
    // Recompute bytes-per-second from upgrades and prestige bonus
    let base = 0;
    for (const [id, up] of Object.entries(state.upgrades)) {
      if (id.startsWith("auto")) {
        base += up.level * up.value;
      }
    }
    const prestigeMultiplier = 1 + state.prestigePoints * 0.10;
    const total = base * prestigeMultiplier;
    state.bps = total;
    return total;
  }

  function upgradeCost(up) {
    // cost = baseCost * (costMultiplier ^ level)
    return Math.floor(up.baseCost * Math.pow(up.costMultiplier, up.level));
  }

  // ---------- UI references ----------
  const el = {
    bytes: document.getElementById('bytes'),
    bps: document.getElementById('bps'),
    tap: document.getElementById('tap'),
    upgrades: document.getElementById('upgrades'),
    prestigeBtn: document.getElementById('prestigeBtn'),
    prestigePts: document.getElementById('prestigePts'),
    log: document.getElementById('log'),
    fps: document.getElementById('fps'),
    btnSave: document.getElementById('btn-save'),
    btnLoad: document.getElementById('btn-load'),
    btnExport: document.getElementById('btn-export'),
    btnImport: document.getElementById('btn-import')
  };

  // ---------- UI render ----------
  function render() {
    el.bytes.textContent = fmt(state.bytes);
    el.bps.textContent = fmt(state.bps) + '/s';
    el.prestigePts.textContent = state.prestigePoints;

    renderUpgrades();
  }

  function log(msg) {
    const now = new Date().toLocaleTimeString();
    el.log.textContent = `[${now}] ${msg}`;
  }

  function renderUpgrades() {
    el.upgrades.innerHTML = '';
    for (const [id, up] of Object.entries(state.upgrades)) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      const left = document.createElement('div');
      left.className = 'left';
      const title = document.createElement('div');
      title.textContent = id;
      title.style.fontWeight = '700';
      const desc = document.createElement('div');
      desc.className = 'cost';
      if (id.startsWith('auto')) {
        desc.textContent = `Produces ${up.value} bytes/s each. Level ${up.level}`;
      } else {
        desc.textContent = `Increases click by ${up.value}. Level ${up.level}`;
      }
      left.appendChild(title);
      left.appendChild(desc);

      const right = document.createElement('div');
      const cost = upgradeCost(up);
      const btn = document.createElement('button');
      btn.textContent = `Buy (${fmt(cost)})`;
      btn.disabled = state.bytes < cost;
      btn.onclick = () => {
        if (state.bytes >= cost) {
          state.bytes -= cost;
          up.level += 1;
          // if it's click upgrade, add to clickValue
          if (id === 'click-1') {
            state.clickValue += up.value;
          }
          computeBPS();
          render();
          log(`Purchased ${id} → level ${up.level}`);
        }
      };
      right.appendChild(btn);

      card.appendChild(left);
      card.appendChild(right);
      el.upgrades.appendChild(card);
    }
  }

  // ---------- Tick loop ----------
  let lastFrame = performance.now();
  let frames = 0;
  let fpsTimer = performance.now();

  function gameTick(dtSeconds) {
    // dtSeconds is time since last tick in seconds
    // Add automatic bytes
    const gain = state.bps * dtSeconds;
    state.bytes += gain;
    state.totalBytesEarned += gain;
    state.ticks++;
  }

  // Main loop (uses requestAnimationFrame for UI responsiveness)
  let last = performance.now();
  function loop(now = performance.now()) {
    const dtMs = now - last;
    last = now;

    // cap dt to avoid huge jumps on sleep/resume
    const dt = Math.min(dtMs / 1000, 0.5);
    gameTick(dt);

    // update FPS display every second
    frames++;
    if (now - fpsTimer >= 1000) {
      el.fps.textContent = `FPS: ${frames}`;
      frames = 0;
      fpsTimer = now;
    }

    render();
    requestAnimationFrame(loop);
  }

  // ---------- Input ----------
  el.tap.addEventListener('click', () => {
    state.bytes += state.clickValue;
    state.totalBytesEarned += state.clickValue;
    log(`Clicked +${state.clickValue} bytes`);
    render();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      el.tap.click();
    }
    // quick-save: Ctrl/Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveToDisk();
    }
  });

  // ---------- Prestige ----------
  el.prestigeBtn.addEventListener('click', () => {
    // Example: award prestige points based on totalBytesEarned
    const points = Math.floor(Math.pow(state.totalBytesEarned / 10000, 1/3)); // tunable formula
    if (points > state.prestigePoints) {
      // allow prestige only if it increases count
      state.prestigePoints = points;
      // reset many things (but keep prestige points)
      const preserved = { prestigePoints: state.prestigePoints };
      state = structuredClone(DEFAULT_STATE);
      state.prestigePoints = preserved.prestigePoints;
      computeBPS();
      render();
      log(`Prestiged! You now have ${state.prestigePoints} points.`);
    } else {
      log('Not enough total earning for more prestige points yet.');
    }
  });

  // ---------- Save / Load ----------
  async function saveToDisk() {
    // Prepare minimal save
    const save = {
      bytes: state.bytes,
      clickValue: state.clickValue,
      upgrades: state.upgrades,
      prestigePoints: state.prestigePoints,
      totalBytesEarned: state.totalBytesEarned,
      ticks: state.ticks,
      savedAt: new Date().toISOString()
    };
    try {
      const res = await window.electronAPI.saveToDisk(save);
      if (res.success) {
        log('Saved to disk.');
      } else {
        log('Save failed: ' + res.error);
      }
    } catch (err) {
      log('Save error: ' + String(err));
    }
  }

  async function loadFromDisk() {
    try {
      const res = await window.electronAPI.loadFromDisk();
      if (!res.success) {
        log('Load: ' + res.error);
        return;
      }
      const s = res.data;
      // Basic compatibility checks
      state.bytes = s.bytes ?? state.bytes;
      state.clickValue = s.clickValue ?? state.clickValue;
      state.upgrades = s.upgrades ?? state.upgrades;
      state.prestigePoints = s.prestigePoints ?? state.prestigePoints;
      state.totalBytesEarned = s.totalBytesEarned ?? state.totalBytesEarned;
      computeBPS();
      render();
      log('Loaded save from disk.');
    } catch (err) {
      log('Load error: ' + String(err));
    }
  }

  el.btnSave.addEventListener('click', saveToDisk);
  el.btnLoad.addEventListener('click', loadFromDisk);

  // Export / Import (string)
  el.btnExport.addEventListener('click', async () => {
    const save = {
      bytes: state.bytes,
      clickValue: state.clickValue,
      upgrades: state.upgrades,
      prestigePoints: state.prestigePoints,
      totalBytesEarned: state.totalBytesEarned,
      ticks: state.ticks,
      exportedAt: new Date().toISOString()
    };
    const res = await window.electronAPI.exportSave(save);
    if (res.success) {
      // show the save string in a prompt so user can copy
      const win = window.open("", "_blank", "width=600,height=400");
      if (win) {
        win.document.write(`<pre style="white-space:pre-wrap;word-break:break-all;padding:10px;">${res.text}</pre>`);
      } else {
        alert(res.text);
      }
      log('Exported save (opened in new window).');
    } else {
      log('Export failed: ' + res.error);
    }
  });

  el.btnImport.addEventListener('click', async () => {
    const text = prompt('Paste save JSON here:');
    if (!text) return;
    const res = await window.electronAPI.importSave(text);
    if (res.success) {
      log('Imported save — reloading from disk');
      await loadFromDisk();
    } else {
      log('Import failed: ' + res.error);
    }
  });

  // ---------- Autosave ----------
  let autosaveInterval = 20000; // 20 seconds
  setInterval(() => {
    saveToDisk().catch(()=>{});
  }, autosaveInterval);

  // ---------- Init ----------
  computeBPS();
  render();
  loop();

  // Try to auto-load existing save on start
  loadFromDisk().catch(()=>{});
})();
