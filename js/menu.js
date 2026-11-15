'use strict';
const MENUS={
  main:{title:'메인 메뉴',back:null,items:[
    ['게임하기',()=>openMenu('play')],
    ['랭킹순위',()=>showLeaderboard()],
    ['캐릭터 소개',()=>window.open('characters.html','_blank')],
    ['설정',()=>openMenu('settings')]]},
  play:{title:'게임하기',back:'main',items:[
    ['CPU',()=>{unlockVids();practice=false;toSelect()}],
    ['멀티플레이',()=>openMenu('multi')],
    ['연습하기',()=>{unlockVids();practice=true;toSelect()}]]},
  multi:{title:'멀티플레이',back:'play',items:[
    ['일반대전',()=>{unlockVids();startQueue('quick')}],
    ['랭킹대전',()=>{unlockVids();startQueue('ranked')}],
    ['친선대전',()=>openMenu('friend')]]},
  friend:{title:'친선대전',back:'multi',items:[
    ['방 만들기',()=>{unlockVids();netHost()}],
    ['방 참가',()=>netJoinUI()]]},
  settings:{title:'설정',back:'main',panel:'settingsPanel'}
};
let menuAt='main';
function openMenu(id){
  const m=MENUS[id];menuAt=id;
  $('menuSub').textContent=m.title;
  const list=$('menuList');list.innerHTML='';
  for(const [label,act] of m.items||[]){
    const b=document.createElement('button');b.type='button';b.className='btn menuBtn';b.textContent=label;
    b.onclick=()=>{const t=performance.now();if(t-(openMenu.tap||0)<350)return;openMenu.tap=t;initAudio();sfx.sel();act()};list.append(b);
  }
  list.hidden=!m.items;
  for(const p of document.querySelectorAll('.menuPanel'))p.hidden=p.id!==m.panel;
  if(m.panel==='settingsPanel'){syncAudioSettings();syncEmoteUI()}
  $('menuBack').hidden=!m.back;
  $('accName').textContent=playerName;
  syncBack();
}
function toMenu(id){if(!pauseSettings)practice=false;const fresh=!isShown('sMenu');mode='menu';show('sMenu');playBgm('menu');openMenu(id||'main');if(fresh)refreshOnline()}
function toTitle(){mode='menu';show('sTitle')}

const isShown=id=>$(id).classList.contains('show');
function backAction(){
  if(typeof ctrlEditing!=='undefined'&&ctrlEditing)return ()=>endCtrlEdit();
  if(pauseSettings&&isShown('sMenu'))return ()=>backToPause();
  if(mode==='paused')return ()=>resumeGame();
  if(mode==='fight'&&!net&&P)return ()=>pauseGame();
  if(isShown('sNet')){const x=$('nX');return x?()=>x.click():null}
  if(isShown('sSel'))return ()=>{if(net){netLeave();toMenu('multi')}else toMenu('play')};
  if(isShown('sMenu')&&MENUS[menuAt].back)return ()=>openMenu(MENUS[menuAt].back);
  return null;
}
function goBack(){const act=backAction();if(!act)return;initAudio();sfx.sel();act()}
let backGuard=false;
function syncBack(){
  const can=!!backAction();
  $('backArrow').classList.toggle('on',can&&!((mode==='fight'||mode==='paused')&&!net&&P&&!isShown('sMenu')));
  if(can&&!backGuard){try{history.pushState({qddupBack:1},'')}catch(e){}backGuard=true}
}
addEventListener('popstate',()=>{backGuard=false;goBack();syncBack()});
function pressBack(){if(backGuard)history.back();else goBack()}
$('backArrow').onclick=pressBack;
$('menuBack').onclick=pressBack;
$('selBack').onclick=pressBack;
addEventListener('keydown',e=>{
  if(e.key!=='Escape'||(mode==='fight'&&net)||audioSettings.open||e.target.closest?.('input, textarea'))return;
  if(backAction()){e.preventDefault();pressBack()}
});

