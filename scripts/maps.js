'use strict';
/* ---------- map ---------- */
/* ---------- real map (Leaflet + OpenStreetMap data) ---------- */
let C0={lat:state.loc.lat,lng:state.loc.lng};
const KMLAT=111.32,KMLNG=()=>111.32*Math.cos(C0.lat*Math.PI/180);
const toLL=(x,y)=>[C0.lat-(y-HOME.y)*KM/KMLAT,C0.lng+(x-HOME.x)*KM/KMLNG()];
const toXY=ll=>({x:HOME.x+(ll.lng-C0.lng)*KMLNG()/KM,y:HOME.y-(ll.lat-C0.lat)*KMLAT/KM});
const MAPS=new Map();
function disposeMaps(){
  if(typeof liveSet!=='undefined')liveSet.clear();
  if(typeof liveHook==='function')liveHook=null;
  MAPS.forEach((map,el)=>{try{map.remove()}catch(error){console.warn('Could not dispose map instance:',error)}});
  MAPS.clear();
}
function destroyMap(el){
  const map=MAPS.get(el);
  if(map){try{map.remove()}catch(error){console.warn('Could not dispose failed map instance:',error)}MAPS.delete(el)}
}
function showMapFailure(el,error){
  console.warn('Map initialization or tile loading failed:',error);
  destroyMap(el);
  el.dataset.done='failed';
  const offline=!navigator.onLine;
  el.innerHTML=`<section class="map-error" role="alert" aria-label="Map failed to load"><h2>Map failed to load</h2><p>${offline?'A connection is needed to load map tiles.':'The map service or library could not be reached.'} You can still use the rest of the app.</p><button type="button" class="btn btn-primary" data-map-retry>Try again</button>${offline?'<a class="btn btn-ghost" href="#/offline?feature=map">Connection help</a>':''}</section>`;
}
function loadLeaflet(){
  if(window.L)return Promise.resolve();
  if(loadLeaflet.pending)return loadLeaflet.pending;
  loadLeaflet.pending=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload=()=>window.L?resolve():reject(new Error('Leaflet loaded without exposing its API'));
    script.onerror=()=>reject(new Error('Leaflet could not be downloaded'));
    document.head.appendChild(script);
  }).finally(()=>{loadLeaflet.pending=null});
  return loadLeaflet.pending;
}
function retryMap(el){
  if(!navigator.onLine){go('#/offline?feature=map&return='+encodeURIComponent(currentDestination()));return}
  const restart=()=>{if(document.body.contains(el))route()};
  if(window.L){restart();return}
  loadLeaflet().then(restart).catch(error=>{
    console.error('Map retry failed:',error);
    if(document.body.contains(el))showMapFailure(el,error);
  });
}
function leafMap(el,o){
  o=o||{};
  destroyMap(el);
  if(!navigator.onLine){showMapFailure(el,new Error('Browser reports that the device is offline'));return null}
  const LF=window.L;
  if(!LF){showMapFailure(el,new Error('Leaflet is unavailable'));return null}
  try{
    const m=LF.map(el,{zoomControl:o.zoomControl!==false,scrollWheelZoom:o.scroll!==false,keyboard:o.keyboard!==false,dragging:o.drag!==false,touchZoom:o.drag!==false,doubleClickZoom:o.drag!==false,boxZoom:false});
    MAPS.set(el,m);el.dataset.done='true';
    let swapped=false,failedTiles=0,loadedTile=false;
    const esri=LF.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri, HERE, Garmin, OpenStreetMap contributors'});
    const fallback=()=>{
      if(swapped)return;
      swapped=true;m.removeLayer(esri);
      const osm=LF.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
      osm.on('tileload',()=>{loadedTile=true;failedTiles=0});
      osm.on('tileerror',event=>{failedTiles++;if(!loadedTile&&failedTiles>=3)showMapFailure(el,event.error||new Error('OpenStreetMap tiles failed to load'))});
      osm.addTo(m);
    };
    esri.on('tileerror',fallback).addTo(m);
    m.setView(toLL(HOME.x,HOME.y),o.zoom||14);if(o.live!==false&&o.zoomControl!==false)attachLive(m);return m;
  }catch(error){showMapFailure(el,error);return null}
}
document.addEventListener('click',event=>{
  const retry=event.target.closest('[data-map-retry]');
  if(retry){const el=retry.closest('[data-leaf],.leafmap,#heroLeaf,#profMap,#pickmap,#dirMap');if(el)retryMap(el)}
});
function pinIcon(i,o){const g=pinG(i,{sel:o&&o.sel}).replace(`translate(${i.x} ${i.y})`,'translate(20 52)');
  return window.L.divIcon({className:'pinicon',html:`<svg width="40" height="56" viewBox="0 0 40 56" style="overflow:visible">${g}</svg>`,iconSize:[40,56],iconAnchor:[20,52]})}
