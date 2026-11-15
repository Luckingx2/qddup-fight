'use strict';
const EMOTE_LEN={1:1.65,8:2,13:2,19:2,22:2.27,28:2.16,33:1.92,34:1.92,36:2,38:2,39:2.42,41:2,45:2,46:2,49:4.5,50:1.8,57:7.23,62:3.69,65:4.83,69:4.5,87:2.42,89:1.92,91:2.42,92:2.42,94:2,95:2,98:6.54};
const EMOTES=Object.keys(EMOTE_LEN).map(Number).sort((a,b)=>a-b).map(n=>({id:'icon_'+n,t:EMOTE_LEN[n]}));
const emoteById=id=>EMOTES.find(e=>e.id===id);
const emoteSrc=id=>av('assets/emotes/'+id+'.webp');
const emoteThumb=id=>av('assets/emotes/thumb/'+id+'.webp');
let emoteSlots=['icon_1','icon_22','icon_28'];
try{const s=JSON.parse(localStorage.getItem('qddup_emotes'));if(Array.isArray(s)&&s.length===3&&s.every(id=>id===''||emoteById(id)))emoteSlots=s}catch(e){}
const emoteCache={};
function preloadEmotes(ids){for(const id of ids)if(id&&emoteById(id)&&!emoteCache[id]){const im=new Image();im.decoding='async';im.src=emoteSrc(id);emoteCache[id]=im}}
preloadEmotes(emoteSlots);

function emoteFace(id,lazy){
  const el=document.createElement('span');el.className='emoFace';
  if(!emoteById(id))return el;
  const i=document.createElement('img');i.alt='';i.draggable=false;if(lazy)i.loading='lazy';i.src=emoteThumb(id);el.append(i);
  return el;
}
function emotePop(left,id){
  const box=$(left?'emoL':'emoR');if(!box)return;
  if(!id){box.classList.remove('show');box.replaceChildren();return}
  const i=document.createElement('img');i.alt='';i.draggable=false;i.src=emoteSrc(id);
  box.style.setProperty('--t',emoteById(id).t+'s');
  box.classList.remove('show');box.replaceChildren(i);void box.offsetWidth;box.classList.add('show');
}
function setEmote(f,id){
  if(!f||!emoteById(id))return false;
  if(f.emo&&f.emo.t>0)return false;
  f.emo={id,t:emoteById(id).t};emotePop(f===P,id);
  return true;
}
function sendEmote(i){
  if(mode!=='fight'||!P)return;
  const id=emoteSlots[i];if(!id)return;
  const me=net?ME():P;
  if(!setEmote(me,id))return;
  if(net)netSend({t:'em',e:id});
}
function recvEmote(id){if(mode!=='fight'||!P||!net)return;const me=ME();setEmote(me===P?C:P,id)}
function tickEmotes(dt){for(const f of [P,C])if(f&&f.emo){f.emo.t-=dt;if(f.emo.t<=0){delete f.emo;emotePop(f===P,null)}}}
function clearEmotes(){for(const f of [P,C])if(f)delete f.emo;emotePop(true,null);emotePop(false,null)}
function shareEmotes(){if(net)netSend({t:'emk',s:emoteSlots})}
function recvEmoteKit(s){if(Array.isArray(s))preloadEmotes(s.slice(0,3).filter(id=>typeof id==='string'))}

let emoteEdit=-1;
function syncEmoteBar(){
  document.querySelectorAll('#emoBar .emo').forEach((b,i)=>{b.replaceChildren(emoteFace(emoteSlots[i]));b.classList.toggle('empty',!emoteSlots[i]);b.setAttribute('aria-label','감정표현 '+(i+1))});
}
function saveEmotes(){try{localStorage.setItem('qddup_emotes',JSON.stringify(emoteSlots))}catch(e){}}
function syncEmoteUI(){
  syncEmoteBar();
  const slots=$('emoSlots'),grid=$('emoGrid');
  if(!slots||!grid)return;
  if(emoteEdit<0||emoteSlots[emoteEdit])emoteEdit=emoteSlots.indexOf('');
  slots.replaceChildren(...emoteSlots.map((id,i)=>{const b=document.createElement('button');b.type='button';b.className='emoSlot'+(id?'':' empty')+(i===emoteEdit?' on':'');b.setAttribute('aria-label',id?(i+1)+'번 감정표현 빼기':(i+1)+'번 빈칸');b.append(emoteFace(id));const k=document.createElement('b');k.textContent=i+1;b.append(k);b.onclick=()=>{if(id){emoteSlots[i]='';saveEmotes();emoteEdit=i}else emoteEdit=i;syncEmoteUI()};return b}));
  if(!grid.childElementCount)grid.replaceChildren(...EMOTES.map(e=>{const b=document.createElement('button');b.type='button';b.className='emoPick';b.dataset.id=e.id;b.append(emoteFace(e.id,true));b.onclick=()=>pickEmote(e.id);return b}));
  grid.querySelectorAll('.emoPick').forEach(b=>{const n=emoteSlots.indexOf(b.dataset.id);b.classList.toggle('on',n>=0);b.dataset.n=n>=0?n+1:''});
}
function pickEmote(id){
  if(emoteSlots.includes(id))return;
  const at=emoteEdit>=0&&!emoteSlots[emoteEdit]?emoteEdit:emoteSlots.indexOf('');
  if(at<0)return;
  emoteSlots[at]=id;saveEmotes();
  preloadEmotes([id]);
  emoteEdit=-1;
  syncEmoteUI();
}
document.querySelectorAll('#emoBar .emo').forEach((b,i)=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();b.classList.add('on');sendEmote(i)});
  const up=()=>b.classList.remove('on');
  b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);
});
addEventListener('keydown',e=>{
  if(mode!=='fight'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input, textarea, select, [contenteditable]'))return;
  const i=['Digit1','Digit2','Digit3'].indexOf(e.code);
  if(i<0)return;
  e.preventDefault();sendEmote(i);
});
syncEmoteBar();
