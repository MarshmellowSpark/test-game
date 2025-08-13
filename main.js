/* Quantum Forge — browser incremental
   - Generators (5 tiers), scaling costs
   - Upgrades (click power, generator boosts, global multi)
   - Research (RP over time → unlocks, multipliers)
   - Achievements (grant small mults)
   - Challenges (temporary modifiers)
   - Prestige/Ascend (Shards) with permanent global mult
   - Autosave + Offline progress + Export/Import
*/
(() => {
  // ---------- Utility ----------
  const $ = (id) => document.getElementById(id);
  const fmt = (v) => {
    if (!isFinite(v)) return "∞";
    const a = Math.abs(v);
    if (a < 1000) return Math.floor(v).toString();
    const units = ["K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc"];
    let u=0, n=v;
    while (Math.abs(n) >= 1000 && u < units.length-1){ n/=1000; u++; }
    const p = Math.abs(n) < 10 ? 2 : Math.abs(n) < 100 ? 1 : 0;
    return n.toFixed(p)+units[u];
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ---------- Definitions ----------
  const GEN_DEFS = [
    { id:"gen1", name:"Spark Miner",    baseCost: 10,    costMult: 1.15, baseEPS: 0.1 },
    { id:"gen2", name:"Coil Array",     baseCost: 100,   costMult: 1.17, baseEPS: 1.0 },
    { id:"gen3", name:"Fusion Vat",     baseCost: 1_500, costMult: 1.20, baseEPS: 8.0 },
    { id:"gen4", name:"Quantum Lattice",baseCost: 25_000,costMult: 1.22, baseEPS: 55.0},
    { id:"gen5", name:"Dimensional Core",baseCost: 400_000,costMult:1.25,baseEPS: 380.0}
  ];

  const UPG_DEFS = [
    { id:"click1", name:"+1 Click Power", desc:"+1 energy per click", cost: 50,  apply:s=>s.clickPower+=1 },
    { id:"click2", name:"Charged Clicks", desc:"Clicks scale with Shards", cost: 2_000, apply:s=>s.clickShardScale=true },
    { id:"auto1",  name:"Greased Gears", desc:"+20% all generator output", cost: 1_500, apply:s=>s.multAuto*=1.2 },
    { id:"global1",name:"Flux Condenser", desc:"+15% global multiplier", cost: 5_000, apply:s=>s.multGlobal*=1.15 },
    { id:"gen3b",  name:"Fusion Bonus", desc:"Fusion Vats +50% EPS", cost: 8_000, apply:s=>s.specificMult.gen3*=1.5 },
    { id:"eff1",   name:"Bulk Efficiency", desc:"-4% generator cost growth", cost: 12_500, apply:s=>s.costGrowth*=0.96 },
  ];

  const RES_DEFS = [
    { id:"rp1", name:"Lab Funding", costRP: 10,   desc:"+10% RP generation", effect:s=>s.rpRate*=1.1 },
    { id:"rp2", name:"Cryo Storage",costRP: 35,   desc:"+25% offline gain",  effect:s=>s.offlineGain*=1.25 },
    { id:"rp3", name:"Meta Theory", costRP: 65,   desc:"+20% global mult",    effect:s=>s.multGlobal*=1.20 },
    { id:"rp4", name:"Dim Analysis",costRP: 120,  desc:"Generators +10% EPS", effect:s=>s.multAuto*=1.10 },
  ];

  const CHALLENGES = [
    { id:"c1", name:"Friction", desc:"Generator output -50%", active:false,
      start:s=>{s.chal="c1";}, end:s=>{s.chal=null;}, mult:s=>0.5 },
    { id:"c2", name:"Taxation", desc:"Costs x1.5", active:false,
      start:s=>{s.chal="c2";}, end:s=>{s.chal=null;}, cost:s=>1.5 },
    { id:"c3", name:"Silence", desc:"Clicks disabled, +30% EPS", active:false,
      start:s=>{s.chal="c3";}, end:s=>{s.chal=null;}, clickOff:true, epsBoost:s=>1.3 }
  ];

  const ACH_DEFS = [
    { id:"a1", name:"First Spark", cond:s=>s.totalEnergy >= 100, bonus:s=>s.achMult*=1.02 },
    { id:"a2", name:"Thousandfold", cond:s=>s.totalEnergy >= 1000, bonus:s=>s.achMult*=1.02 },
    { id:"a3", name:"Millionaire", cond:s=>s.totalEnergy >= 1e6, bonus:s=>s.achMult*=1.03 },
    { id:"a4", name:"Clicky", cond:s=>s.clicks >= 500, bonus:s=>s.achMult*=1.02 },
    { id:"a5", name:"Researcher", cond:s=>s.researchPurchased >= 3, bonus:s=>s.achMult*=1.03 },
  ];

  // ---------- State ----------
  const DEFAULT = {
    energy: 0, totalEnergy: 0,
    shards: 0, // prestige currency
    rp: 0, rpRate: 0.05, // research points / sec
    clickPower: 1, clickShardScale: false,
    multAuto: 1, multGlobal: 1, achMult: 1, specificMult: { gen3: 1 },
    costGrowth: 1, // research/upgrade that reduces cost growth
    offlineGain: 1, // multiplier on offline
    gens: GEN_DEFS.map(g => ({ id:g.id, owned:0 })),
    upgradesBought: {},
    researchBought: {},
    achievements: {},
    activeChallenge: null,
    chal: null, // internal flag
    clicks: 0, researchPurchased: 0,
    lastTime: Date.now(),
    settings: { autosave: true, notifs: true, theme: "dark" },
    version: 1
  };
  let S = load() || structuredClone(DEFAULT);

  // ---------- DOM ----------
  const el = {
    energy: $("energy"), eps: $("eps"), total: $("totalEnergy"), mult: $("mult"),
    shards: $("shards"), rp: $("rp"), clickVal: $("clickVal"),
    bigBtn: $("bigBtn"), genWrap: $("generators"),
    upList: $("upgradesList"), resList: $("researchList"),
    chalList: $("challengesList"), achList: $("achievementsList"),
    activeChal: $("activeChallenge"),
    nextShards: $("nextShards"), ascendBtn: $("ascendBtn"),
    saveBtn: $("saveBtn"), exportBtn: $("exportBtn"), importBtn: $("importBtn"),
    autosave: $("autosaveToggle"), notifs: $("notifsToggle"),
    hardReset: $("hardResetBtn"), tickInfo: $("tickInfo"),
    tabs: $("tabs"), themeSel: $("themeSel"), log: $("log")
  };

  // ---------- UI Builders ----------
  function makeGenCard(def, idx){
    const c = document.createElement("div"); c.className="card";
    c.innerHTML = `
      <h3>${def.name}</h3>
      <div class="tag small">Base: ${def.baseEPS}/s</div>
      <div class="statline small"><span>Owned</span><span id="${def.id}-owned">0</span></div>
      <div class="statline small"><span>EPS</span><span id="${def.id}-eps">0</span></div>
      <div class="statline small"><span>Cost</span><span id="${def.id}-cost">0</span></div>
      <div class="statline">
        <button data-id="${def.id}" data-buy="1">Buy 1 [${idx+1}]</button>
        <button data-id="${def.id}" data-buy="10">×10 [Shift+${idx+1}]</button>
        <button data-id="${def.id}" data-buy="max">Max [Ctrl+${idx+1}]</button>
      </div>`;
    return c;
  }

  function rebuildGenerators(){
    el.genWrap.innerHTML = "";
    GEN_DEFS.forEach((g, i) => el.genWrap.appendChild(makeGenCard(g, i)));
    el.genWrap.addEventListener("click", (e)=>{
      const b = e.target.closest("button"); if(!b) return;
      buyGenerator(b.dataset.id, b.dataset.buy);
    });
  }

  function rebuildUpgrades(){
    el.upList.innerHTML = "";
    UPG_DEFS.forEach(u=>{
      const owned = !!S.upgradesBought[u.id];
      const card = document.createElement("div"); card.className="card";
      card.innerHTML = `
        <h3>${u.name}</h3>
        <div class="small">${u.desc}</div>
        <div class="statline"><span>Cost</span><span>${fmt(u.cost)} ⚡</span></div>
        <button id="up-${u.id}" ${owned?"disabled":""}>${owned?"Purchased":"Buy"}</button>
      `;
      card.querySelector("button").onclick = () => {
        if (S.energy >= u.cost && !S.upgradesBought[u.id]){
          S.energy -= u.cost; u.apply(S); S.upgradesBought[u.id] = true;
          log(`Purchased upgrade: ${u.name}`);
          renderAll();
        }
      };
      el.upList.appendChild(card);
    });
  }

  function rebuildResearch(){
    el.resList.innerHTML = "";
    RES_DEFS.forEach(r=>{
      const owned = !!S.researchBought[r.id];
      const card = document.createElement("div"); card.className="card";
      card.innerHTML = `
        <h3>${r.name}</h3>
        <div class="small">${r.desc}</div>
        <div class="statline"><span>Cost</span><span>${fmt(r.costRP)} RP</span></div>
        <button id="rs-${r.id}" ${owned?"disabled":""}>${owned?"Completed":"Research"}</button>
      `;
      card.querySelector("button").onclick = () => {
        if (S.rp >= r.costRP && !S.researchBought[r.id]){
          S.rp -= r.costRP; r.effect(S); S.researchBought[r.id]=true; S.researchPurchased++;
          popup(`Research completed: ${r.name}`);
          renderAll();
        }
      };
      el.resList.appendChild(card);
    });
  }

  function rebuildChallenges(){
    el.chalList.innerHTML = "";
    CHALLENGES.forEach(ch=>{
      const card = document.createElement("div"); card.className="card";
      const active = S.activeChallenge===ch.id;
      card.innerHTML = `
        <h3>${ch.name}</h3>
        <div class="small">${ch.desc}</div>
        <div class="statline">
          <button>${active?"Stop":"Start"}</button>
        </div>`;
      card.querySelector("button").onclick = ()=>{
        if (active){ ch.end(S); S.activeChallenge=null; popup(`Exited challenge: ${ch.name}`); }
        else { // stop any current
          const cur = CHALLENGES.find(x=>x.id===S.activeChallenge);
          if (cur) cur.end(S);
          ch.start(S); S.activeChallenge=ch.id; popup(`Entered challenge: ${ch.name}`);
        }
        renderAll();
      };
      el.chalList.appendChild(card);
    });
  }

  function rebuildAchievements(){
    el.achList.innerHTML = "";
    ACH_DEFS.forEach(a=>{
      const done = !!S.achievements[a.id];
      const card = document.createElement("div"); card.className=`ach ${done?"done":""}`;
      card.innerHTML = `<div><b>${a.name}</b></div><div class="small">${done?"✓ Completed":"—"}</div>`;
      el.achList.appendChild(card);
    });
  }

  // ---------- Game math ----------
  function genCost(def, owned){
    const chalMult = (S.activeChallenge==="c2") ? 1.5 : 1;
    const growth = def.costMult * S.costGrowth;
    return Math.ceil(def.baseCost * Math.pow(growth, owned)) * chalMult;
  }
  function genEPS(def){
    let m = def.baseEPS * S.multAuto * S.multGlobal * S.achMult;
    if (def.id==="gen3") m *= S.specificMult.gen3;
    if (S.activeChallenge==="c1") m *= 0.5;
    if (S.activeChallenge==="c3") m *= 1.3;
    return m;
  }
  function totalEPS(){
    let eps = 0;
    GEN_DEFS.forEach((d,i)=>{
      const owned = S.gens[i].owned;
      eps += owned * genEPS(d);
    });
    return eps;
  }
  function clickValue(){
    const base = S.clickPower;
    const shardBonus = S.clickShardScale ? (1 + Math.log10(1+S.shards)) : 1;
    return base * shardBonus * S.multGlobal * S.achMult * (S.activeChallenge==="c3" ? 0 : 1);
  }
  function shardsOnAscend(){
    return Math.floor(Math.pow(S.totalEnergy/1e6, 0.5));
  }

  // ---------- Actions ----------
  function buyGenerator(genId, amount){
    const idx = GEN_DEFS.findIndex(g=>g.id===genId);
    const d = GEN_DEFS[idx]; const g = S.gens[idx];

    let target = 0;
    if (amount==="max"){
      // naive max calc: buy 1 repeatedly (efficient enough for scale here)
      while (true){
        const cost = genCost(d, g.owned + target);
        if (S.energy >= cost) { S.energy -= cost; target++; }
        else break;
        if (target > 1e6) break;
      }
    } else {
      target = Number(amount);
      for (let i=0;i<target;i++){
        const cost = genCost(d, g.owned);
        if (S.energy >= cost){ S.energy -= cost; g.owned++; }
        else break;
      }
      return;
    }
    g.owned += target;
  }

  // ---------- Loop & offline ----------
  let lastFrame = performance.now(), frames = 0, fpsTimer = performance.now();
  function tick(dt){
    // Resource production
    const eps = totalEPS();
    const gain = eps * dt;
    S.energy += gain;
    S.totalEnergy += gain;

    // Research points
    S.rp += S.rpRate * dt;

    // Achievements (check thresholds sparsely)
    ACH_DEFS.forEach(a=>{
      if (!S.achievements[a.id] && a.cond(S)){
        S.achievements[a.id]=true; a.bonus(S);
        popup(`Achievement unlocked: ${a.name}`);
      }
    });
  }
  function mainLoop(now=performance.now()){
    const dt = clamp((now - lastFrame) / 1000, 0, 0.5);
    tick(dt); lastFrame = now;

    frames++; if (now - fpsTimer >= 1000){
      el.tickInfo.textContent = `FPS ${frames} • EPS ${fmt(totalEPS())}/s`;
      frames = 0; fpsTimer = now;
    }
    renderMain();
    requestAnimationFrame(mainLoop);
  }

  function applyOffline(){
    const now = Date.now();
    const elapsed = Math.max(0, (now - S.lastTime)/1000);
    if (elapsed > 3){
      const eps = totalEPS();
      const offGain = eps * elapsed * S.offlineGain * 0.5; // 50% efficiency baseline
      S.energy += offGain; S.totalEnergy += offGain;
      S.rp += S.rpRate * elapsed;
      popup(`Offline gains: +${fmt(offGain)} ⚡, +${fmt(S.rpRate*elapsed)} RP`);
    }
    S.lastTime = now;
  }

  // ---------- Rendering ----------
  function renderMain(){
    el.energy.textContent = fmt(S.energy);
    el.total.textContent  = fmt(S.totalEnergy);
    el.eps.textContent    = fmt(totalEPS());
    el.shards.textContent = fmt(S.shards);
    el.rp.textContent     = fmt(S.rp);
    el.mult.textContent   = `${(S.multGlobal*S.multAuto*S.achMult).toFixed(2)}×`;
    el.clickVal.textContent = fmt(Math.floor(clickValue()));

    GEN_DEFS.forEach((d,i)=>{
      $(""+d.id+"-owned").textContent = S.gens[i].owned;
      $(""+d.id+"-eps").textContent   = fmt(S.gens[i].owned*genEPS(d));
      $(""+d.id+"-cost").textContent  = fmt(genCost(d, S.gens[i].owned));
    });

    el.nextShards.textContent = fmt(shardsOnAscend());
    el.activeChal.textContent = S.activeChallenge ? `Active: ${CHALLENGES.find(c=>c.id===S.activeChallenge).name}` : "No active challenge";
  }

  function renderAll(){
    renderMain();
    rebuildUpgrades();
    rebuildResearch();
    rebuildChallenges();
    rebuildAchievements();
    save(); // keep state consistent on rebuilds
  }

  // ---------- Tabs & Theme ----------
  el.tabs.addEventListener("click", (e)=>{
    const btn = e.target.closest("button"); if (!btn) return;
    document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".pane").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active"); $(btn.dataset.tab).classList.add("active");
  });

  function applyTheme(t){
    document.documentElement.classList.remove("theme-light","theme-terminal");
    if (t==="light") document.documentElement.classList.add("theme-light");
    if (t==="terminal") document.documentElement.classList.add("theme-terminal");
    S.settings.theme = t; save();
  }
  el.themeSel.value = S.settings.theme || "dark";
  el.themeSel.onchange = (e)=>applyTheme(e.target.value);
  applyTheme(S.settings.theme || "dark");

  // ---------- Events ----------
  el.bigBtn.onclick = ()=>{
    const amt = clickValue();
    S.energy += amt; S.totalEnergy += amt; S.clicks++;
  };
  window.addEventListener("keydown", (e)=>{
    if (e.code==="Space" || e.code==="Enter"){ e.preventDefault(); el.bigBtn.click(); }
    const mod10 = e.shiftKey, modMax = e.ctrlKey || e.metaKey;
    // 1..5 hotkeys
    const n = Number(e.key);
    if (n>=1 && n<=5){
      const id = GEN_DEFS[n-1].id;
      buyGenerator(id, modMax?"max":(mod10?10:1));
    }
    // save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="s"){ e.preventDefault(); save(true); }
  });

  el.ascendBtn.onclick = ()=>{
    const gain = shardsOnAscend();
    if (gain <= 0){ popup("Not enough total energy to Ascend."); return; }
    // reset
    S.shards += gain;
    const keep = { shards: S.shards, settings: S.settings, achievements:S.achievements, version:S.version };
    S = structuredClone(DEFAULT);
    S.shards = keep.shards; S.settings = keep.settings; S.achievements = keep.achievements; S.version = keep.version;
    // shard bonus baked into multGlobal
    S.multGlobal *= (1 + S.shards * 0.05);
    popup(`Ascended! Gained ${gain} ✨ shards.`);
    // rebuild models
    rebuildGenerators(); renderAll();
  };

  el.saveBtn.onclick = ()=>save(true);
  el.exportBtn.onclick = ()=> {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    const w = window.open("", "_blank", "width=600,height=400");
    if (w) w.document.write(`<pre style="white-space:pre-wrap;word-break:break-word;padding:10px">${data}</pre>`);
  };
  el.importBtn.onclick = ()=>{
    const t = prompt("Paste exported save:");
    if (!t) return;
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(t))));
      S = Object.assign(structuredClone(DEFAULT), obj);
      popup("Save imported."); rebuildGenerators(); renderAll();
    } catch { popup("Import failed."); }
  };

  el.autosave.onchange = ()=>{ S.settings.autosave = el.autosave.checked; save(); };
  el.notifs.onchange = ()=>{ S.settings.notifs = el.notifs.checked; save(); };
  el.hardReset.onclick = ()=>{
    if (confirm("Wipe your save? This cannot be undone.")){
      S = structuredClone(DEFAULT); save(true); rebuildGenerators(); renderAll();
      popup("Save wiped.");
    }
  };

  // ---------- Save/Load ----------
  const KEY = "quantum-forge-save-v1";
  function save(manual=false){
    S.lastTime = Date.now();
    try{ localStorage.setItem(KEY, JSON.stringify(S)); if (manual) popup("Game saved."); }catch{}
  }
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      // simple migration example:
      obj.version ??= 1;
      return obj;
    }catch{ return null; }
  }
  function popup(msg){
    if (!S.settings.notifs) return;
    el.log.textContent = msg;
    el.log.style.opacity = "1";
    setTimeout(()=>el.log.style.opacity="0.8", 50);
    setTimeout(()=>el.log.style.opacity="0.4", 800);
    setTimeout(()=>el.log.style.opacity="0.2", 1400);
  }

  // ---------- Init ----------
  el.autosave.checked = S.settings.autosave;
  el.notifs.checked = S.settings.notifs;
  rebuildGenerators(); rebuildUpgrades(); rebuildResearch(); rebuildChallenges(); rebuildAchievements();
  applyOffline();
  renderAll();
  mainLoop();

  // Autosave
  setInterval(()=>{ if (S.settings.autosave) save(); }, 20_000);
})();
