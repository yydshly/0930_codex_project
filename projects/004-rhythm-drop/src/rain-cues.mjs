import {scoreFor} from './stories.mjs';
import {ease} from './direction.mjs';

// Bell note onsets are the shared source for sound, water impacts and light.
// This is authored score synchronization, not analysis of an imported song.
export function rainCues(beat){
  const b=Math.max(0,Math.min(64,beat)),impacts=[];
  for(let i=Math.max(0,Math.floor(b)-3);i<=Math.floor(b);i++){
    for(const note of scoreFor(3,i))if(note.type==='bell'){
      const at=i+note.offset,age=b-at;
      if(age>=0&&age<3){const seed=i*1.71+note.midi*.37;
        impacts.push({at,age,x:Math.sin(seed)*6,z:Math.cos(seed*1.3)*5,strength:note.gain/.085,midi:note.midi});
      }
    }
  }
  return {rain:1-ease((b-32)/18),opening:ease((b-40)/16),release:ease((b-48)/10),impacts,
    pulse:impacts.reduce((max,p)=>Math.max(max,Math.exp(-p.age*7)*p.strength),0)};
}