$('logout').onclick=()=>{
  initAudio();sfx.sel();
  if(net)netLeave();
  if(playerToken)onlineApi('/logout',{}).catch(()=>{});
  clearSession();
  showAuth();
  toTitle();
};
let onlineBusy=false,onlineAt=0,onlineLast='';
async function refreshOnline(){
  if(onlineBusy||!playerToken||!ONLINE_API||Date.now()-onlineAt<2000)return;
  onlineBusy=true;onlineAt=Date.now();
  const el=$('onlineNow');el.classList.add('loading');el.querySelector('span').textContent='접속 인원 조회 중…';
  try{const r=await onlineApi('/online');if(Number.isFinite(r.online)){el.classList.remove('loading');el.querySelector('span').textContent=onlineLast='현재 '+r.online+'명 접속 중'}}catch(e){if(e.status===429){if(onlineLast){el.classList.remove('loading');el.querySelector('span').textContent=onlineLast}}else el.querySelector('span').textContent='접속 인원을 불러오지 못했어요'}
  onlineBusy=false;
}
function setTab(name){
  document.querySelectorAll('#settingsPanel .setTabs button').forEach(b=>{const on=b.dataset.tab===name;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  document.querySelectorAll('#settingsPanel .setPage').forEach(p=>p.hidden=p.dataset.page!==name);
  if(name==='emote')syncEmoteUI();
  if(name==='control')syncCtrlUI();
}
document.querySelectorAll('#settingsPanel .setTabs button').forEach(b=>b.onclick=()=>{sfx.sel();setTab(b.dataset.tab)});
let practice=false,pauseSettings=false;
function pauseBox(){netBox('<h3>일시정지</h3><button class="btn" id="pzGo" type="button">계속하기</button><button class="btn ghost" id="pzSet" type="button">설정</button>'+(practice?'<button class="btn ghost" id="pzSel" type="button">캐릭터 선택</button>':'')+'<button class="btn ghost" id="pzMain" type="button">메인메뉴</button>');
  const tap=(id,fn)=>{const el=$(id);let t=0;el.addEventListener('pointerup',e=>{e.preventDefault();t=performance.now();fn()});el.addEventListener('click',()=>{if(performance.now()-t>700)fn()})};
  tap('pzGo',()=>{sfx.sel();resumeGame()});
  tap('pzSet',()=>{sfx.sel();pauseSettings=true;netBox();mode='paused';show('sMenu');openMenu('settings');syncBack()});
  tap('pzMain',()=>{sfx.sel();quitGame()});
  if($('pzSel'))tap('pzSel',()=>{sfx.sel();pauseSettings=false;netBox();clearEmotes();P=C=null;practice=true;toSelect();syncBack()});
}
function pauseGame(){
  if(mode!=='fight'||net||!P||cut)return;
  mode='paused';for(const k in held)held[k]=0;for(const k in buf)buf[k]=0;
  if(bgm)setMusicGain(.25);pauseBox();syncBack();
}
function resumeGame(){
  if(mode!=='paused')return;
  pauseSettings=false;netBox();show(null);mode='fight';if(bgm)setMusicGain(.5);syncBack();
}
function backToPause(){pauseSettings=false;show(null);mode='paused';pauseBox();syncBack()}
function quitGame(){
  pauseSettings=false;practice=false;netBox();clearEmotes();P=C=null;mode='menu';toMenu('main');
}
setInterval(()=>{if(typeof mode==='undefined'||typeof P==='undefined')return;try{const pb=$('pauseBtn'),home=$('emoBar');if(pb.parentNode!==home)home.prepend(pb);const on=mode==='fight'&&!net&&!!P;$('pauseBtn').classList.toggle('on',on);$('sNet').classList.toggle('pz',mode==='paused'&&!isShown('sMenu'));if(on)$('backArrow').classList.remove('on')}catch(e){}},200);
$('pauseBtn').addEventListener('pointerup',e=>{e.preventDefault();if(mode==='fight')pauseGame();else if(mode==='paused')resumeGame()});
