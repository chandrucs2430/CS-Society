'use strict';

/* ---------- helpers ---------- */
const iss=id=>state.issues.find(i=>i.id===+id);
const short=n=>{const p=String(n||'Neighbor').trim().split(/\s+/);return p.length>1?p[0]+' '+p[p.length-1][0].toUpperCase()+'.':p[0]};
const who=id=>id==='me'?short(state.profile.name):(PPL[id]||'A neighbor');
const whoTag=id=>id==='me'?who(id)+' (you)':who(id);
const initials=n=>String(n||'N').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const rel=ts=>{const m=Math.round((Date.now()-ts)/6e4);if(m<1)return'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<24)return h+' hr ago';const d=Math.round(h/24);if(d===1)return'yesterday';if(d<7)return d+' days ago';return new Date(ts).toLocaleDateString(undefined,{day:'numeric',month:'short'})};
const absT=ts=>new Date(ts).toLocaleString(undefined,{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
const timeEl=ts=>`<time datetime="${new Date(ts).toISOString()}" title="${esc(absT(ts))}">${rel(ts)}</time>`;
const distKm=i=>Math.hypot(i.x-HOME.x,i.y-HOME.y)*KM;
const distTxt=i=>distKm(i).toFixed(1)+' km';
function locLabel(x,y){let b=LM[0],bd=1e9;LM.forEach(l=>{const d=Math.hypot(l.x-x,l.y-y);if(d<bd){bd=d;b=l}});const m=Math.round(bd*4/10)*10;return m<=20?`At ${b.n}`:`About ${m} m from ${b.n}`}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3800)}
function addNotif(type,issue,text){if(state.profile.prefs[type]===false)return;state.notifs.unshift({id:state.nid++,type,ts:Date.now(),read:false,issue,text})}
function addTL(i,type,text,x){i.timeline.push(Object.assign({ts:Date.now(),who:'me',type,text:text||''},x||{}))}
const photoOf=(i)=>{const t=i.timeline.find(t=>t.type==='reported'&&t.photo);return t?t.photo:null};
const lastAfter=(i)=>{const t=[...i.timeline].reverse().find(t=>t.photo==='after'||(t.photo&&t.photo.startsWith('data:')&&t.type!=='reported'));return t?t.photo:null};

/* placeholder photos (inline SVG, clearly labelled) */
function photoSVG(cat,mode){
  const dirty=mode!=='after';
  const colors=['#E8A92E','#B5483A','#3E8FB0','#E4E1D4','#7A5C3E'];
  const deb=n=>Array.from({length:n},(_,k)=>{const x=40+((k*53+17)%320),y=196+((k*37)%46),c=colors[k%5];return k%2?`<rect x="${x}" y="${y}" width="14" height="9" rx="2" fill="${c}" transform="rotate(${k*23} ${x} ${y})"/>`:`<circle cx="${x}" cy="${y}" r="6" fill="${c}"/>`}).join('');
  let obj='';
  if(cat==='bin')obj=`<rect x="165" y="110" width="74" height="96" rx="6" fill="#3F7D6B"/><rect x="158" y="102" width="88" height="14" rx="5" fill="#2E6556"/>${dirty?`<circle cx="188" cy="98" r="14" fill="#E4E1D4"/><rect x="204" y="84" width="26" height="18" rx="4" fill="#B5483A"/><circle cx="170" cy="104" r="9" fill="#E8A92E"/>${deb(10)}`:''}`;
  else if(cat==='damage')obj=`<rect x="110" y="132" width="180" height="16" rx="3" fill="#8B6A45"/><rect x="110" y="108" width="180" height="14" rx="3" fill="#8B6A45" ${dirty?'transform="rotate(-4 200 115)"':''}/><rect x="124" y="148" width="10" height="56" fill="#4B3A28"/><rect x="266" y="148" width="10" height="56" fill="#4B3A28"/>${dirty?'<path d="M190 108l8 14-10 2z" fill="#D9D3C2"/>':'<path d="M115 128h170" stroke="#A5835A" stroke-width="2"/>'}`;
  else if(cat==='dumping')obj=dirty?`<polygon points="120,206 160,150 220,138 280,176 290,206" fill="#6B5B4B"/><rect x="170" y="120" width="60" height="38" rx="4" fill="#C4B79A"/><circle cx="260" cy="160" r="22" fill="#3A4F49"/><rect x="132" y="168" width="40" height="30" rx="4" fill="#8E8A7A"/>`:`<path d="M60 205c60-10 120-6 280 0" stroke="#7FA877" stroke-width="3" fill="none"/>`;
  else if(cat==='other')obj=dirty?`<rect x="60" y="150" width="280" height="22" rx="10" fill="#6B4C2E" transform="rotate(-8 200 160)"/><circle cx="110" cy="146" r="22" fill="#3E7A4B"/><circle cx="300" cy="186" r="20" fill="#3E7A4B"/>`:`<circle cx="320" cy="140" r="28" fill="#4C8A58"/><rect x="316" y="160" width="8" height="44" fill="#5B4430"/>`;
  else obj=`<path d="M0 205h400" stroke="#9FB09A" stroke-width="2"/><rect x="40" y="170" width="320" height="22" fill="#CFC9B8"/>${dirty?deb(16):'<circle cx="90" cy="160" r="5" fill="#E8C8D6"/><circle cx="300" cy="158" r="5" fill="#F0D88A"/>'}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE5E0"/><stop offset="1" stop-color="#EAF1E4"/></linearGradient></defs><rect width="400" height="260" fill="url(#g)"/><rect y="200" width="400" height="60" fill="#B9C9B5"/>${obj}<rect x="0" y="232" width="400" height="28" fill="rgba(11,43,38,.55)"/><text x="12" y="250" fill="#fff" font-family="sans-serif" font-size="12">Sample photo placeholder · ${mode==='after'?'after':mode==='progress'?'in progress':'before'}</text></svg>`;
}
const photoSrc=(p,cat)=>p&&p.startsWith('data:')?p:'data:image/svg+xml;utf8,'+encodeURIComponent(photoSVG(cat,p||'before'));
const altFor=(i,p)=>p==='after'||(p&&p.startsWith('data:')&&false)?`After: ${i.title}`:`Photo for: ${i.title}`;

/* ---------- badges / stats ---------- */
function myStats(){
  const L=state.issues;
  return {reports:L.filter(i=>i.reporter==='me').length,
    claims:L.filter(i=>i.timeline.some(t=>t.who==='me'&&t.type==='claim')).length,
    resolved:L.filter(i=>i.volunteer==='me'&&i.status==='Resolved').length,
    photos:L.reduce((n,i)=>n+i.timeline.filter(t=>t.who==='me'&&t.type!=='reported'&&t.photo).length,0),
    hours:state.hours};
}
const BADGES=[
 {id:'first',role:'resident',ic:'leaf',name:'First report',desc:'Shared your first report.',ok:s=>s.reports>=1,prog:s=>`${Math.min(s.reports,1)} of 1 report`},
 {id:'keen',role:'resident',ic:'eye',name:'Keen eyes',desc:'Shared three reports.',ok:s=>s.reports>=3,prog:s=>`${Math.min(s.reports,3)} of 3 reports`},
 {id:'help',role:'volunteer',ic:'hand',name:'Helping hand',desc:'Claimed your first issue.',ok:s=>s.claims>=1,prog:s=>`${Math.min(s.claims,1)} of 1 issue`},
 {id:'done',role:'volunteer',ic:'check',name:'Finished the job',desc:'Resolved an issue.',ok:s=>s.resolved>=1,prog:s=>`${Math.min(s.resolved,1)} of 1 issue`},
 {id:'photo',role:'volunteer',ic:'camera',name:'Show and tell',desc:'Added a progress or completion photo.',ok:s=>s.photos>=1,prog:s=>`${Math.min(s.photos,1)} of 1 photo`},
 {id:'hours',role:'volunteer',ic:'clock',name:'Time well spent',desc:'Gave 10 volunteer hours.',ok:s=>s.hours>=10,prog:s=>`${Math.min(s.hours,10)} of 10 hours`}];
const earned=()=>{const s=myStats();return BADGES.filter(b=>b.ok(s)).map(b=>b.id)};
function checkMilestones(prev){const now=earned();return now.filter(id=>!prev.includes(id)).map(id=>{const b=BADGES.find(x=>x.id===id);addNotif('milestone',null,'New milestone: '+b.name);return b.name})}
const msTxt=ms=>ms.length?' You reached a milestone: '+ms.join(', ')+'.':'';
