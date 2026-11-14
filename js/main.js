/* 게임 루프, 시작 */
'use strict';
/* ---------- loop ---------- */
function fit(){const r=cv.getBoundingClientRect(),d=Math.min(2.5,window.devicePixelRatio||1),w=Math.max(480,Math.min(2400,Math.round(r.width*d)));if(cv.width!==w){cv.width=w;cv.height=Math.round(w*9/16)}}
addEventListener('resize',fit);
let last=0,acc=0;
function loop(ts){
  const tm=ts/1000,dt=Math.max(0,Math.min(.1,tm-last));
  last=tm;
  const paused=netPaused();
  updateNetNotice(paused);
  if(paused){
    acc=0;
    if(net.host)clearRemoteInput();
    for(const key in buf)buf[key]=0;
  }else{
    acc+=dt;
    let n=0;
    while(acc>=1/120&&n<12){update(1/120);acc-=1/120;n++}
  }
  if(net?.host&&net.ok&&mode==='fight'&&P){
    net.acc+=dt;
    if(net.acc>=1/24){net.acc=0;netSnap()}
  }
  render(tm);
  requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(AC)AC.suspend();if(bgm)bgA.pause()}else{if(AC)AC.resume();if(bgm)bgA.play().catch(()=>{});last=performance.now()/1000;acc=0}});
window.__bg=()=>bgA?{t:bgA.currentTime,paused:bgA.paused,err:!!bgA.error,routed:!!bgSrc,gain:musG?musG.gain.value:null}:null;
window.__g={get net(){return net},get s(){return{mode,phase,P,C,stage,pick,opp,streak,timer,round}},update,held,buf,set level(v){level=v}};
(async function(){
  const jobs=[];for(const k of ORDER){jobs.push(loadImg(k,'assets/characters/'+k+'.webp'),loadImg(k+'_face','assets/faces/'+k+'_face.webp'))}
  for(const s of STAGES)jobs.push(loadImg('bg_'+s.id,'assets/backgrounds/bg_'+s.id+'.jpg'));
  await Promise.all(jobs);try{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1500))])}catch(e){}
  mkVids();buildSelect();fit();$('load').style.display='none';show('sTitle');requestAnimationFrame(loop);
})();
