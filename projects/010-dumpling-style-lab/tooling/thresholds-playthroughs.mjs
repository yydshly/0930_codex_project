import {freshThresholds,commandThresholds,stepThresholds,NOTE_FREQUENCIES} from '../web/showcase-thresholds-rules.js';
export const IDS=['inverter','phasewalk','transit','cantor'];
export function advance(s,seconds,input={}){for(let t=0;t<seconds-1e-7;t+=1/60)stepThresholds(s,Math.min(1/60,seconds-t),input);}
export function playThresholds(id){const s=freshThresholds(id),snapshots={initial:structuredClone(s)},cmd=(k,v)=>{if(!commandThresholds(s,k,v))throw Error(id+' rejected '+k);},move=x=>advance(s,x/180,{x:1});
 if(id==='inverter'){cmd('flip');advance(s,1.2);move(285);cmd('flip');advance(s,1.25,{x:1});snapshots.progress=structuredClone(s);move(40);cmd('flip');advance(s,1.2);move(340);}
 if(id==='phasewalk'){move(80);cmd('jump');advance(s,.95,{x:1});move(29);cmd('jump');advance(s,.27,{x:1});cmd('swap');advance(s,.65,{x:1});move(35);cmd('jump');advance(s,.25,{x:1});cmd('swap');advance(s,.65,{x:1});snapshots.progress=structuredClone(s);move(48);cmd('swap');advance(s,.8,{x:1});advance(s,.5,{x:1});}
 if(id==='transit'){cmd('entry',2);cmd('exit',2);cmd('launch');advance(s,.9,{x:1});advance(s,.65);snapshots.progress=structuredClone(s);advance(s,1.5);advance(s,2,{x:1});}
 if(id==='cantor'){cmd('launch');for(let i=0;i<3;i++){cmd('tone',NOTE_FREQUENCIES[i]);let n=0;while(!s.orbs[i]&&!s.failed&&n++<600)advance(s,1/60);if(i===1)snapshots.progress=structuredClone(s);}advance(s,2);cmd('tone',0);}
 snapshots.complete=structuredClone(s);if(!s.won)throw Error(id+' unfinished '+JSON.stringify(s));return {s,snapshots};}
if(import.meta.url===new URL(process.argv[1],'file:///').href){for(const id of IDS)console.log(id,playThresholds(id).s.won);}
