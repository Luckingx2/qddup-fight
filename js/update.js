'use strict';
function update(dt){
  if(mode!=='fight')return;
  for(const k in buf)buf[k]=Math.max(0,buf[k]-dt);for(const k in rbuf)rbuf[k]=Math.max(0,rbuf[k]-dt);
  // fx always advance
  for(const e of fx){e.t+=dt;if(e.vx!==undefined){e.x+=e.vx*dt;e.y+=e.vy*dt;if(e.k==='p')e.vy+=600*dt}} fx=fx.filter(e=>e.t<e.d);
  shake*=Math.pow(.002,dt);flash=Math.max(0,flash-dt);if(msg){msg.t+=dt;if(msg.t>msg.dur)msg=null}
  combo.t-=dt;tickEmotes(dt);
  if(net&&(net.lost||net.resumeAt))return;
  if(net&&!net.host){netGuest(dt);return}
  if(cut){cut.t+=dt;$('cutT').classList.toggle('on',cut.vk==='G'&&cut.v.currentTime>(window.__cutT0||3.0)&&cut.v.currentTime<4.7);if(!net&&cut.t>.5&&(buf.p>0||buf.k>0||buf.s>0||buf.t>0)){buf.p=buf.k=buf.s=buf.t=0;endCut()}else if(cut.t>cut.max)endCut();return}
  if(hitstop>0){hitstop-=dt;return}
  if(freeze){freeze.t-=dt;freeze.f.t+=dt;if(freeze.t<=0){const f=freeze.f;freeze=null;fire(f);setMusicGain(.5);}return}
  let sdt=dt;if(slow>0){slow-=dt;sdt=dt*.28}
  pt+=dt;
  if(phase==='intro'){if(pt>1.15&&pt-dt<=1.15){say('FIGHT!',.7);sfx.bell()}if(pt>1.75)phase='fight'}
  else if(phase==='fight'){timer-=dt;if(timer<=0){timer=0;phase='time';pt=0;say('TIME UP',1.6);
      const diff=P.hp/CH[P.ch].hp-C.hp/CH[C.ch].hp;
      P.winner=diff>1e-6;C.winner=diff<-1e-6;
      if(P.winner)P.wins++;
      if(C.winner)C.wins++}}
  else if(phase==='ko'||phase==='time'){
    if(pt>1.5&&pt-dt<=1.5){for(const f of[P,C])if(f.winner&&f.st!=='ko'){setSt(f,'win');f.vx=0;if(f.hp>=CH[f.ch].hp)say('PERFECT',1.2)}}
    if(pt>3.3){ setMusicGain(.5); if(P.wins>=2||C.wins>=2){result(P.wins>C.wins);return} round++;startRound();return } }
  // inputs
  const I=P.inp;I.l=held.l;I.r=held.r;I.up=held.up;I.down=held.down;I.p=buf.p>0?1:0;I.k=buf.k>0?1:0;I.s=buf.s>0?1:0;I.t=buf.t>0?1:0;I.g=buf.g>0?1:0;
  if(net){const J=C.inp;J.l=rh.l;J.r=rh.r;J.up=rh.up;J.down=rh.down;J.p=rbuf.p>0?1:0;J.k=rbuf.k>0?1:0;J.s=rbuf.s>0?1:0;J.t=rbuf.t>0?1:0;J.g=rbuf.g>0?1:0}
  else if(phase==='fight')think(C,P,sdt);else{const J=C.inp;J.l=J.r=J.up=J.down=J.p=J.k=J.s=J.t=J.g=0}
  stepF(P,C,sdt);stepF(C,P,sdt);
  if(zone){zone.t-=sdt;const o=zone.o===P?C:P;if(o.y<=0&&Math.abs(o.x-zone.x)<zone.w/2&&o.st!=='ko')o.slip=.3;if(zone.t<=0)zone=null}
  if(flood){flood.t-=sdt;if(phase==='fight'&&flood.o.hp>0)flood.o.hp=Math.min(CH[flood.o.ch].hp,flood.o.hp+5*sdt);if(flood.t<=0)flood=null}
  // body push
  if(P.y<60&&C.y<60&&P.st!=='ko'&&C.st!=='ko'&&!(P.st==='special'||C.st==='special')){const dx=C.x-P.x,m=78-Math.abs(dx);if(m>0){const s=(dx>=0?1:-1)*m/2;P.x-=s;C.x+=s;P.x=Math.max(70,Math.min(WW-70,P.x));C.x=Math.max(70,Math.min(WW-70,C.x))}}
  // projectiles
  for(const p of proj){p.t+=sdt;p.x+=p.vx*sdt;p.vy-=p.g*sdt;p.y-=p.vy*sdt;const o=p.o===P?C:P;
    if(!p.hit&&Math.abs(p.x-o.x)<(p.big?70:54)&&o.y<190&&p.y>GROUND-o.y-290&&o.st!=='ko'){p.hit=true;const f=p.o,sf=f.face;f.face=p.vx>0?1:-1;applyHit(f,o,{dmg:p.dmg,stun:p.stun,push:p.push,lift:p.lift,sp:1,hy:GROUND-o.y-p.y});f.face=sf;
      if(p.kind==='rocket'){shake=20;flash=.25;ring(p.x,p.y,'#ffb3e1',120);ring(p.x,p.y,'#fff',80);spark(p.x,p.y,'#ffcf5a',26,560);spark(p.x,p.y,'#ff6b8e',20,420);for(let i=0;i<8;i++)fx.push({k:'n',x:p.x,y:p.y,vx:(Math.random()-.5)*500,vy:-100-Math.random()*300,t:0,d:.8,s:18+Math.random()*14})}
      else if(p.heart){hearts(p.x,p.y,18);sfx.kiss()}
      else if(p.kind==='wave')ring(p.x,p.y,'#fff',50)
      else if(p.kind==='donut')spark(p.x,p.y,['#ff9ecb','#7a4a2b','#9ff0c8','#ffe27a'][p.c],8,260)
      else{shake=18;ring(p.x,p.y,'#fff',90);spark(p.x,p.y,'#ffe27a',20,480)}}
    if(p.heart&&Math.random()<.2)hearts(p.x-(p.vx>0?40:-40),p.y,1);
    if(p.kind==='rocket'&&Math.random()<.7)fx.push({k:'p',x:p.x-(p.vx>0?1:-1)*34,y:p.y+(Math.random()-.5)*10,vx:-p.vx*.15,vy:(Math.random()-.5)*60,t:0,d:.35,col:Math.random()<.5?'#ffb3e1':'rgba(255,255,255,.8)',s:6+Math.random()*7})}
  proj=proj.filter(p=>!p.hit&&p.x>-100&&p.x<WW+100&&p.t<2.4&&p.y<GROUND+6);
  const mid=(P.x+C.x)/2-VW/2;camX+=(Math.max(0,Math.min(WW-VW,mid))-camX)*Math.min(1,dt*6);
  const bs=$('bS');if(bs)bs.classList.toggle('rdy',ME().meter>=100);const bt=$('bT');if(bt){bt.classList.toggle('rdy',ME().meter>=100&&!ME().tagUsed&&!!TAG[ME().ch]);bt.classList.toggle('used',!!ME().tagUsed||!TAG[ME().ch])}
}

