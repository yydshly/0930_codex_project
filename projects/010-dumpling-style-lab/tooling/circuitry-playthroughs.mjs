import {freshCircuitry,commandCircuitry,stepCircuitry,SCRAMBLE,RADIO_CHANNELS} from '../web/showcase-circuitry-rules.js';
export const IDS=['prismcube','orbiter','automata','receiver'];
export function advance(s,seconds){for(let t=0;t<seconds-1e-7;t+=1/60)stepCircuitry(s,Math.min(1/60,seconds-t));}
export function playCircuitry(id){const s=freshCircuitry(id),snapshots={initial:structuredClone(s)},cmd=(k,v)=>{if(!commandCircuitry(s,k,v))throw Error(id+' rejected '+k);};
 if(id==='prismcube'){for(const [i,t] of [...SCRAMBLE].reverse().entries()){cmd('twist',{face:t.face,dir:-t.dir});advance(s,.4);if(i===1)snapshots.progress=structuredClone(s);}}
 if(id==='orbiter'){cmd('launch');let i=0;while(!s.won&&!s.failed&&i++<2400){const next=s.enemies.slice().sort((a,b)=>b.r-a.r)[0];if(s.elapsed>=4&&next&&s.lane!==next.lane)cmd('lane',next.lane);advance(s,1/60);if(!snapshots.progress&&s.elapsed>=4.04&&s.enemies.length>=2)snapshots.progress=structuredClone(s);}}
 if(id==='automata'){cmd('select',0);cmd('place',{x:3,y:2});cmd('launch');advance(s,2.1);snapshots.progress=structuredClone(s);advance(s,43);}
 if(id==='receiver'){cmd('launch');for(let i=0;i<3;i++){cmd('channel',i);cmd('frequency',RADIO_CHANNELS[i].frequency);cmd('phase',RADIO_CHANNELS[i].phase);cmd('width',.35);advance(s,1.3);if(i===1)snapshots.progress=structuredClone(s);cmd('capture');}}
 snapshots.complete=structuredClone(s);if(!s.won)throw Error(id+' unfinished '+JSON.stringify(s));return {s,snapshots};}
