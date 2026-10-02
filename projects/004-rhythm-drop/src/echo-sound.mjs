export const pans={kong:-.2,zhe:.25,dong:0,su:.4};
export function notePan(note){const pan=note.pan??pans[note.voice];if(!Number.isFinite(pan)||Math.abs(pan)>1)throw new Error('Invalid echo pan');return pan;}

// The downloadable dry signatures and browser buffers use the same synthesis.
export function renderNote({voice,midi,length=.4,gain=1,style},sampleRate=44100){
  if(!Object.hasOwn(pans,voice)||!Number.isFinite(midi)||!Number.isFinite(length)||length<=0)throw new Error('Invalid echo note');
  const count=Math.ceil((length+.42)*sampleRate),data=new Float32Array(count),f=440*2**((midi-69)/12);
  let seed=139+midi*37,filtered=0;
  for(let i=0;i<count;i++){
    const t=i/sampleRate;seed=(seed*16807)%2147483647;const noise=seed/1073741824-1;filtered=filtered*.92+noise*.08;
    const attack=Math.min(1,t/(style==='pad'?.25:voice==='kong'?.023:.007)),release=t<=length?1:Math.exp(-(t-length)*18),decay=Math.exp(-t/(style==='pad'?2.0:voice==='dong'?.23:voice==='zhe'?.24:.65));
    let wave,level;
    if(voice==='kong'){wave=Math.sin(2*Math.PI*f*t)+.21*Math.sin(2*Math.PI*f*2*t)+.075*Math.sin(2*Math.PI*f*3*t)+filtered*.13;level=.16;}
    else if(voice==='zhe'){wave=Math.sin(2*Math.PI*f*t)+.18*Math.sin(2*Math.PI*f*2.015*t)+noise*.13*Math.exp(-t*75);level=.13;}
    else if(voice==='dong'){const phase=2*Math.PI*f*(t+.026*(1-Math.exp(-t*24)));wave=Math.sin(phase)+.12*Math.sin(phase*2);level=.24;}
    else{wave=.9*Math.sin(2*Math.PI*f*t)+.07*Math.sin(2*Math.PI*f*3.97*t)+filtered*.25;level=.11;}
    data[i]=wave*attack*release*decay*level*gain;
  }
  return data;
}
export function renderDryScore(score,duration=4,sampleRate=44100){
  const left=new Float32Array(Math.ceil(duration*sampleRate)),right=new Float32Array(left.length);
  for(const note of score){const data=renderNote(note,sampleRate),offset=Math.round(note.at*sampleRate),pan=notePan(note),l=Math.cos((pan+1)*Math.PI/4)*.72,r=Math.sin((pan+1)*Math.PI/4)*.72;for(let i=0;i<data.length&&i+offset<left.length;i++){if(i+offset<0)continue;left[i+offset]+=data[i]*l;right[i+offset]+=data[i]*r;}}
  return {left,right,sampleRate};
}
