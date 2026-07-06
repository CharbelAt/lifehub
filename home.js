"use strict";
/* ============ home.js — dashboard ============ */

function renderHome(){
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  $("#greet").textContent = g + ", " + S.name + " 👋";
  $("#greet-date").textContent = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  $("#home-bal").textContent = balTxt();
  const mk = monthKey(todayStr());
  const tx = S.tx.filter(t => monthKey(t.date) === mk);
  const inc = tx.filter(t=>t.type==="inc").reduce((a,t)=>a+t.amount,0);
  const exp = tx.filter(t=>t.type==="exp").reduce((a,t)=>a+t.amount,0);
  $("#home-spent").textContent = fmt(exp);
  $("#home-earned").textContent = fmt(inc);
  $("#home-bal-sub").textContent = "This month: " + fmtS(inc - exp);

  /* today */
  const today = todayStr();
  const due = S.tasks.filter(t=>!t.done && t.due && t.due <= today);
  const evs = S.events.filter(e => occursOn(e, today)).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  let html = "";
  if(due.length) html += due.slice(0,3).map(t =>
    `<div class="row" style="padding:7px 0;cursor:pointer" onclick="openDetail('tk','${t.id}')"><button class="ck" onclick="event.stopPropagation();toggleTask('${t.id}')"></button>
     <span style="font-size:.9rem">${esc(t.title)}</span>
     ${t.due < today ? '<span class="sub red" style="margin-left:auto;font-size:.72rem">overdue</span>' : ""}</div>`).join("");
  if(evs.length) html += evs.slice(0,3).map(e =>
    `<div class="row" style="padding:7px 0;cursor:pointer" onclick="openDetail('ev','${e.id}')"><span>${e.end > e.start ? "🗓️" : "🕒"}</span><span style="font-size:.9rem">${esc(e.title)}</span>
     <span class="sub" style="margin-left:auto;font-size:.75rem">${e.end > e.start ? "day " + (daysBetween(e.start,today)+1) + "/" + (daysBetween(e.start,e.end)+1) : fmtTime(e.time)}</span></div>`).join("");
  const moreT = due.length - Math.min(due.length,3);
  if(moreT > 0) html += `<div class="sub" style="padding-top:6px">+ ${moreT} more task${moreT>1?"s":""}…</div>`;
  $("#home-today").innerHTML = html || `<div class="sub" style="text-align:center;padding:8px">Free day — nothing due, nothing planned ✨</div>`;

  /* overview */
  const open = S.tasks.filter(t=>!t.done);
  const over = open.filter(t=>t.due && t.due < today);
  const wkMon = weekStart(today);
  const evWeek = S.events.filter(e => e.start <= addDays(wkMon,6) && e.end >= wkMon).length;
  const gw = gymWeek();
  const habDone = S.habits.filter(x=>x.days[today]).length;
  const waterT = S.water[today]||0;
  const sl=[]; for(let i=6;i>=0;i--){ const v=S.sleep[addDays(today,-i)]; if(v) sl.push(v); }
  const slAvg = sl.length ? (sl.reduce((a,b)=>a+b,0)/sl.length).toFixed(1) : null;
  const slLast = S.sleep[today] || S.sleep[addDays(today,-1)] || null;
  const spend14 = [];
  for(let i=13;i>=0;i--){
    const ds = addDays(today,-i);
    spend14.push(S.tx.filter(t=>t.type==="exp" && t.date===ds).reduce((a,t)=>a+t.amount,0));
  }
  $("#home-grid").innerHTML =
    `<div class="stat" style="grid-column:1/-1;cursor:pointer" onclick="showTab('money')">
       <div class="spread"><div class="l">💸 Spending — last 14 days</div><div class="l"><b class="red">${fmt(spend14.reduce((a,b)=>a+b,0))}</b></div></div>
       ${sparkLineSVG(spend14, "#ff5d73")}</div>` +
    statCard("✅ Tasks", open.length + " open", "pri", over.length ? `⚠️ ${over.length} overdue` : "all on track ✓", "plan") +
    statCard("📅 This week", evWeek + (evWeek===1?" event":" events"), "amb", evs.length + " today", "plan") +
    `<div class="stat" style="cursor:pointer" onclick="openGym()"><div class="l">🏋️ Gym</div><div class="v grn">${gw.length + (gw.length===1?" workout":" workouts")}</div><div class="l" style="margin-top:3px">${gw.reduce((a,w)=>a+(w.dur||0),0)} min this week</div></div>` +
    statCard("🔥 Habits", S.habits.length ? Math.round(habDone/S.habits.length*100) + "%" : "—", "grn", S.habits.length ? habDone + "/" + S.habits.length + " done today" : "none yet", "habits") +
    statCard("💧 Water", waterT + "/" + S.waterGoal, "blu", "glasses today", "health") +
    statCard("😴 Sleep", slLast ? slLast + "h" : "—", "amb", slAvg ? "7-day avg " + slAvg + "h" : "log your sleep", "health");

  /* habits quick toggles */
  if(!S.habits.length){
    $("#home-habits").innerHTML = `<div class="sub" style="text-align:center;padding:8px">No habits yet — add some in the Habits tab</div>`;
    $("#home-habit-count").textContent = "";
  } else {
    const done = S.habits.filter(h=>h.days[today]).length;
    $("#home-habit-count").textContent = done + "/" + S.habits.length + " done";
    $("#home-habits").innerHTML =
      `<div class="row" style="margin-bottom:12px"><div class="hbar"><div style="width:${S.habits.length?done/S.habits.length*100:0}%"></div></div></div>` +
      `<div class="chips" style="margin:0">` + S.habits.map(h =>
        `<button class="chip ${h.days[today]?"on":""}" onclick="toggleHabit('${h.id}','${today}')">${h.days[today]?"✓ ":""}${esc(h.name)}</button>`).join("") + `</div>`;
  }
}
