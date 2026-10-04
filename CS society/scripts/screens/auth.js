'use strict';
/* ---------- auth ---------- */
let AU = { email: '' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
VIEWS.auth = function (parts, q) {
  const mode = ['signin', 'signup', 'reset', 'setup', 'update'].includes(q.get('mode')) ? q.get('mode') : 'signin';
  const next = destinationHash(q.get('next'));
  if ((mode === 'setup' || mode === 'update') && !state.signedIn) return needAuth('#/me');
  const tabs = ['reset', 'setup', 'update'].includes(mode) ? '' :
    `<div class="authtabs"><a href="#/auth?mode=signin${next ? '&next=' + encodeURIComponent(next) : ''}"${mode === 'signin' ? ' aria-current="page"' : ''}>Sign in</a><a href="#/auth?mode=signup${next ? '&next=' + encodeURIComponent(next) : ''}"${mode === 'signup' ? ' aria-current="page"' : ''}>Create account</a></div>`;
  const pw = (id, label, auto) => `<div class="field"><label for="${id}">${label}</label><div class="pw"><input class="in" id="${id}" type="password" autocomplete="${auto}" style="padding-right:84px"><button type="button" class="btn btn-quiet btn-sm" data-show="${id}" aria-label="Show password" aria-pressed="false">Show</button></div></div>`;
  let form = '', title = '';
  if (mode === 'signin') {
    title = 'Sign in';
    form = `<form id="af" novalidate><div id="msg" aria-live="polite"></div><div class="field"><label for="em">Email</label><input class="in" id="em" type="email" autocomplete="email" value="${esc(AU.email)}"></div>${pw('pw', 'Password', 'current-password')}<button class="btn btn-primary btn-block">Sign in</button><p style="margin:14px 0 0"><a href="#/auth?mode=reset${next !== '#/' ? '&next=' + encodeURIComponent(next) : ''}">Forgot your password?</a></p></form>`;
  }
  if (mode === 'signup') {
    title = 'Create your account';
    form = `<form id="af" novalidate><div id="msg" aria-live="polite"></div><div class="field"><label for="em">Email</label><input class="in" id="em" type="email" autocomplete="email" value="${esc(AU.email)}"></div>${pw('pw', 'Password', 'new-password')}<ul class="rules" id="rules" aria-label="Password rules"><li data-r="len">At least 8 characters</li><li data-r="num">At least one number</li></ul>
   <p class="hint">Your account starts with resident access. A project administrator must grant volunteer access.</p><button class="btn btn-primary btn-block">Continue to profile</button></form>`;
  }
  if (mode === 'reset') {
    title = 'Reset your password';
    form = `<form id="af" novalidate><div id="msg" aria-live="polite"></div><p class="muted">Enter your email and we’ll send a password reset link if an account exists.</p><div class="field"><label for="em">Email</label><input class="in" id="em" type="email" autocomplete="email" value="${esc(AU.email)}"></div><button class="btn btn-primary btn-block">Send reset link</button><p style="margin:14px 0 0"><a href="#/auth?mode=signin${next !== '#/' ? '&next=' + encodeURIComponent(next) : ''}">Back to sign in</a></p></form>`;
  }
  if (mode === 'update') {
    title = 'Choose a new password';
    form = `<form id="af" novalidate><div id="msg" aria-live="polite"></div>${pw('pw', 'New password', 'new-password')}<ul class="rules" id="rules" aria-label="Password rules"><li data-r="len">At least 8 characters</li><li data-r="num">At least one number</li></ul><button class="btn btn-primary btn-block">Save new password</button></form>`;
  }
  if (mode === 'setup') {
    title = 'Set up your profile';
    form = `<form id="af" novalidate><div id="msg" aria-live="polite"></div><div class="field"><label for="nm">Name</label><input class="in" id="nm" autocomplete="name" value="${esc(state.profile.name)}"></div><div class="field"><label for="hd">Neighborhood</label><input class="in" id="hd" autocomplete="off" placeholder="Your area or neighborhood" value="${esc(state.profile.hood)}"></div><div class="field"><label for="ph">Profile photo <span class="muted">(optional)</span></label><input class="in" id="ph" type="file" accept="image/jpeg,image/png,image/webp"><p class="hint">Stored securely with your Supabase account.</p></div><button class="btn btn-primary btn-block">Finish setup</button></form>`;
  }
  const welcome = mode === 'setup' ? 'Nearly there' : 'Join your neighbors';
  page(`<div class="wrap"><div class="authgrid"><div class="intro"><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">${welcome}</h1><ul><li>${ic('flag', 22)}<span><b>Residents</b> report problems and follow every update.</span></li><li>${ic('hand', 22)}<span><b>Volunteers</b> claim tasks, share progress and show the finished work.</span></li><li>${ic('user', 22)}<span>One account can do both. Switch views whenever you like.</span></li></ul><div class="note">${ic('info', 18)}<p>Your account and community updates are securely synced with Supabase.</p></div></div>
  <div class="block"><h2 style="margin-bottom:14px">${title}</h2>${tabs}${form}</div></div></div>`);

  const af = $('#af'), msg = $('#msg'), em = $('#em');
  $$('[data-show]').forEach(button => button.onclick = () => {
    const input = $('#' + button.dataset.show), show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.textContent = show ? 'Hide' : 'Show';
    button.setAttribute('aria-pressed', show);
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  const showMessage = (text, error = false) => {
    msg.innerHTML = `<div class="${error ? 'bad' : 'ok'}" role="${error ? 'alert' : 'status'}">${ic(error ? 'alert' : 'check', 20)}<span></span></div>`;
    msg.querySelector('span').textContent = text;
  };
  const checkEmail = () => setErr(em, !em.value.trim() ? 'Enter your email address.' : !EMAIL.test(em.value.trim()) ? 'Enter an email like name@example.com.' : '');
  if (mode === 'signup' || mode === 'update') {
    const updateRules = () => {
      const value = $('#pw').value;
      $('[data-r=len]').className = value.length >= 8 ? 'met' : '';
      $('[data-r=num]').className = /\d/.test(value) ? 'met' : '';
    };
    $('#pw').oninput = updateRules;
    updateRules();
  }
  af.onsubmit = async event => {
    event.preventDefault();
    msg.innerHTML = '';
    if (mode === 'setup') {
      const name = $('#nm');
      if (setErr(name, name.value.trim().length < 2 ? 'Enter your name.' : '')) { name.focus(); return; }
      const file = $('#ph').files[0];
      const finish = async photo => {
        try {
          await updateProfile({
            name: name.value.trim(),
            neighborhood: $('#hd').value.trim() || state.loc.label,
            prefs: state.profile.prefs
          }, photo);
          renderChrome('auth');
          showMessage('Your profile is ready, ' + short(name.value) + '.');
          setTimeout(() => { go(next); toast('Welcome, ' + short(name.value) + '.'); }, 800);
        } catch (error) {
          console.error('Could not finish account setup:', error);
          showMessage(error.message, true);
        }
      };
      if (!file) { await finish(null); return; }
      readImage(file, photo => photo ? finish(photo) : showMessage('That file could not be read as an image.', true));
      return;
    }

    if (mode === 'update') {
      const password = $('#pw'), value = password.value;
      const invalid = setErr(password, value.length < 8 ? 'Use at least 8 characters.' : !/\d/.test(value) ? 'Add at least one number.' : '');
      if (invalid) { password.focus(); return; }
      try {
        const { error } = await backend().auth.updateUser({ password: value });
        if (error) throw new Error(error.message);
        showMessage('Your password has been updated.');
        setTimeout(() => go('#/me'), 800);
      } catch (error) {
        console.error('Could not update password:', error);
        showMessage(error.message, true);
      }
      return;
    }

    const invalidEmail = mode === 'reset' || mode === 'signin' || mode === 'signup' ? checkEmail() : false;
    AU.email = em.value.trim();
    if (mode === 'reset') {
      if (invalidEmail) { em.focus(); return; }
      try {
        const redirectTo = `${location.origin}${location.pathname}`;
        const { error } = await backend().auth.resetPasswordForEmail(AU.email, { redirectTo });
        if (error) throw new Error(error.message);
        showMessage('If an account exists for this email, a password reset link has been sent.');
      } catch (error) {
        console.error('Could not request a password reset:', error);
        showMessage(error.message, true);
      }
      return;
    }

    const password = $('#pw'), value = password.value;
    const passwordError = mode === 'signin'
      ? (!value ? 'Enter your password.' : value.length < 8 ? 'Passwords have at least 8 characters.' : '')
      : (value.length < 8 ? 'Use at least 8 characters.' : !/\d/.test(value) ? 'Add at least one number.' : '');
    const invalidPassword = setErr(password, passwordError);
    if (invalidEmail || invalidPassword) {
      (invalidEmail ? em : password).focus();
      showMessage('Please fix the highlighted fields.', true);
      return;
    }

    try {
      if (mode === 'signin') {
        const { error } = await backend().auth.signInWithPassword({ email: AU.email, password: value });
        if (error) throw new Error(error.message);
        await refreshBackendState();
        if (state.profileStatus === 'missing') {
          throw new Error('Your account profile is missing. Contact the project administrator to restore it.');
        }
        renderChrome('auth');
        if (!state.profile.name) {
          go('#/auth?mode=setup&next=' + encodeURIComponent(next));
          return;
        }
        showMessage('Signed in as ' + AU.email + '.');
        setTimeout(() => { go(next); toast('Signed in.'); }, 800);
      } else {
        const { data, error } = await backend().auth.signUp({
          email: AU.email,
          password: value
        });
        if (error) throw new Error(error.message);
        if (!data.session) {
          showMessage('Account created. Check your email to confirm your address, then sign in.');
          return;
        }
        await refreshBackendState();
        if (state.profileStatus === 'missing') {
          throw new Error('Your account profile could not be created. Contact the project administrator.');
        }
        go('#/auth?mode=setup&next=' + encodeURIComponent(next));
      }
    } catch (error) {
      console.error('Authentication request failed:', error);
      showMessage(error.message, true);
    }
  };
};
