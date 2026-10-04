(function(){var sp=document.getElementById('splash'),lg=document.getElementById('splashLogo'),b=document.querySelector('.brand .logo');
if(b)lg.src=b.src;document.documentElement.style.overflow='hidden';
setTimeout(function(){sp.classList.add('hide');document.documentElement.style.overflow='';setTimeout(function(){sp.remove()},600)},3000)})();
