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
function rerender(){
  try{
    if($('#step')&&typeof grab==='function')grab();
    const{parts,q}=parseHash();
    const r=parts[0]||'home';
    if(VIEWS[r]){
      VIEWS[r](parts,q);
      renderChrome(r);
    }else{
      (VIEWS['not-found']||VIEWS['404']||VIEWS.home)(parts,q);
      renderChrome('404');
    }
  }catch(err){
    if(typeof renderUnexpectedError==='function'){
      renderUnexpectedError(err);
    }else{
      console.error('[CS Society error]:',err);
    }
  }
}
function route(){
  const{parts}=parseHash();const r=parts[0]||'home';
  if(dlg&&dlg.open)dlg.close();
  try{
    rerender();
    window.scrollTo(0,0);
    const h=$('h1',app);
    if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true})}
  }catch(err){
    if(typeof renderUnexpectedError==='function'){
      renderUnexpectedError(err);
    }else{
      console.error('[CS Society error]:',err);
    }
  }
}
function needAuth(next){
  if(state.signedIn){
    if(next&&next!=='auth'&&next!=='signin-required')go('#/'+next);
    else go('#/');
    return;
  }
  const dest=next||'home';
  go('#/signin-required?next='+encodeURIComponent(dest));
  toast('Please sign in to continue.');
}
