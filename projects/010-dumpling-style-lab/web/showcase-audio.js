// Selected artist-authored CC0 samples. Decoding is deferred until sound is enabled.
const files={
  slash:'rpg-audio/knifeSlice.ogg',dash:'rpg-audio/drawKnife1.ogg',break:'rpg-audio/metalPot1.ogg',
  cards:'rpg-audio/bookPlace1.ogg',shuffle:'rpg-audio/bookFlip1.ogg',pickup:'rpg-audio/handleCoins.ogg',
  door:'rpg-audio/doorOpen_1.ogg',build:'rpg-audio/metalLatch.ogg',reload:'rpg-audio/metalLatch.ogg',
  turn:'interface-sounds/switch_002.ogg',stamp:'interface-sounds/drop_002.ogg',hurt:'interface-sounds/error_002.ogg',
  success:'interface-sounds/confirmation_002.ogg',drop:'interface-sounds/drop_002.ogg',
  step:'rpg-audio/footstep00.ogg',stepAlt:'rpg-audio/footstep01.ogg'
};
const buffers=new Map(),voices=new Set();let step=0,loading=null;
export function preloadAudio(context) {
  loading??=Promise.allSettled([...new Set(Object.values(files))].map(async path=>{
    const response=await fetch('assets/showcase/audio/'+path);
    if(!response.ok)throw Error('Audio unavailable');
    buffers.set(path,await context.decodeAudioData(await response.arrayBuffer()));
  }));
  return loading;
}
export function playSample(kind,context) {
  if(kind==='step')kind=step++%2?'stepAlt':'step';
  const buffer=buffers.get(files[kind]);if(!buffer)return false;
  if(voices.size>=12)return true;
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;
  gain.gain.value=kind.startsWith('step')?.055:kind==='hurt'?.1:.16;
  source.connect(gain);gain.connect(context.destination);voices.add(source);
  source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect()};source.start();return true;
}
