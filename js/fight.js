'use strict';
/* ---------- fight ---------- */
let mode='menu',P=null,C=null,phase='',pt=0,round=1,timer=60,camX=150,shake=0,hitstop=0,slow=0,freeze=null,fx=[],proj=[],amb=[],msg=null,combo={n:0,t:0,who:null},level=0,flash=0;
function mkF(ch,x,face,cpu){return{ch,x,y:0,vx:0,vy:0,face,cpu,hp:CH[ch].hp,dhp:CH[ch].hp,meter:0,st:'idle',t:0,walkD:0,hitDone:false,airAtk:false,atkT:0,stun:0,down:false,spN:0,spT:0,trail:[],wins:0,tagUsed:false,inp:{l:0,r:0,up:0,down:0,p:0,k:0,s:0,t:0,g:0},ai:{t:0,mv:0,down:0,up:0}}}
function setSt(f,s){f.st=s;f.t=0;f.hitDone=false;f.thrown=false}
function startMatch(){
  needBg(stage);show(null);level=Math.min(6,streak);usedSp={};
  P=mkF(pick,WW/2-190,1,false);C=mkF(opp,WW/2+190,-1,true);P.buf=buf;round=1;amb=[];loadVoices(BASE_CHARACTER[pick]);loadVoices(BASE_CHARACTER[opp]);warmCeremony(pick);warmCeremony(opp);
  for(let i=0;i<26;i++)amb.push({x:Math.random()*VW,y:Math.random()*VH,s:.5+Math.random(),p:Math.random()*6.28});
  const canThrow=BASE_CHARACTER[ME().ch]==='R';
  $('bG').hidden=$('throwKey').hidden=$('pkG').hidden=!canThrow;
  mode='fight';playBgm(stage.id);startRound();syncBack()
}
function startRound(){
  for(const f of[P,C]){f.tagUsed=false;f.hp=f.dhp=CH[f.ch].hp;f.y=0;f.vx=f.vy=0;f.down=false;f.stun=0;f.trail=[];f.slip=f.rev=f.dizzy=0;setSt(f,'idle')}
  clearEmotes();
  zone=flood=null;P.x=WW/2-190;C.x=WW/2+190;P.face=1;C.face=-1;proj=[];fx=[];timer=60;phase='intro';pt=0;slow=0;hitstop=0;freeze=null;combo.n=0;camX=150;
  msg={txt:'ROUND '+round,sub:stage.name,t:0,dur:1.15};
}
function say(txt,dur,sub){msg={txt,sub:sub||'',t:0,dur}}
function spark(x,y,col,n,sp){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=(.4+Math.random())*sp;fx.push({k:'p',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,t:0,d:.25+Math.random()*.3,col,s:3+Math.random()*5})}}
function ring(x,y,col,r){fx.push({k:'r',x,y,t:0,d:.28,col,r})}
function voice(f,kind){const base=BASE_CHARACTER[f.ch];if(VOICE_SET[base]?.includes(kind))sfx.voice(base,kind)}
function impact(x,y,dir,r,col){fx.push({k:'hit',x,y,t:0,d:.2,dir,r,col,rot:Math.random()*6.28})}
function block(x,y,dir){fx.push({k:'block',x,y,t:0,d:.22,dir})}
function star(x,y,r){fx.push({k:'s',x,y,t:0,d:.16,r,rot:Math.random()*3})}
function dust(x){for(let i=0;i<8;i++)fx.push({k:'p',x:x+(Math.random()-.5)*80,y:GROUND,vx:(Math.random()-.5)*160,vy:-40-Math.random()*80,t:0,d:.4,col:'rgba(255,255,255,.7)',s:6+Math.random()*6})}

