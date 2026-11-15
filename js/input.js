'use strict';
/* ---------- input ---------- */
const held={l:0,r:0,up:0,down:0},buf={p:0,k:0,s:0,t:0,g:0};
let KM={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyZ:'p',KeyJ:'p',KeyX:'k',KeyK:'k',KeyC:'s',KeyL:'s',KeyV:'t',Semicolon:'t',KeyG:'g'};
addEventListener('keydown',e=>{if(mode!=='fight'||audioSettings.open||e.isComposing||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input, textarea, select, [contenteditable]'))return;const k=KM[e.code];if(!k)return;e.preventDefault();if(k in held)held[k]=1;else if(!e.repeat)buf[k]=.16});
addEventListener('keyup',e=>{const k=KM[e.code];if(k&&k in held)held[k]=0});
document.querySelectorAll('.pb[data-k]').forEach(b=>{
  const dn=e=>{e.preventDefault();initAudio();buf[b.dataset.k]=.16;b.classList.add('on')},up=e=>{e.preventDefault();b.classList.remove('on')};
  b.addEventListener('pointerdown',dn);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
(function(){const d=$('dpad'),kn=$('knob');let pid=null;
  function upd(e){const r=d.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);
    held.l=dx<-.24?1:0;held.r=dx>.24?1:0;held.up=dy<-.5?1:0;held.down=dy>.5?1:0;
    const m=Math.min(1,Math.hypot(dx,dy))||1,a=Math.atan2(dy,dx);kn.style.transform=`translate(${Math.cos(a)*m*70}%,${Math.sin(a)*m*70}%)`}
  function end(e){if(e.pointerId!==pid)return;pid=null;held.l=held.r=held.up=held.down=0;kn.style.transform=''}
  d.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();pid=e.pointerId;try{d.setPointerCapture(pid)}catch(_){ }upd(e)});
  d.addEventListener('pointermove',e=>{if(e.pointerId===pid)upd(e)});d.addEventListener('pointerup',end);d.addEventListener('pointercancel',end)})();
$('app').addEventListener('contextmenu',e=>e.preventDefault());
/* iOS Safari: stop double-tap / pinch zoom on the play area, and clear stuck inputs */
(function(){const app=$('app'),opt={passive:false},pv=e=>{if(e.cancelable)e.preventDefault()};
  ['touchstart','touchmove','touchend'].forEach(t=>app.addEventListener(t,pv,opt));
  ['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,pv,opt));
  app.addEventListener('dblclick',pv,opt);
  let lt=0;document.addEventListener('touchend',e=>{const n=Date.now();if(n-lt<350&&!(e.target.closest&&e.target.closest('.scr')))pv(e);lt=n},opt);
  const reset=()=>{held.l=held.r=held.up=held.down=0;for(const key in buf)buf[key]=0;document.querySelectorAll('.pb.on').forEach(b=>b.classList.remove('on'));$('knob').style.transform=''};
  addEventListener('blur',reset);addEventListener('pagehide',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
  $('dpad').addEventListener('lostpointercapture',reset)})();

