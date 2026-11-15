'use strict';
/* ---------- audio ---------- */
let AC=null,master,musG,sfxG,videoG,nbuf,bgm=null;
let musicLevel=.5, effectsLevel=1, musicGain=.5;
const videoSources=new WeakSet();
function setMusicGain(gain){
  musicGain=gain;
  if(musG)musG.gain.value=gain*musicLevel;
  if(!bgSrc)bgA.volume=.6*musicLevel*(gain/.5);
  bgA.muted=musicLevel===0;
}
function setVideoVolume(video){
  if(AC&&!videoSources.has(video)){
    try{
      AC.createMediaElementSource(video).connect(videoG);
      videoSources.add(video);
    }catch(e){}
  }
  video.volume=videoSources.has(video)?1:effectsLevel;
  video.muted=effectsLevel===0;
}
function setEffectsLevel(level){
  effectsLevel=level;
  if(sfxG)sfxG.gain.value=.9*level;
  if(videoG)videoG.gain.value=level;
  if(cut)setVideoVolume(cut.v);
}
function initAudio(){ try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
  if(AC){ if(AC.state==='suspended')AC.resume(); return }
  try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=.9;master.connect(AC.destination);
    musG=AC.createGain();musG.gain.value=musicGain*musicLevel;musG.connect(master);sfxG=AC.createGain();sfxG.gain.value=.9*effectsLevel;sfxG.connect(master);videoG=AC.createGain();videoG.gain.value=effectsLevel;videoG.connect(AC.destination);
    nbuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}catch(e){AC=null}}
