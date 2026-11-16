;(function(){
const DT=T.DT,res=[];const ok=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' ['+x+']':''));
function setup(a,b,dist){T.boot(a,b);P.x=WW/2-dist/2;C.x=WW/2+dist/2;think=function(f){const J=f.inp;J.l=J.r=J.up=J.down=J.gd=J.p=J.k=J.s=J.t=J.g=J.q=0;if(C.script)C.script(J)}}
function step(n,fn){for(let i=0;i<n;i++){if(fn)fn(i);update(DT)}}
function motion(){ // 아래 → 앞 + 주먹
  held.down=1;step(4);held.down=0;held.r=1;step(2);buf.p=.1;step(1);held.r=0;buf.p=0}
// 1) 입력 인식 (15명)
for(const a of ORDER){setup(a,'Q',400);motion();const b=BASE_CHARACTER[a];ok('입력 '+a,(P.st==='cmd')===!!CMD[b],P.st)}
// 대각 입력
setup('W','Q',400);held.down=1;held.r=1;buf.p=.1;step(1);held.down=held.r=0;buf.p=0;ok('대각 입력 W',P.st==='cmd',P.st);
// 그냥 앞+주먹은 일반 주먹
setup('W','Q',400);held.r=1;step(30);buf.p=.1;step(1);ok('앞+주먹은 일반 주먹',P.st==='punch',P.st);
// 아래+주먹은 앉아 주먹
setup('W','Q',400);held.down=1;step(5);buf.p=.1;step(1);ok('아래+주먹은 앉아 주먹',P.st==='cpunch',P.st);held.down=0;
// 2) 명중·가드
for(const a of ['Q','W','E','Qb','Wc','Eb']){setup(a,'Q',110);const h0=C.hp;motion();step(60);ok('명중 '+a,C.hp<h0,(h0-C.hp).toFixed(1));
  setup(a,'Q',110);C.script=J=>J.gd=1;step(3);const h1=C.hp;motion();step(60);ok('가드 '+a,h1-C.hp<3&&h1-C.hp>0,(h1-C.hp).toFixed(2))}
// E 대공: 점프 중인 상대
setup('E','Q',120);C.script=J=>J.up=1;step(12);C.script=null;motion();const hE=C.hp;step(40);ok('E 올려치기 대공',C.hp<98,(98-C.hp).toFixed(1));
// W 내려치기: 앉은 상대도 맞고 넘어짐
setup('W','Q',110);C.script=J=>J.down=1;step(4);motion();let kd=0;step(40,()=>{if(C.st==='kd')kd=1});ok('W 내려치기 앉은 상대 다운',kd===1);
// Q 4타
setup('Q','E',105);motion();let hits=0,lh=C.hp;step(50,()=>{if(C.hp<lh-1e-9){hits++;lh=C.hp}});ok('Q 스틱 4타',hits===4,hits+'타 '+(103-C.hp).toFixed(1));
// 3) 메가폰
for(const a of ['R','Rb','Rc','Rd']){setup(a,'Q',500);const h0=C.hp;motion();let seen=0;step(90,()=>{if(proj.some(p=>p.kind==='mega'))seen=1});ok('메가폰 명중 '+a,seen&&C.hp<h0,(h0-C.hp).toFixed(1))}
setup('R','Q',500);motion();C.script=J=>J.gd=1;const hg=C.hp;step(90);ok('메가폰 가드',hg-C.hp>0&&hg-C.hp<2,(hg-C.hp).toFixed(2));
for(const d of ['E','Q','R']){let best=0;for(let delay=10;delay<50;delay+=2){setup('R',d,500);motion();const h=C.hp;step(delay);C.script=J=>J.up=1;step(3);C.script=null;step(90);if(C.hp===h)best++}ok('메가폰 점프 회피 '+d,best>=3,'회피 가능 타이밍 '+best+'/20')}
// 메가폰끼리 상쇄
setup('R','Rb',600);let q=1;C.script=J=>{if(q){J.q=1;q=0}};motion();const hp0=P.hp,hc0=C.hp;step(120);ok('메가폰 상쇄',P.hp===hp0&&C.hp===hc0&&!proj.length,P.hp+'/'+C.hp);
// 화면에 1발만
setup('R','Q',900);motion();step(30);motion();ok('메가폰 화면에 1발',proj.filter(p=>p.kind==='mega').length===1&&P.st!=='cmd',P.st);
// 4) 보호 규칙
setup('Q','W',100);buf.p=.1;step(1);buf.p=0;let inv=0;step(60,()=>{if(C.inv>0&&C.st==='idle')inv=1});ok('경직 뒤 무적',inv===1);
setup('Q','W',100);buf.p=.1;step(1);buf.p=0;let lost=0;C.script=J=>{if(C.st==='idle'&&C.inv>0)J.p=1};step(60,()=>{if(C.st==='punch'&&!(C.inv>0))lost=1});ok('공격하면 무적 해제',lost===1);
// 탈출: 무방비 상대에게 계속 연계
setup('Wc','Q',110);let esc=0,maxRun=0,run=0,lh2=C.hp;const route=chainRoutes(P)[0].seq;
step(60*12,()=>{if(phase!=='fight')return;const d=C.x-P.x;held.l=held.r=0;if(Math.abs(d)>100)held.r=d>0?1:0,held.l=d<0?1:0;const atk=['punch','kick'].includes(P.st),idx=atk&&P.cs?P.cs.split('>').length:0;buf.p=buf.k=0;if(Math.abs(d)<150)buf[(route[idx]||route[0])[0]==='p'?'p':'k']=.1;
  if(C.brk===0&&C.st==='kd'&&C.inv>1.2)esc++});
ok('탈출 발동',fx.length>=0&&esc>0,esc);
// 5) CPU 대전 전 조합 일부
let errs=0,cm=0,n=0;delete C.script;
for(const a of ORDER)for(const b of ['Q','W','E','R','Qc','Rc']){T.boot(a,b,4);think=T.think0;P.cpu=true;const realP=P;
  try{for(let i=0;i<60*70&&phase==='fight';i++){think(P,C,DT);const s=Object.assign({},P.inp);update(DT);if(P.st==='cmd'||C.st==='cmd')cm++}n++}catch(e){errs++;console.log(a,b,e.message)}}
ok('CPU 대전 '+n+'판 오류 없음',errs===0,'커맨드 사용 프레임 '+cm);
console.log(res.join('\n'));console.log(res.filter(r=>r.startsWith('FAIL')).length+' fail / '+res.length)})();
