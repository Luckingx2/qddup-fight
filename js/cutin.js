'use strict';
/* ---------- special cut-in video ---------- */
const FIRE_CUTINS={E:"E_fire",Eb:"Eb_fire",Ec:"Ec_fire"};
const WIN_CEREMONY=['Q','W','E','R','Qb','Wb','Eb','Rb','Qc','Wc','Ec','Rd','Rc'];
const winCeremonyUrl=ch=>av('assets/videos/win_'+ch+'.mp4');
function warmCeremony(ch){if(WIN_CEREMONY.includes(ch))fetch(winCeremonyUrl(ch)).catch(()=>{})}
function playCeremony(ch){
  if(!WIN_CEREMONY.includes(ch))return;
  const box=$('winCut'),v=$('winVid'),started=performance.now();
  const done=()=>{v.onended=v.onerror=box.onclick=null;removeEventListener('keydown',key,true);try{v.pause()}catch(e){}box.classList.remove('on')};
  const skip=()=>{if(performance.now()-started>700)done()};
  const key=e=>{if(e.key==='Escape'||e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();skip()}};
  try{voiceLive[BASE_CHARACTER[ch]]?.stop()}catch(e){}
  v.src=winCeremonyUrl(ch);v.muted=effectsLevel===0;v.volume=effectsLevel;
  box.classList.add('on');box.onclick=skip;v.onended=done;v.onerror=done;addEventListener('keydown',key,true);
  const p=v.play();if(p&&p.catch)p.catch(done);
}
const VID={};let cut=null,usedSp={},vUn=false;
function mkVids(){for(const sk of SVK)for(const c of ORDER){if(sk==='2'&&SPN[c]<2)continue;if(sk!=='T'&&SPN[c]>1&&(sk==='2')!==(SPV[c]===1))continue;if(sk==='T'&&!TAG[c])continue;const k=c+sk,v=document.createElement('video');v.preload=sk||!IS_PC?'metadata':'auto';v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.src=av('assets/videos/sp_'+(FIRE_CUTINS[k]||VAL[k]||k)+'.mp4');$('cut').insertBefore(v,$('cutH'));VID[k]=v}
  $('cut').addEventListener('pointerdown',e=>{e.preventDefault();if(cut&&cut.t>.5&&!net)endCut()})}
function unlockVids(){if(vUn)return;vUn=true;for(const k in VID){const v=VID[k];try{v.muted=true;const p=v.play();if(p&&p.then)p.then(()=>{if(cut?.v===v)return;v.pause();try{v.currentTime=0}catch(e){}}).catch(()=>{})}catch(e){}}}
function startCut(f){if(net&&net.host)net.cn++;$('cutH').style.display=net?'none':'';const vk=f.ch+SVK[f.sv||0],v=VID[vk];if(!v||v.error||(!VBLOB[vk]&&v.readyState<3)){if(v&&!v.error)warmVid(v);if(!net||net.host){freeze={f,t:.5};sfx.charge()}return}
  $('cut').setAttribute('aria-label',SPECIAL_NAMES[vk]||CH[f.ch].name+' 태그기');
  const key=vk+(f.cpu?'c':'p'),rate=usedSp[key]&&!FIRE_CUTINS[vk]?1.9:1;usedSp[key]=1;
  cut={f,v,vk,t:0,max:((v.duration||5)/rate)+1.5};try{v.currentTime=0}catch(e){}
  v.playbackRate=rate;setVideoVolume(v);v.classList.toggle('flip',f.face<0);v.classList.add('on');$('cut').classList.add('on');setMusicGain(.08);
  const current=cut;
  v.onended=()=>{if(cut===current)endCut()};
  const failed=()=>{if(cut===current)endCut()};
  setTimeout(()=>{if(cut===current&&v.currentTime<.05)failed()},1200);
  try{const p=v.play();if(p&&p.catch)p.catch(()=>{if(cut!==current)return;v.muted=true;try{v.play()?.catch(failed)}catch(e){failed()}})}catch(e){failed()}}
function endCut(){if(!cut)return;const f=cut.f,v=cut.v;cut=null;v.onended=null;try{v.pause()}catch(e){}v.classList.remove('on');$('cut').classList.remove('on');$('cutT').classList.remove('on');if(!net||net.host){f.t=0;freeze={f,t:.08}}else setMusicGain(.5)}
function warmVid(v){if(v.readyState>=3||v.dataset.warm)return;v.dataset.warm=1;v.preload='auto';try{v.load()}catch(e){}}
const VBLOB={},VPROM={};
const cutKeys=chs=>[...new Set(chs.filter(Boolean).flatMap(c=>SVK.map(sk=>c+sk)))].filter(k=>VID[k]);
const vidSrc=k=>{const v=VID[k];if(!v.dataset.src)v.dataset.src=v.src;return v.dataset.src};
const vidSize=k=>{try{return assetSize(new URL(vidSrc(k)).pathname.slice(1))}catch(e){return 800000}};
function cutsReady(chs){return cutKeys(chs).every(k=>VBLOB[k])}
function fetchCut(k,tick){if(VPROM[k])return VPROM[k];const u=vidSrc(k),w=vidSize(k);let mine=0;const add=n=>{n=Math.max(0,Math.min(n,w-mine));mine+=n;tick(n)};
  VPROM[k]=(async()=>{for(let a=0;a<3&&!VBLOB[k];a++){try{const res=await fetch(u);if(!res.ok||!res.body)throw 0;const rd=res.body.getReader(),parts=[];for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);add(value.length)}
      VBLOB[k]=URL.createObjectURL(new Blob(parts,{type:'video/mp4'}));const v=VID[k];v.preload='auto';v.src=VBLOB[k];try{v.load()}catch(e){}}catch(e){await new Promise(r=>setTimeout(r,800))}}
    add(w);delete VPROM[k]})();
  return VPROM[k]}
async function ensureCuts(chs,onp){const ks=cutKeys(chs).filter(k=>!VBLOB[k]);if(!ks.length){onp&&onp(100);return}
  const tot=ks.reduce((a,k)=>a+vidSize(k),0);let got=0;const tick=n=>{got+=n;onp&&onp(Math.min(100,got/tot*100))};
  await Promise.race([Promise.all(ks.map(k=>fetchCut(k,tick))),new Promise(r=>setTimeout(r,60000))]);onp&&onp(100)}
function beginWhenReady(chs,go){if(cutsReady(chs)){go();return}const el=$('vload');el.classList.add('on');$('vloadFill').style.width='0%';$('vloadPct').textContent='0%';
  ensureCuts(chs,p=>{$('vloadFill').style.width=p.toFixed(1)+'%';$('vloadPct').textContent=Math.floor(p)+'%'}).then(()=>{setTimeout(()=>{el.classList.remove('on');go()},200)})}
