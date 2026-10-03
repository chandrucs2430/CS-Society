'use strict';

/* ---------- map ---------- */
/* ---------- real map (Leaflet + OpenStreetMap data) ---------- */
const C0={lat:10.8155,lng:78.6965}; /* Tiruchirappalli */
const KMLAT=111.32,KMLNG=111.32*Math.cos(C0.lat*Math.PI/180);
const toLL=(x,y)=>[C0.lat-(y-HOME.y)*KM/KMLAT,C0.lng+(x-HOME.x)*KM/KMLNG];
const toXY=ll=>({x:HOME.x+(ll.lng-C0.lng)*KMLNG/KM,y:HOME.y-(ll.lat-C0.lat)*KMLAT/KM});
function leafMap(el,o){o=o||{};const LF=window.L;
  if(!LF){el.innerHTML='<p class="muted" style="padding:24px">The map couldn’t load. Check your internet connection and refresh the page.</p>';return null}
  const m=LF.map(el,{zoomControl:o.zoomControl!==false,scrollWheelZoom:o.scroll!==false,keyboard:o.keyboard!==false,dragging:o.drag!==false,touchZoom:o.drag!==false,doubleClickZoom:o.drag!==false,boxZoom:false});
  const esri=LF.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri, HERE, Garmin, OpenStreetMap contributors'}).addTo(m);
  let swapped=false;esri.on('tileerror',()=>{if(swapped)return;swapped=true;m.removeLayer(esri);LF.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(m)});
  m.setView(toLL(HOME.x,HOME.y),o.zoom||14);return m}
function pinIcon(i,o){const g=pinG(i,{sel:o&&o.sel}).replace(`translate(${i.x} ${i.y})`,'translate(20 52)');
  return window.L.divIcon({className:'pinicon',html:`<svg width="40" height="56" viewBox="0 0 40 56" style="overflow:visible">${g}</svg>`,iconSize:[40,56],iconAnchor:[20,52]})}
function addPins(layer,list,o){o=o||{};list.forEach(i=>{const mk=window.L.marker(toLL(i.x,i.y),{icon:pinIcon(i,{sel:o.sel===i.id}),title:i.title,alt:i.title,zIndexOffset:o.sel===i.id?1000:0,riseOnHover:true,keyboard:!!o.onclick}).addTo(layer);if(o.onclick)mk.on('click',()=>o.onclick(i.id))})}
function homeMarker(layer){window.L.circleMarker(toLL(HOME.x,HOME.y),{radius:8,color:'#fff',weight:3,fillColor:'#1B7F4E',fillOpacity:1}).bindTooltip('Your pin').addTo(layer)}
function pickMarker(layer,x,y){window.L.marker(toLL(x,y),{icon:window.L.divIcon({className:'pinicon',html:'<svg width="36" height="44" viewBox="-18 -40 36 44" style="overflow:visible"><path d="M0 0C-6-11-18-17-18-30a18 18 0 1 1 36 0C18-17 6-11 0 0z" fill="#36BC7A" stroke="#fff" stroke-width="3"/><circle cy="-30" r="7" fill="#0B2B26"/></svg>',iconSize:[36,44],iconAnchor:[18,40]}),keyboard:false,interactive:false}).addTo(layer)}
function fitPins(m,list){const pts=list.map(i=>toLL(i.x,i.y));pts.push(toLL(HOME.x,HOME.y));m.fitBounds(pts,{padding:[50,50],maxZoom:16})}
new MutationObserver(()=>{if(!window.L)return;document.querySelectorAll('[data-leaf]:not([data-done])').forEach(el=>{el.dataset.done=1;
  const x=+el.dataset.x,y=+el.dataset.y,m=leafMap(el,{zoomControl:false,scroll:false,drag:false,keyboard:false,zoom:16});if(!m)return;
  m.setView(toLL(x,y),16);const g=window.L.layerGroup().addTo(m);
  if(el.dataset.kind==='pick')pickMarker(g,x,y);else{const i=iss(+el.dataset.id);if(i)addPins(g,[i])}})}).observe(document.body,{childList:true,subtree:true});

