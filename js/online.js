'use strict';
/* ---------- online ---------- */
let net=null,dropResult=false;const rh={l:0,r:0,up:0,down:0},rbuf={p:0,k:0,s:0,t:0,g:0},NQ=new URLSearchParams(location.search);
// 방장 입력 지연: 상대는 입력이 왕복 통신만큼 늦게 반영되므로, 방장 자신의 입력도 같은 만큼(최대 0.15초) 늦춰 적용한다
const hh={l:0,r:0,up:0,down:0},hbuf={p:0,k:0,s:0,t:0,g:0},HOST_DELAY_MAX=.15;let hq=[];
function hostDelay(){return net&&net.host&&net.ok&&net.rtt>0?Math.min(HOST_DELAY_MAX,net.rtt):0}
function hostInputReset(){hq=[];hh.l=hh.r=hh.up=hh.down=0;hbuf.p=hbuf.k=hbuf.s=hbuf.t=hbuf.g=0;if(net)net.hl=''}
function hostInput(){
  const now=performance.now()/1000,D=hostDelay();
  if(now-(net.pgT||0)>1){net.pgT=now;netSend({t:'pg',n:now})}
  let pr='';for(const k of 'pkstg')if(buf[k]>0){pr+=k;buf[k]=0}
  const h=''+held.l+held.r+held.up+held.down;
  if(pr||h!==net.hl){net.hl=h;hq.push([now+D,held.l,held.r,held.up,held.down,pr])}
  while(hq.length&&hq[0][0]<=now){const e=hq.shift();hh.l=e[1];hh.r=e[2];hh.up=e[3];hh.down=e[4];for(const k of e[5])hbuf[k]=k==='s'||k==='t'?.7:.16}
}
const ME=()=>net&&!net.host?C:P;
const IS_PC=matchMedia('(hover:hover) and (pointer:fine)').matches;
for(const k in sfx){const o=sfx[k];sfx[k]=(...a)=>{if(net&&net.host&&mode==='fight'&&net.ev.length<40)net.ev.push([k,...a]);return o(...a)}}
function netBox(h){if(h)$('vload').classList.remove('on');if(!h){$('sNet').classList.remove('show');syncBack();return}$('netBox').innerHTML=h;$('sNet').classList.add('show');const x=$('nX');if(x)x.onclick=()=>{netLeave();netBox()};syncBack()}
function netSend(m){try{if(net&&net.conn&&net.conn.open)net.conn.send(m)}catch(e){}}
let peerScript;
let iceCache=null,rtApi=null,rtAt=0;
async function realtimeApi(){
  if(rtApi&&Date.now()-rtAt<60000)return rtApi;
  const korea=(document.querySelector('meta[name="realtime-api"]')?.content||'').replace(/\/$/,'');
  rtApi=ONLINE_API;
  if(korea){
    try{
      const ac=new AbortController();setTimeout(()=>ac.abort(),2500);
      const r=await fetch(korea+'/health',{cache:'no-store',signal:ac.signal});
      if(r.ok)rtApi=korea;
    }catch(e){}
  }
  rtAt=Date.now();
  return rtApi;
}
const BUILD=document.querySelector('meta[name="build"]')?.content||'';
async function checkBuild(){
  try{
    const latest=await fetch(ONLINE_API+'/build',{cache:'no-store'}).then(r=>r.ok?r.text():'');
    if(latest&&BUILD&&latest>BUILD){
      netBox('<h3>새 버전이 있어요</h3><p>상대와 같은 버전이어야 대전할 수 있어요.<br>새로고침한 뒤 다시 시도해 주세요.</p><button class="btn" id="nReload">새로고침</button><button class="btn ghost" id="nX">닫기</button>');
      $('nReload').onclick=()=>{const u=new URL(location.href);u.searchParams.set('b',latest);fetch(location.pathname,{cache:'reload'}).catch(()=>{}).finally(()=>location.replace(u.href))};
      return false;
    }
  }catch(e){}
  return true;
}
async function collectDiag(stage,extra){
  const n=net,d={stage,build:BUILD,rt:rtApi===ONLINE_API?'cloudflare':'korea',pc:IS_PC,ua:navigator.userAgent.slice(0,140),net:navigator.connection?.effectiveType||'',relay:iceCache?.relay||'none',ice:(iceCache?.servers||[]).length,diag:n?.diag||null,role:n?{host:n.host,lead:n.lead,match:!!n.match,ok:!!n.ok,sigOpen:!!n.pr?.open}:null,...extra};
  try{
    const pc=n?.conn?.peerConnection;
    if(pc){
      d.pcState=[pc.connectionState,pc.iceConnectionState,pc.iceGatheringState,pc.signalingState];
      const local=[],remote=[],pairs=[];
      (await pc.getStats()).forEach(r=>{
        if(r.type==='local-candidate')local.push(r.candidateType+'/'+r.protocol);
        else if(r.type==='remote-candidate')remote.push(r.candidateType+'/'+r.protocol);
        else if(r.type==='candidate-pair')pairs.push(r.state);
      });
      Object.assign(d,{local,remote,pairs});
    }else d.pcState='no-connection';
  }catch(e){d.statsErr=String(e).slice(0,100)}
  try{await fetch(ONLINE_API+'/diag',{method:'POST',headers:{'Content-Type':'application/json',...(playerToken?{Authorization:'Bearer '+playerToken}:{})},body:JSON.stringify(d).slice(0,7900),keepalive:true})}catch(e){}
}
function netProgress(pct,label){
  if(!$('sNet').classList.contains('show'))return;
  const box=$('netBox');
  let g=box.querySelector('.netGauge');
  if(!g){
    g=document.createElement('div');g.className='netGauge';
    g.innerHTML='<div class="gauge"><i></i></div><div class="gaugePct"></div>';
    const btn=box.querySelector('#nX');
    btn?box.insertBefore(g,btn):box.appendChild(g);
  }
  g.querySelector('.gauge i').style.width=pct+'%';
  g.querySelector('.gaugePct').textContent=pct+'%';
  if(label){const p=box.querySelector('p');if(p)p.textContent=label}
}
function diagText(){
  const d=net?.diag||{};
  const parts=[];
  parts.push((rtApi&&rtApi!==ONLINE_API?'한국 ':'')+'중개 '+(d.signal||'대기'));
  parts.push('중계 '+(d.relay||'확인 전'));
  if(d.ice)parts.push('연결 '+d.ice);
  return '('+parts.join(' · ')+')';
}
async function getIce(){
  if(iceCache&&iceCache.until>Date.now())return iceCache.servers;
  try{
    const reply=await onlineApi('/turn');
    iceCache={servers:reply.iceServers,relay:reply.relay,until:Date.now()+(reply.ttl||3600)*800};
    return iceCache.servers;
  }catch(e){return null}
}
function loadPeerScript(){
  if(!peerScript&&window.Peer)peerScript=Promise.resolve();
  if(!peerScript)peerScript=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const timer=setTimeout(()=>{script.onload=script.onerror=null;script.remove();peerScript=null;reject(new Error('module_timeout'))},12000);
    script.src=av('assets/lib/peerjs.min.js');
    script.onload=()=>{clearTimeout(timer);resolve()};
    script.onerror=()=>{clearTimeout(timer);peerScript=null;script.remove();reject(new Error('module_error'))};
    document.head.appendChild(script);
  });
  return peerScript;
}
function loadPeer(cb, fail=()=>netErr('온라인 모듈을 불러오지 못했습니다.')){
  loadPeerScript().then(()=>Promise.all([realtimeApi(),Promise.race([getIce(),new Promise(r=>setTimeout(r,8000))])])).then(()=>cb(),fail);
}
function mkPeer(id){const o={debug:0},ps=NQ.get('ps');if(ps){const q=ps.split(':');o.host=q[0];o.port=+q[1];o.path='/';o.secure=false}else{const u=new URL((rtApi||ONLINE_API)+'/',location.href);o.host=u.hostname;o.port=+(u.port||(u.protocol==='https:'?443:80));o.path=u.pathname;o.secure=u.protocol==='https:';o.key='peerjs'}if(iceCache?.servers)o.config={iceServers:iceCache.servers};const pr=id?new Peer(id,o):new Peer(o);pr.on('error',e=>{if(net&&net.pr===pr){net.diag=net.diag||{};(net.diag.errs=net.diag.errs||[]).push(e.type);if(net.diag.errs.length>12)net.diag.errs.shift()}});pr.on('open',()=>{if(net&&net.pr===pr){net.diag=net.diag||{};net.diag.signal='연결됨';net.diag.relay=iceCache?.relay==='cloudflare'?'Cloudflare':iceCache?'예비 서버':'없음'}});pr.on('disconnected',()=>setTimeout(()=>{try{if(!pr.destroyed&&pr.disconnected)pr.reconnect()}catch(e){}},1000));return pr}
async function netErr(t){const dg=diagText();if(net)await Promise.race([collectDiag('room:'+t.slice(0,40)),new Promise(r=>setTimeout(r,1500))]);netClose();netUI();netBox('<h3>온라인 대전</h3><p>'+t+'<br><small>'+dg+'</small></p><button class="btn ghost" id="nX">확인</button>')}
function netPErr(e){const t=e&&e.type;if(net&&net.ok)return;netErr(t==='peer-unavailable'?'그 코드의 방을 찾지 못했습니다. 코드를 다시 확인하세요.':t==='unavailable-id'?'방 코드가 겹쳤습니다. 다시 만들어 주세요.':'연결하지 못했습니다. 이 환경에서 외부 접속이 막혀 있거나 네트워크가 불안정합니다. ('+(t||'error')+')')}
async function netHost(){if(!(await checkBuild()))return;netBox('<h3>방 만드는 중…</h3><p>연결 모듈 준비 중</p>');netProgress(20);loadPeer(()=>{netProgress(60,'중개 서버 접속 중');const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let code='';for(let i=0;i<6;i++)code+=a[Math.floor(Math.random()*a.length)];
  let pr;try{pr=mkPeer('qddup-'+code)}catch(e){return netErr('연결하지 못했습니다.')}net={host:true,lead:true,pr,code,conn:null,ev:[],acc:0,cn:0,pk:null,rpk:null,ok:false};
  pr.on('open',()=>{if(!net||net.ok)return;netBox('<h3>방 코드</h3><div class="code">'+code+'</div><p>상대에게 이 코드를 보내세요.<br>상대가 들어오면 자동으로 넘어갑니다.</p><button class="btn ghost" id="nCopy">초대 링크 복사</button><button class="btn ghost" id="nX">취소</button>');
    $('nCopy').onclick=()=>{const u=location.origin+location.pathname+'?room='+code;try{navigator.clipboard.writeText(u).then(()=>{$('nCopy').textContent='복사했습니다'},()=>{prompt('초대 링크',u)})}catch(e){prompt('초대 링크',u)}}});
  pr.on('connection',c=>{if(net&&net.conn)return netIncoming(c);if(!net||c.label==='st'){try{c.close()}catch(e){}return}netConn(c)});pr.on('error',netPErr)})}
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
async function netJoin(code){if(!(await checkBuild()))return;netBox('<h3>접속 중…</h3><p>연결 모듈 준비 중</p><button class="btn ghost" id="nX">취소</button>');netProgress(20);loadPeer(()=>{netProgress(45,'중개 서버 접속 중');let pr;try{pr=mkPeer()}catch(e){return netErr('연결하지 못했습니다.')}net={host:false,lead:false,pr,code,conn:null,ev:[],cn:0,pk:null,rpk:null,ok:false,lh:'',it:0};
  pr.on('open',()=>{if(!net||net.conn)return;netProgress(70,'방장과 연결 중');netConn(pr.connect('qddup-'+code,{reliable:true,serialization:'json'}));setTimeout(()=>{if(net&&net.pr===pr&&!net.ok)netErr('시간 안에 연결되지 않았습니다. 코드를 확인하거나 다른 네트워크에서 시도하세요.')},15000)});pr.on('error',netPErr)})}
