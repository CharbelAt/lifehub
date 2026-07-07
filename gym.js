"use strict";
/* gym.js — the gym app: sessions w/ per-set logging, library, routines, PRs, progress */
function gymWeek(){
  const mon = weekStart(todayStr());
  return S.workouts.filter(w => w.date >= mon && w.date <= addDays(mon,6));
}
function exVol(x){ return (x.sets||[]).reduce((a,s)=>a + (s.reps||0)*(s.kg||0), 0); }
function exTop(x){ return (x.sets||[]).reduce((a,s)=>Math.max(a, s.kg||0), 0); }
function exReps(x){ return (x.sets||[]).reduce((a,s)=>a + (s.reps||0), 0); }
function volume(w){ return (w.ex||[]).reduce((a,x)=>a + exVol(x), 0); }
function fmtVol(v){ return v >= 1000 ? (v/1000).toFixed(1) + " t" : Math.round(v) + " kg"; }
function bestKg(name, exceptId){
  let best = 0;
  S.workouts.forEach(w => {
    if(w.id === exceptId) return;
    (w.ex||[]).forEach(x => { if(x.n.toLowerCase() === name.toLowerCase()) best = Math.max(best, exTop(x)); });
  });
  return best;
}
function openExPage(name){ openDetail("ex", encodeURIComponent(name)); }
function setsLabel(x){ return (x.sets||[]).map(s => `${s.kg||0}×${s.reps||0}`).join(" · "); }
function e1rm(kg, reps){ return (kg > 0 && reps > 0) ? Math.round(kg * (1 + reps/30)) : 0; }
function exBest1rm(x){ return (x.sets||[]).reduce((a,s)=>Math.max(a, e1rm(s.kg, s.reps)), 0); }
function streakWeeks(){
  let n = 0, mon = weekStart(todayStr());
  const has = ws => S.workouts.some(w => w.date >= ws && w.date <= addDays(ws,6));
  if(!has(mon)) mon = addDays(mon,-7);
  while(has(mon)){ n++; mon = addDays(mon,-7); }
  return n;
}

