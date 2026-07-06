"use strict";
/* ============ habits.js — daily habits & streaks ============ */

function addHabit(){
  const inp = $("#habit-inp");
  const n = inp.value.trim();
  if(!n){ toast("Type a habit name"); return; }
  S.habits.push({ id:uid(), name:n, days:{} });
  inp.value = ""; save(); renderHabits(); toast("Habit added ✓");
}
function toggleHabit(id, ds){
  const h = S.habits.find(x=>x.id===id); if(!h) return;
  if(h.days[ds]) delete h.days[ds]; else h.days[ds] = true;
  save(); render();
}
function delHabit(id){
  confirmBox("Delete this habit and its history?", ()=>{
    S.habits = S.habits.filter(h=>h.id!==id); save(); render(); toast("Deleted");
  });
}
function streak(h){
  let s = 0, d = todayStr();
  if(!h.days[d]) d = addDays(d,-1);
  while(h.days[d]){ s++; d = addDays(d,-1); }
  return s;
}
function renderHabits(){
  const t = todayStr();
  const doneT = S.habits.filter(h=>h.days[t]).length;
  let best = 0, wk7 = 0;
  S.habits.forEach(h => {
    best = Math.max(best, streak(h));
    for(let i=0;i<7;i++) if(h.days[addDays(t,-i)]) wk7++;
  });
  const pct7 = S.habits.length ? Math.round(wk7 / (S.habits.length*7) * 100) : 0;
  $("#habit-stats").innerHTML =
    statCard("Today", S.habits.length ? doneT + "/" + S.habits.length : "—", "grn") +
    statCard("Last 7 days", pct7 + "%", pct7 >= 60 ? "grn" : "amb") +
    statCard("Best streak", best ? "🔥 " + best + "d" : "—", "pri") +
    statCard("Habits", S.habits.length, "");
  if(!S.habits.length){
    $("#habit-list").innerHTML = `<div class="empty"><span class="e">🔥</span>No habits yet.<br>Add one above — tap a day to mark it done.</div>`;
    return;
  }
  $("#habit-list").innerHTML = S.habits.map(h => {
    const st = streak(h);
    let cells = "";
    for(let i=6;i>=0;i--){
      const ds = addDays(t,-i);
      const dd = parseD(ds);
      cells += `<div class="hd ${h.days[ds]?"on":""} ${ds===t?"today":""}" onclick="toggleHabit('${h.id}','${ds}')">
        <div class="n">${dd.toLocaleDateString("en-US",{weekday:"short"}).slice(0,1)}</div>
        <div class="m">${h.days[ds] ? "✓" : dd.getDate()}</div></div>`;
    }
    return `<div class="card"><div class="spread">
      <b>${esc(h.name)}</b>
      <div class="row"><span class="sub">${st ? "🔥 " + st + " day" + (st>1?"s":"") : ""}</span>
      <button class="x" onclick="delHabit('${h.id}')">✕</button></div></div>
      <div class="hdays">${cells}</div></div>`;
  }).join("");
}
