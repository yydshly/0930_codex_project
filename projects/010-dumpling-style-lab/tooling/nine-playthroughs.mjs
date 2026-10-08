// Play the production rules using only supported commands and time steps.
import {freshNine,commandNine,stepNine,foldConnected,coverage,relaySolution} from '../web/showcase-nine-rules.js';
export function playNine(id){
 const s=freshNine(id),initial=structuredClone(s);let progress=null;
 const take=()=>{if(!progress)progress=structuredClone(s)};
 const cmd=(name,arg)=>commandNine(s,name,arg);
 const wait=(seconds,drive={x:0,y:0})=>{for(let t=0;t<seconds;t+=.025)stepNine(s,Math.min(.025,seconds-t),drive)};
 const until=(predicate,max=2400,drive={x:0,y:0})=>{for(let n=0;n<max&&!predicate()&&s.phase==='play';n++)stepNine(s,.025,drive);if(!predicate())throw new Error(id+': playthrough stalled '+JSON.stringify(s));};
 if(id==='hook'){
  cmd('attach');let stage=0;
  for(let n=0;n<500&&!s.won;n++){
   if(stage===0&&s.p.x>385){cmd('anchor',1);cmd('attach');stage=1;take()}
   if(stage===1&&s.p.x>680){cmd('anchor',2);cmd('attach');cmd('reel');cmd('reel');stage=2}
   if(stage===2&&s.p.x>865){cmd('release');stage=3}
   stepNine(s,.025,{x:stage===3?-1:1,y:0});
  }
 }
 if(id==='fold'){
  for(let n=0;n<7;n++){
   let turns=0;while(!foldConnected(s)&&turns++<4){cmd('rotate',1);until(()=>s.yaw===s.targetYaw,120)}
   if(!cmd('walk'))throw new Error('Disconnected walk at '+s.node);
   until(()=>!s.walk,80);if(s.node===3)take();
  }
 }
 if(id==='repair'){
  cmd('cover');cmd('clean');for(let i=0;i<3;i++){cmd('select',i);while(s.parts[i].angle)cmd('rotate');cmd('move',{x:553,y:323});cmd('place');if(i===1)take()};cmd('test');
 }
 if(id==='delve'){for(let i=0;i<20;i++){cmd('dig',2);if(s.p.y===10)take()}}
 if(id==='cluster'){
  for(let n=0;n<28&&!s.won;n++){
   const items=s.items.filter(v=>!v.taken&&v.size<=s.radius*1.2).sort((a,b)=>Math.hypot(a.x-s.p.x,a.y-s.p.y)-Math.hypot(b.x-s.p.x,b.y-s.p.y));
   if(!items.length)throw new Error('No eligible collectible');const item=items[0];cmd('target',item);until(()=>item.taken,240);if(s.collected>=12)take();
  }
 }
 if(id==='paint'){
  const targets=[{x:205,y:128},{x:920,y:128},{x:920,y:236},{x:205,y:236},{x:205,y:344},{x:920,y:344},{x:920,y:452},{x:205,y:452}];
  for(const target of targets){if(s.won)break;cmd('target',target);for(let n=0;n<650&&!s.won&&Math.hypot(s.p.x-target.x,s.p.y-target.y)>5;n++){
   if(s.ink<18){cmd('target',{...s.p});cmd('swim');wait(2.8);cmd('swim');cmd('target',target)}
   stepNine(s,.025);if(coverage(s)>30)take();
  }}
 }
 if(id==='swarm'){
  cmd('dispatch');cmd('select',1);cmd('dispatch');until(()=>s.bridge===1,1000);take();until(()=>s.workers.filter(w=>w.job<0).length>=6,1000);cmd('select',2);cmd('dispatch');until(()=>s.won,1800);
 }
 if(id==='kitchen'){
  const station=i=>{cmd('station',i);until(()=>Math.hypot(s.p.x-s.target.x,s.p.y-s.target.y)<3,300)};
  for(let i=0;i<3;i++){station(0);cmd('work');station(1);cmd('work');cmd('work');cmd('work');station(2);cmd('work');wait(4.1);if(i===0)take();cmd('work');station(3);cmd('work')}
 }
 if(id==='relay'){
  cmd('role');take();cmd('role');const [wire,dial,button]=relaySolution(s);cmd('wire',wire);for(let i=0;i<dial;i++)cmd('dial');cmd('verify');for(let i=0;i<button;i++)cmd('button');cmd('verify');
 }
 if(!s.won)throw new Error(id+': normal play did not complete '+JSON.stringify(s));
 return {initial,progress:progress||structuredClone(s),complete:structuredClone(s)};
}
