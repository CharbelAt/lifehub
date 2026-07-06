"use strict";
/* ============ charts.js — SVG chart builders ============ */

const PALETTE = ["#7c5cff","#3b82f6","#2bd984","#ffb454","#ff5d73","#22d3ee","#a78bfa","#f472b6"];

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

/* line chart with dots + last-value label, for exercise progress */
function progressSVG(vals, color, unit){
  if(vals.length < 2) return `<div class="sub" style="padding:4px 0">Log this exercise at least twice to see progress.</div>`;
  const min = Math.min.apply(null,vals), max = Math.max.apply(null,vals), sp = (max-min) || 1;
  const X = i => 4 + (i/(vals.length-1))*84;
  const Y = v => 4 + (1-(v-min)/sp)*24;
  const pts = vals.map((v,i)=>X(i).toFixed(1)+","+Y(v).toFixed(1)).join(" ");
  let dots = "";
  vals.forEach((v,i)=>{ dots += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="1.4" fill="${color}"/>`; });
  const lx = X(vals.length-1), ly = Y(vals[vals.length-1]);
  return `<svg viewBox="0 0 100 34" style="width:100%;height:80px;display:block">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
    <text x="${Math.min(lx,88).toFixed(1)}" y="${Math.max(ly-3,4).toFixed(1)}" font-size="4.4" font-weight="700" fill="#eef1f8" text-anchor="middle">${vals[vals.length-1]}${unit === undefined ? "kg" : unit}</text></svg>`;
}

function statCard(l, v, cls, sub, tab){
  return `<div class="stat" ${tab?`style="cursor:pointer" onclick="showTab('${tab}')"`:""}>
    <div class="l">${l}</div><div class="v ${cls||""}">${v}</div>${sub?`<div class="l" style="margin-top:3px">${sub}</div>`:""}</div>`;
}