function tone(f,dur,type,vol,dest,t0,f2){ if(!AC)return; const t=t0||AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(dest||sfxG);o.start(t);o.stop(t+dur+.03)}
function noise(dur,vol,fq,ft,t0,dest,fq2){ if(!AC)return; const t=t0||AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=nbuf;s.loop=true;
  f.type=ft||'lowpass';f.frequency.setValueAtTime(fq,t);if(fq2)f.frequency.exponentialRampToValueAtTime(fq2,t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(dest||sfxG);s.start(t,Math.random()*.5);s.stop(t+dur+.03)}
const VOICE_SET={E:['win','select'],W:['win','select'],R:['win','select'],Q:['win','select']};
const voiceBuf={},voiceLoad={},voiceLive={};
function loadVoices(base){
  if(!AC||!VOICE_SET[base])return;
  for(const kind of VOICE_SET[base]){
    const key=base+'-'+kind;
    if(voiceBuf[key]!==undefined)continue;
    voiceBuf[key]=null;
    voiceLoad[key]=fetch(av('assets/audio/voices/'+key+'.mp3')).then(r=>r.arrayBuffer()).then(b=>AC.decodeAudioData(b)).then(buf=>{voiceBuf[key]=buf}).catch(()=>{delete voiceBuf[key];delete voiceLoad[key]});
  }
}
function sayVoice(base,kind){
  if(!VOICE_SET[base]?.includes(kind))return;
  loadVoices(base);
  const ready=voiceLoad[base+'-'+kind];
  if(ready)ready.then(()=>sfx.voice(base,kind));
}
const sfx={
  voice(base,kind){ const buf=voiceBuf[base+'-'+kind]; if(!AC||!buf)return;
    try{voiceLive[base]?.stop()}catch(e){}
    const s=AC.createBufferSource(),g=AC.createGain();s.buffer=buf;g.gain.value=1.6;s.connect(g);g.connect(sfxG);s.start();voiceLive[base]=s},
  whoosh(v){noise(.13,.22*v,900,'bandpass',0,0,2600)},
  hit(s,kind){ if(!AC)return; const t=AC.currentTime;
    if(kind==='k'){noise(.16,.6*s,1400,'lowpass',t,0,180);tone(110*s+40,.2,'sine',.75,0,t,38);tone(240,.05,'square',.14,0,t,90);noise(.03,.35,5200,'highpass',t)}
    else if(kind==='l'){noise(.1,.45*s,2600,'bandpass',t,0,500);tone(170,.12,'triangle',.5,0,t,60);noise(.08,.28,700,'lowpass',t+.03,0,200)}
    else if(kind==='g'){noise(.05,.3,2400,'bandpass',t,0,900);noise(.22,.6,900,'lowpass',t+.08,0,110);tone(80,.26,'sine',.75,0,t+.08,34)}
    else{noise(.07,.5*s,3200,'bandpass',t,0,700);tone(210*s+80,.09,'sine',.55,0,t,70);tone(1200,.025,'square',.12,0,t);noise(.02,.3,6500,'highpass',t)}
    if(s>=1.4){noise(.3,.4,900,'lowpass',t,0,90);tone(60,.32,'sine',.6,0,t,30);tone(1800,.05,'sawtooth',.1,0,t,500)}},
  guard(s=1){ if(!AC)return; const t=AC.currentTime;tone(620,.06,'square',.18*s,0,t,410);tone(1240,.05,'triangle',.12*s,0,t,900);noise(.05,.22*s,3400,'highpass',t);if(s>1)tone(140,.1,'sine',.35,0,t,70)},
  jump(){tone(300,.14,'triangle',.22,0,0,620)},
  land(){noise(.09,.22,300,'lowpass');tone(90,.1,'sine',.3,0,0,50)},
  charge(){tone(220,.42,'sawtooth',.16,0,0,1400);tone(330,.42,'triangle',.2,0,0,2000);noise(.42,.12,500,'bandpass',0,0,5000)},
  special(c){ if(!AC)return; const t=AC.currentTime;
    if(c==='W'){noise(.6,.5,300,'bandpass',t,0,3000);tone(82,.5,'sawtooth',.35,0,t,41)}
    else if(c==='Q'){for(let i=0;i<4;i++){noise(.08,.4,1200,'lowpass',t+i*.12,0,300);tone(120,.1,'sine',.5,0,t+i*.12,50)}}
    else if(c==='R'){tone(500,.12,'triangle',.2,0,t,900)}
    else{tone(700,.3,'square',.18,0,t,1500);noise(.3,.3,5000,'highpass',t)}},
  ko(){ if(!AC)return; const t=AC.currentTime;tone(500,.7,'sawtooth',.28,0,t,60);noise(.5,.5,2000,'lowpass',t,0,120);tone(70,.6,'sine',.6,0,t,35)},
  tick(){tone(880,.035,'square',.14)},
  lock(){ if(!AC)return; const t=AC.currentTime;[660,880,1320].forEach((f,i)=>tone(f,.16,'square',.2,0,t+i*.07))},
  sel(){tone(700,.07,'triangle',.25,0,0,1050)},
  kiss(){if(!AC)return;const t=AC.currentTime;tone(900,.09,'sine',.35,0,t,1900);tone(1500,.14,'triangle',.25,0,t+.09,700)},
  bell(){tone(1560,.5,'sine',.3);tone(2080,.4,'sine',.14)},
  win(){ if(!AC)return; const t=AC.currentTime;[523,659,784,1047,1319].forEach((f,i)=>tone(f,.22,'square',.2,0,t+i*.11))},
  lose(){ if(!AC)return; const t=AC.currentTime;[392,330,262,196].forEach((f,i)=>tone(f,.3,'triangle',.24,0,t+i*.2))}
};
const BGM_TRACKS=[
  {id:'sonyeon-manhwa', title:'소년만화', file:'bgm.mp3'},
  {id:'tb-h', title:'고민중독', file:'qwer-tb-h.mp3'},
  {id:'soda', title:'SODA', file:'qwer-soda.mp3'},
  {id:'my-name-is-malguem', title:'내 이름 맑음', file:'qwer-my-name-is-malguem.mp3'},
  {id:'goodbye-sorrow', title:'안녕, 나의 슬픔', file:'qwer-goodbye-sorrow.mp3'},
  {id:'search-qwer', title:'검색어는 QWER', file:'qwer-search-qwer.mp3'},
  {id:'d-day', title:'D-Day', file:'qwer-d-day.mp3'},
  {id:'fireworks', title:'불꽃놀이', file:'qwer-fireworks.mp3'},
  {id:'fake-idol', title:'가짜 아이돌', file:'qwer-fake-idol.mp3'},
  {id:'ferris-wheel', title:'대관람차', file:'qwer-ferris-wheel.mp3'}
];
const bgA=new Audio();
bgA.preload='none';
bgA.volume=.6;
let bgSrc=null, currentTrack=null, remainingTracks=[], selectedTrack='shuffle';
try{
  const saved=JSON.parse(localStorage.getItem('qddup_audio'));
  if(Number.isInteger(saved?.music)&&saved.music>=0&&saved.music<=100&&(saved.mv===2||saved.music===0))musicLevel=saved.music/100;
  if(Number.isInteger(saved?.effects)&&saved.effects>=0&&saved.effects<=100)effectsLevel=saved.effects/100;
  if(BGM_TRACKS.some(track=>track.id===saved?.track))selectedTrack=saved.track;
}catch(e){}

function startTrack(track,play=true){
  currentTrack=track;
  bgA.loop=selectedTrack!=='shuffle';
  bgA.src=av('assets/audio/'+track.file);
  $('nowPlaying').textContent=track.title;
  if(play)resumeBgm();
}

function startNextTrack(play=true){
  if(!remainingTracks.length){
    remainingTracks=BGM_TRACKS.slice();
    for(let i=remainingTracks.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [remainingTracks[i],remainingTracks[j]]=[remainingTracks[j],remainingTracks[i]];
    }
    if(remainingTracks[0]===currentTrack){
      const j=1+Math.floor(Math.random()*(remainingTracks.length-1));
      [remainingTracks[0],remainingTracks[j]]=[remainingTracks[j],remainingTracks[0]];
    }
  }
  startTrack(remainingTracks.shift(),play);
}
function startSelectedTrack(play=true){
  if(selectedTrack==='shuffle')startNextTrack(play);
  else startTrack(BGM_TRACKS.find(track=>track.id===selectedTrack),play);
}
function primeBgm(){
  if(currentTrack)return;
  bgA.preload='auto';
  startSelectedTrack(false);
  try{bgA.load()}catch(e){}
}
function resumeBgm(){
  if(currentTrack&&!document.hidden&&bgA.paused)bgA.play().catch(()=>{});
}
bgA.addEventListener('ended',()=>{if(selectedTrack==='shuffle')startNextTrack()});
bgA.addEventListener('error',()=>{if(currentTrack&&selectedTrack==='shuffle')setTimeout(()=>startNextTrack(),1500)});
for(const ev of ['pointerdown','keydown','touchend'])addEventListener(ev,()=>{if(AC&&AC.state!=='running')AC.resume().catch(()=>{});if(bgm)resumeBgm()},{capture:true,passive:true});
function playBgm(id){
  if(!bgSrc&&AC){
    try{bgSrc=AC.createMediaElementSource(bgA);bgSrc.connect(musG);bgA.volume=.6}catch(e){}
  }
  setMusicGain(.5);
  if(!bgm||bgm.id!==id)bgm={id,beat:0};
  if(!currentTrack)startSelectedTrack();
  else resumeBgm();
}
const audioSettings=$('audioSettings'), musicTrack=$('musicTrack');
for(const track of BGM_TRACKS){
  const option=document.createElement('option');
  option.value=track.id;
  option.textContent=track.title;
  musicTrack.append(option);
}
musicTrack.onchange=()=>{
  const choice=musicTrack.value;
  if(choice!=='shuffle'&&!BGM_TRACKS.some(track=>track.id===choice))return;
  selectedTrack=choice;
  remainingTracks=[];
  saveAudio();
  if(currentTrack?.id===choice){
    bgA.loop=true;
    resumeBgm();
  }else{
    startSelectedTrack();
  }
};
function syncAudioSettings(){
  const music=Math.round(musicLevel*100), effects=Math.round(effectsLevel*100);
  musicTrack.value=selectedTrack;
  const v={music,effects};
  for(const el of document.querySelectorAll('[data-vol]'))el.value=v[el.dataset.vol];
  for(const el of document.querySelectorAll('[data-volout]'))el.value=v[el.dataset.volout]+'%';
  syncSndButtons();
}
function changeAudioSettings(event){
  if(event.target.dataset.vol==='music'){
    musicLevel=Number(event.target.value)/100;
    setMusicGain(musicGain);
  }else{
    setEffectsLevel(Number(event.target.value)/100);
  }
  if(musicLevel>0)prevMusic=musicLevel;if(effectsLevel>0)prevEffects=effectsLevel;
  syncAudioSettings();saveAudio();
}
let prevMusic=.5,prevEffects=1;
try{const s=JSON.parse(localStorage.getItem('qddup_audio'));if(s?.pm>0&&s.mv===2)prevMusic=s.pm/100;if(s?.pe>0)prevEffects=s.pe/100}catch(e){}
function saveAudio(){try{localStorage.setItem('qddup_audio',JSON.stringify({music:Math.round(musicLevel*100),effects:Math.round(effectsLevel*100),pm:Math.round(prevMusic*100),pe:Math.round(prevEffects*100),track:selectedTrack,mv:2}))}catch(e){}}
function syncSndButtons(){
  const m=musicLevel===0,e=effectsLevel===0;
  $('sndM').classList.toggle('off',m);$('sndM').setAttribute('aria-pressed',m);$('sndM').setAttribute('aria-label',m?'배경음악 켜기':'배경음악 끄기');
  $('sndE').classList.toggle('off',e);$('sndE').setAttribute('aria-pressed',e);$('sndE').setAttribute('aria-label',e?'효과음 켜기':'효과음 끄기');
}
function toggleMusic(){initAudio();if(musicLevel>0){prevMusic=musicLevel;musicLevel=0}else musicLevel=prevMusic||.5;setMusicGain(musicGain);if(musicLevel>0&&bgm)resumeBgm();syncAudioSettings();saveAudio()};
function toggleEffects(){initAudio();if(effectsLevel>0){prevEffects=effectsLevel;setEffectsLevel(0)}else{setEffectsLevel(prevEffects||1);sfx.sel()}syncAudioSettings();saveAudio()};
for(const el of document.querySelectorAll('[data-vol]'))el.oninput=changeAudioSettings;
syncAudioSettings();
for(const [id,fn] of [['sndM',toggleMusic],['sndE',toggleEffects]]){
  const b=$(id);let fired=0;
  b.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();fired=performance.now();fn();b.blur()});
  b.addEventListener('click',e=>{if(performance.now()-fired<700)return;fn();b.blur()});
}
