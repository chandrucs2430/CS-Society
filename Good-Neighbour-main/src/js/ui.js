'use strict';

/* ---------- shell ---------- */
const FOOT=`<footer class="foot"><div class="wrap cols">
<div><h2>CS Society</h2><p>A community action and issue-tracking tool for neighbors. It isn’t an emergency service and doesn’t replace your municipal channels. If someone is in danger, call your local emergency number.</p></div>
<div><h2>Explore</h2><ul><li><a href="#/solve?status=all">Reports near you</a></li><li><a href="#/report">Report an issue</a></li><li><a href="#/impact">Community impact</a></li></ul></div>
<div><h2>About this demo</h2><p>Kaveri Gardens, its people and its figures are made up. Nothing here is verified real-world impact, and no data leaves your browser.</p></div></div></footer>`;
const page=html=>{app.innerHTML=html+FOOT};

const isVol=()=>state.mode==='volunteer'&&state.profile.roles.includes('volunteer');
const avatarHTML=()=>state.profile.photo?`<img src="${state.profile.photo}" alt="">`:esc(initials(state.profile.name));
const errP=k=>D.err&&D.err[k]?`<p class="err" id="e-${k}" role="alert">${ic('alert',16)}<span>${esc(D.err[k])}</span></p>`:'';

function openDlg(html,mount){dlg.innerHTML=html;if(!dlg.open)dlg.showModal();$$('[data-close]',dlg).forEach(b=>b.onclick=()=>dlg.close());mount&&mount(dlg)}
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});

function readImage(file,cb){const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const m=640,s=Math.min(1,m/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.72))};im.onerror=()=>cb(null);im.src=fr.result};fr.onerror=()=>cb(null);fr.readAsDataURL(file)}
function photoUI(box,cur,set,cat,mode){
  const draw=()=>{const v=cur();
    box.innerHTML=`<div class="photoui"><div class="pprev" aria-live="polite">${v?`<img src="${photoSrc(v==='sample'?mode:v,cat)}" alt="Preview of the selected photo">`:''}</div><div class="row"><label class="btn btn-ghost filebtn">${ic('camera',18)} Choose a photo<input type="file" accept="image/*" aria-label="Choose a photo from your device"></label><button type="button" class="btn btn-ghost" data-s>Use a sample photo</button>${v?'<button type="button" class="btn btn-quiet" data-c>Remove photo</button>':''}</div><p class="hint">Preview only. In this demo, photos stay in your browser and aren’t uploaded.</p></div>`;
    $('input',box).onchange=e=>{const f=e.target.files[0];if(!f)return;readImage(f,d=>{if(d)set(d);else toast('That file couldn’t be read as an image. Try another photo.');draw()})};
    $('[data-s]',box).onclick=()=>{set('sample');draw()};
    const c=$('[data-c]',box);if(c)c.onclick=()=>{set(null);draw()}};
  draw();
}
function setErr(el,msg){
  const id=el.id+'-e';let p=document.getElementById(id);
  if(!msg){if(p)p.remove();el.removeAttribute('aria-invalid');return false}
  if(!p){p=document.createElement('p');p.id=id;p.className='err';p.setAttribute('role','alert');el.closest('.field').appendChild(p)}
  p.innerHTML=ic('alert',16)+'<span></span>';p.lastChild.textContent=msg;el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby',id);return true;
}