const BLOCKS=[[320,60,70,70],[410,60,90,70],[545,70,80,60],[640,70,90,70],[330,160,80,90],[425,160,75,100],[545,150,65,48],[630,160,100,100],[330,326,60,60],[410,334,90,56],[545,346,50,40],[640,330,90,50],[80,322,70,70],[165,322,110,58],[170,396,90,32],[60,512,100,40],[200,522,120,36],[360,516,110,40],[560,506,120,40]];
const TREES=[[110,130],[140,225],[250,125],[262,235],[120,180],[230,250],[165,120],[255,170],[100,240]];
const BASE=`<rect x="-1500" y="-1500" width="4000" height="4000" fill="#EAF3EC"/>
<g fill="#FFFFFF">${BLOCKS.map(b=>`<rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" rx="6"/>`).join('')}</g>
<rect x="88" y="104" width="200" height="160" rx="44" fill="#CDE8D3"/>
<g fill="#8FCB9F">${TREES.map(t=>`<circle cx="${t[0]}" cy="${t[1]}" r="11"/>`).join('')}</g>
<g stroke="#FFFFFF" fill="none" stroke-linecap="round">
<path d="M-400 300C200 296 600 306 1200 298" stroke-width="15"/>
<path d="M520 -400C524 150 516 400 522 900" stroke-width="11"/>
<path d="M300 -400L296 900" stroke-width="11"/>
<path d="M298 420C450 400 600 420 1200 395" stroke-width="11"/></g>
<g stroke="#BBD3C2" fill="none" stroke-width="1.6" stroke-dasharray="7 9" opacity=".7">
<path d="M-400 300C200 296 600 306 1200 298"/><path d="M520 -400C524 150 516 400 522 900"/><path d="M300 -400L296 900"/></g>
<path d="M-400 490C-250 460 -100 480 -10 480C140 450 250 505 400 480S650 420 810 455S1100 430 1400 450" fill="none" stroke="#CBE7E2" stroke-width="24" stroke-linecap="round"/>
<path d="M-400 490C-250 460 -100 480 -10 480C140 450 250 505 400 480S650 420 810 455S1100 430 1400 450" fill="none" stroke="#8CCFC4" stroke-width="3" opacity=".7"/>
<rect x="508" y="440" width="28" height="36" rx="3" fill="#2B6B5F" opacity=".0"/>
<rect x="535" y="222" width="46" height="32" rx="4" fill="#DCE9DF"/>
<rect x="590" y="322" width="46" height="30" rx="4" fill="#DCE9DF"/>
<rect x="622" y="360" width="64" height="38" rx="4" fill="#DCE9DF"/>
<rect x="338" y="311" width="24" height="8" rx="2" fill="#9CCFB0"/>
<text class="hood" x="400" y="46" text-anchor="middle">KAVERI GARDENS</text>
<text class="hood" x="690" y="540" text-anchor="middle" style="font-size:15px">ORCHARD ROW</text>
<text class="hood" x="90" y="360" text-anchor="middle" style="font-size:15px">MILLSIDE</text>
<text class="ml" x="188" y="130" text-anchor="middle">Community Park</text>
<text class="ml" x="440" y="288">Mill Road</text>
<text class="ml" x="200" y="289">Mill Road</text>
<text class="ml" transform="translate(508 100) rotate(-90)">Library Lane</text>
<text class="ml" transform="translate(286 360) rotate(-90)">Park Road</text>
<text class="ml" x="410" y="402">Orchard Street</text>
<text class="ml" x="60" y="488">Canal path</text>
<text class="ml" x="558" y="244">Library</text>
<text class="ml" x="640" y="346">Shop</text>
<text class="ml" x="640" y="381">School</text>
<text class="ml" x="368" y="340">Bus stop</text>`;
function pinG(i,o={}){
  const c=ST[i.status].mk,d=distTxt(i);
  return `<g class="pin${o.sel?' sel':''}" data-id="${i.id}" transform="translate(${i.x} ${i.y})" ${o.interactive?`tabindex="0" role="button" aria-label="${esc(i.title)}. ${CAT[i.cat].label}. ${i.status}. ${d} away."`:'aria-hidden="true"'}>
  ${o.sel?'<circle class="halo" r="27" cy="-24"/>':''}<circle class="fring" r="25" cy="-24" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/>
  <g class="pin-in" style="--d:${(o.idx||0)*85}ms"><path d="M0 0C-5-9-15-14-15-25a15 15 0 1 1 30 0C15-14 5-9 0 0z" fill="${c}" stroke="#0F3D2A" stroke-width="2"/><circle cy="-25" r="10.5" fill="#fff"/>
  <path d="${ICONS[i.cat]}" fill="none" stroke="#0F3D2A" stroke-width="${i.cat==='other'?3.4:2.4}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-7 -32) scale(.58)"/>
  <circle cx="13" cy="-38" r="8" fill="#fff" stroke="#0F3D2A" stroke-width="1.5"/><g transform="translate(6.5 -44.5) scale(.54)" color="#0B2B26">${SSYM[i.status]('#0B2B26')}</g></g></g>`;
}
function mapHTML(o){
  const z=o.z||1,w=800/z,h=560/z,cx=o.cx==null?400:o.cx,cy=o.cy==null?280:o.cy;
  const vx=z===1?0:Math.max(-100,Math.min(900-w,cx-w/2)),vy=z===1?0:Math.max(-100,Math.min(660-h,cy-h/2));
  const list=[...(o.issues||[])].sort((a,b)=>a.y-b.y);
  const sel=list.find(i=>i.id===o.sel);
  const pins=list.filter(i=>i!==sel).map((i,k)=>pinG(i,{interactive:o.interactive,idx:k,sel:false})).join('')+(sel?pinG(sel,{interactive:o.interactive,sel:true}):'');
  const home=`<g><circle cx="${HOME.x}" cy="${HOME.y}" r="16" fill="#0F7A4A" opacity=".25"/><circle cx="${HOME.x}" cy="${HOME.y}" r="7" fill="#0F7A4A" stroke="#fff" stroke-width="3"/><text class="ml" x="${HOME.x+14}" y="${HOME.y+22}">Your pin</text></g>`;
  const pick=o.pick?`<g transform="translate(${o.pick.x} ${o.pick.y})"><circle r="18" fill="rgba(169,243,109,.35)"/><path d="M0 0C-6-11-18-17-18-30a18 18 0 1 1 36 0C18-17 6-11 0 0z" fill="#36BC7A" stroke="#fff" stroke-width="3"/><circle cy="-30" r="7" fill="#0B2B26"/></g>`:'';
  return `<svg id="${o.id}" class="map${o.anim?' anim':''}" viewBox="${vx} ${vy} ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="${o.interactive?'group':'img'}" aria-label="${esc(o.label||'Map of Kaveri Gardens')}">${BASE}${o.home===false?'':home}${pins}${pick}</svg>`;
}
const legendHTML=()=>`<ul class="legend" aria-label="Map legend">${STATUSES.map(s=>`<li>${sIcon(s,16)}${s}</li>`).join('')}<li>The icon inside each pin shows the category</li></ul>`;
