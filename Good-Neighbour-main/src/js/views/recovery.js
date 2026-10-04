'use strict';

/* ---------- recovery views and error states ---------- */

/**
 * 1. Page not found view
 */
VIEWS['not-found'] = function(parts) {
  const path = parts && parts.length ? parts.join('/') : 'unknown';
  page(`<div class="wrap">
    <div class="page-head">
      <div class="chips"><span class="chip st-new">${ic('alert', 16)} Error 404</span></div>
      <h1>We can’t find that page</h1>
      <p class="lead">The web address <code>#/${esc(path)}</code> does not match any page in CS Society. It may have been moved, renamed, or typed incorrectly.</p>
    </div>
    <div class="block recovery-card">
      <div class="rec-icon">${ic('search', 34)}</div>
      <h2>Where would you like to go?</h2>
      <p class="muted">You can return to the home screen for a community overview, or head to the Solve page to search and filter local issues near your street.</p>
      <div class="row" style="margin-top:20px">
        <a class="btn btn-primary" href="#/">${ic('home', 18)} Go to Home</a>
        <a class="btn btn-ghost" href="#/solve?status=all">${ic('map', 18)} Browse reports (Solve)</a>
        <a class="btn btn-quiet" href="#/report">${ic('plus', 18)} Report an issue</a>
      </div>
    </div>
    <div style="height:30px"></div>
  </div>`);
};
VIEWS['404'] = VIEWS['not-found'];

/**
 * 2. Dedicated Offline View
 */
VIEWS.offline = function(parts, q) {
  const from = q.get('from') || '';
  const online = navigator.onLine !== false;
  page(`<div class="wrap">
    <div class="page-head">
      <div class="chips">
        <span class="chip ${online ? 'st-resolved' : 'st-new'}" id="offStateChip">
          ${ic(online ? 'check' : 'alert', 16)} <span id="offStateText">${online ? 'Connected' : 'Offline'}</span>
        </span>
      </div>
      <h1 id="offTitle">${online ? 'You’re back online' : 'You’re offline'}</h1>
      <p class="lead" id="offDesc">
        ${online
          ? 'Your internet connection is active. All features, including interactive map tiles and live services, are ready.'
          : 'Your device is disconnected from the internet. Local data and drafts in this browser still work, but external maps require a connection.'}
      </p>
    </div>
    <div class="grid2">
      <div class="block">
        <h2 style="display:flex;align-items:center;gap:8px;color:var(--ink)">
          <span style="color:var(--red)">${ic('x', 20)}</span> Needs an internet connection
        </h2>
        <ul class="recovery-list">
          <li>
            <strong>Interactive map tiles</strong>
            <p class="muted">Street maps and satellite layers fetched from OpenStreetMap and Esri servers.</p>
          </li>
          <li>
            <strong>Live place search & geocoding</strong>
            <p class="muted">Online address searches and coordinate lookups from remote geocoding APIs.</p>
          </li>
          <li>
            <strong>External directions</strong>
            <p class="muted">Walking, cycling, or driving routing calculated via online mapping services.</p>
          </li>
        </ul>
      </div>
      <div class="block">
        <h2 style="display:flex;align-items:center;gap:8px;color:var(--teal-d)">
          ${ic('check', 20)} Works offline right now
        </h2>
        <ul class="recovery-list">
          <li>
            <strong>Browse reports in list view</strong>
            <p class="muted">Search and filter existing neighborhood reports, statuses, and timeline updates stored in your browser.</p>
          </li>
          <li>
            <strong>Draft a community report</strong>
            <p class="muted">Enter titles, descriptions, select device or sample photos, and place your pin via landmark selection or keyboard controls.</p>
          </li>
          <li>
            <strong>Claim & update volunteer tasks</strong>
            <p class="muted">Claim tasks, update progress notes, and record volunteer hours locally in this browser.</p>
          </li>
          <li>
            <strong>View profile & in-app notifications</strong>
            <p class="muted">Check earned milestones, adjust role settings, and review local notifications.</p>
          </li>
        </ul>
      </div>
    </div>
    <div class="block" style="margin-top:20px">
      <div class="row" style="align-items:center;justify-content:space-between;gap:16px">
        <div>
          <h3 style="margin:0 0 4px">Check connectivity</h3>
          <p class="muted" style="margin:0" id="offLiveStatus">
            ${online ? 'Connected to the internet.' : 'Listening for network changes. This screen updates automatically when connectivity returns.'}
          </p>
        </div>
        <div class="row">
          <button type="button" class="btn btn-primary" id="btnCheckOnline">${ic('undo', 18)} Check connection</button>
          <a class="btn btn-ghost" href="#/solve?status=all&view=list">${ic('list', 18)} Browse reports (List view)</a>
          ${from ? `<a class="btn btn-quiet" href="#/${esc(from)}">${ic('back', 18)} Return</a>` : `<a class="btn btn-quiet" href="#/">Home</a>`}
        </div>
      </div>
    </div>
    <div style="height:30px"></div>
  </div>`);

  $('#btnCheckOnline').onclick = () => {
    if (navigator.onLine !== false) {
      toast('Connected to the internet!');
      if (from) go('#/' + from);
      else VIEWS.offline(parts, q);
    } else {
      toast('Still offline. Please check your network connection.');
    }
  };
};

