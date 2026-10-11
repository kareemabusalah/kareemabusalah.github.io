
const $=id=>document.getElementById(id);
// FX toggle: remembers the choice and overrides the OS reduce-motion setting
if($('fxbtn')){
  $('fxbtn').textContent='✦ FX '+(window.KAS_CALM?'OFF':'ON');
  $('fxbtn').onclick=()=>{try{localStorage.setItem('kas_fx',window.KAS_CALM?'on':'off')}catch(e){}location.reload()};
}
// Rotating Text: cycle the words in [data-rotate]
document.querySelectorAll('[data-rotate]').forEach(el=>{
  if(window.KAS_CALM)return;
  const words=el.dataset.rotate.split('|');let i=0;
  setInterval(()=>{i=(i+1)%words.length;el.classList.remove('flip');void el.offsetWidth;el.textContent=words[i];el.classList.add('flip')},2200);
});
// band videos load YouTube only when clicked
document.querySelectorAll('[data-yt]').forEach(b=>b.onclick=()=>{
  b.outerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+b.dataset.yt+'?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
});
