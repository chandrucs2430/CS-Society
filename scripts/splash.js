(function(){
  var sp=document.getElementById('splash'),lg=document.getElementById('splashLogo'),b=document.querySelector('.brand .logo');
  if(b&&lg)lg.src=b.src;
  document.documentElement.style.overflow='hidden';
  var dismissed=false;
  window.dismissSplash=function(){
    if(!sp||dismissed)return;
    dismissed=true;
    sp.classList.add('hide');
    document.documentElement.style.overflow='';
    setTimeout(function(){if(sp&&sp.parentNode)sp.remove()},600);
  };
  setTimeout(window.dismissSplash,3000);
})();