function addPins(layer,list,o){o=o||{};list.forEach(i=>{const mk=window.L.marker(toLL(i.x,i.y),{icon:pinIcon(i,{sel:o.sel===i.id}),title:i.title,alt:i.title,zIndexOffset:o.sel===i.id?1000:0,riseOnHover:true,keyboard:!!o.onclick}).addTo(layer);if(o.onclick)mk.on('click',()=>o.onclick(i.id))})}
function homeMarker(layer){window.L.circleMarker(toLL(HOME.x,HOME.y),{radius:8,color:'#fff',weight:3,fillColor:'#1B7F4E',fillOpacity:1}).bindTooltip('Your pin').addTo(layer)}
function pickMarker(layer,x,y){window.L.marker(toLL(x,y),{icon:window.L.divIcon({className:'pinicon',html:'<svg width="36" height="44" viewBox="-18 -40 36 44" style="overflow:visible"><path d="M0 0C-6-11-18-17-18-30a18 18 0 1 1 36 0C18-17 6-11 0 0z" fill="#36BC7A" stroke="#fff" stroke-width="3"/><circle cy="-30" r="7" fill="#0B2B26"/></svg>',iconSize:[36,44],iconAnchor:[18,40]}),keyboard:false,interactive:false}).addTo(layer)}
function fitPins(m,list){if(!list.length)return;const pts=list.map(i=>toLL(i.x,i.y));pts.push(toLL(HOME.x,HOME.y));m.fitBounds(pts,{padding:[50,50],maxZoom:16})}
new MutationObserver(()=>{document.querySelectorAll('[data-leaf]:not([data-done])').forEach(el=>{
  const x=+el.dataset.x,y=+el.dataset.y,m=leafMap(el,{zoomControl:false,scroll:false,drag:false,keyboard:false,zoom:16});if(!m)return;
  m.setView(toLL(x,y),16);const g=window.L.layerGroup().addTo(m);
  if(el.dataset.kind==='pick')pickMarker(g,x,y);else{const i=iss(el.dataset.id);if(i)addPins(g,[i])}})}).observe(document.body,{childList:true,subtree:true});


/* ---------- location: choose + live tracking ---------- */
const LIVE={on:false,id:null,pos:null,first:false},liveSet=new Set();
function paintLive(o){const LF=window.L;if(!document.body.contains(o.map.getContainer())){liveSet.delete(o);return}
  if(!LIVE.pos){if(o.dot){o.map.removeLayer(o.dot);o.map.removeLayer(o.acc);o.dot=o.acc=null}return}
  const ll=[LIVE.pos.lat,LIVE.pos.lng];
  if(!o.dot){o.acc=LF.circle(ll,{radius:LIVE.pos.acc||30,color:'#2F80ED',weight:1,fillColor:'#2F80ED',fillOpacity:.12,interactive:false}).addTo(o.map);
    o.dot=LF.circleMarker(ll,{radius:9,color:'#fff',weight:3,fillColor:'#2F80ED',fillOpacity:1}).bindTooltip('You are here').addTo(o.map)}
  else{o.dot.setLatLng(ll);o.acc.setLatLng(ll);o.acc.setRadius(LIVE.pos.acc||30)}}
