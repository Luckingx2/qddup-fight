;(function(){
// CPU 대 CPU로 돌려 라운드당 필살기·태그 사용 횟수와 피해 비중을 잰다
const DT=T.DT;let rounds=0,use=[0,0,0,0,0],spDmg=0,allDmg=0,tag=0,maxSp=0,ko=0,dur=0,spKills=0;
const _apply=applyHit;applyHit=function(f,o,a){const h=o.hp;_apply(f,o,a);const d=h-o.hp;if(d>0){allDmg+=d;if(a.sp){spDmg+=d;if(o.hp<=0)spKills++}}};
const _cut=startCut;startCut=function(f){f.spUse=(f.spUse||0)+1;if(f.sv===2)tag++;_cut(f)};
for(let rep=0;rep<3;rep++)for(const a of ORDER)for(const b of ORDER){if(a===b)continue;
  T.boot(a,b,3);think=T.think0;P.cpu=true;P.spUse=C.spUse=0;
  let i=0;for(;i<60*62&&phase==='fight';i++){think(P,C,DT);const s=P.inp,h={l:s.l,r:s.r,up:s.up,down:s.down};held.l=h.l;held.r=h.r;held.up=h.up;held.down=h.down;buf.p=s.p?.05:0;buf.k=s.k?.05:0;buf.s=s.s?.05:0;buf.t=s.t?.05:0;buf.g=s.g?.05:0;P.inp.gd=s.gd;update(DT)}
  rounds++;dur+=i/60;if(phase==='ko')ko++;
  for(const f of[P,C]){const n=Math.min(4,f.spUse||0);use[n]++;maxSp=Math.max(maxSp,f.spUse||0)}}
const tot=use.reduce((x,y)=>x+y,0);
console.log('라운드',rounds,'평균 길이(초)',(dur/rounds).toFixed(1),'KO로 끝남',(ko/rounds*100).toFixed(0)+'%');
console.log('한 라운드에 한 명이 쓴 필살기+태그 횟수 분포 0/1/2/3/4+:',use.map(n=>(n/tot*100).toFixed(0)+'%').join(' / '),'최대',maxSp);
console.log('전체 피해 중 필살기·태그 비중',(spDmg/allDmg*100).toFixed(0)+'%','필살기로 끝난 KO',(spKills/Math.max(1,ko)*100).toFixed(0)+'%');
})();
