// main.js
(() => {
  const $ = (id) => document.getElementById(id);
  const UNITS = ["K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc","Ud","Dd","Td","Qad","Qid","Sxd","Spd","Ocd","Nod","Vg","Uv","Dv","Tv","Qav","Qiv","Sxv","Spv","Ocv","Nov","Tg","Utg","Dtg","Ttg","Qatg","Qitg","Sxtg","Sptg","Octg","Notg"];
  function fmt(n){
    if (!isFinite(n)) return "∞";
    const s = Math.sign(n) < 0 ? "-" : "";
    n = Math.abs(n);
    if (n < 1e3) return s + Math.floor(n).toString();
    let u = -1;
    while (n >= 1000 && u < UNITS.length-1){ n/=1000; u++; }
    if (u === UNITS.length-1 && n >= 1000) return s + n.toExponential(2);
    const p = n < 10 ? 2 : n < 100 ? 1 : 0;
    return s + n.toFixed(p) + UNITS[u];
  }
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const GEN_DEFS = [
    { id:"gen1", name:"Spark Miner",    baseCost: 10,    costMult: 1.15, baseEPS: 0.12 },
    { id:"gen2", name:"Coil Array",     baseCost: 120,   costMult: 1.17, baseEPS: 1.1 },
    { id:"gen3", name:"Fusion Vat",     baseCost: 1800,  costMult: 1.20, baseEPS: 8.5 },
    { id:"gen4", name:"Quantum Lattice",baseCost: 26000, costMult: 1.22, baseEPS: 60 },
    { id:"gen5", name:"Dimensional Core",baseCost: 420000,costMult:1.25, baseEPS: 420 }
  ];
  const UPG_DEFS = [
    { id:"click1", name:"+1 Click Power", desc:"+1 energy per click", cost: 50,  apply:s=>s.clickPower+=1 },
    { id:"click2", name:"Charged Clicks", desc:"Clicks scale with Shards", cost: 2000, apply:s=>s.clickShardScale=true },
    { id:"auto1",  name:"Greased Gears", desc:"+20% all generator output", cost: 1500, apply:s=>s.multAuto*=1.2 },
    { id:"global1",name:"Flux Condenser", desc:"+15% global multiplier", cost: 5000, apply:s=>s.multGlobal*=1.15 },
    { id:"gen3b",  name:"Fusion Bonus", desc:"Fusion Vats +50% EPS", cost: 8000, apply:s=>s.specificMult.gen3*=1.5 },
    { id:"eff1",   name:"Bulk Efficiency", desc:"-4% generator cost growth", cost: 12500, apply:s=>s.costGrowth*=0.96 },
    { id:"auto2",  name:"Overclocked Lines", desc:"+25% all generator output", cost: 30000, apply:s=>s.multAuto*=1.25 }
  ];
  const RES_DEFS = [
    { id:"rp1", name:"Lab Funding", costRP: 10,   desc:"+10% RP generation", effect:s=>s.rpRate*=1.1 },
    { id:"rp2", name:"Cryo Storage",costRP: 35,   desc:"+25% offline gain",  effect:s=>s.offlineGain*=1.25 },
    { id:"rp3", name:"Meta Theory", costRP: 65,   desc:"+20% global mult",    effect:s=>s.multGlobal*=1.20 },
    { id:"rp4", name:"Dim Analysis",costRP: 120,  desc:"Generators +10% EPS", effect:s=>s.multAuto*=1.10 },
    { id:"rp5", name:"Synergy Mesh",costRP: 220,  desc:"+8% EPS per gen tier",effect:s=>s.tierSynergy=true }
  ];
  const CHALLENGES = [
    { id:"c1", name:"Friction", desc:"Generator output -50%", start:s=>{s.chal="c1"}, end:s=>{s.chal=null} },
    { id:"c2", name:"Taxation", desc:"Costs ×1.5", start:s=>{s.chal="c2"}, end:s=>{s.chal=null} },
    { id:"c3", name:"Silence", desc:"Clicks disabled, +30% EPS", start:s=>{s.chal="c3"}, end:s=>{s.chal=null} }
  ];
  const ACH_DEFS = [
    { id:"a1", name:"First Spark", cond:s=>s.totalEnergy >= 100, bonus:s=>s.achMult*=1.02 },
    { id:"a2", name:"Thousandfold", cond:s=>s.totalEnergy >= 1000, bonus:s=>s.achMult*=1.02 },
    { id:"a3", name:"Millionaire", cond:s=>s.totalEnergy >= 1e6, bonus:s=>s.achMult*=1.03 },
    { id:"a4", name:"Clicky", cond:s=>s.clicks >= 500, bonus:s=>s.achMult*=1.02 },
    { id:"a5", name:"Researcher", cond:s=>s.researchPurchased >= 3, bonus:s=>s.achMult*=1.03 },
    { id:"a6", name:"Machinist", cond:s=>GEN_DEFS.every((d,i)=>s.gens[i].owned>=50), bonus:s=>s.achMult*=1.04 }
  ];
  const DEFAULT = {
    energy: 0, totalEnergy: 0, shards: 0, rp: 0, rpRate: 0.05,
    clickPower: 1, clickShardScale: false, multAuto: 1, multGlobal: 1, achMult: 1,
    specificMult: { gen3: 1 }, costGrowth: 1, offlineGain: 1, tierSynergy: false,
    gens: GEN_DEFS.map(g => ({ id:g.id, owned:0 })), upgradesBought: {}, researchBought: {}, achievements: {},
    activeChallenge: null, chal: null, clicks: 0, researchPurchased: 0, lastTime: Date.now(),
    settings: { autosave: true, notifs: true, theme: "dark" }, version: 2, bulk: "1"
  };
  const el = {
    energy: $("energy"), eps: $("eps"), total: $("totalEnergy"), mult: $("mult"),
    shards: $("shards"), rp: $("rp"), clickVal: $("clickVal"), bigBtn: $("bigBtn"),
    genWrap: $("generators"), upList: $("upgradesList"), resList: $("researchList"),
    chalList: $("challengesList"), achList: $("achievementsList"), activeChal: $("activeChallenge"),
    nextShards: $("nextShards"), ascendBtn: $("ascendBtn"),
    saveBtn: $("saveBtn"), exportBtn: $("exportBtn"), importBtn: $("importBtn"),
    autosave: $("autosaveToggle"), notifs: $("notifsToggle"), hardReset: $("hardResetBtn"),
    tickInfo: $("tickInfo"), tabs: $("tabs"), themeSel: $("themeSel"), log: $("log"),
    bulk1: $("bulk1"), bulk10: $("bulk10"), bulkMax: $("bulkMax"),
    dlBtn: $("downloadSaveBtn"), upInput: $("uploadSaveInput")
  };
  let S = load() || structuredClone(DEFAULT);
  function genCost(def, owned){
    const chalMult = (S.activeChallenge==="c2") ? 1.5 : 1;
    const growth = def.costMult * S.costGrowth;
    return Math.ceil(def.baseCost * Math.pow(growth, owned)) * chalMult;
  }
  function genEPS(def, idx){
    let m = def.baseEPS * S.multAuto * S.multGlobal * S.achMult;
    if (def.id==="gen3") m *= S.specificMult.gen3;
    if (S.activeChallenge==="c1") m *= 0.5;
    if (S.activeChallenge==="c3") m *= 1.3;
    if (S.tierSynergy) m *= 1 + 0.08 * idx;
    return m;
  }
  function totalEPS(){
    let eps = 0;
    GEN_DEFS.forEach((d,i)=>{ eps += S.gens[i].owned * genEPS(d,i); });
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
          renderAll();
          popup("Upgrade purchased");
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
          renderAll();
          popup("Research completed");
        }
      };
      el.resList.appendChild(card);
    });
  }
  function rebuildChallenges(){
    el.chalList.innerHTML = "";
    CHALLENGES.forEach(ch=>{
      const active = S.activeChallenge===ch.id;
      const card = document.createElement("div"); card.className="card";
      card.innerHTML = `
        <h3>${ch.name}</h3>
        <div class="small">${ch.desc}</div>
        <div class="statline">
          <button>${active?"Stop":"Start"}</button>
        </div>`;
      card.querySelector("button").onclick = ()=>{
        if (active){ ch.end(S); S.activeChallenge=null; }
        else { const cur = CHALLENGES.find(x=>x.id===S.activeChallenge); if (cur) cur.end(S); ch.start(S); S.activeChallenge=ch.id; }
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
  function buyGenerator(genId, amount){
    const idx = GEN_DEFS.findIndex(g=>g.id===genId);
    if (idx<0) return;
    const d = GEN_DEFS[idx]; const g = S.gens[idx];
    if (amount==="max"){
      let bought = 0;
      while (true){
        const cost = genCost(d, g.owned + bought);
        if (S.energy >= cost) { S.energy -= cost; bought++; } else break;
        if (bought > 1e6) break;
      }
      if (bought>0) g.owned += bought;
      return;
    }
    const n = Number(amount)||1;
    for (let i=0;i<n;i++){
      const cost = genCost(d, g.owned);
      if (S.energy >= cost){ S.energy -= cost; g.owned++; } else break;
    }
  }
  let lastFrame = performance.now(), frames = 0, fpsTimer = performance.now();
  function tick(dt){
    const eps = totalEPS();
    const gain = eps * dt;
    S.energy += gain;
    S.totalEnergy += gain;
    S.rp += S.rpRate * dt;
    ACH_DEFS.forEach(a=>{
      if (!S.achievements[a.id] && a.cond(S)){
        S.achievements[a.id]=true; a.bonus(S);
        popup("Achievement unlocked");
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
      const offGain = eps * elapsed * S.offlineGain * 0.5;
      const rpGain = S.rpRate * elapsed;
      S.energy += offGain; S.totalEnergy += offGain; S.rp += rpGain;
      popup(`Offline: +${fmt(offGain)} ⚡, +${fmt(rpGain)} RP`);
    }
    S.lastTime = now;
  }
  function renderMain(){
    el.energy.textContent = fmt(S.energy);
    el.total.textContent  = fmt(S.totalEnergy);
    el.eps.textContent    = fmt(totalEPS());
    el.shards.textContent = fmt(S.shards);
    el.rp.textContent     = fmt(S.rp);
    el.mult.textContent   = `${(S.multGlobal*S.multAuto*S.achMult).toFixed(2)}×`;
    el.clickVal.textContent = fmt(Math.floor(clickValue()));
    GEN_DEFS.forEach((d,i)=>{
      $(`${d.id}-owned`).textContent = S.gens[i].owned;
      $(`${d.id}-eps`).textContent   = fmt(S.gens[i].owned*genEPS(d,i));
      $(`${d.id}-cost`).textContent  = fmt(genCost(d, S.gens[i].owned));
    });
    el.nextShards.textContent = fmt(shardsOnAscend());
    el.activeChal.textContent = S.activeChallenge ? `Active: ${CHALLENGES.find(c=>c.id===S.activeChallenge).name}` : "No active challenge";
    el.bulk1.classList.toggle("active", S.bulk==="1");
    el.bulk10.classList.toggle("active", S.bulk==="10");
    el.bulkMax.classList.toggle("active", S.bulk==="max");
  }
  function renderAll(){
    renderMain();
    rebuildUpgrades();
    rebuildResearch();
    rebuildChallenges();
    rebuildAchievements();
    save();
  }
  el.tabs.addEventListener("click", (e)=>{
    const btn = e.target.closest("button"); if (!btn) return;
    document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".pane").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active"); $(btn.dataset.tab).classList.add("active");
  });
  function applyTheme(t){
    document.documentElement.classList.remove("theme-light","theme-terminal","theme-neon","theme-solar","theme-midnight");
    if (t==="light") document.documentElement.classList.add("theme-light");
    if (t==="terminal") document.documentElement.classList.add("theme-terminal");
    if (t==="neon") document.documentElement.classList.add("theme-neon");
    if (t==="solar") document.documentElement.classList.add("theme-solar");
    if (t==="midnight") document.documentElement.classList.add("theme-midnight");
    S.settings.theme = t; save();
  }
  el.themeSel.value = S.settings.theme || "dark";
  el.themeSel.onchange = (e)=>applyTheme(e.target.value);
  applyTheme(S.settings.theme || "dark");
  el.bigBtn.onclick = ()=>{
    const amt = clickValue();
    if (amt<=0) return;
    S.energy += amt; S.totalEnergy += amt; S.clicks++;
  };
  window.addEventListener("keydown", (e)=>{
    if (e.code==="Space" || e.code==="Enter"){ e.preventDefault(); el.bigBtn.click(); }
    const mod10 = e.shiftKey, modMax = e.ctrlKey || e.metaKey;
    const n = Number(e.key);
    if (n>=1 && n<=GEN_DEFS.length){
      const id = GEN_DEFS[n-1].id;
      const mode = modMax?"max":(mod10?10:(S.bulk||"1"));
      buyGenerator(id, mode);
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="s"){ e.preventDefault(); save(true); }
  });
  el.genWrap.addEventListener("click", (e)=>{
    const b = e.target.closest("button"); if(!b) return;
    const mode = b.dataset.buy==="1"||b.dataset.buy==="10"||b.dataset.buy==="max" ? b.dataset.buy : (S.bulk||"1");
    buyGenerator(b.dataset.id, mode);
  });
  [el.bulk1, el.bulk10, el.bulkMax].forEach(btn=>{
    btn.addEventListener("click", ()=>{
      S.bulk = btn.dataset.bulk; renderMain(); save();
    });
  });
  el.ascendBtn.onclick = ()=>{
    const gain = shardsOnAscend();
    if (gain <= 0){ popup("Not enough total energy"); return; }
    S.shards += gain;
    const keep = { shards: S.shards, settings: S.settings, achievements:S.achievements, version:S.version };
    S = structuredClone(DEFAULT);
    S.shards = keep.shards; S.settings = keep.settings; S.achievements = keep.achievements; S.version = keep.version;
    S.multGlobal *= (1 + S.shards * 0.05);
    rebuildGenerators(); renderAll();
    popup(`Ascended +${fmt(gain)} ✨`);
  };
  el.saveBtn.onclick = ()=>save(true);
  el.exportBtn.onclick = ()=> {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    const w = window.open("", "_blank", "width=640,height=480");
    if (w) w.document.write(`<pre style="white-space:pre-wrap;word-break:break-word;padding:10px">${data}</pre>`);
  };
  el.importBtn.onclick = ()=>{
    const t = prompt("Paste exported save:");
    if (!t) return;
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(t))));
      S = Object.assign(structuredClone(DEFAULT), obj);
      rebuildGenerators(); renderAll();
      popup("Save imported");
    } catch { popup("Import failed"); }
  };
  el.autosave.onchange = ()=>{ S.settings.autosave = el.autosave.checked; save(); };
  el.notifs.onchange = ()=>{ S.settings.notifs = el.notifs.checked; save(); };
  el.hardReset.onclick = ()=>{
    if (confirm("Wipe your save?")){ S = structuredClone(DEFAULT); save(true); rebuildGenerators(); renderAll(); popup("Save wiped"); }
  };
  el.dlBtn.onclick = ()=>{
    try {
      const blob = new Blob([JSON.stringify(S)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "quantum-forge.qfsave";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch {}
  };
  el.upInput.addEventListener("change", async (e)=>{
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const obj = JSON.parse(text);
      S = Object.assign(structuredClone(DEFAULT), obj);
      rebuildGenerators(); renderAll();
      popup("Save loaded from file");
    } catch { popup("Load failed"); }
    e.target.value = "";
  });
  const KEY = "quantum-forge-save-v2";
  function save(manual=false){
    S.lastTime = Date.now();
    try{
      localStorage.setItem(KEY, JSON.stringify(S));
      if (manual) popup("Saved");
    }catch{
      try{
        const blob = new Blob([JSON.stringify(S)], {type:"application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "quantum-forge-backup.qfsave";
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      }catch{}
    }
  }
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      obj.version ??= 2;
      obj.bulk ??= "1";
      return obj;
    }catch{ return null; }
  }
  function popup(msg){
    if (!S.settings.notifs) return;
    el.log.textContent = msg;
    el.log.style.opacity = "1";
    setTimeout(()=>el.log.style.opacity="0.85", 120);
    setTimeout(()=>el.log.style.opacity="0.6", 900);
    setTimeout(()=>el.log.style.opacity="0.25", 1600);
  }
  el.autosave.checked = S.settings.autosave;
  el.notifs.checked = S.settings.notifs;
  el.themeSel.value = S.settings.theme || "dark";
  rebuildGenerators(); rebuildUpgrades(); rebuildResearch(); rebuildChallenges(); rebuildAchievements();
  applyOffline();
  renderAll();
  mainLoop();
  setInterval(()=>{ if (S.settings.autosave) save(); }, 20000);
})();