let zone=null,flood=null;
function applyHit(f,o,a){
  const damage=a.dmg*(a.sp?CH[f.ch].special:1);
  const hx=(f.x+o.x)/2+f.face*20,hy=GROUND-o.y-(a.hy||130);
  if(o.st==='guard'&&o.y<=0&&o.face===-f.face&&!a.ub){
    o.hp=Math.max(1,o.hp-damage*(a.sp?.28:.1)*CH[o.ch].guard);o.vx=f.face*a.push*.45;o.t=Math.min(o.t,.05);o.stun=.14;
    block(hx,hy,f.face);spark(hx,hy,'#bff8ff',8,220);sfx.guard(a.sp||damage>=10?1.3:1);f.meter=Math.min(100,f.meter+a.dmg*.5);o.meter=Math.min(100,o.meter+a.dmg*.6);hitstop=.04;return}
  o.hp=Math.max(0,o.hp-damage);if(practice&&o.hp<=0){o.hp=CH[o.ch].hp;fx.push({k:'d',x:o.x,y:GROUND-o.y-300,t:0,d:1,txt:'회복'})}o.vx=f.face*a.push;if(a.lift){o.vy=a.lift;o.y=Math.max(o.y,.01)}
  setSt(o,'hit');o.stun=a.stun;o.face=-f.face;o.airAtk=false;
  if(a.kd&&o.hp>0){setSt(o,'kd');o.stun=.8;o.down=false;o.vy=260;o.y=Math.max(o.y,.01)}
  f.meter=Math.min(100,f.meter+a.dmg*1.8);o.meter=Math.min(100,o.meter+a.dmg*1.2);
  if(combo.who===f&&combo.t>0)combo.n++;else combo.n=1;combo.who=f;combo.t=1.1;
  const big=damage>=10,kind=a.kind||(big?'k':'p');impact(hx,hy,f.face,a.sp?120:big?92:62,a.sp?'#ff9a3c':big?'#ffd24a':'#fff6c8');ring(hx,hy,'#fff',big?60:40);spark(hx,hy,big?'#ffe27a':'#fff',big?16:9,big?420:300);spark(hx,hy,CH[f.ch].col,6,260);if(kind==='l')dust(o.x);
  shake=Math.max(shake,big?12:6);hitstop=a.sp?.11:big?.085:.055;sfx.hit(a.sp?1.5:big?1.15:.8,kind);
  fx.push({k:'d',x:o.x,y:GROUND-o.y-250,t:0,d:.7,txt:Math.round(damage*10)/10});
  if(o.hp<=0&&phase==='fight'){setSt(o,'ko');o.down=false;o.vy=Math.max(o.vy,460);o.y=Math.max(o.y,.01);o.vx=f.face*Math.max(a.push,330);
    phase='ko';pt=0;slow=1.0;flash=.5;sfx.ko();shake=22;say('K.O.',2.2);f.wins++;f.winner=true;o.winner=false;if(bgm)setMusicGain(.2)}
}
function tryHit(f,o,a){
  if(f.hitDone||o.st==='ko'||o.st==='kd')return false;if(a.high&&(o.st==='crouch'||o.st==='cpunch'||o.st==='ckick'))return false;const dx=(o.x-f.x)*f.face;
  if(dx<-25||dx>a.reach+CH[f.ch].reach)return false;if(Math.abs(o.y-f.y)>(a.vr||140))return false;
  f.hitDone=true;applyHit(f,o,a);return true}
