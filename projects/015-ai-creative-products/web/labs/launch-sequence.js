// This is a local film timeline, not a source verification or download log.
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=(a,b,k)=>a+(b-a)*k;
export function launchSequence(state,pack,typography){
 const [a,b,c]=state.scenes.map(s=>s.seconds),end=a+b+c,time=Math.max(0,Math.min(end,state.time));
 const handoffStart=a*.24,openingEnd=a*.34,closingStart=a+b+c*.68,foldEnd=a+b+c*.86;
 const target=typography?.dot||{x:640,y:302,r:30};
 let phase='motion',knob=null,input=0,fold=0,close=0;
 if(time<openingEnd){
  const on=ease((time/a-.025)/.18);input=ease((time-handoffStart)/(openingEnd-handoffStart));
  phase=time<a*.025?'idle':input>0?'input-transition':'opening';
  knob={x:mix(mix(456,824,on),target.x,input),y:mix(335,target.y,input),radius:mix(112,target.r,input),on,role:input?'first-record':'activate-input',recordId:input?pack.records[0]?.id||null:null};
 }else if(time<a){
  input=1;phase='input';
  knob={x:target.x,y:target.y,radius:target.r,on:1,role:'first-record',recordId:pack.records[0]?.id||null};
 }else if(time<a+b){phase='motion';}
 else if(time<closingStart){phase=(time-a-b)/c<.30?'sorting':'result';}
 else{
  fold=ease((time-closingStart)/(foldEnd-closingStart));close=ease((time-foldEnd)/(end-foldEnd));
  phase=time<foldEnd?'folding':close<1?'closing':'complete';
  knob={x:mix(mix(530,824,fold),456,close),y:mix(503,335,fold),radius:mix(14,112,fold),on:1-close,role:'retained-result',filename:pack.filename};
 }
 return {time,start:0,end,handoffStart,openingEnd,inputEnd:a,closingStart,foldEnd,phase,input,fold,close,knob,
  operation:{rule:pack.rule,inputCount:pack.inputCount,includedCount:pack.includedCount,mergedCount:pack.mergedCount,pendingCount:pack.pendingCount,filename:pack.filename,resultRetained:true,downloadClaim:false},
  scope:'Time-derived presentation of the real local rule output; no AI verification and no claim that a download has occurred.'};
}
export function launchSequencePlan(state){const [a,b,c]=state.scenes.map(s=>s.seconds);return[
 {start:0,end:a*.24,action:'打开研究',object:'胶囊开关'},
 {start:a*.24,end:a,action:'第一条真实观察成为字标上的橙点',object:'巨大字标 / 同一条输入'},
 {start:a,end:a+b*.4,action:'圆点沿弹性曲线推进',object:'留白中的曲线'},
 {start:a+b*.4,end:a+b*.76,action:'圆点进入有前后层次的环形字',object:'环字'},
 {start:a+b*.76,end:a+b,action:'橙点落在满幅点阵',object:'点阵波'},
 {start:a+b,end:a+b+c*.68,action:'实际记录标记合并与分区，保留完整成果',object:'巨大成果标题 / 实际记录'},
 {start:a+b+c*.68,end:a+b+c,action:'同一成果圆点回到开关，完整文件继续可导出',object:'成果保留 / 关闭研究'}
 ];}
