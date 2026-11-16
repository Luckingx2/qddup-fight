// 브라우저 없이 전투 로직만 돌리는 도구: node sim.js <게임폴더> <시험파일>
const fs=require('fs'),vm=require('vm'),root=process.argv[2];
const any=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>0:k==='then'?undefined:k==='length'?0:any(),apply:()=>any(),construct:()=>any(),set:()=>true});
const base={console,Math,JSON,Object,Array,String,Number,Boolean,Date,Map,Set,WeakSet,WeakMap,Promise,Symbol,Error,parseInt,parseFloat,isNaN,Infinity,NaN,URLSearchParams,process,
 setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},clearInterval(){},requestAnimationFrame(){},performance:{now:()=>0},
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{search:'',href:'',hash:''},navigator:{userAgent:''},addEventListener(){},
 Audio:function(){return any()},Image:function(){return {}},fetch:()=>new Promise(()=>{}),devicePixelRatio:1,innerWidth:960,innerHeight:540,AudioContext:undefined,webkitAudioContext:undefined};
const ctx=new Proxy(base,{has:()=>true,get:(t,k)=>k in t?t[k]:(k===Symbol.unscopables?undefined:(typeof k==='string'&&/^(undefined)$/.test(k)?undefined:(t.__strict&&typeof k==='string'&&!t.__seen?.has(k)?any():any())))});
base.window=ctx;base.globalThis=ctx;base.document=any();
vm.createContext(ctx);
let src='';for(const f of['data','fight','ai','update'])src+=fs.readFileSync(root+'/js/'+f+'.js','utf8').replace("'use strict';",'')+'\n;';
src+=fs.readFileSync(process.argv[3],'utf8');
vm.runInContext(src,ctx,{filename:'game'});
