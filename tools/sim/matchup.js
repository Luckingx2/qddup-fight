// CPU 대 CPU 자동 대전으로 캐릭터 상성(라운드 승률)을 잰다: node tools/sim/sim.js . tools/sim/base.js tools/sim/matchup.js
;(function(){
const DT=T.DT,N=+(process.env.N||30),LV=+(process.env.LV||4),res={};
function round(a,b){
  T.boot(a,b,LV);P.cpu=true;P.buf=null;
  let n=0;
  while(phase==='fight'&&n++<60*70){
    think(P,C,DT);const I=P.inp;held.l=I.l;held.r=I.r;held.up=I.up;held.down=I.down;
    buf.p=I.p?.05:0;buf.k=I.k?.05:0;buf.s=I.s?.05:0;buf.t=I.t?.05:0;buf.g=I.g?.05:0;
    update(DT)}
  const pa=P.hp/CH[a].hp,pb=C.hp/CH[b].hp;return pa===pb?.5:pa>pb?1:0}
for(const a of ORDER){res[a]={};for(const b of ORDER){let w=0;for(let i=0;i<N;i++)w+=round(a,b);res[a][b]=w/N}}
// 좌우 자리 편향 제거: a가 왼쪽일 때와 오른쪽일 때 평균
const out={};for(const a of ORDER){out[a]={};for(const b of ORDER)out[a][b]=+((res[a][b]+(1-res[b][a]))/2).toFixed(3)}
const side=ORDER.reduce((s,a)=>s+res[a][a],0)/ORDER.length;
console.log(JSON.stringify({N,LV,leftSideWin:+side.toFixed(3),order:ORDER,win:out}));
})();
