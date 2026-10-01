const ease=t=>{const n=Math.max(0,Math.min(1,t));return n*n*(3-2*n);};
export const identityRoles={self:{name:'微光',color:0xffbf72,pan:-.2},reply:{name:'回声',color:0xc4abff,pan:.45},bass:{name:'稳稳',color:0x83dece,pan:-.4},visitor:{name:'旅人',color:0x81b6e8,pan:.7}};

// Short / short / long / rest. Responses occupy the space left by the protagonist.
export function identityScore(i){
  if(i<0||i>64)return [];
  const notes=[],local=i%4;
  const add=(role,midi,beats,gain,type='piano',offset=0)=>notes.push({role,midi,beats,gain,type,offset});
  if(i===64){add('self',79,3.7,.06);add('reply',74,3.7,.055,'bell');add('bass',48,3.7,.04,'pad');return notes;}
  if(i>=44&&i<48)return notes;
  if(local<3)add('self',[72,74,79][local],local===2?.9:.3,i<16?.11:.095);
  // One passer-by continues their own phrase; it is not the eventual reply.
  if(i>=17&&i<=23&&i%2===1)add('visitor',[82,77,80,75][(i-17)/2],.45,.045,'triangle',.5);
  if(i>=27&&local===3)add('reply',i>=48?86:81,.7,.085,'bell');
  if(i===35||i===39)add('bass',48,.65,.065,'sine');
  if(i>=40&&local===0)add('bass',i>=56?48:53,3.2,.04,'pad');
  return notes;
}
export function identityPulse(role,beat){
  if(beat>=64||beat<0)return 0;
  let pulse=0;
  for(let i=Math.max(0,Math.floor(beat)-4);i<=Math.floor(beat);i++)for(const n of identityScore(i)){
    const age=beat-i-n.offset;
    if(n.role===role&&age>=0&&age<Math.min(n.beats,.9))pulse+=Math.exp(-age*5);
  }
  return Math.min(1,pulse);
}
export function identitySignals(role,beat){
  if(beat>=64||beat<0)return [];
  const signals=[];
  for(let i=Math.max(0,Math.floor(beat)-2);i<=Math.floor(beat);i++)for(const note of identityScore(i)){
    const age=beat-i-note.offset;if(note.role===role&&age>=0&&age<1)signals.push({age,onset:i+note.offset});
  }
  return signals.slice(-4);
}
export function identityState(beat){
  const b=Math.max(0,Math.min(64,beat)),formation=ease((b-48)/10);
  const pulses=Object.fromEntries(Object.keys(identityRoles).map(role=>[role,identityPulse(role,b)]));
  const hero={x:-2.25+.65*ease((b-16)/5)-.35*ease((b-22)/3)+1.95*ease((b-28)/24),y:1.12+pulses.self*.08,z:0};
  const reply={x:4.8-2.4*ease((b-16)/10)-.6*formation,y:1.05+1.45*formation+pulses.reply*.08,z:-.15};
  const bass={x:-5.2+2.9*ease((b-30)/12)+.5*formation,y:1.05+1.45*formation+pulses.bass*.06,z:-.15};
  return {beat:b,hero,reply,bass,pulses,formation,replyArrives:ease((b-16)/6),bassArrives:ease((b-30)/6),
    answered:ease((b-27)/5),supported:ease((b-35)/6),word:ease((b-58)/4),
    visitor:{x:-5+(b-16)*.75,y:1.6,z:-1.8,opacity:ease((b-16)/2)*(1-ease((b-26)/4))},
    tilt:-.13*ease((b-16)/4)+.13*ease((b-27)/4)};
}
