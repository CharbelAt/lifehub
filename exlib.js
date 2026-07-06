"use strict";
/* ============ exlib.js — exercise library ============ */

const EXLIB = {
  "Chest": ["Bench Press","Incline Bench Press","Decline Bench Press","Dumbbell Press","Incline Dumbbell Press","Chest Fly","Cable Crossover","Push-ups","Dips"],
  "Back": ["Deadlift","Pull-ups","Chin-ups","Lat Pulldown","Barbell Row","Dumbbell Row","Seated Cable Row","T-Bar Row","Face Pull","Back Extension"],
  "Shoulders": ["Overhead Press","Dumbbell Shoulder Press","Arnold Press","Lateral Raise","Front Raise","Rear Delt Fly","Upright Row","Shrugs"],
  "Arms": ["Barbell Curl","Dumbbell Curl","Hammer Curl","Preacher Curl","Cable Curl","Tricep Pushdown","Skull Crushers","Overhead Tricep Extension","Close-Grip Bench Press"],
  "Legs": ["Squat","Front Squat","Leg Press","Lunges","Bulgarian Split Squat","Romanian Deadlift","Leg Extension","Leg Curl","Hip Thrust","Calf Raise","Goblet Squat"],
  "Core": ["Plank","Crunches","Sit-ups","Leg Raise","Russian Twist","Cable Crunch","Ab Wheel","Mountain Climbers"],
  "Cardio": ["Treadmill","Running","Cycling","Rowing Machine","Stair Climber","Elliptical","Jump Rope","Swimming"]
};
const MUSCLE_ICON = { "Chest":"🫁","Back":"🔙","Shoulders":"🤷","Arms":"💪","Legs":"🦵","Core":"🧱","Cardio":"🏃","Custom":"⭐" };

function exMuscle(name){
  const low = name.toLowerCase();
  for(const g in EXLIB){ if(EXLIB[g].some(e => e.toLowerCase() === low)) return g; }
  return "Custom";
}
function exLibAll(){
  const out = [];
  for(const g in EXLIB) EXLIB[g].forEach(n => out.push({ n, g }));
  (S.customEx||[]).forEach(n => out.push({ n, g:"Custom" }));
  return out;
}

/* pick mode: when opened from a workout session, tapping adds the exercise */
let exQuery = "";
function openExLib(pick){
  window._exPick = !!pick;
  exQuery = "";
  openDetail("exlib", "all");
}
function exLibSearch(v){ exQuery = v; $("#exlib-list").innerHTML = exLibListHTML(); }
function exLibListHTML(){
  const q = exQuery.trim().toLowerCase();
  const all = exLibAll().filter(e => !q || e.n.toLowerCase().includes(q));
  if(!all.length) return `<div class="empty"><span class="e">🔍</span>Nothing matches — add it as a custom exercise above.</div>`;
  const groups = {};
  all.forEach(e => { (groups[e.g] = groups[e.g] || []).push(e.n); });
  let html = "";
  Object.keys(groups).forEach(g => {
    html += `<div class="date-head">${MUSCLE_ICON[g]||"🏋️"} ${g}</div>`;
    html += groups[g].map(n => {
      const done = exSessions(n).length;
      return `<div class="item" onclick="pickLibEx('${escq(n)}')">
        <div class="ico">${MUSCLE_ICON[g]||"🏋️"}</div>
        <div class="bd"><div class="t">${esc(n)}</div><div class="s">${g}${done ? " · " + done + " session" + (done>1?"s":"") : ""}</div></div>
        ${window._exPick ? '<span class="pri" style="font-size:1.2rem;font-weight:700">+</span>' : (done ? '<span class="sub">›</span>' : "")}</div>`;
    }).join("");
  });
  return html;
}
function pickLibEx(name){
  if(window._exPick){
    addExToSession(name);
    history.back();
  } else {
    if(exSessions(name).length) openExPage(name);
    else toast("No sessions logged for this yet");
  }
}
function pageExLib(){
  return pageHead(window._exPick ? "Add exercise" : "Exercise library") +
    `<input class="inp" placeholder="🔍 Search exercises…" value="${escq(exQuery)}" oninput="exLibSearch(this.value)">
     <button class="btn btn-g mini" style="margin-bottom:8px" onclick="openCustomEx()">+ Custom exercise</button>
     <div id="exlib-list">${exLibListHTML()}</div>`;
}
function openCustomEx(){
  openModal(`<h3>Custom exercise</h3>
    <label class="f">Name</label>
    <input class="inp" id="cx-n" placeholder="e.g. Landmine Press">
    <button class="btn btn-p" onclick="saveCustomEx()">Add</button>`);
  focusIn("#cx-n");
}
function saveCustomEx(){
  const n = $("#cx-n").value.trim();
  if(!n){ toast("Give it a name"); return; }
  if(exLibAll().some(e => e.n.toLowerCase() === n.toLowerCase())){ toast("Already in the library"); return; }
  S.customEx.push(n);
  save(); closeModal();
  if(window._exPick){ addExToSession(n); history.back(); }
  else route();
  toast("Added to library ✓");
}
