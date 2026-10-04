'use strict';

/* ---------- report flow ---------- */
const newDraft=()=>({step:1,cat:'',title:'',desc:'',photo:null,x:null,y:null,confirmed:false,err:{},done:null});
let D=newDraft();
function grab(){
  const t=$('#rt'),d=$('#rd'),c=$('input[name=cat]:checked');
  if(c)D.cat=c.value;if(t)D.title=t.value;if(d)D.desc=d.value;
}
function reportFoot(back,label,id){return `<div class="rfoot">${back?`<button type="button" class="btn btn-ghost" id="rback">${ic('back',18)} Back</button>`:'<span></span>'}<button type="button" class="btn btn-primary" id="${id||'rnext'}">${label}</button></div>`}
function pickRedraw(){
  const w=$('#pickmap');if(!w)return;
  if(!w._lm){
    const initPickMap=(newMap)=>{
      w._lm=newMap;
      if(w._lm&&window.L){
        w._lg=window.L.layerGroup().addTo(w._lm);
        w._lm.on('click',e=>{const q=toXY(e.latlng);placePin(q.x,q.y)});
        if(D.x!=null)w._lm.setView(toLL(D.x,D.y),16);
        pickRedraw();
      }
    };
    w._lm=leafMap(w,{
      keyboard:false,
      showLmBtn:true,
      onSelectLm:()=>{const lm=$('#lm');if(lm){lm.focus();lm.scrollIntoView({behavior:'smooth',block:'center'})}},
      onRecreated:initPickMap
    });
    if(w._lm&&window.L){
      w._lg=window.L.layerGroup().addTo(w._lm);
      w._lm.on('click',e=>{const q=toXY(e.latlng);placePin(q.x,q.y)});
      if(D.x!=null)w._lm.setView(toLL(D.x,D.y),16);
    }
  }
  if(w._lm&&w._lg&&window.L){
    w._lg.clearLayers();
    homeMarker(w._lg);
    addPins(w._lg,state.issues.filter(i=>i.status!=='Resolved'));
    if(D.x!=null)pickMarker(w._lg,D.x,D.y);
  }
  const l=$('#loclabel');if(l)l.textContent=D.x==null?'No pin yet. Click the map, use the arrow keys, or choose a landmark.':'Pin placed: '+locLabel(D.x,D.y);
}
function placePin(x,y){D.x=Math.round(x);D.y=Math.round(y);D.err.loc='';D.confirmed=false;pickRedraw();const e=$('#e-loc');if(e)e.remove()}
function renderStep(){
  const box=$('#step');
  if(D.step===1){
    box.innerHTML=`<h2>What’s the problem?</h2>
    <fieldset class="field"><legend>Category</legend><div class="opts c2" id="cats">${Object.keys(CAT).map(k=>`<label class="opt"><input type="radio" name="cat" value="${k}"${D.cat===k?' checked':''}><span class="oi">${ic(k,22)}</span><span><b>${CAT[k].label}</b><small>${CAT_HELP[k]}</small></span></label>`).join('')}</div>${errP('cat')}</fieldset>
    <div class="field"><label for="rt">Short title</label><input class="in" id="rt" maxlength="80" value="${esc(D.title)}" aria-describedby="rt-h${D.err.title?' e-title':''}"${D.err.title?' aria-invalid="true"':''} autocomplete="off"><p class="hint" id="rt-h">Say what and where, like “Overflowing bin near the community park”.</p>${errP('title')}</div>
    <div class="field"><label for="rd">More details <span class="muted">(optional)</span></label><textarea class="in" id="rd" maxlength="400" aria-describedby="rd-c">${esc(D.desc)}</textarea><p class="hint" id="rd-c">${D.desc.length} of 400 characters</p></div>
    <div class="note">${ic('shield',18)}<p>If someone is in danger, call your local emergency number. For official services, use your municipal channels.</p></div>${reportFoot(false,'Next: photo '+ic('arrow',18))}`;
    $('#rd').oninput=e=>{$('#rd-c').textContent=e.target.value.length+' of 400 characters'};
    $('#rnext').onclick=()=>{grab();D.err={};if(!D.cat)D.err.cat='Choose a category.';if(D.title.trim().length<8)D.err.title='Add a short title of at least 8 characters.';
      if(Object.keys(D.err).length){renderStep();const f=$('[aria-invalid=true]')||$('#cats input');f&&f.focus();return}
      D.step=2;renderReport()};
  }else if(D.step===2){
    box.innerHTML=`<h2>Add a photo</h2><p class="muted">Optional, but a photo helps volunteers know what to bring.</p><div id="pbox"></div>${reportFoot(true,(D.photo?'Next: location ':'Skip: location ')+ic('arrow',18))}`;
    photoUI($('#pbox'),()=>D.photo,v=>{D.photo=v},D.cat,'before');
    $('#rback').onclick=()=>{D.step=1;renderReport()};$('#rnext').onclick=()=>{D.step=3;renderReport()};
  }else if(D.step===3){
    box.innerHTML=`<h2>Where is it?</h2><p class="muted">Click or tap the map to drop a pin. With a keyboard, focus the map and use the arrow keys (hold Shift to move further).</p>
    <div class="pickmap" id="pickmap" tabindex="0" role="application" aria-label="Location map. Press arrow keys to move the pin, or click to place it." aria-describedby="loclabel"></div>
    <p id="loclabel" class="locname" aria-live="polite" style="font-weight:700;margin:10px 0 0"></p>${D.err.loc?`<p class="err" id="e-loc" role="alert">${ic('alert',16)}<span>${esc(D.err.loc)}</span></p>`:''}
    <div id="locErrorSlot"></div>
    <div class="locrow"><button type="button" class="btn btn-ghost" id="geo">${ic('locate',18)} Use my device location</button><div><label class="vh" for="lm">Or choose a landmark</label><select class="in" id="lm"><option value="">Or choose a landmark…</option>${LM.map((l,k)=>`<option value="${k}">${l.n[0].toUpperCase()+l.n.slice(1)}</option>`).join('')}</select></div></div>
    <p class="hint" id="locmsg" aria-live="polite"></p>${reportFoot(true,'Next: review '+ic('arrow',18))}`;
    pickRedraw();
    const w=$('#pickmap');
    w.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&D.x==null){e.preventDefault();placePin(HOME.x,HOME.y);return}
      const k={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!k)return;e.preventDefault();
      const s=e.shiftKey?30:8;placePin((D.x==null?HOME.x:D.x)+k[0]*s,(D.y==null?HOME.y:D.y)+k[1]*s)});
    $('#lm').onchange=e=>{if(e.target.value==='')return;const l=LM[+e.target.value];placePin(l.x,l.y)};
    $('#geo').onclick=()=>{
      const m=$('#locmsg'),slot=$('#locErrorSlot');
      if(slot)slot.innerHTML='';
      m.textContent='Asking your device for its location…';
      const handlePlaceSearch=()=>{
        const sel=$('#lm');
        if(sel){
          sel.scrollIntoView({behavior:'smooth',block:'center'});
          sel.focus();
          toast('Choose a landmark to place your pin.');
        }
      };
      const handleManualPin=()=>{
        w.scrollIntoView({behavior:'smooth',block:'center'});
        w.focus();
        if(D.x==null)placePin(HOME.x,HOME.y);
        toast('Pin placed. Use arrow keys or click to adjust.');
      };
      if(!navigator.geolocation){
        m.textContent='';
        if(slot)renderLocationError(slot,{code:2},{onSearchPlace:handlePlaceSearch,onManualPin:handleManualPin});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos=>{
          m.textContent='Pin placed at your device location. Move it if it isn’t right.';
          if(slot)slot.innerHTML='';
          const q=toXY({lat:pos.coords.latitude,lng:pos.coords.longitude});
          placePin(q.x,q.y);
          if(w._lm)w._lm.setView(toLL(q.x,q.y),17);
        },
        err=>{
          m.textContent='';
          if(slot)renderLocationError(slot,err,{onSearchPlace:handlePlaceSearch,onManualPin:handleManualPin});
        },
        {timeout:8000,enableHighAccuracy:false}
      );
    };
    $('#rback').onclick=()=>{D.step=2;renderReport()};
    $('#rnext').onclick=()=>{if(D.x==null){D.err.loc='Place a pin on the map before continuing.';renderStep();$('#pickmap').focus();return}D.step=4;renderReport()};
  }else{
    const near=state.issues.find(i=>i.status!=='Resolved'&&i.cat===D.cat&&Math.hypot(i.x-D.x,i.y-D.y)<45);
    box.innerHTML=`<h2>Check and send</h2>
    ${near?`<div class="note" style="margin-bottom:14px">${ic('info',18)}<p>A similar report is already open nearby: <a href="#/issue/${near.id}">${esc(near.title)}</a>. You can still send yours.</p></div>`:''}
    <dl class="review"><div><dt>Category</dt><dd>${catChip(D.cat)}</dd><button type="button" class="btn btn-quiet btn-sm" data-goto="1" aria-label="Edit category">Edit</button></div>
    <div><dt>Title</dt><dd>${esc(D.title)}${D.desc.trim()?`<br><span class="muted">${esc(D.desc)}</span>`:''}</dd><button type="button" class="btn btn-quiet btn-sm" data-goto="1" aria-label="Edit title and details">Edit</button></div>
    <div><dt>Photo</dt><dd>${D.photo?`<img src="${photoSrc(D.photo==='sample'?'before':D.photo,D.cat)}" alt="Selected photo preview" style="max-height:120px;border-radius:10px">`:'<span class="muted">No photo added</span>'}</dd><button type="button" class="btn btn-quiet btn-sm" data-goto="2" aria-label="Edit photo">Edit</button></div>
    <div><dt>Location</dt><dd>${esc(locLabel(D.x,D.y))}</dd><button type="button" class="btn btn-quiet btn-sm" data-goto="3" aria-label="Edit location">Edit</button></div></dl>
    <div class="pickmap mini" aria-label="Map preview"><div class="leafmap" data-leaf data-kind="pick" data-x="${D.x}" data-y="${D.y}"></div></div>
    <div class="check" style="margin-top:16px"><input type="checkbox" id="conf"${D.confirmed?' checked':''}><label for="conf"><b>The pin is in the right place</b><br><span class="muted">I checked the map above and it shows where the problem is.</span></label></div>${errP('conf')}
    ${reportFoot(true,'Send report','rsend')}`;
    $$('[data-goto]').forEach(b=>b.onclick=()=>{D.step=+b.dataset.goto;renderReport()});
    $('#rback').onclick=()=>{D.step=3;renderReport()};
    $('#conf').onchange=e=>{D.confirmed=e.target.checked;const x=$('#e-conf');if(x)x.remove()};
    $('#rsend').onclick=submitReport;
  }
}
function submitReport(){
  if(!$('#conf').checked){D.err.conf='Confirm the pin location before sending.';D.confirmed=false;renderStep();$('#conf').focus();return}
  if(!state.signedIn){needAuth('report');return}
  const prev=earned(),id=state.nextId++,ph=D.photo==='sample'?'before':D.photo,now=Date.now();
  const e={ts:now,who:'me',type:'reported',text:D.desc.trim()};if(ph)e.photo=ph;
  state.issues.unshift({id,title:D.title.trim(),cat:D.cat,status:'New',x:D.x,y:D.y,place:locLabel(D.x,D.y),desc:D.desc.trim()||D.title.trim(),reporter:'me',volunteer:null,reportedAt:now,timeline:[e]});
  state.extraReported++;addNotif('update',id,'Your report was shared with nearby volunteers');checkMilestones(prev);save();
  D.done=id;D.err={};renderReport();renderChrome('report');window.scrollTo(0,0);
  setTimeout(()=>{const j=iss(id);if(j&&j.status==='New'){j.status='Claimed';j.volunteer='arun';j.timeline.push({ts:Date.now(),who:'arun',type:'claim',text:'This claim was simulated by the demo so you can see how notifications work.'});addNotif('claimed',id,'Arun K. claimed your report (demo)');save();renderChrome(parseHash().parts[0]||'home');toast('Demo: Arun K. claimed your report. Check Notifications.')}},9000);
}
function renderReport(){
  if(D.done){
    const i=iss(D.done);
    page(`<div class="wrap rwrap"><div class="page-head"></div><div class="block success"><div class="big">${ic('check',38,2.6)}</div><h1 style="font-size:2rem">Report shared</h1><p class="lead" style="margin:0 auto 12px">Volunteers nearby can see it now. You’ll find updates on the report’s timeline and in Notifications.</p><p>Reference <strong>GN-${String(D.done).padStart(4,'0')}</strong>${i?` · ${esc(i.title)}`:''}</p><p class="cap">Demo: this report is saved only in this browser. In a moment, a simulated volunteer will claim it so you can see the notification flow.</p><div class="row" style="justify-content:center;margin-top:12px"><a class="btn btn-primary" href="#/issue/${D.done}">View your report</a><button class="btn btn-ghost" id="again">Report another</button><a class="btn btn-ghost" href="#/solve?status=all">See the map</a></div></div></div>`);
    $('#again').onclick=()=>{D=newDraft();renderReport();const h=$('h1',app);h.setAttribute('tabindex','-1');h.focus()};
    return;
  }
  const names=['Issue','Photo','Location','Review'];
  page(`<div class="wrap rwrap"><div class="page-head"><h1>Report an issue</h1><p class="lead">It takes about a minute. Your answers stay put if you go back a step.</p></div>
  <ol class="stepper" aria-label="Progress, step ${D.step} of 4">${names.map((n,k)=>`<li class="${k+1<D.step?'done':''}"${k+1===D.step?' aria-current="step"':''}><span class="n">${k+1}. </span>${n}${k+1<D.step?'<span class="vh"> (completed)</span>':''}</li>`).join('')}</ol>
  <div class="block" id="step"></div><div style="height:30px"></div></div>`);
  renderStep();
}
VIEWS.report=function(){renderReport()};