function netConn(c,opened){
  const n=net,old=n.conn;
  n.conn=c;
  if(!n.rid)n.rid=c.peer;
  if(old&&old!==c)try{old.close()}catch(e){}
  const active=()=>net===n&&n.conn===c&&!c.dead;
  const onOpen=()=>{
    if(!active())return;
    n.last=performance.now();
    if(n.ok)netResumed(n);
    else{n.ok=true;netSend({t:'hi',pc:IS_PC});netBox();toSelect();netLobby()}
    if(!n.lead)netOpenState();
  };
  if(opened)onOpen();else c.on('open',onOpen);
  c.on('iceStateChanged',state=>{if(net===n){n.diag=n.diag||{};n.diag.ice=state}});
  c.on('data',message=>{
    if(!active())return;
    n.last=performance.now();
    if(n.lost)netResumed(n);
    netRecv(message);
  });
  const disconnect=()=>{
    if(!active())return;
    c.dead=true;
    if(n.ok)netLost();
    else if(!n.match)netDrop();
  };
  c.on('close',disconnect);
  c.on('error',disconnect);
}
function netState(s){
  const n=net,old=n.st;
  n.st=s;
  if(old&&old!==s)try{old.close()}catch(e){}
  s.on('data',message=>{if(net===n&&n.st===s)netRecv(message)});
  const gone=()=>{if(n.st===s)n.st=null};
  s.on('close',gone);
  s.on('error',gone);
}
function netOpenState(){
  const n=net;
  if(!n||!n.pr||n.pr.destroyed)return;
  try{netState(n.pr.connect(n.rid,{label:'st',reliable:false,serialization:'raw'}))}catch(e){}
}
function netIncoming(c){
  const n=net;
  if(n&&c.peer===n.rid){
    if(c.label==='st'){netState(c);return}
    if(n.lost){
      const hello=m=>{if(m&&m.t==='re'&&net===n&&n.lost){c.off('data',hello);netConn(c,true)}};
      c.on('data',hello);
      return;
    }
  }
  try{c.close()}catch(e){}
}
function netSendState(s){
  const n=net;
  if(n&&n.st&&n.st.open){try{n.st.send(s);return}catch(e){}}
  netSend(s);
}
function netLost(){
  const n=net;
  if(!n||n.lost)return;
  if(mode!=='fight'){netGiveUp();return}
  n.lost=performance.now();n.alive=false;
  rh.l=rh.r=rh.up=rh.down=0;
  const probe=()=>{if(net!==n||!n.lost)return;const ac=new AbortController(),t=setTimeout(()=>ac.abort(),1500);fetch(ONLINE_API+'/build',{cache:'no-store',signal:ac.signal}).then(r=>{if(r.ok&&n.lost)n.alive=true;else if(n.lost)n.selfDrop=true}).catch(()=>{if(n.lost)n.selfDrop=true}).finally(()=>{clearTimeout(t);if(net===n&&n.lost&&!n.alive)setTimeout(probe,1000)})};
  if(navigator.onLine===false)n.selfDrop=true;
  probe();
  netBox('<h3>상대를 기다리는 중…</h3><b class="cd" id="nCount">10</b>');
}
function netRetry(){
  const n=net;
  if(!n.pr||n.pr.destroyed)return;
  if(n.pr.disconnected){try{n.pr.reconnect()}catch(e){}return}
  let c;
  try{c=n.pr.connect(n.rid,{reliable:true,serialization:'json'})}catch(e){return}
  c.on('open',()=>{if(net===n&&n.lost){c.send({t:'re'});netConn(c,true)}else try{c.close()}catch(e){}});
  c.on('error',()=>{});
}
function netGiveUp(){
  if(!net)return;
  if(mode==='fight'&&net.t0)netFightDrop();else netDrop();
}
function netResumed(n){
  if(!n.lost)return;
  if(n.selfDrop){n.selfDrop=false;n.drops=(n.drops||0)+1;if(n.drops>=2&&n.t0&&mode==='fight'){netSend({t:'dq'});n.lost=0;netFightDrop('dq');return}}
  n.lost=0;rh.l=rh.r=rh.up=rh.down=0;
  if(mode!=='fight'){netBox();return}
  n.resumeAt=performance.now()+3000;
  netBox('<h3>경기가 재개됩니다</h3><b class="cd" id="nRes">3</b>');
}
function netFightDrop(kind){
  const n=net,me=ME(),op=me===P?C:P,el=performance.now()-n.t0;
  const alive=!!(n.alive||!n.lost),hp=n.mh?[me.hp,op.hp]:[op.hp,me.hp];
  const state={match:n.match,mh:n.mh};
  lastOnlineKind=n.match?.kind||null;
  lastOnlineMatch=n.match?.id||null;
  netClose();netBox();
  mode='menu';if(bgm)setMusicGain(.2);dropResult=true;show('sRes');
  $('resA').style.display=lastOnlineKind?'':'none';
  $('resA').textContent='다시 매칭';
  $('resB').textContent='메뉴로';
  const show2=(win,msg)=>{$('resT').textContent=win===null?'무효':win?'YOU WIN':'YOU LOSE';$('resT').className='big'+(win===null?'':win?' win':' lose');$('resS').textContent=msg;if(win!==null)win?sfx.win():sfx.lose()};
  if(kind){const win=kind==='odq';show2(win,win?'상대가 한 경기에서 2번 연결이 끊겨 실격승했어요':'한 경기에서 2번 연결이 끊겨 실격패 처리됐어요');netBox();if(state.match)dropJudge(state,{id:state.match.id,alive:true,bye:false,auth:!!n.host,hp,el:Math.round(el),dq:!win,odq:win},(w,msg)=>{$('resS').textContent=msg});return}
  if(!state.match){
    if(el<5000)return show2(null,'시작 5초 안에 연결이 끊겨 무효 처리됐어요');
    if(n.bye||alive)return show2(true,n.bye?'상대가 경기를 나가 승리했어요':'상대가 10초 안에 돌아오지 않아 승리했어요');
    return show2(me.hp===op.hp?null:me.hp>op.hp,'연결이 끊겨 남은 체력으로 판정했어요');
  }
  $('resT').textContent='판정 중';$('resT').className='big';$('resS').textContent='연결이 끊겨 서버에서 결과를 확인하고 있어요…';
  dropJudge(state,{id:state.match.id,alive,bye:!!n.bye,auth:!!n.host,hp,el:Math.round(el)},show2);
}
async function dropJudge(state,body,show2){
  const id=state.match.id,here=()=>lastOnlineMatch===id&&$('sRes').classList.contains('show');
  for(let i=0;i<45;i++){
    try{
      const r=await onlineApi('/drop',body);
      if(r.decided){
        if(!here())break;
        const win=r.outcome==='void'?null:r.outcome===r.me;
        const why={dq:win?'상대가 한 경기에서 2번 연결이 끊겨 실격승했어요':'한 경기에서 2번 연결이 끊겨 실격패 처리됐어요',early:'시작 5초 안에 연결이 끊겨 무효 처리됐어요',tie:'둘 다 연결이 끊겼고 체력이 같아 무효 처리됐어요',hp:'둘 다 연결이 끊겨 남은 체력으로 판정했어요',result:'경기 결과가 이미 반영됐어요',left:win?'상대가 경기를 나가 승리했어요':'경기를 나가 패배 처리됐어요',alive:win?'상대가 10초 안에 돌아오지 않아 승리했어요':'연결이 끊겨 10초 안에 돌아오지 못해 패배 처리됐어요'}[r.reason]||'';
        show2(win,why+(state.match.kind==='ranked'&&win!==null?' · 오늘 순위에 반영됨':''));
        break;
      }
    }catch(e){if(e.status===404||e.status===401)break}
    await new Promise(res=>setTimeout(res,1500));
  }
  if(here()&&$('resT').textContent==='판정 중'){$('resT').textContent='판정 실패';$('resS').textContent='서버에 연결하지 못해 결과를 확인하지 못했어요'}
  releaseQueue(id);
}
function netUI(){const on=!!(net&&net.ok);if(!on){$('go').disabled=!pick;$('go').textContent='READY!'}}
function netLobby(){netUI();if(net.my&&!pick)pick=net.my;syncCharacterPicker();$('go').disabled=!pick||!!net.pk;$('go').textContent=net.pk?'상대를 기다리는 중':'READY!';$('best').textContent=net.match?((net.match.kind==='ranked'?'랭킹대전':'일반대전')+' · '+net.match.opponent+(net.rpk?' 준비 완료':'')):'온라인 대전 · 방 '+net.code+(net.rpk?' · 상대 준비 완료':' · 상대 연결됨')}
function netPrep(){if(!net||!net.pk||!net.rpk||net.vrp)return;net.vrp=1;const n=net;
  const ov=$('vload');if(!cutsReady([net.pk,net.rpk])){ov.classList.add('on');$('vloadFill').style.width='0%';$('vloadPct').textContent='0%'}
  ensureCuts([net.pk,net.rpk],p=>{if(net!==n)return;$('vloadFill').style.width=p.toFixed(1)+'%';$('vloadPct').textContent=Math.floor(p)+'%'}).then(()=>{if(net!==n){ov.classList.remove('on');return}n.vr=1;netSend({t:'vr'});setTimeout(()=>{if(net===n&&!n.rvr){n.rvr=1;netTry()}},15000);netTry()})}
