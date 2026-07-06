"use strict";
/* ============ gym.js — full training module ============
   Workouts with structured exercises, personal records,
   progress graphs, volume analytics, routines. */

/* ---- basics ---- */
function gymWeek(){
  const mon = weekStart(todayStr());
  return S.workouts.filter(w => w.date >= mon && w.date <= addDays(mon,6));
}
function bestKg(name, exceptId){
  let best = 0;
  S.workouts.forEach(w => {
    if(w.id === exceptId) return;
    (w.ex||[]).forEach(x => { if(x.n.toLowerCase() === name.toLowerCase() && x.kg > best) best = x.kg; });
  });
  return best;
}
function volume(w){ return (w.ex||[]).reduce((a,x)=>a + (x.sets||0)*(x.reps||0)*(x.kg||0), 0); }
function fmtVol(v){ return v >= 1000 ? (v/1000).toFixed(1) + " t" : Math.round(v) + " kg"; }
function openExPage(name){ openDetail("ex", encodeURIComponent(name)); }

/* ---- exercise analytics ---- */
function exNames(){
  const cnt = {};
  S.workouts.forEach(w => (w.ex||[]).forEach(x => {
    const k = x.n.trim(); if(!k) return;
    cnt[k] = (cnt[k]||0) + 1;
  }));
  return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
}
function exSessions(name){
  const out = [];
  S.workouts.forEach(w => {
    const xs = (w.ex||[]).filter(x => x.n.toLowerCase() === name.toLowerCase());
    if(xs.length){
      out.push({
        id: w.id, date: w.date, type: w.type,
        top: Math.max.apply(null, xs.map(x=>x.kg||0)),
        vol: xs.reduce((a,x)=>a + (x.sets||0)*(x.reps||0)*(x.kg||0), 0),
        xs
      });
    }
  });
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function pageExercise(name){
  const ses = exSessions(name);
  if(!ses.length) return null;
  const pr = Math.max.apply(null, ses.map(s=>s.top));
  const totVol = ses.reduce((a,s)=>a+s.vol,0);
  const hist = [...ses].reverse().map(s =>
    `<div class="item" onclick="openDetail('wo','${s.id}')">
      <div class="ico">${wIcon(s.type)}</div>
      <div class="bd"><div class="t">${fmtDay(s.date)}</div>
      <div class="s">${s.xs.map(x=>`${x.sets}×${x.reps}${x.kg?" @ "+x.kg+"kg":""}`).join(" · ")}</div></div>
      <div class="amt ${s.top===pr && s.top>0 ? "amb":""}">${s.top ? s.top+"kg" : ""}${s.top===pr && s.top>0 ? " 🏆" : ""}</div></div>`).join("");
  return pageHead(esc(name)) +
    `<div class="big-ico">🏋️</div>
     <div class="big-amt">${pr ? pr + " kg" : "—"}</div>
     <div class="big-sub">personal record · ${ses.length} session${ses.length>1?"s":""}</div>
     <div class="grid2" style="margin-bottom:12px">
       ${statCard("Sessions", ses.length, "pri")}
       ${statCard("Total volume", fmtVol(totVol), "grn")}
     </div>
     <div class="card"><h2 style="margin:0 0 8px;font-size:.95rem">Top weight per session</h2>${progressSVG(ses.map(s=>s.top), "#2bd984")}</div>
     <div class="card"><h2 style="margin:0 0 8px;font-size:.95rem">Volume per session</h2>${barsSVG(ses.map(s=>s.vol), "#7c5cff")}</div>
     <h2>History</h2>` + hist;
}

/* ---- exercise editor rows (shared by workout + routine modals) ---- */
function exRowHTML(i, x){
  return `<div class="ex-row">
    <input class="inp exn" placeholder="Exercise" value="${x?escq(x.n):""}">
    <input class="inp exs" inputmode="numeric" placeholder="4" value="${x && x.sets ? x.sets : ""}">
    <input class="inp exr" inputmode="numeric" placeholder="8" value="${x && x.reps ? x.reps : ""}">
    <input class="inp exk" inputmode="decimal" placeholder="60" value="${x && x.kg ? x.kg : ""}">
    <button class="x" onclick="rmExRow(${i})">✕</button></div>`;
}
function readExRaw(){
  return [...document.querySelectorAll("#ex-list .ex-row")].map(r => ({
    n: r.querySelector(".exn").value,
    sets: r.querySelector(".exs").value,
    reps: r.querySelector(".exr").value,
    kg: r.querySelector(".exk").value
  }));
}
function readExClean(){
  return readExRaw().map(x => ({
    n: String(x.n).trim(),
    sets: parseInt(x.sets,10) || 0,
    reps: parseInt(x.reps,10) || 0,
    kg: parseFloat(String(x.kg).replace(",",".")) || 0
  })).filter(x => x.n);
}
function drawExRows(){
  $("#ex-list").innerHTML =
    (M.ex.length ? `<div class="ex-head"><span>Exercise</span><span>Sets</span><span>Reps</span><span>Kg</span><span></span></div>` : "") +
    M.ex.map((x,i)=>exRowHTML(i,x)).join("");
}
function addExRow(){ M.ex = readExRaw(); M.ex.push({n:"",sets:"",reps:"",kg:""}); drawExRows(); }
function rmExRow(i){ M.ex = readExRaw(); M.ex.splice(i,1); drawExRows(); }

/* ---- workout type picker ---- */
function drawWTypes(){
  window._pickW = n => { M.wt = n; M.ex = readExRaw(); drawWTypes(); drawExRows(); };
  $("#w-types").innerHTML = S.wtypes.map(w =>
    `<button class="chip ${M.wt===w.n?"on":""}" onclick="_pickW('${escq(w.n)}')">${w.e} ${esc(w.n)}</button>`).join("") +
    `<button class="chip add" onclick="openNewWType()">+ New</button>`;
}
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

/* ---- workouts ---- */
function openWorkout(editId, routineId){
  const old = editId ? S.workouts.find(w=>w.id===editId) : null;
  const rt = routineId ? S.routines.find(r=>r.id===routineId) : null;
  M = {
    wt: old ? old.type : (rt ? rt.type : S.wtypes[0].n),
    editId: editId || null,
    ex: old ? (old.ex||[]).map(x=>({...x})) : (rt ? rt.ex.map(x=>({...x})) : [])
  };
  window._reopen = () => openWorkout(M.editId);
  openModal(`<h3>${old ? "Edit workout" : (rt ? "▶ " + esc(rt.name) : "Log workout")}</h3>
    <label class="f">Type</label>
    <div class="chips" id="w-types"></div>
    <div class="half">
      <div><label class="f">Duration (min)</label><input class="inp" id="w-dur" inputmode="numeric" placeholder="60" value="${old && old.dur ? old.dur : ""}"></div>
      <div><label class="f">Date</label><input class="inp" type="date" id="w-date" value="${old?old.date:todayStr()}"></div>
    </div>
    <label class="f">Exercises</label>
    <div id="ex-list"></div>
    <button class="btn btn-g mini" style="margin-bottom:12px" onclick="addExRow()">+ Add exercise</button>
    <label class="f">Note (optional)</label>
    <input class="inp" id="w-note" placeholder="How did it go?" value="${old?escq(old.note):""}">
    <button class="btn btn-p" onclick="saveWorkout()">${old ? "Save changes" : "Save workout"}</button>`);
  drawWTypes();
  drawExRows();
}
function saveWorkout(){
  const dur = parseInt($("#w-dur").value, 10);
  const note = $("#w-note").value.trim();
  const date = $("#w-date").value || todayStr();
  const ex = readExClean();
  const prs = [];
  ex.forEach(x => { if(x.kg > 0 && x.kg > bestKg(x.n, M.editId)) prs.push(esc(x.n) + " " + x.kg + "kg"); });
  if(M.editId){
    const w = S.workouts.find(x=>x.id===M.editId); if(!w) return;
    w.type = M.wt; w.dur = isNaN(dur)?0:dur; w.note = note; w.date = date; w.ex = ex;
    save(); closeModal(); render(); route(); toast(prs.length ? "🏆 New PR: " + prs[0] : "Updated ✓");
    return;
  }
  S.workouts.push({ id:uid(), type:M.wt, dur:isNaN(dur)?0:dur, note, date, ex });
  save(); closeModal(); render();
  toast(prs.length ? "🏆 New PR: " + prs[0] : "Workout logged 💪");
}
function delWorkout(id){
  confirmBox("Delete this workout?", ()=>{
    S.workouts = S.workouts.filter(w=>w.id!==id); save(); goBack(); render(); toast("Deleted");
  });
}
function pageWorkout(id){
  const w = S.workouts.find(x=>x.id===id); if(!w) return null;
  const vol = volume(w);
  const exHtml = (w.ex||[]).length ?
    `<div class="card"><h2 style="margin:0 0 6px;font-size:.95rem">Exercises</h2>` +
    w.ex.map(x => {
      const isPR = x.kg > 0 && x.kg >= bestKg(x.n);
      return `<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer" onclick="openExPage('${escq(x.n)}')">
        <span style="font-size:.9rem">${esc(x.n)}${isPR ? " 🏆" : ""} <span class="sub" style="font-size:.7rem">›</span></span>
        <b style="font-size:.88rem">${x.sets && x.reps ? x.sets + "×" + x.reps : ""}${x.kg ? " @ " + x.kg + "kg" : ""}</b></div>`;
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
    ((w.ex||[]).length ? `<button class="btn btn-g" style="width:100%;margin-top:4px" onclick="saveAsRoutine('${w.id}')">💾 Save as routine</button>` : "") +
    pageActions(`openWorkout('${w.id}')`, `delWorkout('${w.id}')`);
}

/* ---- routines ---- */
function openRoutineModal(editId){
  const old = editId ? S.routines.find(r=>r.id===editId) : null;
  M = { wt: old ? old.type : S.wtypes[0].n, rtEditId: editId || null, ex: old ? old.ex.map(x=>({...x})) : [] };
  window._reopen = () => openRoutineModal(M.rtEditId);
  openModal(`<h3>${old ? "Edit routine" : "New routine"}</h3>
    <label class="f">Name</label>
    <input class="inp" id="rt-name" placeholder="e.g. Push day A" value="${old?escq(old.name):""}">
    <label class="f">Type</label>
    <div class="chips" id="w-types"></div>
    <label class="f">Exercises</label>
    <div id="ex-list"></div>
    <button class="btn btn-g mini" style="margin-bottom:12px" onclick="addExRow()">+ Add exercise</button>
    <button class="btn btn-p" onclick="saveRoutine()">${old ? "Save changes" : "Create routine"}</button>`);
  drawWTypes();
  drawExRows();
  if(!old) focusIn("#rt-name");
}
function saveRoutine(){
  const name = $("#rt-name").value.trim();
  if(!name){ toast("Give the routine a name"); return; }
  const ex = readExClean();
  if(!ex.length){ toast("Add at least one exercise"); return; }
  if(M.rtEditId){
    const r = S.routines.find(x=>x.id===M.rtEditId); if(!r) return;
    r.name = name; r.type = M.wt; r.ex = ex;
    save(); closeModal(); render(); route(); toast("Routine updated ✓");
    return;
  }
  S.routines.push({ id:uid(), name, type:M.wt, ex });
  save(); closeModal(); render(); toast("Routine created ✓");
}
function delRoutine(id){
  confirmBox("Delete this routine? Logged workouts stay.", ()=>{
    S.routines = S.routines.filter(r=>r.id!==id); save(); goBack(); render(); toast("Deleted");
  });
}
function startRoutine(id){ openWorkout(null, id); }
function saveAsRoutine(workoutId){
  const w = S.workouts.find(x=>x.id===workoutId); if(!w || !(w.ex||[]).length) return;
  window._srw = workoutId;
  openModal(`<h3>Save as routine</h3>
    <label class="f">Routine name</label>
    <input class="inp" id="sr-name" placeholder="e.g. ${escq(w.type)} day" value="${escq(w.type)} routine">
    <button class="btn btn-p" onclick="confirmSaveAsRoutine()">Save</button>`);
  focusIn("#sr-name");
}
function confirmSaveAsRoutine(){
  const w = S.workouts.find(x=>x.id===window._srw); if(!w) return;
  const name = $("#sr-name").value.trim() || (w.type + " routine");
  S.routines.push({ id:uid(), name, type:w.type, ex:(w.ex||[]).map(x=>({...x})) });
  save(); closeModal(); render(); toast("Routine saved ✓");
}
function pageRoutine(id){
  const r = S.routines.find(x=>x.id===id); if(!r) return null;
  return pageHead("Routine") +
    `<div class="big-ico">${wIcon(r.type)}</div>
     <div class="big-amt" style="font-size:1.4rem">${esc(r.name)}</div>
     <div class="big-sub">${esc(r.type)} · ${r.ex.length} exercises</div>
     <button class="btn btn-p" style="margin-bottom:14px" onclick="startRoutine('${r.id}')">▶ Start this workout</button>
     <div class="card">` +
    r.ex.map(x => `<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line)">
      <span style="font-size:.9rem">${esc(x.n)}</span>
      <b style="font-size:.88rem">${x.sets}×${x.reps}${x.kg ? " @ " + x.kg + "kg" : ""}</b></div>`).join("") +
    `</div>` +
    pageActions(`openRoutineModal('${r.id}')`, `delRoutine('${r.id}')`);
}

/* ---- progress card state ---- */
let exSel = null;
function pickProg(n){ exSel = n; renderGym(); }

/* ---- render ---- */
function renderGym(){
  const t = todayStr();
  const wk = gymWeek();
  const mins = wk.reduce((a,w)=>a+(w.dur||0),0);
  const mk = monthKey(t);
  const mCount = S.workouts.filter(w => monthKey(w.date)===mk).length;
  const wkVol = wk.reduce((a,w)=>a+volume(w),0);
  $("#gym-stats").innerHTML =
    statCard("This week", wk.length + (wk.length===1?" workout":" workouts"), "pri") +
    statCard("Active minutes (wk)", mins + " min", "grn") +
    statCard("This month", mCount + (mCount===1?" workout":" workouts"), "amb") +
    statCard("Volume (wk)", wkVol ? fmtVol(wkVol) : "—", "blu");

  /* routines */
  $("#routine-list").innerHTML = S.routines.length ? S.routines.map(r =>
    `<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line)">
      <span class="row" style="gap:8px;min-width:0;cursor:pointer" onclick="openDetail('rt','${r.id}')">
        <span>${wIcon(r.type)}</span>
        <span style="min-width:0"><span style="font-size:.9rem;font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</span>
        <span class="sub" style="font-size:.72rem">${r.ex.length} exercises</span></span></span>
      <button class="btn btn-g mini" style="flex:none" onclick="startRoutine('${r.id}')">▶ Start</button></div>`).join("")
    : `<div class="sub" style="padding:4px 0">Save your favourite workouts as routines and start them in one tap.</div>`;

  /* personal records */
  const best = {};
  S.workouts.forEach(w => (w.ex||[]).forEach(x => {
    const k = x.n.toLowerCase();
    if(x.kg > 0 && x.kg > (best[k] ? best[k].kg : 0)) best[k] = { n:x.n, kg:x.kg, reps:x.reps };
  }));
  const tops = Object.values(best).sort((a,b)=>b.kg-a.kg).slice(0,6);
  $("#pr-card").style.display = tops.length ? "" : "none";
  $("#pr-list").innerHTML = tops.map(b =>
    `<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--line);cursor:pointer" onclick="openExPage('${escq(b.n)}')">
     <span style="font-size:.88rem">${esc(b.n)} <span class="sub" style="font-size:.7rem">›</span></span><b>${b.kg} kg${b.reps ? " × " + b.reps : ""}</b></div>`).join("");

  /* exercise progress */
  const names = exNames().slice(0, 8);
  $("#prog-card").style.display = names.length ? "" : "none";
  if(names.length){
    if(!exSel || !names.some(n => n.toLowerCase() === exSel.toLowerCase())) exSel = names[0];
    $("#prog-chips").innerHTML = names.map(n =>
      `<button class="chip ${n.toLowerCase()===exSel.toLowerCase()?"on":""}" onclick="pickProg('${escq(n)}')">${esc(n)}</button>`).join("");
    const ses = exSessions(exSel);
    $("#prog-chart").innerHTML = progressSVG(ses.map(s=>s.top), "#2bd984") +
      `<button class="btn btn-g mini" style="width:100%;margin-top:8px" onclick="openExPage('${escq(exSel)}')">Full history →</button>`;
  }

  /* 8-week volume */
  const vols = [];
  const monNow = weekStart(t);
  for(let i=7;i>=0;i--){
    const ws = addDays(monNow, -7*i), we = addDays(ws, 6);
    vols.push(S.workouts.filter(w => w.date >= ws && w.date <= we).reduce((a,w)=>a+volume(w),0));
  }
  $("#vol-card").style.display = vols.some(v=>v>0) ? "" : "none";
  $("#vol-chart").innerHTML = barsSVG(vols, "#2bd984") +
    `<div class="spread" style="margin-top:4px"><span class="sub" style="font-size:.7rem">8 weeks ago</span><span class="sub" style="font-size:.7rem">this week</span></div>`;

  /* workout type split (this month) */
  const typeCnt = {};
  S.workouts.filter(w => monthKey(w.date)===mk).forEach(w => typeCnt[w.type] = (typeCnt[w.type]||0) + 1);
  const tEntries = Object.entries(typeCnt).sort((a,b)=>b[1]-a[1]);
  $("#type-card").style.display = tEntries.length ? "" : "none";
  if(tEntries.length){
    const total = tEntries.reduce((a,e)=>a+e[1],0);
    $("#type-pie").innerHTML = pieSVG(tEntries.map((e,i)=>({v:e[1], c:PALETTE[i%PALETTE.length]})), total);
    $("#type-legend").innerHTML = tEntries.map((e,i) =>
      `<div class="spread" style="padding:3px 0"><span class="row" style="gap:7px;font-size:.82rem"><span style="width:10px;height:10px;border-radius:3px;background:${PALETTE[i%PALETTE.length]};flex:none"></span>${wIcon(e[0])} ${esc(e[0])}</span><span style="font-size:.82rem"><b>${e[1]}</b> <span class="sub">${Math.round(e[1]/total*100)}%</span></span></div>`).join("");
  }

  /* log */
  const sorted = [...S.workouts].sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if(!sorted.length){
    $("#workout-list").innerHTML = `<div class="empty"><span class="e">💪</span>No workouts yet.<br>Log your first one above!</div>`;
    return;
  }
  let html = "", lastD = "";
  sorted.forEach(w => {
    if(w.date !== lastD){ html += `<div class="date-head">${fmtDay(w.date)}</div>`; lastD = w.date; }
    const exSub = (w.ex||[]).length ? w.ex.map(x=>esc(x.n)).join(", ") : esc(w.note);
    html += `<div class="item" onclick="openDetail('wo','${w.id}')"><div class="ico">${wIcon(w.type)}</div>
      <div class="bd"><div class="t">${esc(w.type)}${w.dur?` · ${w.dur} min`:""}${volume(w)?` · ${fmtVol(volume(w))}`:""}</div>${exSub?`<div class="s">${exSub}</div>`:""}</div></div>`;
  });
  $("#workout-list").innerHTML = html;
}
