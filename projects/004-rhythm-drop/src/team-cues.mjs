const ease=t=>{const n=Math.max(0,Math.min(1,t));return n*n*(3-2*n);};
export const teamRoles={self:{name:'林夏',color:0xffbf72,pan:-.35},reply:{name:'阿澈',color:0xc4abff,pan:.35},bass:{name:'周野',color:0x83dece,pan:0}};
// A thoughtful question, an interrupted phrase, a reply, then a shared cadence.
export function teamScore(i){
  if(i<0||i>64)return [];
  const notes=[],local=i%4;
  const add=(role,midi,beats,gain,type='piano',offset=0)=>notes.push({role,midi,beats,gain,type,offset});
  if(i===64){add('self',76,3.7,.07);add('reply',79,3.7,.05,'bell');add('bass',48,3.7,.045,'pad');return notes;}
  if(i>=44&&i<48)return notes;
  if(i<16){if(local<3)add('self',[72,74,79][local],local===2?1.3:.45,.095);}
  else if(i<24){if(local===0)add('self',71,1.3,.08);if(local===1)add('reply',78,.35,.055,'bell',.5);}
  else{
    if(local<3)add('self',(i>=48?[72,76,79]:[72,74,76])[local],local===2?1.3:.45,.09);
    if(local===3)add('reply',i>=48?84:79,.9,.07,'bell');
    if(i>=32&&local===0)for(const midi of [i>=48?48:53,i>=48?55:60])add('bass',midi,3.5,.032,'pad');
  }
  return notes;
}
export function teamSignals(role,beat){
  if(beat<0||beat>=64)return [];
  const signals=[];
  for(let i=Math.max(0,Math.floor(beat)-2);i<=Math.floor(beat);i++)for(const note of teamScore(i)){
    const age=beat-i-note.offset;if(note.role===role&&age>=0&&age<1)signals.push({age,onset:i+note.offset});
  }
  return signals.slice(-4);
}
export function teamState(beat){
  const b=Math.max(0,Math.min(64,beat)),pulses=Object.fromEntries(Object.keys(teamRoles).map(role=>[role,Math.min(1,teamSignals(role,b).reduce((v,s)=>v+Math.exp(-s.age*5),0))]));
  return {beat:b,hero:{x:-2.4+.2*ease((b-24)/4),y:.6+pulses.self*.07,z:.5},
    reply:{x:2.4,y:.6+pulses.reply*.07,z:.5},bass:{x:-5+5*ease((b-30)/6),y:.6+pulses.bass*.05,z:.6},
    pulses,formation:ease((b-48)/8),replyArrives:ease((b-12)/4),bassArrives:ease((b-30)/6),
    answered:ease((b-27)/4),supported:ease((b-32)/4),word:0,
    visitor:{x:0,y:0,z:0,opacity:0},tilt:-.12*ease((b-16)/3)*(1-ease((b-24)/4)),
    board:b<16?'brief':b<24?'complex':b<32?'simple':b<48?'prototype':'ready'};
}
