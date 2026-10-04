'use strict';
/* ---------- init ---------- */
document.addEventListener('click',e=>{
  const m=e.target.closest('[data-mode]');
  if(m){state.mode=m.dataset.mode;save();rerender();toast(state.mode==='volunteer'?'Volunteer view: you can claim and update reports.':'Resident view: you can report and follow your reports.');const nb=$(`[data-mode="${state.mode}"]`);if(nb)nb.focus()}
});
($('#resetDemo')||{}).onclick=()=>openDlg(`<div class="dlg"><button type="button" class="x" data-close aria-label="Close">${ic('x',22)}</button><h2 id="dlgTitle">Reset all data?</h2><p class="muted">This clears the reports, updates and settings saved in this browser and restores the initial demo state.</p><div class="actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="button" class="btn btn-primary" id="doReset">Reset data</button></div></div>`,d=>{$('#doReset',d).onclick=()=>{try{localStorage.removeItem(KEY)}catch(e){}state=seed();D=newDraft();F={q:'',cat:'all',status:'all',dist:'all',view:'list',sel:null};MV={z:1,cx:400,cy:280};dlg.close();go('#/');route();toast('Data reset.')}});
window.addEventListener('hashchange',route);
window.addEventListener('online',()=>{route()});
window.addEventListener('offline',()=>{route()});
window.addEventListener('error',event=>{renderUnexpectedError(event.error||new Error(event.message||'Unknown browser error'))});
window.addEventListener('unhandledrejection',event=>{renderUnexpectedError(event.reason instanceof Error?event.reason:new Error('Unhandled promise rejection'))});
route();
