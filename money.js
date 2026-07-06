"use strict";
/* ============ money.js — balance, budget, transactions, recurring ============ */

/* ---- balance & budget ---- */
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

/* ---- category picker (custom categories live in settings.js manager) ---- */
function drawCatPicker(boxSel, type, cur){
  window._pickCat = n => { M.cat = n; drawCatPicker(boxSel, type, n); };
  $(boxSel).innerHTML = S.cats[type].map(c =>
    `<button class="chip ${cur===c.n?"on":""}" onclick="_pickCat('${escq(c.n)}')">${c.e} ${esc(c.n)}</button>`).join("") +
    `<button class="chip add" onclick="openNewCat('${type}')">+ New</button>`;
}
function openNewCat(type){
  window._afterCat = { type };
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
  const { type } = window._afterCat;
  if(S.cats[type].some(c => c.n.toLowerCase() === n.toLowerCase())){ toast("Already exists"); return; }
  S.cats[type].push({ e, n });
  save(); closeModal(); toast("Category added ✓");
  if(window._reopen) window._reopen();
}

/* ---- transactions ---- */
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
      S.balance += (t.type==="inc" ? -t.amount : t.amount);
      S.balance += (M.type==="inc" ? amt : -amt);
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

/* ---- recurring payments ---- */
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

/* ---- money dashboard ---- */
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

  if(S.budget){
    const p = Math.min(exp/S.budget*100, 100);
    const over = exp > S.budget;
    $("#budget-body").innerHTML = `<div class="spread" style="margin-bottom:6px"><span class="sub">${fmt(exp)} of ${fmt(S.budget)}</span><b class="${over?"red":"grn"}">${over ? fmt(exp-S.budget) + " over" : fmt(S.budget-exp) + " left"}</b></div>
      <div class="bar-bg" style="height:10px"><div class="bar-fill" style="width:${p}%${over?";background:var(--red)":""}"></div></div>`;
  } else {
    $("#budget-body").innerHTML = `<div class="sub">Set a monthly spending limit and I'll track you against it.</div>`;
  }

  $("#recur-list").innerHTML = S.recur.length ? S.recur.map(r =>
    `<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line)">
       <span class="row" style="gap:8px;min-width:0"><span>${catIcon(r.type,r.cat)}</span><span style="font-size:.88rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</span></span>
       <span class="row" style="gap:8px;flex:none"><span style="font-size:.85rem;font-weight:700" class="${r.type==="inc"?"grn":"red"}">${r.type==="inc"?"+":"−"}${fmt(r.amount)}</span><span class="sub" style="font-size:.72rem">${fmtDay(nextRecur(r))}</span><button class="x" onclick="delRecur('${r.id}')">✕</button></span></div>`).join("")
    : `<div class="sub" style="padding:4px 0">Subscriptions, rent, salary — logged automatically on their day every month.</div>`;

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

  const t14 = [];
  for(let i=13;i>=0;i--){
    const ds = addDays(todayStr(),-i);
    t14.push(S.tx.filter(t=>t.type==="exp" && t.date===ds).reduce((a,t)=>a+t.amount,0));
  }
  $("#spend-spark").innerHTML = sparkLineSVG(t14, "#ff5d73") +
    `<div class="spread" style="margin-top:4px"><span class="sub" style="font-size:.7rem">2 weeks ago</span><span class="sub" style="font-size:.7rem">today</span></div>`;

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
