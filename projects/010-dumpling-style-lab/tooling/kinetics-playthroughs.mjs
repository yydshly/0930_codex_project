import {freshKinetics,commandKinetics,stepKinetics,WIND_ROUTE,SCALE} from '../web/showcase-kinetics-rules.js';
export const IDS=['ribbon','rescue','rewind','nested'];
export function advance(s,seconds,input={}){for(let t=0;t<seconds-1e-7;t+=1/60)stepKinetics(s,Math.min(1/60,seconds-t),input);}
export function traceWind(s,cmd=(k,v)=>commandKinetics(s,k,v)){cmd('begin',WIND_ROUTE[0]);for(const p of WIND_ROUTE.slice(1))cmd('stroke',p);cmd('end');}
export function arrangeNested(s,cmd=(k,v)=>commandKinetics(s,k,v)){for(let i=0;i<2;i++){cmd('select',i);cmd('begin');cmd('move',{mx:(i?1.35:-1.35)/SCALE,mz:0});cmd('rotate',-Math.PI/2);}}
export function playKinetics(id){const s=freshKinetics(id),snapshots={initial:structuredClone(s)},cmd=(k,v)=>{if(!commandKinetics(s,k,v))throw Error(id+' rejected '+k+' '+JSON.stringify(v));};
 if(id==='ribbon'){traceWind(s,cmd);cmd('launch');advance(s,3.1);snapshots.progress=structuredClone(s);advance(s,7);}
 if(id==='rescue'){cmd('release');advance(s,5);cmd('select',0);cmd('skill','builder');advance(s,6);snapshots.progress=structuredClone(s);let attempts=0;while(!s.failed&&Math.abs(s.workers[0].x-805)>=48&&attempts++<3000)advance(s,.05);cmd('select',0);cmd('skill','digger');advance(s,70);}
 if(id==='rewind'){advance(s,(650-105)/180,{x:1});advance(s,1.5);cmd('interact');snapshots.progress=structuredClone(s);cmd('rewind',true);let n=0;while(s.world.player.x>183&&n++<300)advance(s,1/60);cmd('rewind',false);cmd('interact');advance(s,5,{x:1});cmd('interact');advance(s,.5,{x:1});}
 if(id==='nested'){arrangeNested(s,cmd);cmd('mode','walk');advance(s,2.5,{x:1});snapshots.progress=structuredClone(s);advance(s,4,{x:1});}
 snapshots.complete=structuredClone(s);if(!s.won)throw Error(id+' unfinished '+JSON.stringify(s));return {s,snapshots};
}
