'use strict';
/* ---------- render ---------- */
function frameOf(f){
  const s=f.st;
  if(s==='walk')return['walk1','idle','walk2','idle'][Math.floor(f.walkD/38)%4];
  if(s==='jump')return f.airAtk&&f.atkT<.4?'kick':'jump';
  if(s==='punch')return f.t<.05?'idle':'punch';
  if(s==='kick')return f.t<.08?'idle':'kick';
  if(s==='win')return META[f.ch]?.frames?.win1?(f.t<.3?'win1':f.t<.62?'win2':f.t<1?'win3':'win'):'win';
  if(s==='throw')return f.t<R_THROW.startup?'charge':f.t<.30?'special':'idle';
  if(s==='ko'||s==='kd')return f.down?'ko':'hit';
  if(s==='rec')return'idle';
  if(s==='crouch')return'crouch';
  if(s==='cpunch')return f.t<.04?'crouch':'cpunch';
  if(s==='ckick')return f.t<.07?'crouch':'ckick';
  if(s==='charge')return f.sv?((f.ch==='Q'||(f.ch==='W'&&f.sv===2))?'charge':'idle'):'charge';
  if(s==='special'){const v=f.sv||0,c=f.ch;
    if((c==='Q'&&v===0)||(c==='E'&&v===1)){
      if(f.t<.07)return 'walk1';
      const strike=f.spN>0&&f.t+.08<f.spT?f.spN-1:f.spN;
      return ['punch',c==='E'?'special2':'kick','special','special'][strike];
    }
    if(v===0&&FIRE_FISTS[c]){
      if(f.t<.10)return 'charge';
      if(c==='Eb')return f.y>0?'special':'punch';
      return c==='Ec'&&f.t>=.26?'special':'punch';
    }
    if(c==='Wb'&&v===0)return f.t<.22?'guard':'special';
    if(c==='Rd'&&v===0&&f.y>0)return f.vy>0?'jump':'kick';
    if(v===0)return c==='R'?(Math.floor(f.t/.1)%2?'charge':'special'):'special';
    if(v===1)return'special2';if(c==='G')return'idle';if(c==='B')return'charge';if(c==='W')return'special';if(c==='E')return Math.floor(f.t/.08)%2?'punch':'kick';return'special2'}
  return s;
}
function drawSprite(ch,name,x,y,face,alpha,sc,rotation=0){
  const fs=META[ch]?.frames;if(!fs)return;const im=IMG[ch];if(!im)return;const ok=n=>fs[n]&&frameFits(im,fs[n])?fs[n]:null;const fr=ok(name)||(/^c(punch|kick)$/.test(name)?ok(name.slice(1)):null)||(name==='crouch'?ok('guard'):null)||ok('idle');if(!fr)return;const k=(sc||1)*SC;
  cx.save();cx.translate(Math.round(x),Math.round(y));cx.scale(face,1);if(rotation){cx.translate(0,-85);cx.rotate(rotation);cx.translate(0,85)}if(alpha!==undefined)cx.globalAlpha=alpha;
  cx.drawImage(im,...srcRect(im,fr),-fr[4]*k,-fr[3]*k,fr[2]*k,fr[3]*k);cx.restore();
}
function drawF(f,tm){
  const sx=f.x-camX,name=frameOf(f);let y=GROUND-f.y,bob=0;
  if(f.st==='idle')bob=Math.sin(tm*5+(f.cpu?1.5:0))*2.2;
  const sh=Math.max(.35,1-f.y/420);cx.fillStyle='rgba(10,8,30,.34)';cx.beginPath();cx.ellipse(sx,GROUND+4,(name==='ko'?120:62)*sh,13*sh,0,0,6.283);cx.fill();
  if(f.st==='special'&&Math.abs(f.vx)>200)f.trail.forEach((t,i)=>drawSprite(f.ch,name,t.x-camX,GROUND-t.y,f.face,.08+i*.05));
  if(f.st==='special'&&f.assist){const a=f.assist.ch;drawSprite(a,a==='R'?(Math.floor(f.t/.1)%2?'charge':'special'):a==='B'?'charge':a==='G'?'idle':'punch',sx+f.face*(f.assist.front?80:-95),GROUND,f.face,Math.min(1,f.t*8))}
  if(f.st==='charge'){const a=Math.min(1,f.t/.3);cx.save();cx.globalCompositeOperation='lighter';const g=cx.createRadialGradient(sx,y-120,10,sx,y-120,190);g.addColorStop(0,CH[f.ch].col);g.addColorStop(1,'rgba(0,0,0,0)');cx.globalAlpha=.55+.3*Math.sin(tm*40);cx.fillStyle=g;cx.fillRect(sx-200,y-320,400,400);
    cx.globalAlpha=1-a;cx.strokeStyle='#fff';cx.lineWidth=5;cx.beginPath();cx.ellipse(sx,GROUND,180*(1-a)+30,(180*(1-a)+30)*.25,0,0,6.283);cx.stroke();cx.restore()}
  let jx=0;if(f.st==='hit'&&f.t<.12)jx=Math.sin(f.t*120)*4;
  if(f.st==='special'&&f.ch==='R'&&(f.sv===1||f.sv===2&&f.t<.34)&&IMG.ostrichR){
    const stride=[0,1,2,1][Math.floor(f.t*14)%4];
    cx.save();cx.translate(sx,y);cx.scale(f.face,1);
    cx.drawImage(IMG.ostrichR,362*stride,0,362,246,-156,-229,353,240);
    cx.restore();
  }else{
    drawSprite(f.ch,name,sx+jx,y+(name==='ko'?6:bob),f.face,undefined,1,f.thrown?-Math.sin(Math.min(1,f.t/.32)*Math.PI)*.95:0);
  }
  if(f.st==='special'&&f.ch==='Wc'&&!f.sv)drawPaintRoller(f,sx,y);
  if(f.st==='special'&&f.ch==='Rc'&&!f.sv)drawTears(f,sx,y);
}
function drawPaintRoller(f,x,y){
  cx.save();cx.translate(x+f.face*90,y-40);cx.scale(f.face,1);
  cx.lineCap='round';cx.lineWidth=7;cx.strokeStyle='#fce6f1';
  cx.beginPath();cx.moveTo(-77,-75);cx.lineTo(-39,-24);cx.lineTo(24,-24);cx.stroke();
  const paint=cx.createLinearGradient(0,-27,0,24);
  paint.addColorStop(0,'#ffb7d3');paint.addColorStop(.4,'#ff437f');paint.addColorStop(1,'#ba1353');
  cx.fillStyle=paint;rr(-36,-27,98,51,19);cx.fill();
  cx.fillStyle='#ff87b3';cx.beginPath();cx.ellipse(57,-2,13,24,0,0,Math.PI*2);cx.fill();
  cx.restore();
}
function drawTears(f,x,y){
  cx.save();cx.lineCap='round';
  const pulse=Math.sin(f.t*21)*9;
  for(const side of [-1,1]){
    for(const [width,color] of [[10,'#65d8ff'],[3,'#effcff']]){
      cx.strokeStyle=color;cx.globalAlpha=.82;cx.lineWidth=width;
      cx.beginPath();cx.moveTo(x+side*18,y-165);
      cx.quadraticCurveTo(x+side*(76+pulse),y-223,x+side*(113+pulse),y-102);
      cx.stroke();
    }
  }
  cx.restore();
}
function drawFirePunch(e,x,a){
  cx.translate(x,e.y);
  if(e.vertical)cx.rotate(-Math.PI/2);
  else cx.scale(e.dir,1);
  cx.globalCompositeOperation='lighter';cx.globalAlpha=a;
  const w=157+78*(1-a),h=e.vertical?94:73;
  const flame=cx.createLinearGradient(-w*.7,0,w*.45,0);
  flame.addColorStop(0,'transparent');flame.addColorStop(.43,e.col);flame.addColorStop(1,'#fff6d9');
  cx.fillStyle=flame;
  cx.beginPath();cx.moveTo(-w*.7,0);cx.quadraticCurveTo(-w*.25,-h,w*.5,-h*.16);
  cx.quadraticCurveTo(w*.77,0,w*.46,h*.32);cx.quadraticCurveTo(0,h,-w*.7,0);
  cx.fill();
  cx.strokeStyle=e.col;cx.lineCap='round';cx.lineWidth=5*a+1;
  for(let j=-1;j<=1;j++){
    cx.beginPath();cx.moveTo(-w*.75,15*j);
    cx.quadraticCurveTo(-w*.08,45*j+10,w*.44,14*j);cx.stroke();
  }
}
function drawSurfacePulse(e,x,a){
  cx.globalAlpha=a;cx.strokeStyle=e.col;cx.lineWidth=2+9*a;cx.lineCap='round';
  const w=Math.max(8,e.w*(.35+.65*(1-a)));
  cx.beginPath();cx.ellipse(x,e.y,w,12+10*(1-a),0,0,Math.PI*2);cx.stroke();
  for(const side of [-1,1]){
    cx.beginPath();cx.moveTo(x,e.y);
    if(e.k==='paintSplash'){
      cx.quadraticCurveTo(x+side*w*.49,e.y-95*a,x+side*w,e.y-22*a);
    }else{
      cx.lineTo(x+side*w*.33,e.y-8);cx.lineTo(x+side*w*.6,e.y+13);
      cx.lineTo(x+side*w*.82,e.y-2);cx.lineTo(x+side*w,e.y+8);
    }
    cx.stroke();
  }
}
function drawTagBurst(e,x,a){
  cx.translate(x,e.y);cx.scale(e.dir,1);cx.globalAlpha=a;
  const p=1-a;
  if(e.theme==='tide'){
    const travel=40+540*p;
    cx.fillStyle='#48cfff';cx.strokeStyle='#f5ffff';cx.lineWidth=5;
    cx.beginPath();cx.moveTo(travel-130,150);
    cx.bezierCurveTo(travel+175,140,travel-100,-145,travel+184,16);
    cx.bezierCurveTo(travel+90,-12,travel+50,27,travel+150,139);
    cx.lineTo(travel+310,150);cx.closePath();cx.fill();cx.stroke();
  }else if(e.theme==='paint'||e.theme==='balloon'){
    const paint=e.theme==='paint',n=paint?11:5;
    for(let i=0;i<n;i++){
      const spread=70+i*(paint?88:108),off=54*Math.sin(i*31);
      cx.fillStyle=i%2?'#ff448d':'#ffc7e1';
      cx.strokeStyle='#fff0f9';cx.lineWidth=3;
      cx.beginPath();cx.ellipse(spread*(.42+.58*p),off,paint?27+15*p:55,paint?14+7*p:38,-.24,0,6.283);cx.fill();cx.stroke();
    }
  }else{
    for(let i=0;i<10;i++){
      const q=i*93+45;
      cx.strokeStyle=e.theme==='drum'?(i%2?'#ffa7df':'#82e9ff'):(i%2?'#ffe37a':'#ceb1ff');
      cx.lineWidth=8*a+1;
      cx.beginPath();
      if(e.theme==='drum')cx.ellipse(q,p*15,25+15*p,62,0,0,6.283);
      else{cx.moveTo(q-76,15);cx.lineTo(q-34,-44);cx.lineTo(q-50,0);cx.lineTo(q+35,35)}
      cx.stroke();
    }
  }
}
function drawSpecialArc(e,x,a){
  cx.translate(x,e.y);
  cx.scale(e.dir,e.idx===1?-1:1);
  cx.rotate(e.idx===2?-1.05:.25);
  cx.globalAlpha=a;
  cx.lineCap='round';
  for(const width of [16,4]){
    cx.lineWidth=width*a+1;
    cx.strokeStyle=width===16?e.col:'#fff4ed';
    for(let i=0;i<(e.col==='#aa70ff'?3:1);i++){
      const y=i*13-13;
      cx.beginPath();
      cx.moveTo(-70,y+27);
      cx.quadraticCurveTo(0,y-60,83,y-15);
      cx.stroke();
    }
  }
}
function drawBassGeyser(e,x,a){
  if(e.k==='geyserCharge'){
    cx.globalAlpha=.35+.5*(1-a);
    cx.strokeStyle='#bc89ff';
    cx.lineWidth=3;
    cx.beginPath();
    cx.ellipse(x,e.y,62+35*(1-a),13,0,0,Math.PI*2);
    cx.stroke();
    return;
  }
  const height=290*Math.sin(Math.PI*Math.min(1,e.t/e.d)**.65);
  const light=cx.createLinearGradient(x,e.y,x,e.y-Math.max(1,height));
  light.addColorStop(0,'#fff2ff');
  light.addColorStop(.4,'#cc9bff');
  light.addColorStop(1,'#8039f0');
  cx.globalAlpha=Math.min(1,a*1.8);
  cx.fillStyle=light;
  for(const offset of [-40,0,40]){
    const tip=x+offset*1.65;
    const top=e.y-height*(offset===0?1:.67);
    cx.beginPath();
    cx.moveTo(x+offset-36,e.y);
    cx.quadraticCurveTo(tip-27,top+22,tip,top);
    cx.quadraticCurveTo(tip+9,top+57,x+offset+36,e.y);
    cx.closePath();
    cx.fill();
  }
}
function holo(x0,x1){const g=cx.createLinearGradient(x0,0,x1,0);g.addColorStop(0,'#8ef6ff');g.addColorStop(.35,'#c9a6ff');g.addColorStop(.65,'#ffb3e1');g.addColorStop(1,'#fff3b0');return g}
function rr(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath()}
function txt(s,x,y,size,col,al,font,stroke){cx.font=size+'px '+(font||"'Bungee'")+",'Pretendard',sans-serif";cx.textAlign=al||'center';cx.textBaseline='middle';if(stroke){cx.lineJoin='round';cx.lineWidth=stroke;cx.strokeStyle='#0b0a1c';cx.strokeText(s,x,y)}cx.fillStyle=col;cx.fillText(s,x,y)}
function hud(tm){
  const bar=(f,left)=>{const x=left?92:VW-92-340,w=340,y=22,h=20,nl=CH[f.ch].name.length>1,no=nl?CH[f.ch].name.length*15-8:0;
    cx.fillStyle='rgba(11,10,28,.78)';rr(x-3,y-3,w+6,h+6,8);cx.fill();
    const maxHp=CH[f.ch].hp,dw=w*f.dhp/maxHp,hw=w*f.hp/maxHp;cx.fillStyle='#ff4d6a';rr(left?x+w-dw:x,y,Math.max(0,dw),h,5);cx.fill();
    cx.fillStyle=f.hp<maxHp*.25?'#ffcf5a':holo(x,x+w);if(hw>1){rr(left?x+w-hw:x,y,hw,h,5);cx.fill()}
    cx.fillStyle='rgba(255,255,255,.35)';cx.fillRect(left?x+w-hw:x,y+2,hw,4);
    const star=n=>n>1?'★'+n+' ':n>0?'★ ':'';
    const name=net
      ? (left===net.host?star(playerTitles)+playerName:(net.match?star(net.match.titles)+net.match.opponent:(net.remoteName || '상대')))
      : (left?star(playerTitles)+playerName:(practice?'DUMMY':'CPU'));
    cx.font="700 18px 'IBM Plex Sans KR', sans-serif";
    cx.textAlign=left?'left':'right';
    cx.textBaseline='middle';
    cx.lineJoin='round';cx.lineWidth=4;cx.strokeStyle='#0b0a1c';cx.fillStyle='#fff';
    const nameX=left?x+4:x+w-4, nameY=y+h+14;
    cx.strokeText(name,nameX,nameY,w-8);
    cx.fillText(name,nameX,nameY,w-8);
    // meter
    const my=y+h+29,mw=220,mx=left?x:x+w-mw,mm=mw*f.meter/100,full=f.meter>=100;
    cx.fillStyle='rgba(11,10,28,.78)';rr(mx-2,my-2,mw+4,11,5);cx.fill();cx.fillStyle=full?(Math.sin(tm*14)>0?'#fff':CH[f.ch].col):CH[f.ch].col;if(mm>1){rr(left?mx:mx+mw-mm,my,mm,7,3);cx.fill()}
    if(full)txt('필살기 준비',left?mx+mw+10:mx-10,my+4,13,'#fff',left?'left':'right',"'Pretendard'",4);
    // portrait
    const px=left?48:VW-48,py=40,im=IMG[f.ch+'_face'];cx.save();cx.beginPath();cx.arc(px,py,34,0,6.283);cx.closePath();cx.fillStyle='#b9bedb';cx.fill();cx.clip();
    if(im){cx.translate(px,py);if(!left)cx.scale(-1,1);cx.drawImage(im,45,120,240,240,-34,-34,68,68)}cx.restore();
    cx.lineWidth=4;cx.strokeStyle=CH[f.ch].col;cx.beginPath();cx.arc(px,py,34,0,6.283);cx.stroke();
    txt(CH[f.ch].name,left?x+4:x+w-4,y+h+58,nl?20:30,CH[f.ch].col,left?'left':'right',0,6);
    txt('TAG',left?x+44+no:x+w-44-no,y+h+60,12,(f.tagUsed||!TAG[f.ch])?'rgba(255,255,255,.22)':'#fff3b0',left?'left':'right',0,4);
    for(let i=0;i<2;i++){const dx=left?x+w-14-i*22:x+14+i*22;cx.beginPath();cx.arc(dx,y+h+58,7,0,6.283);cx.fillStyle=i<f.wins?'#fff3b0':'rgba(11,10,28,.7)';cx.fill();cx.lineWidth=2;cx.strokeStyle='#fff';cx.stroke()}
  };
  bar(P,true);bar(C,false);
  cx.fillStyle='rgba(11,10,28,.82)';cx.beginPath();cx.arc(VW/2,36,30,0,6.283);cx.fill();cx.lineWidth=3;cx.strokeStyle=holo(VW/2-30,VW/2+30);cx.stroke();
  txt(practice?'∞':String(Math.ceil(timer)),VW/2,38,26,!practice&&timer<10?'#ff4d6a':'#fff');
  if(combo.n>1&&combo.t>0){const left=combo.who===P;txt(combo.n+' HIT',left?130:VW-130,150,34,'#fff3b0','center',0,7)}
}
function drawAmb(tm){
  const id=stage.id;cx.save();
  for(const a of amb){ if(id==='anime'){const y=(a.y+tm*50*a.s)%VH,x=(a.x+Math.sin(tm*.8+a.p)*40-camX*.3+VW*4)%VW;cx.fillStyle='rgba(255,190,220,.85)';cx.beginPath();cx.ellipse(x,y,6*a.s,3.4*a.s,tm*2+a.p,0,6.283);cx.fill()}
    else if(id==='band'||id==='concert'){const y=VH-((a.y+tm*24*a.s)%VH),x=(a.x-camX*.2+VW*4)%VW;cx.globalAlpha=.35+.3*Math.sin(tm*3+a.p);cx.fillStyle=a.p>3?'#c77dff':'#5ef2e0';cx.beginPath();cx.arc(x,y,2.2*a.s,0,6.283);cx.fill()}
    else if(id==='snow'){const y=(a.y+tm*42*a.s)%VH,x=(a.x+Math.sin(tm+a.p)*24-camX*.3+VW*4)%VW;cx.globalAlpha=.85;cx.fillStyle='#fff';cx.beginPath();cx.arc(x,y,2.6*a.s,0,6.283);cx.fill()}
    else if(id==='aqua'){const y=VH-((a.y+tm*36*a.s)%VH),x=(a.x+Math.sin(tm*1.3+a.p)*14-camX*.2+VW*4)%VW;cx.globalAlpha=.5;cx.strokeStyle='#cfefff';cx.lineWidth=1.5;cx.beginPath();cx.arc(x,y,4*a.s,0,6.283);cx.stroke()}
    else if(id==='park'){const y=(a.y+tm*60*a.s)%VH,x=(a.x+Math.sin(tm*2+a.p)*30-camX*.3+VW*4)%VW;cx.globalAlpha=.9;cx.fillStyle=['#ff6fb5','#ffe27a','#7fe6ff','#b7a2ff'][Math.floor(a.p*10)%4];cx.save();cx.translate(x,y);cx.rotate(tm*3+a.p);cx.fillRect(-4*a.s,-2*a.s,8*a.s,4*a.s);cx.restore()}
    else if(id==='hanok'||id==='rooftop'){const y=VH*.85-((a.y+tm*14*a.s)%(VH*.7)),x=(a.x+Math.sin(tm*.7+a.p)*30-camX*.2+VW*4)%VW;cx.globalAlpha=.4+.4*Math.sin(tm*2.5+a.p);cx.fillStyle='#ffd98a';cx.beginPath();cx.arc(x,y,2.2*a.s,0,6.283);cx.fill()}
    else{const y=(a.y+Math.sin(tm*.5+a.p)*20+VH)%VH*.7,x=(a.x+tm*8*a.s-camX*.2+VW*4)%VW;cx.globalAlpha=.25+.2*Math.sin(tm*2+a.p);cx.fillStyle=id==='gym'?'#fff2c2':'#fff';cx.beginPath();cx.arc(x,y,1.8*a.s,0,6.283);cx.fill()} }
  cx.restore();
  if((id==='band'||id==='concert')&&bgm&&AC){const b=Math.max(0,1-(AC.currentTime-bgm.beat)*5);cx.fillStyle='rgba(190,110,255,'+(b*.1)+')';cx.fillRect(0,0,VW,VH)}
}
function render(tm){
  cx.setTransform(cv.width/VW,0,0,cv.height/VH,0,0);
  if((mode!=='fight'&&mode!=='paused')||!P){cx.fillStyle='#07060f';cx.fillRect(0,0,VW,VH);return}
  cx.save();const sk=shake>.5?shake:0;cx.translate((Math.random()-.5)*sk,(Math.random()-.5)*sk);
  const bg=IMG['bg_'+stage.id];cx.fillStyle='#07060f';cx.fillRect(0,0,VW,VH);if(!bg)needBg(stage);if(bg){const r=bg.width/WW;cx.drawImage(bg,camX*r,0,VW*r,bg.height,-8,-8,VW+16,VH+16)}
  drawAmb(tm);
  const dim=freeze?.5:0;if(dim>0){cx.fillStyle='rgba(8,6,26,'+dim+')';cx.fillRect(-10,-10,VW+20,VH+20)}
  const order=(P.st==='ko'||C.st==='hit'||(freeze&&freeze.f===P))?[C,P]:[P,C];if(freeze&&freeze.f===C){order[0]=P;order[1]=C}
  if(zone){const a=Math.min(1,zone.t/.5,(3.8-zone.t)/.2);cx.save();cx.globalAlpha=.8*a;cx.fillStyle='#ff5c8a';cx.beginPath();cx.ellipse(zone.x-camX,GROUND+6,zone.w/2,17,0,0,6.283);cx.fill();cx.globalAlpha=.6*a;cx.fillStyle='#ffc2d4';cx.beginPath();cx.ellipse(zone.x-camX-zone.w*.15,GROUND+2,zone.w*.22,5,0,0,6.283);cx.fill();cx.restore()}
  for(const f of order)drawF(f,tm);
  for(const f of[P,C]){const s=f.rev>0?'?!':f.slip>0?'~~':f.dizzy>0?'★':'';if(s&&f.st!=='ko'){cx.save();cx.font='900 30px sans-serif';cx.textAlign='center';cx.lineWidth=5;cx.strokeStyle='#2a1030';cx.fillStyle=f.rev>0?'#ff5c8a':f.slip>0?'#ffb3cc':'#ffe27a';const x=f.x-camX+Math.sin(tm*9)*8,y=GROUND-f.y-265+Math.cos(tm*7)*4;cx.strokeText(s,x,y);cx.fillText(s,x,y);cx.restore()}}
  if(flood){const a=Math.min(1,flood.t/.5,(3.2-flood.t)/.4),h=78*a;cx.save();cx.globalAlpha=.42;cx.fillStyle='#6cc6ff';cx.beginPath();cx.moveTo(-10,VH+10);for(let x=-10;x<=VW+10;x+=30)cx.lineTo(x,GROUND+12-h+Math.sin(x*.03+tm*5)*5);cx.lineTo(VW+10,VH+10);cx.closePath();cx.fill();cx.restore()}
  // projectiles
  for(const p of proj){const sx=p.x-camX,d=p.vx>0?1:-1;cx.save();cx.translate(sx,p.y);
    if(p.kind==='rocket'){cx.scale(d,1);cx.save();cx.globalCompositeOperation='lighter';const g=cx.createRadialGradient(-34,0,2,-34,0,34);g.addColorStop(0,'#fff');g.addColorStop(.4,'#ffb3e1');g.addColorStop(1,'rgba(255,100,160,0)');cx.fillStyle=g;cx.beginPath();cx.ellipse(-40,0,44+Math.sin(tm*60)*6,15,0,0,6.283);cx.fill();cx.restore();
      cx.fillStyle='#ff87cd';cx.strokeStyle='#fff2fc';cx.lineWidth=3;
      cx.beginPath();cx.ellipse(2,0,28,16,0,0,6.283);cx.fill();cx.stroke();
      txt('♪',4,0,25,'#fff','center','sans-serif',2)}
    else if(p.kind==='wave'){cx.scale(d,1);cx.globalCompositeOperation='lighter';cx.lineCap='round';const cs=[['#fff','#bfe6ff','#6fb8ff'],['#fff','#ffb3e1','#ff7fbf'],['#ffd0dc','#ff5c8a','#ff2d55']][p.col||0];for(let i=0;i<3;i++){cx.strokeStyle=cs[i];cx.globalAlpha=.95-i*.24;cx.lineWidth=8-i*2;cx.beginPath();cx.arc(-i*22,0,30+i*16+Math.min(40,p.t*60),-1.1,1.1);cx.stroke()}}
    else if(p.kind==='stick'){cx.scale(d,1);cx.save();cx.globalCompositeOperation='lighter';cx.strokeStyle='rgba(255,255,255,.7)';cx.lineWidth=3;for(let i=-1;i<2;i++){cx.beginPath();cx.moveTo(-40,i*7);cx.lineTo(-150-Math.random()*80,i*9);cx.stroke()}cx.restore();
      cx.fillStyle='#d9a55b';cx.strokeStyle='#5a3a1a';cx.lineWidth=2;rr(-42,-4,74,8,4);cx.fill();cx.stroke();cx.beginPath();cx.ellipse(34,0,8,6,0,0,6.283);cx.fill();cx.stroke()}
    else if(p.kind==='body'){const im=IMG[p.ch],fr=META[p.ch].frames[p.frame];cx.scale(d,1);if(p.spin)cx.rotate(p.t*18);if(im&&fr)cx.drawImage(im,...srcRect(im,fr),-fr[2]*SC/2,-fr[3]*SC/2,fr[2]*SC,fr[3]*SC)}
    else{const R=p.big?40:17;cx.rotate(p.rot+p.t*14*d);cx.lineWidth=R*.72;cx.strokeStyle='#e0a868';cx.beginPath();cx.arc(0,0,R*.68,0,p.half?3.1416:6.283);cx.stroke();
      cx.lineWidth=R*.5;cx.strokeStyle=p.big?'#ff8ec4':['#ff9ecb','#6b3f24','#9ff0c8','#ffe27a'][p.c];cx.beginPath();cx.arc(0,0,R*.7,0,p.half?3.1416:6.283);cx.stroke();
      cx.fillStyle='#fff';for(let i=0;i<(p.big?10:6);i++){const q=i*6.283/(p.big?10:6);cx.fillRect(Math.cos(q)*R*.7-1.5,Math.sin(q)*R*.7-1.5,p.big?5:3,p.big?5:3)}}
    cx.restore()}
  // fx
  for(const e of fx){const a=1-e.t/e.d,sx=e.x-camX;cx.save();
    if(e.k==='p'){cx.globalAlpha=a;cx.fillStyle=e.col;cx.beginPath();cx.arc(sx,e.y,e.s*a,0,6.283);cx.fill()}
    else if(e.k==='r'){cx.globalAlpha=a;cx.strokeStyle=e.col;cx.lineWidth=6*a;cx.beginPath();cx.arc(sx,e.y,e.r*(1-a)+10,0,6.283);cx.stroke()}
    else if(e.k==='hit'){const p=e.t/e.d,R=e.r*(.35+p*.9),g=cx.createRadialGradient(0,0,0,0,0,R);cx.globalCompositeOperation='lighter';cx.globalAlpha=a;cx.translate(sx,e.y);
      g.addColorStop(0,'#fff');g.addColorStop(.4,e.col);g.addColorStop(1,'rgba(255,255,255,0)');cx.fillStyle=g;cx.beginPath();cx.arc(0,0,R,0,6.283);cx.fill();
      cx.save();cx.rotate(e.rot);cx.strokeStyle='#fff';cx.lineCap='round';for(let i=0;i<8;i++){const q=i*Math.PI/4+(i%2?.22:0),r1=e.r*(.28+p*.7),r2=e.r*(.62+p*1.15)*(i%2?.68:1);cx.lineWidth=(i%2?3:5)*a+1;cx.beginPath();cx.moveTo(Math.cos(q)*r1,Math.sin(q)*r1);cx.lineTo(Math.cos(q)*r2,Math.sin(q)*r2);cx.stroke()}cx.restore();
      cx.scale(e.dir,1);cx.strokeStyle=e.col;cx.lineWidth=8*a+1;cx.beginPath();cx.arc(-e.r*.25,0,e.r*(.6+p*.7),-1.05,1.05);cx.stroke()}
    else if(e.k==='block'){const p=e.t/e.d;cx.globalCompositeOperation='lighter';cx.globalAlpha=a;cx.translate(sx,e.y);cx.scale(e.dir,1);cx.lineCap='round';
      for(let i=0;i<2;i++){cx.strokeStyle=i?'#fff':'#8ef6ff';cx.lineWidth=(i?3:9)*a+1;cx.beginPath();cx.arc(-34,0,46+p*22+i*4,-.95,.95);cx.stroke()}
      cx.fillStyle='rgba(142,246,255,.35)';cx.beginPath();cx.arc(-34,0,46+p*22,-.95,.95);cx.closePath();cx.fill()}
    else if(e.k==='s'){cx.globalCompositeOperation='lighter';cx.globalAlpha=a;cx.translate(sx,e.y);cx.rotate(e.rot);cx.fillStyle='#fff';const R=e.r*(1.3-a*.5);cx.beginPath();for(let i=0;i<16;i++){const q=i*Math.PI/8,r2=i%2?R*.28:R;cx.lineTo(Math.cos(q)*r2,Math.sin(q)*r2)}cx.closePath();cx.fill()}
    else if(e.k==='c'){cx.globalCompositeOperation='lighter';cx.globalAlpha=a;cx.translate(sx,e.y);cx.rotate(e.rot+e.t*8);cx.fillStyle=['#8ef6ff','#c9a6ff','#fff'][Math.floor(e.s)%3];cx.beginPath();cx.moveTo(0,-e.s);cx.lineTo(e.s*.6,0);cx.lineTo(0,e.s);cx.lineTo(-e.s*.6,0);cx.closePath();cx.fill()}
    else if(e.k==='l'){cx.globalAlpha=a*.8;cx.strokeStyle='#fff';cx.lineWidth=3;cx.beginPath();cx.moveTo(sx,e.y);cx.lineTo(sx-e.dir*e.w,e.y);cx.stroke()}
    else if(e.k==='n'){cx.globalAlpha=a;txt('♪',sx,e.y,e.s,e.col||'#fff','center','sans-serif',3)}
    else if(e.k==='h'){cx.globalAlpha=a;cx.translate(sx,e.y);cx.scale(e.s/14,e.s/14);cx.fillStyle='#ff6fa5';cx.beginPath();cx.moveTo(0,7);cx.bezierCurveTo(-15,-5,-8,-17,0,-7);cx.bezierCurveTo(8,-17,15,-5,0,7);cx.fill()}
    else if(e.k==='firePunch')drawFirePunch(e,sx,a);
    else if(e.k==='groundPulse'||e.k==='paintSplash')drawSurfacePulse(e,sx,a);
    else if(e.k==='tagBurst')drawTagBurst(e,sx,a);
    else if(e.k==='shout'){
      cx.globalAlpha=a;cx.strokeStyle='#ffacd8';cx.lineWidth=8*a+2;
      for(let n=1;n<=5;n++){
        cx.beginPath();cx.ellipse(sx+e.dir*(50+n*97),e.y,13+n*4,23+n*10,0,0,6.283);cx.stroke();
      }
    }
    else if(e.k==='feather'){
      cx.translate(sx,e.y);cx.rotate(e.rot+e.t*7);cx.globalAlpha=a;cx.fillStyle='#fff7fd';
      cx.beginPath();cx.ellipse(0,0,11,4,0,0,6.283);cx.fill();
    }
    else if(e.k==='specialArc')drawSpecialArc(e,sx,a);
    else if(e.k==='geyserCharge'||e.k==='geyser')drawBassGeyser(e,sx,a);
    else if(e.k==='beam'){cx.globalCompositeOperation='lighter';cx.lineCap='round';const w=Math.sin(Math.min(1,e.t/e.d)*3.1416);for(let q=0;q<2;q++){cx.strokeStyle=e.gold?(q?'#fff3b0':'#ffc93c'):e.pur?(q?'#e0b8ff':'#8b5cf6'):(q?'#5ef2ff':'#ff6fb5');cx.lineWidth=16*w+2;cx.beginPath();for(let x=0;x<=1000;x+=14){const yy=Math.sin(x*.03-tm*34+q*3.1416)*18;cx.lineTo(sx+e.dir*x,e.y+yy)}cx.stroke()}cx.strokeStyle='#fff';cx.lineWidth=7*w;cx.beginPath();cx.moveTo(sx,e.y);cx.lineTo(sx+e.dir*1000,e.y);cx.stroke()}
    else if(e.k==='bolt'){cx.globalCompositeOperation='lighter';cx.globalAlpha=Math.min(1,a*2);cx.lineJoin='round';for(let q=0;q<2;q++){cx.strokeStyle=q?'#fff':'#6fd0ff';cx.lineWidth=q?5:16;cx.beginPath();cx.moveTo(sx+Math.sin(e.seed)*60,-10);for(let i=1;i<=8;i++){const yy=e.y*i/8;cx.lineTo(sx+(i===8?0:Math.sin(e.seed*i*1.7+Math.floor(e.t*30))*46),yy)}cx.stroke()}cx.fillStyle='rgba(180,230,255,.8)';cx.beginPath();cx.ellipse(sx,e.y,70*a,16*a,0,0,6.283);cx.fill()}
    else if(e.k==='d'){cx.globalAlpha=Math.min(1,a*2);txt(String(e.txt),sx,e.y-(1-a)*46,24,'#fff','center',0,5)}
    cx.restore()}
  cx.restore();
  if(flash>0){cx.fillStyle='rgba(255,255,255,'+flash*1.3+')';cx.fillRect(0,0,VW,VH)}
  hud(tm);
  if(msg){const a=msg.t/msg.dur,sc=a<.12?2.2-a*10:1,al=a>.8?(1-a)*5:1;cx.save();cx.globalAlpha=Math.max(0,al);cx.translate(VW/2,225);cx.scale(sc,sc);
    const big=msg.txt==='K.O.';txt(msg.txt,0,0,big?150:msg.txt.length>7?74:92,big?'#ff4d6a':holo(-260,260),'center',0,16);if(msg.sub)txt(msg.sub,0,74,30,'#fff','center',"'Pretendard'",7);cx.restore()}
}
