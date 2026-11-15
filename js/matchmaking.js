'use strict';
/* ---------- public matchmaking ---------- */
const ONLINE_API=document.querySelector('meta[name="online-api"]')?.content.replace(/\/$/,'');
let playerName='', playerToken='', queueSearch=null, lastOnlineKind=null, lastOnlineMatch=null;
try{
  playerName=localStorage.getItem('qddup_nickname') || '';
  playerToken=localStorage.getItem('qddup_player_token') || '';
}catch(e){}
let legacyPlayerToken='';
try{
  legacyPlayerToken=localStorage.getItem('qddup_legacy_token') || '';
  if(playerToken&&!localStorage.getItem('qddup_session')){
    if(/^[a-f0-9]{64}$/.test(playerToken)){legacyPlayerToken=playerToken;localStorage.setItem('qddup_legacy_token',playerToken)}
    localStorage.removeItem('qddup_player_token');
    playerToken='';
  }
}catch(e){}
function forgetLegacyToken(){
  legacyPlayerToken='';
  try{localStorage.removeItem('qddup_legacy_token')}catch(e){}
}
async function onlineApi(path,body,keepalive=false){
  const headers={};
  if(/^[a-f0-9]{64}$/.test(playerToken))headers.Authorization='Bearer '+playerToken;
  const options=body===undefined?{headers}:{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),keepalive};
  const response=await fetch(ONLINE_API+path,{...options,signal:AbortSignal.timeout?AbortSignal.timeout(10000):undefined});
  let data={};
  try{data=await response.json()}catch(e){}
  if(!response.ok){
    const error=new Error(data.error||'server_error');
    error.status=response.status;
    error.code=data.error||'server_error';
    if(response.status===401&&path!=='/login'&&path!=='/signup'&&path!=='/me')sessionExpired();
    throw error;
  }
  return data;
}
function releaseQueue(id){
  return onlineApi('/leave',{id},true).catch(()=>null);
}
function onlineMessage(title,message){
  netBox('<h3></h3><p role="status"></p><button class="btn ghost" id="nX">닫기</button>');
  $('netBox').querySelector('h3').textContent=title;
  $('netBox').querySelector('p').textContent=message;
}
function lobbyUrl(){
  const u=new URL((rtApi||ONLINE_API)+'/lobby',location.href);
  u.protocol=u.protocol==='https:'?'wss:':'ws:';
  return u.href;
}
async function startQueue(kind){
  if(net||queueSearch)return;
  if(!ONLINE_API){onlineMessage('온라인 대전','매칭 서버 연결이 준비되면 이용할 수 있습니다.');return}
  const search={kind,cancelled:false,id:null,ws:null};
  queueSearch=search;
  onlineMessage(kind==='ranked'?'랭킹대전':'일반대전','상대를 찾는 중…');
  $('nX').onclick=()=>{search.cancelled=true;if(queueSearch===search)queueSearch=null;netBox()};
  const ready=await checkBuild();
  if(search.cancelled)return;
  if(!ready){if(queueSearch===search)queueSearch=null;return}
  await realtimeApi();
  if(search.cancelled){if(queueSearch===search)queueSearch=null;return}
  const waitEl=document.createElement('div');
  waitEl.className='gaugePct';
  $('netBox').insertBefore(waitEl,$('nX'));
  const waitStart=Date.now();
  const showWait=()=>{const s=Math.floor((Date.now()-waitStart)/1000);waitEl.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
  showWait();
  search.tick=setInterval(showWait,500);
  $('nX').textContent='취소';
  $('nX').onclick=()=>{
    search.cancelled=true;
    try{search.ws?.close()}catch(e){}
    netBox();
  };
  try{
    const match=await new Promise((resolve,reject)=>{
      const ws=new WebSocket(lobbyUrl());
      search.ws=ws;
      const timer=setTimeout(()=>reject(Object.assign(new Error('timeout'),{code:'timeout'})),120000);
      ws.onopen=()=>ws.send(JSON.stringify({t:'auth',token:playerToken}));
      ws.onmessage=event=>{
        let m;
        try{m=JSON.parse(event.data)}catch(e){return}
        if(m.t==='ok')ws.send(JSON.stringify({t:'queue',kind}));
        else if(m.t==='match'){clearTimeout(timer);resolve(m.match)}
        else if(m.t==='err'){clearTimeout(timer);reject(Object.assign(new Error(m.code),{code:m.code}))}
      };
      ws.onclose=()=>{clearTimeout(timer);reject(Object.assign(new Error('closed'),{code:'closed'}))};
    });
    try{search.ws.onclose=null;search.ws.close()}catch(e){}
    if(search.cancelled)return;
    search.id=match.id;
    clearInterval(search.tick);
    waitEl.remove();
    netProgress(25,match.opponent+' 님을 찾았어요 · 연결 준비 중');
    await connectQueue(search,match);
  }catch(e){
    try{search.ws?.close()}catch(_){}
    if(search.cancelled)return;
    const dg=diagText();
    await Promise.race([collectDiag('queue:'+(e.code||e.type||e.message||'error'),{step:search.stage||'lobby'}),new Promise(r=>setTimeout(r,1500))]);
    netClose();
    if(e.code==='not_logged_in'){sessionExpired();return}
    onlineMessage('온라인 대전',e.code==='timeout'?'아직 대기 중인 상대가 없어요. 다시 시도해 주세요.':'상대와 연결하지 못했어요. 다시 시도해 주세요. '+dg);
  }finally{
    clearInterval(search.tick);
    if(queueSearch===search)queueSearch=null;
  }
}
async function connectQueue(search,match){
  search.stage='module';
  await new Promise((resolve,reject)=>loadPeer(resolve,reject));
  if(search.cancelled)return;
  search.stage='peer';
  netProgress(50,match.opponent+' 님과 연결 중 · 중개 서버 접속');
  const host=!!match.host, base='qddup-match-'+match.id;
  await new Promise((resolve,reject)=>{
    const pr=mkPeer(base+(host?'-host':'-guest'));
    const state={host,lead:host,mh:host,pr,match,code:'',conn:null,ev:[],cn:0,pk:null,rpk:null,ok:false,lh:'',it:0};
    net=state;
    const timeout=setTimeout(()=>reject(new Error('connection_timeout')),25000);
    const attach=connection=>{
      if(search.cancelled||net!==state||state.conn){connection.close();return}
      netConn(connection);
      connection.on('open',()=>{if(net===state&&state.conn===connection){clearTimeout(timeout);resolve()}});
      connection.on('close',()=>{
        if(!state.ok&&net===state&&state.conn===connection){state.conn=null;if(!host)setTimeout(connect,1500)}
      });
    };
    pr.on('connection',connection=>{
      if(host&&connection.peer===base+'-guest'){if(state.conn)netIncoming(connection);else attach(connection)}
      else connection.close();
    });
    pr.on('error',error=>{
      if(!state.ok&&error.type==='peer-unavailable'&&!host){
        const failed=state.conn;
        state.conn=null;
        if(failed)failed.close();
        setTimeout(connect,1500);
      }else if(!state.ok){clearTimeout(timeout);reject(error)}
      else if(net===state)netPErr(error);
    });
    function connect(){
      if(search.cancelled||net!==state||state.conn)return;
      attach(pr.connect(base+'-host',{reliable:true,serialization:'json'}));
    }
    pr.on('open',()=>{search.stage='peer-open';netProgress(75,match.opponent+' 님과 연결 중');if(!host)connect()});
    $('nX').onclick=()=>{
      search.cancelled=true;
      clearTimeout(timeout);
      netClose();
      netBox();
      resolve();
    };
  });
}
async function matchResult(state,win){
  if(state.match.kind!=='ranked'){releaseQueue(state.match.id);return}
  const id=state.match.id;
  const winner=(state.mh===win)?'host':'guest';
  const status=$('resS');
  status.textContent='랭킹대전 · 점수 확인 중…';
  try{
    let message='상대 결과를 기다리는 중 · 점수 반영 대기';
    for(let attempt=0;attempt<5;attempt++){
      const reply=await onlineApi('/result',{id,winner});
      if(reply.confirmed){message='랭킹대전 · 오늘 순위에 반영됨';break}
      if(reply.disputed){message='양쪽 결과가 달라 점수가 반영되지 않았어요.';break}
      await new Promise(resolve=>setTimeout(resolve,1200));
    }
    if(lastOnlineMatch===id&&$('sRes').classList.contains('show'))status.textContent=message;
  }catch(e){
    if(lastOnlineMatch===id&&$('sRes').classList.contains('show'))status.textContent='랭킹 서버에서 결과를 확인하지 못했어요.';
  }finally{releaseQueue(id)}
}
async function showLeaderboard(){
  onlineMessage('랭킹순위',ONLINE_API?'불러오는 중…':'랭킹 서버 연결이 준비되면 이용할 수 있습니다.');
  if(!ONLINE_API)return;
  const status=$('netBox').querySelector('p');
  const note=document.createElement('p');note.className='rankNote';note.textContent='랭킹은 매일 밤 12시(한국 시간)에 초기화돼요.';status.before(note);
  try{
    const {players,season,me}=await onlineApi('/leaderboard');
    if(!status.isConnected||!$('sNet').classList.contains('show'))return;
    $('netBox').querySelector('h3').textContent='오늘의 순위';
    if(!players.length&&!me){status.textContent='오늘 기록된 랭킹대전이 아직 없어요.';return}
    const table=document.createElement('table');
    table.className='rankList';
    const header=table.createTHead().insertRow();
    for(const label of ['순위','닉네임','점수','승','패']){
      const cell=document.createElement('th');
      cell.scope='col';
      cell.textContent=label;
      header.append(cell);
    }
    if(me){
      const mine=table.createTBody();mine.className='rankMe';
      const row=mine.insertRow();
      for(const value of [me.rank||'-',me.nickname,me.points,me.wins,me.losses])row.insertCell().textContent=value;
    }
    const rows=table.createTBody();
    players.forEach((player,index)=>{
      const row=rows.insertRow();if(me&&player.nickname===me.nickname)row.className='isMe';
      for(const value of [index+1,player.nickname,player.points,player.wins,player.losses]){
        row.insertCell().textContent=value;
      }
    });
    const wrap=document.createElement('div');wrap.className='rankWrap';wrap.append(table);status.replaceWith(wrap);
  }catch(e){status.textContent='순위표를 불러오지 못했어요. 다시 시도해 주세요.'}
}
addEventListener('pagehide',()=>{
  if(queueSearch||net?.match)releaseQueue(net?.match?.id || queueSearch?.id || null);
});

