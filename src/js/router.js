'use strict';

const go=h=>{location.hash=h};
const parseHash=()=>{const h=location.hash.slice(1)||'/';const [p,q]=h.split('?');return{parts:p.split('/').filter(Boolean),q:new URLSearchParams(q||'')}};

function renderChrome(r){
  const p=state.profile,unread=state.notifs.filter(n=>!n.read).length;
  const both=p.roles.length>1;
  const seg=both?`<div class="seg" role="group" aria-label="View the site as"><button type="button" data-mode="resident" aria-pressed="${state.mode==='resident'}">Resident</button><button type="button" data-mode="volunteer" aria-pressed="${state.mode==='volunteer'}">Volunteer</button></div>`:`<span class="rolechip">${p.roles[0]==='volunteer'?'Volunteer':'Resident'}</span>`;
  $('#tools').innerHTML=state.signedIn?`${seg}<a class="iconbtn" href="#/notifications" aria-label="Notifications, ${unread} unread">${ic('bell',22)}${unread?`<span class="dot" aria-hidden="true">${unread}</span>`:''}</a><a class="btn btn-leaf btn-sm hide-sm" href="#/report">${ic('plus',18,2.4)} Report</a><a class="avatar" href="#/me" aria-label="Your profile">${avatarHTML()}</a>`:`<a class="btn btn-leaf btn-sm" href="#/auth?mode=signin">Sign in</a>`;
  $$('[data-r]').forEach(a=>{if(a.dataset.r===r)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  $$('#primaryNav a,#tabbar a').forEach(a=>{if(a.dataset.r==='solve')a.setAttribute('href','#/solve?status=all')});
}
const VIEWS={};
function rerender(){if($('#step')&&typeof grab==='function')grab();const{parts,q}=parseHash();const r=parts[0]||'home';(VIEWS[r]||VIEWS.home)(parts,q);renderChrome(r)}
function route(){
  const{parts}=parseHash();const r=parts[0]||'home';
  if(dlg.open)dlg.close();
  rerender();window.scrollTo(0,0);
  const h=$('h1',app);if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true})}
}
function needAuth(next){go('#/auth?mode=signin&next='+encodeURIComponent(next));toast('Sign in to continue.');}