function netTry(){netPrep();if(!net||!net.host||!net.vr||!net.rvr||net.rpc===undefined||!canPickCharacter(net.pk)||!canPickCharacter(net.rpk)||mode!=='menu'||!$('sSel').classList.contains('show'))return;const si=window.__stg!==undefined?window.__stg:Math.floor(Math.random()*STAGES.length),m={t:'start',p:net.pk,c:net.rpk,stg:si};netSend(m);netBegin(m)}
function netBegin(m){$('vload').classList.remove('on');shareEmotes();net.begin=m;net.t0=performance.now();net.lost=0;net.my=net.host?m.p:m.c;net.pk=net.rpk=null;net.vrp=net.vr=net.rvr=0;net.ev=[];net.cn=0;net.snap=null;rh.l=rh.r=rh.up=rh.down=0;rbuf.p=rbuf.k=rbuf.s=rbuf.t=rbuf.g=0;const sk=streak;streak=0;pick=m.p;opp=m.c;stage=STAGES[m.stg];rtm.forEach(clearTimeout);rtm=[];startMatch();streak=sk;level=0;C.cpu=false;hostInputReset();if(net.host){C.buf=rbuf;P.buf=hbuf}pick=net.my}
function netRecv(m){if(!net)return;if(typeof m==='string'){try{m=JSON.parse(m)}catch(e){return}}if(!m||typeof m!=='object')return;
  if(m.t==='s'){if(!net.host&&mode==='fight'&&!(m.q<=net.rq)){net.rq=m.q;if(net.snap){m.fx=(net.snap.fx||[]).concat(m.fx||[]);m.ev=(net.snap.ev||[]).concat(m.ev||[])}net.snap=m}}
  else if(m.t==='i'){if(net.host&&Array.isArray(m.h)&&m.h.length===4){[rh.l,rh.r,rh.up,rh.down]=m.h.map(v=>v===1?1:0);if(typeof m.p==='string')for(const k of m.p.slice(0,5))if('pkstg'.includes(k))rbuf[k]=k==='s'||k==='t'?.7:.16}}
  else if(m.t==='pg'){if(!net.host&&typeof m.n==='number')netSend({t:'po',n:m.n})}
  else if(m.t==='po'){if(net.host&&typeof m.n==='number'){const s=performance.now()/1000-m.n;if(s>=0&&s<2)net.rtt=net.rtt?net.rtt*.7+s*.3:s}}
  else if(m.t==='hi'&&!net.t0){net.rpc=!!m.pc;net.host=IS_PC!==net.rpc?IS_PC:net.lead;netTry()}
  else if(m.t==='vr'){net.rvr=1;netTry()}
  else if(m.t==='pick'&&canPickCharacter(m.c)){net.rpk=m.c;if(mode==='menu'&&$('sSel').classList.contains('show'))netLobby();netTry()}
  else if(m.t==='start'){if(!net.host&&canPickCharacter(m.p)&&canPickCharacter(m.c)&&Number.isInteger(m.stg)&&STAGES[m.stg]){initAudio();netBegin(m)}}
  else if(m.t==='em'&&typeof m.e==='string')recvEmote(m.e)
  else if(m.t==='emk')recvEmoteKit(m.s)
  else if(m.t==='dq'){if(mode==='fight'&&net.t0)netFightDrop('odq')}
  else if(m.t==='bye'){if(mode==='fight'&&net.t0){net.bye=true;net.alive=true}netGiveUp()}
  else if(m.t==='res'){if(!net.host&&mode==='fight'&&typeof m.w==='boolean'){if(net.snap){netApply(net.snap);net.snap=null}if(net.match?.kind==='ranked'&&!((phase==='ko'||phase==='time')&&(P.wins>=2||C.wins>=2)&&m.w===(P.wins>C.wins)))return;if(cut)endCut();result(!m.w)}}}
