const {spawn}=require('node:child_process');
const args=process.argv.slice(2);
const value=(name,fallback)=>args[args.indexOf(name)+1]&&args.includes(name)?args[args.indexOf(name)+1]:fallback;
const proc=spawn('python3',['-m','http.server',value('--port','4173'),'--bind',value('--host','0.0.0.0')],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>proc.kill(signal));
proc.on('exit',code=>process.exit(code??0));
