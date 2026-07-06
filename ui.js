"use strict";
/* ============ ui.js — tabs, router, modal, toast ============ */

/* ---- tabs ---- */
let curTab = "home";
function showTab(t){
  curTab = t;
  ["home","money","plan","gym","health","habits"].forEach(k => {
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
  if(curTab==="gym") renderGym();
  if(curTab==="health") renderHealth();
  if(curTab==="habits") renderHabits();
}

/* ---- detail-page router: #d/<kind>/<id> ---- */
function openDetail(kind, id){ location.hash = "#d/" + kind + "/" + id; }
function goBack(){ if(location.hash) history.back(); else hidePage(); }
function hidePage(){ $("#page").classList.remove("on"); render(); }
function route(){
  const m = location.hash.match(/^#d\/(\w+)\/(.+)$/);
  if(!m){ hidePage(); return; }
  const html = pageFor(m[1], decodeURIComponent(m[2]));
  if(html === null){ hidePage(); if(location.hash) history.replaceState(null, "", location.pathname + location.search); return; }
  $("#page-body").innerHTML = html;
  $("#page").classList.add("on");
  $("#page").scrollTop = 0;
}
window.addEventListener("hashchange", route);

function pageFor(kind, id){
  if(kind==="tx") return pageTx(id);
  if(kind==="ev") return pageEvent(id);
  if(kind==="tk") return pageTask(id);
  if(kind==="wo") return pageWorkout(id);
  if(kind==="ex") return pageExercise(id);
  if(kind==="rt") return pageRoutine(id);
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