function netClose(){$('vload').classList.remove('on');const n=net;if(n)netSend({t:'bye'});net=null;if(!n)return;if(n.match)releaseQueue(n.match.id);setTimeout(()=>{try{if(n.st)n.st.close()}catch(e){}try{if(n.conn)n.conn.close()}catch(e){}try{n.pr.destroy()}catch(e){}},400);if(cut)endCut();netUI()}
function netLeave(){netClose();$('best').textContent=best?('최고 연승 '+best):'상대와 스테이지는 주사위로 정해집니다'}
function netDrop(){if(!net)return;const showingResult=$('sRes').classList.contains('show'),matched=!!net.match;netClose();if(showingResult){resultOnline=dropResult=false;if(matched){$('resB').textContent='메뉴로'}else toMenu('main');netBox('<h3>상대가 방을 나갔어요</h3>');const box=$('netBox').innerHTML;setTimeout(()=>{if($('sNet').classList.contains('show')&&$('netBox').innerHTML===box)netBox()},1800);return}toMenu('multi');netBox('<h3>연결 끊김</h3><p>상대와의 연결이 끊어졌습니다.</p><button class="btn ghost" id="nX">확인</button>')}
function netSnap(){const F=f=>{const o={};for(const k in f){const v=f[k];if(v===null||typeof v==='number'||typeof v==='string'||typeof v==='boolean')o[k]=v}o.assist=f.assist||null;o.trail=f.trail;return o},W=o=>o===P?0:1;
  const m={t:'s',P:F(P),C:F(C),ph:phase,pt,rd:round,tm:timer,cam:camX,sh:shake,hs:hitstop,sl:slow,fl:flash,msg,cb:[combo.n,combo.t,combo.who?W(combo.who):-1],pj:proj.map(p=>Object.assign({},p,{o:W(p.o)})),fx:fx.filter(e=>!e.ns&&(e.ns=1)),q:net.sq=(net.sq||0)+1,
    zn:zone&&Object.assign({},zone,{o:W(zone.o)}),fd:flood&&Object.assign({},flood,{o:W(flood.o)}),fz:freeze&&{t:freeze.t,f:W(freeze.f)},cu:cut?W(cut.f):-1,ct:cut?cut.v.currentTime:0,cn:net.cn,ev:net.ev};
  net.ev=[];netSendState(JSON.stringify(m,(k,v)=>typeof v==='number'?Math.round(v*100)/100:v))}