/**
 * 3. Map failed to load helper
 */
function renderMapErrorPanel(container, options, onRetry) {
  const isOff = navigator.onLine === false;
  const id = 'map-err-' + Math.random().toString(36).substring(2, 9);
  container.innerHTML = `
    <div class="map-error-panel" role="region" aria-labelledby="${id}-t" tabindex="0">
      <div class="map-error-content">
        <div class="map-error-icon">${ic('alert', 34)}</div>
        <h3 id="${id}-t">${isOff ? 'Map unavailable offline' : 'Map failed to load'}</h3>
        <p class="muted" style="margin:0 0 16px">
          ${isOff
            ? 'Interactive map tiles require an internet connection. Check your Wi-Fi or mobile data, or browse reports using the list view.'
            : 'The map service could not load or timed out. Check your network connection and try again.'}
        </p>
        <div class="row" style="justify-content:center;gap:10px">
          <button type="button" class="btn btn-primary btn-sm" id="${id}-retry">
            ${ic('undo', 16)} Try again
          </button>
          ${options && options.showListBtn ? `<button type="button" class="btn btn-ghost btn-sm" id="${id}-list">${ic('list', 16)} Switch to list</button>` : ''}
          ${options && options.showLmBtn ? `<button type="button" class="btn btn-ghost btn-sm" id="${id}-lm">${ic('pin', 16)} Choose landmark</button>` : ''}
          ${isOff ? `<a class="btn btn-quiet btn-sm" href="#/offline?from=${encodeURIComponent(location.hash.slice(2)||'')}">Offline info</a>` : ''}
        </div>
      </div>
    </div>
  `;

  const rBtn = document.getElementById(id + '-retry');
  if (rBtn && onRetry) {
    rBtn.onclick = e => {
      e.stopPropagation();
      onRetry();
    };
  }
  const lBtn = document.getElementById(id + '-list');
  if (lBtn && options && options.onSwitchList) {
    lBtn.onclick = options.onSwitchList;
  }
  const lmBtn = document.getElementById(id + '-lm');
  if (lmBtn && options && options.onSelectLm) {
    lmBtn.onclick = options.onSelectLm;
  }
}

/**
 * 4. Location unavailable helper
 */
