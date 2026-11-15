/* 온라인 대전 (PeerJS 방 만들기/참가) */
'use strict';
/* ---------- online ---------- */
let net=null;const rh={l:0,r:0,up:0,down:0},rbuf={p:0,k:0,s:0,t:0,g:0},NQ=new URLSearchParams(location.search);
const ONLINE_PAUSE_MS=3500, ONLINE_DROP_MS=45000, ONLINE_BUFFER_LIMIT=64*1024;
const ME=()=>net&&!net.host?C:P;
for(const k in sfx){const o=sfx[k];sfx[k]=(...a)=>{if(net&&net.host&&mode==='fight'&&net.ev.length<40)net.ev.push([k,...a]);return o(...a)}}
function netBox(h){if(!h){$('sNet').classList.remove('show');return}$('netBox').innerHTML=h;$('sNet').classList.add('show');const x=$('nX');if(x)x.onclick=()=>{netLeave();netBox()}}
function netSend(m){
  const conn=net?.conn;
  if(!conn?.open)return false;
  try{conn.send(m);return conn.open}catch(e){return false}
}
function reconnectSignaling(state){
  const now=performance.now();
  if(!state.pr?.disconnected||state.pr.destroyed||now-(state.lastSignalRetry??-5000)<5000)return;
  state.lastSignalRetry=now;
  try{state.pr.reconnect()}catch(e){}
}
function clearRemoteInput(){
  for(const key in rh)rh[key]=0;
  for(const key in rbuf)rbuf[key]=0;
}
function netPaused(state=net,now=performance.now()){
  if(!state?.ok||mode!=='fight')return false;
  return !!(document.hidden||state.remoteHidden||state.remoteStalled||now-(state.last??now)>ONLINE_PAUSE_MS||(!state.host&&now-(state.lastSnapshot??now)>ONLINE_PAUSE_MS)||
    state.conn?.peerConnection?.iceConnectionState==='disconnected');
}
function updateNetNotice(paused){
  const notice=$('netNotice');
  if(notice)notice.hidden=!paused;
}
function netHeartbeat(now=performance.now()){
  if(!net?.ok)return;
  const state=net;
  reconnectSignaling(state);
  if(document.hidden)return;
  const snapshotStale=!state.host&&mode==='fight'&&now-(state.lastSnapshot??now)>ONLINE_PAUSE_MS;
  netSend({t:'p',hidden:false,stalled:snapshotStale});
  const stateTime=!state.host&&mode==='fight'?Math.min(state.last??now,state.lastSnapshot??now):state.last??now;
  if(now-Math.max(stateTime,state.resumedAt??0)>ONLINE_DROP_MS)netDrop('timeout');
}

let peerScript;
function loadPeer(cb, fail=()=>netErr('온라인 모듈을 불러오지 못했습니다.')){
  if(window.Peer)return cb();
  if(!peerScript)peerScript=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='assets/lib/peerjs.min.js';
    script.onload=resolve;
    script.onerror=()=>{peerScript=null;script.remove();reject()};
    document.head.appendChild(script);
  });
  peerScript.then(cb,fail);
}
function mkPeer(id){const o={debug:0},ps=NQ.get('ps');if(ps){const q=ps.split(':');o.host=q[0];o.port=+q[1];o.path='/';o.secure=false}return id?new Peer(id,o):new Peer(o)}
function netErr(t){netClose();netUI();netBox('<h3>온라인 대전</h3><p>'+t+'</p><button class="btn ghost" id="nX">확인</button>')}
function netPErr(e){const t=e&&e.type;if(net?.ok&&net.conn?.open){if(t==='network'||t==='disconnected')reconnectSignaling(net);return}netErr(t==='peer-unavailable'?'그 코드의 방을 찾지 못했습니다. 코드를 다시 확인하세요.':t==='unavailable-id'?'방 코드가 겹쳤습니다. 다시 만들어 주세요.':'연결하지 못했습니다. 이 환경에서 외부 접속이 막혀 있거나 네트워크가 불안정합니다. ('+(t||'error')+')')}
function netHost(){netBox('<h3>방 만드는 중…</h3>');loadPeer(()=>{const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let code='';for(let i=0;i<6;i++)code+=a[Math.floor(Math.random()*a.length)];
  let pr;try{pr=mkPeer('qddup-v5-'+code)}catch(e){return netErr('연결하지 못했습니다.')}net={host:true,pr,code,conn:null,ev:[],acc:0,cn:0,pk:null,rpk:null,ok:false};
  pr.on('open',()=>{if(!net||net.ok)return;netBox('<h3>방 코드</h3><div class="code">'+code+'</div><p>상대에게 이 코드를 보내세요.<br>상대가 들어오면 자동으로 넘어갑니다.</p><button class="btn ghost" id="nCopy">초대 링크 복사</button><button class="btn ghost" id="nX">취소</button>');
    $('nCopy').onclick=()=>{const u=location.origin+location.pathname+'?room='+code;try{navigator.clipboard.writeText(u).then(()=>{$('nCopy').textContent='복사했습니다'},()=>{prompt('초대 링크',u)})}catch(e){prompt('초대 링크',u)}}});
  pr.on('connection',c=>{if(!net||net.conn){try{c.close()}catch(e){}return}netConn(c)});pr.on('error',netPErr)})}
