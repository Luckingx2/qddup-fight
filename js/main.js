'use strict';
/* ---------- loop ---------- */
function fit(){const r=cv.getBoundingClientRect(),d=Math.min(2.5,window.devicePixelRatio||1),w=Math.max(480,Math.min(2400,Math.round(r.width*d)));if(cv.width!==w){cv.width=w;cv.height=Math.round(w*9/16)}}
addEventListener('resize',fit);
let last=0,acc=0;
function loop(ts){const tm=ts/1000;let dt=Math.min(.1,tm-last);last=tm;acc+=dt;let n=0;while(acc>=1/120&&n<12){update(1/120);acc-=1/120;n++}if(net&&net.host&&net.ok&&mode==='fight'&&P){net.acc=(net.acc||0)+dt;if(net.acc>=1/30){net.acc=0;netSnap()}}render(tm);requestAnimationFrame(loop)}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(AC)AC.suspend();if(bgm)bgA.pause()}else{if(AC)AC.resume();if(bgm)resumeBgm();last=performance.now()/1000;acc=0}});
(async function(){
  const fontsP=Promise.all(["20px 'Pretendard'","20px 'Bungee'","20px 'IBM Plex Sans KR'","600 20px 'IBM Plex Sans KR'"].map(f=>document.fonts.load(f,'가A'))).catch(()=>{});
  loadTotal+=250000;fontsP.then(()=>{loadDone+=250000;loadProgress()});
  const jobs=ORDER.map(k=>loadImg(k+'_face',av('assets/faces/'+k+'_face.webp')));
  jobs.push(loadImg('D_face',av('assets/faces/D_face.webp')));jobs.push(loadImg('mega',av('assets/ui/mega.webp')));
  await Promise.race([Promise.all(jobs),new Promise(r=>setTimeout(r,90000))]);
  await Promise.race([fontsP,new Promise(r=>setTimeout(r,3000))]);
  loadDone=loadTotal;loadProgress();for(let i=0;i<80&&loadShown<99.9;i++)await new Promise(r=>setTimeout(r,25));await new Promise(r=>setTimeout(r,150));
  mkVids();buildSelect();fit();$('load').style.display='none';show('sTitle');requestAnimationFrame(loop);
  netRejoin();
  primeBgm();
  setTimeout(()=>loadPeerScript().catch(()=>{}),3000);
  setTimeout(async()=>{
    if(IS_PC)return;try{if(localStorage.getItem('qddup_speedtest')==='3')return}catch(e){return}
    const timeIt=async url=>{const t=performance.now();try{const ac=new AbortController();setTimeout(()=>ac.abort(),30000);const r=await fetch(url+(url.includes('?')?'&':'?')+'nocache='+Date.now(),{cache:'no-store',signal:ac.signal,mode:'cors'});const b=await r.arrayBuffer();return{ms:Math.round(performance.now()-t),kb:Math.round(b.byteLength/1024),ok:r.ok}}catch(e){return{ms:Math.round(performance.now()-t),err:String(e).slice(0,60)}}};
    const res={stage:'speed',build:BUILD,pc:IS_PC,ua:navigator.userAgent.slice(0,140),net:navigator.connection?.effectiveType||''};
    res.cloudflare1=await timeIt('assets/ui/title.jpg');
    res.github1=await timeIt('https://luckingx2.github.io/qddup-fight/assets/ui/title.jpg');
    res.cloudflare2=await timeIt('assets/ui/title.jpg');
    res.github2=await timeIt('https://luckingx2.github.io/qddup-fight/assets/ui/title.jpg');
    fetch(ONLINE_API+'/diag',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(res),keepalive:true}).then(()=>{try{localStorage.setItem('qddup_speedtest','3')}catch(e){}}).catch(()=>{});
  },3000);
  setTimeout(()=>{try{
    const nav=performance.getEntriesByType('navigation')[0],res=performance.getEntriesByType('resource');
    const slow=res.slice().sort((a,b)=>b.duration-a.duration).slice(0,8).map(r=>[r.name.replace(location.origin,''),Math.round(r.duration),r.nextHopProtocol,r.transferSize]);
    const d={stage:'load',build:BUILD,pc:IS_PC,ua:navigator.userAgent.slice(0,140),net:navigator.connection?.effectiveType||'',titleMs:Math.round(performance.now()),navProto:nav?.nextHopProtocol,ttfb:nav?Math.round(nav.responseStart):null,count:res.length,slow};
    fetch(ONLINE_API+'/diag',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d),keepalive:true}).catch(()=>{});
  }catch(e){}},500);
  checkSheets();
  retryMissing();
})();