function attachLive(map){const o={map,dot:null,acc:null};liveSet.add(o);paintLive(o)}
const locBar=()=>`<div class="locbar"><span class="locname">${ic('pin',18)}<b>${esc(state.loc.label)}</b></span><span class="locbtns"><button type="button" class="btn btn-ghost btn-sm" data-setloc>Change location</button><button type="button" class="btn btn-sm ${LIVE.on?'btn-primary':'btn-ghost'}" data-live aria-pressed="${LIVE.on}"><span class="livedot"></span>${LIVE.on?(LIVE.pos?'Live location on':'Finding you…'):'Track live location'}</button></span></div>`;
const refreshLocBars=()=>$$('.locbar').forEach(e=>e.outerHTML=locBar());
function startLive(){
  if(!navigator.geolocation){locationRecovery('unsupported',currentDestination());return}
  if(LIVE.on)return;LIVE.on=true;LIVE.first=true;refreshLocBars();
  try{LIVE.id=navigator.geolocation.watchPosition(pos=>{
    LIVE.pos={lat:pos.coords.latitude,lng:pos.coords.longitude,acc:pos.coords.accuracy};
    liveSet.forEach(paintLive);if(liveHook)liveHook();
    if(LIVE.first){LIVE.first=false;liveSet.forEach(o=>{if(document.body.contains(o.map.getContainer())&&!o.map.getContainer().closest('.pickmap.mini'))o.map.setView([LIVE.pos.lat,LIVE.pos.lng],Math.max(o.map.getZoom(),16))})}
    refreshLocBars()},
  err=>{stopLive();locationRecovery(locationReason(err),currentDestination())},
  {enableHighAccuracy:true,maximumAge:5000,timeout:20000})}catch(error){stopLive();console.error('Could not start device location tracking:',error);locationRecovery('unavailable',currentDestination())}}
function stopLive(){if(LIVE.id!=null)navigator.geolocation.clearWatch(LIVE.id);LIVE.id=null;LIVE.on=false;LIVE.pos=null;liveSet.forEach(paintLive);refreshLocBars();if(liveHook)liveHook()}
function setLoc(lat,lng,label,quiet){const was=state.issues.map(i=>toLL(i.x,i.y));state.loc={lat,lng,label};C0={lat,lng};
  state.issues.forEach((i,k)=>{const q=toXY({lat:was[k][0],lng:was[k][1]});i.x=q.x;i.y=q.y});save();if(!quiet){rerender();toast('Location set to '+label+'.')}}
