import {W,H,clamp,images,canvasSurface,cover,glow,label,action,safeSaved} from './showcase-core.js';

export async function createRhythm({host,saved,notify,getSound=()=>true}){
 const art=await images(['scene'],'assets/game-forms/rhythm/'),{ctx}=canvasSurface(host),beat=60/108;
 const chart=[];for(let b=0;b<64;b++){chart.push({time:(4+b)*beat,lane:b%4===0?2:b%2?1:0});if(b%4===2)chart.push({time:(4+b+.5)*beat,lane:1})}chart.sort((a,b)=>a.time-b.time);
 const defaults={elapsed:0,results:Array(chart.length).fill(null),score:0,combo:0,maxCombo:0,perfect:0,good:0,miss:0,stray:0,offsetMs:0,won:false,grade:'—',accuracy:0};
 let s=safeSaved(saved,defaults);if(!Array.isArray(s.results)||s.results.length!==chart.length)s.results=Array(chart.length).fill(null);
 s.offsetMs=clamp(s.offsetMs,-200,200);let running=false,queue=[],flash='',flashTime=0,flashes=[0,0,0],error='',disposed=false;
 const track=document.createElement('audio');track.src='assets/game-forms/rhythm/night-sailing.wav';track.preload='auto';track.hidden=true;host.append(track);
 await new Promise((resolve,reject)=>{track.addEventListener('loadedmetadata',resolve,{once:true});track.addEventListener('error',()=>reject(new Error('节奏音乐未能加载')),{once:true});track.load()});
 track.currentTime=clamp(s.elapsed,0,track.duration);track.muted=!getSound();
 const controller=new AbortController(),signal=controller.signal,pads=document.createElement('div');pads.className='rhythm-pads';pads.setAttribute('aria-label','音乐节奏打击键');
 const colors=['#73e9e1','#fda4d6','#ffcf79'],keys=['D','J','空格'],names=['左拍','右拍','重拍'];
 function enqueue(lane){if(!running||s.won)return;queue.push({lane,time:track.currentTime});flashes[lane]=.22}
 for(let lane=0;lane<3;lane++){const b=document.createElement('button');b.type='button';b.innerHTML='<b>'+keys[lane]+'</b><span>'+names[lane]+'</span>';b.style.setProperty('--pad-color',colors[lane]);b.addEventListener('pointerdown',e=>{e.preventDefault();enqueue(lane)},{signal});pads.append(b)}host.append(pads);
 host.parentElement.addEventListener('keydown',e=>{if(e.repeat||e.target.closest('button,input,select'))return;const lane={KeyD:0,KeyJ:1,Space:2}[e.code];if(lane!==undefined){e.preventDefault();enqueue(lane)}},{signal});
 function setActive(active){
  track.muted=!getSound();const should=!!active&&!s.won&&!disposed;
  if(should===running)return;running=should;
  if(should)track.play().catch(()=>{if(disposed)return;error='声音未能开始，请点击下方「恢复音乐」';notify(error)});else{track.pause();s.elapsed=track.currentTime;queue=[]}
 }
 function finish(){s.won=true;s.combo=0;s.accuracy=Math.round((s.perfect+s.good*.65)/chart.length*1000)/10;s.grade=s.accuracy>=95?'S':s.accuracy>=85?'A':s.accuracy>=70?'B':s.accuracy>=50?'C':'D';track.pause();running=false;flash='演奏结束';flashTime=3;notify('短曲完成 · '+s.grade+' 级 · 准确率 '+s.accuracy+'%。可以重奏提高成绩。')}
 function judge(event){
  let selected=-1,best=.145;const t=event.time-s.offsetMs/1000;
  for(let i=0;i<chart.length;i++){const n=chart[i];if(s.results[i]!==null||n.lane!==event.lane)continue;const d=Math.abs(n.time-t);if(d<best){best=d;selected=i}}
  if(selected<0){s.stray++;s.combo=0;flash='空拍';flashTime=.3;return}
  const perfect=best<=.07;s.results[selected]=perfect?'perfect':'good';s[perfect?'perfect':'good']++;s.score+=perfect?100:65;s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);flash=perfect?'PERFECT':'GOOD';flashTime=.38;
 }
 function tick(dt){
  flashTime=Math.max(0,flashTime-dt);flashes=flashes.map(v=>Math.max(0,v-dt));pads.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('struck',flashes[i]>0));
  if(!running||s.won)return;s.elapsed=track.currentTime;
  for(const event of queue)judge(event);queue=[];
  for(let i=0;i<chart.length;i++)if(s.results[i]===null&&s.elapsed-s.offsetMs/1000>chart[i].time+.17){s.results[i]='miss';s.miss++;s.combo=0;flash='MISS';flashTime=.35}
  if(s.elapsed>=chart.at(-1).time+.7||track.ended)finish();
 }
 function replay(){const offset=s.offsetMs;s=structuredClone(defaults);s.offsetMs=offset;track.pause();track.currentTime=0;running=false;queue=[];error='';flash='四拍预备';flashTime=2;notify('从四拍预备开始，重奏这段原创短曲。')}
 function laneX(lane,p){const width=160+480*p;return W/2-width/2+width*(lane+.5)/3}
 function laneWidth(p){return (160+480*p)/3-7}
 function panel(x,y,width,height,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x-width/2,y-height/2,width,height,5);ctx.fill()}
 function draw(){
  cover(ctx,art.scene);ctx.fillStyle='rgba(3,9,27,.3)';ctx.fillRect(0,0,W,H);
  const beatPhase=(s.elapsed/beat)%1;glow(ctx,560,206,220,'rgba(130,213,232,'+(.025+(1-beatPhase)*.04)+')');
  ctx.fillStyle='rgba(8,12,32,.84)';ctx.beginPath();ctx.moveTo(480,223);ctx.lineTo(640,223);ctx.lineTo(880,557);ctx.lineTo(240,557);ctx.closePath();ctx.fill();
  for(let edge=0;edge<=3;edge++){ctx.strokeStyle=edge===0||edge===3?'#e3ba7677':'#abbedf50';ctx.lineWidth=edge===0||edge===3?2:1;ctx.beginPath();ctx.moveTo(480+160*edge/3,223);ctx.lineTo(240+640*edge/3,557);ctx.stroke()}
  for(let lane=0;lane<3;lane++){
   panel(laneX(lane,1),539,laneWidth(1),7,colors[lane]);if(flashes[lane]>0)glow(ctx,laneX(lane,1),516,100,colors[lane]+'88');
  }
  const viewTime=s.elapsed-s.offsetMs/1000;
  for(let i=chart.length-1;i>=0;i--){const n=chart[i],until=n.time-viewTime;if(s.results[i]!==null||until>2.8||until<-.18)continue;const p=clamp(1-until/2.8,0,1.07),y=223+316*p*p;panel(laneX(n.lane,p),y,laneWidth(p),10+13*p,colors[n.lane]);ctx.fillStyle='#ffffff8a';ctx.fillRect(laneX(n.lane,p)-laneWidth(p)/2+5,y-6,laneWidth(p)-10,3)}
  ctx.fillStyle='rgba(8,16,34,.78)';ctx.fillRect(34,30,1052,96);ctx.font='bold 23px "Microsoft YaHei",sans-serif';ctx.fillStyle='#f8e2ae';ctx.textAlign='left';ctx.fillText('拍点夜航',56,68);ctx.font='14px sans-serif';ctx.fillStyle='#a9cfdf';ctx.fillText('原创短曲 · 108 BPM · D / J / 空格',56,101);
  ctx.textAlign='right';ctx.font='bold 30px sans-serif';ctx.fillStyle='#f0e7d6';ctx.fillText(String(s.score).padStart(6,'0'),1060,70);ctx.font='15px sans-serif';ctx.fillStyle='#a7dddf';ctx.fillText('最高连击 '+s.maxCombo+'  ·  '+s.perfect+' PERFECT',1060,101);
  ctx.fillStyle='#25394d';ctx.fillRect(34,127,1052,3);ctx.fillStyle='#e3c57c';ctx.fillRect(34,127,1052*clamp(s.elapsed/38.5,0,1),3);
  if(s.combo>1)label(ctx,s.combo+' COMBO',932,326,'#ffe29d',28);
  if(flashTime>0)label(ctx,flash,560,174,flash==='MISS'?'#ffb8cb':'#f8e0a9',24);
  if(s.elapsed<4*beat&&!s.won)label(ctx,running?'预备 '+Math.max(1,4-Math.floor(s.elapsed/beat)):'跟着短曲，打出下一拍',560,380,'#fae2ad',25);
  label(ctx,'三条轨道 · 70ms 精准 / 140ms 良好',560,594,'#c8dbe6',15);
  if(error)label(ctx,error,560,410,'#ffb7a4',20);
  if(s.won){ctx.fillStyle='rgba(7,13,30,.92)';ctx.fillRect(330,211,460,271);label(ctx,s.grade+' 级 · 演奏完成',560,270,'#ffdb88',34);label(ctx,'准确率 '+s.accuracy+'%   得分 '+s.score,560,326,'#99e7dd',23);label(ctx,'精准 '+s.perfect+' / 良好 '+s.good+' / 漏拍 '+s.miss,560,379,'#d5dce9',17);label(ctx,'最高 '+s.maxCombo+' 连击 · 下方可以重奏',560,433,'#d0ccbb',17)}
 }
 return {tick,draw,setActive,onStart:()=>setActive(true),getState:()=>({...structuredClone(s),audioTime:track.currentTime,audioPaused:track.paused,audioMuted:track.muted,audioDuration:track.duration,chart:chart.map((n,i)=>({...n,result:s.results[i]})),audioError:error}),getStatus:()=>({goal:s.won?'演奏完成 · '+s.grade+' 级':'让音符到达判定线时，按对应的键',message:'点开始会开启音乐。D 左拍、J 右拍、空格重拍；音符、判定和歌曲使用同一声音时钟。觉得按键偏早或偏晚，可以调校准。',stats:['得分 '+s.score,'连击 '+s.combo,'精准 '+s.perfect,'漏拍 '+s.miss,'校准 '+s.offsetMs+'ms'],actions:s.won?[action('重奏一次',replay)]:[action('校准 −20ms',()=>{s.offsetMs=clamp(s.offsetMs-20,-200,200)}),action('校准 +20ms',()=>{s.offsetMs=clamp(s.offsetMs+20,-200,200)}),...(error?[action('恢复音乐',()=>{error='';track.play().catch(()=>{error='音乐未能开始，请刷新重试'})})]:[])]}),dispose(){disposed=true;running=false;track.pause();track.removeAttribute('src');track.load();controller.abort();pads.remove();track.remove()}};
}
