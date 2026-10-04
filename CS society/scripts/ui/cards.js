'use strict';
/* ---------- cards ---------- */
function icard(i,act){const p=photoOf(i);
  return `<a class="icard${act?' active':''}" href="#/issue/${i.id}" data-id="${i.id}"><div class="thumb">${p?`<img src="${photoSrc(p)}" alt="Photo of the reported issue" loading="lazy">`:ic(i.cat,32)}</div><div><h3>${esc(i.title)}</h3><div class="chips">${chip(i.status)}${catChip(i.cat)}</div><p class="meta">${distTxt(i)} away · reported ${timeEl(i.reportedAt)}</p></div></a>`}
function doneCard(i){const last=i.timeline[i.timeline.length-1],b=photoOf(i),a=lastAfter(i);
  return `<a class="done" href="#/issue/${i.id}"><div class="baf${b&&a?'':' nophoto'}">${b&&a?`<img src="${photoSrc(b)}" alt="Before: ${esc(i.title)}" loading="lazy"><img src="${photoSrc(a)}" alt="After: ${esc(i.title)}" loading="lazy">`:ic('check',34,2.4)}</div><div><h3>${esc(i.title)}</h3><p>Resolved by ${esc(who(i.volunteer))} · ${rel(last.ts)}</p></div></a>`}
const emptyBox=(h,p,href,label)=>`<div class="block emptybox"><h3>${h}</h3><p class="muted">${p}</p>${href?`<a class="btn btn-primary" href="${href}">${label}</a>`:''}</div>`;
const totals=()=>({rep:state.issues.length,res:state.issues.filter(i=>i.status==='Resolved').length,hours:Math.round(state.hours),vol:new Set(state.issues.map(i=>i.volunteer).filter(Boolean)).size});

