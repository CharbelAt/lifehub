"use strict";
/* ============ planner.js — month calendar, events (multi-day), tasks ============ */

let calMonth = monthKey(todayStr());
let selDate = todayStr();

function occursOn(e, ds){ return e.start <= ds && ds <= e.end; }
function moveCal(d){
  const [y,m] = calMonth.split("-").map(Number);
  const dt = new Date(y, m-1+d, 1);
  calMonth = dt.getFullYear() + "-" + String(dt.getMonth()+1).padStart(2,"0");
  if(monthKey(selDate) !== calMonth) selDate = calMonth + "-01";
  renderPlan();
}
function calToday(){ calMonth = monthKey(todayStr()); selDate = todayStr(); renderPlan(); }
function pickDay(ds){
  selDate = ds;
  if(monthKey(ds) !== calMonth) calMonth = monthKey(ds);
  renderPlan();
}

/* ---- events ---- */
function openEvent(editId){
  const old = editId ? S.events.find(e=>e.id===editId) : null;
  M = { editId: editId || null };
  openModal(`<h3>${old ? "Edit event" : "New event"}</h3>
    <label class="f">What?</label>
    <input class="inp" id="ev-title" placeholder="e.g. Trip to the mountains" value="${old?escq(old.title):""}">
    <div class="half">
      <div><label class="f">Starts</label><input class="inp" type="date" id="ev-start" value="${old?old.start:selDate}"></div>
      <div><label class="f">Ends</label><input class="inp" type="date" id="ev-end" value="${old?old.end:selDate}"></div>
    </div>
    <label class="f">Time (optional — for the first day)</label>
    <input class="inp" type="time" id="ev-time" value="${old?old.time:""}">
    <label class="f">Note (optional)</label>
    <input class="inp" id="ev-note" placeholder="Location, details…" value="${old?escq(old.note):""}">
    <button class="btn btn-p" onclick="saveEvent()">${old ? "Save changes" : "Add event"}</button>`);
  if(!old) focusIn("#ev-title");
}
function saveEvent(){
  const title = $("#ev-title").value.trim();
  if(!title){ toast("Give the event a name"); return; }
  let start = $("#ev-start").value || selDate;
  let end = $("#ev-end").value || start;
  if(end < start){ const tmp = start; start = end; end = tmp; }
  const time = $("#ev-time").value || "";
  const note = $("#ev-note").value.trim();
  if(M.editId){
    const e = S.events.find(x=>x.id===M.editId); if(!e) return;
    e.title = title; e.start = start; e.end = end; e.time = time; e.note = note;
    save(); closeModal(); render(); route(); toast("Updated ✓");
    return;
  }
  S.events.push({ id:uid(), title, start, end, time, note });
  selDate = start; calMonth = monthKey(start);
  save(); closeModal(); render(); toast("Event added ✓");
}
function delEvent(id){
  confirmBox("Delete this event?", ()=>{
    S.events = S.events.filter(e=>e.id!==id); save(); goBack(); render(); toast("Deleted");
  });
}
function pageEvent(id){
  const e = S.events.find(x=>x.id===id); if(!e) return null;
  const days = daysBetween(e.start, e.end) + 1;
  return pageHead("Event") +
    `<div class="big-ico">📅</div>
     <div class="big-amt" style="font-size:1.4rem">${esc(e.title)}</div>
     <div class="big-sub">${days > 1 ? days + "-day event" : fmtDay(e.start)}</div>
     <div class="card">` +
    field("Starts", fmtDayFull(e.start) + (e.time ? " · " + fmtTime(e.time) : "")) +
    (days > 1 ? field("Ends", fmtDayFull(e.end)) : "") +
    field("Duration", days > 1 ? days + " days" : (e.time ? fmtTime(e.time) : "All day")) +
    (e.note ? field("Note", esc(e.note)) : "") +
    `</div>` +
    pageActions(`closeModal();openEvent('${e.id}')`, `delEvent('${e.id}')`);
}