function netApply(m){const A=(f,o)=>{for(const k in o)f[k]=o[k]},R=i=>i?C:P;A(P,m.P);A(C,m.C);phase=m.ph;pt=m.pt;round=m.rd;timer=m.tm;camX=m.cam;shake=m.sh;hitstop=m.hs;slow=m.sl;flash=m.fl;msg=m.msg;combo.n=m.cb[0];combo.t=m.cb[1];combo.who=m.cb[2]<0?null:R(m.cb[2]);
  proj=m.pj;for(const p of proj)p.o=R(p.o);for(const e of m.fx||[])fx.push(e);zone=m.zn||null;if(zone)zone.o=R(zone.o);flood=m.fd||null;if(flood)flood.o=R(flood.o);freeze=m.fz?{t:m.fz.t,f:R(m.fz.f)}:null;
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
  if(cut){cut.t+=dt;if(cut.t>cut.max)endCut()}
  else if(!(hitstop>0)&&!freeze&&P){const k=slow>0?.28:1;for(const f of[P,C]){f.t+=dt*k;f.x+=f.vx*dt*k;if(f.y>0||f.vy>0){f.vy-=G*dt*k;f.y=Math.max(0,f.y+f.vy*dt*k)}}for(const p of proj){p.t+=dt*k;p.x+=p.vx*dt*k;p.vy-=p.g*dt*k;p.y-=p.vy*dt*k}pt+=dt}
  let pr='';for(const k of 'pkstg')if(buf[k]>0){pr+=k;buf[k]=0}const h=''+held.l+held.r+held.up+held.down;net.it+=dt;
  if(pr||h!==net.lh||net.it>.2){net.lh=h;net.it=0;netSend({t:'i',h:[held.l,held.r,held.up,held.down],p:pr})}}
