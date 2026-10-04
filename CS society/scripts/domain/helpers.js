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
function locLabel(x,y){const q=toLL(x,y);return (D.place&&D.px===x&&D.py===y)?D.place:'Pinned location ('+q[0].toFixed(4)+', '+q[1].toFixed(4)+')'}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3800)}
function addNotif(type,issue,text){if(state.profile.prefs[type]===false)return;state.notifs.unshift({id:state.nid++,type,ts:Date.now(),read:false,issue,text})}
function addTL(i,type,text,x){i.timeline.push(Object.assign({ts:Date.now(),who:'me',type,text:text||''},x||{}))}
const photoOf=(i)=>{const t=i.timeline.find(t=>t.type==='reported'&&t.photo);return t?t.photo:null};
const lastAfter=(i)=>{const t=[...i.timeline].reverse().find(t=>(t.photo&&t.photo.startsWith('data:')&&t.type!=='reported'));return t?t.photo:null};


const photoSrc=(p)=>p&&p.startsWith('data:')?p:'';
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

