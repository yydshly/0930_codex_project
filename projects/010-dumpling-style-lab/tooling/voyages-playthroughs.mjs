import {freshVoyages,commandVoyages,stepVoyages,PAPER_ANCHORS,PANORAMA_TARGETS,LIMB_SOCKETS,TAU,angleDistance} from '../web/showcase-voyages-rules.js';
export const VOYAGES_IDS=['cartographer','tendril','cutout','panorama'];
export function advanceVoyages(s,seconds){for(let t=0;t<seconds-1e-7;t+=1/60)stepVoyages(s,Math.min(1/60,seconds-t))}
export function buildPaper(s,cmd=(k,v)=>commandVoyages(s,k,v)){for(let i=0;i<3;i++){const a=PAPER_ANCHORS[i],b=PAPER_ANCHORS[i+1];cmd('select',i);cmd('move',{x:(a.x+b.x)/2,y:(a.y+b.y)/2});cmd('rotate',Math.atan2(b.y-a.y,b.x-a.x)-s.parts[i].angle);cmd('scale',Math.hypot(a.x-b.x,a.y-b.y)/280-s.parts[i].scale)}}
export function playVoyages(id){const s=freshVoyages(id),snapshots={initial:structuredClone(s)},cmd=(k,v)=>{if(!commandVoyages(s,k,v))throw Error(id+' rejected '+k+' '+JSON.stringify(v))};
 if(id==='cartographer'){cmd('boat');for(const n of [1,2,3,4,5,6,7,0])cmd('node',n);cmd('launch');for(const [i,key] of [[2,'salt'],[5,'reeds'],[7,'masonry']]){for(let n=0;s.running&&n<2000;n++)advanceVoyages(s,.05);if(s.current!==i)throw Error('Map arrival '+s.current);cmd('survey',key);if(i===2)snapshots.progress=structuredClone(s);cmd('launch')}advanceVoyages(s,10)}
 if(id==='tendril'){for(let i=0;i<3;i++){cmd('select',i);cmd('move',s.items[i]);advanceVoyages(s,1.8);cmd('grip');cmd('move',LIMB_SOCKETS[i]);advanceVoyages(s,2.3);cmd('grip');if(i===0)snapshots.progress=structuredClone(s)}}
 if(id==='cutout'){buildPaper(s,cmd);cmd('walk');advanceVoyages(s,4.4);snapshots.progress=structuredClone(s);advanceVoyages(s,8)}
 if(id==='panorama'){cmd('zoom',1.25);for(let i=0;i<3;i++){const p=PANORAMA_TARGETS[i];cmd('look',{x:angleDistance(p.u*TAU,s.yaw),y:(.5-p.v)*Math.PI-s.pitch});cmd('measure');advanceVoyages(s,1.3);if(i===0)snapshots.progress=structuredClone(s)}}
 snapshots.complete=structuredClone(s);if(!s.won)throw Error(id+' not completed '+JSON.stringify(s));return {s,snapshots};}
