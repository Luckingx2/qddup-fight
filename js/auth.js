'use strict';
const AUTH_MSG={
  nickname_taken:'방금 다른 사람이 같은 닉네임을 만들었어요. 다시 시도해 주세요.',
  nickname_reserved:'이전 랭킹 기록이 있는 닉네임이에요. 그 기록으로 플레이하던 브라우저에서 가입하거나 다른 닉네임을 써 주세요.',
  invalid_login:'이미 존재하는 닉네임이거나 비밀번호가 틀렸어요.',
  too_many_attempts:'로그인을 너무 많이 틀렸어요. 10분 뒤에 다시 시도해 주세요.',
  invalid_nickname:'닉네임은 한글, 영문, 숫자, 공백, _, - 로 2~16자예요.',
  invalid_password:'비밀번호 4자리 이상 설정해주세요.',
  session_expired:'로그인이 만료됐어요. 다시 로그인해 주세요.'
};
function authMessage(text,ok){const m=$('authMsg');m.textContent=text||'';m.classList.toggle('ok',!!ok)}
function setSession(token,name){
  playerToken=token;playerName=name;
  try{localStorage.setItem('qddup_player_token',token);localStorage.setItem('qddup_session','1');localStorage.setItem('qddup_nickname',name)}catch(e){}
}
function clearSession(){
  playerToken='';playerName='';
  try{localStorage.removeItem('qddup_player_token');localStorage.removeItem('qddup_nickname')}catch(e){}
}
function showAuth(){
  const logged=!!playerToken;
  $('authFields').hidden=logged;
  $('authMe').hidden=!logged;
  $('tStart').textContent=logged?playerName+' 님으로 시작하기':'시작하기';
  if(!logged){$('pw').value='';authMessage('')}
}
function sessionExpired(){
  if(!playerToken)return;
  if(net)netLeave();
  clearSession();showAuth();
  authMessage(AUTH_MSG.session_expired);
  netBox();
  toTitle();
}
function enterGame(){
  initAudio();unlockVids();sfx.sel();toMenu();
  const room=NQ.get('room');
  if(room&&/^[A-Z2-9]{6}$/i.test(room))netJoinUI(room.toUpperCase());
}
let authBusy=false;
async function submitAuth(path){
  if(authBusy)return;
  initAudio();playBgm('menu');
  const nickname=$('nick').value.normalize('NFKC').trim(),password=$('pw').value;
  if(!/^[\p{L}\p{N}_ -]{2,16}$/u.test(nickname)){authMessage(AUTH_MSG.invalid_nickname);$('nick').focus();return}
  if(password.length<4||password.length>64){authMessage(AUTH_MSG.invalid_password);$('pw').focus();return}
  authBusy=true;$('tGo').disabled=true;
  authMessage('로그인하는 중…',true);
  try{
    const reply=await onlineApi(path,legacyPlayerToken?{nickname,password,legacy:legacyPlayerToken}:{nickname,password});
    setSession(reply.token,reply.nickname);
    getIce();
    showAuth();authMessage('');
    enterGame();
    const old=reply.legacy;
    if(old&&old.status!=='has_record')forgetLegacyToken();
    const moved=old?.status==='claimed'?' 이전 랭킹 기록('+old.points+'점, '+old.wins+'승 '+old.losses+'패)을 이 계정으로 옮겼어요.':'';
    if(reply.created)onlineMessage('환영해요!',reply.nickname+' 계정이 새로 만들어졌어요. 다음부터 같은 닉네임과 비밀번호로 로그인하세요.'+moved);
    else if(moved)onlineMessage('랭킹 기록 연결',moved.trim());
  }catch(e){
    authMessage(AUTH_MSG[e.code]||'서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }finally{
    authBusy=false;$('tGo').disabled=false;
  }
}
$('titleForm').onsubmit=event=>{event.preventDefault();if(!playerToken)submitAuth('/login')};
$('tStart').onclick=enterGame;
$('nick').oninput=$('pw').oninput=()=>authMessage('');
$('nick').value=playerName;
showAuth();
if(playerToken){
  onlineApi('/me').then(me=>{
    setSession(playerToken,me.nickname);showAuth();getIce();
  }).catch(e=>{
    if(e.status===401){clearSession();showAuth();authMessage(AUTH_MSG.session_expired)}
  });
}
