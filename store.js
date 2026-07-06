"use strict";
/* ============ store.js — state, schema, migration ============
   All persistence goes through Store so a cloud adapter
   (e.g. Supabase) can replace it without touching modules. */

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
    tx:[], tasks:[], events:[], habits:[], workouts:[], weights:[], recur:[], routines:[],
    water:{}, sleep:{},
    remind:{ on:false, every:3, from:9, to:22, last:0 }
  }));
}

/* Accepts any backup/legacy object and returns a valid state. */
function normalize(d){
  const s = DEF();
  if(!d || typeof d !== "object") return s;
  const copy = ["name","balance","hideBal","budget","waterGoal","tx","tasks","habits","workouts","weights","recur","routines"];
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
  /* workouts: ensure structured exercise list */
  s.workouts = (s.workouts||[]).map(w => Object.assign({}, w, { ex: Array.isArray(w.ex) ? w.ex : [] }));
  if(!Array.isArray(s.routines)) s.routines = [];
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
        localStorage.setItem(KEY, JSON.stringify(s)); /* migrate; keep v1 as safety copy */
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