function exSessions(name){
  const out = [];
  S.workouts.forEach(w => {
    const xs = (w.ex||[]).filter(x => x.n.toLowerCase() === name.toLowerCase());
    if(xs.length){
      out.push({
        id: w.id, date: w.date, type: w.type,
        top: Math.max.apply(null, xs.map(exTop)),
        vol: xs.reduce((a,x)=>a+exVol(x),0),
        reps: xs.reduce((a,x)=>a+exReps(x),0),
        rm: Math.max.apply(null, xs.map(exBest1rm)),
        label: xs.map(setsLabel).join(" · ")
      });
    }
  });
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function pageExercise(name){
  const ses = exSessions(name);
  const info = exInfo(name);
  if(!ses.length && !info) return null;
  const pr = ses.length ? Math.max.apply(null, ses.map(s=>s.top)) : 0;
  const bestReps = ses.length ? Math.max.apply(null, ses.map(s=>s.reps)) : 0;
  const totVol = ses.reduce((a,s)=>a+s.vol,0);
  const infoHtml = info ? `
    <div class="card"><h2 style="margin:0 0 6px;font-size:.95rem">Muscles trained</h2>
      <div style="font-size:.92rem;font-weight:600">${esc(info.m)}</div></div>
    <div class="card"><h2 style="margin:0 0 6px;font-size:.95rem">How to do it</h2>
      <p class="sub" style="line-height:1.55;font-size:.88rem">${esc(info.how)}</p></div>` : "";
  const bestRm = ses.length ? Math.max.apply(null, ses.map(s=>s.rm)) : 0;
  const chartsHtml = ses.length ? `
    <div class="grid2" style="margin-bottom:12px">
      ${statCard("Sessions", ses.length, "pri")}
      ${statCard("Est. 1RM", bestRm ? bestRm + " kg" : "—", "blu")}
      ${statCard("Total volume", fmtVol(totVol), "grn")}
      ${statCard("Best reps (session)", Math.max.apply(null, ses.map(s=>s.reps)), "amb")}
    </div>
    <div class="card"><h2 style="margin:0 0 8px;font-size:.95rem">Top weight per session</h2>${progressSVG(ses.map(s=>s.top), "#2bd984", "kg")}</div>
    <div class="card"><h2 style="margin:0 0 8px;font-size:.95rem">Total reps per session</h2>${progressSVG(ses.map(s=>s.reps), "#ffb454", "")}</div>
    <div class="card"><h2 style="margin:0 0 8px;font-size:.95rem">Volume per session (kg lifted)</h2>${barsSVG(ses.map(s=>s.vol), "#7c5cff")}</div>` : "";
  const hist = ses.length ? `<h2>History</h2>` + [...ses].reverse().map(s =>
    `<div class="item" onclick="openDetail('wo','${s.id}')">
      <div class="ico gico">${gymIcon(exMuscle(name))}</div>
      <div class="bd"><div class="t">${fmtDay(s.date)}</div>
      <div class="s">${s.label}</div></div>
      <div class="amt ${s.top===pr && s.top>0 ? "amb":""}">${s.top ? s.top+"kg" : s.reps+" reps"}${s.top===pr && s.top>0 ? " 🏆" : ""}</div></div>`).join("") : "";
  return pageHead(esc(name)) +
    `<div class="big-ico gico-big">${gymIcon(exMuscle(name))}</div>
     <div class="big-amt">${pr ? pr + " kg" : (bestReps ? bestReps + " reps" : "—")}</div>
     <div class="big-sub">${ses.length ? "personal record · " : ""}${exMuscle(name)}${ses.length ? " · " + ses.length + " session" + (ses.length>1?"s":"") : " · not logged yet"}</div>` +
    infoHtml + chartsHtml + hist;
}

/* ---- live session ---- */
function prevSets(name, exceptId){
  const past = S.workouts
    .filter(w => w.id !== exceptId && (w.ex||[]).some(x => x.n.toLowerCase() === name.toLowerCase()))
    .sort((a,b) => b.date.localeCompare(a.date));
  if(!past.length) return null;
  const x = past[0].ex.find(x => x.n.toLowerCase() === name.toLowerCase());
  return x ? x.sets : null;
}
function startSession(routineId){
  if(S.activeWo && !S.activeWo.routineMode){ openDetail("session","active"); return; }
  const rt = routineId ? S.routines.find(r=>r.id===routineId) : null;
  S.activeWo = {
    routineMode: false, editId: null,
    type: rt ? rt.type : S.wtypes[0].n,
    date: todayStr(), start: Date.now(), note: "",
    ex: rt ? rt.ex.map(x => ({ n:x.n, sets:x.sets.map(s=>({reps:s.reps, kg:s.kg, done:false})) })) : []
  };
  save(); openDetail("session","active");
}
function startRoutineBuilder(editId){
  const rt = editId ? S.routines.find(r=>r.id===editId) : null;
  S.activeWo = {
    routineMode: true, rtEditId: editId || null,
    rtName: rt ? rt.name : "",
    type: rt ? rt.type : S.wtypes[0].n,
    date: todayStr(), start: Date.now(), note: "",
    ex: rt ? rt.ex.map(x => ({ n:x.n, sets:x.sets.map(s=>({reps:s.reps, kg:s.kg})) })) : []
  };
  save(); openDetail("session","active");
}
function editWorkout(id){
  const w = S.workouts.find(x=>x.id===id); if(!w) return;
  S.activeWo = {
    routineMode:false, editId:id, type:w.type, date:w.date, start:Date.now(),
    dur:w.dur, note:w.note||"",
    ex: (w.ex||[]).map(x => ({ n:x.n, sets:x.sets.map(s=>({reps:s.reps, kg:s.kg, done:true})) }))
  };
  save(); openDetail("session","active");
}
function addExToSession(name){
  if(!S.activeWo) return;
  const prev = prevSets(name, S.activeWo.editId);
  const sets = prev ? prev.map(s=>({reps:s.reps, kg:s.kg, done:false})) : [{reps:0,kg:0},{reps:0,kg:0},{reps:0,kg:0}];
  S.activeWo.ex.push({ n:name, sets });
  save();
}
function setVal(ei, si, f, v){
  const x = S.activeWo && S.activeWo.ex[ei]; if(!x || !x.sets[si]) return;
  x.sets[si][f] = f === "reps" ? (parseInt(v,10)||0) : (parseFloat(String(v).replace(",","."))||0);
  save();
}
function toggleSetDone(ei, si){
  const a = S.activeWo; const x = a && a.ex[ei]; if(!x || !x.sets[si]) return;
  x.sets[si].done = !x.sets[si].done;
  if(x.sets[si].done && !a.routineMode) a.restEnd = Date.now() + (S.restSec||90)*1000;
  save(); route();
}

/* ---- rest timer ---- */
function setRestSec(s){ S.restSec = s; save(); route(); }
function skipRest(){ if(S.activeWo){ S.activeWo.restEnd = null; save(); route(); } }
function extendRest(){ if(S.activeWo && S.activeWo.restEnd){ S.activeWo.restEnd += 30000; save(); tickRest(); } }
function fmtLeft(ms){
  const s = Math.max(0, Math.ceil(ms/1000));
  return Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");
}
function tickRest(){
  const a = S.activeWo;
  if(!a || !a.restEnd) return;
  const left = a.restEnd - Date.now();
  if(left <= 0){
    a.restEnd = null; save();
    try{ if(navigator.vibrate) navigator.vibrate([200,80,200]); }catch(e){}
    try{ if(typeof sysNotify === "function") sysNotify("Rest over 💪", "Time for the next set."); }catch(e){}
    if(location.hash === "#d/session/active") route();
    return;
  }
  const el = $("#rest-left");
  if(el){
    el.textContent = fmtLeft(left);
    const bar = $("#rest-bar");
    if(bar) bar.style.width = Math.max(0, left/((S.restSec||90)*1000)*100) + "%";
  }
}
setInterval(tickRest, 1000);
function addSet(ei){
  const x = S.activeWo && S.activeWo.ex[ei]; if(!x) return;
  const last = x.sets[x.sets.length-1];
  x.sets.push({ reps:last ? last.reps : 0, kg:last ? last.kg : 0, done:false });
  save(); route();
}
function rmSet(ei, si){
  const x = S.activeWo && S.activeWo.ex[ei]; if(!x) return;
  x.sets.splice(si,1);
  if(!x.sets.length) S.activeWo.ex.splice(ei,1);
  save(); route();
}
function rmSessionEx(ei){
  if(!S.activeWo) return;
  S.activeWo.ex.splice(ei,1);
  save(); route();
}
function setWoNote(v){ if(S.activeWo){ S.activeWo.note = v; save(); } }
function setWoType(n){ if(S.activeWo){ S.activeWo.type = n; save(); route(); } }
function pageSession(){
  const a = S.activeWo;
  if(!a) return null;
  const mins = Math.max(1, Math.round((Date.now() - (a.start||Date.now())) / 60000));
  const title = a.routineMode ? (a.rtEditId ? "Edit routine" : "New routine") : (a.editId ? "Edit workout" : "Workout");
  const typeChips = S.wtypes.map(w =>
    `<button class="chip ${a.type===w.n?"on":""}" onclick="setWoType('${escq(w.n)}')">${w.e} ${esc(w.n)}</button>`).join("");
  const exCards = a.ex.map((x, ei) => {
    const prev = prevSets(x.n, a.editId);
    const rows = x.sets.map((s, si) => {
      const p = prev && prev[si] ? `${prev[si].kg||0}×${prev[si].reps||0}` : "—";
      return `<div class="set-row ${s.done?"done":""}">
        <span class="sn">${si+1}</span>
        <span class="sp">${p}</span>
        <input class="inp" inputmode="decimal" placeholder="kg" value="${s.kg||""}" oninput="setVal(${ei},${si},'kg',this.value)">
        <input class="inp" inputmode="numeric" placeholder="reps" value="${s.reps||""}" oninput="setVal(${ei},${si},'reps',this.value)">
        ${a.routineMode ? "<span></span>" : `<button class="sd ${s.done?"on":""}" onclick="toggleSetDone(${ei},${si})">✓</button>`}
        <button class="x" onclick="rmSet(${ei},${si})">✕</button></div>`;
    }).join("");
    return `<div class="card" style="padding:13px">
      <div class="spread" style="margin-bottom:8px">
        <b style="font-size:.95rem;cursor:pointer" onclick="openExPage('${escq(x.n)}')">${esc(x.n)} <span class="sub" style="font-size:.7rem">${exMuscle(x.n)}</span></b>
        <button class="x" onclick="rmSessionEx(${ei})">✕</button>
      </div>
      <div class="set-head"><span>Set</span><span>Prev</span><span>Kg</span><span>Reps</span><span></span><span></span></div>
      ${rows}
      <button class="btn btn-g mini" style="width:100%;margin-top:6px" onclick="addSet(${ei})">+ Add set</button>
    </div>`;
  }).join("");
  return pageHead(title) +
    (a.routineMode ? `
      <label class="f">Routine name</label>
      <input class="inp" id="rt-name" placeholder="e.g. Push day A" value="${escq(a.rtName||"")}" oninput="S.activeWo.rtName=this.value;save()">`
      : `<div class="spread" style="margin-bottom:10px"><span class="sub">⏱ ${a.editId ? fmtDay(a.date) : mins + " min"}</span><span class="sub">${a.ex.length} exercise${a.ex.length===1?"":"s"} · ${fmtVol(volume(a))}</span></div>`) +
    `<div class="chips" style="margin-bottom:10px">${typeChips}</div>` +
    (a.routineMode ? "" : `<div class="row" style="gap:6px;margin-bottom:10px;flex-wrap:wrap"><span class="sub" style="font-size:.75rem">Rest timer</span>${[60,90,120,180].map(s =>
      `<button class="chip ${((S.restSec||90)===s)?"on":""}" style="padding:5px 10px;font-size:.75rem" onclick="setRestSec(${s})">${s}s</button>`).join("")}</div>`) +
    exCards +
    `<button class="btn btn-g" style="width:100%;margin:4px 0 14px" onclick="openExLib(true)">+ Add exercise</button>` +
    (a.routineMode ? "" : `<input class="inp" placeholder="Note — how did it go?" value="${escq(a.note||"")}" oninput="setWoNote(this.value)">`) +
    `<div class="row" style="gap:10px">
      <button class="btn btn-d" style="flex:1" onclick="discardSession()">Discard</button>
      <button class="btn btn-p" style="flex:2" onclick="finishSession()">${a.routineMode ? "💾 Save routine" : "✓ Finish workout"}</button>
    </div>` +
    (!a.routineMode && a.restEnd && a.restEnd > Date.now() ?
      `<div class="rest-pill"><b style="font-size:.85rem">Rest</b><span id="rest-left" style="font-weight:800;font-size:1rem">${fmtLeft(a.restEnd - Date.now())}</span>
       <div class="rb"><div id="rest-bar" style="width:${Math.max(0,(a.restEnd-Date.now())/((S.restSec||90)*1000)*100)}%"></div></div>
       <button class="btn btn-g mini" onclick="extendRest()">+30s</button>
       <button class="btn btn-g mini" onclick="skipRest()">Skip</button></div>` : "");
}
function cleanSessionEx(){
  return S.activeWo.ex
    .map(x => ({ n:x.n, sets:x.sets.filter(s => (s.reps||0) > 0 || (s.kg||0) > 0).map(s=>({reps:s.reps||0, kg:s.kg||0})) }))
    .filter(x => x.sets.length);
}
function finishSession(){
  const a = S.activeWo; if(!a) return;
  const ex = cleanSessionEx();
  if(!ex.length){ toast(a.routineMode ? "Add at least one exercise with sets" : "Log at least one set first"); return; }
  if(a.routineMode){
    const name = (a.rtName||"").trim() || $("#rt-name").value.trim();
    if(!name){ toast("Give the routine a name"); return; }
    if(a.rtEditId){
      const r = S.routines.find(x=>x.id===a.rtEditId);
      if(r){ r.name = name; r.type = a.type; r.ex = ex; }
    } else {
      S.routines.push({ id:uid(), name, type:a.type, ex });
    }
    S.activeWo = null;
    save(); goBack(); toast("Routine saved ✓");
    return;
  }
  const prs = [];
  ex.forEach(x => {
    const top = exTop(x);
    if(top > 0 && top > bestKg(x.n, a.editId)) prs.push(esc(x.n) + " " + top + "kg");
  });
  if(a.editId){
    const w = S.workouts.find(x=>x.id===a.editId);
    if(w){ w.type = a.type; w.note = a.note||""; w.ex = ex; w.dur = a.dur || w.dur; }
  } else {
    const dur = Math.max(1, Math.round((Date.now() - (a.start||Date.now())) / 60000));
    S.workouts.push({ id:uid(), type:a.type, dur, note:a.note||"", date:a.date, ex });
  }
  S.activeWo = null;
  save(); goBack();
  toast(prs.length ? "🏆 New PR: " + prs[0] : "Workout saved 💪");
}
function discardSession(){
  confirmBox("Discard this " + (S.activeWo && S.activeWo.routineMode ? "routine draft" : "workout") + "?", ()=>{
    S.activeWo = null; save(); goBack();
  });
}

/* ---- workouts ---- */
function delWorkout(id){
  confirmBox("Delete this workout?", ()=>{
    S.workouts = S.workouts.filter(w=>w.id!==id); save(); goBack(); toast("Deleted");
  });
}
function repeatWorkout(id){
  if(S.activeWo && !S.activeWo.routineMode){
    toast("Finish or discard the current workout first");
    openDetail("session","active");
    return;
  }
  const w = S.workouts.find(x=>x.id===id); if(!w) return;
  S.activeWo = {
    routineMode:false, editId:null, type:w.type, date:todayStr(), start:Date.now(), note:"",
    ex:(w.ex||[]).map(x=>({ n:x.n, sets:x.sets.map(s=>({reps:s.reps, kg:s.kg, done:false})) }))
  };
  save(); openDetail("session","active");
}
function pageWorkout(id){
  const w = S.workouts.find(x=>x.id===id); if(!w) return null;
  const vol = volume(w);
  const exHtml = (w.ex||[]).length ?
    `<div class="card"><h2 style="margin:0 0 6px;font-size:.95rem">Exercises</h2>` +
    w.ex.map(x => {
      const isPR = exTop(x) > 0 && exTop(x) >= bestKg(x.n);
      return `<div style="padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer" onclick="openExPage('${escq(x.n)}')">
        <div class="spread"><span style="font-size:.9rem;font-weight:600">${esc(x.n)}${isPR ? " 🏆" : ""}</span>
        <span class="sub">${x.sets.length} set${x.sets.length>1?"s":""}</span></div>
        <div class="sub" style="font-size:.78rem;margin-top:2px">${setsLabel(x)}</div></div>`;
    }).join("") +
    (vol ? `<div class="spread" style="padding:10px 0 2px"><span class="sub">Total volume</span><b>${fmtVol(vol)}</b></div>` : "") +
    `</div>` : "";
  return pageHead("Workout") +
    `<div class="big-ico">${wIcon(w.type)}</div>
     <div class="big-amt" style="font-size:1.4rem">${esc(w.type)}</div>
     <div class="big-sub">${fmtDay(w.date)}${w.dur ? " · " + w.dur + " min" : ""}${(w.ex||[]).length ? " · " + w.ex.length + " exercises" : ""}</div>` +
    exHtml +
    `<div class="card">` +
    field("Type", wIcon(w.type) + " " + esc(w.type)) +
    field("Date", fmtDayFull(w.date)) +
    field("Duration", w.dur ? w.dur + " minutes" : "—") +
    (w.note ? field("Note", esc(w.note)) : "") +
    `</div>` +
    ((w.ex||[]).length ? `<button class="btn btn-p" style="width:100%;margin-top:4px" onclick="repeatWorkout('${w.id}')">↻ Repeat this workout</button>
     <button class="btn btn-g" style="width:100%;margin-top:10px" onclick="saveAsRoutine('${w.id}')">💾 Save as routine</button>` : "") +
    pageActions(`editWorkout('${w.id}')`, `delWorkout('${w.id}')`);
}

/* ---- routines ---- */
function delRoutine(id){
  confirmBox("Delete this routine? Logged workouts stay.", ()=>{
    S.routines = S.routines.filter(r=>r.id!==id); save(); goBack(); toast("Deleted");
  });
}
function saveAsRoutine(workoutId){
  const w = S.workouts.find(x=>x.id===workoutId); if(!w || !(w.ex||[]).length) return;
  window._srw = workoutId;
  openModal(`<h3>Save as routine</h3>
    <label class="f">Routine name</label>
    <input class="inp" id="sr-name" value="${escq(w.type)} routine">
    <button class="btn btn-p" onclick="confirmSaveAsRoutine()">Save</button>`);
  focusIn("#sr-name");
}
function confirmSaveAsRoutine(){
  const w = S.workouts.find(x=>x.id===window._srw); if(!w) return;
  const name = $("#sr-name").value.trim() || (w.type + " routine");
  S.routines.push({ id:uid(), name, type:w.type, ex:(w.ex||[]).map(x=>({ n:x.n, sets:x.sets.map(s=>({...s})) })) });
  save(); closeModal(); renderGym(); toast("Routine saved ✓");
}
function pageRoutine(id){
  const r = S.routines.find(x=>x.id===id); if(!r) return null;
  return pageHead("Routine") +
    `<div class="big-ico">${wIcon(r.type)}</div>
     <div class="big-amt" style="font-size:1.4rem">${esc(r.name)}</div>
     <div class="big-sub">${esc(r.type)} · ${r.ex.length} exercises</div>
     <button class="btn btn-p" style="margin-bottom:14px" onclick="startSession('${r.id}')">▶ Start this workout</button>
     <div class="card">` +
    r.ex.map(x => `<div style="padding:8px 0;border-bottom:1px solid var(--line)">
      <div class="spread"><span style="font-size:.9rem;font-weight:600">${esc(x.n)}</span><span class="sub">${x.sets.length} sets</span></div>
      <div class="sub" style="font-size:.78rem;margin-top:2px">${setsLabel(x)}</div></div>`).join("") +
    `</div>` +
    pageActions(`startRoutineBuilder('${r.id}')`, `delRoutine('${r.id}')`);
}

/* ---- workout types ---- */
function openNewWType(){
  openModal(`<h3>New workout type</h3>
    <div class="half">
      <div><label class="f">Emoji</label><input class="inp" id="nw-e" placeholder="🏊" maxlength="4"></div>
      <div><label class="f">Name</label><input class="inp" id="nw-n" placeholder="e.g. Swimming"></div>
    </div>
    <button class="btn btn-p" onclick="saveNewWType()">Add</button>`);
  focusIn("#nw-n");
}
function saveNewWType(){
  const e = $("#nw-e").value.trim() || "💪";
  const n = $("#nw-n").value.trim();
  if(!n){ toast("Give it a name"); return; }
  if(S.wtypes.some(w => w.n.toLowerCase() === n.toLowerCase())){ toast("Already exists"); return; }
  S.wtypes.push({ e, n });
  save(); closeModal(); toast("Added ✓");
  if(window._reopen) window._reopen();
}

/* ================= gym app (own tab bar) ================= */
let gymTab = "train";
let exSel = null;
let gymMetric = "kg";
function setGymTab(t){ gymTab = t; history.replaceState(null, "", "#g/" + t); renderGymApp(); }
function pickProg(n){ exSel = n; renderGymApp(); }
function setGymMetric(m){ gymMetric = m; renderGymApp(); }
function exNames(){
  const cnt = {};
  S.workouts.forEach(w => (w.ex||[]).forEach(x => {
    const k = x.n.trim(); if(!k) return;
    cnt[k] = (cnt[k]||0) + 1;
  }));
  return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
}
function renderGymApp(){
  ["train","library","stats","history"].forEach(k => {
    const b = $("#gt-"+k); if(b) b.classList.toggle("on", gymTab===k);
  });
  const el = $("#ga-body"); if(!el) return;
  if(gymTab === "library"){ window._exPick = false; el.innerHTML = gymLibraryHTML(); }
  else if(gymTab === "stats") el.innerHTML = gymStatsHTML();
  else if(gymTab === "history") el.innerHTML = gymHistoryHTML();
  else el.innerHTML = gymTrainHTML();
}
function renderGym(){ if($("#gymapp") && $("#gymapp").classList.contains("on")) renderGymApp(); }

function gymTrainHTML(){
  const wk = gymWeek();
  const mins = wk.reduce((a,w)=>a+(w.dur||0),0);
  const a = S.activeWo;
  const hero = a
    ? `<div class="sub" style="color:rgba(255,255,255,.85)">${a.routineMode ? "Routine draft in progress" : "Workout in progress"}</div>
       <div style="font-size:1.3rem;font-weight:800;margin:4px 0 10px;color:#fff">${a.ex.length} exercise${a.ex.length===1?"":"s"} · ${fmtVol(volume(a))}</div>
       <button class="btn" style="background:#fff;color:#0a3;width:100%;font-weight:750" onclick="openDetail('session','active')">▶ Continue</button>`
    : `<div class="sub" style="color:rgba(255,255,255,.85)">Ready to train?</div>
       <div style="font-size:1.3rem;font-weight:800;margin:4px 0 10px;color:#fff">${wk.length ? wk.length + " workout" + (wk.length>1?"s":"") + " this week" : "Start your week strong"}</div>
       <button class="btn" style="background:#fff;color:#0a3;width:100%;font-weight:750" onclick="startSession()">▶ Start workout</button>`;
  const routines = S.routines.length ? S.routines.map(r =>
    `<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line)">
      <span class="row" style="gap:8px;min-width:0;cursor:pointer" onclick="openDetail('rt','${r.id}')">
        <span class="gico">${gymIcon("Custom")}</span>
        <span style="min-width:0"><span style="font-size:.9rem;font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</span>
        <span class="sub" style="font-size:.72rem">${esc(r.type)} · ${r.ex.length} exercises</span></span></span>
      <button class="btn btn-g mini" style="flex:none" onclick="startSession('${r.id}')">▶ Start</button></div>`).join("")
    : `<div class="sub" style="padding:4px 0">Build a routine once, start it in one tap — sets prefilled from last time.</div>`;
  const last = [...S.workouts].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const stk = streakWeeks();
  const wkVol = wk.reduce((a,w)=>a+volume(w),0);
  return `<div class="gym-hero">${hero}</div>
    <div class="grid2" style="margin-bottom:12px">
      ${statCard("This week", wk.length + (wk.length===1?" workout":" workouts"), "grn")}
      ${statCard("Active minutes", mins + " min", "blu")}
      ${statCard("Week streak", stk ? stk + " week" + (stk>1?"s":"") + " 🔥" : "—", "amb")}
      ${statCard("Volume (wk)", wkVol ? fmtVol(wkVol) : "—", "pri")}
    </div>
    <div class="card">
      <div class="spread"><h2 style="margin:0;font-size:.95rem">Routines</h2><button class="btn btn-g mini" onclick="startRoutineBuilder()">+ New</button></div>
      <div style="margin-top:6px">${routines}</div>
    </div>` +
    (last ? `<h2>Last workout</h2>
      <div class="item" onclick="openDetail('wo','${last.id}')"><div class="ico">${wIcon(last.type)}</div>
      <div class="bd"><div class="t">${esc(last.type)} · ${fmtDay(last.date)}</div>
      <div class="s">${(last.ex||[]).map(x=>esc(x.n)).join(", ") || esc(last.note)}</div></div></div>` : "");
}
function gymLibraryHTML(){
  return `<input class="inp" placeholder="Search exercises or muscles…" value="${escq(exQuery)}" oninput="gymLibSearch(this.value)">
    <button class="btn btn-g mini" style="margin-bottom:8px" onclick="openCustomEx()">+ Custom exercise</button>
    <div id="exlib-list">${exLibListHTML()}</div>`;
}
function gymLibSearch(v){ exQuery = v; $("#exlib-list").innerHTML = exLibListHTML(); }
function gymStatsHTML(){
  const t = todayStr();
  const wk = gymWeek();
  const mins = wk.reduce((a,w)=>a+(w.dur||0),0);
  const mk = monthKey(t);
  const mCount = S.workouts.filter(w => monthKey(w.date)===mk).length;
  const wkVol = wk.reduce((a,w)=>a+volume(w),0);
  let out = `<div class="grid2" style="margin-bottom:12px">
    ${statCard("This week", wk.length + (wk.length===1?" workout":" workouts"), "pri")}
    ${statCard("Active minutes (wk)", mins + " min", "grn")}
    ${statCard("This month", mCount + (mCount===1?" workout":" workouts"), "amb")}
    ${statCard("Volume (wk)", wkVol ? fmtVol(wkVol) : "—", "blu")}
  </div>`;

  const names = exNames().slice(0, 8);
  if(names.length){
    if(!exSel || !names.some(n => n.toLowerCase() === exSel.toLowerCase())) exSel = names[0];
    const ses = exSessions(exSel);
    const MET = {
      kg:  { vals: ses.map(s=>s.top),  color:"#2bd984", unit:"kg", label:"Weight" },
      rm:  { vals: ses.map(s=>s.rm),   color:"#22d3ee", unit:"kg", label:"1RM" },
      reps:{ vals: ses.map(s=>s.reps), color:"#ffb454", unit:"",   label:"Reps" },
      vol: { vals: ses.map(s=>s.vol),  color:"#7c5cff", unit:"",   label:"Volume" }
    };
    const m = MET[gymMetric] || MET.kg;
    out += `<div class="card">
      <h2 style="margin:0 0 10px;font-size:.95rem">Exercise progress</h2>
      <div class="seg" style="margin-bottom:10px">${["kg","rm","reps","vol"].map(k =>
        `<button class="${gymMetric===k?"on":""}" onclick="setGymMetric('${k}')">${MET[k].label}</button>`).join("")}</div>
      <div class="chips">${names.map(n =>
        `<button class="chip ${n.toLowerCase()===exSel.toLowerCase()?"on":""}" onclick="pickProg('${escq(n)}')">${esc(n)}</button>`).join("")}</div>
      ${progressSVG(m.vals, m.color, m.unit)}
      <button class="btn btn-g mini" style="width:100%;margin-top:8px" onclick="openExPage('${escq(exSel)}')">Full history →</button>
    </div>`;
  }

  const best = {};
  S.workouts.forEach(w => (w.ex||[]).forEach(x => {
    const k = x.n.toLowerCase(), top = exTop(x);
    if(top > 0 && top > (best[k] ? best[k].kg : 0)) best[k] = { n:x.n, kg:top };
  }));
  const tops = Object.values(best).sort((a,b)=>b.kg-a.kg).slice(0,6);
  if(tops.length){
    out += `<div class="card"><h2 style="margin:0 0 6px;font-size:.95rem">Personal records</h2>` +
      tops.map(b => `<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--line);cursor:pointer" onclick="openExPage('${escq(b.n)}')">
        <span style="font-size:.88rem">${esc(b.n)} <span class="sub" style="font-size:.7rem">›</span></span><b>${b.kg} kg</b></div>`).join("") + `</div>`;
  }

  const vols = [];
  const monNow = weekStart(t);
  for(let i=7;i>=0;i--){
    const ws = addDays(monNow, -7*i), we = addDays(ws, 6);
    vols.push(S.workouts.filter(w => w.date >= ws && w.date <= we).reduce((a,w)=>a+volume(w),0));
  }
  if(vols.some(v=>v>0)){
    out += `<div class="card"><h2 style="margin:0 0 10px;font-size:.95rem">Training volume — 8 weeks</h2>${barsSVG(vols, "#2bd984")}
      <div class="spread" style="margin-top:4px"><span class="sub" style="font-size:.7rem">8 weeks ago</span><span class="sub" style="font-size:.7rem">this week</span></div></div>`;
  }

  const typeCnt = {};
  S.workouts.filter(w => monthKey(w.date)===mk).forEach(w => typeCnt[w.type] = (typeCnt[w.type]||0) + 1);
  const tEntries = Object.entries(typeCnt).sort((a,b)=>b[1]-a[1]);
  if(tEntries.length){
    const total = tEntries.reduce((a,e)=>a+e[1],0);
    out += `<div class="card"><h2 style="margin:0 0 12px;font-size:.95rem">Workout split — this month</h2>
      <div class="row" style="gap:16px"><div style="width:132px;flex:none">${pieSVG(tEntries.map((e,i)=>({v:e[1], c:PALETTE[i%PALETTE.length]})), total)}</div>
      <div style="flex:1;min-width:0">` + tEntries.map((e,i) =>
        `<div class="spread" style="padding:3px 0"><span class="row" style="gap:7px;font-size:.82rem"><span style="width:10px;height:10px;border-radius:3px;background:${PALETTE[i%PALETTE.length]};flex:none"></span>${wIcon(e[0])} ${esc(e[0])}</span><span style="font-size:.82rem"><b>${e[1]}</b> <span class="sub">${Math.round(e[1]/total*100)}%</span></span></div>`).join("") +
      `</div></div></div>`;
  }
  if(!S.workouts.length) out += `<div class="empty"><span class="e">—</span>Log workouts to unlock stats.</div>`;
  return out;
}
function gymHistoryHTML(){
  const sorted = [...S.workouts].sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if(!sorted.length) return `<div class="empty"><span class="e">—</span>No workouts yet.<br>Start one from the Train tab.</div>`;
  let html = `<div class="sub" style="margin-bottom:4px">${sorted.length} workout${sorted.length>1?"s":""} logged</div>`, lastD = "";
  sorted.forEach(w => {
    if(w.date !== lastD){ html += `<div class="date-head">${fmtDay(w.date)}</div>`; lastD = w.date; }
    const exSub = (w.ex||[]).length ? w.ex.map(x=>esc(x.n)).join(", ") : esc(w.note);
    html += `<div class="item" onclick="openDetail('wo','${w.id}')"><div class="ico">${wIcon(w.type)}</div>
      <div class="bd"><div class="t">${esc(w.type)}${w.dur?` · ${w.dur} min`:""}${volume(w)?` · ${fmtVol(volume(w))}`:""}</div>${exSub?`<div class="s">${exSub}</div>`:""}</div></div>`;
  });
  return html;
}