/* ---- tasks ---- */
const PRI = { high:["var(--red)","High"], med:["var(--amb)","Medium"], low:["var(--grn)","Low"] };
function openTask(due, editId){
  const old = editId ? S.tasks.find(t=>t.id===editId) : null;
  M = { pri: old ? old.pri : "med", editId: editId || null };
  openModal(`<h3>${old ? "Edit task" : "New task"}</h3>
    <label class="f">What do you need to do?</label>
    <input class="inp" id="tk-title" placeholder="e.g. Pay electricity bill" value="${old?escq(old.title):""}">
    <label class="f">Priority</label>
    <div class="seg" id="tk-pri">
      <button class="${M.pri==="low"?"on":""}" onclick="setPri('low')">Low</button>
      <button class="${M.pri==="med"?"on":""}" onclick="setPri('med')">Medium</button>
      <button class="${M.pri==="high"?"on":""}" onclick="setPri('high')">High</button>
    </div>
    <label class="f">Due date (optional)</label>
    <input class="inp" type="date" id="tk-due" value="${old ? (old.due||"") : (due || selDate || "")}">
    <label class="f">Note (optional)</label>
    <input class="inp" id="tk-note" placeholder="Details…" value="${old?escq(old.note||""):""}">
    <button class="btn btn-p" onclick="saveTask()">${old ? "Save changes" : "Add task"}</button>`);
  if(!old) focusIn("#tk-title");
}
function setPri(p){
  M.pri = p;
  const btns = $("#tk-pri").querySelectorAll("button");
  ["low","med","high"].forEach((k,i)=>btns[i].classList.toggle("on", k===p));
}
function saveTask(){
  const t = $("#tk-title").value.trim();
  if(!t){ toast("Write the task first"); return; }
  const due = $("#tk-due").value || null;
  const note = $("#tk-note").value.trim();
  if(M.editId){
    const k = S.tasks.find(x=>x.id===M.editId); if(!k) return;
    k.title = t; k.pri = M.pri; k.due = due; k.note = note;
    save(); closeModal(); render(); route(); toast("Updated ✓");
    return;
  }
  S.tasks.push({ id:uid(), title:t, pri:M.pri, due, note, done:false });
  save(); closeModal(); render(); toast("Task added ✓");
}
function toggleTask(id){
  const t = S.tasks.find(x=>x.id===id); if(!t) return;
  t.done = !t.done; save(); render();
  if(location.hash.includes(id)) route();
}
function delTask(id){
  confirmBox("Delete this task?", ()=>{
    S.tasks = S.tasks.filter(t=>t.id!==id); save(); goBack(); render(); toast("Deleted");
  });
}
function pageTask(id){
  const t = S.tasks.find(x=>x.id===id); if(!t) return null;
  return pageHead("Task") +
    `<div class="big-ico">${t.done ? "✅" : "📝"}</div>
     <div class="big-amt" style="font-size:1.4rem;${t.done?"text-decoration:line-through;color:var(--mut)":""}">${esc(t.title)}</div>
     <div class="big-sub">${t.done ? "Completed" : (t.due ? (t.due < todayStr() ? "⚠️ Overdue — was due " + fmtDay(t.due) : "Due " + fmtDay(t.due)) : "No due date")}</div>
     <button class="btn ${t.done?"btn-g":"btn-p"}" style="margin-bottom:14px" onclick="toggleTask('${t.id}')">${t.done ? "↩︎ Mark as not done" : "✓ Mark as done"}</button>
     <div class="card">` +
    field("Priority", `<span style="color:${PRI[t.pri][0]}">●</span> ` + PRI[t.pri][1]) +
    field("Due", t.due ? fmtDayFull(t.due) : "—") +
    field("Status", t.done ? "Done" : "Open") +
    (t.note ? field("Note", esc(t.note)) : "") +
    `</div>` +
    pageActions(`openTask(null,'${t.id}')`, `delTask('${t.id}')`);
}
function taskRow(t){
  const dueTxt = t.due ? (t.done ? fmtDay(t.due) : (t.due < todayStr() ? `<span class="red">Overdue · ${fmtDay(t.due)}</span>` : fmtDay(t.due))) : "";
  return `<div class="item ${t.done?"task-done":""}" onclick="openDetail('tk','${t.id}')">
    <button class="ck ${t.done?"on":""}" onclick="event.stopPropagation();toggleTask('${t.id}')">${t.done?"✓":""}</button>
    <div class="bd"><div class="t">${esc(t.title)}</div>${dueTxt?`<div class="s">${dueTxt}</div>`:""}</div>
    <span class="pdot" style="background:${PRI[t.pri][0]}"></span></div>`;
}
function eventRow(e, ds){
  const days = daysBetween(e.start, e.end) + 1;
  const dayN = ds ? daysBetween(e.start, ds) + 1 : 1;
  const sub = days > 1
    ? `${fmtDay(e.start)} → ${fmtDay(e.end)} · day ${dayN}/${days}`
    : fmtTime(e.time) + (e.note ? " · " + esc(e.note) : "");
  return `<div class="item" onclick="openDetail('ev','${e.id}')">
    <div class="ico">${days > 1 ? "🗓️" : "🕒"}</div>
    <div class="bd"><div class="t">${esc(e.title)}</div><div class="s">${sub}</div></div></div>`;
}

