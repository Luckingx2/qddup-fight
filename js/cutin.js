/* 필살기 영상 재생 */
'use strict';
/* ---------- special cut-in video ---------- */
const VID={};let cut=null,usedSp={},vUn=false;
function mkVids(){for(const sk of SVK)for(const c of ORDER){if(sk==='2'&&SPN[c]<2)continue;if(sk==='T'&&!TAG[c])continue;const k=c+sk,v=document.createElement('video');v.preload=sk?'metadata':'auto';v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.src='assets/videos/sp_'+(VAL[k]||k)+'.mp4';$('cut').insertBefore(v,$('cutH'));VID[k]=v}
  $('cut').addEventListener('pointerdown',e=>{e.preventDefault();if(cut&&cut.t>.5&&!net)endCut()})}
function unlockVids(){if(vUn)return;vUn=true;for(const k in VID){const v=VID[k];try{v.muted=true;const p=v.play();if(p&&p.then)p.then(()=>{if(cut?.v===v)return;v.pause();try{v.currentTime=0}catch(e){}}).catch(()=>{})}catch(e){}}}
function startCut(f){if(net&&net.host)net.cn++;$('cutH').style.display=net?'none':'';const vk=f.ch+SVK[f.sv||0],v=VID[vk];if(!v||v.error||v.readyState<1){freeze={f,t:.5};sfx.charge();return}
  const key=vk+(f.cpu?'c':'p'),rate=usedSp[key]?1.9:1;usedSp[key]=1;
  cut={f,v,vk,t:0,max:((v.duration||5)/rate)+1.5};try{v.currentTime=0}catch(e){}
  v.playbackRate=rate;setVideoVolume(v);v.classList.toggle('flip',f.face<0);v.classList.add('on');$('cut').classList.add('on');setMusicGain(.08);
  v.onended=()=>endCut();try{const p=v.play();if(p&&p.catch)p.catch(()=>{v.muted=true;const q=v.play();if(q&&q.catch)q.catch(()=>endCut())})}catch(e){endCut()}}
function endCut(){if(!cut)return;const f=cut.f,v=cut.v;cut=null;v.onended=null;try{v.pause()}catch(e){}v.classList.remove('on');$('cut').classList.remove('on');$('cutT').classList.remove('on');f.t=0;freeze={f,t:.3};sfx.charge()}