setInterval(()=>{
  const n=net;
  if(!n||!n.ok)return;
  const now=performance.now();
  if(!n.pt||now-n.pt>=1000){n.pt=now;netSend({t:'p'})}
  if(n.resumeAt){const r=$('nRes');if(now>=n.resumeAt){n.resumeAt=0;if(r)netBox()}else if(r)r.textContent=Math.ceil((n.resumeAt-now)/1000)}
  if(!n.lost){if(now-n.last>3000)netLost();return}
  const el=$('nCount');
  if(el)el.textContent=Math.max(1,Math.ceil((10000-(now-n.lost))/1000));
  if(now-n.lost>=10000){netGiveUp();return}
  if(!n.lead&&now-(n.rt||0)>2000){n.rt=now;netRetry()}
},250);addEventListener('pagehide',()=>{if(!netSaveRejoin())netSend({t:'bye'})});



function netSaveRejoin(){
  const n=net;
  if(!n||!n.match||!n.ok||!n.begin||mode!=='fight'||!P)return false;
  let snap=null;
  if(n.host){const ev=n.ev,sq=n.sq,send=netSendState;netSendState=x=>{snap=x};try{netSnap()}catch(e){}netSendState=send;n.ev=ev;n.sq=sq}
  try{sessionStorage.setItem('qddup_rejoin',JSON.stringify({at:Date.now(),drops:n.drops||0,match:n.match,mh:n.mh,host:n.host,lead:n.lead,rpc:n.rpc,my:n.my,begin:n.begin,el:performance.now()-n.t0,snap,lost:n.lost?performance.now()-n.lost:0}))}catch(e){return false}
  return true;
}
function netRejoin(){
  let d=null;
  try{d=JSON.parse(sessionStorage.getItem('qddup_rejoin')||'null');sessionStorage.removeItem('qddup_rejoin')}catch(e){}
  if(!d||!playerToken||!d.match)return false;
  const gone=Date.now()-d.at+(d.lost||0);
  if(gone>120000)return false;
  enterGame();
  if(gone>=9000){rejoinLate(d);return true}
  netBox('<h3>재접속 중…</h3><b class="cd" id="nCount">'+Math.ceil((10000-gone)/1000)+'</b>');
  const deadline=performance.now()+(10000-gone);
  loadPeer(()=>{
    const base='qddup-match-'+d.match.id,me=base+(d.mh?'-host':'-guest'),other=base+(d.mh?'-guest':'-host');
    let pr;try{pr=mkPeer(me)}catch(e){return rejoinLate(d)}
    const st={host:d.host,lead:d.lead,mh:d.mh,pr,match:d.match,code:'',conn:null,ev:[],cn:0,pk:null,rpk:null,ok:false,lh:'',it:0,rpc:d.rpc,my:d.my,rid:other,rejoin:d,drops:d.drops||0,selfDrop:true,begin:d.begin};
    net=st;
    const done=c=>{
      if(net!==st||st.ok)return;
      st.ok=true;st.lost=performance.now();
      const m=d.begin;pick=m.p;opp=m.c;stage=STAGES[m.stg];
      const sk=streak;streak=0;rtm.forEach(clearTimeout);rtm=[];startMatch();streak=sk;level=0;C.cpu=false;hostInputReset();if(st.host){C.buf=rbuf;P.buf=hbuf}pick=st.my;
      st.t0=performance.now()-d.el;
      if(st.host&&d.snap){try{const sn=JSON.parse(d.snap);netApply(sn);st.sq=(sn.q||0)+50}catch(e){}}
      if(st.pst){const s=st.pst;st.pst=null;netState(s)}
      netConn(c,true);
    };
    pr.on('connection',c=>{if(c.peer!==other){try{c.close()}catch(e){}return}if(st.ok){netIncoming(c);return}if(c.label==='st'){st.pst=c;return}c.on('open',()=>done(c));if(c.open)done(c)});
    const tryConnect=()=>{
      if(net!==st||st.ok)return;
      if(performance.now()>deadline){netClose();rejoinLate(d);return}
      const el=$('nCount');if(el)el.textContent=Math.max(0,Math.ceil((deadline-performance.now())/1000));
      if(!st.lead&&pr.open){let c;try{c=pr.connect(other,{reliable:true,serialization:'json'})}catch(e){}if(c)c.on('open',()=>{if(net===st&&!st.ok){c.send({t:'re'});done(c)}else try{c.close()}catch(e){}})}
      setTimeout(tryConnect,st.lead?500:1500);
    };
    pr.on('open',tryConnect);
    pr.on('error',()=>{});
  },()=>rejoinLate(d));
  return true;
}
function rejoinLate(d){
  netBox();
  lastOnlineKind=d.match.kind;lastOnlineMatch=d.match.id;
  mode='menu';dropResult=true;show('sRes');
  $('resA').style.display='';$('resA').textContent='다시 매칭';$('resB').textContent='메뉴로';
  $('resT').textContent='판정 중';$('resT').className='big';$('resS').textContent='10초 안에 돌아오지 못해 서버에서 결과를 확인하고 있어요…';
  const hp=[0,0];
  dropJudge({match:d.match,mh:d.mh},{id:d.match.id,alive:false,bye:false,auth:false,hp,el:Math.round(d.el)},(win,msg)=>{$('resT').textContent=win===null?'무효':win?'YOU WIN':'YOU LOSE';$('resT').className='big'+(win===null?'':win?' win':' lose');$('resS').textContent=msg;if(win!==null)win?sfx.win():sfx.lose()});
}
