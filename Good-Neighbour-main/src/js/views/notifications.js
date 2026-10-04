'use strict';

/* ---------- notifications ---------- */
const NI={claimed:'hand',update:'note',resolved:'check',milestone:'leaf',near:'pin'};
VIEWS.notifications=function(parts,q){
  if(!state.signedIn)return needAuth('notifications');
  const f=q.get('f')==='unread'?'unread':'all',L=state.notifs.filter(n=>f==='all'||!n.read),un=state.notifs.filter(n=>!n.read).length;
  page(`<div class="wrap"><div class="page-head"><h1>Notifications</h1><p class="lead">${un?`${un} unread`:'You’re all caught up'}. Updates on your reports and contributions appear here.</p></div>
  <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:14px"><div class="fchips"><a class="btn btn-sm ${f==='all'?'btn-primary':'btn-ghost'}" href="#/notifications"${f==='all'?' aria-current="true"':''}>All</a><a class="btn btn-sm ${f==='unread'?'btn-primary':'btn-ghost'}" href="#/notifications?f=unread"${f==='unread'?' aria-current="true"':''}>Unread</a></div><button class="btn btn-ghost btn-sm" id="mar"${un?'':' disabled'}>Mark all as read</button></div>
  ${L.length?`<ul class="nlist">${L.map(n=>{const i=n.issue?iss(n.issue):null;return `<li class="nitem${n.read?'':' unread'}"><a href="${i?'#/issue/'+i.id:'#/me'}" data-n="${n.id}"><span class="ni">${ic(NI[n.type]||'bell',22)}</span><span><b>${esc(n.text)}</b>${i?`<small>${esc(i.title)}</small><br>`:''}<small>${timeEl(n.ts)}</small></span>${n.read?'<span class="vh">Read</span>':'<span class="unrd">Unread</span>'}</a></li>`}).join('')}</ul>`:`<div class="empty">${ic('bell',32)}<h3>${f==='unread'?'No unread notifications':'Nothing here yet'}</h3><p>${f==='unread'?'Everything is read.':'When someone claims or updates one of your reports, you’ll see it here.'}</p></div>`}
  <p class="cap" style="margin-top:14px">Notifications appear in the app only. This demo doesn’t send email or text messages.</p><div style="height:30px"></div></div>`);
  $$('[data-n]').forEach(a=>a.addEventListener('click',()=>{const n=state.notifs.find(x=>x.id===+a.dataset.n);if(n){n.read=true;save()}}));
  $('#mar').onclick=()=>{state.notifs.forEach(n=>n.read=true);save();renderChrome('notifications');VIEWS.notifications(parts,q)};
};
