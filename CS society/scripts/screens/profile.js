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
  if(!state.signedIn)return needAuth(currentDestination());
  if(state.profileStatus!=='ready'){
    const status=state.profileStatus;
    const heading=status==='loading'?'Loading your profile…':status==='missing'?'Profile unavailable':status==='offline'?'You’re offline':'Profile could not be loaded';
    const message=status==='loading'
      ?'We’re checking your signed-in Supabase account and loading your profile.'
      :status==='missing'
        ?'No profile row exists for this account. The account-creation migration may be missing or the project administrator may need to restore the profile.'
        :status==='offline'
          ?'Reconnect to the internet, then try loading your account again.'
          :'Your profile could not be loaded from Supabase. Check your connection and try again.';
    page(`<div class="wrap"><section class="block" role="${status==='loading'?'status':'alert'}" aria-busy="${status==='loading'}"><h1>${heading}</h1><p>${message}</p>${status==='error'&&state.profileError?`<p class="muted">${esc(state.profileError)}</p>`:''}<button class="btn btn-primary" id="profileRetry"${status==='loading'?' disabled':''}>Try again</button></section></div>`);
    const retry=$('#profileRetry');
    if(retry)retry.onclick=async()=>{retry.disabled=true;retry.textContent='Loading…';try{await refreshBackendState()}catch(error){console.error('Could not reload your profile:',error)}VIEWS.me(parts,q);renderChrome('me')};
    return;
  }
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
    :`<div class="empty">${ic('hand',32)}<h3>Volunteer access is not assigned</h3><p>A project administrator must grant volunteer access before you can claim or update reports.</p></div>`;
  }else{
    const pr=p.prefs,PN=[['claimed','A report is claimed'],['update','A status or note is added'],['resolved','A report is resolved'],['milestone','You reach a milestone'],['near','New reports appear near your pin']];
    body=`<form class="block" id="sf" novalidate style="max-width:680px"><h2>Profile</h2>
    <div class="field"><label for="sn">Name</label><input class="in" id="sn" value="${esc(p.name)}" autocomplete="name"></div>
    <div class="field"><label for="sh">Neighborhood <span class="muted">(optional)</span></label><input class="in" id="sh" maxlength="160" value="${esc(p.hood)}" autocomplete="address-level3"></div>
    <div class="field"><span class="lbl" id="lbl-loc" style="display:block;font-weight:600;margin-bottom:6px">Your location</span><p class="locshow">${ic('pin',18)}<b id="plocname">${esc(state.loc.label)}</b></p><div class="pickmap" id="profMap" style="height:280px" aria-label="Map. Click or tap to move your location, or drag the pin."></div><p class="hint">Click or tap the map, or drag the pin, to choose your location.</p><div class="row" style="margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-setloc>${ic('search',18)} Search for a place</button><button type="button" class="btn btn-ghost btn-sm" id="plocgeo">${ic('locate',18)} Use my current location</button></div></div>
    <div class="field"><span class="lbl">Your account roles</span><p class="chips">${p.roles.map(r=>`<span class="chip">${r==='resident'?'Resident':r==='admin'?'Administrator':'Volunteer'}</span>`).join(' ')||'<span class="muted">No roles assigned</span>'}</p><p class="hint">Roles are managed separately from profile details. Ask a project administrator for volunteer access.</p></div>
    <div class="field"><label for="sp">Profile photo <span class="muted">(optional)</span></label><input class="in" id="sp" type="file" accept="image/jpeg,image/png,image/webp"><p class="hint">Stored with your Supabase account.</p></div>
    <h2 style="margin-top:28px">Notifications</h2><fieldset><legend>Tell me in the app when…</legend>${PN.map(n=>`<div class="check"><input type="checkbox" id="np-${n[0]}"${pr[n[0]]!==false?' checked':''}><label for="np-${n[0]}">${n[1]}</label></div>`).join('')}<p class="hint">In-app only. It doesn’t send email or text messages.</p></fieldset>
    <div class="row"><button class="btn btn-primary">Save changes</button><button type="button" class="btn btn-ghost" id="so">Sign out</button></div></form>`;
  }
  page(`<div class="wrap">  <div class="phead"><div class="who"><span class="avatar">${avatarHTML()}</span><div><h1>${esc(p.name)}</h1>${p.hood?`<p style="margin:0 0 8px;color:#B9D3C8">Neighborhood: ${esc(p.hood)}</p>`:''}<p style="margin:0 0 8px;color:#B9D3C8">${ic('pin',16)} ${esc(state.loc.label)}</p><div class="chips">${p.roles.map(r=>`<span class="chip">${r==='resident'?'Resident':r==='admin'?'Administrator':'Volunteer'}</span>`).join('')}</div><p style="margin:12px 0 0"><a class="btn btn-leaf btn-sm" href="#/me?tab=settings">${ic('user',18)} Edit profile</a> ${isAdmin()?'<a class="btn btn-ghost btn-sm" href="#/admin">Admin dashboard</a>':''}</p></div></div>
  <div class="pstats"><div><b>${s.reports}</b><span>Reports</span></div><div><b>${s.claims}</b><span>Tasks taken</span></div><div><b>${s.hours}</b><span>Hours given</span></div></div></div>
  <div class="tabs" role="tablist" aria-label="Profile sections">${[['resident','Resident'],['volunteer','Volunteer'],['settings','Settings']].map(t=>`<a role="tab" href="#/me?tab=${t[0]}" aria-selected="${tab===t[0]}">${t[1]}</a>`).join('')}</div>
  <div role="tabpanel">${body}</div><div style="height:30px"></div></div>`);
  const sf=$('#sf');
  if(sf){
    let photo=null;
    $('#sp').onchange=e=>{const f=e.target.files[0];if(f)readImage(f,d=>{photo=d;if(!d)toast('That file couldn’t be read as an image.')})};
    sf.onsubmit=async e=>{e.preventDefault();
      const n=$('#sn').value.replace(/\s+/g,' ').trim(),hood=$('#sh').value.replace(/\s+/g,' ').trim();
      const nameError=n.length<2?'Enter your name.':n.length>100?'Your name must be 100 characters or fewer.':'';
      let bad=setErr($('#sn'),nameError);
      const neighborhoodError=hood.length>160?'Your neighborhood must be 160 characters or fewer.':'';
      bad=setErr($('#sh'),neighborhoodError)||bad;
      if(bad){(nameError?$('#sn'):$('#sh')).focus();return}
      const prefs={};
      ['claimed','update','resolved','milestone','near'].forEach(k=>prefs[k]=$('#np-'+k).checked);
      const submit=$('button[type=submit]',sf);
      submit.disabled=true;submit.textContent='Saving…';
      try{
        await updateProfile({name:n,neighborhood:hood,prefs},photo);
        renderChrome('me');toast('Profile saved to Supabase.');VIEWS.me(parts,q);
      }catch(error){
        console.error('Could not save profile:',error);
        toast(error.message||'Could not save your profile. Please try again.');
        submit.disabled=false;submit.textContent='Save changes';
      }
    };
    initProfileMap();
    $('#so').onclick=async()=>{try{const {error}=await backend().auth.signOut();if(error)throw new Error(error.message);await refreshBackendState();go('#/auth?mode=signin');toast('Signed out.')}catch(error){console.error('Could not sign out:',error);toast(error.message||'Could not sign out.')}};
  }
};
