import type {WorldId} from './WorldScenes';

export const worldScores:Record<WorldId,{name:string;src:string|null}>={
  gravity:{name:'花园',src:'./audio/gravity-minimax.mp3'},
  moon:{name:'月亮',src:null},
  shadow:{name:'影子',src:'./audio/shadow-minimax.mp3'},
};
export type MusicStatus='off'|'preparing'|'playing'|'paused'|'ended'|'error';
export type MusicState={wanted:boolean;status:MusicStatus;message:string};
export type AudioBands={energy:number;low:number;high:number};
const silent:AudioBands={energy:0,low:0,high:0};

/** A single same-origin media element carries each available original score. */
export class WorldAudio{
  private media:HTMLAudioElement|null=null;
  private context:AudioContext|null=null;
  private analyser:AnalyserNode|null=null;
  private bins:Uint8Array<ArrayBuffer>|null=null;
  private scene:WorldId='gravity';
  private loadedScene:WorldId|null=null;
  private wants=false;
  private reduced=false;
  private status:MusicStatus='off';
  private serial=0;
  private target=0;
  private running=false;
  private timer:ReturnType<typeof setTimeout>|null=null;
  constructor(private notify:(state:MusicState)=>void){}
  private emit(status:MusicStatus,message=''){
    this.status=status;this.notify({wanted:this.wants,status,message});
  }
  private clearTimer(){if(this.timer!==null){clearTimeout(this.timer);this.timer=null;}}
  private waitForPlayback(){
    // Repeated waiting/stalled events must not postpone the first deadline.
    if(this.timer!==null)return;const token=this.serial;
    this.timer=setTimeout(()=>{if(token===this.serial&&this.wants&&this.running)this.fail();},15000);
  }
  private fail(){
    this.clearTimer();this.serial++;this.wants=false;this.running=false;this.media?.pause();
    this.emit('error','配乐暂时没能播放，已继续静音演出。可以再试一次。');
  }
  private ensure(){
    const src=worldScores[this.scene].src;if(!src)throw new Error('Score unavailable');
    if(!this.media||!this.context||!this.analyser){
      const Context=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!Context)throw new Error('Audio unavailable');
      const media=new Audio(src);media.preload='auto';media.loop=false;this.media=media;this.loadedScene=this.scene;
      media.addEventListener('error',()=>{if(this.wants&&worldScores[this.scene].src)this.fail();});
      media.addEventListener('loadedmetadata',()=>{if(this.wants&&this.loadedScene===this.scene)this.applyTime();});
      media.addEventListener('ended',()=>{if(this.wants&&this.loadedScene===this.scene){this.clearTimer();this.running=false;this.emit('ended');}});
      const wait=()=>{if(this.wants&&this.running&&!this.reduced){this.emit('preparing');this.waitForPlayback();}};
      media.addEventListener('waiting',wait);media.addEventListener('stalled',wait);
      media.addEventListener('playing',()=>{if(this.wants&&this.running&&!this.reduced&&this.loadedScene===this.scene){this.clearTimer();this.emit('playing');}});
      this.context=new Context();this.analyser=this.context.createAnalyser();
      this.analyser.fftSize=1024;this.analyser.minDecibels=-90;this.analyser.maxDecibels=-10;this.analyser.smoothingTimeConstant=.72;
      this.context.createMediaElementSource(media).connect(this.analyser);this.analyser.connect(this.context.destination);
      this.bins=new Uint8Array(this.analyser.frequencyBinCount);
    }else if(this.loadedScene!==this.scene){
      this.media.pause();this.media.src=src;this.loadedScene=this.scene;this.media.load();
    }
  }
  private applyTime(){
    if(!this.media)return;
    try{this.media.currentTime=this.target;}catch{/* Metadata retries the requested seek. */}
  }
  private start(){
    if(!this.wants||!worldScores[this.scene].src||this.reduced||!this.media||!this.context)return;
    // play() on an ended element restarts at zero; a finale hold must stay ended.
    if(this.media.ended||(this.media.readyState>=1&&this.media.currentTime>=31.99)){
      this.clearTimer();this.running=false;this.media.pause();this.emit('ended');return;
    }
    if(this.status==='preparing'||(this.status==='playing'&&!this.media.paused))return;
    const token=++this.serial;this.running=true;this.emit('preparing');this.waitForPlayback();
    try{
      // Both calls remain on the visitor's gesture stack.
      const resumed=this.context.resume(),played=this.media.play();
      Promise.all([resumed,played]).then(()=>{
        if(token!==this.serial||!this.wants||this.reduced||!this.running){if(!this.wants||this.reduced||!this.running)this.media?.pause();return;}
        this.clearTimer();this.emit('playing');
      }).catch(()=>{if(token===this.serial&&this.wants)this.fail();});
    }catch{this.fail();}
  }
  enable(scene:WorldId,time:number,play:boolean,reduced:boolean){
    this.scene=scene;this.reduced=reduced;if(!worldScores[scene].src||reduced)return;
    this.wants=true;this.target=Math.max(0,Math.min(31.99,time));
    try{this.ensure();this.applyTime();this.emit('paused');if(play)this.start();}catch{this.fail();}
  }
  disable(){const time=this.time();this.clearTimer();this.serial++;this.wants=false;this.running=false;this.media?.pause();this.emit('off');return time;}
  setScene(scene:WorldId,time:number,play:boolean){
    this.clearTimer();this.serial++;this.running=false;this.media?.pause();this.scene=scene;this.target=time;
    if(worldScores[scene].src&&this.wants&&!this.reduced){
      try{this.ensure();this.applyTime();this.emit('paused');if(play)this.start();}catch{this.fail();}
    }else this.emit('off');
  }
  setReduced(value:boolean){this.reduced=value;if(value){this.clearTimer();this.serial++;this.running=false;this.media?.pause();if(this.wants)this.emit('paused');}}
  transport(play:boolean){
    if(!this.wants||!worldScores[this.scene].src)return;
    if(!play||this.reduced){this.clearTimer();this.serial++;this.running=false;this.media?.pause();this.emit(this.media?.ended?'ended':'paused');}
    else this.start();
  }
  seek(time:number,play:boolean){
    this.clearTimer();this.serial++;this.running=false;this.media?.pause();this.target=Math.max(0,Math.min(31.99,time));this.applyTime();
    if(this.wants&&worldScores[this.scene].src){this.emit('paused');if(play&&!this.reduced)this.start();}
  }
  hasClock(scene:WorldId){return this.wants&&scene===this.scene&&!!worldScores[scene].src&&this.loadedScene===scene&&!!this.media&&this.status!=='error';}
  time(){const time=!this.media||this.media.readyState===0?this.target:this.media.ended?31.99:this.media.currentTime;return Math.max(0,Math.min(31.99,time));}
  bands():AudioBands{
    if(!this.wants||!worldScores[this.scene].src||this.reduced||this.status!=='playing'||!this.media||this.media.paused||this.media.ended||!this.analyser||!this.context||!this.bins)return {...silent};
    this.analyser.getByteFrequencyData(this.bins);
    const mean=(lo:number,hi:number)=>{
      const binHz=this.context!.sampleRate/this.analyser!.fftSize,first=Math.max(0,Math.ceil(lo/binHz)),last=Math.min(this.bins!.length-1,Math.floor(hi/binHz));
      if(last<first)return 0;let sum=0;for(let i=first;i<=last;i++)sum+=this.bins![i]/255;
      return Math.max(0,Math.min(1,sum/(last-first+1)));
    };
    return {energy:mean(80,8000),low:mean(50,320),high:mean(1500,8000)};
  }
  dispose(){this.clearTimer();this.serial++;this.running=false;this.wants=false;this.media?.pause();this.media=null;const context=this.context;this.context=null;this.analyser=null;this.bins=null;if(context)void context.close().catch(()=>{});}
}
