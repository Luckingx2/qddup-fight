/* 닉네임, 빠른 대전·랭킹전 매칭, 랭킹 */
'use strict';
/* ---------- public matchmaking ---------- */
const MATCH_CLIENT=5;
const ONLINE_API=document.querySelector('meta[name="online-api"]')?.content.replace(/\/$/,'');
let playerName='', playerToken='', queueSearch=null, lastOnlineKind=null, lastOnlineMatch=null;
try{
  playerName=localStorage.getItem('qddup_nickname') || '';
  playerToken=localStorage.getItem('qddup_player_token') || '';
}catch(e){}
$('nick').value=playerName;
function onlineToken(){
  if(!/^[a-f0-9]{64}$/.test(playerToken)){
    playerToken=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
    try{localStorage.setItem('qddup_player_token',playerToken)}catch(e){}
  }
  return playerToken;
}
async function onlineApi(path,body,keepalive=false){
  const options=body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',
    Authorization:'Bearer '+onlineToken()},body:JSON.stringify(body),keepalive};
  const response=await fetch(ONLINE_API+path,{...options,signal:AbortSignal.timeout(10000)});
  if(response.status===409)throw new Error('client_update_required');
  if(!response.ok)throw new Error('온라인 서버 오류');
  return response.json();
}
function releaseQueue(id){
  return onlineApi('/leave',{id},true).catch(()=>null);
}
function onlineMessage(title,message){
  netBox('<h3></h3><p role="status"></p><button class="btn ghost" id="nX">닫기</button>');
  $('netBox').querySelector('h3').textContent=title;
  $('netBox').querySelector('p').textContent=message;
}
async function startQueue(kind){
  if(net||queueSearch)return;
  if(!ONLINE_API){onlineMessage('온라인 대전','매칭 서버 연결이 준비되면 이용할 수 있습니다.');return}
  const search={kind,cancelled:false,id:null};
  queueSearch=search;
  onlineMessage(kind==='ranked'?'랭킹전':'빠른 대전','상대를 찾는 중…');
  $('nX').textContent='취소';
  $('nX').onclick=()=>{
    search.cancelled=true;
    netBox();
    releaseQueue(search.id).then(reply=>{if(reply?.id)releaseQueue(reply.id)});
  };
  try{
    const deadline=Date.now()+120000;
    while(!search.cancelled&&Date.now()<deadline){
      const {match}=await onlineApi('/queue',{kind,nickname:playerName,client:MATCH_CLIENT});
      if(search.cancelled){if(match)await releaseQueue(match.id);else await releaseQueue(null);return}
      if(match){
        search.id=match.id;
        $('netBox').querySelector('p').textContent=match.opponent+' 님과 연결 중…';
        await connectQueue(search,match);
        return;
      }
      await new Promise(resolve=>setTimeout(resolve,1600));
    }
    if(!search.cancelled){await releaseQueue(null);onlineMessage('온라인 대전','아직 대기 중인 상대가 없어요. 다시 시도해 주세요.')}
  }catch(e){
    await releaseQueue(search.id);
    if(!search.cancelled){netClose();onlineMessage('온라인 대전',e.message==='client_update_required'?'게임이 업데이트됐어요. 새로고침 후 다시 시도해 주세요.':'상대와 연결하지 못했어요. 다시 시도해 주세요.')}
  }finally{
    if(queueSearch===search)queueSearch=null;
  }
}
async function connectQueue(search,match){
  await new Promise((resolve,reject)=>loadPeer(resolve,reject));
  if(search.cancelled)return;
  const host=!!match.host, base='qddup-match-'+match.id;
  await new Promise((resolve,reject)=>{
    const pr=mkPeer(base+(host?'-host':'-guest'));
    const state={host,pr,match,code:'',conn:null,ev:[],acc:0,cn:0,pk:null,rpk:null,ok:false,lh:'',it:0};
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
      if(host&&connection.peer===base+'-guest')attach(connection);
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
    pr.on('open',()=>{if(!host)connect()});
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
  const winner=(state.host===win)?'host':'guest';
  const status=$('resS');
  status.textContent='랭킹전 · 점수 확인 중…';
  try{
    let message='상대 결과를 기다리는 중 · 점수 반영 대기';
    for(let attempt=0;attempt<5;attempt++){
      const reply=await onlineApi('/result',{id,winner});
      if(reply.confirmed){message='랭킹전 · 누적 순위에 반영됨';break}
      if(reply.disputed){message='양쪽 결과가 달라 점수가 반영되지 않았어요.';break}
      await new Promise(resolve=>setTimeout(resolve,1200));
    }
    if(lastOnlineMatch===id&&$('sRes').classList.contains('show'))status.textContent=message;
  }catch(e){
    if(lastOnlineMatch===id&&$('sRes').classList.contains('show'))status.textContent='랭킹 서버에서 결과를 확인하지 못했어요.';
  }finally{releaseQueue(id)}
}
async function showLeaderboard(){
  onlineMessage('누적 순위',ONLINE_API?'불러오는 중…':'랭킹 서버 연결이 준비되면 이용할 수 있습니다.');
  if(!ONLINE_API)return;
  const status=$('netBox').querySelector('p');
  try{
    const {players,season}=await onlineApi('/leaderboard');
    if(!status.isConnected||!$('sNet').classList.contains('show'))return;
    if(season)status.previousElementSibling.textContent='시즌 '+season+' 순위';
    if(!players.length){status.textContent='아직 기록된 랭킹전이 없어요.';return}
    const table=document.createElement('table');
    table.className='rankList';
    const header=table.createTHead().insertRow();
    for(const label of ['순위','닉네임','점수','승','패']){
      const cell=document.createElement('th');
      cell.scope='col';
      cell.textContent=label;
      header.append(cell);
    }
    const rows=table.createTBody();
    players.forEach((player,index)=>{
      const row=rows.insertRow();
      for(const value of [index+1,player.nickname,player.points,player.wins,player.losses]){
        row.insertCell().textContent=value;
      }
    });
    status.replaceWith(table);
  }catch(e){status.textContent='순위표를 불러오지 못했어요. 다시 시도해 주세요.'}
}
$('quickMatch').onclick=()=>startQueue('quick');
$('rankedMatch').onclick=()=>startQueue('ranked');
$('leaderboard').onclick=showLeaderboard;
addEventListener('pagehide',event=>{
  if(event.persisted)return;
  if(queueSearch||net?.match)releaseQueue(net?.match?.id || queueSearch?.id || null);
});

