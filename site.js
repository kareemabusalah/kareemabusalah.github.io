
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
    v.textContent=(m>=0?'Clears':'Fails')+' the 3.8 N·m² floor ('+(m>=0?'+':'')+(m*100).toFixed(0)+'%)'
      +(od===PICK[0]&&t===PICK[1]?' · this is the tube I chose':'');
  };
  ['od','wt'].forEach(i=>$(i).oninput=calc);calc();
}
// React Bits-style effects in plain JS, all skipped under prefers-reduced-motion
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero=document.querySelector('.hero');
if(hero)hero.onpointermove=e=>{const r=hero.getBoundingClientRect();hero.style.setProperty('--mx',e.clientX-r.left+'px');hero.style.setProperty('--my',e.clientY-r.top+'px')};
document.querySelectorAll('.card').forEach(c=>c.onpointermove=e=>{const r=c.getBoundingClientRect();c.style.setProperty('--cx',e.clientX-r.left+'px');c.style.setProperty('--cy',e.clientY-r.top+'px')});
if(!calm){
  const h=document.querySelector('.hey .scr');  // decrypted text
  if(h){const txt=h.textContent,G='#%&@$01<>/';let f=0;
    const t=setInterval(()=>{h.textContent=[...txt].map((ch,i)=>ch===' '||i<f/2?ch:G[Math.random()*G.length|0]).join('');if(++f>txt.length*2){clearInterval(t);h.textContent=txt}},30)}
  document.querySelectorAll('[data-to]').forEach(b=>{const n=+b.dataset.to,s=b.dataset.suf||'',t0=performance.now();  // count up
    (function step(t){const k=Math.min((t-t0)/1400,1);b.textContent=Math.round(n*(1-(1-k)**3))+s;if(k<1)requestAnimationFrame(step)})(t0)});
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1});
  document.querySelectorAll('.grid>*,.ints>*,.cols>*,.skills>*').forEach(el=>{el.classList.add('reveal');io.observe(el)});  // scroll reveal
}
