'use strict';

/* ---------- auth ---------- */
let AU={email:'',roles:'both'};
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
VIEWS.auth=function(parts,q){
  const mode=['signin','signup','reset','setup'].includes(q.get('mode'))?q.get('mode'):'signin',next=q.get('next')||'';
  const tabs=mode==='reset'||mode==='setup'?'':`<div class="authtabs"><a href="#/auth?mode=signin${next?'&next='+encodeURIComponent(next):''}"${mode==='signin'?' aria-current="page"':''}>Sign in</a><a href="#/auth?mode=signup${next?'&next='+encodeURIComponent(next):''}"${mode==='signup'?' aria-current="page"':''}>Create account</a></div>`;
  const pw=(id,lbl,auto)=>`<div class="field"><label for="${id}">${lbl}</label><div class="pw"><input class="in" id="${id}" type="password" autocomplete="${auto}" style="padding-right:84px"><button type="button" class="btn btn-quiet btn-sm" data-show="${id}" aria-label="Show password" aria-pressed="false">Show</button></div></div>`;
  let form='',title='';
  if(mode==='signin'){title='Sign in';form=`<form id="af" novalidate><div id="msg" aria-live="polite"></div><div class="field"><label for="em">Email</label><input class="in" id="em" type="email" autocomplete="email" value="${esc(AU.email)}"></div>${pw('pw','Password','current-password')}<button class="btn btn-primary btn-block">Sign in</button><p style="margin:14px 0 0"><a href="#/auth?mode=reset">Forgot your password?</a></p></form>`}
  if(mode==='signup'){title='Create your account';form=`<form id="af" novalidate><div id="msg" aria-live="polite"></div><div class="field"><label for="em">Email</label><input class="in" id="em" type="email" autocomplete="email" value="${esc(AU.email)}"></div>${pw('pw','Password','new-password')}<ul class="rules" id="rules" aria-label="Password rules"><li data-r="len">At least 8 characters</li><li data-r="num">At least one number</li></ul>
   <fieldset style="margin-top:18px"><legend>How would you like to take part?</legend><div class="opts">${[['resident','Resident','Report problems you notice'],['volunteer','Volunteer','Claim and fix problems nearby'],['both','Both','Report and help, switching any time']].map(o=>`<label class="opt"><input type="radio" name="role" value="${o[0]}"${AU.roles===o[0]?' checked':''}><span><b>${o[1]}</b><small>${o[2]}</small></span></label>`).join('')}</div></fieldset><button class="btn btn-primary btn-block">Continue to profile</button></form>`}
  if(mode==='reset'){title='Reset your password';form=`<form id="af" novalidate><div id="msg" aria-live="polite"></div><p class="muted">Enter your email and we’ll show you what would happen next.</p><div class="field"><label for="em">Email</label><input class="in" id="em" type="email" autocomplete="email" value="${esc(AU.email)}"></div><button class="btn btn-primary btn-block">Send reset link</button><p style="margin:14px 0 0"><a href="#/auth?mode=signin">Back to sign in</a></p></form>`}
  if(mode==='setup'){title='Set up your profile';form=`<form id="af" novalidate><div id="msg" aria-live="polite"></div><div class="field"><label for="nm">Name</label><input class="in" id="nm" autocomplete="name" value=""></div><div class="field"><label for="hd">Neighborhood</label><select class="in" id="hd"><option>Kaveri Gardens</option><option>Orchard Row</option><option>Millside</option></select></div><div class="field"><label for="ph">Profile photo <span class="muted">(optional)</span></label><input class="in" id="ph" type="file" accept="image/*"><p class="hint">Stays in this browser only.</p></div><button class="btn btn-primary btn-block">Finish setup</button></form>`}
  page(`<div class="wrap"><div class="authgrid"><div class="intro"><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">${mode==='setup'?'Nearly there':'Join your neighbors'}</h1><ul><li>${ic('flag',22)}<span><b>Residents</b> report problems and follow every update.</span></li><li>${ic('hand',22)}<span><b>Volunteers</b> claim tasks, share progress and show the finished work.</span></li><li>${ic('user',22)}<span>One account can do both. Switch views whenever you like.</span></li></ul><div class="note">${ic('info',18)}<p>Demo only: no account is created on a server. Any email and an 8-character password will work, and your details stay in this browser.</p></div></div>
  <div class="block"><h2 style="margin-bottom:14px">${title}</h2>${tabs}${form}</div></div></div>`);
  const af=$('#af'),msg=$('#msg'),em=$('#em');
  $$('[data-show]').forEach(b=>b.onclick=()=>{const i=$('#'+b.dataset.show),s=i.type==='password';i.type=s?'text':'password';b.textContent=s?'Hide':'Show';b.setAttribute('aria-pressed',s);b.setAttribute('aria-label',s?'Hide password':'Show password')});
  const ok=(m,fn)=>{msg.innerHTML=`<div class="ok">${ic('check',20)}<span></span></div>`;msg.querySelector('span').textContent=m;if(fn)setTimeout(fn,800)};
  const checkEmail=()=>setErr(em,!em.value.trim()?'Enter your email address.':!EMAIL.test(em.value.trim())?'Enter an email like name@example.com.':'');
  if(mode==='signup'){const upd=()=>{const v=$('#pw').value;$('[data-r=len]').className=v.length>=8?'met':'';$('[data-r=num]').className=/\d/.test(v)?'met':''};$('#pw').oninput=upd;upd()}
  af.onsubmit=e=>{e.preventDefault();msg.innerHTML='';
    if(mode==='setup'){const nm=$('#nm');if(setErr(nm,nm.value.trim().length<2?'Enter your name.':'')){nm.focus();return}
      const fin=photo=>{
        state.profile.name=nm.value.trim();state.profile.hood=$('#hd').value;if(photo)state.profile.photo=photo;
        save();renderChrome('home');
        let target='#/';
        if(next&&next!=='auth'&&next!=='signin-required')target=next.startsWith('/')?'#'+next:'#/'+next;
        ok('Your profile is ready, '+short(nm.value)+'.',()=>{go(target);toast('Welcome, '+short(nm.value)+'.')});
      };
      const f=$('#ph').files[0];f?readImage(f,d=>fin(d)):fin(null);return}
    const bad1=checkEmail();AU.email=em.value.trim();
    if(mode==='reset'){if(bad1){em.focus();return}ok('If an account exists for '+AU.email+', a reset link would be sent. This demo sends no email, so nothing has been sent.');return}
    const pwEl=$('#pw'),v=pwEl.value;
    let bad2=false;
    if(mode==='signin')bad2=setErr(pwEl,!v?'Enter your password.':v.length<8?'Passwords have at least 8 characters.':'');
    else bad2=setErr(pwEl,v.length<8?'Use at least 8 characters.':!/\d/.test(v)?'Add at least one number.':'');
    if(bad1||bad2){(bad1?em:pwEl).focus();msg.innerHTML=`<div class="bad" role="alert">${ic('alert',20)}<span>Please fix the highlighted fields.</span></div>`;return}
    if(mode==='signin'){
      state.signedIn=true;state.profile.email=AU.email;save();renderChrome('auth');
      let target='#/';
      if(next&&next!=='auth'&&next!=='signin-required')target=next.startsWith('/')?'#'+next:'#/'+next;
      ok('Signed in as '+AU.email+'.',()=>{go(target);toast('Signed in.')});
    }
    else{
      const r=($('input[name=role]:checked')||{}).value||'both';AU.roles=r;state.signedIn=true;state.profile.email=AU.email;state.profile.roles=r==='both'?['resident','volunteer']:[r];state.mode=state.profile.roles.includes(state.mode)?state.mode:state.profile.roles[0];save();renderChrome('auth');
      ok('Account created. One more step: your profile.',()=>go('#/auth?mode=setup'+(next?'&next='+encodeURIComponent(next):'')));
    }
  };
};
