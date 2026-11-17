// CPU 대 CPU 자동 대전으로 캐릭터 상성(라운드 승률)을 잰다: node tools/sim/sim.js . tools/sim/base.js tools/sim/matchup.js
// 환경 변수: N(자리당 라운드 수), LV(난이도), ROWS(잴 캐릭터 목록, 쉼표), TUNE(능력치 덮어쓰기 JSON 파일), UNIT(COMBO.unit 덮어쓰기)
;(function(){
const fs=process.mainModule?process.mainModule.require('fs'):require('fs');
const DT=T.DT,N=+(process.env.N||30),LV=+(process.env.LV||4),res={};
if(process.env.TUNE){const t=JSON.parse(fs.readFileSync(process.env.TUNE,'utf8'));for(const k in t)Object.assign(CH[k],t[k])}

const rows=process.env.ROWS?process.env.ROWS.split(','):ORDER;
function round(a,b){
  T.boot(a,b,LV);P.cpu=true;P.buf=null;
  let n=0;
  while(phase==='fight'&&n++<60*70){
    think(P,C,DT);const I=P.inp;held.l=I.l;held.r=I.r;held.up=I.up;held.down=I.down;
    buf.p=I.p?.05:0;buf.k=I.k?.05:0;buf.s=I.s?.05:0;buf.t=I.t?.05:0;buf.g=I.g?.05:0;
    update(DT)}
  const pa=P.hp/CH[a].hp,pb=C.hp/CH[b].hp;return pa===pb?.5:pa>pb?1:0}
// 왼쪽 자리 a, 오른쪽 자리 b의 a 승률
for(const a of rows){res[a]={};for(const b of ORDER){let w=0;for(let i=0;i<N;i++)w+=round(a,b);res[a][b]=w/N}}
console.log(JSON.stringify({N,LV,order:ORDER,left:res}));
})();
