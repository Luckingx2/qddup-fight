'use strict';
const KEYMAPS={
  A:{ArrowLeft:'l',ArrowRight:'r',ArrowUp:'up',ArrowDown:'down',KeyZ:'p',KeyX:'k',KeyC:'s',KeyV:'t',KeyG:'g'},
  B:{KeyA:'l',KeyD:'r',KeyW:'up',KeyS:'down',KeyJ:'p',KeyK:'k',KeyL:'s',Semicolon:'t',KeyG:'g'}
};
const KEYCAPS={A:{u:'↑',d:'↓',l:'←',r:'→',p:'Z',k:'X',s:'C',t:'V',g:'G'},B:{u:'W',d:'S',l:'A',r:'D',p:'J',k:'K',s:'L',t:';',g:'G'}};
let ctrlType='A';
try{if(localStorage.getItem('qddup_ctrl')==='B')ctrlType='B'}catch(e){}
KM=KEYMAPS[ctrlType];

function setCtrlType(t){
  if(!KEYMAPS[t])return;
  ctrlType=t;KM=KEYMAPS[t];
  for(const k in held)held[k]=0;
  try{localStorage.setItem('qddup_ctrl',t)}catch(e){}
  syncCtrlUI();
}
function fillCaps(root,t){root.querySelectorAll('[data-c]').forEach(el=>{const b=el.querySelector('b')||el;b.textContent=KEYCAPS[t][el.dataset.c]})}
function syncCtrlUI(){
  const pk=$('pcKeys');if(pk)fillCaps(pk,ctrlType);
  document.querySelectorAll('.ctrlOpt').forEach(o=>{const on=o.dataset.t===ctrlType;o.classList.toggle('on',on);o.setAttribute('aria-pressed',on);fillCaps(o,o.dataset.t)});
}
document.querySelectorAll('.ctrlOpt').forEach(o=>o.onclick=()=>{sfx.sel();setCtrlType(o.dataset.t)});

const PAD_PARTS=['dpad','bP','bK','bS','bT','bG','emoBar'];
let padLayout={portrait:{},landscape:{}};
try{const s=JSON.parse(localStorage.getItem('qddup_layout'));if(s&&typeof s==='object')padLayout={portrait:s.portrait||{},landscape:s.landscape||{}}}catch(e){}
const padOrient=()=>matchMedia('(orientation:landscape)').matches?'landscape':'portrait';
function saveLayout(){try{localStorage.setItem('qddup_layout',JSON.stringify(padLayout))}catch(e){}}
function applyLayout(){
  const L=padLayout[padOrient()]||{};
  for(const id of PAD_PARTS){
    const el=$(id);if(!el)continue;const p=L[id];
    if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){el.style.left=(p.x*100)+'%';el.style.top=(p.y*100)+'%';el.style.right='auto';el.style.bottom='auto';el.style.translate='-50% -50%'}
    else{el.style.left=el.style.top=el.style.right=el.style.bottom=el.style.translate=''}
  }
}
addEventListener('resize',applyLayout);
matchMedia('(orientation:landscape)').addEventListener?.('change',applyLayout);

let ctrlEditing=false,drag=null;
function startCtrlEdit(){
  ctrlEditing=true;mode='ctrledit';show(null);
  $('pad').classList.add('editing');$('ctrlEdit').hidden=false;$('bG').hidden=false;applyLayout();
  $('stage').style.background='#000 url('+av('assets/backgrounds/bg_'+STAGES[0].id+'.webp')+') center/cover';$('cv').style.visibility='hidden';
}
function endCtrlEdit(){
  if(!ctrlEditing)return;
  ctrlEditing=false;drag=null;
  $('pad').classList.remove('editing');$('ctrlEdit').hidden=true;$('bG').hidden=true;$('stage').style.background='';$('cv').style.visibility='';
  toMenu('settings');setTab('control');
}
$('pad').addEventListener('pointerdown',e=>{
  if(!ctrlEditing)return;
  const el=e.target.closest('#dpad,#bP,#bK,#bS,#bT,#bG,#emoBar');
  e.preventDefault();e.stopPropagation();
  if(!el)return;
  const r=el.getBoundingClientRect();
  drag={el,id:el.id,dx:e.clientX-(r.left+r.width/2),dy:e.clientY-(r.top+r.height/2),hw:r.width/2,hh:r.height/2,pid:e.pointerId};
  el.classList.add('dragging');
},true);
addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pid)return;
  e.preventDefault();
  const R=$('pad').getBoundingClientRect();
  const cx=Math.max(R.left+drag.hw,Math.min(R.right-drag.hw,e.clientX-drag.dx));
  const cy=Math.max(R.top+drag.hh,Math.min(R.bottom-drag.hh,e.clientY-drag.dy));
  const p={x:(cx-R.left)/R.width,y:(cy-R.top)/R.height};
  (padLayout[padOrient()]||(padLayout[padOrient()]={}))[drag.id]=p;
  applyLayout();
},{passive:false});
const endDrag=e=>{if(!drag||e.pointerId!==drag.pid)return;drag.el.classList.remove('dragging');drag=null;saveLayout()};
addEventListener('pointerup',endDrag);addEventListener('pointercancel',endDrag);
function onTap(el,fn){let t=0;el.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();t=performance.now();fn()});el.addEventListener('click',()=>{if(performance.now()-t>700)fn()})}
onTap($('ctrlDone'),()=>{sfx.sel();saveLayout();endCtrlEdit()});
onTap($('ctrlResetOne'),()=>{sfx.sel();padLayout[padOrient()]={};saveLayout();applyLayout()});
$('ctrlEditBtn').onclick=()=>{sfx.sel();startCtrlEdit()};
$('ctrlResetAll').onclick=()=>{sfx.sel();padLayout={portrait:{},landscape:{}};saveLayout();applyLayout();$('ctrlResetAll').textContent='기본 위치로 되돌렸어요';setTimeout(()=>{$('ctrlResetAll').textContent='기본 위치로'},1500)};

syncCtrlUI();
applyLayout();
