import {renderNote,notePan} from './echo-sound.mjs';
export function createEchoAudio(){
  let context,master,muted=false;const sources=new Set(),cache=new Map();
  async function init(){if(!context){context=new AudioContext();master=context.createGain();master.gain.value=muted?0:.72;const compressor=context.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=3;master.connect(compressor);compressor.connect(context.destination);}await context.resume();if(context.state!=='running')throw new Error('Audio unavailable');}
  function note(data,at){
    if(!context)return;const key=[data.voice,data.midi,data.length??.4,data.gain??1,data.style??'note'].join(':');let buffer=cache.get(key);
    if(!buffer){const samples=renderNote(data,context.sampleRate);buffer=context.createBuffer(1,samples.length,context.sampleRate);buffer.copyToChannel(samples,0);if(cache.size>=48)cache.delete(cache.keys().next().value);cache.set(key,buffer);}
    const source=context.createBufferSource(),pan=context.createStereoPanner();source.buffer=buffer;pan.pan.value=notePan(data);source.connect(pan);pan.connect(master);source.start(Math.max(context.currentTime,at));sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();pan.disconnect();};
  }
  return {init,note,clock:()=>context?.currentTime??0,ready:()=>context?.state==='running',stop(){for(const s of sources)try{s.stop();}catch{}sources.clear();},mute(value){muted=value;if(master)master.gain.setTargetAtTime(value?0:.72,context.currentTime,.02);},pause:()=>context?.suspend(),close:()=>context?.close()};
}
