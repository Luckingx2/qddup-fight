;(function(){
const DT=1/60;
// 필수 전역 준비
sfx=new Proxy({}, {get:()=>()=>{}});
startCut=function(f){f.t=0;f.cutDone=1};  // 영상 생략: 바로 기 모으기
function boot(a,b,cpu){net=null;practice=false;cut=null;streak=0;level=cpu||0;pick=a;opp=b;stage={id:'x',name:'x'};buf={p:0,k:0,s:0,t:0,g:0};rbuf={p:0,k:0,s:0,t:0,g:0};held={l:0,r:0,up:0,down:0};rh={l:0,r:0,up:0,down:0};
  P=mkF(a,WW/2-190,1,false);C=mkF(b,WW/2+190,-1,true);P.buf=buf;round=1;mode='fight';startRound();phase='fight';pt=2;timer=60}
globalThis.T={DT,boot,think0:think};
})();