function surfacePulse(x,color,reach,kind='groundPulse'){
  fx.push({k:kind,x,y:GROUND-1,t:0,d:.44,w:reach,col:color});
}
function note(x,y,color='#fff'){
  fx.push({k:'n',x,y,vx:0,vy:-95,t:0,d:.56,s:19,col:color});
}
function hearts(x,y,n){for(let i=0;i<n;i++)fx.push({k:'h',x:x+(Math.random()-.5)*60,y:y+(Math.random()-.5)*60,vx:(Math.random()-.5)*260,vy:-80-Math.random()*220,t:0,d:.7+Math.random()*.4,s:12+Math.random()*14})}
// Existing sprites and damage rules drive the three-hit specials.
const CLOSE_SPECIALS = {
  Q: {speed:680, reach:138, damage:[6,8,14], color:'#ff9b40', lastLift:480},
  E: {speed:640, reach:143, damage:[6,8,13], color:'#aa70ff', lastLift:570}
};
function stepCloseSpecial(f,o,move){
  const strike=f.spN;
  const last=strike===2;
  f.vx=f.face*(strike===0?move.speed:280);
  if(strike<3&&f.t>=(strike===0?.07:f.spT)&&f.t<=(strike===0?.33:f.spT+.09)){
    f.hitDone=false;
    if(tryHit(f,o,{reach:move.reach,dmg:move.damage[strike],stun:last?.72:.4,
      push:last?520:75,lift:last?move.lastLift:0,sp:1,vr:155,hy:last?120:150})){
      f.spN++;
      f.spT=f.t+.13;
      fx.push({k:'specialArc',x:o.x-f.face*18,y:GROUND-o.y-151,t:0,d:.24,
        dir:f.face,idx:strike,col:move.color});
      if(last){shake=19;flash=.14}
    }
  }
  if(f.spN===3||(f.spN===0&&f.t>.33)||(f.spN>0&&f.t>f.spT+.09))f.vx=0;
  if(f.t>.73){f.vx=0;setSt(f,'rec')}
}
const FIRE_FISTS={
  E:{color:'#ff833e',speed:590,reach:140,damage:26,push:550,lift:250},
  Eb:{color:'#729dff',speed:430,reach:117,damage:25,push:270,lift:620},
  Ec:{color:'#ff443c',speed:500,reach:134,damage:19,push:500,lift:320}
};
function fireFistBurst(f,move,last){
  const x=f.x+f.face*101,y=GROUND-f.y-157;
  fx.push({k:'firePunch',x,y,t:0,d:.29,dir:f.face,vertical:f.ch==='Eb',col:move.color});
  spark(x-f.face*28,y+18,move.color,9,245);
  spark(x,y,move.color,last?19:8,last?420:220);
  if(last)ring(x,y,move.color,76);
  sfx.whoosh(last?1.1:.7);
}
function stepFireFist(f,o,move){
  const double=f.ch==='Ec',follow=f.spN===1;
  const startup=follow?.26:.10,end=follow?.36:.20;
  const last=!double||follow;
  if(f.spN<2&&f.t<end)f.vx=f.face*(follow?250:move.speed);
  else f.vx=0;
  if(f.spN<2&&f.t>=startup&&f.t<end){
    if(!f.spT){
      f.spT=1;
      if(f.ch==='Eb'){f.vy=510;f.y=.01}
      fireFistBurst(f,move,last);
    }
    const guarding=o.st==='guard'&&o.y<=0&&o.face===-f.face;
    if(tryHit(f,o,{reach:move.reach,dmg:last?move.damage:8,stun:last?.58:.37,
      push:last?move.push:65,lift:last?move.lift:0,sp:1,vr:f.ch==='Eb'?210:125,hy:f.ch==='Eb'?175:147})){
      f.spN=last||guarding?2:1;
      f.spT=0;
      f.hitDone=f.spN===2;
    }
  }
  if(f.t>.58&&f.y<=0){f.vx=0;setSt(f,'rec')}
}
function stepBassGeyser(f,o){
  if(!f.hitDone&&f.t>=.22){
    f.hitDone=true;
    fx.push({k:'geyser',x:f.tx,y:GROUND,t:0,d:.52});
    dust(f.tx);
    ring(f.tx,GROUND-4,'#d5b4ff',145);
    sfx.whoosh(1.1);
    shake=16;
    if(o.st!=='ko'&&o.y<45&&Math.abs(o.x-f.tx)<125){
      const guarding=o.st==='guard'&&o.y<=0&&o.face===-f.face;
      applyHit(f,o,{dmg:22,stun:1,push:280,lift:520,sp:1,hy:70});
      if(!guarding&&o.st!=='ko')o.dizzy=1;
    }
  }
  if(f.t>.75)setSt(f,'rec');
}
function fireAlt(f){const c=f.ch,v=f.sv;f.assist=null;
  if(v===1){ if(c==='Q'){proj.push({o:f,kind:'stick',x:f.x+f.face*100,y:GROUND-175,vx:f.face*1500,vy:0,g:0,t:0,hit:false,dmg:27,stun:.55,push:520,lift:200});f.vx=f.face*80}
    else if(c==='W'){f.vx=f.face*640;hearts(f.x+f.face*70,GROUND-148,9)}
    else if(c==='E')f.vx=f.face*CLOSE_SPECIALS.E.speed;
    else{f.vx=f.face*900;dust(f.x)} }
  else{ if(c==='G'||c==='B'||c.length===2){f.assist={ch:TAG[c],front:c==='B'};shake=14}
    else if(c==='Q'){proj.push({o:f,kind:'body',ch:'R',frame:'jump',spin:1,x:f.x+f.face*100,y:GROUND-180,vx:f.face*1150,vy:0,g:0,t:0,hit:false,dmg:32,stun:.7,push:700,lift:500});f.vx=f.face*80}
    else if(c==='W'){f.assist={ch:'E'};shake=14}
    else if(c==='E'){f.assist={ch:'R'}}
    else f.vx=f.face*700 } }
