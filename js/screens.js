'use strict';
/* ---------- screens ---------- */
let pick=null,opp=null,stage=null,streak=0,best=0,lastOpp=null,resultOnline=false;
try{best=+(localStorage.getItem('wqre_best')||0)}catch(e){}
function show(id){const b=$('snd');if(id){b.classList.remove('in');document.body.appendChild(b)}else{b.classList.add('in');$('stage').appendChild(b)}['sTitle','sMenu','sSel','sVs','sRes'].forEach(s=>$(s).classList.toggle('show',s===id));if(typeof syncBack==='function')syncBack()}
function chooseCharacter(id){
  if(net?.pk)return;
  pick=id;
  pvT=performance.now();
  syncCharacterPicker();
  $('go').disabled=false;
  $('go').textContent='준비 완료';
}
function syncCharacterPicker(){
  const family=BASE_CHARACTER[pick];
  const variants=family?FAMILIES[family]:[];
  document.querySelectorAll('.card').forEach(card=>{
    const selected=card.dataset.c===family;
    card.classList.toggle('sel',selected);
    card.setAttribute('aria-pressed',String(selected));
  });
  const row=$('variants');
  row.hidden=variants.length<2;
  row.innerHTML='';
  for(const id of variants){
    const button=document.createElement('button');
    button.type='button';
    button.className='btn ghost';
    button.textContent=id===family?CH[id].name+' 기본':CH[id].name;
    button.classList.toggle('sel',id===pick);
    button.setAttribute('aria-pressed',String(id===pick));
    button.onclick=()=>{sfx.sel();chooseCharacter(id);row.querySelector('[aria-pressed="true"]').focus()};
    row.appendChild(button);
  }
  $('pvN').textContent=pick?CH[pick].name:'';
  $('pvN').style.color=pick?CH[pick].col:'';
}
function buildSelect(){
  $('cards').innerHTML=Object.keys(FAMILIES).map(k=>`<button class="card" data-c="${k}" aria-pressed="false"><img src="${av(`assets/faces/${k}_face.webp`)}" alt=""><b style="color:${CH[k].col}">${CH[k].name}</b></button>`).join('');
  document.querySelectorAll('.card').forEach(card=>card.onclick=()=>{initAudio();playBgm('menu');sfx.sel();chooseCharacter(card.dataset.c);if(net)net.pk=null});
  $('stages').innerHTML=STAGES.map(s=>`<div class="stg" data-s="${s.id}"><img src="${av(`assets/thumbnails/th_${s.id}.jpg`)}" alt=""><span>${s.name}</span></div>`).join('');
  $('go').onclick=()=>{initAudio();unlockVids();streak=0;if(net){if(!net.ok||!pick)return;net.pk=pick;netSend({t:'pick',c:pick});$('go').disabled=true;$('go').textContent='상대를 기다리는 중';netTry()}else roulette()};
  $('best').textContent=best?('최고 연승 '+best):'';
}
let pvT=0;function pvLoop(t){requestAnimationFrame(pvLoop);if(!$('sSel').classList.contains('show'))return;const c=$('pv'),x=c.getContext('2d'),W=c.width,H=c.height;x.clearRect(0,0,W,H);
  const k=pick,col=k?CH[k].col:'#8f88c9',g=x.createRadialGradient(W/2,H*.5,10,W/2,H*.5,W*.5);g.addColorStop(0,col+'66');g.addColorStop(1,col+'00');x.fillStyle=g;x.fillRect(0,0,W,H);
  x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(W/2,H-34,W*.26,16,0,0,6.283);x.fill();
  if(!k){x.fillStyle='#8f88c9';x.font="900 200px 'Bungee',sans-serif";x.textAlign='center';x.fillText('?',W/2,H*.68);return}
  const im=IMG[k],el=(t-pvT)/1000,fr=META[k].frames[el<.7?'win':'idle'];if(!im||!fr)return;const s=Math.min((H-70)/fr[3],(W-30)/fr[2]),pop=el<.25?.86+.14*(el/.25):1,bob=Math.sin(t/420)*5,w=fr[2]*s*pop,h=fr[3]*s*pop;
  x.drawImage(im,...srcRect(im,fr),W/2-w/2,H-38-h+bob,w,h)}
requestAnimationFrame(pvLoop);
function toSelect(){mode='menu';show('sSel');if(!net)netUI();playBgm('menu');$('best').textContent=best?('최고 연승 '+best):''}
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
  for(let i=0;i<=n;i++){ const last=i===n; t+=60+Math.pow(i/n,2.6)*340;
    later(()=>{ idx=(idx+1)%pool.length; const k=last?fin:pool[idx]; const f=$('vsCf'); $('vsC').src=av('assets/faces/'+k+'_face.webp'); $('vsCn').textContent=CH[k].name; $('vsCn').style.color=CH[k].col;
      f.classList.remove('tumble','lock'); void f.offsetWidth; f.classList.add(last?'lock':'tumble'); last?sfx.lock():sfx.tick();
      if(last){opp=fin;lastOpp=fin;$('vsMsg').textContent='스테이지를 뽑는 중';later(stageSpin,420)} },t) }
}
function stageSpin(){
  const els=[...document.querySelectorAll('.stg')]; const N=STAGES.length,fin=Math.floor(Math.random()*N); const n=N+fin; let t=0;
  for(let i=0;i<=n;i++){ const last=i===n; t+=70+Math.pow(i/n,2.4)*240;
    later(()=>{ const j=last?fin:i%N; els.forEach((e,q)=>e.classList.toggle('on',q===j)); last?sfx.lock():sfx.tick();
      if(last){stage=STAGES[window.__stg!==undefined?window.__stg:fin];$('dice').classList.remove('roll');$('vsMsg').textContent=CH[pick].name+' vs '+CH[opp].name+' · '+stage.name;later(startMatch,1100)} },t) }
}
function result(win){
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

