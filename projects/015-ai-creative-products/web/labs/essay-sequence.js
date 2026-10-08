// This continuity plan is our editorial interpretation of the observed source imagery.
// Every pose is derived from film time, so seeking and recording use the same sequence.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);},mix=(a,b,p)=>a+(b-a)*p;
export function feedbackAnchor(progress,time){const spread=ease(progress/.18),a=time*.35-Math.PI/2;return {x:640+Math.cos(a)*258*spread,y:367+Math.sin(a)*158*spread};}
export function growthAnchor(progress){const j=120*clamp(progress);return {x:300+j*6.5,y:535-9*(Math.exp(j/32)-1)};}
export function essaySequence(state){
 const seconds=state.seconds,time=clamp(state.time,0,seconds*6),shot=Math.min(5,Math.floor(time/seconds));
 const duration=Math.min(1.1,seconds*.24),half=duration/2,boundary=Math.round(time/seconds);
 const bridge=boundary>0&&boundary<6&&Math.abs(time-boundary*seconds)<=half
  ?{from:boundary-1,to:boundary,progress:clamp((time-boundary*seconds+half)/duration),duration,
    sourceProgress:clamp((time-(boundary-1)*seconds)/seconds),targetProgress:clamp((time-boundary*seconds)/seconds)}:null;
 const labels={3:'命题档案 → 边界检验',4:'检验记录 → 反馈循环',5:'反馈记录 → 流程积累'};
 const progress=clamp((time-shot*seconds)/seconds),u=bridge?ease(bridge.progress):0;
 let paper=shot===2?{x:650,y:311+(1-ease(progress/.23))*42,scale:1}:shot===3?{x:150,y:355,scale:.36}:null;
 let record=shot===3&&progress>.6?{x:645,y:380,role:'边界检验记录'}:shot===4?{...feedbackAnchor(progress,time),role:'循环中的检验记录'}:shot===5?{...growthAnchor(progress),role:'可复用流程的积累'}:null;
 if(bridge?.to===3)paper={x:mix(650,150,u),y:mix(311,355,u),scale:mix(1,.36,u)};
 if(bridge?.to===4){const target=feedbackAnchor(bridge.targetProgress,time);record={x:mix(645,target.x,u),y:mix(380,target.y,u),role:'检验记录送回反馈循环'};}
 if(bridge?.to===5){const source=feedbackAnchor(bridge.sourceProgress,time),target=growthAnchor(bridge.targetProgress);record={x:mix(source.x,target.x,u),y:mix(source.y,target.y,u),role:'反馈记录接到流程曲线'};}
 return {shot,progress,local:time-shot*seconds,bridge,paper,record,
  continuity:bridge?{from:bridge.from+1,to:bridge.to+1,progress:Number(bridge.progress.toFixed(4)),role:labels[boundary]||'相邻论证镜头接续'}:null};
}
export const essayContinuityPlan=Object.freeze([
 {from:3,to:4,role:'命题纸页留在检验旁，第二段条件进入墙镜头'},
 {from:4,to:5,role:'同一金色记录点把检验送入制作、检查、调整循环'},
 {from:5,to:6,role:'记录点接到可复用流程曲线的起点，继续沿曲线积累'}
]);
