import React, {useEffect, useRef, useState} from 'react';
import {Asset, WorldId, clamp, duration, renderWorld} from './WorldScenes';
import {MusicState, WorldAudio, worldScores} from './WorldAudio';

type StoryLine = {speaker:string;line:string};
type World = {id:WorldId;number:string;name:string;line:string;action:string;collect:string;hint:string;value:string;chapters:string[];assets:string[];story:StoryLine[]};
const worlds:World[] = [
  {id:'gravity',number:'01',name:'引力花园',line:'高音飞起来，低音落下来。',action:'吹一阵风',collect:'保存一颗发现',hint:'点一下吹风，拖动改变风向。',value:'留下一颗发现，等它长成花园。',chapters:['园丁还在打盹','风精灵吹乱了星种','惊醒的园丁接住星种','每个发现长成花园'],assets:['background','background-finale','stone','stone-awake','stone-proud','wind','wind-gust','wind-rest','seed','tree'],story:[{speaker:'园丁',line:'再睡一小会儿，种子不会跑吧。'},{speaker:'风精灵',line:'我只轻轻吹一下。真的！'},{speaker:'园丁',line:'哎呀——星种全飞起来了！'},{speaker:'风精灵',line:'好像……吹得太用力了。'},{speaker:'园丁',line:'接住一颗，就种下一颗。'},{speaker:'风精灵',line:'这次我帮你吹慢一点。'},{speaker:'园丁',line:'你看，我们的发现开花了。'},{speaker:'风精灵',line:'明天还来这里，好吗？'}]},
  {id:'moon',number:'02',name:'月亮修补铺',line:'每补一针，接住一个想法。',action:'逗月亮打个嗝',collect:'收好这一份',hint:'点一下逗月亮，拖动把它牵回来。',value:'收好一份想法，让它成为月亮的补丁。',chapters:['月亮又漏了星光','裁缝追着打嗝的月亮','三针把散落想法接回来','补丁拼成新的风景'],assets:['background','background-finale','moon','moon-hiccup','moon-content','tailor','tailor-chase','tailor-proud','thread','patch'],story:[{speaker:'裁缝',line:'今晚又漏了几个小想法。'},{speaker:'月亮',line:'我保证坐好……嗝！'},{speaker:'裁缝',line:'别跑！线还在我手里呢。'},{speaker:'月亮',line:'不是我想跑，是星光在挠痒。'},{speaker:'裁缝',line:'一针接住，再一针收好。'},{speaker:'月亮',line:'这块补丁，像不像一颗星？'},{speaker:'裁缝',line:'补好了，你有自己的新花纹。'},{speaker:'月亮',line:'那就把今晚也缝进来吧。'}]},
  {id:'shadow',number:'03',name:'影子排练场',line:'你给一点光，我换一种模样。',action:'让影子即兴',collect:'留住这个姿势',hint:'点一下换动作，左右拖动灯光。',value:'留住喜欢的姿势，前排多一位小观众。',chapters:['先向舞台行一个礼','跃起，把胆量交给光','镜像搭档一起跳','谢幕，留下一场表演'],assets:['background','background-finale','dancer','dancer-bow','dancer-leap','dancer-spin','light','light-brave','beam'],story:[{speaker:'影子',line:'灯光准备好了吗？我有点紧张。'},{speaker:'小光团',line:'我在。先迈出一小步。'},{speaker:'影子',line:'我可以跳得再高一点！'},{speaker:'小光团',line:'放心跳，我会接住你的影子。'},{speaker:'影子',line:'原来旁边还有另一个我。'},{speaker:'小光团',line:'一起跳，就不用一个人勇敢。'},{speaker:'影子',line:'这一场，比想象里还好。'},{speaker:'小光团',line:'谢谢你，也给自己一个掌声。'}]},
];
const chapterLength=duration/4;
type GardenPlot={x:number;y:number};
const gardenSlots=[.414,.49,.565,.638].map((x,i)=>({x,y:.747+i%2*.008}));
const safePlot=(plot:GardenPlot):GardenPlot=>({x:clamp(plot.x,.39,.66),y:clamp(plot.y,.73,.765)});
function readGardenPlots():GardenPlot[]{
  try{const value=JSON.parse(localStorage.getItem('chippytea-garden-plots')||'null');
    if(Array.isArray(value)){const valid=value.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(-4).map(safePlot);if(valid.length)return valid;}
  }catch{}
  return gardenSlots.slice(0,Math.min(4,readCounts().gravity));
}
const readCounts=():Record<WorldId,number>=>{try {const value=JSON.parse(localStorage.getItem('chippytea-original-worlds')||'{}');return {gravity:clamp(Number(value.gravity)||0,0,30),moon:clamp(Number(value.moon)||0,0,30),shadow:clamp(Number(value.shadow)||0,0,30)};}catch{return {gravity:0,moon:0,shadow:0};}};
type DancerPose='dancer'|'dancer-bow'|'dancer-leap'|'dancer-spin';
type Pose={x:number;y:number;time:number;strength:number;pose?:DancerPose};
const isDancerPose=(value:unknown):value is DancerPose=>typeof value==='string'&&['dancer','dancer-bow','dancer-leap','dancer-spin'].includes(value);
function readPoses():Pose[]{try{const items=JSON.parse(localStorage.getItem('chippytea-shadow-poses')||'[]');return Array.isArray(items)?items.filter(p=>p&&[p.x,p.y,p.time,p.strength].every(Number.isFinite)).slice(-3).map(p=>({x:clamp(p.x,.12,.9),y:clamp(p.y,.2,.85),time:clamp(p.time,0,duration),strength:clamp(p.strength,0,100),pose:isDancerPose(p.pose)?p.pose:undefined})):[];}catch{return [];}}
type Reply={kind:'action'|'capture';phase:number;sequence:number;pose?:DancerPose};
function replyLine(scene:WorldId,reply:Reply):StoryLine{
  const p=reply.phase;
  if(reply.kind==='capture'){
    if(scene==='gravity')return [{speaker:'园丁',line:'留下这一颗。'},{speaker:'风精灵',line:'我帮你送过去。'},{speaker:'园丁',line:'种好了，长出来了！'}][p];
    if(scene==='moon')return [{speaker:'裁缝',line:'这一份，我来收好。'},{speaker:'月亮',line:'轻一点，缝在这里。'},{speaker:'月亮',line:'这一针，缝住了。'}][p];
    return [{speaker:'影子',line:'这个姿势，值得留下。'},{speaker:'小光团',line:'别动，我用光记住你。'},{speaker:'影子',line:'前排多了一个小小的我！'}][p];
  }
  if(scene==='gravity')return [{speaker:'风精灵',line:'风来啦，准备好！'},{speaker:'园丁',line:'等等！我来接。'},{speaker:'风精灵',line:'接住了，下次再轻一点。'}][p];
  if(scene==='moon')return [{speaker:'月亮',line:'你一逗我，我就……嗝！'},{speaker:'裁缝',line:'线牵住了，别急。'},{speaker:'月亮',line:'好啦，我坐稳了。'}][p];
  const verb=reply.pose==='dancer-spin'?'转个圈':reply.pose==='dancer-leap'?'跳起来':reply.pose==='dancer-bow'?'行个礼':'站稳了';
  return [{speaker:'影子',line:'看我'+verb+'！'},{speaker:'小光团',line:'灯跟上了，继续！'},{speaker:'影子',line:'这一拍，我们合上了。'}][p];
}
const assetCache=new Map<string,Promise<Asset>>();
function loadAsset(src:string):Promise<Asset>{
  const cached=assetCache.get(src);if(cached)return cached;
  const pending=new Promise<Asset>((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>{try{
  let box:[number,number,number,number]=[0,0,image.width,image.height];
  if(!/\/background(?:-finale)?\.png$/.test(src)){const scratch=document.createElement('canvas');scratch.width=image.width;scratch.height=image.height;const context=scratch.getContext('2d')!;context.drawImage(image,0,0);const pixels=context.getImageData(0,0,image.width,image.height).data;let left=image.width,top=image.height,right=0,bottom=0;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(pixels[(y*image.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}if(right>left&&bottom>top)box=[left,top,right-left+1,bottom-top+1];}
  resolve({image,box});}catch{reject(new Error('场景素材暂未加载，请刷新重试。'));}};image.onerror=()=>reject(new Error('场景素材暂未加载，请刷新重试。'));image.src=src;});
  assetCache.set(src,pending);pending.catch(()=>{if(assetCache.get(src)===pending)assetCache.delete(src);});return pending;
}

export function WorldExperience(){
  const requested=new URLSearchParams(location.search).get('scene');
  const [selected,setSelected]=useState<WorldId>(worlds.some(w=>w.id===requested)?requested as WorldId:'gravity');
  const world=worlds.find(w=>w.id===selected)!;
  const [counts,setCounts]=useState(readCounts);
  const [reducedMotion,setReducedMotion]=useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing,setPlaying]=useState(!reducedMotion);
  const [time,setTime]=useState(0);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [interaction,setInteraction]=useState(0);
  const [strength,setStrength]=useState(50);
  const [theater,setTheater]=useState(false);
  const [playlist,setPlaylist]=useState(false);
  const [endingHold,setEndingHold]=useState(false);
  const [plantMode,setPlantMode]=useState(false);
  const [reply,setReply]=useState<Reply|null>(null);
  const [musicState,setMusicState]=useState<MusicState>({wanted:false,status:'off',message:''});
  const music=useRef<WorldAudio|null>(null);
  if(!music.current)music.current=new WorldAudio(setMusicState);
  const canvas=useRef<HTMLCanvasElement>(null);
  const theaterButton=useRef<HTMLButtonElement>(null);
  const clock=useRef({time:0,playing,last:0});
  const sequence=useRef({active:false,index:0,hold:0});
  const pointer=useRef({x:.64,y:.5,dragging:false});
  const impulse=useRef({age:100,count:0});
  const capture=useRef<{age:number;x:number;y:number;pose?:DancerPose}>({age:100,x:.64,y:.5});
  const speech=useRef<{age:number;reply:Reply}|null>(null);
  const speechSequence=useRef(0);
  const currentCounts=useRef(counts);
  const savedPoses=useRef(readPoses());
  const gardenPlots=useRef(readGardenPlots());
  const planting=useRef(false),plantPointer=useRef(false);
  const gardenTarget=useRef<GardenPlot>({x:.54,y:.75});
  const force=useRef(strength);
  const reduced=useRef(reducedMotion);
  currentCounts.current=counts;force.current=strength;
  useEffect(()=>{document.title=world.name+' · 原创音乐小世界';clock.current.time=0;clock.current.last=0;music.current?.setScene(selected,0,false);setTime(0);setMessage('');setInteraction(0);setReply(null);planting.current=false;plantPointer.current=false;setPlantMode(false);speech.current=null;pointer.current={x:.64,y:.5,dragging:false};impulse.current={age:100,count:0};capture.current={age:100,x:.64,y:.5};const url=new URL(location.href);url.searchParams.set('scene',selected);url.searchParams.set('v','10');history.replaceState(null,'',url);},[selected]);
  useEffect(()=>{clock.current.playing=playing;clock.current.last=0;music.current?.transport(playing&&!document.hidden);},[playing]);
  useEffect(()=>{const resetFrame=()=>{clock.current.last=0;music.current?.transport(clock.current.playing&&!document.hidden);};document.addEventListener('visibilitychange',resetFrame);return()=>document.removeEventListener('visibilitychange',resetFrame);},[]);
  useEffect(()=>()=>music.current?.dispose(),[]);
  useEffect(()=>{if(!theater)return;const exit=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setTheater(false);requestAnimationFrame(()=>theaterButton.current?.focus());}};document.addEventListener('keydown',exit);return()=>document.removeEventListener('keydown',exit);},[theater]);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>{
    reduced.current=query.matches;setReducedMotion(query.matches);
    music.current?.setReduced(query.matches);
    if(query.matches){
      const actionActive=impulse.current.age<3.5;
      if(actionActive)impulse.current.age=.8;
      if(capture.current.age<2.6)capture.current.age=2.6;
      if(speech.current){const next={...speech.current.reply,phase:speech.current.reply.kind==='capture'?2:actionActive?0:2};speech.current={age:next.kind==='capture'?2.6:actionActive?.8:2.6,reply:next};setReply(next);}
      clock.current.playing=false;clock.current.last=0;setPlaying(false);
      sequence.current.active=false;sequence.current.hold=0;setPlaylist(false);setEndingHold(false);
    }
  };query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  useEffect(()=>{
    let disposed=false,raf=0;setReady(false);setError('');
    const node=canvas.current!;const ctx=node.getContext('2d')!;
    Promise.all(world.assets.map(name=>loadAsset('./worlds/'+selected+'/'+name+'.png').then(asset=>[name,asset] as const))).then(entries=>{
      if(disposed)return;const images=Object.fromEntries(entries) as Record<string,Asset>;setReady(true);music.current?.transport(clock.current.playing&&!document.hidden);
      let lastUi=-1;
      const paint=(now:number)=>{
        if(disposed)return;
        const state=clock.current;const elapsed=state.last?clamp((now-state.last)/1000,0,.25):0;state.last=now;const beforeTime=state.time;
        if(!document.hidden&&!reduced.current){
          if(music.current?.hasClock(selected))state.time=music.current.time();
          else if(state.playing)state.time=Math.min(duration-.01,state.time+elapsed);
          // User replies have their own clock: pausing the play never cuts a gesture short.
          impulse.current.age=Math.min(100,impulse.current.age+elapsed);
          capture.current.age=Math.min(100,capture.current.age+elapsed);
          if(speech.current){
            speech.current.age+=elapsed;
            const age=speech.current.age;
            if(age>=4){speech.current=null;setReply(null);}
            else{const phase=age<(speech.current.reply.kind==='capture'?.2:1.25)?0:age<(speech.current.reply.kind==='capture'?2.6:2.55)?1:2;if(phase!==speech.current.reply.phase){speech.current.reply={...speech.current.reply,phase};setReply(speech.current.reply);}}
          }
          if(state.playing&&state.time>=duration-.01){
            const run=sequence.current;
            if(run.active){
              // Keep the tableau on stage, including any late action or collection.
              if(worlds[run.index].id===selected){
                if(run.hold===0)setEndingHold(true);
                run.hold+=Math.max(0,elapsed-Math.max(0,duration-.01-beforeTime));
                if(run.hold>=3.5&&!pointer.current.dragging&&impulse.current.age>=3.5&&capture.current.age>=2.6&&!speech.current){
                  run.hold=0;setEndingHold(false);
                  if(run.index<worlds.length-1){run.index++;setSelected(worlds[run.index].id);}
                  else{run.active=false;setPlaylist(false);state.playing=false;lastUi=-1;setPlaying(false);setMessage('三场演完了，谢谢你陪我们到谢幕。');}
                }
              }
            }else{state.playing=false;lastUi=-1;setPlaying(false);}
          }
        }
        const t=state.time;const frame=Math.floor(t*5);
        if(frame!==lastUi){lastUi=frame;setTime(t);}
        const rect=node.getBoundingClientRect();const dpr=Math.min(1.5,devicePixelRatio||1);const width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);if(node.width!==width||node.height!==height){node.width=width;node.height=height;}
        ctx.setTransform(node.width/1536,0,0,node.height/1024,0,0);
        const result=renderWorld(ctx,images,{
          scene:selected,time:t,age:impulse.current.age,interaction:impulse.current.count,
          x:pointer.current.x,y:pointer.current.y,dragging:pointer.current.dragging,
          strength:force.current,mobile:rect.width<650,reduced:reduced.current,
          count:currentCounts.current[selected],poses:savedPoses.current,
          gardenPlots:gardenPlots.current,gardenPreview:planting.current?gardenTarget.current:undefined,
          captureAge:capture.current.age,captureX:capture.current.x,captureY:capture.current.y,capturePose:capture.current.pose,
          audio:music.current?.bands(),
        });
        const exposed=result as typeof result & {partnerPose?:string;actionPhase?:string;capturePhase?:string;captureProgress?:number};
        node.dataset.time=t.toFixed(2);node.dataset.chapter=String(result.chapter);node.dataset.pose=result.pose;node.dataset.partnerPose=exposed.partnerPose||'';node.dataset.playing=String(state.playing&&!document.hidden&&!reduced.current);node.dataset.interactions=String(impulse.current.count);node.dataset.pointer=pointer.current.x.toFixed(2);node.dataset.captureAge=capture.current.age.toFixed(2);node.dataset.actionAge=impulse.current.age.toFixed(2);node.dataset.ended=String(t>=duration-.01);node.dataset.actionPhase=exposed.actionPhase||'';node.dataset.capturePhase=exposed.capturePhase||'';node.dataset.captureProgress=String(exposed.captureProgress??0);node.dataset.playlist=String(sequence.current.active);node.dataset.endingHold=sequence.current.hold.toFixed(2);node.dataset.zoom=String(result.zoom);node.dataset.planting=String(planting.current);
        raf=requestAnimationFrame(paint);
      };raf=requestAnimationFrame(paint);
    }).catch(e=>{if(!disposed)setError(e.message);});
    return()=>{disposed=true;cancelAnimationFrame(raf);};
  },[selected]);
  const chapter=Math.min(3,Math.floor(time/chapterLength));
  const storyIndex=Math.min(world.story.length-1,Math.floor(time/(chapterLength/2)));
  const storyLine=reply?replyLine(selected,reply):world.story[storyIndex];
  function speak(kind:Reply['kind'],pose?:DancerPose){const next:Reply={kind,phase:reduced.current&&kind==='capture'?2:0,sequence:++speechSequence.current,pose};speech.current={age:reduced.current?(kind==='capture'?2.6:.8):0,reply:next};setReply(next);}
  function cancelPlaylist(){sequence.current.active=false;sequence.current.hold=0;setPlaylist(false);setEndingHold(false);}
  function chooseWorld(id:WorldId){
    cancelPlaylist();
    if(id!==selected){music.current?.setScene(id,0,false);clock.current.playing=!reduced.current;setPlaying(!reduced.current);setSelected(id);}
  }
  function seek(value:number,start=false,keepPlaylist=false){
    if(!keepPlaylist)cancelPlaylist();
    const next=clamp(value,0,duration-.01);clock.current.time=next;clock.current.last=0;setTime(next);
    impulse.current.age=100;capture.current.age=100;speech.current=null;setReply(null);
    const shouldPlay=start&&!reduced.current;clock.current.playing=shouldPlay;music.current?.seek(next,shouldPlay&&!document.hidden);setPlaying(shouldPlay);
  }
  function togglePlaylist(){
    if(!ready||reduced.current)return;
    if(sequence.current.active){cancelPlaylist();setMessage('连演已取消，继续看这一场。');return;}
    sequence.current={active:true,index:0,hold:0};setPlaylist(true);setEndingHold(false);
    if(selected!=='gravity')music.current?.setScene('gravity',0,false);
    seek(0,true,true);
    if(selected!=='gravity')setSelected('gravity');
    setMessage('从花园开始，依次看完三个世界。');
  }
  function trigger(){
    if(!ready)return;
    impulse.current={age:reduced.current?.8:0,count:impulse.current.count+1};setInteraction(impulse.current.count);
    const nextPose:DancerPose=['dancer','dancer-leap','dancer-spin','dancer-bow'][impulse.current.count%4] as DancerPose;
    speak('action',nextPose);
    setMessage(selected==='gravity'?'风来了，园丁准备接住星种。':selected==='moon'?'月亮打嗝，裁缝把线牵稳了。':replyLine('shadow',{kind:'action',phase:0,sequence:0,pose:nextPose}).line);
  }
  function toggleMusic(){
    if(!worldScores[selected].src||!ready||reduced.current)return;
    if(musicState.wanted){
      const next=music.current?.disable()??clock.current.time;clock.current.time=next;clock.current.last=0;setTime(next);return;
    }
    if(clock.current.time>=duration-.01)seek(0,true);
    clock.current.playing=true;clock.current.last=0;setPlaying(true);
    music.current?.enable(selected,clock.current.time,!document.hidden,reduced.current);
  }
  function save(plot?:GardenPlot){
    if(!ready)return;
    if(selected==='gravity'){
      const candidates=[...gardenSlots.slice(counts.gravity%4),...gardenSlots.slice(0,counts.gravity%4)];
      const free=candidates.find(p=>gardenPlots.current.every(old=>Math.abs(old.x-p.x)>.045));
      const nextPlot=safePlot(plot||free||candidates[0]);gardenPlots.current=[...gardenPlots.current,nextPlot].slice(-4);
      planting.current=false;plantPointer.current=false;setPlantMode(false);
    }
    const next={...currentCounts.current,[selected]:Math.min(30,currentCounts.current[selected]+1)};currentCounts.current=next;setCounts(next);
    const visiblePose=(canvas.current?.dataset.pose||'').split(' + ')[0],pose=isDancerPose(visiblePose)?visiblePose:undefined;
    capture.current={age:reduced.current?2.6:0,x:pointer.current.x,y:pointer.current.y,pose};speak('capture',pose);
    if(selected==='shadow')savedPoses.current=[...savedPoses.current,{x:pointer.current.x,y:pointer.current.y,time:clamp(clock.current.time,0,duration),strength,pose}].slice(-3);
    try{localStorage.setItem('chippytea-original-worlds',JSON.stringify(next));if(selected==='shadow')localStorage.setItem('chippytea-shadow-poses',JSON.stringify(savedPoses.current));if(selected==='gravity')localStorage.setItem('chippytea-garden-plots',JSON.stringify(gardenPlots.current));}catch{setMessage('已留在这次演出里；当前浏览器暂不允许保存到本机。');return;}
    setMessage(selected==='gravity'?'第 '+next[selected]+' 颗发现，正在'+(plot?'你选的位置':'花园里')+'生根。':selected==='moon'?'第 '+next[selected]+' 份想法，正在缝成补丁。':'第 '+next[selected]+' 个姿势，正在留到前排。');
  }
  function updateGardenTarget(event:React.PointerEvent<HTMLCanvasElement>){
    const rect=event.currentTarget.getBoundingClientRect(),zoom=Number(canvas.current?.dataset.zoom)||1,t=clock.current.time;
    const ease=(a:number,b:number,value:number)=>{const v=clamp((value-a)/(b-a),0,1);return v*v*(3-2*v);};
    const offset=reduced.current?0:Math.sin(t*.21)*ease(6,10,t)*(1-ease(20,25,t))*18;
    gardenTarget.current=safePlot({x:(768+((event.clientX-rect.left)/rect.width*1536-768)/zoom-offset)/1536,y:(570+((event.clientY-rect.top)/rect.height*1024-570)/zoom)/1024});
  }
  function togglePlanting(){if(!ready||selected!=='gravity')return;planting.current=!planting.current;plantPointer.current=false;setPlantMode(planting.current);if(planting.current){cancelPlaylist();clock.current.playing=false;clock.current.last=0;setPlaying(false);music.current?.transport(false);}setMessage(planting.current?'已暂停。点一下岛上的空地，种在你喜欢的位置；方向键选位，Enter 种下，Esc 取消。':world.value);requestAnimationFrame(()=>canvas.current?.focus());}
  function cancelPlanting(){planting.current=false;plantPointer.current=false;setPlantMode(false);setMessage('这颗发现先留在手里。');}
  function pointerMove(event:React.PointerEvent<HTMLCanvasElement>){if(planting.current){updateGardenTarget(event);return;}if(!pointer.current.dragging)return;const rect=event.currentTarget.getBoundingClientRect();pointer.current.x=clamp((event.clientX-rect.left)/rect.width,.12,.9);pointer.current.y=clamp((event.clientY-rect.top)/rect.height,.2,.85);}
  return <div className={'world-experience world-'+selected+(theater?' world-theater':'')+(plantMode?' world-planting':'')}>
    <header className="world-header"><a href="./">Chippytea Lab<span>原创小世界 · 016</span></a><nav><a href="./">理解与全部入口</a><a href="./?view=source">原作对照</a><a href="./?view=research&mode=records">研究资料</a><a href="./?view=folio">纸墨实验</a></nav></header>
    <div className="world-tabs" role="tablist" aria-label="分别体验三个原创场景">{worlds.map((item,i)=><button id={'world-tab-'+item.id} role="tab" aria-selected={selected===item.id} aria-controls="world-panel" tabIndex={selected===item.id?0:-1} key={item.id} onClick={()=>chooseWorld(item.id)} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=worlds[(i+(e.key==='ArrowRight'?1:2))%3];chooseWorld(next.id);requestAnimationFrame(()=>document.getElementById('world-tab-'+next.id)?.focus());}}}><span>{item.number}</span>{item.name}</button>)}</div>
    <main id="world-panel" role="tabpanel" aria-labelledby={'world-tab-'+selected}>
      <div className="world-view-tools"><button ref={theaterButton} aria-pressed={theater} aria-controls="world-stage" onClick={()=>setTheater(!theater)}>{theater?'退出专注观看':'专注看演出'}</button><button className="world-playlist" aria-pressed={playlist} aria-controls="world-stage" disabled={!ready||reducedMotion} onClick={togglePlaylist}>{playlist?'取消连演':'连演三个世界'}</button>{worldScores[selected].src&&<button className="world-music-toggle" aria-pressed={musicState.wanted} aria-controls="world-stage" disabled={!ready||reducedMotion} onClick={toggleMusic}>{(musicState.wanted?'关闭':'开启')+worldScores[selected].name+'配乐'}</button>}<span className="world-view-status" role="status">{playlist?'连演 '+world.number+' / 03'+(!playing?' · 已暂停':endingHold?' · 等这一幕收好':''):theater?'按 Esc 退出 · 仍可点按舞台':reducedMotion?'静止观看 · 可手动选幕':'32 秒四幕 · 演完停在谢幕'}</span><small className="world-edition" aria-label="第十版">v10</small></div>
      {worldScores[selected].src&&(musicState.message||musicState.status==='preparing')&&<p className="world-music-feedback" role="status">{musicState.message||'配乐正在准备…'}</p>}
      <section id="world-stage" className={'world-stage'+(time>3||reply?' world-stage-in-story':'')} aria-label={world.name+'互动舞台'} aria-busy={!ready}>
        <canvas ref={canvas} tabIndex={ready?0:-1} aria-label={plantMode?'花园选位：方向键移动，Enter种下，Esc取消。':world.hint+' 也可用方向键移动，空格触发。'} role="img"
          onKeyDown={e=>{
            if(!ready)return;
            if(planting.current){
              if(e.key==='Escape'){e.preventDefault();cancelPlanting();}
              else if(e.key==='Enter'||e.key===' '){e.preventDefault();save(gardenTarget.current);}
              else if(e.key.startsWith('Arrow')){e.preventDefault();gardenTarget.current=safePlot({x:gardenTarget.current.x+(e.key==='ArrowRight'?.014:e.key==='ArrowLeft'?-.014:0),y:gardenTarget.current.y+(e.key==='ArrowDown'?.007:e.key==='ArrowUp'?-.007:0)});}
              return;
            }
            if(e.key.startsWith('Arrow')){e.preventDefault();pointer.current.x=clamp(pointer.current.x+(e.key==='ArrowRight'?.05:e.key==='ArrowLeft'?-.05:0),.12,.9);pointer.current.y=clamp(pointer.current.y+(e.key==='ArrowDown'?.05:e.key==='ArrowUp'?-.05:0),.2,.85);trigger();}
            else if(e.key===' '){e.preventDefault();trigger();}
          }}
          onPointerDown={e=>{if(!ready)return;e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);if(planting.current){plantPointer.current=true;updateGardenTarget(e);}else{pointer.current.dragging=true;pointerMove(e);trigger();}}}
          onPointerMove={pointerMove}
          onPointerUp={e=>{if(planting.current&&plantPointer.current){updateGardenTarget(e);save(gardenTarget.current);}pointer.current.dragging=false;plantPointer.current=false;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
          onPointerCancel={()=>{pointer.current.dragging=false;plantPointer.current=false;}}/>
        <div className="world-title"><p>一个可以参与的奇想</p><h1>{world.name}</h1><div>{world.line}</div></div>
        <div className={'world-story-line'+(ready&&(time>3||reply)?' is-visible':'')} data-speaker={storyLine.speaker} data-source={reply?.kind||'story'}><p key={selected+'-'+(reply?reply.sequence+'-'+reply.phase:storyIndex)}><span>{storyLine.speaker}</span>{storyLine.line}</p></div>
        {(!ready||error)&&<div className="world-loading" role="status">{error||'正在布置舞台…'}</div>}
        <div className="world-caption"><span>{world.number} / {String(chapter+1).padStart(2,'0')}</span><strong key={selected+'-'+chapter}>{world.chapters[chapter]}</strong></div>
      </section>
      <section className="world-controls" aria-label="演出与互动控制">
        <nav className="world-chapters" aria-label="分幕观看">{world.chapters.map((label,i)=><button key={i} aria-current={chapter===i?'step':undefined} disabled={!ready} onClick={()=>{impulse.current.age=100;seek(i*chapterLength+.05,true);setMessage('第 '+(i+1)+' 幕：'+label+'。');}}><span>{String(i+1).padStart(2,'0')}</span>{label}</button>)}</nav>
        <div className="world-actions"><button className="world-primary" onClick={trigger} disabled={!ready}>{world.action}</button><button className="world-collect" onClick={()=>save()} disabled={!ready}>{world.collect}<small>{counts[selected]} 份 · 本机小世界</small></button>{selected==='gravity'&&<button className="world-plant" aria-pressed={plantMode} onClick={togglePlanting} disabled={!ready}>{plantMode?'取消选位':'选个位置种下'}</button>}</div>
        <div className="world-transport"><button onClick={()=>{if(sequence.current.active){clock.current.playing=!playing;setPlaying(!playing);}else if(clock.current.time>=duration-.01)seek(0,true);else{clock.current.playing=!playing;setPlaying(!playing);}}} disabled={!ready||reducedMotion}>{reducedMotion?'静止模式':playing?'暂停演出':playlist?'继续连演':time>=duration-.01?'再演一场':'继续演出'}</button><button onClick={()=>{seek(0,true);setMessage('从头再演一次。');}} disabled={!ready}>从头再演</button><label className="world-time">演出进度<input aria-label="演出进度" type="range" min="0" max={duration-.01} step=".05" value={time} disabled={!ready} onPointerDown={()=>{cancelPlaylist();clock.current.playing=false;setPlaying(false);}} onChange={e=>seek(Number(e.target.value))}/><span>{String(time>=duration-.01?duration:Math.floor(time)).padStart(2,'0')} / {duration} 秒</span></label></div>
        <div className="world-instructions"><p>{world.hint}</p><label>{selected==='gravity'?'风的胆量':selected==='moon'?'月亮的淘气程度':'影子的胆量'}<input type="range" min="0" max="100" value={strength} onChange={e=>setStrength(Number(e.target.value))}/></label><p className="world-status" role="status">{message||world.value}</p></div>
        <div className="world-audio-status" role="status"><span className="world-music-note">{!worldScores[selected].src?'这一场静音观看 · 配乐待生成':reducedMotion?'静止观看 · 配乐已暂停':musicState.message||(!musicState.wanted?'MiniMax 原创'+worldScores[selected].name+'配乐已备好 · 点上方开启':musicState.status==='preparing'?'配乐正在准备…':musicState.status==='playing'?worldScores[selected].name+'跟着配乐起舞':musicState.status==='ended'?'配乐演完了 · 停在谢幕':musicState.status==='paused'?'配乐已暂停 · 与演出一起继续':'配乐已备好')}</span><span>{interaction} 次互动 · 收藏保存在本机</span></div>
      </section>
    </main>
  </div>;
}