async function revName(lat,lng){try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lng}`);const j=await r.json();return j&&j.display_name?shortName(j.display_name):null}catch(e){return null}}
function pickIcon(){return window.L.divIcon({className:'pinicon',html:'<svg width="36" height="44" viewBox="-18 -40 36 44" style="overflow:visible"><path d="M0 0C-6-11-18-17-18-30a18 18 0 1 1 36 0C18-17 6-11 0 0z" fill="#36BC7A" stroke="#fff" stroke-width="3"/><circle cy="-30" r="7" fill="#0B2B26"/></svg>',iconSize:[36,44],iconAnchor:[18,40]})}
function initProfileMap(){
  const w=$('#profMap');if(!w)return;
  const m=leafMap(w,{scroll:false,zoom:15});if(!m)return;
  const mk=window.L.marker([state.loc.lat,state.loc.lng],{icon:pickIcon(),draggable:true,title:'Drag to move your location'}).addTo(m);
  const apply=async ll=>{mk.setLatLng(ll);const nm=$('#plocname');nm.textContent='Finding the place name…';
    const label=(await revName(ll.lat,ll.lng))||('Pinned location ('+ll.lat.toFixed(4)+', '+ll.lng.toFixed(4)+')');
    setLoc(ll.lat,ll.lng,label,true);nm.textContent=label;const h=$('.phead .who p');if(h)h.lastChild.textContent=' '+label;toast('Location updated.')};
  m.on('click',e=>apply(e.latlng));mk.on('dragend',()=>apply(mk.getLatLng()));
  const g=$('#plocgeo');if(g)g.onclick=()=>{if(!navigator.geolocation){locationRecovery('unsupported',currentDestination());return}
    g.disabled=true;try{navigator.geolocation.getCurrentPosition(pos=>{g.disabled=false;const ll={lat:pos.coords.latitude,lng:pos.coords.longitude};m.setView([ll.lat,ll.lng],16);apply(ll)},
      err=>{g.disabled=false;locationRecovery(locationReason(err),currentDestination())},{enableHighAccuracy:true,timeout:15000})}
    catch(error){g.disabled=false;console.error('Could not request device location:',error);locationRecovery('unavailable',currentDestination())}}}
const shortName=n=>String(n||'').split(',').slice(0,3).join(',').trim();
function openLocDlg(){
  openDlg(`<div class="dlg"><button type="button" class="x" data-close aria-label="Close">${ic('x',22)}</button><h2 id="dlgTitle">Choose your location</h2><p class="muted">Search for your city or area, or use your device’s location.</p>
  <form id="locf" class="row" style="flex-wrap:nowrap;margin-bottom:12px"><div style="flex:1"><label class="vh" for="locq">Search for a place</label><input class="in" id="locq" type="search" autocomplete="off" placeholder="e.g. Coimbatore, Srirangam, Anna Nagar"></div><button class="btn btn-primary">Search</button></form>
  <div id="locres" aria-live="polite" style="margin-bottom:12px"></div>
  <button type="button" class="btn btn-ghost btn-block" id="locgeo">${ic('locate',18)} Use my current location</button></div>`,d=>{
    const res=$('#locres',d);
    $('#locf',d).onsubmit=async e=>{e.preventDefault();const q=$('#locq',d).value.trim();if(!q)return;if(!requireOnline('places',currentDestination()))return;res.innerHTML='<p class="muted">Searching…</p>';
      try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q='+encodeURIComponent(q));const j=await r.json();
        res.innerHTML=j.length?'<ul class="nlist">'+j.map((x,k)=>`<li class="nitem"><a href="#" data-k="${k}"><span class="ni">${ic('pin',22)}</span><span><b>${esc(shortName(x.display_name))}</b><small>${esc(x.display_name)}</small></span></a></li>`).join('')+'</ul>':'<p class="muted">No places found. Try a nearby city or a different spelling.</p>';
        $$('[data-k]',res).forEach(a=>a.onclick=ev=>{ev.preventDefault();const x=j[+a.dataset.k];dlg.close();setLoc(+x.lat,+x.lon,shortName(x.display_name))})}
      catch(err){console.error('Place search failed:',err);if(!navigator.onLine)go('#/offline?feature=places&return='+encodeURIComponent(currentDestination()));else res.innerHTML='<p class="bad" role="alert">The place service couldn’t complete the search. Try again later or select a pin manually.</p>'}};
    $('#locgeo',d).onclick=()=>{const b=$('#locgeo',d);if(!navigator.geolocation){locationRecovery('unsupported',currentDestination());return}
      b.disabled=true;res.innerHTML='<p class="muted">Asking your device for its location…</p>';
      try{navigator.geolocation.getCurrentPosition(async pos=>{const lat=pos.coords.latitude,lng=pos.coords.longitude;let label='My current location';
        if(navigator.onLine)try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lng}`);const j=await r.json();if(j&&j.display_name)label=shortName(j.display_name)}catch(error){console.warn('Reverse place lookup failed:',error)}
        dlg.close();setLoc(lat,lng,label);startLive()},
        err=>{b.disabled=false;locationRecovery(locationReason(err),currentDestination())},{enableHighAccuracy:true,timeout:15000})}
      catch(error){b.disabled=false;console.error('Could not request device location:',error);locationRecovery('unavailable',currentDestination())}}})}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-setloc]')){if(requireOnline('places',currentDestination()))openLocDlg()}
  const l=e.target.closest('[data-live]');if(l){LIVE.on?stopLive():startLive()}});


