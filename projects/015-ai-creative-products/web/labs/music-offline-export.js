import {Muxer,ArrayBufferTarget} from './vendor/webm-muxer-5.1.4.mjs';

// Offline media time is independent of rendering throughput. WebCodecs docs:
// https://developer.chrome.com/docs/web-platform/best-practices/webcodecs
// Local MIT muxer source and checksums are beside its LICENSE in vendor/.
const RATE=48000,AUDIO_BLOCK=960,VIDEO_QUEUE=2,AUDIO_QUEUE=4;
const hz=midi=>440*2**((midi-69)/12);
const cancelError=()=>new DOMException('导出已取消，未生成不完整的视频。','AbortError');
const compatibilityError=message=>new DOMException(message,'NotSupportedError');
function closeEncoder(encoder){if(encoder&&encoder.state!=='closed'){try{encoder.close();}catch{}}}

/**
 * Export the actual canvas at fixed media timestamps; no captureStream or real-time recording.
 * notes: MIDI-number array. volume: percent, like music.js (25 means 25%).
 * renderAt(seconds): synchronously render, or return a promise after the canvas is ready.
 * The caller pauses live animation and holds canvas dimensions until this promise settles.
 * onProgress receives 0..1 and an optional details object; 1 means both encoders were flushed.
 * Abort rejects with AbortError. The caller restores its preview in its own finally block.
 * @returns {Promise<Blob>} A complete seekable WebM with VP8/VP9 video and mono Opus audio.
 */
