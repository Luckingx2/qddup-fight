'use strict';
const MENUS={
  main:{title:'메인 메뉴',back:null,items:[
    ['게임하기',()=>openMenu('play')],
    ['랭킹순위',()=>showLeaderboard()],
    ['설정',()=>openMenu('settings')]]},
  play:{title:'게임하기',back:'main',items:[
    ['CPU',()=>{unlockVids();toSelect()}],
    ['멀티플레이',()=>openMenu('multi')]]},
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
function toMenu(id){const fresh=!isShown('sMenu');mode='menu';show('sMenu');playBgm('menu');openMenu(id||'main');if(fresh)refreshOnline()}
function toTitle(){mode='menu';show('sTitle')}

const isShown=id=>$(id).classList.contains('show');
function backAction(){
  if(isShown('sNet')){const x=$('nX');return x?()=>x.click():null}
  if(isShown('sSel'))return ()=>{if(net){netLeave();toMenu('multi')}else toMenu('play')};
  if(isShown('sMenu')&&MENUS[menuAt].back)return ()=>openMenu(MENUS[menuAt].back);
  return null;
}
function goBack(){const act=backAction();if(!act)return;initAudio();sfx.sel();act()}
let backGuard=false;
function syncBack(){
  const can=!!backAction();
  $('backArrow').classList.toggle('on',can);
  if(can&&!backGuard){try{history.pushState({qddupBack:1},'')}catch(e){}backGuard=true}
}
addEventListener('popstate',()=>{backGuard=false;goBack();syncBack()});
function pressBack(){if(backGuard)history.back();else goBack()}
$('backArrow').onclick=pressBack;
$('menuBack').onclick=pressBack;
$('selBack').onclick=pressBack;
addEventListener('keydown',e=>{
  if(e.key!=='Escape'||mode==='fight'||audioSettings.open||e.target.closest?.('input, textarea'))return;
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
}
document.querySelectorAll('#settingsPanel .setTabs button').forEach(b=>b.onclick=()=>{sfx.sel();setTab(b.dataset.tab)});
