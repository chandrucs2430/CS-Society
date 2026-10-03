'use strict';

/* ---------- solve ---------- */
let F={q:'',cat:'all',status:'all',dist:'all',view:'list',sel:null},MV={z:1,cx:400,cy:280};
function filtered(){const q=F.q.trim().toLowerCase();return state.issues.filter(i=>(F.cat==='all'||i.cat===F.cat)&&(F.status==='all'||i.status===F.status)&&(F.dist==='all'||distKm(i)<=+F.dist)&&(!q||(i.title+' '+i.place+' '+CAT[i.cat].label).toLowerCase().includes(q))).sort((a,b)=>distKm(a)-distKm(b))}
let SM=null,SMG=null;
function updateMap(list){
  list=list||filtered();if(F.sel&&!list.some(i=>i.id===F.sel))F.sel=null;
  const s=F.sel&&iss(F.sel),mw=$('#mapwrap');
  if(!$('#solveLeaf',mw)){
    mw.innerHTML=legendHTML()+'<div class="mapbox"><div id="solveLeaf" class="leafmap"></div><div id="popslot"></div></div>';
    SM=leafMap($('#solveLeaf'));SMG=null;
    if(SM){SMG=window.L.layerGroup().addTo(SM);fitPins(SM,state.issues)}
  }
  if(SM&&SMG){SMG.clearLayers();homeMarker(SMG);addPins(SMG,list,{sel:F.sel,onclick:selectPin});if(s)SM.panTo(toLL(s.x,s.y))}
  $('#popslot').innerHTML=s?`<div class="pop"><strong>${esc(s.title)}</strong><div class="chips">${chip(s.status)}<span class="chip chip-cat">${distTxt(s)} away</span></div><div class="row"><a class="btn btn-primary btn-sm" href="#/issue/${s.id}">Open issue</a><button type="button" class="btn btn-quiet btn-sm" data-closepop>Close</button></div></div>`:'';
}
function updateSolve(){
  const L=filtered();
  $('#count').textContent=`${L.length} ${L.length===1?'report':'reports'}, closest first`;
  $('#list').innerHTML=L.length?`<div class="cards">${L.map(i=>icard(i,i.id===F.sel)).join('')}</div>`:`<div class="empty">${ic('search',32)}<h3>No reports match these filters</h3><p>Try a wider distance or a different status. If you’ve spotted something that isn’t listed, you can report it.</p><div class="row" style="justify-content:center"><button type="button" class="btn btn-ghost" id="clearF">Clear filters</button><a class="btn btn-primary" href="#/report">Report an issue</a></div></div>`;
  const cb=$('#clearF');if(cb)cb.onclick=()=>{F={...F,q:'',cat:'all',status:'all',dist:'all'};VIEWS.solve([],new URLSearchParams())};
  updateMap(L);
}
function selectPin(id){
  F.sel=F.sel===id?null:id;
  updateSolve();
  if(F.sel){const c=$(`.icard[data-id="${id}"]`);if(c&&window.matchMedia('(min-width:1024px)').matches)c.scrollIntoView({block:'nearest'})}
  const p=$(`.pin[data-id="${id}"]`);if(p)p.focus({preventScroll:true});
}
VIEWS.solve=function(parts,q){
  if(STATUSES.includes(q.get('status')))F.status=q.get('status');else if(q.get('status')==='all')F.status='all';
  if(CAT[q.get('cat')])F.cat=q.get('cat');
  page(`<div class="wrap"><div class="page-head"><h1>Find ways to help</h1><p class="lead">Reports around your area, closest to your pin first. Claim one you can take on, or report something new.</p></div>
  <form class="filters" role="search" aria-label="Filter reports" id="ff2">
   <div class="frow"><div><label class="vh" for="fq">Search reports</label><input class="in" id="fq" type="search" placeholder="Search by title or street" value="${esc(F.q)}"></div>
   <div><label class="vh" for="fc">Category</label><select class="in" id="fc"><option value="all">All categories</option>${Object.keys(CAT).map(k=>`<option value="${k}"${F.cat===k?' selected':''}>${CAT[k].label}</option>`).join('')}</select></div>
   <div><label class="vh" for="fd2">Distance from your pin</label><select class="in" id="fd2">${[['all','Any distance'],['0.5','Within 0.5 km'],['1','Within 1 km'],['2','Within 2 km']].map(o=>`<option value="${o[0]}"${F.dist===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></div></div>
   <div class="row" style="justify-content:space-between;align-items:center"><div class="fchips" role="group" aria-label="Filter by status">${['all',...STATUSES].map(s=>`<button type="button" data-st="${s}" aria-pressed="${F.status===s}">${s==='all'?'All statuses':s}</button>`).join('')}</div>
   <div class="seg2 viewtoggle" role="group" aria-label="Show reports as a list or a map"><button type="button" data-v="list" aria-pressed="${F.view==='list'}">${ic('list',18)} List</button><button type="button" data-v="map" aria-pressed="${F.view==='map'}">${ic('map',18)} Map</button></div></div>
  </form>
  <div class="split" data-view="${F.view}" id="split"><section class="listcol" aria-label="Report list"><p class="count" id="count" aria-live="polite"></p><div id="list"></div></section><section class="mapcol" aria-label="Report map"><div id="mapwrap"></div></section></div><div style="height:30px"></div></div>`);
  const ff=$('#ff2');ff.addEventListener('submit',e=>e.preventDefault());
  $('#fq').oninput=e=>{F.q=e.target.value;updateSolve()};
  $('#fc').onchange=e=>{F.cat=e.target.value;updateSolve()};
  $('#fd2').onchange=e=>{F.dist=e.target.value;updateSolve()};
  $$('[data-st]').forEach(b=>b.onclick=()=>{F.status=b.dataset.st;$$('[data-st]').forEach(x=>x.setAttribute('aria-pressed',x===b));updateSolve()});
  $$('[data-v]').forEach(b=>b.onclick=()=>{F.view=b.dataset.v;$('#split').dataset.view=F.view;$$('[data-v]').forEach(x=>x.setAttribute('aria-pressed',x===b));setTimeout(()=>{if(SM){SM.invalidateSize();fitPins(SM,state.issues)}},60)});
  const mw=$('#mapwrap');
  mw.addEventListener('click',e=>{
        if(e.target.closest('[data-closepop]')){F.sel=null;updateSolve()}
  });
    const lst=$('#list');
  const hl=(id,on)=>{const p=$(`.pin[data-id="${id}"]`);if(p)p.classList.toggle('hl',on)};
  lst.addEventListener('mouseover',e=>{const c=e.target.closest('.icard');if(c)hl(c.dataset.id,true)});
  lst.addEventListener('mouseout',e=>{const c=e.target.closest('.icard');if(c)hl(c.dataset.id,false)});
  lst.addEventListener('focusin',e=>{const c=e.target.closest('.icard');if(c)hl(c.dataset.id,true)});
  lst.addEventListener('focusout',e=>{const c=e.target.closest('.icard');if(c)hl(c.dataset.id,false)});
  updateSolve();
};
