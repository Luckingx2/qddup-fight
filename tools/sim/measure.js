;(function(){
const DT=T.DT,FREE=['idle','walk','guard','crouch'];
function run(att,def,dmode,useSp){
  T.boot(att,def);P.x=WW/2-60;C.x=WW/2+60;if(useSp)P.meter=100;
  const route=chainRoutes(P)[0].seq;let firstHit=-1,escT=-1,escDmg=0,maxCombo=0,cur=0,lastHp=C.hp,t=0,recatch=0,wasFree=true,blocks=0,koT=-1,lastC=C.st;
  think=function(f,o){const J=f.inp;J.l=J.r=J.up=J.down=J.gd=J.p=J.k=J.s=J.t=J.g=0;
    if(dmode==='guard'||(dmode==='late'&&firstHit>=0))J.gd=1;
    if(dmode==='mash'&&firstHit>=0)J.p=1};
  for(let i=0;i<60*40&&phase==='fight';i++){t=i*DT;
    const d=C.x-P.x;held.l=held.r=0;if(Math.abs(d)>100){if(d>0)held.r=1;else held.l=1}
    const atk=['punch','kick','cpunch','ckick'].includes(P.st),idx=atk&&P.cs?P.cs.split('>').length:0,b=(route[idx]||route[0])[0]==='p'?'p':'k';
    buf.p=buf.k=0;if(Math.abs(d)<150)buf[b]=.1;buf.s=useSp&&P.meter>=100?.1:0;
    update(DT);
    const free=FREE.includes(C.st);
    if(C.hp<lastHp-1e-9){const dm=lastHp-C.hp;const blocked=C.st==='guard';
      if(!blocked){if(firstHit<0)firstHit=t;if(wasFree&&firstHit>=0&&t>firstHit)recatch++;cur+=dm;maxCombo=Math.max(maxCombo,cur);if(escT<0)escDmg+=dm}
      else{blocks++;if(firstHit>=0&&escT<0)escT=t-firstHit}}
    if(free&&C.st!==lastC&&!FREE.includes(lastC)){} 
    if(free)cur=0;wasFree=free;lastHp=C.hp;lastC=C.st}
  if(phase!=='fight')koT=t-(firstHit<0?0:firstHit);
  return{koT,maxCombo,escT,escDmg,recatch,blocks,hpLeft:C.hp,max:CH[def].hp}}
const out=[];
for(const a of ORDER){const d=run(a,'Q','dummy',0),l=run(a,'Q','late',0),m=run(a,'Q','mash',0),s=run(a,'Q','late',1);
  out.push([a,CH[a].name,CH[a].timing,d.koT.toFixed(1),(d.maxCombo/98*100).toFixed(0)+'%',d.recatch,l.koT<0?'생존':l.koT.toFixed(1),(l.escDmg/98*100).toFixed(0)+'%',l.escT<0?'-':l.escT.toFixed(1),m.koT<0?'생존':m.koT.toFixed(1),(s.escDmg/98*100).toFixed(0)+'%'].join('\t'))}
console.log('id\t이름\t속도\t무방비KO초\t최대콤보\t재피격\t늦은가드KO\t가드전피해\t가드까지초\t연타대응KO\t필살포함가드전피해');console.log(out.join('\n'));
})();
