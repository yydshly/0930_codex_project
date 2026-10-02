export function createPlaygroundAudio(){
  let context,master,reverb,muted=false;
  const voices=new Set();
  async function init(){
    if(!context){
      context=new AudioContext();master=context.createGain();master.gain.value=muted?0:.62;
      const compressor=context.createDynamicsCompressor();compressor.threshold.value=-21;compressor.ratio.value=3;master.connect(compressor);compressor.connect(context.destination);
      reverb=context.createConvolver();const buffer=context.createBuffer(2,Math.floor(context.sampleRate*1.4),context.sampleRate);let seed=72;
      for(let channel=0;channel<2;channel++){const a=buffer.getChannelData(channel);for(let i=0;i<a.length;i++){seed=seed*16807%2147483647;a[i]=(seed/1073741824-1)*Math.exp(-i/(context.sampleRate*.36))*.15;}}
      reverb.buffer=buffer;const wet=context.createGain();wet.gain.value=.13;reverb.connect(wet);wet.connect(master);
    }
    await context.resume();if(context.state!=='running')throw new Error('AudioContext did not resume');
  }
  function note({role,midi,length=.55,gain=.075},at){
    if(!context)return;
    const freq=440*2**((midi-69)/12),envelope=context.createGain(),pan=context.createStereoPanner(),filter=context.createBiquadFilter();
    pan.pan.value={mumu:-.25,he:.25,mai:0,dou:-.4}[role];filter.type='lowpass';filter.frequency.value=role==='mai'?1600:role==='he'?4700:3500;
    envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime(gain,at+.009);envelope.gain.exponentialRampToValueAtTime(Math.max(.001,gain*.18),at+length*.45);envelope.gain.exponentialRampToValueAtTime(.0001,at+length+.2);
    filter.connect(envelope);envelope.connect(pan);pan.connect(master);pan.connect(reverb);
    const partials=role==='he'?[[1,1],[2.01,.19],[3.98,.045]]:role==='dou'?[[1,1],[3,.1]]:role==='mai'?[[1,1],[2,.1]]:[[1,1],[2,.25],[3,.1],[4,.04]];
    let remaining=partials.length;
    for(const [ratio,level]of partials){const oscillator=context.createOscillator(),part=context.createGain();oscillator.type='sine';oscillator.frequency.value=freq*ratio;part.gain.value=level;oscillator.connect(part);part.connect(filter);oscillator.start(at);oscillator.stop(at+length+.23);voices.add(oscillator);
      oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();part.disconnect();if(--remaining===0){filter.disconnect();envelope.disconnect();pan.disconnect();}};
    }
  }
  return {init,note,clock:()=>context?.currentTime??0,ready:()=>context?.state==='running',stop(){for(const o of voices)try{o.stop();}catch{}voices.clear();},mute(value){muted=value;if(master)master.gain.setTargetAtTime(value?0:.62,context.currentTime,.025);},pause:()=>context?.suspend(),close:()=>context?.close()};
}