function netJoinUI(prefill){
  netBox('<form id="joinForm" class="joinForm"><h3>방 참가</h3><label for="nIn">6자리 방 코드</label><input id="nIn" type="text" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" required><button class="btn" id="nGo">참가</button><button class="btn ghost" type="button" id="nX">취소</button></form>');
  const input=$('nIn');
  input.value=prefill || '';
  input.oninput=()=>{
    input.value=input.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
    input.setCustomValidity('');
  };
  $('joinForm').onsubmit=event=>{
    event.preventDefault();
    const code=input.value.trim().toUpperCase();
    if(!/^[A-Z2-9]{6}$/.test(code)){
      input.setCustomValidity('6자리 방 코드를 입력해 주세요.');
      input.reportValidity();
      return;
    }
    initAudio();unlockVids();netJoin(code);
  };
  input.focus();
}
function netJoin(code){netBox('<h3>접속 중…</h3><button class="btn ghost" id="nX">취소</button>');loadPeer(()=>{let pr;try{pr=mkPeer()}catch(e){return netErr('연결하지 못했습니다.')}net={host:false,pr,code,conn:null,ev:[],cn:0,pk:null,rpk:null,ok:false,lh:'',it:0};
  pr.on('open',()=>{if(!net)return;netConn(pr.connect('qddup-v5-'+code,{reliable:true,serialization:'json'}));setTimeout(()=>{if(net&&net.pr===pr&&!net.ok)netErr('시간 안에 연결되지 않았습니다. 코드를 확인하거나 다른 네트워크에서 시도하세요.')},15000)});pr.on('error',netPErr)})}
