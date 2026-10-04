'use strict';
const VIEWS={};
function rerender(){if($('#step')&&typeof grab==='function')grab();const{parts,q}=parseHash();const r=parts[0]||'home';(VIEWS[r]||VIEWS.home)(parts,q);renderChrome(r)}
function route(){
  const{parts}=parseHash();const r=parts[0]||'home';
  if(dlg.open)dlg.close();
  try{
    const known=['home','solve','report','issue','me','notifications','impact','auth','not-found','offline','location-unavailable','signin-required','access-denied'];
    if(!known.includes(r)){VIEWS['not-found'](parts,new URLSearchParams());renderChrome('not-found')}
    else rerender();
    window.scrollTo(0,0);
    const h=$('h1',app);if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true})}
  }catch(error){
    renderUnexpectedError(error);
  }
}
