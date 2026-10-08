/* Acceptance for complete pre-rendered MiniMax narration and native-audio synchronization.
 * Run with BLACK_HOLE_PLAYWRIGHT set to the bundled Playwright path if needed.
 * Human listening quality is separate from decode/state checks recorded here.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {chromium}=require(process.env.BLACK_HOLE_PLAYWRIGHT||'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const project=path.resolve(__dirname,'..'),repo=path.resolve(project,'../..');
const i=process.argv.indexOf('--url'),url=i<0?'http://127.0.0.1:62116/projects/012-black-hole-lab/web/':process.argv[i+1];
const report={date:new Date().toISOString(),url,environment:{browser:'Chromium',renderer:'SwiftShader',sound:'Actual MP3 metadata and decode, native playback at 16x; human listening is not claimed'},checks:[],errors:[]};
function check(name,condition,details){report.checks.push({name,passed:Boolean(condition),details});if(!condition)throw Error(name+' failed: '+JSON.stringify(details));}
const state=p=>p.evaluate(()=>blackHoleLab.getState());
async function playing(p){await p.waitForFunction(()=>{const a=document.querySelector('#narration-audio');return a&&a.readyState>=2&&!a.paused&&a.currentTime>0;},{},{timeout:60000});}
async function setup(browser,{blockGL=false}={}){
 const p=await browser.newPage({viewport:{width:1000,height:850},reducedMotion:'reduce'});
 p.on('pageerror',e=>report.errors.push(e.message));
 await p.addInitScript(({blockGL})=>{
  window.__speechCalls=0;if(window.speechSynthesis)window.speechSynthesis.speak=()=>window.__speechCalls++;
  if(blockGL){const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){return t==='webgl2'?null:old.call(this,t,...args);};}
 },{blockGL});
 await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.blackHoleLab&&window.BlackHoleNarration,{},{timeout:60000});
 return p;
}
async function main(){
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 try{
  const p=await setup(browser);
  const manifest=await p.evaluate(()=>JSON.parse(JSON.stringify(BlackHoleNarration)));
  const chapters=manifest.chapters,segments=chapters.flatMap(ch=>ch.segments.map(s=>({...s,stage:ch.stage})));
  report.provider=manifest.provider;report.model=manifest.model;report.manifest=segments.map(({id,stage,cue,src,duration,speech,subtitles})=>({id,stage,cue,src,duration,speechLength:speech.length,subtitleCount:subtitles?.length||0}));
  check('MiniMax is the recorded provider',/minimax/i.test(String(manifest.provider)),{provider:manifest.provider,model:manifest.model});
  check('All 10 chapters have all three complete narrated segments',chapters.length===10&&segments.length===30&&chapters.every((ch,st)=>ch.stage===st&&ch.segments.length===3&&ch.segments.every((s,cu)=>s.cue===cu)),{chapters:chapters.length,segments:segments.length});
  check('Narration is complete speech, rather than only the short cue captions',segments.every(s=>typeof s.speech==='string'&&s.speech.length>=60&&s.speech.length>(s.subtitle||'').length)&&segments.reduce((n,s)=>n+s.speech.length,0)>2500,{characters:segments.reduce((n,s)=>n+s.speech.length,0),shortest:Math.min(...segments.map(s=>s.speech.length))});
  check('Every segment supplies local audio, duration and full transcript coverage',segments.every(s=>s.src&&Number.isFinite(s.duration)&&s.duration>5&&s.subtitles?.length>=1&&s.subtitles[0].start===0&&s.subtitles.every((q,n)=>q.end>q.start&&q.text&&(!n||q.start>=s.subtitles[n-1].end-.01))&&s.subtitles.at(-1).end<=s.duration+.1),report.manifest);
  check('Timed subtitle text covers all narration',segments.every(s=>s.subtitles.map(q=>q.text).join('').replace(/\s/g,'')===s.speech.replace(/\s/g,'')),segments.map(s=>({id:s.id,speech:s.speech.length,subtitles:s.subtitles.map(q=>q.text).join('').length})));
  const audioData=[];
  for(const s of segments){
   const assetURL=new URL(s.src,url),baseURL=new URL(url);
   check('Audio source remains on the local application origin: '+s.id,assetURL.origin===baseURL.origin,assetURL.href);
   const source=assetURL.pathname.startsWith('/projects/')?path.resolve(repo,decodeURIComponent(assetURL.pathname).slice(1)):path.resolve(project,'web',decodeURIComponent(s.src).split('?')[0]);
   check('Audio file stays within this project: '+s.id,source.startsWith(project+path.sep)&&fs.existsSync(source),source);
   const probe=cp.spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',source],{encoding:'utf8'});
   check('MP3 has valid metadata: '+s.id,probe.status===0,probe.stderr);
   const info=JSON.parse(probe.stdout),duration=Number(info.format.duration);
   const decoded=cp.spawnSync('ffmpeg',['-v','error','-i',source,'-f','null','-'],{encoding:'utf8'});
   check('MP3 decodes completely: '+s.id,decoded.status===0&&!decoded.stderr.trim(),decoded.stderr);
   check('Recorded duration matches encoded audio: '+s.id,Math.abs(duration-s.duration)<.25,{expected:s.duration,actual:duration});
   audioData.push({id:s.id,bytes:fs.statSync(source).size,duration,streams:info.streams});
  }
  report.audioData=audioData;report.totalDuration=audioData.reduce((n,a)=>n+a.duration,0);
  const fullSource=path.join(project,'web/audio/narration/full-course.mp3');
  check('The complete narration download is present',fs.existsSync(fullSource),fullSource);
  const fullProbe=cp.spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',fullSource],{encoding:'utf8'});
  check('Complete-download duration covers the sum of all 30 segments',fullProbe.status===0&&Math.abs(Number(JSON.parse(fullProbe.stdout).format.duration)-report.totalDuration)<1,{expected:report.totalDuration,actual:fullProbe.status===0?Number(JSON.parse(fullProbe.stdout).format.duration):null,error:fullProbe.stderr});
  const fullDecode=cp.spawnSync('ffmpeg',['-v','error','-i',fullSource,'-f','null','-'],{encoding:'utf8'});
  check('The complete narration download decodes to the end',fullDecode.status===0&&!fullDecode.stderr.trim(),fullDecode.stderr);
  const decodedBrowser=await p.evaluate(async segments=>{
   const out=[];for(const s of segments){const a=new Audio();a.preload='metadata';await new Promise((resolve,reject)=>{a.onloadedmetadata=resolve;a.onerror=()=>reject(Error('Audio metadata failed: '+s.id));a.src=s.src;});out.push({id:s.id,duration:a.duration});a.src='';}return out;
  },segments);
  check('Chromium can load metadata for all 30 audio assets',decodedBrowser.length===30&&decodedBrowser.every((a,n)=>Math.abs(a.duration-segments[n].duration)<.25),decodedBrowser);
  await p.locator('#build-auto').click();await playing(p);
  const first=await state(p);
  check('Full lecture starts native recorded audio on the first cue',first.journey.stage===0&&first.journey.cue===0&&first.journey.audio?.enabled&&first.journey.narrationScope==='full',{journey:first.journey});
  check('Browser speech synthesis is never called',await p.evaluate(()=>__speechCalls===0),await p.evaluate(()=>__speechCalls));
  await p.locator('#pause').click();const paused=await p.locator('#narration-audio').evaluate(a=>({currentTime:a.currentTime,paused:a.paused,src:a.src}));await p.waitForTimeout(400);const frozen=await p.locator('#narration-audio').evaluate(a=>({currentTime:a.currentTime,paused:a.paused,src:a.src}));
  check('Pause retains and freezes the current audio position',paused.paused&&frozen.paused&&Math.abs(paused.currentTime-frozen.currentTime)<.02&&paused.src===frozen.src,{paused,frozen});
  await p.locator('#pause').click();await playing(p);const resumed=await p.locator('#narration-audio').evaluate(a=>({currentTime:a.currentTime,src:a.src}));
  check('Resume continues the same recording instead of restarting',resumed.src===paused.src&&resumed.currentTime>=paused.currentTime,{paused,resumed});
  await p.locator('#pause').click();await p.locator('#cue-next').click();const sought=await state(p),seekAudio=await p.locator('#narration-audio').evaluate(a=>({currentTime:a.currentTime,paused:a.paused,src:a.src}));
  check('Manual cue seek replaces old audio and resets its time while paused',sought.paused&&sought.journey.cue===1&&seekAudio.paused&&seekAudio.currentTime<.1&&seekAudio.src!==paused.src,{journey:sought.journey,audio:seekAudio});
  await p.locator('#cue-prev').click();await p.locator('#pause').click();await playing(p);
  await p.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));await p.waitForTimeout(300);
  check('Scrolling to explanations does not cut narration in half',!(await state(p)).paused&&!await p.locator('#narration-audio').evaluate(a=>a.paused),true);
  const html=fs.readFileSync(path.join(project,'web/index.html'),'utf8').replace(/<script[^>]*src=["'](?:\.\/)?app\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/i,'').replace('<head>','<head><base href="'+url+'">');
  const isolated=await browser.newPage({viewport:{width:900,height:700}});
  await isolated.setContent(html,{waitUntil:'load'});await isolated.waitForFunction(()=>window.BlackHoleCourse&&window.BlackHoleNarration);
  await isolated.evaluate(()=>{
   const state={mass:10,rateLog:-9,yaw:.35,inclination:10,distance:23,paused:true,disk:true,lensing:true,doppler:true};
   window.__isolatedState=state;window.__isolatedCourse=BlackHoleCourse.create(state,{sync(){},resize(){},render(){},reset(){}},false);
  });
  await isolated.locator('#build-auto').click();
  await isolated.waitForFunction(()=>document.querySelector('#narration-audio').readyState>=2);
  const timerResult=await isolated.evaluate(()=>{const before=__isolatedCourse.getState();__isolatedCourse.tick(1200);return{before,after:__isolatedCourse.getState(),currentTime:document.querySelector('#narration-audio').currentTime};});
  check('Even a huge animation tick cannot truncate an unfinished recording',timerResult.after.stage===0&&timerResult.after.cue===0&&timerResult.after.autoExplaining,timerResult);
  await isolated.locator('#build-restart').click();await isolated.close();
  await p.bringToFront();if(!(await state(p)).paused)await p.locator('#pause').click();
  const beforeSeek=await p.locator('#narration-audio').evaluate(a=>({duration:a.duration,currentTime:a.currentTime,src:a.src}));
  await p.locator('#audio-seek').evaluate(input=>{input.value=String((Number(input.min)||0)+(Number(input.max)-Number(input.min||0))*.5);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
  await p.waitForTimeout(150);const midSeek=await p.locator('#narration-audio').evaluate(a=>({duration:a.duration,currentTime:a.currentTime,src:a.src,paused:a.paused}));
  check('Audio progress slider seeks inside the same recording without resuming a pause',midSeek.paused&&midSeek.src===beforeSeek.src&&Math.abs(midSeek.currentTime-midSeek.duration*.5)<.5,{beforeSeek,midSeek});
  await p.locator('#pause').click();await playing(p);
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const hiddenPause=await p.locator('#narration-audio').evaluate(a=>({currentTime:a.currentTime,paused:a.paused,src:a.src}));await p.waitForTimeout(250);
  check('A hidden tab pauses recorded narration while retaining its position',(await state(p)).paused&&hiddenPause.paused&&Math.abs(await p.locator('#narration-audio').evaluate(a=>a.currentTime)-hiddenPause.currentTime)<.02,hiddenPause);
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await p.locator('#pause').click();await playing(p);
  const hiddenResume=await p.locator('#narration-audio').evaluate(a=>({currentTime:a.currentTime,src:a.src}));
  check('Returning to a hidden tab resumes the same sentence rather than repeating it',hiddenResume.src===hiddenPause.src&&hiddenResume.currentTime>=hiddenPause.currentTime,{hiddenPause,hiddenResume});
  await p.locator('#build-restart').click();await p.locator('[data-stage="3"]').click();await p.locator('#chapter-narration').click();await playing(p);
  check('Each selected chapter has its own full recorded explanation',(await state(p)).journey.stage===3&&(await state(p)).journey.narrationScope==='chapter',await state(p));
  await p.locator('#pause').click();await p.locator('#build-restart').click();
  const full=await browser.newPage({viewport:{width:800,height:700},reducedMotion:'reduce'});
  await full.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){return t==='webgl2'?null:old.call(this,t,...args);};});
  await full.goto(url,{waitUntil:'networkidle'});await full.waitForFunction(()=>window.blackHoleLab);
  await full.evaluate(()=>{
   window.__timeline={played:[],ended:[]};let last='';
   const a=document.querySelector('#narration-audio');
   a.addEventListener('play',()=>a.playbackRate=16);
   a.addEventListener('playing',()=>{a.playbackRate=16;const s=blackHoleLab.getState().journey;last=s.stage+'/'+s.cue;if(!__timeline.played.includes(last))__timeline.played.push(last);});
   a.addEventListener('ended',()=>__timeline.ended.push(last));
  });
  await full.locator('#audio-rate').evaluate(s=>{const o=document.createElement('option');o.value='16';o.textContent='16x test';s.append(o);});await full.locator('#audio-rate').selectOption('16');
  await full.locator('#build-auto').click();
  await full.waitForFunction(()=>{const s=blackHoleLab.getState();return !s.journey.autoExplaining&&s.journey.stage===9&&s.journey.cue===2&&s.paused;},{},{timeout:Math.max(90000,report.totalDuration/16*2200+30000)});
  const timeline=await full.evaluate(()=>__timeline),final=await state(full);
  report.timeline=timeline;
  check('Full lecture plays all 30 actual MP3 segments in order',timeline.played.join(',')===segments.map(s=>s.stage+'/'+s.cue).join(','),timeline);
  check('All 30 segments reach their native ended event before completion',timeline.ended.length===30,timeline);
  check('The final cue remains visible and the completed lecture pauses',final.paused&&final.journey.stage===9&&final.journey.cue===2&&!final.journey.autoExplaining,final.journey);
  check('Narration remains complete even when WebGL is unavailable',Boolean(final.failure)&&timeline.played.length===30,{failure:final.failure,played:timeline.played.length});
  await full.close();
  const failure=await setup(browser,{blockGL:true}),firstURL=new URL(segments[0].src,url).href;
  await failure.route(firstURL,route=>route.fulfill({status:404,body:'Audio intentionally unavailable for validation'}));
  await failure.locator('#build-auto').click();await failure.waitForFunction(()=>blackHoleLab.getState().journey.audio?.error,{},{timeout:20000});
  const failed=await state(failure);
  check('Missing audio is explicit and freezes its current cue',failed.paused&&failed.journey.stage===0&&failed.journey.cue===0&&await failure.locator('#audio-retry').isVisible(),failed.journey);
  await failure.unroute(firstURL);await failure.locator('#audio-retry').click();await playing(failure);
  check('Retry recovers recorded audio at the same cue',(await state(failure)).journey.stage===0&&(await state(failure)).journey.cue===0&&!(await state(failure)).journey.audio.error,(await state(failure)).journey);
  await failure.locator('#voice-enabled').uncheck();
  check('Disabling audio pauses the recording and selects a visible subtitle track',await failure.locator('#narration-audio').evaluate(a=>a.paused)&&!(await state(failure)).journey.audio.enabled&&(await failure.locator('#subtitle-text').innerText()).length>0,(await state(failure)).journey);
  await failure.close();
  check('No unexpected page JavaScript exceptions',report.errors.length===0,report.errors);
  report.status='passed';
 }catch(error){report.status='failed';report.failure=String(error.stack||error);throw error;}
 finally{report.count=report.checks.length;report.failed=report.checks.filter(c=>!c.passed).length;fs.writeFileSync(path.join(project,'notes/audio-validation.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
 console.log(JSON.stringify({status:report.status,checks:report.count,totalDuration:report.totalDuration},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
