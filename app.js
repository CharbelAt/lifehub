"use strict";
/* ============================================================
   LifeHub v2 — local-first personal system
   Storage: on-device (localStorage) behind a Store facade so a
   cloud adapter (e.g. Supabase) can replace it later without
   touching the app modules.
   ============================================================ */

/* ================= store (swappable) ================= */
const KEY = "lifehub_v2";
const OLDKEY = "lifehub_v1";

const DEFCATS = {
  exp: [{e:"🍔",n:"Food"},{e:"🚗",n:"Transport"},{e:"🛍️",n:"Shopping"},{e:"🧾",n:"Bills"},{e:"🎮",n:"Fun"},{e:"💊",n:"Health"},{e:"📚",n:"Education"},{e:"✨",n:"Other"}],
  inc: [{e:"💼",n:"Salary"},{e:"💻",n:"Freelance"},{e:"🎁",n:"Gift"},{e:"📈",n:"Investment"},{e:"✨",n:"Other"}]
};
const DEFWTYPES = [{e:"🏋️",n:"Push"},{e:"💪",n:"Pull"},{e:"🦵",n:"Legs"},{e:"🏃",n:"Cardio"},{e:"⚡",n:"Full body"},{e:"🧘",n:"Stretch"},{e:"✨",n:"Other"}];

function DEF(){
  return JSON.parse(JSON.stringify({
    v:2, name:"hiuc", balance:null, hideBal:false, budget:null, waterGoal:8,
    cats: DEFCATS, wtypes: DEFWTYPES,
    tx:[], tasks:[], events:[], habits:[], workouts:[], weights:[], recur:[],
    water:{}, sleep:{},
    remind:{ on:false, every:3, from:9, to:22, last:0 }
  }));
}

/* Accepts any backup/legacy object and returns a valid v2 state. */
function normalize(d){
  const s = DEF();
  if(!d || typeof d !== "object") return s;
  const copy = ["name","balance","hideBal","budget","waterGoal","tx","tasks","habits","workouts","weights","recur"];
  copy.forEach(k => { if(d[k] !== undefined) s[k] = d[k]; });
  if(d.water && typeof d.water === "object") s.water = d.water;
  if(d.sleep && typeof d.sleep === "object") s.sleep = d.sleep;
  if(d.remind && typeof d.remind === "object") s.remind = Object.assign(s.remind, d.remind);
  if(d.cats && d.cats.exp && d.cats.inc) s.cats = d.cats;
  if(Array.isArray(d.wtypes) && d.wtypes.length) s.wtypes = d.wtypes;
  /* events: v1 rows have .date; v2 rows have .start/.end */
  if(Array.isArray(d.events)){
    s.events = d.events.map(e => e.start ? e : ({ id:e.id, title:e.title, start:e.date, end:e.date, time:e.time||"", note:e.note||"" }));
  }
  return s;
}

const Store = {
  load(){
    try{
      const v2 = JSON.parse(localStorage.getItem(KEY));
      if(v2 && typeof v2 === "object") return normalize(v2);
    }catch(e){}
    try{
      const v1 = JSON.parse(localStorage.getItem(OLDKEY));
      if(v1 && typeof v1 === "object"){
        const s = normalize(v1);
        localStorage.setItem(KEY, JSON.stringify(s)); /* migrate, keep v1 as safety copy */
        return s;
      }
    }catch(e){}
    return DEF();
  },
  save(state){ localStorage.setItem(KEY, JSON.stringify(state)); }
};

let S = Store.load();
let saveN = 0;
function save(){
  Store.save(S);
  if(++saveN === 40) toast("Tip: back up your data now and then (⋯ → Back up)");
}

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const escq = s => esc(s).replace(/'/g,"&#39;");

/* ================= dates ================= */
const todayStr = () => new Date().toLocaleDateString("en-CA");
const parseD = s => new Date(s + "T00:00:00");
function addDays(s, n){ const d = parseD(s); d.setDate(d.getDate()+n); return d.toLocaleDateString("en-CA"); }
function fmtDay(s){
  const t = todayStr();
  if(s === t) return "Today";
  if(s === addDays(t,1)) return "Tomorrow";
  if(s === addDays(t,-1)) return "Yesterday";
  return parseD(s).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
}
function fmtDayFull(s){ return parseD(s).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}); }
const monthKey = s => s.slice(0,7);
function weekStart(s){ return addDays(s, -((parseD(s).getDay()+6)%7)); }
function daysBetween(a,b){ return Math.round((parseD(b)-parseD(a))/86400000); }
function fmtTime(t){
  if(!t) return "All day";
  const [h,m] = t.split(":").map(Number);
  return ((h%12)||12) + ":" + String(m).padStart(2,"0") + " " + (h >= 12 ? "PM" : "AM");
}

/* ================= money fmt ================= */
function fmt(n){
  const neg = n < 0; const a = Math.abs(+n||0);
  return (neg?"−":"") + "$" + a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}
const fmtS = n => (n>=0?"+":"−") + fmt(Math.abs(n)).replace("−","");

/* ================= categories (customizable) ================= */
function catIcon(type, name){
  const f = (S.cats[type]||[]).find(c => c.n === name);
  return f ? f.e : "✨";
}
function wIcon(name){
  const f = S.wtypes.find(w => w.n === name);
  return f ? f.e : "💪";
}