function netConn(c){
  net.conn=c;
  const n=net, active=()=>net===n&&n.conn===c;
  c.on('open',()=>{if(!active())return;n.ok=true;n.last=performance.now();
    if(!n.match)netSend({t:'name',name:playerName});
    netBox();selectBackScreen=n.match?'sBattle':'sPrivate';toSelect();netLobby()});
  c.on('data',message=>{if(active())netRecv(message)});
  c.on('iceStateChanged',ice=>{
    if(!active()||!n.ok)return;
    if(ice==='disconnected')clearRemoteInput();
    if(ice==='connected'||ice==='completed')netHeartbeat();
  });
  const disconnect=()=>{if(active()&&(!n.match||n.ok))netDrop('channel')};
  c.on('close',disconnect);
  c.on('error',()=>{if(!c.open)disconnect()});
}
function netUI(){if(!net?.ok){$('go').disabled=!pick;$('go').textContent='READY!'}}
function netLobby(){
  if(net.my&&!pick)pick=net.my;
  syncCharacterPicker();
  $('go').disabled=!pick||!!net.pk;
  $('go').textContent=net.pk?'상대를 기다리는 중':'READY!';
  $('best').textContent=net.match?((net.match.kind==='ranked'?'랭킹전':'빠른 대전')+' · '+net.match.opponent+(net.rpk?' 준비 완료':'')):'온라인 대전 · 방 '+net.code+(net.rpk?' · 상대 준비 완료':' · 상대 연결됨');
}
function netTry(){if(!net||!net.host||!canPickCharacter(net.pk)||!canPickCharacter(net.rpk)||mode!=='menu'||!$('sSel').classList.contains('show'))return;const si=window.__stg!==undefined?window.__stg:Math.floor(Math.random()*STAGES.length),m={t:'start',p:net.pk,c:net.rpk,stg:si};netSend(m);netBegin(m)}
function netBegin(m){net.my=net.host?m.p:m.c;net.acc=0;net.last=net.lastSnapshot=performance.now();net.pk=net.rpk=null;net.ev=[];net.cn=0;net.snap=null;clearRemoteInput();const sk=streak;streak=0;pick=m.p;opp=m.c;stage=STAGES[m.stg];rtm.forEach(clearTimeout);rtm=[];startMatch();streak=sk;level=0;C.cpu=false;if(net.host)C.buf=rbuf;pick=net.my}
function netRecv(m){if(!net)return;if(typeof m==='string'){try{m=JSON.parse(m)}catch(e){return}}if(!m||typeof m!=='object')return;net.last=performance.now();
  if(m.t==='p'){net.remoteHidden=m.hidden===true;net.remoteStalled=m.stalled===true;if(net.remoteHidden||net.remoteStalled)clearRemoteInput()}
  else if(m.t==='s'){if(!net.host&&mode==='fight'){net.lastSnapshot=net.last;net.snap=m}}
  else if(m.t==='i'){if(net.host&&!netPaused()&&Array.isArray(m.h)&&m.h.length===4){[rh.l,rh.r,rh.up,rh.down]=m.h.map(v=>v===1?1:0);if(typeof m.p==='string')for(const k of m.p.slice(0,5))if('pkstg'.includes(k))rbuf[k]=.16}}
  else if(m.t==='name'&&!net.match){net.remoteName=validNickname(m.name)||net.remoteName}
  else if(m.t==='pick'&&canPickCharacter(m.c)){net.rpk=m.c;if(mode==='menu'&&$('sSel').classList.contains('show'))netLobby();netTry()}
  else if(m.t==='start'){if(!net.host&&canPickCharacter(m.p)&&canPickCharacter(m.c)&&Number.isInteger(m.stg)&&STAGES[m.stg]){initAudio();netBegin(m)}}
  else if(m.t==='bye'){netDrop('left')}
  else if(m.t==='res'){if(!net.host&&mode==='fight'&&typeof m.w==='boolean'){if(net.snap){netApply(net.snap);net.snap=null}if(net.match?.kind==='ranked'&&!((phase==='ko'||phase==='time')&&(P.wins>=2||C.wins>=2)&&m.w===(P.wins>C.wins)))return;if(cut)endCut();result(!m.w)}}}