function feathers(x,y,count){
  for(let i=0;i<count;i++)fx.push({k:'feather',x,y,vx:(Math.random()-.5)*340,vy:-80-Math.random()*250,t:0,d:.46+Math.random()*.28,rot:Math.random()*Math.PI});
}
function emitTagEffect(f){
  const themes={Qb:'drum',Rb:'drum',Wb:'electric',Eb:'electric',Qc:'balloon',Rd:'balloon',Wc:'paint',Ec:'paint',Rc:'tide'};
  const theme=themes[f.ch];
  fx.push({k:theme?'tagBurst':'beam',theme,x:f.x+f.face*110,y:GROUND-143,t:0,d:.5,dir:f.face,gold:f.ch==='G'||f.ch==='B'});
}
function spAlt(f,o,dt){const c=f.ch,v=f.sv,end=T=>{if(f.t>T&&f.y<=0){f.vx=0;f.assist=null;setSt(f,'rec')}};
  if(v===1){
    if(c==='Q'){f.vx*=Math.pow(.01,dt);end(.6)}
    else if(c==='W'){if(Math.random()<.15)hearts(f.x-f.face*50,GROUND-140,1);if(tryHit(f,o,{reach:105,dmg:25,stun:.85,push:160,sp:1,vr:170,hy:160})){f.vx=0;hearts(o.x,GROUND-o.y-170,16);sfx.kiss();f.t=Math.max(f.t,.45)}end(.7)}
    else if(c==='E')stepCloseSpecial(f,o,CLOSE_SPECIALS.E);
    else{
      if(Math.random()<.14)feathers(f.x-f.face*80,GROUND-106,2);
      if(tryHit(f,o,{reach:150,dmg:27,stun:.6,push:640,lift:440,sp:1,vr:190,hy:140})){
        feathers(o.x,GROUND-160,14);
        ring(o.x,GROUND-144,'#fff1fa',100);
      }
      end(.55);
    }
  }else{
    if(c==='Q'){f.vx*=Math.pow(.01,dt);end(.6)}
    else if(c==='W'||c==='G'||c==='B'||c.length===2){f.vx=0;if(!f.hitDone&&f.t>.12){f.hitDone=true;const dx=(o.x-f.x)*f.face;emitTagEffect(f);
      if(dx>0&&o.y<220&&o.st!=='ko')applyHit(f,o,{dmg:32,stun:.7,push:600,lift:300,sp:1,hy:130})}end(.75)}
    else if(c==='E'){f.vx=0;const n=Math.floor(f.t/.06);while(f.spN<=n&&f.spN<10){f.spN++;proj.push({o:f,kind:'donut',half:1,x:f.x+f.face*70,y:GROUND-110-Math.random()*110,vx:f.face*(760+Math.random()*200),vy:Math.random()*80,g:120,t:0,hit:false,dmg:3.2,stun:.28,push:120,lift:0,c:Math.floor(Math.random()*4),rot:Math.random()*6});if(f.spN%2)sfx.whoosh(.6)}end(.8)}
    else{if(f.t>.3){f.vx*=Math.pow(.001,dt);if(!f.spN){f.spN=1;hearts(f.x+f.face*70,GROUND-150,9);feathers(f.x,GROUND-85,7);proj.push({o:f,kind:'body',ch:'W',frame:'special2',heart:1,x:f.x+f.face*70,y:GROUND-150,vx:f.face*900,vy:160,g:500,t:0,hit:false,dmg:32,stun:.9,push:300,lift:0})}}end(.85)}
  }}
