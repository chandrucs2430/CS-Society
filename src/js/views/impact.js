'use strict';

/* ---------- impact ---------- */
function chartHTML(){
  const rep=SERIES.rep.slice(),res=SERIES.res.slice();rep[11]+=state.extraReported;res[11]+=state.extraResolved;
  const W=640,Hh=280,m={l:38,r:8,t:12,b:36},n=12,gw=(W-m.l-m.r)/n,bw=gw*.34,max=Math.ceil(Math.max(...rep)/10)*10,y=v=>Hh-m.b-(v/max)*(Hh-m.t-m.b);
  const lab=k=>new Date(Date.now()-(11-k)*7*864e5).toLocaleDateString(undefined,{day:'numeric',month:'short'});
  let g='';for(let t=0;t<=max;t+=10)g+=`<line class="axis" x1="${m.l}" x2="${W-m.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axt" x="${m.l-8}" y="${y(t)+4}" text-anchor="end">${t}</text>`;
  const bars=rep.map((v,k)=>{const x0=m.l+k*gw+gw*.12;return `<rect class="bar-r" x="${x0}" y="${y(v)}" width="${bw}" height="${Hh-m.b-y(v)}" rx="3"/><rect class="bar-s" x="${x0+bw+3}" y="${y(res[k])}" width="${bw}" height="${Hh-m.b-y(res[k])}" rx="3"/>${k%2?`<text class="axt" x="${x0+bw}" y="${Hh-12}" text-anchor="middle">${lab(k)}</text>`:''}`}).join('');
  const sum=`Over the last 12 weeks, weekly reports rose from ${rep[0]} to ${rep[11]} and weekly resolutions rose from ${res[0]} to ${res[11]}. Resolutions have kept pace with new reports.`;
  return {svg:`<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-labelledby="ct cd"><title id="ct">Reports and resolved issues per week, last 12 weeks</title><desc id="cd">${esc(sum)}</desc>${g}${bars}</svg>`,sum,rep,res,lab};
}
VIEWS.impact=function(){
  const t=totals(),c=chartHTML(),rate=Math.round(t.res/t.rep*100);
  const feed=[];state.issues.forEach(i=>i.timeline.forEach(e=>{if(e.type!=='reported'||e.who==='me')feed.push({e,i})}));feed.sort((a,b)=>b.e.ts-a.e.ts);
  const dn=state.issues.filter(i=>i.status==='Resolved').sort((a,b)=>b.timeline[b.timeline.length-1].ts-a.timeline[a.timeline.length-1].ts).slice(0,3);
  page(`<div class="wrap"><div class="page-head"><h1>Community impact</h1><p class="lead">What neighbors in Kaveri Gardens have reported and fixed together. <span class="tag-demo">Sample data for this demo</span></p></div>
  <div class="tiles" style="margin-bottom:16px"><div class="tile"><b>${t.rep}</b><span>Issues reported</span></div><div class="tile"><b>${t.res}</b><span>Issues resolved</span></div><div class="tile"><b>${t.hours}</b><span>Volunteer hours</span></div><div class="tile"><b>${t.vol}</b><span>Active volunteers</span></div></div>
  <div class="block" style="margin-bottom:16px"><h2>Contributions over time</h2><p class="muted">Reports and resolved issues per week.</p><div class="chartbox">${c.svg}</div><div class="key"><span><i style="background:var(--bar-a);border:1.5px solid var(--bar-b)"></i>Reported</span><span><i style="background:var(--bar-b)"></i>Resolved</span></div><p style="margin-top:12px">${esc(c.sum)}</p>
  <details><summary>View the chart data as a table</summary><table class="dt"><thead><tr><th>Week of</th><th>Reported</th><th>Resolved</th></tr></thead><tbody>${c.rep.map((v,k)=>`<tr><td>${c.lab(k)}</td><td>${v}</td><td>${c.res[k]}</td></tr>`).join('')}</tbody></table></details></div>
  <div class="grid2"><div class="block"><h2>Resolution rate</h2><p class="muted">${t.res} of ${t.rep} reports have been resolved.</p><div class="prog" role="img" aria-label="${rate} percent of reports resolved"><i style="width:${rate}%"></i></div><p style="margin-top:8px"><b>${rate}%</b> resolved</p></div>
  <div class="block"><h2>Recent activity</h2><ul class="feed">${feed.slice(0,6).map(({e,i})=>`<li>${e.type==='status'?sIcon(e.status,20):ic({reported:'flag',claim:'hand',release:'undo',note:'note'}[e.type],20)}<div><p><strong>${esc(who(e.who))}</strong> ${e.type==='claim'?'claimed':e.type==='status'?'moved to '+e.status:e.type==='release'?'released':e.type==='reported'?'reported':'updated'} <a href="#/issue/${i.id}">${esc(i.title)}</a></p><small class="muted">${timeEl(e.ts)}</small></div></li>`).join('')}</ul></div></div>
  <section class="sec" style="padding-bottom:0"><h2>Completed work</h2><div class="cards cols">${dn.map(doneCard).join('')}</div><p class="cap" style="margin-top:8px">Photos are sample placeholders. Figures are sample data, not verified real-world impact.</p></section><div style="height:30px"></div></div>`);
};