function netClose(){const n=net;net=null;if(!n)return;if(n.match)releaseQueue(n.match.id);try{if(n.conn)n.conn.close()}catch(e){}try{n.pr.destroy()}catch(e){}if(cut)endCut();updateNetNotice(false);netUI()}
function netLeave(){netClose();$('best').textContent=best?('최고 연승 '+best):'상대와 스테이지는 주사위로 정해집니다'}
function netDrop(reason='channel'){
  if(!net)return;
  const showingResult=$('sRes').classList.contains('show');
  const ranked=net.match?.kind==='ranked';
  const message=reason==='timeout'?'45초 동안 대전 데이터가 복구되지 않았습니다.':reason==='left'?'상대가 게임에서 나갔습니다.':'대전 연결이 종료됐습니다.';
  netClose();
  if(showingResult)return;
  mode='menu';show(selectBackScreen);
  netBox('<h3>연결 끊김</h3><p>'+message+(ranked?' 이 중단으로 랭킹 점수는 차감되지 않습니다.':'')+'</p><button class="btn ghost" id="nX">확인</button>');
}
function netSnap(final=false){
  const buffered=net.conn?.dataChannel?.bufferedAmount??0;
  if(!final&&buffered>ONLINE_BUFFER_LIMIT)return false;
  const F=f=>{const o={};for(const k in f){const v=f[k];if(v===null||typeof v==='number'||typeof v==='string'||typeof v==='boolean')o[k]=v}o.assist=f.assist||null;o.trail=f.trail;return o},W=o=>o===P?0:1;
  const m={t:'s',P:F(P),C:F(C),ph:phase,pt,rd:round,tm:timer,cam:camX,sh:shake,hs:hitstop,sl:slow,fl:flash,msg,cb:[combo.n,combo.t,combo.who?W(combo.who):-1],pj:proj.map(p=>Object.assign({},p,{o:W(p.o)})),fx:fx.length>64?fx.slice(-64):fx,
    zn:zone&&Object.assign({},zone,{o:W(zone.o)}),fd:flood&&Object.assign({},flood,{o:W(flood.o)}),fz:freeze&&{t:freeze.t,f:W(freeze.f)},cu:cut?W(cut.f):-1,ct:cut?cut.v.currentTime:0,cn:net.cn,ev:net.ev};
  const sent=netSend(JSON.stringify(m,(k,v)=>typeof v==='number'?Math.round(v*100)/100:v));
  if(sent)net.ev=[];
  return sent;
}
function netApply(m){const A=(f,o)=>{for(const k in o)f[k]=o[k]},R=i=>i?C:P;A(P,m.P);A(C,m.C);phase=m.ph;pt=m.pt;round=m.rd;timer=m.tm;camX=m.cam;shake=m.sh;hitstop=m.hs;slow=m.sl;flash=m.fl;msg=m.msg;combo.n=m.cb[0];combo.t=m.cb[1];combo.who=m.cb[2]<0?null:R(m.cb[2]);
  proj=m.pj;for(const p of proj)p.o=R(p.o);fx=m.fx;zone=m.zn||null;if(zone)zone.o=R(zone.o);flood=m.fd||null;if(flood)flood.o=R(flood.o);freeze=m.fz?{t:m.fz.t,f:R(m.fz.f)}:null;
  for(const e of m.ev)if(sfx[e[0]])try{sfx[e[0]].apply(null,e.slice(1))}catch(_){}
  if(m.cn!==net.cn){
    net.cn=m.cn;
    if(cut)endCut();
    if(m.cu>=0){
      startCut(R(m.cu));
      if(cut&&Number.isFinite(m.ct)&&m.ct>0){
        try{cut.v.currentTime=m.ct}catch(_){}
      }
    }
  }else if(m.cu<0&&cut)endCut()
}
function netGuest(dt){if(net.snap){netApply(net.snap);net.snap=null}
  if(cut){cut.t+=dt;$('cutT').classList.toggle('on',cut.vk==='G'&&cut.v.currentTime>3.0&&cut.v.currentTime<4.7);if(cut.t>cut.max)endCut()}
  else if(!(hitstop>0)&&!freeze&&P){const k=slow>0?.28:1;for(const f of[P,C]){f.t+=dt*k;f.x+=f.vx*dt*k;if(f.y>0||f.vy>0){f.vy-=G*dt*k;f.y=Math.max(0,f.y+f.vy*dt*k)}}for(const p of proj){p.t+=dt*k;p.x+=p.vx*dt*k;p.vy-=p.g*dt*k;p.y-=p.vy*dt*k}pt+=dt}
  let pr='';for(const k of 'pkstg')if(buf[k]>0){pr+=k;buf[k]=0}const h=''+held.l+held.r+held.up+held.down;net.it+=dt;
  if(pr||h!==net.lh||net.it>.2){net.lh=h;net.it=0;netSend({t:'i',h:[held.l,held.r,held.up,held.down],p:pr})}}
setInterval(netHeartbeat,1000);
document.addEventListener('visibilitychange',()=>{
  if(!net?.ok)return;
  clearRemoteInput();
  if(document.hidden)netSend({t:'p',hidden:true});
  else{net.resumedAt=performance.now();netHeartbeat()}
});
addEventListener('pagehide',event=>{if(!event.persisted)netSend({t:'bye'})});
function validNickname(value){
  if(typeof value!=='string'||value.length>64)return '';
  const name=value.normalize('NFKC').trim();
  return /^[\p{L}\p{N}_ -]{2,16}$/u.test(name)?name:'';
}
$('titleForm').onsubmit=event=>{
  event.preventDefault();
  const input=$('nick'), name=validNickname(input.value);
  if(!name){
    input.setCustomValidity('한글, 영문, 숫자, 공백, _ 또는 -를 사용해 2~16자로 입력해 주세요.');
    input.reportValidity();
    return;
  }
  playerName=name;
  try{localStorage.setItem('qddup_nickname',name)}catch(e){}
  initAudio();unlockVids();sfx.sel();playBgm('menu');show('sHome');
  const room=NQ.get('room');
  if(room&&/^[A-Z2-9]{6}$/i.test(room)){show('sPrivate');netJoinUI(room.toUpperCase())}
};
$('nick').oninput=()=> $('nick').setCustomValidity('');
$('nHost').onclick=()=>{initAudio();unlockVids();netHost()};$('nJoin').onclick=()=>{initAudio();netJoinUI()};


