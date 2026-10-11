
const $=id=>document.getElementById(id);
// band videos load YouTube only when clicked
document.querySelectorAll('[data-yt]').forEach(b=>b.onclick=()=>{
  b.outerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+b.dataset.yt+'?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
});
