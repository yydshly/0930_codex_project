import { DestructionEngine } from '../engine.js?v=avatar-1';
import { drawCharacter } from './character.js';

const $ = id => document.getElementById(id);
const stage = $('avatar-stage'), source = $('scene-source');
const actorCanvas = $('actor-canvas'), ctx = actorCanvas.getContext('2d');
const engineCanvas = $('engine-canvas');
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
let engine = null, generation = 0, preparing = false, idleFrame = 0;
let headImage = null, clock = 0, width = 0, height = 0, dpr = 1;
let home = null, targets = [], targetIndex = 0, actions = 0;
let actor = {phase:'home', x:0, y:0, scale:1, facing:1, age:0};
let route = null, kickDone = false;
const events = [];
const names = {escape:'跳出头像',land:'落到页面',run:'跑向卡片',kick:'踢中真实页面',recall:'召回角色',home:'回到头像',restore:'复原页面',upload:'更换头像头部',clear:'恢复原创角色',resize:'尺寸变化，复原场景'};

function record(type, detail={}) {
  events.push({time:new Date().toISOString(),type,...detail});
  const items = events.slice(-8).reverse().map(event => {
    const li=document.createElement('li');
    li.textContent=`${new Date(event.time).toLocaleTimeString('zh-CN',{hour12:false})} · ${names[event.type]||event.type}${event.released!==undefined?` · ${event.released} 片被释放`:''}`;
    return li;
  });
  $('event-log').replaceChildren(...items);
}
function status(text) { $('actor-status').textContent=text; }
function controls() {
  const atHome=actor.phase==='home';
  $('escape').disabled=preparing||!atHome;
  $('escape').textContent=engine?'再跳出来':'让他跳出来';
  $('mischief').disabled=preparing||actor.phase!=='idle';
  $('recall').disabled=preparing||atHome||actor.phase==='returning';
  $('head-upload').disabled=preparing||!atHome;
  $('clear-head').disabled=preparing||!atHome||!headImage;
}
function measure() {
  const b=source.getBoundingClientRect(), r=source.querySelector('[data-avatar-home]').getBoundingClientRect();
  width=Math.round(b.width);height=Math.round(b.height);dpr=Math.min(devicePixelRatio||1,2);
  actorCanvas.width=Math.round(width*dpr);actorCanvas.height=Math.round(height*dpr);
  home={x:r.left-b.left+r.width/2,y:r.top-b.top+r.height/2,radius:r.width/2-6};
  targets=[...source.querySelectorAll('[data-target]')].map(element=>{
    element.dataset.tag=element.dataset.target;
    const t=element.getBoundingClientRect();
    return {id:element.dataset.target,x:t.left-b.left,y:t.top-b.top,width:t.width,height:t.height,element};
  });
}
function enterHome() {
  actor={phase:'home',x:home.x,y:home.y+80*(home.radius/26),scale:home.radius/26,facing:1,age:0};
  route=null;controls();status('阿栗还在头像里。让他跳出来，看看他会做什么。');
}
function draw() {
  if(!home)return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  if(actor.phase!=='home') {
    // A visible empty portal remains where the character originally lived.
    ctx.save();ctx.strokeStyle='#ed9b61';ctx.lineWidth=2;ctx.setLineDash([4,7]);ctx.beginPath();ctx.arc(home.x,home.y,home.radius-1,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.save();
  if(actor.phase==='home') {ctx.beginPath();ctx.arc(home.x,home.y,home.radius,0,Math.PI*2);ctx.clip();}
  if(actor.phase==='leaping'&&actor.age<.28) {
    ctx.beginPath();ctx.arc(home.x,home.y,home.radius+actor.age*650,0,Math.PI*2);ctx.clip();
  }
  if(actor.phase==='returning'&&route.duration-actor.age<.28) {ctx.beginPath();ctx.arc(home.x,home.y,home.radius+Math.max(0,route.duration-actor.age)*650,0,Math.PI*2);ctx.clip();}
  const pose=actor.phase==='leaping'?'jump':actor.phase==='running'?'run':actor.phase==='kicking'?'kick':actor.phase==='returning'?'jump':'idle';
  drawCharacter(ctx,{x:actor.x,y:actor.y,scale:actor.scale,pose,time:clock,facing:actor.facing,headImage,portrait:actor.phase==='home'});
  ctx.restore();
  if(actor.phase==='idle'||actor.phase==='celebrating') {
    const message=actor.phase==='celebrating'?'嘿嘿，真碎了！':'下一张呢？';
    const bx=clamp(actor.x-28,8,width-118),by=Math.max(8,actor.y-146);
    ctx.fillStyle='#fff8eb';ctx.strokeStyle='#e9bd8d';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(bx,by,108,28,9);ctx.fill();ctx.stroke();
    ctx.fillStyle='#915c36';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText(message,bx+54,by+18);
  }
}
function idleLoop(time) {
  clock=time/1000;draw();idleFrame=requestAnimationFrame(idleLoop);
}
function startPortraitLoop() {cancelAnimationFrame(idleFrame);idleFrame=requestAnimationFrame(idleLoop);}
function counters() {
  const stats=engine?.getState();
  $('fragment-count').textContent=engine?engine.tiles.filter(t=>t.detached).length:'0';
  $('mischief-count').textContent=actions;
  stage.dataset.phase=actor.phase;
  if(stats)stage.dataset.effect=stats.effect;
}
function pickTarget() {
  // Prefer an intact region, then return to the one with most remaining texture.
  const available=targets.filter(t=>!engine||engine.tiles.some(tile=>!tile.detached&&tile.tag===t.id));
  if(!available.length)return null;
  const ordered=targets.slice(targetIndex).concat(targets.slice(0,targetIndex));
  const chosen=ordered.find(t=>available.includes(t));
  targetIndex=(targets.indexOf(chosen)+1)%targets.length;
  return chosen;
}
function beginRun(target) {
  if(!target) {actor.phase='idle';controls();status('三张卡片已经散开了。可以叫他回来，或复原页面。');return;}
  const x=clamp(target.x-13,54,width-75),y=clamp(target.y+target.height*.62+20,120,height-35);
  const distance=Math.hypot(x-actor.x,y-actor.y);
  route={from:{x:actor.x,y:actor.y},to:{x,y},duration:clamp(distance/260,.5,1.7),target};
  actor.phase='running';actor.age=0;actor.facing=x>=actor.x?1:-1;
  controls();status('阿栗正跑向页面卡片……');record('run',{target:target.id});
  if(matchMedia('(max-width:760px)').matches)target.element.scrollIntoView({behavior:'smooth',block:'center'});
}
function beginJump() {
  const target=pickTarget();
  if(!target){status('已经没有完整卡片了，请先复原页面。');return;}
  const destination={x:clamp(home.x+155,80,width-65),y:clamp(target.y+target.height+18,140,height-28)};
  route={from:{x:home.x,y:home.y},to:destination,duration:1.15,target,startScale:home.radius/26};
  actor.phase='leaping';actor.age=0;actor.facing=1;
  record('escape',{source:'avatar',target:target.id,effect:engine.effect});
  controls();status('阿栗从头像里跳出来了！');
}
function update(elapsed) {
  clock+=elapsed;actor.age+=elapsed;
  if(actor.phase==='leaping') {
    const t=clamp(actor.age/route.duration,0,1),u=ease(t);
    actor.scale=mix(route.startScale,1.12,clamp(t/.46,0,1));
    actor.x=mix(route.from.x,route.to.x,u);
    const headY=mix(route.from.y,route.to.y-80*1.12,u)-Math.sin(t*Math.PI)*100;
    actor.y=headY+80*actor.scale;
    if(t===1){const target=route.target;record('land');beginRun(target);}
  } else if(actor.phase==='running') {
    const t=clamp(actor.age/route.duration,0,1),u=ease(t);
    actor.x=mix(route.from.x,route.to.x,u);actor.y=mix(route.from.y,route.to.y,u);
    if(t===1){actor.phase='kicking';actor.age=0;actor.facing=1;kickDone=false;status('踢中了！卡片开始碎裂。');}
  } else if(actor.phase==='kicking') {
    if(!kickDone&&actor.age>=.14) {
      kickDone=true;
      const point={x:actor.x+56*actor.scale,y:actor.y-22*actor.scale};
      const before=engine.tiles.filter(t=>t.detached).length;
      const hit=engine.impactAt(point,{radius:92,strength:1.5,weapon:'blast'});
      const released=engine.tiles.filter(t=>t.detached).length-before;
      if(hit)actions++;
      record('kick',{target:route.target.id,point,released,hit,effect:engine.effect});counters();
    }
    if(actor.age>=.8){actor.phase='celebrating';actor.age=0;controls();}
  } else if(actor.phase==='celebrating'&&actor.age>1) {
    actor.phase='idle';actor.age=0;controls();status('阿栗留在页面上了。再让他捣乱，或叫他回到头像。');
  } else if(actor.phase==='returning') {
    const t=clamp(actor.age/route.duration,0,1),u=ease(t);
    actor.scale=mix(route.startScale,home.radius/26,u);
    actor.x=mix(route.from.x,home.x,u);
    const headY=mix(route.from.y,home.y,u)-Math.sin(t*Math.PI)*90;
    actor.y=headY+80*actor.scale;
    if(t===1){enterHome();status('阿栗已经回到头像。碎片仍留在页面，点“复原页面”恢复内容。');record('home');}
  }
  draw();counters();
}
async function escape() {
  if(preparing||actor.phase!=='home')return;
  if(engine){engine.setPaused(false);beginJump();return;}
  const token=++generation;preparing=true;controls();status('正在把当前卡片交给碎裂引擎……');
  try {
    await document.fonts.ready;measure();
    const current=engine=new DestructionEngine({canvas:engineCanvas,source,effect:'glass',cellSize:42,background:'#f9f7f1',threshold:1,interactive:false,showAim:false,showPlayer:false,onFrame:({elapsed})=>update(elapsed),onEvent:event=>{if(event.type==='stats')counters();}});
    current.setOptions({debug:$('debug').checked,gravity:1,force:1});
    await current.prepare();
    if(token!==generation||current.disposed)return;
    // This scene uses our separate choreographed actor, rather than the old player.
    current.M.Composite.remove(current.physics.world,current.player);
    source.style.visibility='hidden';source.inert=true;engineCanvas.hidden=false;
    cancelAnimationFrame(idleFrame);idleFrame=0;preparing=false;beginJump();current.start();
    stage.scrollIntoView({behavior:'smooth',block:'start'});
  } catch(error) {
    if(token!==generation)return;
    restore(false);status(`准备失败：${error.message}。请重试。`);
  } finally {if(token===generation){preparing=false;controls();}}
}
function recall() {
  if(!engine||actor.phase==='home'||actor.phase==='returning')return;
  route={from:{x:actor.x,y:actor.y-80*actor.scale},startScale:actor.scale,duration:1.2};
  actor.phase='returning';actor.age=0;actor.facing=home.x>=actor.x?1:-1;
  controls();status('听见召唤了，阿栗正跳回头像……');record('recall');
  if(matchMedia('(max-width:760px)').matches)source.querySelector('[data-avatar-home]').scrollIntoView({behavior:'smooth',block:'center'});
}
function restore(log=true) {
  generation++;preparing=false;engine?.dispose();engine=null;actions=0;targetIndex=0;
  source.style.visibility='visible';source.inert=false;engineCanvas.hidden=true;
  engineCanvas.getContext('2d').clearRect(0,0,engineCanvas.width,engineCanvas.height);
  measure();enterHome();counters();startPortraitLoop();
  if(log)record('restore');
}
$('escape').addEventListener('click',escape);
$('mischief').addEventListener('click',()=>{if(actor.phase==='idle')beginRun(pickTarget());});
$('recall').addEventListener('click',recall);
$('restore').addEventListener('click',()=>restore());
$('debug').addEventListener('change',()=>engine?.setOptions({debug:$('debug').checked}));
$('clear-head').addEventListener('click',()=>{headImage=null;$('head-upload').value='';controls();draw();record('clear');});
$('head-upload').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){status('请选择小于 8 MB 的 PNG、JPEG 或 WebP 头像。');event.target.value='';return;}
  const token=generation,url=URL.createObjectURL(file),image=new Image();
  try{image.src=url;await image.decode();if(token!==generation||actor.phase!=='home')return;headImage=image;controls();draw();status('已换成你的头像头部。跳跃和身体动作仍由原创角色动画驱动。');record('upload',{width:image.naturalWidth,height:image.naturalHeight});}
  catch{status('无法读取这张图片，请换一个头像。');event.target.value='';}
  finally{URL.revokeObjectURL(url);}
});
$('export-events').addEventListener('click',()=>{
  const payload={version:1,source:'avatar-mischief',engine:'DestructionEngine',exportedAt:new Date().toISOString(),events};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='avatar-mischief-events.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
});
let resizeTimer;
new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
  const bounds=source.getBoundingClientRect();
  if(width&&Math.abs(bounds.width-width)<2&&Math.abs(bounds.height-height)<2)return;
  const changed=Boolean(engine)||preparing;restore(false);if(changed){record('resize');status('窗口尺寸变了，页面已复原。可以重新让他跳出来。');}
},160);}).observe(source);
document.addEventListener('visibilitychange',()=>{if(engine)engine.setPaused(document.hidden);});
window.addEventListener('pagehide',()=>{generation++;engine?.dispose();cancelAnimationFrame(idleFrame);clearTimeout(resizeTimer);});
window.avatarLab={escape,recall,restore,get engine(){return engine;},events,getState:()=>({actor:{...actor},preparing,home:{...home},width,height,headUploaded:Boolean(headImage),actions,engine:engine?.getState()||null,detached:engine?.tiles.filter(t=>t.detached).length||0,targets:targets.map(({id,x,y,width,height})=>({id,x,y,width,height}))})};
await document.fonts.ready;
restore(false);
