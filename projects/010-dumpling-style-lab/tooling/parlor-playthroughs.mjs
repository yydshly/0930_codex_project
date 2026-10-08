import {freshParlor,commandParlor,stepParlor} from '../web/showcase-parlor-rules.js';
export const IDS=['cascade','patience','lexicon'];
export function advance(s,seconds){for(let t=0;t<seconds-1e-7;t+=1/60)stepParlor(s,Math.min(1/60,seconds-t));}
export function playParlor(id){const s=freshParlor(id),snapshots={initial:structuredClone(s)},cmd=(k,v)=>{if(!commandParlor(s,k,v))throw Error(id+' rejected '+k+' '+JSON.stringify(v)+' '+s.message);},pick=(col)=>cmd('select',{source:'column',col}),home=(col,suit)=>{pick(col);cmd('move',{type:'foundation',col:suit});advance(s,.32);},pile=(from,to)=>{pick(from);cmd('move',{type:'column',col:to});advance(s,.32);},drawHome=suit=>{cmd('draw');cmd('select',{source:'waste'});cmd('move',{type:'foundation',col:suit});advance(s,.2);};
 if(id==='cascade'){cmd('launch');for(let n=0;n<2;n++){for(let x=0;x<3;x++)cmd('move',1);cmd('drop');advance(s,.3);if(n===0){advance(s,.7);snapshots.progress=structuredClone(s);}}}
 if(id==='patience'){for(let col=0;col<4;col++)home(col,col);pile(3,0);pile(3,2);for(const suit of [0,1,2,3,0,2,3])drawHome(suit);home(3,1);home(2,1);snapshots.progress=structuredClone(s);pile(2,3);home(2,0);for(const suit of [2,3,3])drawHome(suit);home(1,1);home(0,2);home(3,0);}
 if(id==='lexicon'){for(const word of ['CRANE','BLOOM','SHORE']){cmd('draft',word);cmd('guess');advance(s,.9);if(word==='BLOOM')snapshots.progress=structuredClone(s);}}
 snapshots.complete=structuredClone(s);if(!s.won)throw Error(id+' unfinished '+JSON.stringify(s));return {s,snapshots};}