/* ---------- directions to a claimed issue ---------- */
let liveHook=null,dirMode='foot';
const fmtDist=m=>m<1000?Math.max(10,Math.round(m/10)*10)+' m':(m/1000).toFixed(1)+' km';
const fmtTime=sec=>{const mn=Math.max(1,Math.round(sec/60));return mn<60?mn+' min':Math.floor(mn/60)+' hr '+(mn%60)+' min'};
const DNAME={left:'left','slight left':'slightly left',right:'right','slight right':'slightly right','sharp left':'sharp left','sharp right':'sharp right',uturn:'U-turn'};
function stepText(st){const m=st.maneuver||{},n=st.name?' onto '+st.name:'',mod=m.modifier?(DNAME[m.modifier]||m.modifier):'';
  if(m.type==='arrive')return 'Arrive at the report location';
  if(m.type==='depart')return 'Start'+(st.name?' on '+st.name:'');
  if(m.type==='roundabout'||m.type==='rotary')return 'Take the roundabout'+n;
  if(!mod||m.modifier==='straight')return 'Continue straight'+n;
  return 'Turn '+mod+n}
function dirHTML(i){
  if(i.volunteer!=='me'||!(i.status==='Claimed'||i.status==='In Progress'))return '';
  return `<section class="block" id="dirsec" aria-labelledby="dirh"><h2 id="dirh">Directions to the issue</h2><p class="muted" style="margin-top:0">${esc(i.place)}</p>${locBar()}
  <div class="dirtools"><div class="seg2" role="group" aria-label="Travel mode"><button type="button" data-dmode="foot" aria-pressed="${dirMode==='foot'}">Walking</button><button type="button" data-dmode="car" aria-pressed="${dirMode==='car'}">Driving</button></div><a class="btn btn-primary" id="gmaps" target="_blank" rel="noopener" href="#">${ic('pin',18)} Open in Google Maps</a></div>
  <div class="dirmap" id="dirMap"></div><p class="dirsum" id="dirsum" aria-live="polite">Finding the best route…</p><ol class="dsteps" id="dsteps"></ol></section>`}