/* ---- render ---- */
function renderPlan(){
  const [y,m] = calMonth.split("-").map(Number);
  $("#cal-label").textContent = new Date(y, m-1, 1).toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const first = calMonth + "-01";
  const gridStart = weekStart(first);
  const today = todayStr();
  let cells = "";
  for(let i=0;i<42;i++){
    const ds = addDays(gridStart, i);
    const inMonth = monthKey(ds) === calMonth;
    const evs = S.events.filter(e => occursOn(e, ds));
    const hasT = S.tasks.some(k => !k.done && k.due === ds);
    const multi = evs.some(e => e.end > e.start);
    cells += `<div class="cd ${inMonth?"":"out"} ${ds===today?"today":""} ${ds===selDate?"sel":""}" onclick="pickDay('${ds}')">
      <span class="n">${parseD(ds).getDate()}</span>
      <span class="dots">${evs.length?'<i class="ev"></i>':""}${hasT?'<i class="tk"></i>':""}</span>
      ${multi?'<span class="rng"></span>':""}</div>`;
  }
  $("#cal-grid").innerHTML = cells;
  const mEv = S.events.filter(e => monthKey(e.start) === calMonth || monthKey(e.end) === calMonth).length;
  $("#cal-count").textContent = mEv ? mEv + (mEv===1 ? " event" : " events") : "";

  const open = S.tasks.filter(t=>!t.done);
  const over = open.filter(t=>t.due && t.due < today);
  const wkMon = weekStart(today);
  const evWk = S.events.filter(e => e.start <= addDays(wkMon,6) && e.end >= wkMon).length;
  $("#plan-stats").innerHTML =
    statCard("Events (wk)", evWk, "amb") +
    statCard("Open tasks", open.length, "pri") +
    statCard("Overdue", over.length, over.length ? "red" : "grn") +
    statCard("Done", S.tasks.filter(t=>t.done).length, "grn");

  $("#sel-date-label").textContent = fmtDay(selDate) + " · " + parseD(selDate).toLocaleDateString("en-US",{month:"long",day:"numeric"});
  const dayEv = S.events.filter(e => occursOn(e, selDate)).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  const dayTk = S.tasks.filter(k => k.due === selDate);
  let ag = "";
  if(dayEv.length) ag += dayEv.map(e => eventRow(e, selDate)).join("");
  if(dayTk.length) ag += `<div class="date-head">✅ Tasks due</div>` + dayTk.map(taskRow).join("");
  $("#agenda").innerHTML = ag || `<div class="empty" style="padding:20px 10px"><span class="e">🗓️</span>Nothing planned — add an event or task above.</div>`;

  $("#task-count").textContent = open.length ? open.length + " open" : "";
  const pw = { high:0, med:1, low:2 };
  open.sort((a,b) => (a.due||"9999") < (b.due||"9999") ? -1 : (a.due||"9999") > (b.due||"9999") ? 1 : pw[a.pri]-pw[b.pri]);
  const g = { over:[], today:[], later:[], someday:[] };
  open.forEach(t => {
    if(!t.due) g.someday.push(t);
    else if(t.due < today) g.over.push(t);
    else if(t.due === today) g.today.push(t);
    else g.later.push(t);
  });
  const done = S.tasks.filter(t=>t.done);
  let html = "";
  const sec = (label, arr) => { if(arr.length){ html += `<div class="date-head">${label}</div>` + arr.map(taskRow).join(""); } };
  sec("⚠️ Overdue", g.over); sec("Today", g.today); sec("Upcoming", g.later); sec("Someday", g.someday);
  if(done.length) html += `<div class="date-head">Done (${done.length})</div>` + done.slice(-10).reverse().map(taskRow).join("");
  if(!html) html = `<div class="empty"><span class="e">🎉</span>No tasks.<br>Add one to get started.</div>`;
  $("#task-list").innerHTML = html;
}
