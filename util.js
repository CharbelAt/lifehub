"use strict";
/* ============ util.js — shared helpers ============ */

const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const escq = s => esc(s).replace(/'/g,"&#39;");
function focusIn(sel){ setTimeout(()=>{ const e=$(sel); if(e) e.focus(); }, 100); }

/* shared modal working state */
let M = {};

/* ---- dates ---- */
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

/* ---- money format ---- */
function fmt(n){
  const neg = n < 0; const a = Math.abs(+n||0);
  return (neg?"−":"") + "$" + a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}
const fmtS = n => (n>=0?"+":"−") + fmt(Math.abs(n)).replace("−","");

/* ---- category icons (state-backed, S from store.js) ---- */
function catIcon(type, name){
  const f = (S.cats[type]||[]).find(c => c.n === name);
  return f ? f.e : "✨";
}
function wIcon(name){
  const f = S.wtypes.find(w => w.n === name);
  return f ? f.e : "💪";
}