function fire(f){ const c=f.ch;sfx.special(c);setSt(f,'special');f.spN=0;f.spT=0;f.trail=[];if(f.sv){fireAlt(f);return}
  if(FIRE_FISTS[c]){f.vx=0;say(SPECIAL_NAMES[c],.75);return}
  if(c==='G'){f.vx=0;say('재뿌리기!!',1.0);for(let i=0;i<46;i++)fx.push({k:'p',x:f.x+f.face*70,y:GROUND-150+(Math.random()-.5)*40,vx:f.face*(160+Math.random()*560),vy:-180+Math.random()*260,t:0,d:.5+Math.random()*.5,col:'rgba(255,255,255,.9)',s:5+Math.random()*9});return}
  if(c==='B'){f.vx=f.face*460;return}
  if(c.length===2){f.vx=0;f.carry=0;f.mash=0;
    if(c==='Rc'){say('뿌앵~!!',.9);flood={t:3.2,o:f}}
    if(c==='Qb'&&!f.cpu)say('연타!!',.8);
    if(c==='Wb'){
      f.tx=Math.max(70,Math.min(WW-70,f.x+f.face*290));
      fx.push({k:'geyserCharge',x:f.tx,y:GROUND,t:0,d:.26});
    }
    if(c==='Qc'){zone={x:Math.max(300,Math.min(WW-300,f.x+f.face*330)),w:540,t:3.8,o:f};shake=14;for(let i=0;i<50;i++)fx.push({k:'p',x:f.x+f.face*(60+Math.random()*520),y:GROUND-10,vx:f.face*Math.random()*200,vy:-120-Math.random()*380,t:0,d:.5+Math.random()*.5,col:Math.random()<.5?'#ff5c8a':'#ff9ec0',s:5+Math.random()*9})}
    if(c==='Wc')f.vx=f.face*860;
    if(c==='Rd'){const o=f===P?C:P,vy=1050;f.vy=vy;f.y=.01;f.vx=Math.max(-760,Math.min(760,(o.x-f.x)/(2*vy/G)))}
    return}
  if(c==='W'){proj.push({o:f,kind:'rocket',x:f.x+f.face*120,y:GROUND-112,vx:f.face*720,vy:0,g:0,t:0,hit:false,dmg:26,stun:.55,push:460,lift:380});f.vx=-f.face*90;note(f.x+f.face*105,GROUND-153,'#ff99da');
    for(let i=0;i<10;i++)fx.push({k:'p',x:f.x-f.face*(70+Math.random()*40),y:GROUND-115+(Math.random()-.5)*40,vx:-f.face*(120+Math.random()*260),vy:-Math.random()*120,t:0,d:.5,col:'rgba(255,255,255,.75)',s:8+Math.random()*8})}
  else if(c==='Q'){f.vx=f.face*CLOSE_SPECIALS.Q.speed}
  else if(c==='R'){f.vx=0} }
