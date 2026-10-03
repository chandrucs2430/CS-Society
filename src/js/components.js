'use strict';

/* ---------- cards ---------- */
function icard(i,act){const p=photoOf(i);
  return `<a class="icard${act?' active':''}" href="#/issue/${i.id}" data-id="${i.id}"><div class="thumb">${p?`<img src="${photoSrc(p,i.cat)}" alt="Photo of the reported issue" loading="lazy">`:ic(i.cat,32)}</div><div><h3>${esc(i.title)}</h3><div class="chips">${chip(i.status)}${catChip(i.cat)}</div><p class="meta">${distTxt(i)} away · reported ${timeEl(i.reportedAt)}</p></div></a>`}
function doneCard(i){const last=i.timeline[i.timeline.length-1];
  return `<a class="done" href="#/issue/${i.id}"><div class="baf"><img src="${photoSrc(photoOf(i)||'before',i.cat)}" alt="Before: ${esc(i.title)}" loading="lazy"><img src="${photoSrc(lastAfter(i)||'after',i.cat)}" alt="After: ${esc(i.title)}" loading="lazy"></div><div><h3>${esc(i.title)}</h3><p>Resolved by ${esc(who(i.volunteer))} · ${rel(last.ts)}</p></div></a>`}
const totals=()=>({rep:SERIES.rep.reduce((a,b)=>a+b,0)+state.extraReported,res:SERIES.res.reduce((a,b)=>a+b,0)+state.extraResolved,hours:Math.round(BASE_HOURS+(state.hours-7.5)),vol:BASE_VOL});