function renderLocationError(container, err, options) {
  let title = 'Location unavailable';
  let desc = 'Your device location could not be determined. You can search for your place instead, pick a nearby landmark, or place your pin directly on the map.';
  let isDenied = false;

  if (err) {
    const code = err.code;
    if (code === 1 || code === (window.GeolocationPositionError && GeolocationPositionError.PERMISSION_DENIED)) {
      isDenied = true;
      title = 'Location access blocked';
      desc = 'Permission to access your location was denied. In Chrome: click the site settings or tune/padlock icon in the address bar (or go to Settings > Privacy and security > Site settings > Location), select Allow for this site, and reload the page. Other browsers provide similar permission settings in their address bar or site controls.';
    } else if (code === 2 || code === (window.GeolocationPositionError && GeolocationPositionError.POSITION_UNAVAILABLE)) {
      title = 'Location unavailable';
      desc = 'Location information is currently unavailable from your device. This can happen when GPS or Wi-Fi location signals are weak or disabled.';
    } else if (code === 3 || code === (window.GeolocationPositionError && GeolocationPositionError.TIMEOUT)) {
      title = 'Location request timed out';
      desc = 'The request to obtain your device location timed out before a position could be found. Please try again or search for your place below.';
    }
  }

  const id = 'loc-err-' + Math.random().toString(36).substring(2, 9);
  container.innerHTML = `
    <div class="loc-error-card" role="alert" aria-live="assertive" id="${id}">
      <div class="loc-error-header">
        <span class="loc-error-badge">${ic('alert', 20)}</span>
        <div>
          <h3 id="${id}-t" style="margin:0 0 4px;font-size:1.05rem">${esc(title)}</h3>
          <p style="margin:0;font-size:.9rem;color:var(--ink)">${esc(desc)}</p>
        </div>
      </div>
      <div class="loc-error-actions">
        <button type="button" class="btn btn-primary btn-sm" id="${id}-search">
          ${ic('search', 16)} Search for your place instead
        </button>
        <button type="button" class="btn btn-ghost btn-sm" id="${id}-manual">
          ${ic('pin', 16)} Place pin manually
        </button>
        <button type="button" class="btn btn-quiet btn-sm" id="${id}-dismiss" aria-label="Dismiss notice">
          Dismiss
        </button>
      </div>
      <p class="hint" style="margin:8px 0 0;font-size:.82rem">
        Keyboard controls: Focus the map and use arrow keys (Shift+arrows for larger steps) or press Enter to drop a pin.
      </p>
    </div>
  `;

  const sBtn = document.getElementById(id + '-search');
  if (sBtn && options && options.onSearchPlace) sBtn.onclick = options.onSearchPlace;
  const mBtn = document.getElementById(id + '-manual');
  if (mBtn && options && options.onManualPin) mBtn.onclick = options.onManualPin;
  const dBtn = document.getElementById(id + '-dismiss');
  if (dBtn) dBtn.onclick = () => { container.innerHTML = ''; };
}

/**
 * 5. Unexpected error recovery screen
 */
function renderUnexpectedError(err) {
  console.error('[CS Society error]:', err);
  const main = document.getElementById('main') || document.body;
  main.innerHTML = `
    <div class="wrap" style="padding-top:40px;padding-bottom:40px">
      <div class="page-head">
        <div class="chips"><span class="chip st-new">${ic('alert', 16)} Error</span></div>
        <h1 tabindex="-1">Something went wrong</h1>
        <p class="lead">An unexpected error occurred while loading this page. Technical diagnostics have been logged to the developer console.</p>
      </div>
      <div class="block recovery-card" style="max-width:680px">
        <div class="rec-icon">${ic('alert', 34)}</div>
        <h2>Let’s get you back on track</h2>
        <p class="muted">Your reports, drafts, and profile data in this browser are safe. You can reload the page to restart the application or return to Home.</p>
        <div class="row" style="margin-top:20px">
          <button type="button" class="btn btn-primary" id="appReloadBtn">${ic('undo', 18)} Reload</button>
          <a class="btn btn-ghost" href="#/">${ic('home', 18)} Go to Home</a>
          <a class="btn btn-quiet" href="#/solve?status=all">Browse reports</a>
        </div>
      </div>
      <div style="height:30px"></div>
    </div>
  `;
  const btn = document.getElementById('appReloadBtn');
  if (btn) btn.onclick = () => window.location.reload();
  const h = main.querySelector('h1');
  if (h) h.focus({ preventScroll: true });
}
VIEWS.error = function() {
  renderUnexpectedError(new Error('Manual error view invoked'));
};

/**
 * 6. Sign-in required view
 */