const canCrouch=f=>!!META[f.ch]?.frames?.crouch;
function stepF(f,o,dt){
  const I=f.inp,K=CH[f.ch];f.t+=dt;const gr=f.y<=0&&f.vy<=0;f.slip=Math.max(0,(f.slip||0)-dt);f.rev=Math.max(0,(f.rev||0)-dt);f.dizzy=Math.max(0,(f.dizzy||0)-dt);if(f.rev>0){const q=I.l;I.l=I.r;I.r=q}
  if(phase!=='fight'&&(f.st==='idle'||f.st==='walk'||f.st==='guard'||f.st==='crouch')){f.vx=0;if(f.st!=='idle')setSt(f,'idle')}
  else if((f.st==='idle'||f.st==='walk'||f.st==='guard'||f.st==='crouch')&&gr){
    if(f.st==='guard'&&f.stun>0){f.stun-=dt}
    else{ f.face=o.x>=f.x?1:-1;
      if((I.s||(I.t&&!f.tagUsed&&TAG[f.ch]))&&f.meter>=100){const tg=I.t&&!f.tagUsed&&TAG[f.ch];f.meter=0;setSt(f,'charge');f.vx=0;if(f.buf)f.buf.s=f.buf.t=0;if(tg){f.sv=2;f.tagUsed=true}else f.sv=SPV[f.ch]||0;if(window.__sv!==undefined)f.sv=(window.__sv===1&&SPN[f.ch]<2)?0:window.__sv;startCut(f)}
      else if(I.g&&BASE_CHARACTER[f.ch]==='R'){setSt(f,'throw');f.vx=0;if(f.buf)f.buf.g=0;sfx.whoosh(.8)}
      else if(I.down&&canCrouch(f)){
        if(I.p){setSt(f,'cpunch');f.vx=0;sfx.whoosh(.7);if(f.buf)f.buf.p=0}
        else if(I.k){setSt(f,'ckick');f.vx=f.face*20;sfx.whoosh(.9);if(f.buf)f.buf.k=0}
        else{f.vx=0;if(f.st!=='crouch')setSt(f,'crouch')}}
      else if(I.p){setSt(f,'punch');f.vx=f.face*40*(K.lunge||1);sfx.whoosh(.8);if(f.buf)f.buf.p=0}
      else if(I.k){setSt(f,'kick');f.vx=f.face*30*(K.lunge||1);sfx.whoosh(1);if(f.buf)f.buf.k=0}
      else if(I.up){f.vy=K.jump;f.y=.01;setSt(f,'jump');f.airAtk=false;f.vx=(I.r-I.l)*K.speed*.95;sfx.jump()}
      else if(f.slip<=0&&(!net&&f.cpu?I.gd:(f.face>0?I.l&&!I.r:I.r&&!I.l))){
        if(f.st!=='guard')setSt(f,'guard');
        f.vx=!net&&f.cpu?0:-f.face*K.speed*.78*(flood?.55:1);
      }
      else{const d=I.r-I.l,tv=d*K.speed*(d*f.face<0?.78:1)*(flood?.55:1);f.vx=f.slip>0?f.vx+(tv*1.35-f.vx)*Math.min(1,dt*1.4):tv;if(d){if(f.st!=='walk')setSt(f,'walk');f.walkD+=Math.abs(f.vx)*dt}else if(f.st!=='idle')setSt(f,'idle')}}
  }
  else if(f.st==='jump'){ if((I.p||I.k)&&!f.airAtk&&f.t>.08){f.airAtk=true;f.atkT=0;f.hitDone=false;sfx.whoosh(1);if(f.buf)f.buf.p=f.buf.k=0}
    if(f.airAtk){f.atkT+=dt;if(f.atkT<.4)tryHit(f,o,{reach:122,dmg:K.kd-1,stun:.3,push:240,vr:150,hy:140})} }
  else if(f.st==='punch'){f.vx*=Math.pow(.001,dt);if(f.t>.07*K.timing&&f.t<.18*K.timing)tryHit(f,o,{reach:112,dmg:K.pd,stun:.22,push:150,hy:150,kind:'p',high:1});if(f.t>.3*K.timing)setSt(f,'idle')}
  else if(f.st==='kick'){f.vx*=Math.pow(.001,dt);if(f.t>.13*K.timing&&f.t<.28*K.timing)tryHit(f,o,{reach:136,dmg:K.kd,stun:.32,push:290,hy:135,kind:'k',high:1});if(f.t>.47*K.timing)setSt(f,'idle')}
  else if(f.st==='cpunch'){f.vx*=Math.pow(.001,dt);if(f.t>.06*K.timing&&f.t<.16*K.timing)tryHit(f,o,{reach:108,dmg:K.pd,stun:.2,push:120,hy:105,kind:'p'});if(f.t>.28*K.timing)setSt(f,I.down?'crouch':'idle')}
  else if(f.st==='ckick'){f.vx*=Math.pow(.001,dt);if(f.t>.12*K.timing&&f.t<.26*K.timing)tryHit(f,o,{reach:150,dmg:K.kd*.8,stun:.34,push:220,hy:55,kind:'l',kd:1});if(f.t>.46*K.timing)setSt(f,I.down?'crouch':'idle')}
  else if(f.st==='throw'){
    if(!f.hitDone&&f.t>=R_THROW.startup){
      f.hitDone=true;
      const distance=(o.x-f.x)*f.face;
      if(phase==='fight'&&distance>=0&&distance<=R_THROW.reach&&o.y<=0&&o.st!=='ko'&&o.st!=='win'){
        applyHit(f,o,{dmg:R_THROW.damage,stun:.32,push:470,lift:320,ub:1,hy:140,kind:'g'});
        o.thrown=o.st==='hit';
        ring(o.x,GROUND-135,CH[f.ch].col,70);
      }
    }
    if(f.t>=R_THROW.recovery)setSt(f,'idle');
  }
  else if(f.st==='charge'){f.vx=0;if(f.t>.5)fire(f)}
  else if(f.st==='special'){ const c=f.ch;f.trail.push({x:f.x,y:f.y});if(f.trail.length>6)f.trail.shift();
    if(f.sv)spAlt(f,o,dt);
    else if(FIRE_FISTS[c])stepFireFist(f,o,FIRE_FISTS[c]);
    else if(c==='Qb'){if(f.buf){if(f.buf.p>0||f.buf.k>0){f.buf.p=f.buf.k=0;f.mash++}}else if(Math.random()<dt*(5+level))f.mash++;
      f.spT-=dt;if(f.spT<=0&&f.spN<Math.min(16,3+f.mash)&&f.t>.05){f.spN++;f.spT=.085;
        if(f.spN%2)note(f.x+f.face*70,GROUND-164,'#a1dfff');
        proj.push({o:f,kind:'wave',col:0,x:f.x+f.face*120,y:GROUND-120,vx:f.face*640,vy:0,g:0,t:0,hit:false,dmg:2.3,stun:.3,push:110,lift:0});sfx.whoosh(.7)}
      if(f.t>1.5)setSt(f,'rec')}
    else if(c==='Rb'){
      if(!f.hitDone&&f.t>.12){
        f.hitDone=true;
        fx.push({k:'shout',x:f.x,y:GROUND-156,dir:f.face,t:0,d:.44});
        const dx=(o.x-f.x)*f.face;if(dx>-20&&dx<560&&o.y<240&&o.st!=='ko'){applyHit(f,o,{dmg:23,stun:.9,push:1300,lift:320,sp:1,ub:1,hy:160});shake=20}}if(f.t>.7)setSt(f,'rec')}
    else if(c==='Qc'){if(!f.hitDone&&f.t>.15){f.hitDone=true;if(zone)surfacePulse(zone.x,'#ff4681',zone.w/2,'paintSplash');if(zone&&o.y<45&&Math.abs(o.x-zone.x)<zone.w/2&&o.st!=='ko')applyHit(f,o,{dmg:16,stun:.55,push:380,sp:1,hy:60})}if(f.t>.7)setSt(f,'rec')}
    else if(c==='Wc'){f.vx=f.face*860;if(Math.random()<.5)fx.push({k:'p',x:f.x-f.face*30,y:GROUND-6,vx:-f.face*Math.random()*160,vy:-60-Math.random()*160,t:0,d:.5,col:'#ff5c8a',s:5+Math.random()*7});
      if(!f.carry){if(o.y<70&&tryHit(f,o,{reach:120,dmg:9,stun:.6,push:0,sp:1,ub:1,vr:80,hy:120}))f.carry=1}
      else if(o.st!=='ko'){o.x=Math.max(70,Math.min(WW-70,f.x+f.face*105));o.vx=0;o.stun=.5}
      const q=f.carry?o:f;if((f.face>0?q.x>=WW-74:q.x<=74)||f.t>1.4){if(f.carry&&o.st!=='ko'){surfacePulse(o.x,'#ff2973',150,'paintSplash');spark(o.x,GROUND-120,'#ff5c91',18,370);applyHit(f,o,{dmg:19,stun:.8,push:-260,lift:460,sp:1,ub:1,hy:150});shake=24;flash=.15}f.carry=0;f.vx=0;setSt(f,'rec')}}
    else if(c==='Rd'){if(f.t>.15&&f.y<=0){f.vx=0;shake=24;dust(f.x);surfacePulse(f.x,'#ff5c8a',360);ring(f.x,GROUND-10,'#fff',130);
        if(o.st!=='ko'){const d=Math.abs(o.x-f.x),sf=f.face;f.face=o.x>=f.x?1:-1;if(d<140&&o.y<200)applyHit(f,o,{dmg:28,stun:.8,push:420,lift:520,sp:1,ub:1,hy:150});else if(d<360&&o.y<40)applyHit(f,o,{dmg:13,stun:.5,push:300,lift:300,sp:1,ub:1,hy:60});f.face=sf}setSt(f,'rec')}}
    else if(c==='Wb')stepBassGeyser(f,o);
    else if(c==='Rc'){f.spT-=dt;if(Math.random()<.5)fx.push({k:'p',x:f.x+(Math.random()<.5?-1:1)*18,y:GROUND-150,vx:(Math.random()-.5)*700,vy:-260-Math.random()*220,t:0,d:.7,col:'rgba(150,215,255,.9)',s:4+Math.random()*5});if(Math.random()<.05)ring(f.x,GROUND-130,'#cfefff',260);if(f.spT<=0&&f.spN<5&&f.t>.1){f.spT=.14;f.spN++;if(Math.abs(o.x-f.x)<290&&o.y<230&&o.st!=='ko'){const sf=f.face;f.face=o.x>=f.x?1:-1;applyHit(f,o,{dmg:4,stun:.35,push:230,sp:1,hy:150});f.face=sf}}if(f.t>.95)setSt(f,'rec')}
    else if(c==='G'){f.vx=0;if(f.t<.4&&Math.random()<.5)fx.push({k:'p',x:f.x+f.face*80,y:GROUND-150,vx:f.face*(200+Math.random()*500),vy:-160+Math.random()*240,t:0,d:.5+Math.random()*.4,col:'rgba(255,255,255,.85)',s:5+Math.random()*8});if(f.t>.08)tryHit(f,o,{reach:250,dmg:25,stun:.75,push:260,sp:1,vr:200,hy:150});if(f.t>.7)setSt(f,'rec')}
    else if(c==='B'){f.vx*=Math.pow(.02,dt);if(f.t>.1&&f.t<.42&&tryHit(f,o,{reach:135,dmg:27,stun:.8,push:220,sp:1,vr:190,hy:210})){for(let i=0;i<7;i++)fx.push({k:'s',x:o.x+(Math.random()-.5)*90,y:GROUND-o.y-230+(Math.random()-.5)*50,t:0,d:.3+Math.random()*.3,r:16+Math.random()*14,rot:Math.random()*3})}if(f.t>.62){f.vx=0;setSt(f,'rec')}}
    else if(c==='W'){f.vx*=Math.pow(.01,dt);if(f.t>.75)setSt(f,'rec')}
    else if(c==='Q')stepCloseSpecial(f,o,CLOSE_SPECIALS.Q);
    else if(c==='R'){f.trail.length=0;const n=Math.floor((f.t-.04)/.1);while(f.spN<=n&&f.spN<7){const big=f.spN===6;f.spN++;sfx.whoosh(.7);
        proj.push({o:f,kind:'donut',big,x:f.x+f.face*60,y:GROUND-150-Math.random()*50,vx:f.face*(big?560:620+Math.random()*160),vy:big?130:40+Math.random()*120,g:260,t:0,hit:false,dmg:big?8:4,stun:big?.5:.26,push:big?420:110,lift:big?360:0,c:Math.floor(Math.random()*4),rot:Math.random()*6})}
      if(f.t>.9)setSt(f,'rec')}
  }
  else if(f.st==='rec'){f.vx*=Math.pow(.0005,dt);if(f.t>.26&&f.y<=0)setSt(f,'idle')}
  else if(f.st==='hit'){f.stun-=dt;if(f.stun<=0&&f.y<=0)setSt(f,'idle')}
  else if(f.st==='kd'){f.stun-=dt;if(f.y<=0&&!f.down){f.down=true;dust(f.x);shake=Math.max(shake,5)}if(f.stun<=0&&f.y<=0){f.down=false;setSt(f,'idle')}}
  // physics
  if(f.y>0||f.vy>0){f.vy-=G*dt;f.y+=f.vy*dt;if(f.y<=0){f.y=0;f.vy=0;
      if(f.st==='jump'){setSt(f,'idle');f.vx=0}else if(f.st==='ko'){if(!f.down){f.down=true;dust(f.x);sfx.land();shake=Math.max(shake,8)}f.vx*=.3}else sfx.land()}}
  if(f.st==='hit'||f.st==='kd'||f.st==='ko'||f.st==='guard')f.vx*=Math.pow(f.y>0?.3:.004,dt);
  f.x+=f.vx*dt;f.x=Math.max(70,Math.min(WW-70,f.x));
  f.dhp+=(f.hp-f.dhp)*Math.min(1,dt*4);
}