export async function exportPianoMovie({canvas,duration,fps=24,notes,tempo=90,volume=25,renderAt,onProgress=()=>{},signal}={}){
 if(!canvas||typeof renderAt!=='function')throw new TypeError('逐帧导出需要实际画布和 renderAt(seconds) 渲染回调。');
 if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(fps)||fps<1||fps>120)throw new TypeError('导出片长必须大于 0，帧率须在 1–120 之间。');
 if(!Array.isArray(notes)||!notes.length||notes.some(n=>!Number.isInteger(n)||n<0||n>127))throw new TypeError('乐谱须为非空 MIDI 音符数组（0–127）。');
 if(!Number.isFinite(tempo)||tempo<=0||!Number.isFinite(volume)||volume<0||volume>100)throw new TypeError('节奏必须大于 0，音量使用 0–100 的百分比。');
 if(typeof VideoEncoder!=='function'||typeof VideoFrame!=='function'||typeof AudioEncoder!=='function'||typeof AudioData!=='function')throw compatibilityError('当前浏览器不支持完整的 WebCodecs 音画导出。请用支持此功能的 Chrome / Edge 在 HTTPS 或 localhost 打开；WAV 和配方仍可导出。');
 const sequence=notes.slice(),beat=60/tempo,gain=volume/100,frameCount=Math.max(1,Math.ceil(duration*fps-1e-8)),sampleCount=Math.ceil(duration*RATE),progressEvery=Math.max(1,Math.round(fps/4));
 let videoEncoder,audioEncoder,muxer,target,failure=null,ended=false,videoChunks=0,audioChunks=0,audioCursor=0,rejectFailure;
 const failurePromise=new Promise((_,reject)=>rejectFailure=reject);failurePromise.catch(()=>{});
 const fail=error=>{if(failure||ended)return;failure=error instanceof Error?error:new Error(String(error));closeEncoder(videoEncoder);closeEncoder(audioEncoder);rejectFailure(failure);};
 const abort=()=>fail(cancelError());
 const check=()=>{if(signal?.aborted)throw cancelError();if(failure)throw failure;};
 const guarded=async promise=>{check();const value=await Promise.race([Promise.resolve(promise),failurePromise]);check();return value;};
 const yieldTask=()=>guarded(new Promise(resolve=>setTimeout(resolve,0)));
 const waitQueue=async(encoder,limit)=>{while(encoder.encodeQueueSize>=limit){check();await yieldTask();}check();};
 const progress=(value,details)=>{check();onProgress(value,details);check();};
 signal?.addEventListener('abort',abort,{once:true});
 try{
  check();progress(0,{phase:'preparing',frames:0,totalFrames:frameCount,duration});
  await guarded(renderAt(0));
  const width=canvas.width,height=canvas.height;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new TypeError('实际画布尚未完成尺寸初始化。');
  const bitrate=Math.round(Math.max(2500000,Math.min(12000000,width*height*fps*.18)));
  let videoConfig,videoCodec;
  for(const [codec,webmCodec] of [['vp8','V_VP8'],['vp09.00.10.08','V_VP9']]){
   let support;try{support=await guarded(VideoEncoder.isConfigSupported({codec,width,height,framerate:fps,bitrate,latencyMode:'quality',alpha:'discard'}));}catch(error){check();if(error.name==='AbortError')throw error;continue;}
   if(support.supported){videoConfig=support.config;videoCodec=webmCodec;break;}
  }
  if(!videoConfig)throw compatibilityError(`当前浏览器没有可用的 ${width}×${height} VP8 / VP9 编码器；未生成低帧率实时录制。`);
  let audioSupport;try{audioSupport=await guarded(AudioEncoder.isConfigSupported({codec:'opus',sampleRate:RATE,numberOfChannels:1,bitrate:96000}));}catch(error){check();throw compatibilityError('当前浏览器无法配置 48 kHz Opus 音轨；可改为导出 WAV。');}
  if(!audioSupport.supported)throw compatibilityError('当前浏览器不支持 48 kHz Opus 音轨；未生成无声冒充音画的视频。');
  target=new ArrayBufferTarget();muxer=new Muxer({target,video:{codec:videoCodec,width,height,frameRate:fps},audio:{codec:'A_OPUS',sampleRate:RATE,numberOfChannels:1},firstTimestampBehavior:'strict'});
  videoEncoder=new VideoEncoder({output:(chunk,metadata)=>{if(failure||ended)return;try{muxer.addVideoChunk(chunk,metadata);videoChunks++;}catch(error){fail(error);}},error:error=>fail(new Error('视频编码失败：'+error.message))});
  audioEncoder=new AudioEncoder({output:(chunk,metadata)=>{if(failure||ended)return;try{muxer.addAudioChunk(chunk,metadata);audioChunks++;}catch(error){fail(error);}},error:error=>fail(new Error('音轨编码失败：'+error.message))});
  videoEncoder.configure(videoConfig);audioEncoder.configure(audioSupport.config);
  // Same melody, quarter-note bass, four sine harmonics and decay as music.js wav().
  async function audioUntil(endSample){
   while(audioCursor<endSample&&audioCursor<sampleCount){
    await waitQueue(audioEncoder,AUDIO_QUEUE);
    const count=Math.min(AUDIO_BLOCK,sampleCount-audioCursor),pcm=new Float32Array(count);
    for(let j=0;j<count;j++){
     const t=(audioCursor+j)/RATE,index=Math.floor(t/beat),local=t-index*beat;let value=0;
     if(index<sequence.length){const envelope=Math.min(1,local/.009)*Math.exp(-local/(beat*.19)),frequency=hz(sequence[index]);for(let k=1;k<=4;k++){value+=Math.sin(2*Math.PI*frequency*k*local)/(k*k);if(index%4===0)value+=.35*Math.sin(2*Math.PI*hz(sequence[index]-12)*k*local)/(k*k);}value*=envelope*.22*gain;}
     pcm[j]=Math.max(-1,Math.min(1,value));
    }
    let data;try{data=new AudioData({format:'f32-planar',sampleRate:RATE,numberOfFrames:count,numberOfChannels:1,timestamp:Math.round(audioCursor*1e6/RATE),data:pcm});audioEncoder.encode(data);}finally{data?.close();}
    audioCursor+=count;check();
   }
  }
  for(let i=0;i<frameCount;i++){
   check();await waitQueue(videoEncoder,VIDEO_QUEUE);
   if(i>0)await guarded(renderAt(i/fps));
   check();if(canvas.width!==width||canvas.height!==height)throw new Error('导出期间画布尺寸发生变化，请保持窗口大小后重试。');
   const timestamp=Math.round(i*1e6/fps),nextTimestamp=Math.round(Math.min(duration,(i+1)/fps)*1e6);
   let frame;try{frame=new VideoFrame(canvas,{timestamp,duration:Math.max(1,nextTimestamp-timestamp),alpha:'discard'});videoEncoder.encode(frame,{keyFrame:i%Math.max(1,Math.round(fps*2))===0});}finally{frame?.close();}
   await audioUntil(Math.min(sampleCount,Math.ceil((i+1)*RATE/fps)));
   if((i+1)%progressEvery===0||i===frameCount-1)progress(.98*(i+1)/frameCount,{phase:'rendering',frames:i+1,totalFrames:frameCount,duration,codec:videoConfig.codec});
   await yieldTask();
  }
  await audioUntil(sampleCount);
  progress(.99,{phase:'muxing',frames:frameCount,totalFrames:frameCount,duration,codec:videoConfig.codec});
  await guarded(Promise.all([videoEncoder.flush(),audioEncoder.flush()]));check();
  if(videoChunks!==frameCount)throw new Error(`视频编码帧数不完整：需要 ${frameCount} 帧，实际 ${videoChunks} 帧，未导出不完整的视频。`);
  if(!audioChunks)throw new Error('音轨没有生成，未导出不完整的音画视频。');
  muxer.finalize();check();
  const output=new Blob([target.buffer],{type:'video/webm'});if(!output.size)throw new Error('WebM 封装没有产生有效文件。');
  progress(1,{phase:'complete',frames:videoChunks,totalFrames:frameCount,duration,codec:videoConfig.codec,audioChunks});
  return output;
 }finally{ended=true;signal?.removeEventListener('abort',abort);closeEncoder(videoEncoder);closeEncoder(audioEncoder);muxer=null;target=null;}
}
