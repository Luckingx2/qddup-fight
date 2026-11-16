'use strict';
/* ---------- screens ---------- */
let pick=null,opp=null,stage=null,streak=0,best=0,lastOpp=null,resultOnline=false;
try{best=+(localStorage.getItem('wqre_best')||0)}catch(e){}
const titleVideo=$('ttl'), titleVoice=$('titleVoice');
// 첫 화면 표지: 들어올 때마다 4장 중 하나를 무작위로 (직전과 같은 그림은 피함)
const COVERS=[1,2,3,4].map(n=>'assets/ui/covers/cover'+n+'.jpg');let coverNow=-1;
function pickCover(){
  let n=Math.floor(Math.random()*COVERS.length);if(n===coverNow)n=(n+1)%COVERS.length;coverNow=n;
  const url=new URL(av(COVERS[n]),location.href).href;
  titleVideo.poster=url;$('sTitle').style.setProperty('--cover','url("'+url+'")');
}
function startTitleVideo(withVoice){
  titleVideo.muted=!withVoice;
  titleVideo.loop=!withVoice;
  titleVoice.disabled=withVoice;
  if(titleVideo.readyState>0)titleVideo.currentTime=0;
  titleVideo.play().catch(()=>{titleVoice.disabled=false});
}
titleVoice.onclick=()=>startTitleVideo(true);
titleVideo.addEventListener('ended',()=>{
  if($('sTitle').classList.contains('show'))startTitleVideo(false);
});
function show(id){
  const b=$('snd');if(id){b.classList.remove('in');document.body.appendChild(b)}else{b.classList.add('in');$('stage').appendChild(b)}
  ['sTitle','sMenu','sSel','sVs','sRes'].forEach(s=>$(s).classList.toggle('show',s===id));
  if(id==='sTitle'){pickCover();startTitleVideo(false)}
  else if(!titleVideo.paused){titleVideo.muted=true;titleVideo.pause()}
  if(typeof syncBack==='function')syncBack();
}
function canPickCharacter(id,kind=net?.match?.kind){
  return ORDER.includes(id)&&(kind!=='ranked'||!['G','B'].includes(BASE_CHARACTER[id]));
}
function chooseCharacter(id,fromVariant=false){
  if(net?.pk||!canPickCharacter(id))return;
  pick=id;needSheet(id);
  sayVoice(BASE_CHARACTER[id],'select');
  syncCharacterPicker();
  if(fromVariant)$('selectVariants').querySelector('[aria-pressed="true"]')?.focus();
  $('go').disabled=false;
  $('go').textContent='READY!';
}
function syncCharacterPicker(){
  if(!canPickCharacter(pick))pick=null;
  document.querySelectorAll('#cards [data-c]').forEach(card=>{
    card.classList.toggle('roster-slot-hidden',!canPickCharacter(card.dataset.c));
    const selected=card.dataset.c===pick;
    card.classList.toggle('sel',selected);
    card.setAttribute('aria-pressed',String(selected));
  });
  const stats=CH[pick], statsBox=$('fighterStats');
  $('pvN').textContent=pick?stats.name:'선택 대기';
  statsBox.hidden=!stats;
  if(stats){
    const role=document.createElement('strong');
    role.textContent=stats.role;
    const numbers=document.createElement('span');
    numbers.textContent='HP '+stats.hp+' · 펀치 '+stats.pd+' · 킥 '+stats.kd;
    const tradeoff=document.createElement('span');
    tradeoff.textContent=stats.tradeoff;
    statsBox.replaceChildren(role,numbers);
    numbers.textContent+=' · 잡기 '+throwDamage(pick);
    statsBox.append(tradeoff);
  }
  $('sSel').style.setProperty('--pick-color',pick?CH[pick].col:'#70c7ff');
  const poster=$('selectPoster');
  poster.hidden=!pick;
  if(pick)poster.src=av('assets/ui/roster/'+pick+'.webp');
  const opponent=canPickCharacter(net?.rpk)?net.rpk:null;
  $('opponentName').textContent=opponent?CH[opponent].name:'?';
  $('opponentHint').textContent=net?(opponent?'준비 완료':'상대 선택 대기'):'상대 무작위 선택';
  const portrait=$('opponentPoster');
  portrait.hidden=!opponent;
  if(opponent)portrait.src=av('assets/ui/roster/'+opponent+'.webp');
  const variants=$('selectVariants');
  const family=FAMILIES[BASE_CHARACTER[pick]]||[];
  variants.hidden=true;
  if(variants.hidden)return;
  variants.replaceChildren();
  for(const id of family){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=CH[id].name;
    button.setAttribute('aria-pressed',String(id===pick));
    button.disabled=!!net?.pk;
    button.onclick=()=>{sfx.sel();chooseCharacter(id,true)};
    variants.append(button);
  }
}
function buildSelect(){
  $('cards').innerHTML=ORDER.map((k,i)=>`${i&&i%4===0&&i<12?'<i class="card-break" aria-hidden="true"></i>':''}<button type="button" class="card" data-c="${k}" aria-pressed="false" style="--fighter-color:${CH[k].col}"><img src="${av(`assets/faces/${k}_face.webp`)}" alt=""><b>${CH[k].name}</b></button>`).join('');
  $('cards').querySelectorAll('.card').forEach(card=>card.onclick=()=>{initAudio();playBgm('menu');sfx.sel();chooseCharacter(card.dataset.c)});
  $('stages').innerHTML=STAGES.map(s=>`<div class="stg" data-s="${s.id}"><img src="${av(`assets/thumbnails/th_${s.id}.jpg`)}" alt=""><span>${s.name}</span></div>`).join('');
  $('go').onclick=()=>{initAudio();unlockVids();streak=0;if(net){if(!net.ok||!canPickCharacter(pick))return;net.pk=pick;syncCharacterPicker();netSend({t:'pick',c:pick});$('go').disabled=true;$('go').textContent='상대를 기다리는 중';netTry()}else if(practice)startPractice();else roulette()};
  $('best').textContent=best?('최고 연승 '+best):'상대와 스테이지는 주사위로 정해집니다';
}
function toSelect(){
  mode='menu';show('sSel');playBgm('menu');
  $('selectMode').textContent=net?.match?.kind==='ranked'?'랭킹대전':net?.match?'일반대전':net?'친선대전':'CPU 대전';
  $('opponentRole').textContent=net?'PLAYER 2':'PLAYER 2 · CPU';
  syncCharacterPicker();
  $('go').disabled=!pick;
  $('go').textContent='READY!';
  $('best').textContent=best?('최고 연승 '+best):'상대와 스테이지는 주사위로 정해집니다';
}
let rtm=[];
function later(f,ms){const id=setTimeout(f,ms);rtm.push(id);return id}
function roulette(){
  rtm.forEach(clearTimeout);rtm=[];mode='menu';show('sVs');playBgm('menu');
  $('vsP').src=av('assets/faces/'+pick+'_face.webp');$('vsPn').textContent=CH[pick].name;$('vsPn').style.color=CH[pick].col;
  $('vsCn').textContent='?';$('vsCn').style.color='';$('vsMsg').textContent='상대를 뽑는 중';$('dice').classList.add('roll');
  document.querySelectorAll('.stg').forEach(s=>s.classList.remove('on'));
  let pool=ORDER.filter(k=>k!==pick); const cand=pool.filter(k=>k!==lastOpp||Math.random()<.34);
  const fin=cand[Math.floor(Math.random()*cand.length)]||pool[0];
  const n=16+Math.floor(Math.random()*3); let t=0,idx=Math.floor(Math.random()*pool.length);
  for(let i=0;i<=n;i++){ const last=i===n; t+=30+Math.pow(i/n,2.6)*170;
    later(()=>{ idx=(idx+1)%pool.length; const k=last?fin:pool[idx]; const f=$('vsCf'); $('vsC').src=av('assets/faces/'+k+'_face.webp'); $('vsCn').textContent=CH[k].name; $('vsCn').style.color=CH[k].col;
      f.classList.remove('tumble','lock'); void f.offsetWidth; f.classList.add(last?'lock':'tumble'); last?sfx.lock():sfx.tick();
      if(last){opp=fin;lastOpp=fin;ensureCuts([pick,fin]);$('vsMsg').textContent='스테이지를 뽑는 중';later(stageSpin,210)} },t) }
}
function stageSpin(){
  const els=[...document.querySelectorAll('.stg')]; const N=STAGES.length,fin=STAGES[window.__stg]?window.__stg:Math.floor(Math.random()*N);
  const n=16, start=(fin-n+N)%N; let t=0;
  for(let i=0;i<=n;i++){ const last=i===n; t+=35+Math.pow(i/n,2.4)*120;
    later(()=>{ const j=(start+i)%N; els.forEach((e,q)=>e.classList.toggle('on',q===j)); last?sfx.lock():sfx.tick();
      if(last){stage=STAGES[fin];needBg(stage);$('dice').classList.remove('roll');$('vsMsg').textContent=CH[pick].name+' vs '+CH[opp].name+' · '+stage.name;later(()=>beginWhenReady([pick,opp],startMatch),550)} },t) }
}
function result(win){
  const mine=net?ME():P;playCeremony((win?mine:(mine===P?C:P)).ch);
  dropResult=false;$('resA').style.display='';resultOnline=!!net;
  lastOnlineKind=net?.match?.kind || null;
  lastOnlineMatch=net?.match?.id || null;
  mode='menu';if(bgm)setMusicGain(.2);show('sRes');
  if(net){if(net.host){if(net.match)netSnap();netSend({t:'res',w:win})}win?sfx.win():sfx.lose();$('resT').textContent=win?'YOU WIN':'YOU LOSE';$('resT').className='big '+(win?'win':'lose');$('resS').textContent=net.match?'일반대전':'온라인 대전';$('resA').textContent=net.match?'다시 매칭':'한 판 더';$('resB').textContent='방 나가기';if(net.match)matchResult(net,win);return}
  $('resB').textContent='캐릭터 변경';
  if(win){streak++; if(streak>best){best=streak;try{localStorage.setItem('wqre_best',best)}catch(e){}} sfx.win();
    $('resT').textContent='YOU WIN';$('resT').className='big win';$('resS').textContent=streak+'연승 중 · 다음 상대는 조금 더 강합니다';$('resA').textContent='다음 상대 뽑기'}
  else{sfx.lose();$('resT').textContent='YOU LOSE';$('resT').className='big lose';$('resS').textContent=(streak?streak+'연승에서 멈췄습니다 · ':'')+'최고 연승 '+best;streak=0;$('resA').textContent='다시 도전'}
}
$('resA').onclick=()=>{initAudio();unlockVids();if(lastOnlineKind){const kind=lastOnlineKind;resultOnline=false;netClose();toMenu('multi');startQueue(kind)}else if(net){toSelect();netLobby()}else if(resultOnline||dropResult){resultOnline=dropResult=false;toMenu('friend');onlineMessage('친선대전','상대가 방을 나갔어요.')}else roulette()};
$('resB').onclick=()=>{initAudio();streak=0;if(net||dropResult||resultOnline){dropResult=resultOnline=false;netLeave();toMenu('multi')}else toSelect()};
function startPractice(){
  opp='D';
  stage=STAGES[Math.floor(Math.random()*STAGES.length)];
  beginWhenReady([pick,opp],()=>{startMatch();syncBack()});
}
