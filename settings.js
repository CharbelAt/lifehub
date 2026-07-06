"use strict";
/* ============ settings.js — menu, categories manager, backup ============ */

/* drawer content (ui.js opens/closes the drawer itself) */
function buildDrawer(){
  $("#drawer-body").innerHTML = `
    <div style="padding:4px 4px 16px">
      <div style="font-size:1.25rem;font-weight:800">⚡ LifeHub</div>
      <div class="sub">${esc(S.name)}</div>
    </div>
    <div class="date-head" style="margin:0 0 4px">Apps</div>
    <div class="menu-item" onclick="closeDrawer();openGym()"><span class="gico">${GYM_SVG.barbell}</span> Gym</div>
    <div class="date-head" style="margin:16px 0 4px">Settings</div>
    <div class="menu-item" onclick="closeDrawer();openName()">👤 Change my name</div>
    <div class="menu-item" onclick="closeDrawer();openCatManager()">🏷️ Manage categories</div>
    <div class="menu-item" onclick="closeDrawer();openWaterGoal()">💧 Water goal (${S.waterGoal} glasses)</div>
    <div class="menu-item" onclick="closeDrawer();doExport()">💾 Back up my data</div>
    <div class="menu-item" onclick="closeDrawer();document.getElementById('import-file').click()">📥 Restore from backup</div>
    <div class="menu-item" style="color:var(--red)" onclick="closeDrawer();resetAll()">🗑️ Erase everything</div>
    <p class="sub" style="margin-top:16px;font-size:.75rem">All data lives only on this device. Back up now and then so you never lose it.</p>`;
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

/* ---- category manager (edit / rename / delete with propagation) ---- */
function openEditCat(kind, name){
  const list = kind === "w" ? S.wtypes : S.cats[kind];
  const c = list.find(x => x.n === name); if(!c) return;
  window._editCat = { kind, name };
  openModal(`<h3>Edit category</h3>
    <div class="half">
      <div><label class="f">Emoji</label><input class="inp" id="ec-e" value="${escq(c.e)}" maxlength="4"></div>
      <div><label class="f">Name</label><input class="inp" id="ec-n" value="${escq(c.n)}"></div>
    </div>
    <p class="sub" style="margin-bottom:12px">Renaming also updates every record that uses this category.</p>
    <div class="row">
      <button class="btn btn-p" style="flex:1" onclick="saveEditCat()">Save</button>
      <button class="btn btn-d" onclick="delCategory('${kind}','${escq(name)}')">🗑</button>
    </div>`);
  focusIn("#ec-n");
}
function saveEditCat(){
  const { kind, name } = window._editCat;
  const e = $("#ec-e").value.trim() || "🏷️";
  const n = $("#ec-n").value.trim();
  if(!n){ toast("Give it a name"); return; }
  const list = kind === "w" ? S.wtypes : S.cats[kind];
  if(n !== name && list.some(c => c.n.toLowerCase() === n.toLowerCase())){ toast("That name already exists"); return; }
  const c = list.find(x => x.n === name); if(!c) return;
  c.e = e; c.n = n;
  if(n !== name){
    if(kind === "w"){
      S.workouts.forEach(w => { if(w.type === name) w.type = n; });
      S.routines.forEach(r => { if(r.type === name) r.type = n; });
    } else {
      S.tx.forEach(t => { if(t.type === kind && t.cat === name) t.cat = n; });
      S.recur.forEach(r => { if(r.type === kind && r.cat === name) r.cat = n; });
    }
  }
  save(); render(); openCatManager(); toast("Saved ✓");
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
    <button class="x" onclick="openEditCat('${kind}','${escq(c.n)}')">✏️</button>
    <button class="x" onclick="delCategory('${kind}','${escq(c.n)}')">✕</button></div>`;
  openModal(`<h3>Manage categories</h3>
    <label class="f">Spending</label>${S.cats.exp.map(c=>row("exp",c)).join("")}
    <button class="btn btn-g mini" style="margin:8px 0 16px" onclick="window._reopen=openCatManager;openNewCat('exp')">+ Add spending category</button>
    <label class="f">Income</label>${S.cats.inc.map(c=>row("inc",c)).join("")}
    <button class="btn btn-g mini" style="margin:8px 0 16px" onclick="window._reopen=openCatManager;openNewCat('inc')">+ Add income category</button>
    <label class="f">Workout types</label>${S.wtypes.map(c=>row("w",c)).join("")}
    <button class="btn btn-g mini" style="margin:8px 0" onclick="window._reopen=openCatManager;openNewWType()">+ Add workout type</button>`);
}

/* ---- backup / restore ---- */
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
  confirmBox("This erases ALL your data on this device — money, planner, gym, health and habits.", ()=>{
    S = DEF(); save(); render(); toast("Fresh start");
  });
}