VIEWS['signin-required'] = function(parts, q) {
  const next = q.get('next') || '';
  if (state.signedIn) {
    const clean = next && !next.includes('signin-required') && !next.includes('auth')
      ? (next.startsWith('/') ? '#' + next : '#/' + next)
      : '#/';
    go(clean);
    return;
  }

  let contextMsg = 'Sign in to access your profile, report issues, and volunteer for community tasks.';
  let returnLabel = 'Home';
  let returnHash = '#/';

  if (next) {
    if (next === 'report') {
      contextMsg = 'Sign in to send your community report. Your form answers and pin location are safely saved in your browser.';
      returnLabel = 'Report draft';
      returnHash = '#/report';
    } else if (next.startsWith('issue/')) {
      const issueId = next.split('/')[1];
      contextMsg = `Sign in to claim, update, or post notes to report #${issueId}.`;
      returnLabel = `Report #${issueId}`;
      returnHash = `#/${next}`;
    } else if (next === 'me') {
      contextMsg = 'Sign in to view your profile, volunteer hours, and community milestones.';
      returnLabel = 'Home';
      returnHash = '#/';
    } else if (next === 'notifications') {
      contextMsg = 'Sign in to check community updates and notifications for your neighborhood.';
      returnLabel = 'Home';
      returnHash = '#/';
    }
  }

  page(`<div class="wrap">
    <div class="page-head">
      <div class="chips"><span class="chip st-claimed">${ic('user', 16)} Sign-in required</span></div>
      <h1>Please sign in to continue</h1>
      <p class="lead">${esc(contextMsg)}</p>
    </div>
    <div class="block recovery-card" style="max-width:680px">
      <div class="rec-icon">${ic('shield', 34)}</div>
      <h2>Join your neighbors in CS Society</h2>
      <p class="muted">Demo sign-in takes just a second with any email and an 8-character password. No server account is created, and your details stay in this browser.</p>
      <div class="row" style="margin-top:24px">
        <a class="btn btn-primary" href="#/auth?mode=signin${next ? '&next=' + encodeURIComponent(next) : ''}">
          ${ic('user', 18)} Sign in
        </a>
        <a class="btn btn-ghost" href="#/auth?mode=signup${next ? '&next=' + encodeURIComponent(next) : ''}">
          Create account
        </a>
        <a class="btn btn-quiet" href="${returnHash}">
          ${ic('back', 16)} Return to ${esc(returnLabel)}
        </a>
      </div>
    </div>
    <div style="height:30px"></div>
  </div>`);
};

/**
 * 7. Access denied view
 */
VIEWS['access-denied'] = function(parts, q) {
  const role = q.get('role') || 'volunteer';
  const action = q.get('action') || 'this action';
  const issueId = q.get('issue') || '';
  const issueObj = issueId ? iss(issueId) : null;

  let actionDesc = 'perform this action';
  if (action === 'claim') actionDesc = 'claim this community task';
  else if (action === 'start') actionDesc = 'start work on this report';
  else if (action === 'resolve') actionDesc = 'mark this report as resolved';
  else if (action === 'update') actionDesc = 'post updates to this task';
  else if (action === 'switch') actionDesc = 'switch to the volunteer view';

  page(`<div class="wrap">
    <div class="page-head">
      <div class="chips"><span class="chip st-new">${ic('shield', 16)} Access denied</span></div>
      <h1>You don’t have access to this action</h1>
      <p class="lead">Only volunteers can ${esc(actionDesc)}.${issueObj ? ` Report: “${esc(issueObj.title)}”.` : ''}</p>
    </div>
    <div class="block recovery-card" style="max-width:680px">
      <div class="rec-icon">${ic('hand', 34)}</div>
      <h2>Volunteering role is required</h2>
      <p class="muted">Your account is currently taking part as <strong>${state.profile.roles.includes('resident') ? 'Resident' : 'Participant'}</strong> only. To claim tasks, post progress updates, and log volunteer hours, you need to enable the Volunteer role.</p>
      <div class="note" style="margin:16px 0">
        ${ic('info', 18)}
        <p>In this demo, you can enable volunteering at any time without creating a new account. Enabling this role grants immediate access to claim and update community issues.</p>
      </div>
      <div class="row" style="margin-top:22px">
        <button type="button" class="btn btn-primary" id="btnEnableVol">
          ${ic('hand', 18)} Turn on volunteering and continue
        </button>
        ${issueId ? `<a class="btn btn-ghost" href="#/issue/${esc(issueId)}">${ic('back', 16)} Return to report</a>` : `<a class="btn btn-ghost" href="#/solve?status=all">Back to reports</a>`}
        <a class="btn btn-quiet" href="#/me?tab=settings">${ic('user', 18)} Manage roles in Settings</a>
      </div>
    </div>
    <div style="height:30px"></div>
  </div>`);

  $('#btnEnableVol').onclick = () => {
    if (!state.profile.roles.includes('volunteer')) {
      state.profile.roles.push('volunteer');
    }
    state.mode = 'volunteer';
    save();
    renderChrome(issueId ? 'issue' : 'me');
    toast('Volunteering role enabled! You can now claim and update tasks.');
    if (issueId) go('#/issue/' + issueId);
    else go('#/solve?status=all');
  };
};
