"use strict";
/* ============ ui.js — tabs, drawer, router, modal, toast ============ */

/* ---- main tabs (gym lives in its own app, opened from the drawer) ---- */
let curTab = "home";
function showTab(t){
  curTab = t;
  ["home","money","plan","health","habits"].forEach(k => {
    $("#p-"+k).classList.toggle("on", k===t);
    $("#tb-"+k).classList.toggle("on", k===t);
  });
  render();
  window.scrollTo(0,0);
}
function render(){
  if(curTab==="home") renderHome();
  if(curTab==="money") renderMoney();
  if(curTab==="plan") renderPlan();
  if(curTab==="health") renderHealth();
  if(curTab==="habits") renderHabits();
}

/* ---- left drawer ---- */
function openDrawer(){
  buildDrawer();
  $("#drawer").classList.add("on");
  $("#drawer-ovl").classList.add("on");
}
function closeDrawer(){
  $("#drawer").classList.remove("on");
  $("#drawer-ovl").classList.remove("on");
}
function openMenu(){ openDrawer(); } /* legacy alias */

/* ---- gym app open/exit ---- */
function openGym(){ location.hash = "#g/" + (typeof gymTab !== "undefined" && gymTab ? gymTab : "train"); }
function exitGym(){ history.back(); }

/* ---- router ----
   #d/<kind>/<id> → full-screen detail page (over anything)
   #g/<tab>       → gym app with its own tabs
   (empty)        → main app */
function openDetail(kind, id){ location.hash = "#d/" + kind + "/" + id; }
function goBack(){ if(location.hash) history.back(); else hidePage(); }
function hidePage(){
  $("#page").classList.remove("on");
  if($("#gymapp").classList.contains("on")) renderGymApp(); else render();
}
function route(){
  const d = location.hash.match(/^#d\/(\w+)\/(.+)$/);
  if(d){
    const html = pageFor(d[1], decodeURIComponent(d[2]));
    if(html === null){
      $("#page").classList.remove("on");
      history.replaceState(null, "", location.pathname + location.search);
      $("#gymapp").classList.remove("on");
      render();
      return;
    }
    $("#page-body").innerHTML = html;
    $("#page").classList.add("on");
    $("#page").scrollTop = 0;
    return;
  }
  $("#page").classList.remove("on");
  const g = location.hash.match(/^#g\/(\w+)$/);
  if(g){
    gymTab = g[1];
    $("#gymapp").classList.add("on");
    renderGymApp();
  } else {
    $("#gymapp").classList.remove("on");
    render();
  }
}
window.addEventListener("hashchange", route);

function pageFor(kind, id){
  if(kind==="tx") return pageTx(id);
  if(kind==="ev") return pageEvent(id);
  if(kind==="tk") return pageTask(id);
  if(kind==="wo") return pageWorkout(id);
  if(kind==="ex") return pageExercise(id);
  if(kind==="rt") return pageRoutine(id);
  if(kind==="session") return pageSession();
  if(kind==="exlib") return pageExLib();
  return null;
}
function pageHead(title){
  return `<div class="page-head"><button class="icon-btn" onclick="goBack()">‹</button><h1>${title}</h1></div>`;
}
function pageActions(editFn, delFn){
  return `<div class="row" style="margin-top:20px;gap:10px">
    <button class="btn btn-g" style="flex:1" onclick="${editFn}">✏️ Edit</button>
    <button class="btn btn-d" style="flex:1" onclick="${delFn}">🗑 Delete</button></div>`;
}
function field(l, v){ return `<div class="field"><span class="fl">${l}</span><span class="fv">${v}</span></div>`; }

/* ---- modal / toast / confirm ---- */
function openModal(html){ $("#sheet-body").innerHTML = html; $("#ovl").classList.add("on"); }
function closeModal(){ $("#ovl").classList.remove("on"); }
let toastT;
function toast(msg){
  const el = $("#toast"); el.textContent = msg; el.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(()=>el.classList.remove("on"), 1800);
}
function confirmBox(msg, fn){
  window._cf = fn;
  openModal(`<h3>Are you sure?</h3><p class="sub" style="margin-bottom:16px">${esc(msg)}</p>
    <div class="row"><button class="btn btn-g" style="flex:1" onclick="closeModal()">Cancel</button>
    <button class="btn btn-d" style="flex:1" onclick="window._cf();closeModal()">Delete</button></div>`);
}
