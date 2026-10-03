'use strict';

/* ---------- home ---------- */
VIEWS.home=function(){
  const t=totals(),bench=iss(103);
  const near=state.issues.filter(i=>i.status==='New').sort((a,b)=>distKm(a)-distKm(b)).slice(0,3);
  const dn=state.issues.filter(i=>i.status==='Resolved').sort((a,b)=>b.timeline[b.timeline.length-1].ts-a.timeline[a.timeline.length-1].ts).slice(0,3);
  page(`<section class="hero"><div class="heromap"><div id="heroLeaf" class="leafmap"></div>
  </div>
  <div class="wrap"><div class="hp"><h1>Make your neighborhood cleaner, safer and better cared for.</h1>
  <p class="lead">Report litter, dumping, broken benches and overflowing bins in about a minute. Neighbors can then claim the job, share progress and show the finished result.</p>
  <div class="cta"><a class="btn btn-primary" href="#/report">${ic('plus',20,2.4)} Report an issue</a><a class="btn btn-light" href="#/solve?status=New">${ic('hand',20)} Find ways to help</a></div>
  <p class="safety">${ic('shield',18)}<span>For emergencies, call your local emergency number. CS Society supports community action and issue tracking. It doesn’t replace official municipal services.</span></p></div><div class="heropop"><div class="chips">${chip(bench.status)}${catChip(bench.cat)}</div><strong>${esc(bench.title)}</strong><span class="muted">${esc(who(bench.volunteer))} ordered new boards and is fixing it.</span><a href="#/issue/103">Follow the timeline</a></div></div></section>
  <section class="sec" style="padding-bottom:0"><div class="wrap"><div class="statline" aria-label="Community impact summary, sample data"><div><b>${t.rep}</b><span>issues reported</span></div><div><b>${t.res}</b><span>resolved by neighbors</span></div><div><b>${t.hours}</b><span>volunteer hours</span></div><div><b>${t.vol}</b><span>active volunteers</span></div></div><p style="margin:10px 0 0"><span class="tag-demo">Sample figures for this demo, last 12 weeks</span></p></div></section>
  <section class="sec"><div class="wrap"><h2>How it works</h2><div class="twocol">
   <div class="block"><h3>If you spot a problem</h3><ol class="steps-list"><li><div><strong>Say what and where</strong><p>Pick a category, add a short title and drop a pin on the map.</p></div></li><li><div><strong>Check the pin and send</strong><p>Confirm the location, then share it with nearby volunteers.</p></div></li><li><div><strong>Follow along</strong><p>Get a notification when someone claims it, adds an update or finishes.</p></div></li></ol></div>
   <div class="block"><h3>If you can lend a hand</h3><ol class="steps-list"><li><div><strong>Browse what’s nearby</strong><p>Filter by category, distance and status on the map or in the list.</p></div></li><li><div><strong>Claim a task</strong><p>Let neighbors know you’re on it. You can release it if plans change.</p></div></li><li><div><strong>Share progress</strong><p>Post notes and photos, then mark it resolved when the work is done.</p></div></li></ol></div></div></div></section>
  <section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-head"><h2>Waiting for a volunteer, near you</h2><a href="#/solve?status=New">See all on the map</a></div><div class="cards cols">${near.map(i=>icard(i)).join('')}</div></div></section>
  <section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-head"><h2>Recently finished</h2><a href="#/impact">Community impact</a></div><div class="cards cols">${dn.map(doneCard).join('')}</div><p class="cap" style="margin-top:8px">Photos are sample placeholders.</p></div></section>
  <section class="sec" style="padding-top:0"><div class="wrap"><h2>Four statuses, so everyone knows where things stand</h2><ul class="statusflow">${STATUSES.map(s=>`<li><span>${chip(s)}</span><p>${ST[s].help}</p></li>`).join('')}</ul><p class="muted">Every change lands on the report’s timeline and in Notifications, with the name of who made it.</p></div></section>`);
  const hm=leafMap($('#heroLeaf'),{scroll:false});
  if(hm){const g=window.L.layerGroup().addTo(hm);homeMarker(g);addPins(g,state.issues,{onclick:id=>go('#/issue/'+id)});fitPins(hm,state.issues)}
};
