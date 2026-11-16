'use strict';
function think(f,o,dt){
  const A=f.ai,I=f.inp;I.p=I.k=I.s=I.t=I.g=I.q=0;A.t-=dt;const d=Math.abs(o.x-f.x),tw=o.x>f.x?1:-1;
  if(A.t<=0){ const react=Math.max(.13,.34-level*.035),gp=Math.min(.74,.2+level*.09),ag=Math.min(.92,.5+level*.07);
    A.t=react*(.7+Math.random()*.6);A.mv=0;A.down=0;A.up=0;A.crouch=0;
    const threat=((o.st==='punch'||o.st==='kick'||(o.st==='jump'&&o.y>40&&d<230)||(o.st==='special'&&(o.ch==='Q'||o.ch==='E')))&&d<230)||o.st==='charge'&&level>1||proj.some(p=>p.o===o&&Math.abs(p.x-f.x)<300);
    if(d<=THROW.reach&&o.st==='guard'&&o.y<=0&&Math.random()<(BASE_CHARACTER[f.ch]==='R'?.4:.22))I.g=1;
    else if(threat&&(o.st==='punch'||o.st==='kick')&&canCrouch(f)&&Math.random()<Math.min(.3,.06+level*.05)){A.crouch=1;A.t=.3}
    else if(threat&&Math.random()<gp){A.down=1;A.t=.34}
    else if(f.meter>=100&&d>100&&d<({W:640,R:640,E:300,G:250,B:210,Qb:640,Wb:640,Eb:340,Rb:520,Rc:260,Qc:560,Wc:640,Ec:250,Rd:640}[f.ch]||420)&&Math.random()<.55){if(TAG[f.ch]&&!f.tagUsed&&Math.random()<.35)I.t=1;else I.s=1}
    else if(CMD[BASE_CHARACTER[f.ch]]&&(BASE_CHARACTER[f.ch]==='R'?d>240&&d<620:BASE_CHARACTER[f.ch]==='E'?d<170&&o.y>40:d<150)&&Math.random()<.1+level*.025)I.q=1;
    else if(d>155){A.mv=tw;if(Math.random()<.06)A.up=1;if(Math.random()<.16*(1-ag))A.mv=0}
    else if(canCrouch(f)&&Math.random()<Math.min(.26,.08+level*.04)){A.crouch=1;I.k=1;A.t=.2}
    else{const q=Math.random();if(q<ag*.42)I.p=1;else if(q<ag*.86)I.k=1;else if(q<ag*.86+.1){A.mv=-tw;A.t=.26}else if(q<ag*.86+.16){A.up=1;A.mv=tw}else{A.down=1;A.t=.22}} }
  I.l=A.mv<0?1:0;I.r=A.mv>0?1:0;I.down=A.crouch;I.gd=A.down;I.up=A.up;
  if(f.hitDone&&(f.st==='punch'||f.st==='kick'||f.st==='cpunch'||f.st==='ckick')&&Math.random()<dt*(.8+level*1.1)){
    for(const button of Math.random()<.5?['p','k']:['k','p']){const cand=chainNext(f,button,0);if(cand&&chainRoutes(f).some(r=>!r.hidden&&cand.every((s,i)=>r.seq[i]===s))){const next=cand[cand.length-1];I[button]=1;I.down=next[0]==='c'?1:0;break}}}
 if(A.up&&f.st==='jump'&&f.vy<0&&d<150&&!f.airAtk)I.k=1;
}
