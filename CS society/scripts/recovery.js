'use strict';
const onlineFeatureNames={map:'the map',places:'place search',directions:'directions'};
function requireOnline(feature,returnTo){
  if(navigator.onLine)return true;
  go('#/offline?feature='+encodeURIComponent(feature)+'&return='+encodeURIComponent(destinationHash(returnTo||currentDestination())));
  return false;
}
function recoveryPage(title,body){
  page(`<div class="wrap recovery-wrap"><section class="block recovery" aria-labelledby="recoveryTitle"><h1 id="recoveryTitle">${title}</h1>${body}</section></div>`);
}
function retryFromOffline(feature,returnTo){
  if(!navigator.onLine)return;
  const destination=destinationHash(returnTo);
  go(destination);
  if(feature==='places')setTimeout(openLocDlg,0);
}
VIEWS['not-found']=function(){
  recoveryPage('We can’t find that page',`<p class="lead">That address doesn’t match a page in CS Society.</p><div class="row"><a class="btn btn-primary" href="#/">Home</a><a class="btn btn-ghost" href="#/solve?status=all">Solve</a></div>`);
};
VIEWS.offline=function(parts,q){
  const feature=onlineFeatureNames[q.get('feature')]?q.get('feature'):'map';
  const returnTo=destinationHash(q.get('return'));
  const restored=navigator.onLine;
  recoveryPage(restored?'Connection restored':'You’re offline',`<p class="lead" role="status" aria-live="polite">${restored?'Your connection is back. Retry the feature you were using.':`A connection is needed for ${onlineFeatureNames[feature]}.`}</p>
    <div class="recovery-details"><h2>What still works in this browser</h2><p>Previously saved reports and profile details remain available here. You can browse them, edit local settings, and continue typing in a report draft in this tab; those changes do not sync to a server.</p>
    <h2>What needs a connection</h2><ul><li>Map tiles and interactive maps</li><li>Place search and online place names</li><li>Turn-by-turn directions</li></ul></div>
    <div class="row">${restored?`<button type="button" class="btn btn-primary" data-retry-feature="${feature}" data-return="${esc(returnTo)}">${feature==='places'?'Search for your place':'Try again'}</button>`:''}<a class="btn btn-ghost" href="#/">Home</a><a class="btn btn-ghost" href="#/solve?status=all">Solve</a></div>`);
  $$('[data-retry-feature]',app).forEach(button=>button.onclick=()=>retryFromOffline(button.dataset.retryFeature,button.dataset.return));
};
function locationReason(error){
  if(!navigator.geolocation)return 'unsupported';
  if(error&&error.code===1)return 'denied';
  if(error&&error.code===2)return 'unavailable';
  if(error&&error.code===3)return 'timeout';
  return 'unavailable';
}
function locationRecovery(reason,returnTo){
  const valid=['denied','unavailable','timeout','unsupported'].includes(reason)?reason:'unavailable';
  go('#/location-unavailable?reason='+valid+'&return='+encodeURIComponent(destinationHash(returnTo||currentDestination())));
}
VIEWS['location-unavailable']=function(parts,q){
  const reason=['denied','unavailable','timeout','unsupported'].includes(q.get('reason'))?q.get('reason'):'unavailable';
  const messages={
    denied:'Location permission was denied. You can allow it for this site in your browser, or choose a place manually.',
    unavailable:'Your device or browser couldn’t determine a location. Check that location services are available, or choose a place manually.',
    timeout:'The location request took too long. Try again somewhere with a clearer signal, or choose a place manually.',
    unsupported:'This browser doesn’t provide device location. Choose a place manually instead.'
  };
  const chrome=reason==='denied'?`<p><b>In Chrome:</b> select the site controls icon beside the address, open <b>Site settings</b>, set <b>Location</b> to <b>Allow</b>, then try again. The wording can vary by Chrome version.</p>`:'';
  const returnTo=destinationHash(q.get('return'));
  recoveryPage('Location unavailable',`<p class="lead" role="alert">${messages[reason]}</p>${chrome}<p>You can still place a report pin on the map using a mouse, touch, or the map’s arrow-key controls.</p>
    <div class="row"><button type="button" class="btn btn-primary" id="searchPlace">Search for your place instead</button><a class="btn btn-ghost" href="${esc(returnTo)}">Return to the app</a></div>`);
  $('#searchPlace').onclick=()=>{if(!requireOnline('places',returnTo))return;go(returnTo);setTimeout(openLocDlg,0)};
};
VIEWS['signin-required']=function(parts,q){
  const destination=destinationHash(q.get('next'));
  const signIn='#/auth?mode=signin&next='+encodeURIComponent(destination);
  recoveryPage('Please sign in to continue',`<p class="lead">Sign in to continue to the page or action you requested. This demo keeps sign-in details only in this browser.</p>
    <div class="row"><a class="btn btn-primary" href="${esc(signIn)}">Sign in</a><a class="btn btn-ghost" href="${esc(destination)}">Return to the previous destination</a></div>`);
};
VIEWS['access-denied']=function(parts,q){
  const reason=q.get('reason')==='volunteer'?'volunteer':'view';
  const destination=destinationHash(q.get('return'));
  if(!state.signedIn)return needAuth(destination);
  const canEnable=!state.profile.roles.includes('volunteer');
  const copy=reason==='volunteer'
    ?'Enable the volunteer role in your profile before claiming or updating community tasks.'
    :'Switch to Volunteer view to use this action.';
  recoveryPage('You don’t have access to this action',`<p class="lead">${copy} No report or account state was changed.</p>
    <div class="row">${canEnable?'<button type="button" class="btn btn-primary" id="enableVolunteer">Enable volunteer role</button>':`<button type="button" class="btn btn-primary" id="switchVolunteer">Switch to Volunteer view</button>`}<a class="btn btn-ghost" href="${esc(destination)}">Return to the task</a></div>`);
  const enable=$('#enableVolunteer');
  if(enable)enable.onclick=()=>{if(!state.profile.roles.includes('volunteer'))state.profile.roles.push('volunteer');state.mode='volunteer';save();go(destination)};
  const changeMode=$('#switchVolunteer');
  if(changeMode)changeMode.onclick=()=>{state.mode='volunteer';save();go(destination)};
};
function renderUnexpectedError(error){
  console.error('CS Society failed to render:',error);
  try{disposeMaps()}catch(disposeError){console.error('Could not dispose maps after rendering failure:',disposeError)}
  try{if(dlg.open)dlg.close()}catch(closeError){console.error('Could not close dialog after rendering failure:',closeError)}
  const safe=`<div class="wrap recovery-wrap"><section class="block recovery" role="alert" aria-labelledby="recoveryTitle"><h1 id="recoveryTitle">Something went wrong</h1><p class="lead">CS Society couldn’t finish displaying this page. Your browser-local data has not been intentionally cleared.</p><div class="row"><button type="button" class="btn btn-primary" id="reloadApp">Reload</button><a class="btn btn-ghost" href="#/">Home</a></div></section></div>`;
  try{
    app.innerHTML=safe;
    const reload=$('#reloadApp',app);
    if(reload)reload.onclick=()=>location.reload();
  }catch(renderError){
    console.error('Could not display the recovery screen:',renderError);
    try{app.textContent='Something went wrong. Reload this page to try again.'}catch(textError){console.error('Could not display fallback text:',textError)}
  }
}