/* ================= tabs ================= */
let curTab = "home";
function showTab(t){
  curTab = t;
  ["home","money","plan","gym","habits"].forEach(k => {
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
  if(curTab==="habits") renderHabits();
}

/* ================= detail-page router =================
   #d/<kind>/<id> shows a full-screen page for one item.
   Android back button closes it naturally. */
function openDetail(kind, id){ location.hash = "#d/" + kind + "/" + id; }
function goBack(){ if(location.hash) history.back(); else hidePage(); }
function hidePage(){ $("#page").classList.remove("on"); render(); }
function route(){
  const m = location.hash.match(/^#d\/(\w+)\/([\w]+)$/);
  if(!m){ hidePage(); return; }
  const html = pageFor(m[1], m[2]);
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

/* ================= charts ================= */
function barsSVG(vals, color){
  const max = Math.max.apply(null, vals.concat(1));
  const n = vals.length, bw = 100/n;
  let r = "";
  vals.forEach((v,i) => {
    const h = Math.max(v/max*30, 1);
    r += `<rect x="${(i*bw+0.8).toFixed(2)}" y="${(32-h).toFixed(2)}" width="${(bw-1.6).toFixed(2)}" height="${h.toFixed(2)}" rx="1" fill="${color}" opacity="${v?"1":"0.22"}"/>`;
  });
  return `<svg viewBox="0 0 100 34" style="width:100%;height:48px;display:block" preserveAspectRatio="none">${r}</svg>`;
}
function lineSVG(vals, color){
  if(vals.length < 2) return `<div class="sub" style="padding:4px 0">Log a few entries to see the trend line.</div>`;
  const min = Math.min.apply(null,vals), max = Math.max.apply(null,vals), sp = (max-min) || 1;
  const P = vals.map((v,i) => [ (i/(vals.length-1))*95 + 2.5, 3 + (1-(v-min)/sp)*26 ]);
  const pts = P.map(p => p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
  const last = P[P.length-1];
  return `<svg viewBox="0 0 100 32" style="width:100%;height:56px;display:block" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="${color}"/></svg>`;
}
function sparkLineSVG(vals, color){
  const max = Math.max.apply(null, vals.concat(1));
  const n = vals.length;
  const X = i => 2 + i*(96/(n-1));
  const Y = v => 2 + (1-v/max)*27;
  const pts = vals.map((v,i)=>X(i).toFixed(1)+","+Y(v).toFixed(1)).join(" ");
  return `<svg viewBox="0 0 100 33" style="width:100%;height:56px;display:block" preserveAspectRatio="none">
    <polygon points="2,31 ${pts} 98,31" fill="${color}" opacity="0.12"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
const PALETTE = ["#7c5cff","#3b82f6","#2bd984","#ffb454","#ff5d73","#22d3ee","#a78bfa","#f472b6"];
function pieSVG(parts, total){
  let a0 = -Math.PI/2, out = "";
  parts.forEach(p => {
    const frac = p.v/total;
    if(frac >= 0.999){ out += `<circle cx="21" cy="21" r="16" fill="${p.c}"/>`; return; }
    const a1 = a0 + frac*2*Math.PI;
    const x0 = 21+16*Math.cos(a0), y0 = 21+16*Math.sin(a0);
    const x1 = 21+16*Math.cos(a1), y1 = 21+16*Math.sin(a1);
    out += `<path d="M21 21 L${x0.toFixed(2)} ${y0.toFixed(2)} A16 16 0 ${frac>0.5?1:0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${p.c}" stroke="#131a2b" stroke-width="0.6"/>`;
    a0 = a1;
  });
  return `<svg viewBox="0 0 42 42" style="width:100%;display:block">${out}</svg>`;
}
function trendSVG(months){
  const max = Math.max(1, ...months.map(m => Math.max(m.inc, m.exp)));
  const n = months.length;
  const X = i => 6 + i*(88/(n-1));
  const Y = v => 3 + (1-v/max)*26;
  const line = key => months.map((m,i)=>X(i).toFixed(1)+","+Y(m[key]).toFixed(1)).join(" ");
  let dots = "", labels = "";
  months.forEach((m,i) => {
    dots += `<circle cx="${X(i).toFixed(1)}" cy="${Y(m.inc).toFixed(1)}" r="1.3" fill="#2bd984"/>`;
    dots += `<circle cx="${X(i).toFixed(1)}" cy="${Y(m.exp).toFixed(1)}" r="1.3" fill="#ff5d73"/>`;
    labels += `<text x="${X(i).toFixed(1)}" y="37.5" text-anchor="middle" font-size="3.4" fill="#8a93ab">${m.label}</text>`;
  });
  return `<svg viewBox="0 0 100 39" style="width:100%;height:120px;display:block">
    <polyline points="${line("inc")}" fill="none" stroke="#2bd984" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>
    <polyline points="${line("exp")}" fill="none" stroke="#ff5d73" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${labels}</svg>`;
}
function statCard(l, v, cls, sub, tab){
  return `<div class="stat" ${tab?`style="cursor:pointer" onclick="showTab('${tab}')"`:""}>
    <div class="l">${l}</div><div class="v ${cls||""}">${v}</div>${sub?`<div class="l" style="margin-top:3px">${sub}</div>`:""}</div>`;
}

/* ================= modal / toast / confirm ================= */
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
function focusIn(sel){ setTimeout(()=>{ const e=$(sel); if(e) e.focus(); }, 100); }

/* modal working state */
let M = {};

/* ================= balance & budget ================= */
function balTxt(){
  if(S.balance == null) return "Tap “Set balance”";
  return S.hideBal ? "••••••" : fmt(S.balance);
}
function toggleEye(){ S.hideBal = !S.hideBal; save(); render(); }
function openBalance(){
  openModal(`<h3>Set bank balance</h3>
    <p class="sub" style="margin-bottom:12px">Enter what your bank shows right now. Every entry you log afterwards updates it automatically.</p>
    <input class="inp" id="bal-inp" inputmode="decimal" placeholder="0.00" value="${S.balance!=null?S.balance:""}">
    <button class="btn btn-p" onclick="saveBalance()">Save</button>`);
  focusIn("#bal-inp");
}
function saveBalance(){
  const v = parseFloat(String($("#bal-inp").value).replace(",","."));
  if(isNaN(v)){ toast("Enter a valid number"); return; }
  S.balance = v; save(); closeModal(); render(); toast("Balance set ✓");
}
function openBudget(){
  openModal(`<h3>Monthly spending budget</h3>
    <p class="sub" style="margin-bottom:12px">I'll track every month's spending against this limit. Leave empty to remove it.</p>
    <input class="inp" id="bud-inp" inputmode="decimal" placeholder="e.g. 1500" value="${S.budget||""}">
    <button class="btn btn-p" onclick="saveBudget()">Save</button>`);
  focusIn("#bud-inp");
}
function saveBudget(){
  const v = parseFloat(String($("#bud-inp").value).replace(",","."));
  S.budget = (isNaN(v) || v <= 0) ? null : v;
  save(); closeModal(); render(); toast(S.budget ? "Budget set ✓" : "Budget removed");
}

/* ================= custom categories ================= */
function drawCatPicker(boxSel, type, cur, onPick){
  window._pickCat = n => { M.cat = n; drawCatPicker(boxSel, type, n, onPick); };
  $(boxSel).innerHTML = S.cats[type].map(c =>
    `<button class="chip ${cur===c.n?"on":""}" onclick="_pickCat('${escq(c.n)}')">${c.e} ${esc(c.n)}</button>`).join("") +
    `<button class="chip add" onclick="openNewCat('${type}','${boxSel.replace("#","")}')">+ New</button>`;
}
function openNewCat(type, boxId){
  window._afterCat = { type, boxId };
  openModal(`<h3>New ${type==="exp"?"spending":"income"} category</h3>
    <div class="half">
      <div><label class="f">Emoji</label><input class="inp" id="nc-e" placeholder="🏠" maxlength="4"></div>
      <div><label class="f">Name</label><input class="inp" id="nc-n" placeholder="e.g. Rent"></div>
    </div>
    <button class="btn btn-p" onclick="saveNewCat()">Add category</button>`);
  focusIn("#nc-n");
}
function saveNewCat(){
  const e = $("#nc-e").value.trim() || "🏷️";
  const n = $("#nc-n").value.trim();
  if(!n){ toast("Give it a name"); return; }
  const { type, boxId } = window._afterCat;
  if(S.cats[type].some(c => c.n.toLowerCase() === n.toLowerCase())){ toast("Already exists"); return; }
  S.cats[type].push({ e, n });
  save(); closeModal(); toast("Category added ✓");
  /* reopen the modal the user came from, if any */
  if(window._reopen) window._reopen();
}
function delCategory(kind, name){
  confirmBox(`Remove category “${name}”? Existing records keep their label.`, ()=>{
    if(kind === "w") S.wtypes = S.wtypes.filter(w => w.n !== name);
    else S.cats[kind] = S.cats[kind].filter(c => c.n !== name);
    save(); openCatManager(); toast("Removed");
  });
}
function openCatManager(){
  const row = (kind, c) => `<div class="cat-row"><span class="ce">${c.e}</span><span class="cn">${esc(c.n)}</span>
    <button class="x" onclick="delCategory('${kind}','${escq(c.n)}')">✕</button></div>`;
  openModal(`<h3>Manage categories</h3>
    <label class="f">Spending</label>${S.cats.exp.map(c=>row("exp",c)).join("")}
    <button class="btn btn-g mini" style="margin:8px 0 16px" onclick="window._reopen=openCatManager;openNewCat('exp','')">+ Add spending category</button>
    <label class="f">Income</label>${S.cats.inc.map(c=>row("inc",c)).join("")}
    <button class="btn btn-g mini" style="margin:8px 0 16px" onclick="window._reopen=openCatManager;openNewCat('inc','')">+ Add income category</button>
    <label class="f">Workout types</label>${S.wtypes.map(c=>row("w",c)).join("")}
    <button class="btn btn-g mini" style="margin:8px 0" onclick="window._reopen=openCatManager;openNewWType()">+ Add workout type</button>`);
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

/* ================= transactions (add / edit / detail) ================= */
let viewMonth = monthKey(todayStr());
function moveMonth(d){
  const [y,m] = viewMonth.split("-").map(Number);
  const dt = new Date(y, m-1+d, 1);
  viewMonth = dt.getFullYear() + "-" + String(dt.getMonth()+1).padStart(2,"0");
  renderMoney();
}
function openTx(type, editId){
  const old = editId ? S.tx.find(t=>t.id===editId) : null;
  M = { type: old ? old.type : type, cat: old ? old.cat : S.cats[type][0].n, editId: editId || null };
  window._reopen = () => { openTx(M.type, M.editId); };
  openModal(`<h3>${old ? "Edit entry" : (M.type==="exp" ? "Add spending" : "Add income")}</h3>
    <div class="seg">
      <button class="${M.type==="exp"?"on exp":""}" onclick="setTxType('exp')">− Spending</button>
      <button class="${M.type==="inc"?"on inc":""}" onclick="setTxType('inc')">+ Income</button>
    </div>
    <label class="f">Amount</label>
    <input class="inp" id="tx-amt" inputmode="decimal" placeholder="0.00" style="font-size:1.4rem;font-weight:700" value="${old?old.amount:""}">
    <label class="f">Category</label>
    <div class="chips" id="tx-cats"></div>
    <label class="f">Note (optional)</label>
    <input class="inp" id="tx-note" placeholder="e.g. groceries, taxi…" value="${old?escq(old.note):""}">
    <label class="f">Date</label>
    <input class="inp" type="date" id="tx-date" value="${old?old.date:todayStr()}">
    <button class="btn btn-p" onclick="saveTx()">${old ? "Save changes" : "Save"}</button>`);
  drawCatPicker("#tx-cats", M.type, M.cat);
  if(!old) focusIn("#tx-amt");
}
function setTxType(t){
  const amt = $("#tx-amt").value, note = $("#tx-note").value, date = $("#tx-date").value;
  const editId = M.editId;
  M.type = t; M.cat = S.cats[t][0].n;
  openTx(t, editId);
  $("#tx-amt").value = amt; $("#tx-note").value = note; $("#tx-date").value = date;
}
function saveTx(){
  const amt = parseFloat(String($("#tx-amt").value).replace(",","."));
  if(isNaN(amt) || amt <= 0){ toast("Enter a valid amount"); return; }
  const date = $("#tx-date").value || todayStr();
  const note = $("#tx-note").value.trim();
  if(M.editId){
    const t = S.tx.find(x=>x.id===M.editId); if(!t) return;
    if(S.balance != null){
      S.balance += (t.type==="inc" ? -t.amount : t.amount);      /* undo old */
      S.balance += (M.type==="inc" ? amt : -amt);                /* apply new */
    }
    t.type = M.type; t.amount = amt; t.cat = M.cat; t.note = note; t.date = date;
    save(); closeModal(); viewMonth = monthKey(date); render(); route(); toast("Updated ✓");
    return;
  }
  S.tx.push({ id:uid(), type:M.type, amount:amt, cat:M.cat, note, date });
  if(S.balance != null) S.balance += (M.type==="inc" ? amt : -amt);
  save(); closeModal();
  viewMonth = monthKey(date);
  render(); toast(M.type==="inc" ? "Income added ✓" : "Spending added ✓");
}
function delTx(id){
  confirmBox("Delete this transaction? Your balance will be adjusted back.", ()=>{
    const i = S.tx.findIndex(t=>t.id===id); if(i<0) return;
    const t = S.tx[i];
    if(S.balance != null) S.balance += (t.type==="inc" ? -t.amount : t.amount);
    S.tx.splice(i,1); save(); goBack(); render(); toast("Deleted");
  });
}
function pageTx(id){
  const t = S.tx.find(x=>x.id===id); if(!t) return null;
  return pageHead(t.type==="inc" ? "Income" : "Spending") +
    `<div class="big-ico">${catIcon(t.type,t.cat)}</div>
     <div class="big-amt ${t.type==="inc"?"grn":"red"}">${t.type==="inc"?"+":"−"}${fmt(t.amount)}</div>
     <div class="big-sub">${esc(t.note) || esc(t.cat)}</div>
     <div class="card">` +
    field("Category", catIcon(t.type,t.cat) + " " + esc(t.cat)) +
    field("Date", fmtDayFull(t.date)) +
    field("Type", t.type==="inc" ? "Income" : "Spending") +
    (t.note ? field("Note", esc(t.note)) : "") +
    `</div>` +
    pageActions(`openTx('${t.type}','${t.id}')`, `delTx('${t.id}')`);
}

/* ================= recurring payments ================= */
function nextRecur(r){
  const t = todayStr(), mk = monthKey(t);
  const [yy,mm] = mk.split("-").map(Number);
  const dim = new Date(yy, mm, 0).getDate();
  const due = mk + "-" + String(Math.min(r.day, dim)).padStart(2,"0");
  if(r.lastApplied !== mk && t <= due) return due;
  const dim2 = new Date(yy, mm+1, 0).getDate();
  const nm = new Date(yy, mm, 1);
  return nm.getFullYear() + "-" + String(nm.getMonth()+1).padStart(2,"0") + "-" + String(Math.min(r.day, dim2)).padStart(2,"0");
}
function applyRecur(){
  const t = todayStr(), mk = monthKey(t);
  const [yy,mm] = mk.split("-").map(Number);
  const dim = new Date(yy, mm, 0).getDate();
  let n = 0;
  S.recur.forEach(r => {
    const due = mk + "-" + String(Math.min(r.day, dim)).padStart(2,"0");
    if(r.lastApplied !== mk && t >= due){
      S.tx.push({ id:uid(), type:r.type, amount:r.amount, cat:r.cat, note:r.name + " 🔁", date:due });
      if(S.balance != null) S.balance += (r.type==="inc" ? r.amount : -r.amount);
      r.lastApplied = mk; n++;
    }
  });
  if(n){ save(); setTimeout(()=>toast(n + " recurring payment" + (n>1?"s":"") + " logged 🔁"), 600); }
}
function openRecur(){
  M = { rtype:"exp", cat:S.cats.exp[0].n };
  window._reopen = openRecur;
  openModal(`<h3>New recurring payment</h3>
    <div class="seg">
      <button class="on exp" id="rt-exp" onclick="setRType('exp')">− Payment</button>
      <button id="rt-inc" onclick="setRType('inc')">+ Income</button>
    </div>
    <label class="f">Name</label>
    <input class="inp" id="rc-name" placeholder="e.g. Netflix, rent, salary…">
    <label class="f">Amount</label>
    <input class="inp" id="rc-amt" inputmode="decimal" placeholder="0.00">
    <label class="f">Category</label>
    <div class="chips" id="rc-cats"></div>
    <label class="f">Day of the month (1–28)</label>
    <input class="inp" id="rc-day" inputmode="numeric" placeholder="e.g. 1">
    <p class="sub" style="margin-bottom:12px">Logged automatically on that day every month; your balance updates by itself.</p>
    <button class="btn btn-p" onclick="saveRecur()">Add</button>`);
  drawCatPicker("#rc-cats", "exp", M.cat);
}
function setRType(t){
  M.rtype = t; M.cat = S.cats[t][0].n;
  $("#rt-exp").className = t==="exp" ? "on exp" : "";
  $("#rt-inc").className = t==="inc" ? "on inc" : "";
  drawCatPicker("#rc-cats", t, M.cat);
}
function saveRecur(){
  const name = $("#rc-name").value.trim();
  const amt = parseFloat(String($("#rc-amt").value).replace(",","."));
  const day = parseInt($("#rc-day").value, 10);
  if(!name){ toast("Give it a name"); return; }
  if(isNaN(amt) || amt <= 0){ toast("Enter a valid amount"); return; }
  if(isNaN(day) || day < 1 || day > 28){ toast("Day must be 1–28"); return; }
  const r = { id:uid(), name, amount:amt, day, type:M.rtype, cat:M.cat, lastApplied:null };
  const t = todayStr(), mk = monthKey(t);
  const due = mk + "-" + String(day).padStart(2,"0");
  if(t > due) r.lastApplied = mk;
  S.recur.push(r);
  save(); closeModal(); applyRecur(); render();
  toast("Added — first log: " + fmtDay(nextRecur(r)));
}
function delRecur(id){
  confirmBox("Remove this recurring payment? Already-logged transactions stay.", ()=>{
    S.recur = S.recur.filter(r=>r.id!==id); save(); render(); toast("Removed");
  });
}

/* ================= money dashboard ================= */
function monthTx(){ return S.tx.filter(t => monthKey(t.date) === viewMonth); }
function renderMoney(){
  $("#money-bal").textContent = balTxt();
  const [y,m] = viewMonth.split("-").map(Number);
  $("#month-label").textContent = new Date(y, m-1, 1).toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const tx = monthTx();
  const inc = tx.filter(t=>t.type==="inc").reduce((a,t)=>a+t.amount,0);
  const exp = tx.filter(t=>t.type==="exp").reduce((a,t)=>a+t.amount,0);
  $("#m-inc").textContent = fmt(inc);
  $("#m-exp").textContent = fmt(exp);
  const net = inc - exp;
  const netEl = $("#m-net");
  netEl.textContent = fmtS(net);
  netEl.className = "v " + (net >= 0 ? "grn" : "red");

  /* category pie */
  const sums = {};
  tx.filter(t=>t.type==="exp").forEach(t => sums[t.cat] = (sums[t.cat]||0) + t.amount);
  const entries = Object.entries(sums).sort((a,b)=>b[1]-a[1]);
  $("#cat-card").style.display = entries.length ? "" : "none";
  if(entries.length){
    const parts = entries.map((e,i)=>({ v:e[1], c:PALETTE[i%PALETTE.length] }));
    $("#cat-title").textContent = "Where it went · " + fmt(exp);
    $("#cat-donut").innerHTML = pieSVG(parts, exp);
    $("#cat-legend").innerHTML = entries.map((e,i)=>
      `<div class="spread" style="padding:3px 0"><span class="row" style="gap:7px;font-size:.82rem"><span style="width:10px;height:10px;border-radius:3px;background:${PALETTE[i%PALETTE.length]};flex:none"></span>${catIcon("exp",e[0])} ${esc(e[0])}</span><span style="font-size:.82rem"><b>${fmt(e[1])}</b> <span class="sub">${Math.round(e[1]/exp*100)}%</span></span></div>`).join("");
  }

  /* stats */
  const isCur = viewMonth === monthKey(todayStr());
  const daysIn = new Date(y, m, 0).getDate();
  const daysSo = isCur ? parseD(todayStr()).getDate() : daysIn;
  const avgDay = exp / Math.max(daysSo, 1);
  const proj = isCur ? avgDay * daysIn : exp;
  const biggest = tx.filter(t=>t.type==="exp").sort((a,b)=>b.amount-a.amount)[0];
  $("#money-stats").innerHTML =
    statCard("Avg spend / day", fmt(avgDay), "amb") +
    statCard(isCur ? "Projected month" : "Total spent", fmt(proj), S.budget && proj > S.budget ? "red" : "") +
    statCard("Top category", entries.length ? catIcon("exp",entries[0][0]) + " " + esc(entries[0][0]) : "—", "pri") +
    statCard("Largest expense", biggest ? fmt(biggest.amount) : "—", "red");

  /* budget */
  if(S.budget){
    const p = Math.min(exp/S.budget*100, 100);
    const over = exp > S.budget;
    $("#budget-body").innerHTML = `<div class="spread" style="margin-bottom:6px"><span class="sub">${fmt(exp)} of ${fmt(S.budget)}</span><b class="${over?"red":"grn"}">${over ? fmt(exp-S.budget) + " over" : fmt(S.budget-exp) + " left"}</b></div>
      <div class="bar-bg" style="height:10px"><div class="bar-fill" style="width:${p}%${over?";background:var(--red)":""}"></div></div>`;
  } else {
    $("#budget-body").innerHTML = `<div class="sub">Set a monthly spending limit and I'll track you against it.</div>`;
  }

  /* recurring list */
  $("#recur-list").innerHTML = S.recur.length ? S.recur.map(r =>
    `<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line)">
       <span class="row" style="gap:8px;min-width:0"><span>${catIcon(r.type,r.cat)}</span><span style="font-size:.88rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</span></span>
       <span class="row" style="gap:8px;flex:none"><span style="font-size:.85rem;font-weight:700" class="${r.type==="inc"?"grn":"red"}">${r.type==="inc"?"+":"−"}${fmt(r.amount)}</span><span class="sub" style="font-size:.72rem">${fmtDay(nextRecur(r))}</span><button class="x" onclick="delRecur('${r.id}')">✕</button></span></div>`).join("")
    : `<div class="sub" style="padding:4px 0">Subscriptions, rent, salary — logged automatically on their day every month.</div>`;

  /* 6-month trend */
  const months = [];
  for(let i=5;i>=0;i--){
    const dd = new Date(y, m-1-i, 1);
    const k = dd.getFullYear() + "-" + String(dd.getMonth()+1).padStart(2,"0");
    const mtx = S.tx.filter(t=>monthKey(t.date)===k);
    months.push({ label: dd.toLocaleDateString("en-US",{month:"short"}),
      inc: mtx.filter(t=>t.type==="inc").reduce((a,t)=>a+t.amount,0),
      exp: mtx.filter(t=>t.type==="exp").reduce((a,t)=>a+t.amount,0) });
  }
  $("#trend-chart").innerHTML = trendSVG(months);
  $("#trend-legend").innerHTML = `<span class="row" style="gap:6px;font-size:.75rem"><span style="width:10px;height:10px;border-radius:3px;background:var(--grn)"></span>Income</span><span class="row" style="gap:6px;font-size:.75rem"><span style="width:10px;height:10px;border-radius:3px;background:var(--red)"></span>Spending</span>`;

  /* last 14 days */
  const t14 = [];
  for(let i=13;i>=0;i--){
    const ds = addDays(todayStr(),-i);
    t14.push(S.tx.filter(t=>t.type==="exp" && t.date===ds).reduce((a,t)=>a+t.amount,0));
  }
  $("#spend-spark").innerHTML = sparkLineSVG(t14, "#ff5d73") +
    `<div class="spread" style="margin-top:4px"><span class="sub" style="font-size:.7rem">2 weeks ago</span><span class="sub" style="font-size:.7rem">today</span></div>`;

  /* list */
  const sorted = [...tx].sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if(!sorted.length){
    $("#tx-list").innerHTML = `<div class="empty"><span class="e">🧾</span>No transactions this month.<br>Log your first spending or income above.</div>`;
    return;
  }
  let html = "", lastD = "";
  sorted.forEach(t => {
    if(t.date !== lastD){ html += `<div class="date-head">${fmtDay(t.date)}</div>`; lastD = t.date; }
    html += `<div class="item" onclick="openDetail('tx','${t.id}')">
      <div class="ico">${catIcon(t.type, t.cat)}</div>
      <div class="bd"><div class="t">${esc(t.note) || esc(t.cat)}</div><div class="s">${esc(t.cat)}</div></div>
      <div class="amt ${t.type==="inc"?"grn":"red"}">${t.type==="inc"?"+":"−"}${fmt(t.amount)}</div></div>`;
  });
  $("#tx-list").innerHTML = html;
}

/* ================= planner: month calendar + events + tasks ================= */
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

/* ---- events (multi-day) ---- */
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

/* ---- planner render ---- */
function renderPlan(){
  const [y,m] = calMonth.split("-").map(Number);
  $("#cal-label").textContent = new Date(y, m-1, 1).toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const first = calMonth + "-01";
  const gridStart = weekStart(first);
  const today = todayStr();
  let cells = "", evCount = 0;
  for(let i=0;i<42;i++){
    const ds = addDays(gridStart, i);
    const inMonth = monthKey(ds) === calMonth;
    const evs = S.events.filter(e => occursOn(e, ds));
    const hasT = S.tasks.some(k => !k.done && k.due === ds);
    const multi = evs.some(e => e.end > e.start);
    if(inMonth) evCount += evs.length;
    cells += `<div class="cd ${inMonth?"":"out"} ${ds===today?"today":""} ${ds===selDate?"sel":""}" onclick="pickDay('${ds}')">
      <span class="n">${parseD(ds).getDate()}</span>
      <span class="dots">${evs.length?'<i class="ev"></i>':""}${hasT?'<i class="tk"></i>':""}</span>
      ${multi?'<span class="rng"></span>':""}</div>`;
  }
  $("#cal-grid").innerHTML = cells;
  const mEv = S.events.filter(e => monthKey(e.start) === calMonth || monthKey(e.end) === calMonth).length;
  $("#cal-count").textContent = mEv ? mEv + (mEv===1 ? " event" : " events") : "";

  /* stats */
  const open = S.tasks.filter(t=>!t.done);
  const over = open.filter(t=>t.due && t.due < today);
  const wkMon = weekStart(today);
  const evWk = S.events.filter(e => e.start <= addDays(wkMon,6) && e.end >= wkMon).length;
  $("#plan-stats").innerHTML =
    statCard("Events (wk)", evWk, "amb") +
    statCard("Open tasks", open.length, "pri") +
    statCard("Overdue", over.length, over.length ? "red" : "grn") +
    statCard("Done", S.tasks.filter(t=>t.done).length, "grn");

  /* day agenda */
  $("#sel-date-label").textContent = fmtDay(selDate) + " · " + parseD(selDate).toLocaleDateString("en-US",{month:"long",day:"numeric"});
  const dayEv = S.events.filter(e => occursOn(e, selDate)).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  const dayTk = S.tasks.filter(k => k.due === selDate);
  let ag = "";
  if(dayEv.length) ag += dayEv.map(e => eventRow(e, selDate)).join("");
  if(dayTk.length) ag += `<div class="date-head">✅ Tasks due</div>` + dayTk.map(taskRow).join("");
  $("#agenda").innerHTML = ag || `<div class="empty" style="padding:20px 10px"><span class="e">🗓️</span>Nothing planned — add an event or task above.</div>`;

  /* all open tasks */
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

/* ================= health: workouts / weight / water / sleep / reminders ================= */
function gymWeek(){
  const mon = weekStart(todayStr());
  return S.workouts.filter(w => w.date >= mon && w.date <= addDays(mon,6));
}
function openWorkout(editId){
  const old = editId ? S.workouts.find(w=>w.id===editId) : null;
  M = { wt: old ? old.type : S.wtypes[0].n, editId: editId || null };
  window._reopen = () => openWorkout(M.editId);
  openModal(`<h3>${old ? "Edit workout" : "Log workout"}</h3>
    <label class="f">Type</label>
    <div class="chips" id="w-types"></div>
    <label class="f">Duration (minutes)</label>
    <input class="inp" id="w-dur" inputmode="numeric" placeholder="60" value="${old && old.dur ? old.dur : ""}">
    <label class="f">What did you do? (optional)</label>
    <input class="inp" id="w-note" placeholder="e.g. bench 4×8 60kg, squats, 5km run…" value="${old?escq(old.note):""}">
    <label class="f">Date</label>
    <input class="inp" type="date" id="w-date" value="${old?old.date:todayStr()}">
    <button class="btn btn-p" onclick="saveWorkout()">${old ? "Save changes" : "Save workout"}</button>`);
  drawWTypes();
}
function drawWTypes(){
  window._pickW = n => { M.wt = n; drawWTypes(); };
  $("#w-types").innerHTML = S.wtypes.map(w =>
    `<button class="chip ${M.wt===w.n?"on":""}" onclick="_pickW('${escq(w.n)}')">${w.e} ${esc(w.n)}</button>`).join("") +
    `<button class="chip add" onclick="openNewWType()">+ New</button>`;
}
function saveWorkout(){
  const dur = parseInt($("#w-dur").value, 10);
  const note = $("#w-note").value.trim();
  const date = $("#w-date").value || todayStr();
  if(M.editId){
    const w = S.workouts.find(x=>x.id===M.editId); if(!w) return;
    w.type = M.wt; w.dur = isNaN(dur)?0:dur; w.note = note; w.date = date;
    save(); closeModal(); render(); route(); toast("Updated ✓");
    return;
  }
  S.workouts.push({ id:uid(), type:M.wt, dur:isNaN(dur)?0:dur, note, date });
  save(); closeModal(); render(); toast("Workout logged 💪");
}
function delWorkout(id){
  confirmBox("Delete this workout?", ()=>{
    S.workouts = S.workouts.filter(w=>w.id!==id); save(); goBack(); render(); toast("Deleted");
  });
}
function pageWorkout(id){
  const w = S.workouts.find(x=>x.id===id); if(!w) return null;
  return pageHead("Workout") +
    `<div class="big-ico">${wIcon(w.type)}</div>
     <div class="big-amt" style="font-size:1.4rem">${esc(w.type)}</div>
     <div class="big-sub">${fmtDay(w.date)}${w.dur ? " · " + w.dur + " min" : ""}</div>
     <div class="card">` +
    field("Type", wIcon(w.type) + " " + esc(w.type)) +
    field("Date", fmtDayFull(w.date)) +
    field("Duration", w.dur ? w.dur + " minutes" : "—") +
    (w.note ? field("Exercises / note", esc(w.note)) : "") +
    `</div>` +
    pageActions(`openWorkout('${w.id}')`, `delWorkout('${w.id}')`);
}
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
function addWater(n){
  const t = todayStr();
  S.water[t] = Math.max(0, (S.water[t]||0) + n);
  save(); render();
}
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
function toggleRemind(){
  S.remind.on = !S.remind.on;
  if(S.remind.on){
    S.remind.last = Date.now();
    toast("I'll nudge you every " + S.remind.every + "h while the app is open");
  } else toast("Reminders off");
  save(); renderGym();
}
function setRemindEvery(h){ S.remind.every = h; S.remind.last = Date.now(); save(); renderGym(); }
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
}
function dismissBanner(){ $("#banner").classList.remove("on"); }

function renderGym(){
  const t = todayStr();
  const wk = gymWeek();
  const mins = wk.reduce((a,w)=>a+(w.dur||0),0);
  const mk = monthKey(t);
  const mCount = S.workouts.filter(w => monthKey(w.date)===mk).length;
  $("#gym-stats").innerHTML =
    statCard("This week", wk.length + (wk.length===1?" workout":" workouts"), "pri") +
    statCard("Active minutes (wk)", mins + " min", "grn") +
    statCard("This month", mCount + (mCount===1?" workout":" workouts"), "amb") +
    statCard("Total logged", S.workouts.length, "");
  /* reminders */
  const r = S.remind;
  const tg = $("#remind-toggle");
  tg.textContent = r.on ? "On ✓" : "Off";
  tg.style.cssText = r.on ? "background:rgba(43,217,132,.15);border-color:var(--grn);color:var(--grn)" : "";
  $("#remind-body").innerHTML = r.on ? `
    <div class="sub" style="margin-bottom:8px">Nudge me every…</div>
    <div class="chips">${[2,3,4,6].map(h=>`<button class="chip ${r.every===h?"on":""}" onclick="setRemindEvery(${h})">${h} hours</button>`).join("")}</div>
    <div class="sub">Every day, ${r.from}:00–${r.to}:00. A banner pops up with vibration — keep the app open in the background for nudges to appear.</div>`
    : `<div class="sub">Turn on to get "time to move" nudges every few hours, every day, while the app is open.</div>`;
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
  /* log */
  const sorted = [...S.workouts].sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if(!sorted.length){
    $("#workout-list").innerHTML = `<div class="empty"><span class="e">💪</span>No workouts yet.<br>Log your first one above!</div>`;
    return;
  }
  let html = "", lastD = "";
  sorted.forEach(w => {
    if(w.date !== lastD){ html += `<div class="date-head">${fmtDay(w.date)}</div>`; lastD = w.date; }
    html += `<div class="item" onclick="openDetail('wo','${w.id}')"><div class="ico">${wIcon(w.type)}</div>
      <div class="bd"><div class="t">${esc(w.type)}${w.dur?` · ${w.dur} min`:""}</div>${w.note?`<div class="s">${esc(w.note)}</div>`:""}</div></div>`;
  });
  $("#workout-list").innerHTML = html;
}

/* ================= habits ================= */
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

/* ================= home ================= */
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
    statCard("💪 Gym", gw.length + (gw.length===1?" workout":" workouts"), "grn", gw.reduce((a,w)=>a+(w.dur||0),0) + " min this week", "gym") +
    statCard("🔥 Habits", S.habits.length ? Math.round(habDone/S.habits.length*100) + "%" : "—", "grn", S.habits.length ? habDone + "/" + S.habits.length + " done today" : "none yet", "habits") +
    statCard("💧 Water", waterT + "/" + S.waterGoal, "blu", "glasses today", "gym") +
    statCard("😴 Sleep", slLast ? slLast + "h" : "—", "amb", slAvg ? "7-day avg " + slAvg + "h" : "log your sleep", "gym");

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

/* ================= settings / backup ================= */
function openMenu(){
  openModal(`<h3>Settings</h3>
    <div class="menu-item" onclick="openName()">👤 Change my name</div>
    <div class="menu-item" onclick="openCatManager()">🏷️ Manage categories</div>
    <div class="menu-item" onclick="openWaterGoal()">💧 Water goal (${S.waterGoal} glasses)</div>
    <div class="menu-item" onclick="doExport()">💾 Back up my data (download)</div>
    <div class="menu-item" onclick="closeModal();document.getElementById('import-file').click()">📥 Restore from backup</div>
    <div class="menu-item" style="color:var(--red)" onclick="resetAll()">🗑️ Erase everything</div>
    <p class="sub" style="margin-top:14px">All data lives only on this device. Back up now and then so you never lose it.</p>`);
}
function openName(){
  openModal(`<h3>Your name</h3><input class="inp" id="nm-inp" value="${escq(S.name)}">
    <button class="btn btn-p" onclick="S.name=document.getElementById('nm-inp').value.trim()||S.name;save();closeModal();render()">Save</button>`);
}
function openWaterGoal(){
  openModal(`<h3>Daily water goal</h3>
    <label class="f">Glasses per day</label>
    <input class="inp" id="wg-inp" inputmode="numeric" value="${S.waterGoal}">
    <button class="btn btn-p" onclick="saveWaterGoal()">Save</button>`);
}
function saveWaterGoal(){
  const v = parseInt($("#wg-inp").value, 10);
  if(isNaN(v) || v < 1 || v > 30){ toast("Enter 1–30"); return; }
  S.waterGoal = v; save(); closeModal(); render(); toast("Goal set ✓");
}
function doExport(){
  const blob = new Blob([JSON.stringify(S,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lifehub-backup-" + todayStr() + ".json";
  a.click(); URL.revokeObjectURL(a.href);
  closeModal(); toast("Backup downloaded ✓");
}
function doImport(inp){
  const f = inp.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const d = JSON.parse(r.result);
      if(!d || typeof d !== "object" || !Array.isArray(d.tx)) throw 0;
      S = normalize(d); save(); render(); toast("Data restored ✓");
    }catch(e){ toast("That file isn't a valid backup"); }
  };
  r.readAsText(f); inp.value = "";
}
function resetAll(){
  confirmBox("This erases ALL your data on this device — money, planner, health and habits.", ()=>{
    S = DEF(); save(); render(); toast("Fresh start");
  });
}

/* ================= boot ================= */
applyRecur();
render();
route();
checkRemind();
setInterval(checkRemind, 60000);
setInterval(applyRecur, 3600000);
if("serviceWorker" in navigator && location.protocol === "https:"){
  navigator.serviceWorker.register("sw.js").catch(function(){});
}
