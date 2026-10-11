
const $=id=>document.getElementById(id);
// lab: the sail beam trade, same formula and constants as tube() in build.py
if($('od')){
  const E=230000000000.0,RHO=1600,L=0.5,FLOOR=3.8,PICK=[8.0,0.15];
  const calc=()=>{
    const od=+$('od').value,t=+$('wt').value,D=od/1e3,d=(od-2*t)/1e3;
    const ei=E*Math.PI/64*(D**4-d**4),g=RHO*Math.PI/4*(D**2-d**2)*L*1e3,m=ei/FLOOR-1;
    $('odv').value=od.toFixed(1);$('wtv').value=t.toFixed(2);
    $('ei').textContent=ei.toFixed(2);$('g').textContent=g.toFixed(2);
    $('bar').style.width=Math.min(ei/(2*FLOOR),1)*100+'%';
    const v=$('verdict');v.className='verdict '+(m>=0?'ok':'bad');
    v.textContent=(m>=0?'CLEARS':'FAILS')+' the 3.8 N·m² floor ('+(m>=0?'+':'')+(m*100).toFixed(0)+'%)'
      +(od===PICK[0]&&t===PICK[1]?' · the tube I chose':'');
  };
  ['od','wt'].forEach(i=>$(i).oninput=calc);calc();
}
// band videos load YouTube only when clicked
document.querySelectorAll('[data-yt]').forEach(b=>b.onclick=()=>{
  b.outerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+b.dataset.yt+'?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
});
