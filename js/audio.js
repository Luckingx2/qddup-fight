/* 효과음, 배경음악, 볼륨 설정 */
'use strict';
/* ---------- audio ---------- */
let AC=null,master,musG,sfxG,videoG,nbuf,bgm=null;
let musicLevel=1, effectsLevel=1, musicGain=.5;
const videoSources=new WeakSet();
try{
  const saved=JSON.parse(localStorage.getItem('qddup_audio'));
  if(Number.isInteger(saved?.music)&&saved.music>=0&&saved.music<=100)musicLevel=saved.music/100;
  if(Number.isInteger(saved?.effects)&&saved.effects>=0&&saved.effects<=100)effectsLevel=saved.effects/100;
}catch(e){}
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
function initAudio(){ if(AC){ if(AC.state==='suspended')AC.resume(); return }
  try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=.9;master.connect(AC.destination);
    musG=AC.createGain();musG.gain.value=musicGain*musicLevel;musG.connect(master);sfxG=AC.createGain();sfxG.gain.value=.9*effectsLevel;sfxG.connect(master);videoG=AC.createGain();videoG.gain.value=effectsLevel;videoG.connect(AC.destination);
    nbuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}catch(e){AC=null}}
function tone(f,dur,type,vol,dest,t0,f2){ if(!AC)return; const t=t0||AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(dest||sfxG);o.start(t);o.stop(t+dur+.03)}
function noise(dur,vol,fq,ft,t0,dest,fq2){ if(!AC)return; const t=t0||AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=nbuf;s.loop=true;
  f.type=ft||'lowpass';f.frequency.setValueAtTime(fq,t);if(fq2)f.frequency.exponentialRampToValueAtTime(fq2,t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(dest||sfxG);s.start(t,Math.random()*.5);s.stop(t+dur+.03)}
const sfx={
  whoosh(v){noise(.13,.22*v,900,'bandpass',0,0,2600)},
  hit(s){noise(.12,.5*s,1800,'lowpass',0,0,300);tone(150*s+60,.14,'sine',.6,0,0,50);tone(900,.04,'square',.12)},
  guard(){tone(520,.07,'square',.2,0,0,380);noise(.06,.2,3000,'highpass')},
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
const bgA=new Audio('assets/audio/bgm.mp3');
bgA.loop=true;
bgA.preload='auto';
bgA.volume=.6;
let bgSrc=null;
function playBgm(id){
  if(!bgSrc&&AC){
    try{bgSrc=AC.createMediaElementSource(bgA);bgSrc.connect(musG);bgA.volume=.6}catch(e){}
  }
  setMusicGain(.5);
  bgm={id,beat:0};
  if(bgA.paused)bgA.play().catch(()=>{});
}
const audioSettings=$('audioSettings');
function syncAudioSettings(){
  const music=Math.round(musicLevel*100), effects=Math.round(effectsLevel*100);
  $('musicVolume').value=music;
  $('musicValue').value=music+'%';
  $('effectsVolume').value=effects;
  $('effectsValue').value=effects+'%';
}
function changeAudioSettings(event){
  if(event.target.id==='musicVolume'){
    musicLevel=Number(event.target.value)/100;
    setMusicGain(musicGain);
  }else{
    setEffectsLevel(Number(event.target.value)/100);
  }
  syncAudioSettings();
  try{localStorage.setItem('qddup_audio',JSON.stringify({music:Math.round(musicLevel*100),effects:Math.round(effectsLevel*100)}))}catch(e){}
}
$('snd').onclick=()=>{
  initAudio();
  syncAudioSettings();
  audioSettings.showModal();
  // Stop held game inputs when keyboard focus moves to the settings.
  for(const key of Object.keys(held))held[key]=0;
  for(const key of Object.keys(buf))buf[key]=0;
};
$('musicVolume').oninput=changeAudioSettings;
$('effectsVolume').oninput=changeAudioSettings;

