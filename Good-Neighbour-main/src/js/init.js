'use strict';

/* ---------- init ---------- */
document.addEventListener('click',e=>{
  const m=e.target.closest('[data-mode]');
  if(m){state.mode=m.dataset.mode;save();rerender();toast(state.mode==='volunteer'?'Volunteer view: you can claim and update reports.':'Resident view: you can report and follow your reports.');const nb=$(`[data-mode="${state.mode}"]`);if(nb)nb.focus()}
});
($('#resetDemo')||{}).onclick=()=>openDlg(`<div class="dlg"><button type="button" class="x" data-close aria-label="Close">${ic('x',22)}</button><h2 id="dlgTitle">Reset the demo?</h2><p class="muted">This clears the reports, updates and settings saved in this browser and restores the sample data.</p><div class="actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="button" class="btn btn-primary" id="doReset">Reset demo</button></div></div>`,d=>{$('#doReset',d).onclick=()=>{try{localStorage.removeItem(KEY)}catch(e){}state=seed();D=newDraft();F={q:'',cat:'all',status:'all',dist:'all',view:'list',sel:null};MV={z:1,cx:400,cy:280};dlg.close();go('#/');route();toast('Demo data reset.')}});
window.addEventListener('online',()=>{
  toast('You’re back online. Connection restored.');
  const {parts,q}=parseHash();
  if(parts[0]==='offline'){
    if(typeof VIEWS.offline==='function')VIEWS.offline(parts,q);
  }
  $$('.map-error-panel .btn-primary').forEach(btn=>btn.click());
});
window.addEventListener('offline',()=>{
  toast('You’re offline. Local reports are saved; maps require internet.');
  const {parts,q}=parseHash();
  if(parts[0]==='offline'){
    if(typeof VIEWS.offline==='function')VIEWS.offline(parts,q);
  }
});
window.addEventListener('error',e=>{
  console.error('[CS Society runtime error]:',e.error||e.message);
});
window.addEventListener('unhandledrejection',e=>{
  console.error('[CS Society unhandled promise rejection]:',e.reason);
});
window.addEventListener('hashchange',route);
route();