function initDirections(i){
  const box=$('#dirMap');if(!box)return;
  if(!requireOnline('directions','#/issue/'+i.id))return;
  const m=leafMap(box,{scroll:false});if(!m){$('#dirsum').textContent='The map needs an internet connection.';return}
  const g=window.L.layerGroup().addTo(m),dest=toLL(i.x,i.y);let lastKey='',lastA=null,timer=0,seq=0;
  const startPt=()=>LIVE.pos?[LIVE.pos.lat,LIVE.pos.lng]:[state.loc.lat,state.loc.lng];
  const hav=(a,b)=>{const r=x=>x*Math.PI/180,dl=r(b[0]-a[0]),dn=r(b[1]-a[1]),h=Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dn/2)**2;return 12742e3*Math.asin(Math.sqrt(h))};
  async function draw(force){
    const a=startPt(),key=dirMode+'|'+(LIVE.pos?'live':'set');
    if(!force&&key===lastKey&&lastA&&hav(a,lastA)<80)return;
    lastKey=key;lastA=a;const my=++seq;g.clearLayers();
    $('#gmaps').href=`https://www.google.com/maps/dir/?api=1&destination=${dest[0]},${dest[1]}&travelmode=${dirMode==='foot'?'walking':'driving'}${LIVE.pos?`&origin=${a[0]},${a[1]}`:''}`;
    if(!LIVE.pos)window.L.circleMarker(a,{radius:9,color:'#fff',weight:3,fillColor:'#1B7F4E',fillOpacity:1}).bindTooltip('Your set location').addTo(g);
    addPins(g,[i],{sel:i.id});
    $('#dirsum').textContent='Finding the best route…';$('#dsteps').innerHTML='';
    try{
      const r=await fetch(`https://routing.openstreetmap.de/routed-${dirMode}/route/v1/driving/${a[1]},${a[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&steps=true`);
      if(!r.ok)throw new Error('Routing service returned HTTP '+r.status);
      const j=await r.json();if(my!==seq)return;if(!j.routes||!j.routes[0])throw new Error('Routing service returned no route');
      const rt=j.routes[0],pts=rt.geometry.coordinates.map(c=>[c[1],c[0]]);
      window.L.polyline(pts,{color:'#fff',weight:10,opacity:.9}).addTo(g);window.L.polyline(pts,{color:'#1B7F4E',weight:6,opacity:.95}).addTo(g);
      m.fitBounds(window.L.latLngBounds(pts).pad(.15));
      $('#dirsum').innerHTML=`<b>${fmtDist(rt.distance)}</b> · about <b>${fmtTime(rt.duration)}</b> ${dirMode==='foot'?'on foot':'by car'}`;
      $('#dsteps').innerHTML=(rt.legs[0].steps||[]).map(st=>`<li>${esc(stepText(st))}<small class="muted"> · ${fmtDist(st.distance)}</small></li>`).join('');
    }catch(e){
      if(my!==seq)return;
      if(!navigator.onLine){go('#/offline?feature=directions&return='+encodeURIComponent('#/issue/'+i.id));return}
      console.warn('Turn-by-turn routing failed:',e);const d=hav(a,dest);
      window.L.polyline([a,dest],{color:'#1B7F4E',weight:4,dashArray:'8 8'}).addTo(g);m.fitBounds(window.L.latLngBounds([a,dest]).pad(.3));
      $('#dirsum').innerHTML=`About <b>${fmtDist(d)}</b> in a straight line (${fmtTime(d/1.4)} on foot). Turn-by-turn steps need an internet connection. You can also use Open in Google Maps.`}}
  $$('[data-dmode]').forEach(b=>b.onclick=()=>{dirMode=b.dataset.dmode;$$('[data-dmode]').forEach(x=>x.setAttribute('aria-pressed',x===b));draw(true)});
  liveHook=()=>{if(!document.body.contains(box)){liveHook=null;return}clearTimeout(timer);timer=setTimeout(()=>draw(false),800)};
  draw(true)}

function pinG(i,o={}){
  const c=ST[i.status].mk,d=distTxt(i);
  return `<g class="pin${o.sel?' sel':''}" data-id="${i.id}" transform="translate(${i.x} ${i.y})" ${o.interactive?`tabindex="0" role="button" aria-label="${esc(i.title)}. ${CAT[i.cat].label}. ${i.status}. ${d} away."`:'aria-hidden="true"'}>
  ${o.sel?'<circle class="halo" r="27" cy="-24"/>':''}<circle class="fring" r="25" cy="-24" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/>
  <g class="pin-in" style="--d:${(o.idx||0)*85}ms"><path d="M0 0C-5-9-15-14-15-25a15 15 0 1 1 30 0C15-14 5-9 0 0z" fill="${c}" stroke="#0F3D2A" stroke-width="2"/><circle cy="-25" r="10.5" fill="#fff"/>
  <path d="${ICONS[i.cat]}" fill="none" stroke="#0F3D2A" stroke-width="${i.cat==='other'?3.4:2.4}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-7 -32) scale(.58)"/>
  <circle cx="13" cy="-38" r="8" fill="#fff" stroke="#0F3D2A" stroke-width="1.5"/><g transform="translate(6.5 -44.5) scale(.54)" color="#0B2B26">${SSYM[i.status]('#0B2B26')}</g></g></g>`;
}

const legendHTML=()=>`<ul class="legend" aria-label="Map legend">${STATUSES.map(s=>`<li>${sIcon(s,16)}${s}</li>`).join('')}<li>The icon inside each pin shows the category</li></ul>`;
