'use strict';
/* ---------- shell ---------- */
const FOOT=`<footer class="foot"><div class="wrap cols">
<div><h2>CS Society</h2><p>A community action and issue-tracking tool for neighbors. It isn’t an emergency service and doesn’t replace your municipal channels. If someone is in danger, call your local emergency number.</p></div>
<div><h2>Explore</h2><ul><li><a href="#/solve?status=all">Reports near you</a></li><li><a href="#/report">Report an issue</a></li><li><a href="#/impact">Community impact</a></li></ul></div>
<div><h2>About CS Society</h2><p>CS Society helps neighbors report local problems, find volunteers and follow the fix. Community reports, updates and photos are securely synced with Supabase.</p></div></div></footer>`;
const page=html=>{disposeMaps();app.innerHTML=html+FOOT};
const go=h=>{location.hash=h};
const parseHash=()=>{const h=location.hash.slice(1)||'/';const [p,q]=h.split('?');return{parts:p.split('/').filter(Boolean),q:new URLSearchParams(q||'')}};
const SAFE_ROUTES=new Set(['home','solve','report','issue','me','notifications','impact','admin']);
function destinationHash(value){
  let path=String(value||'').trim().replace(/^#?\/+/, '');
  if(!path) return '#/';
  const [route]=path.split(/[/?]/);
  if(!SAFE_ROUTES.has(route))return '#/';
  return '#/'+path;
}
const currentDestination=()=>destinationHash(location.hash);
const isVol=()=>state.mode==='volunteer'&&state.profile.roles.includes('volunteer');
const isAdmin=()=>state.signedIn&&state.profile.roles.includes('admin');
const avatarHTML=()=>state.profile.photo?`<img src="${state.profile.photo}" alt="">`:esc(initials(state.profile.name));
const errP=k=>D.err&&D.err[k]?`<p class="err" id="e-${k}" role="alert">${ic('alert',16)}<span>${esc(D.err[k])}</span></p>`:'';

function renderChrome(r){
  const p=state.profile,unread=state.notifs.filter(n=>!n.read).length;
  const both=p.roles.includes('resident')&&p.roles.includes('volunteer');
  const env=window.__CS_CONFIG__&&window.__CS_CONFIG__.deploymentEnvironment;
  const envBadge=env==='preview'?'<span class="env-chip" title="This deployment uses Preview Supabase credentials">Preview</span>':'';
  const seg=both?`<div class="seg" role="group" aria-label="View the site as"><button type="button" data-mode="resident" aria-pressed="${state.mode==='resident'}">Resident</button><button type="button" data-mode="volunteer" aria-pressed="${state.mode==='volunteer'}">Volunteer</button></div>`:`<span class="rolechip">${p.roles[0]==='volunteer'?'Volunteer':'Resident'}</span>`;
  $('#tools').innerHTML=envBadge+(state.signedIn?`${isAdmin()?'<a class="btn btn-ghost btn-sm hide-sm" href="#/admin">Admin</a>':''}${seg}<a class="iconbtn" href="#/notifications" aria-label="Notifications, ${unread} unread">${ic('bell',22)}${unread?`<span class="dot" aria-hidden="true">${unread}</span>`:''}</a><a class="btn btn-leaf btn-sm hide-sm" href="#/report">${ic('plus',18,2.4)} Report</a><a class="avatar" href="#/me" aria-label="Your profile">${avatarHTML()}</a>`:`<a class="btn btn-leaf btn-sm" href="#/auth?mode=signin">Sign in</a>`);
  $$('[data-r]').forEach(a=>{if(a.dataset.r===r)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  $$('#primaryNav a,#tabbar a').forEach(a=>{if(a.dataset.r==='solve')a.setAttribute('href','#/solve?status=all')});
}
function needAuth(next){go('#/signin-required?next='+encodeURIComponent(destinationHash(next))); }
function denyAccess(reason,next){go('#/access-denied?reason='+encodeURIComponent(reason)+'&return='+encodeURIComponent(destinationHash(next)));}
function openDlg(html,mount){dlg.innerHTML=html;if(!dlg.open)dlg.showModal();$$('[data-close]',dlg).forEach(b=>b.onclick=()=>dlg.close());mount&&mount(dlg)}
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});

function readImage(file,cb){const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const m=640,s=Math.min(1,m/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.72))};im.onerror=()=>cb(null);im.src=fr.result};fr.onerror=()=>cb(null);fr.readAsDataURL(file)}
function photoUI(box,cur,set,cat,mode){
  const draw=()=>{const v=cur();
    box.innerHTML=`<div class="photoui"><div class="pprev" aria-live="polite">${v?`<img src="${photoSrc(v==='sample'?mode:v,cat)}" alt="Preview of the selected photo">`:''}</div><div class="row"><label class="btn btn-ghost filebtn">${ic('camera',18)} Choose a photo<input type="file" accept="image/*" aria-label="Choose a photo from your device"></label>${v?'<button type="button" class="btn btn-quiet" data-c>Remove photo</button>':''}</div><p class="hint">A clear photo helps volunteers bring the right tools.</p></div>`;
    $('input',box).onchange=e=>{const f=e.target.files[0];if(!f)return;readImage(f,d=>{if(d)set(d);else toast('That file couldn’t be read as an image. Try another photo.');draw()})};
    const c=$('[data-c]',box);if(c)c.onclick=()=>{set(null);draw()}};
  draw();
}
function setErr(el,msg){
  const id=el.id+'-e';let p=document.getElementById(id);
  if(!msg){if(p)p.remove();el.removeAttribute('aria-invalid');return false}
  if(!p){p=document.createElement('p');p.id=id;p.className='err';p.setAttribute('role','alert');el.closest('.field').appendChild(p)}
  p.innerHTML=ic('alert',16)+'<span></span>';p.lastChild.textContent=msg;el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby',id);return true;
}
