"use strict";
/* ============ health.js — reminders/notifications, water, sleep, weight ============ */

/* ---- system notifications ---- */
async function sysNotify(title, body){
  try{
    if(!("Notification" in window) || Notification.permission !== "granted") return false;
    if("serviceWorker" in navigator){
      const reg = await navigator.serviceWorker.getRegistration();
      if(reg && reg.showNotification){
        await reg.showNotification(title, { body, icon:"icon.svg", badge:"icon.svg", vibrate:[300,120,300], tag:"lifehub-remind", renotify:true });
        return true;
      }
    }
    new Notification(title, { body });
    return true;
  }catch(e){ return false; }
}
function askNotifPerm(){
  try{
    if(!("Notification" in window)) return;
    if(Notification.permission === "granted"){ setupPeriodicSync(); return; }
    if(Notification.permission === "denied"){ toast("Notifications blocked — allow them in browser settings"); return; }
    Notification.requestPermission().then(p => {
      if(p === "granted"){
        setupPeriodicSync();
        sysNotify("LifeHub 🎉", "Notifications are working — reminders will look like this.");
        renderHealth();
      } else toast("Without permission, reminders stay in-app only");
    });
  }catch(e){}
}
async function setupPeriodicSync(){
  try{
    const reg = await navigator.serviceWorker.ready;
    if("periodicSync" in reg) await reg.periodicSync.register("lifehub-daily", { minInterval: 12*60*60*1000 });
  }catch(e){}
}
function testNotify(){
  if(("Notification" in window) && Notification.permission === "granted"){
    sysNotify("Time to move! 🏃", "This is how your exercise reminders will look.")
      .then(ok => { if(!ok) toast("Couldn't show a notification here"); });
  } else askNotifPerm();
}
function notifState(){
  if(!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/* ---- exercise reminders ---- */
function toggleRemind(){
  S.remind.on = !S.remind.on;
  if(S.remind.on){
    S.remind.last = Date.now();
    askNotifPerm();
    toast("I'll nudge you every " + S.remind.every + "h");
  } else toast("Reminders off");
  save(); renderHealth();
}
function setRemindEvery(h){ S.remind.every = h; S.remind.last = Date.now(); save(); renderHealth(); }
function checkRemind(){
  const r = S.remind;
  if(!r || !r.on) return;
  const h = new Date().getHours();
  if(h < r.from || h >= r.to) return;
  if(Date.now() - (r.last||0) >= r.every*3600*1000){
    r.last = Date.now(); save(); fireRemind();
  }
}
function fireRemind(){
  try{ if(navigator.vibrate) navigator.vibrate([300,120,300]); }catch(e){}
  $("#banner").classList.add("on");
  sysNotify("Time to move! 🏃", "Stand up, stretch, do a few squats or a quick walk.");
}
function dismissBanner(){ $("#banner").classList.remove("on"); }

/* ---- water ---- */
function addWater(n){
  const t = todayStr();
  S.water[t] = Math.max(0, (S.water[t]||0) + n);
  save(); render();
}

/* ---- sleep ---- */
function openSleep(){
  openModal(`<h3>Log sleep</h3>
    <label class="f">Hours slept</label>
    <input class="inp" id="sl-hrs" inputmode="decimal" placeholder="7.5" style="font-size:1.3rem;font-weight:700">
    <label class="f">Night of</label>
    <input class="inp" type="date" id="sl-date" value="${todayStr()}">
    <button class="btn btn-p" onclick="saveSleep()">Save</button>`);
  focusIn("#sl-hrs");
}
function saveSleep(){
  const h = parseFloat(String($("#sl-hrs").value).replace(",","."));
  if(isNaN(h) || h <= 0 || h > 24){ toast("Enter valid hours"); return; }
  S.sleep[$("#sl-date").value || todayStr()] = h;
  save(); closeModal(); render(); toast("Sleep logged ✓");
}

/* ---- body weight ---- */
function openWeight(){
  const last = S.weights.length ? S.weights[S.weights.length-1].kg : "";
  openModal(`<h3>Log body weight</h3>
    <label class="f">Weight (kg)</label>
    <input class="inp" id="wt-kg" inputmode="decimal" placeholder="${last || "70.0"}" style="font-size:1.3rem;font-weight:700">
    <label class="f">Date</label>
    <input class="inp" type="date" id="wt-date" value="${todayStr()}">
    <button class="btn btn-p" onclick="saveWeight()">Save</button>`);
  focusIn("#wt-kg");
}
function saveWeight(){
  const kg = parseFloat(String($("#wt-kg").value).replace(",","."));
  if(isNaN(kg) || kg <= 0){ toast("Enter a valid weight"); return; }
  const date = $("#wt-date").value || todayStr();
  S.weights = S.weights.filter(w => w.date !== date);
  S.weights.push({ date, kg });
  S.weights.sort((a,b) => a.date.localeCompare(b.date));
  save(); closeModal(); render(); toast("Weight saved ✓");
}
function delWeight(){
  confirmBox("Remove the latest weight entry?", ()=>{ S.weights.pop(); save(); render(); toast("Removed"); });
}

/* ---- render ---- */
function renderHealth(){
  const t = todayStr();
  /* reminders */
  const r = S.remind;
  const tg = $("#remind-toggle");
  tg.textContent = r.on ? "On ✓" : "Off";
  tg.style.cssText = r.on ? "background:rgba(43,217,132,.15);border-color:var(--grn);color:var(--grn)" : "";
  const np = notifState();
  $("#remind-body").innerHTML = r.on ? `
    <div class="sub" style="margin-bottom:8px">Nudge me every…</div>
    <div class="chips">${[2,3,4,6].map(h=>`<button class="chip ${r.every===h?"on":""}" onclick="setRemindEvery(${h})">${h} hours</button>`).join("")}</div>
    <div class="sub" style="margin-bottom:10px">Every day, ${r.from}:00–${r.to}:00. ${np==="granted"
      ? "Reminders show as real notifications — vibration, lock screen and all — while the app is open or in the background. 🔔"
      : "Allow notifications to get them on your lock screen with vibration, even with the screen off."}</div>
    <button class="btn btn-g" style="width:100%" onclick="testNotify()">${np==="granted" ? "🔔 Send a test notification" : "🔔 Turn on notifications"}</button>`
    : `<div class="sub">Turn on to get "time to move" nudges every few hours, every day — as real phone notifications.</div>`;
  /* water */
  const w = S.water[t]||0;
  $("#water-count").innerHTML = `<b>${w}</b> / ${S.waterGoal} glasses`;
  $("#water-bar").style.width = Math.min(w/S.waterGoal*100,100) + "%";
  const wv=[]; for(let i=6;i>=0;i--) wv.push(S.water[addDays(t,-i)]||0);
  $("#water-week").innerHTML = barsSVG(wv, "#3b82f6");
  /* sleep */
  const sv=[]; for(let i=6;i>=0;i--) sv.push(S.sleep[addDays(t,-i)]||0);
  const logged = sv.filter(v=>v>0);
  const avg = logged.length ? (logged.reduce((a,b)=>a+b,0)/logged.length).toFixed(1) : null;
  const lastN = S.sleep[t] || S.sleep[addDays(t,-1)];
  $("#sleep-body").innerHTML = `<div class="spread" style="margin-bottom:8px">
      <span class="sub">Last night: <b style="color:var(--txt)">${lastN ? lastN+"h" : "—"}</b></span>
      <span class="sub">7-day avg: <b style="color:var(--txt)">${avg ? avg+"h" : "—"}</b></span></div>` + barsSVG(sv, "#a78bfa");
  /* weight */
  if(S.weights.length){
    const last = S.weights[S.weights.length-1];
    const prev = S.weights.length > 1 ? S.weights[S.weights.length-2] : null;
    const d = prev ? (last.kg - prev.kg) : 0;
    $("#weight-latest").innerHTML = `<b>${last.kg} kg</b> ${prev ? `<span class="${d<=0?"grn":"amb"}">(${d>0?"+":""}${d.toFixed(1)})</span>` : ""} <button class="x" onclick="delWeight()" style="padding:2px">✕</button>`;
  } else $("#weight-latest").textContent = "";
  $("#weight-chart").innerHTML = lineSVG(S.weights.slice(-14).map(w=>w.kg), "#2bd984");
}
