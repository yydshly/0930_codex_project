export class GardenAudio {
  constructor(){this.ctx=null;this.enabled=false;}
  event(kind){if(!this.enabled||!this.ctx)return;const ctx=this.ctx,now=ctx.currentTime,gain=ctx.createGain();gain.connect(ctx.destination);
    gain.gain.setValueAtTime(kind==='frog'?.055:.025,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.45);
    const osc=ctx.createOscillator();osc.type=kind==='frog'?'triangle':'sine';osc.frequency.setValueAtTime(kind==='frog'?170:470,now);osc.frequency.exponentialRampToValueAtTime(kind==='frog'?85:110,now+.35);
    osc.connect(gain);osc.start(now);osc.stop(now+.46);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
  async setEnabled(enabled){
    this.enabled=enabled;if(!enabled){if(this.ctx)await this.ctx.suspend();return;}
    if(this.ctx){await this.ctx.resume();return;}
    const ctx=this.ctx=new AudioContext(),len=ctx.sampleRate*4;
    const buffer=ctx.createBuffer(1,len,ctx.sampleRate),data=buffer.getChannelData(0);
    let previous=0;for(let i=0;i<len;i++){const white=Math.random()*2-1;previous=(previous+.025*white)/1.025;data[i]=previous*5;}
    const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
    const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=620;filter.Q.value=.5;
    const gain=this.gain=ctx.createGain();gain.gain.value=.09;source.connect(filter).connect(gain).connect(ctx.destination);source.start();
    const osc=ctx.createOscillator(),lfo=ctx.createGain();osc.frequency.value=.23;lfo.gain.value=.03;osc.connect(lfo).connect(gain.gain);osc.start();
  }
}
