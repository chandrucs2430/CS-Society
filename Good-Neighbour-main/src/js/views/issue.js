'use strict';

/* ---------- issue detail ---------- */
const tlHead=t=>{const n=whoTag(t.who);return t.type==='reported'?`${n} reported this issue`:t.type==='claim'?`${n} claimed this issue`:t.type==='release'?`${n} released this issue`:t.type==='status'?`${n} changed the status to ${t.status}`:`${n} added an update`};
function actionsHTML(i){
  const p=state.profile,owner=i.reporter==='me',mine=i.volunteer==='me';
  if(!state.signedIn)return `<p>Sign in to claim, update or follow this report.</p><a class="btn btn-primary" href="#/signin-required?next=${encodeURIComponent('issue/'+i.id)}">Sign in</a>`;
  if(i.status==='Resolved')return `<p>${ic('check',18)} This issue is resolved. Thanks, ${esc(who(i.volunteer))}.</p><p class="muted">If it isn’t actually fixed, flag the report below so a moderator can take a look.</p>`;
  if(isVol()){
    if(i.status==='New')return `<p>This report is waiting for a volunteer. Claiming tells your neighbors you’re on it, and you can release it if plans change.</p><button class="btn btn-primary btn-block" data-act="claim">${ic('hand',20)} Claim issue</button>`;
    if(mine&&i.status==='Claimed')return `<p>You claimed this issue. Start work when you’re ready, or post an update.</p><button class="btn btn-primary btn-block" data-act="start">Start work</button><button class="btn btn-ghost btn-block" data-act="update">Add update</button><button class="btn btn-quiet btn-block" data-act="release">${ic('undo',18)} Release claim</button>`;
    if(mine&&i.status==='In Progress')return `<p>Work is in progress. Add notes and photos as you go, then resolve it when it’s done.</p><button class="btn btn-primary btn-block" data-act="resolve">${ic('check',20)} Mark resolved</button><button class="btn btn-ghost btn-block" data-act="update">Add update</button>`;
    return `<p>${esc(who(i.volunteer))} is working on this. You can follow the timeline here.</p>${owner?'<button class="btn btn-ghost btn-block" data-act="note">Add a note</button>':''}`;
  }
  let h=owner?`<p>You reported this. Every update will appear on the timeline and in Notifications.</p><button class="btn btn-ghost btn-block" data-act="note">${ic('note',18)} Add a note</button>`:`<p>Volunteers can claim this report.${i.volunteer?` ${esc(who(i.volunteer))} is on it.`:''}</p>`;
  if(!owner&&p.roles.includes('volunteer'))h+=`<button class="btn btn-ghost btn-block" data-act="tovol">Switch to Volunteer view to help</button>`;
  if(!p.roles.includes('volunteer'))h+=`<button class="btn btn-ghost btn-block" data-act="enablevol">Turn on volunteering</button>`;
  return h;
}
VIEWS.issue=function(parts){
  const i=iss(parts[1]);
  if(!i){page(`<div class="wrap"><div class="page-head"><h1>We can’t find that report</h1></div><div class="empty">${ic('search',32)}<p>It may have been removed, or the link is out of date.</p><a class="btn btn-primary" href="#/solve?status=all">Back to all reports</a></div></div>`);return}
  const flagged=state.flags.includes(i.id);
  const photos=i.timeline.filter(t=>t.photo).map(t=>({p:t.photo,cap:`${t.type==='reported'?'Original photo':'Update photo'} from ${whoTag(t.who)}, ${rel(t.ts)}`,alt:`${t.type==='reported'?'Original photo':'Update photo'} for ${i.title}${t.photo.startsWith('data:')?'':' (sample placeholder)'}`}));
  page(`<div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/solve?status=all">${ic('back',16)} All reports</a></nav>
  <div class="dhead"><div class="chips">${chip(i.status)}${catChip(i.cat)}</div><h1>${esc(i.title)}</h1><p class="meta">Reported ${timeEl(i.reportedAt)} by ${esc(whoTag(i.reporter))}</p></div>
  <div class="dgrid">
   <section class="block dactions" aria-labelledby="nx"><h2 id="nx">Next step</h2><div class="actions-col" id="acts">${actionsHTML(i)}</div></section>
   <div class="dmain">
    <section class="block"><h2>What’s happening</h2><p style="margin:0">${esc(i.desc)}</p></section>
    ${photos.length?`<section class="block"><h2>Photos</h2><div class="photos">${photos.map(x=>`<figure><img src="${photoSrc(x.p,i.cat)}" alt="${esc(x.alt)}" loading="lazy"><figcaption>${esc(x.cap)}</figcaption></figure>`).join('')}</div></section>`:''}
    <section class="block"><h2>Timeline</h2><ol class="timeline">${i.timeline.map(t=>`<li><span class="tdot">${t.type==='status'?sIcon(t.status,20):ic({reported:'flag',claim:'hand',release:'undo',note:'note'}[t.type],18)}</span><div><p class="th"><strong>${esc(tlHead(t))}</strong>${timeEl(t.ts)}</p>${t.text?`<p>${esc(t.text)}</p>`:''}${t.hrs?`<p class="muted">${t.hrs} volunteer ${t.hrs===1?'hour':'hours'} logged</p>`:''}${t.photo&&t.type!=='reported'?`<img src="${photoSrc(t.photo,i.cat)}" alt="Update photo for ${esc(i.title)}${t.photo.startsWith('data:')?'':' (sample placeholder)'}" loading="lazy">`:''}</div></li>`).join('')}</ol></section>
   </div>
   <div class="dside"><section class="block"><h2>Location</h2><div class="pickmap mini" style="margin-bottom:12px"><div class="leafmap" data-leaf data-kind="issue" data-id="${i.id}" data-x="${i.x}" data-y="${i.y}"></div></div><dl class="kv"><dt>Where</dt><dd>${esc(i.place)}</dd><dt>Distance</dt><dd>${distTxt(i)} from your pin</dd><dt>Status</dt><dd>${esc(i.status)}</dd></dl></section>
   <section class="block"><h2>Something wrong?</h2><p class="muted">Flag a report that’s inaccurate, inappropriate or a duplicate.</p><button class="btn btn-ghost" data-act="flag"${flagged?' disabled':''}>${ic('flag',18)} ${flagged?'Flagged for review':'Flag this report'}</button></section></div>
  </div></div>`);
  $$('[data-act]',app).forEach(b=>b.onclick=()=>doAct(b.dataset.act,i));
};
function refreshIssue(i){save();renderChrome('issue');VIEWS.issue(['issue',i.id])}
function doAct(a,i){
  if(a==='flag')return openFlag(i);
  if(a==='enablevol'||a==='tovol'||['claim','start','resolve','release'].includes(a)){
    if(!state.profile.roles.includes('volunteer')){
      go('#/access-denied?role=volunteer&action='+encodeURIComponent(a)+'&issue='+i.id);
      return;
    }
  }
  if(a==='tovol'){state.mode='volunteer';save();renderChrome('issue');return VIEWS.issue(['issue',i.id])}
  if(a==='claim'){const prev=earned();i.status='Claimed';i.volunteer='me';addTL(i,'claim','');addNotif('claimed',i.id,'You claimed this issue');const ms=checkMilestones(prev);refreshIssue(i);toast('You claimed this issue. Its status is now Claimed.'+msTxt(ms));return}
  if(a==='release'){i.status='New';i.volunteer=null;addTL(i,'release','');save();refreshIssue(i);toast('Released. The report is open to other volunteers again.');return}
  if(a==='start')return openUpdate(i,'In Progress');
  if(a==='resolve')return openUpdate(i,'Resolved');
  if(a==='update'){
    if(!isVol()&&i.volunteer!=='me'&&i.reporter!=='me'&&!state.profile.roles.includes('volunteer')){
      go('#/access-denied?role=volunteer&action=update&issue='+i.id);
      return;
    }
    return openUpdate(i,i.status);
  }
  if(a==='note')return openUpdate(i,null);
}
function openUpdate(i,preset){
  const worker=i.volunteer==='me'&&isVol();
  const opts=worker?(i.status==='Claimed'?['Claimed','In Progress','Resolved']:['In Progress','Resolved']):[];
  const title=preset==='Resolved'?'Mark as resolved':preset==='In Progress'&&i.status==='Claimed'?'Start work':'Add an update';
  let photo=null;
  openDlg(`<form class="dlg" id="uf" novalidate><button type="button" class="x" data-close aria-label="Close">${ic('x',22)}</button><h2 id="dlgTitle">${title}</h2><p class="muted">${esc(i.title)}</p>
  ${opts.length?`<div class="field"><label for="us">Status</label><select class="in" id="us">${opts.map(o=>`<option value="${o}"${o===preset?' selected':''}>${o}${o===i.status?' (no change)':''}</option>`).join('')}</select></div>`:''}
  <div class="field"><label for="un">Note <span class="muted">${preset==='Resolved'?'(what was done)':'(optional if you add a photo)'}</span></label><textarea class="in" id="un" maxlength="400"></textarea></div>
  <div class="field"><span style="font-weight:700;display:block;margin-bottom:6px">Photo <span class="muted" style="font-weight:400">(optional)</span></span><div id="pbox"></div></div>
  ${opts.length?`<div class="field"><label for="uh">Time spent, in hours <span class="muted">(optional)</span></label><input class="in" id="uh" type="number" min="0" max="24" step="0.5" inputmode="decimal" placeholder="0"></div>`:''}
  <div class="actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary">${preset==='Resolved'?'Mark resolved':'Post update'}</button></div></form>`,d=>{
    photoUI($('#pbox',d),()=>photo,v=>{photo=v},i.cat,'progress');
    $('#uf',d).onsubmit=e=>{e.preventDefault();
      const st=$('#us',d)?$('#us',d).value:i.status,note=$('#un',d).value.trim(),hrs=$('#uh',d)?Math.max(0,Math.min(24,parseFloat($('#uh',d).value)||0)):0;
      const changed=st!==i.status;
      if(st==='Resolved'&&note.length<5)return void setErr($('#un',d),'Add a short note about what was done.');
      if(!changed&&!note&&!photo&&!hrs)return void setErr($('#un',d),'Add a note or a photo to post an update.');
      setErr($('#un',d),'');
      const prev=earned(),ph=photo==='sample'?(st==='Resolved'?'after':'progress'):photo,x={};
      if(ph)x.photo=ph;if(hrs)x.hrs=hrs;
      if(changed){x.status=st;addTL(i,'status',note,x);i.status=st;if(st==='Resolved')state.extraResolved++}else addTL(i,'note',note,x);
      if(hrs)state.hours+=hrs;
      const ms=checkMilestones(prev);dlg.close();refreshIssue(i);
      toast((changed?(st==='Resolved'?'Marked resolved. Nice work.':'Status updated to '+st+'.'):'Update posted to the timeline.')+msTxt(ms));
    };
  });
}
function openFlag(i){
  const R=[['inaccurate','Inaccurate or out of date','The problem isn’t there, or the location is wrong.'],['inappropriate','Inappropriate','Offensive, personal or unrelated content.'],['duplicate','Duplicate','Someone has already reported this.']];
  openDlg(`<form class="dlg" id="ff3" novalidate><button type="button" class="x" data-close aria-label="Close">${ic('x',22)}</button><h2 id="dlgTitle">Flag this report</h2><p class="muted">Tell us what’s wrong so a moderator can take a look. Please keep personal details out of the notes.</p>
  <fieldset class="field"><legend>Reason</legend><div class="opts">${R.map((r,k)=>`<label class="opt"><input type="radio" name="why" value="${r[0]}"${k===0?' checked':''}><span><b>${r[1]}</b><small>${r[2]}</small></span></label>`).join('')}</div></fieldset>
  <div class="field"><label for="fdt">Details <span class="muted">(optional)</span></label><textarea class="in" id="fdt" maxlength="300"></textarea></div>
  <div class="actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary">Send flag</button></div></form>`,d=>{
    $('#ff3',d).onsubmit=e=>{e.preventDefault();state.flags.push(i.id);save();VIEWS.issue(['issue',i.id]);
      d.innerHTML=`<div class="dlg"><button type="button" class="x" data-close aria-label="Close">${ic('x',22)}</button><div class="success"><div class="big">${ic('check',38,2.6)}</div><h2 id="dlgTitle" style="padding:0">Thanks, we’ve got it</h2><p>A community moderator would review this report. In this demo, nothing is sent to a real moderator.</p><button type="button" class="btn btn-primary" data-close>Done</button></div></div>`;
      $$('[data-close]',d).forEach(b=>b.onclick=()=>dlg.close());
    };
  });
}
