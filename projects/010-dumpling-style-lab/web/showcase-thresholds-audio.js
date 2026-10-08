// PCM stays in this process. Only pitch/rms/confidence enter transient game state.
export function detectPitch(samples,sampleRate){
 const empty={frequency:0,rms:0,confidence:0};if(!samples||samples.length<256||!Number.isFinite(sampleRate)||sampleRate<8000)return empty;
 let mean=0;for(const v of samples){if(!Number.isFinite(v))return empty;mean+=v;}mean/=samples.length;let energy=0;for(const v of samples)energy+=(v-mean)**2;const rms=Math.sqrt(energy/samples.length);if(rms<.012)return {...empty,rms};
 const stride=Math.max(1,Math.floor(sampleRate/12000)),rate=sampleRate/stride,n=Math.floor(samples.length/stride),a=new Float64Array(n);for(let i=0;i<n;i++)a[i]=samples[i*stride]-mean;
 const min=Math.floor(rate/1000),max=Math.min(Math.ceil(rate/65),Math.floor(n/2)-1),window=n-max,d=new Float64Array(max+1);let sum=0;d[0]=1;
 for(let lag=1;lag<=max;lag++){let v=0;for(let i=0;i<window;i++)v+=(a[i]-a[i+lag])**2;sum+=v;d[lag]=sum?v*lag/sum:1;}
 let lag=0;for(let t=Math.max(2,min);t<max;t++)if(d[t]<.12){while(t+1<max&&d[t+1]<d[t])t++;lag=t;break;}
 if(!lag)return {...empty,rms};const denominator=2*(2*d[lag]-d[lag-1]-d[lag+1]),shift=denominator?(d[lag+1]-d[lag-1])/denominator:0,frequency=rate/(lag+shift),confidence=1-d[lag];return frequency>=65&&frequency<=1000?{frequency,rms,confidence}:{...empty,rms};
}
export function voiceInput({onStatus=()=>{},getSound=()=>false}={}){
 let epoch=0,stream=null,context=null,source=null,analyser=null,pending=false,mode='keyboard',status='音符键盘 · 按住低 / 中 / 高音',synthContext=null,osc=null,gain=null;
 const report=t=>{status=t;onStatus(t);};
 function stopTone(){try{osc?.stop();osc?.disconnect();gain?.disconnect();}catch{}osc=gain=null;const c=synthContext;synthContext=null;if(c)c.close().catch(()=>{});}
 function stopMic(){epoch++;pending=false;for(const t of stream?.getTracks?.()||[])t.stop();stream=null;try{source?.disconnect();analyser?.disconnect();}catch{}source=analyser=null;const c=context;context=null;if(c)c.close().catch(()=>{});mode='keyboard';}
 async function enable(){stopTone();stopMic();const ticket=epoch;const media=globalThis.navigator?.mediaDevices,AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!media?.getUserMedia||!AC){report('此环境无法使用麦克风，请用音符键盘试玩。');return false;}
  pending=true;report('等待浏览器麦克风许可…');let candidate=null,c=null;
  try{candidate=await media.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});if(ticket!==epoch){for(const t of candidate.getTracks())t.stop();return false;}c=new AC();await c.resume();if(ticket!==epoch){for(const t of candidate.getTracks())t.stop();await c.close();return false;}
   stream=candidate;context=c;source=c.createMediaStreamSource(stream);analyser=c.createAnalyser();analyser.fftSize=2048;source.connect(analyser);mode='microphone';pending=false;report('麦克风已启用 · 轻声持续哼唱，音高控制高度');return true;
  }catch(e){if(candidate&&candidate!==stream)for(const t of candidate.getTracks())t.stop();if(c&&c!==context)c.close().catch(()=>{});if(ticket===epoch){stopMic();report(e?.name==='NotAllowedError'?'麦克风未获许可，音符键盘仍可试玩。':'麦克风启动失败，音符键盘仍可试玩。');}return false;}
 }
 function sample(){if(!analyser||!context)return {frequency:0,rms:0,confidence:0};const data=new Float32Array(analyser.fftSize);try{analyser.getFloatTimeDomainData(data);return detectPitch(data,context.sampleRate);}catch{stopMic();report('麦克风已中断，请重新启用或使用音符键盘。');return {frequency:0,rms:0,confidence:0};}}
 function tone(f){stopTone();if(!f||!getSound())return;const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return;try{synthContext=new AC();synthContext.resume().catch(()=>{});osc=synthContext.createOscillator();gain=synthContext.createGain();osc.type='sine';osc.frequency.value=f;gain.gain.value=.06;osc.connect(gain);gain.connect(synthContext.destination);osc.start();}catch{stopTone();}}
 return {enable,sample,tone,get mode(){return mode;},get status(){return status;},get pending(){return pending;},keyboard(){stopMic();report('音符键盘 · 按住低 / 中 / 高音');},stop(){stopMic();stopTone();report('设备已释放 · 音符键盘可继续试玩');},dispose(){stopMic();stopTone();}};
}
