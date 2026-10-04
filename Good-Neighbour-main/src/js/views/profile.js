'use strict';

/* ---------- profile ---------- */
function myHistory(kind){
  const out=[];
  state.issues.forEach(i=>i.timeline.forEach(t=>{if(t.who==='me'&&(kind==='resident'?t.type==='reported':t.type!=='reported'))out.push({t,i})}));
  return out.sort((a,b)=>b.t.ts-a.t.ts).slice(0,8);
}
const histLabel=t=>t.type==='reported'?'You reported':t.type==='claim'?'You claimed':t.type==='release'?'You released':t.type==='status'?'You changed status to '+t.status+' on':'You posted an update on';
const histHTML=(L,empty)=>L.length?`<ul class="hist">${L.map(({t,i})=>`<li>${t.type==='status'?sIcon(t.status,20):ic({reported:'flag',claim:'hand',release:'undo',note:'note'}[t.type],20)}<div><p>${histLabel(t)} <a href="#/issue/${i.id}">${esc(i.title)}</a></p><small class="muted">${timeEl(t.ts)}</small></div></li>`).join('')}</ul>`:`<p class="muted">${empty}</p>`;
function badgesHTML(role){
  const s=myStats();
  return `<div class="badges">${BADGES.filter(b=>b.role===role).map(b=>{const ok=b.ok(s);return `<div class="badge${ok?'':' locked'}"><span class="bi">${ic(b.ic,24)}</span><div><b>${b.name}</b><p>${ok?b.desc+' Earned.':b.desc+' Next: '+b.prog(s)+'.'}</p></div></div>`}).join('')}</div>`;
}
VIEWS.me=function(parts,q){
  if(!state.signedIn)return needAuth('me');
  const p=state.profile,s=myStats();
  const tab=['resident','volunteer','settings'].includes(q.get('tab'))?q.get('tab'):(isVol()?'volunteer':'resident');
  const mine=state.issues.filter(i=>i.reporter==='me').sort((a,b)=>b.reportedAt-a.reportedAt);
  const tasks=state.issues.filter(i=>i.volunteer==='me');
  const cnt=st=>tasks.filter(i=>i.status===st).length;
  const next=state.issues.filter(i=>i.status==='New').sort((a,b)=>distKm(a)-distKm(b))[0];
  let body='';
  if(tab==='resident'){
    body=p.roles.includes('resident')?`<div class="block" style="margin-bottom:16px"><div class="sec-head" style="margin-bottom:12px"><h2>Your reports</h2><a class="btn btn-primary btn-sm" href="#/report">${ic('plus',18,2.4)} New report</a></div>${mine.length?`<div class="cards">${mine.map(i=>icard(i)).join('')}</div>`:`<div class="empty">${ic('leaf',32)}<h3>No reports yet</h3><p>When you spot something, report it and it will show up here with a live timeline.</p><a class="btn btn-primary" href="#/report">Report an issue</a></div>`}</div>
    <div class="grid2"><div class="block"><h2>Milestones</h2>${badgesHTML('resident')}</div><div class="block"><h2>Contribution history</h2>${histHTML(myHistory('resident'),'Your reports will appear here.')}</div></div>`
    :`<div class="empty">${ic('user',32)}<h3>Resident features are off</h3><p>Turn them on in Settings to report issues.</p></div>`;
  }else if(tab==='volunteer'){
    body=p.roles.includes('volunteer')?`<div class="tiles" style="margin-bottom:16px"><div class="tile"><b>${cnt('Claimed')}</b><span>Claimed</span></div><div class="tile"><b>${cnt('In Progress')}</b><span>In progress</span></div><div class="tile"><b>${cnt('Resolved')}</b><span>Resolved</span></div><div class="tile"><b>${state.hours}</b><span>Volunteer hours</span></div></div>
    <div class="block" style="margin-bottom:16px"><h2>Your next nearby task</h2>${next?`<div class="cards" style="margin-bottom:12px">${icard(next)}</div><a class="btn btn-primary" href="#/issue/${next.id}">Take a look</a> <a class="btn btn-ghost" href="#/solve?status=New">See all open tasks</a>`:`<div class="empty"><p>Nothing is waiting right now. Thank you for checking.</p></div>`}</div>
    <div class="block" style="margin-bottom:16px"><h2>Your tasks</h2>${tasks.length?`<div class="cards">${tasks.map(i=>icard(i)).join('')}</div>`:`<p class="muted">Claim a report and it will appear here.</p>`}</div>
    <div class="grid2"><div class="block"><h2>Milestones</h2>${badgesHTML('volunteer')}</div><div class="block"><h2>Contribution history</h2>${histHTML(myHistory('volunteer'),'Your claims and updates will appear here.')}</div></div>`
    :`<div class="empty">${ic('hand',32)}<h3>Volunteering is off</h3><p>Turn it on to claim tasks and share progress.</p><button class="btn btn-primary" id="enV">Turn on volunteering</button></div>`;
  }else{
    const pr=p.prefs,PN=[['claimed','A report is claimed'],['update','A status or note is added'],['resolved','A report is resolved'],['milestone','You reach a milestone'],['near','New reports appear near your pin']];
    body=`<form class="block" id="sf" novalidate style="max-width:680px"><h2>Profile</h2>
    <div class="field"><label for="sn">Name</label><input class="in" id="sn" value="${esc(p.name)}" autocomplete="name"></div>
    <div class="field"><label for="sh">Neighborhood</label><select class="in" id="sh">${['Kaveri Gardens','Orchard Row','Millside'].map(h=>`<option${p.hood===h?' selected':''}>${h}</option>`).join('')}</select></div>
    <fieldset><legend>How you take part</legend><div class="check"><input type="checkbox" id="rr"${p.roles.includes('resident')?' checked':''}><label for="rr">Resident: report problems</label></div><div class="check"><input type="checkbox" id="rv"${p.roles.includes('volunteer')?' checked':''}><label for="rv">Volunteer: claim and fix problems</label></div></fieldset>
    <div class="field"><label for="sp">Profile photo <span class="muted">(optional)</span></label><input class="in" id="sp" type="file" accept="image/*"><p class="hint">Stays in this browser only.</p></div>
    <h2 style="margin-top:28px">Notifications</h2><fieldset><legend>Tell me in the app when…</legend>${PN.map(n=>`<div class="check"><input type="checkbox" id="np-${n[0]}"${pr[n[0]]!==false?' checked':''}><label for="np-${n[0]}">${n[1]}</label></div>`).join('')}<p class="hint">In-app only. This demo doesn’t send email or text messages.</p></fieldset>
    <div class="row"><button class="btn btn-primary">Save changes</button><button type="button" class="btn btn-ghost" id="so">Sign out</button></div></form>`;
  }
  page(`<div class="wrap"><div class="phead"><div class="who"><span class="avatar">${avatarHTML()}</span><div><h1>${esc(p.name)}</h1><p style="margin:0 0 8px;color:#B9D3C8">${ic('pin',16)} ${esc(p.hood)}</p><div class="chips">${p.roles.map(r=>`<span class="chip">${r==='resident'?'Resident':'Volunteer'}</span>`).join('')}</div><p style="margin:12px 0 0"><a class="btn btn-leaf btn-sm" href="#/me?tab=settings">${ic('user',18)} Edit profile</a></p></div></div>
  <div class="pstats"><div><b>${s.reports}</b><span>Reports</span></div><div><b>${s.claims}</b><span>Tasks taken</span></div><div><b>${s.hours}</b><span>Hours given</span></div></div></div>
  <div class="tabs" role="tablist" aria-label="Profile sections">${[['resident','Resident'],['volunteer','Volunteer'],['settings','Settings']].map(t=>`<a role="tab" href="#/me?tab=${t[0]}" aria-selected="${tab===t[0]}">${t[1]}</a>`).join('')}</div>
  <div role="tabpanel">${body}</div><div style="height:30px"></div></div>`);
  const ev=$('#enV');if(ev)ev.onclick=()=>{p.roles.push('volunteer');save();VIEWS.me(parts,q);renderChrome('me')};
  const sf=$('#sf');
  if(sf){
    let photo=null;
    $('#sp').onchange=e=>{const f=e.target.files[0];if(f)readImage(f,d=>{photo=d;if(!d)toast('That file couldn’t be read as an image.')})};
    sf.onsubmit=e=>{e.preventDefault();
      const n=$('#sn').value.trim(),r=$('#rr').checked,v=$('#rv').checked;
      let bad=setErr($('#sn'),n?'':'Enter your name.');
      if(!r&&!v){toast('Choose at least one way to take part.');return}
      if(bad){$('#sn').focus();return}
      p.name=n;p.hood=$('#sh').value;p.roles=[r&&'resident',v&&'volunteer'].filter(Boolean);if(!p.roles.includes(state.mode))state.mode=p.roles[0];
      if(photo)p.photo=photo;['claimed','update','resolved','milestone','near'].forEach(k=>p.prefs[k]=$('#np-'+k).checked);
      save();renderChrome('me');toast('Saved on this device.');VIEWS.me(parts,q);
    };
    $('#so').onclick=()=>{state.signedIn=false;save();go('#/auth?mode=signin');toast('Signed out.')};
  }
};
