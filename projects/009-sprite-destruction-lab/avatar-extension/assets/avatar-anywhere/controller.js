import {DestructionEngine} from '../engine.js';
import {drawCharacter} from '../avatar/character.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const rectOf=element=>{const r=element.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height};};
const visibleRect=(r,w=innerWidth,h=innerHeight)=>({x:clamp(r.x,0,w),y:clamp(r.y,0,h),width:Math.max(0,Math.min(r.x+r.width,w)-Math.max(r.x,0)),height:Math.max(0,Math.min(r.y+r.height,h)-Math.max(r.y,0))});
const sameRect=(a,b)=>a&&b&&['x','y','width','height'].every(k=>Math.abs(a[k]-b[k])<1.5);
const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const css=`
:host{all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;display:block!important;font:14px/1.5 system-ui,sans-serif!important;color:#283b43!important;}:host([hidden]){display:none!important}
*{box-sizing:border-box} [hidden]{display:none!important} canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none} .panel{position:absolute;right:20px;bottom:20px;width:316px;max-width:calc(100vw - 24px);padding:18px;border:1px solid #e4d9c8;border-radius:18px;background:#fffcf5;box-shadow:0 12px 48px #263a4430;pointer-events:auto;color:#283b43;font:13px/1.6 system-ui,sans-serif} .heading{display:flex;align-items:center;justify-content:space-between;gap:10px}h2{font-size:18px;margin:0;font-weight:750;letter-spacing:0} .tag{font:10px/1.5 monospace;letter-spacing:1px;color:#ad6b3f;margin:0 0 6px} .close{padding:2px 7px!important;background:transparent!important;color:#68777a!important;border:0!important;font-size:21px!important} p{margin:8px 0}button,select{font:inherit;cursor:pointer;border:1px solid #dddfd5;border-radius:9px;background:#fff;padding:8px 10px;color:#283b43;line-height:1.4}button:hover:not(:disabled){background:#f3eadb}button:focus-visible,select:focus-visible{outline:3px solid #a9cfc1;outline-offset:2px}button:disabled{opacity:.45;cursor:default}.selection{display:grid;grid-template-columns:1fr 30px;gap:6px;margin:9px 0}.selection button{text-align:left}.selection .parent{text-align:center;padding:4px}.selection span{display:block;font-size:11px;color:#77827b;margin-top:3px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.selected{border-color:#80aa95;background:#eff6ef}.controls{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0 8px}.primary{background:#2d6d58;color:#fff;border-color:#2d6d58}.primary:hover:not(:disabled){background:#245a49}.wide{grid-column:1/-1}.status{background:#f4eee2;padding:10px 12px;border-radius:9px;min-height:56px;color:#655846}.details{font-size:11px;color:#7a8077;margin:7px 0 0}.effect{display:flex;align-items:center;justify-content:space-between;margin:8px 0;color:#6e7770}.effect select{padding:5px 8px}.outline{position:absolute;border:2px solid #e29d55;border-radius:6px;background:#e29d5518;pointer-events:none}.outline.avatar{border-color:#58a99c;background:#58a99c12}.outline-label{position:absolute;top:-25px;left:0;color:white;background:#ad733e;border-radius:4px;padding:2px 7px;font-size:11px;white-space:nowrap}.avatar .outline-label{background:#317b71}.hint{position:absolute;top:18px;left:50%;transform:translateX(-50%);background:#283b43;color:#fff;border-radius:20px;padding:10px 18px;max-width:calc(100vw - 32px);font-size:13px;box-shadow:0 4px 20px #0002}.stats{font:11px/1.5 monospace;color:#3f8069}.error{color:#9a452f}.scrim{position:absolute;inset:0;pointer-events:auto;cursor:crosshair;background:transparent}@media(max-width:600px){.panel{right:12px;bottom:12px;padding:13px;width:285px}.details{display:none}.hint{font-size:12px;top:10px}}
.hint{pointer-events:auto;cursor:pointer}
`;

/** User-selected DOM anchors + a viewport-pixel provider; no site-specific selectors. */
export function mountAvatarAnywhere({capture}={}) {
  if(typeof capture!=='function')throw new Error('需要提供当前视口截图接口。');
  const host=document.createElement('div');host.id='avatar-anywhere-host';
  host.style.setProperty('all','initial','important');
  const shadow=host.attachShadow({mode:'open'});
  shadow.innerHTML=`<style>${css}</style><canvas id="shards" aria-hidden="true"></canvas><canvas id="actor" aria-hidden="true"></canvas><div id="scrim" class="scrim" hidden></div><div id="avatar-outline" class="outline avatar" hidden><span class="outline-label">头像</span></div><div id="target-outline" class="outline" hidden><span class="outline-label">卡片</span></div><div id="hover-outline" class="outline" hidden></div><p class="hint" id="hint" hidden></p><aside class="panel" aria-label="头像出逃控制"><p class="tag">AVATAR ANYWHERE · LOCAL PIXELS</p><div class="heading"><h2>让头像出来玩</h2><button id="close" class="close" aria-label="关闭并恢复网页">×</button></div><p>先点选网页里的头像，再选一张卡片。</p><div class="selection"><button id="pick-avatar">① 点选头像<span id="avatar-label">照片、图标、SVG 都可以</span></button><button id="parent-avatar" class="parent" title="扩大头像范围" aria-label="扩大头像范围">↑</button><button id="pick-target">② 点选卡片<span id="target-label">点击内容；↑ 可扩大范围</span></button><button id="parent-target" class="parent" title="扩大卡片范围" aria-label="扩大卡片范围">↑</button></div><label class="effect">碎片风格<select id="effect"><option value="glass">玻璃裂解</option><option value="paper">纸片飘散</option><option value="classic">方块破坏</option></select></label><div class="controls"><button id="escape" class="primary wide" disabled>↗ 让他出逃</button><button id="recall" disabled>叫他回来</button><button id="restore">复原页面</button></div><p id="status" class="status" role="status" aria-live="polite">准备好后，他会从你选的头像里跳出来。</p><p id="stats" class="stats">未截取画面</p><p class="details">截图只在内存中处理。滚动、缩放或换页会复原。Esc 取消选择 / 复原。</p></aside>`;
  document.documentElement.append(host);
  const $=id=>shadow.getElementById(id),ctx=$('actor').getContext('2d');
  const signal=(new AbortController()),events=[];
  let open=true,destroyed=false,picking=null,hover=null,avatar=null,target=null;
  let engine=null,head=null,originals=[],token=0,preparing=false,actor=null,route=null,kicked=false,time=0;
  let width=0,height=0,dpr=1,snapshot=null,layout=null,lastMeasure=0,layoutTimer=null;
  const phaseNames={leaping:'从头像里跳出来了',running:'跑向卡片',kicking:'正在踢中卡片',idle:'留在页面上了',returning:'正在回到头像',home:'已回到头像'};
  function record(type,data={}){events.push({type,time:new Date().toISOString(),...data});if(events.length>50)events.shift();}
  function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);if(picking&&error)$('hint').textContent=`${message} · 点此取消`;}
  function outline(id,r){const el=$(id);el.hidden=!r||Boolean(engine)||preparing;if(r)Object.assign(el.style,{left:`${r.x}px`,top:`${r.y}px`,width:`${r.width}px`,height:`${r.height}px`});}
  function controls(){
    $('escape').disabled=preparing||!avatar||!target||Boolean(engine);
    $('recall').disabled=preparing||!engine||['home','returning'].includes(actor?.phase);
    $('effect').disabled=preparing||Boolean(engine);
    for(const role of ['avatar','target']){
      const element=role==='avatar'?avatar:target;
      $(`pick-${role}`).disabled=preparing||Boolean(engine);$(`parent-${role}`).disabled=preparing||Boolean(engine)||!element;
      $(`pick-${role}`).classList.toggle('selected',Boolean(element));
      const r=element?.isConnected?visibleRect(rectOf(element)):null;
      $(`${role}-label`).textContent=r?`${element.tagName.toLowerCase()} · ${Math.round(r.width)} × ${Math.round(r.height)} px`:role==='avatar'?'照片、图标、SVG 都可以':'点击内容；↑ 可扩大范围';
      outline(`${role}-outline`,r);
    }
    $('scrim').hidden=!picking;$('hint').hidden=!picking;
    shadow.querySelector('.panel').hidden=Boolean(picking);
    $('hint').textContent=picking==='avatar'?'点一下头像图像 · 点此取消':'点一下想让他踢的卡片 · 点此取消';
  }
  function acceptable(element,role){
    if(!element||!element.isConnected||element===host||element===document.body||element===document.documentElement||host.contains(element))return '请选择一个具体的网页元素。';
    if(['IFRAME','INPUT','TEXTAREA','VIDEO'].includes(element.tagName))return '请选头像图像或普通内容卡片；暂不支持嵌入窗口和输入区域。';
    if(element.querySelectorAll('*').length>1500)return '这个区域包含太多元素，请缩小选择范围。';
    const r=rectOf(element),v=visibleRect(r);
    if(v.width<12||v.height<12||getComputedStyle(element).visibility==='hidden')return '这个元素当前不可见，请换一个。';
    if(role==='avatar'&&(r.width>360||r.height>360||v.width*v.height<r.width*r.height*.9))return '选一个完整可见、尺寸不超过 360 px 的头像或图标。';
    if(role==='target'&&(v.width<40||v.height<32||v.width*v.height>innerWidth*innerHeight*.55||v.height>innerHeight*.85))return '选一张大小适中的可见卡片，当前范围太大或太小。';
    const other=role==='avatar'?target:avatar;
    if(other&&(element.contains(other)||other.contains(element)))return '头像和卡片需要是分开的元素，请选另一张卡片。';
    return '';
  }
  function candidateAt(x,y){
    const scrim=$('scrim');scrim.style.pointerEvents='none';
    let element=document.elementsFromPoint(x,y).find(item=>item!==host&&!host.contains(item));
    scrim.style.pointerEvents='';
    if(!element)return null;
    if(picking==='avatar')element=element.closest('img,svg,canvas')||element;
    else element=element.closest('img,svg,canvas')||element.closest('article,[role="article"],li')||element;
    return element;
  }
  function select(role,element){
    const error=acceptable(element,role);if(error){status(error,true);return false;}
    if(role==='avatar')avatar=element;else target=element;
    picking=null;hover=null;$('hover-outline').hidden=true;controls();
    status(avatar&&target?'两个位置已选好。点“让他出逃”，截取当前画面并开始。':role==='avatar'?'头像已选好。接着点选一张卡片。':'卡片已选好。接着点选一个头像。');
    record('select',{role,rect:visibleRect(rectOf(element)),tag:element.tagName.toLowerCase()});return true;
  }
  function beginPick(role){if(engine||preparing)return;picking=picking===role?null:role;hover=null;$('hover-outline').hidden=true;controls();}
  function hideElement(element){
    // Explicit visibility:visible on a descendant can override its hidden parent.
    for(const node of [element,...element.querySelectorAll('*')]){
      originals.push({element:node,owner:element,value:node.style.getPropertyValue('visibility'),priority:node.style.getPropertyPriority('visibility'),hadStyle:node.hasAttribute('style')});
      node.style.setProperty('visibility','hidden','important');
    }
  }
  function restoreElement(saved){
    // Restore only our property, preserving concurrent website style updates.
    if(saved.element.style.getPropertyValue('visibility')!=='hidden'||saved.element.style.getPropertyPriority('visibility')!=='important')return;
    if(saved.value)saved.element.style.setProperty('visibility',saved.value,saved.priority);else saved.element.style.removeProperty('visibility');
    if(!saved.hadStyle&&!saved.element.getAttribute('style')?.trim())saved.element.removeAttribute('style');
  }
  function restore(message='页面已复原，可以重新点选或再玩一次。'){
    token++;preparing=false;engine?.dispose();engine=null;head=null;actor=null;route=null;
    clearInterval(layoutTimer);layoutTimer=null;
    for(const saved of originals)restoreElement(saved);originals=[];
    for(const id of ['shards','actor']){const canvas=$(id);canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);canvas.width=1;canvas.height=1;}
    snapshot=null;layout=null;picking=null;$('hover-outline').hidden=true;
    if(avatar&&!avatar.isConnected)avatar=null;if(target&&!target.isConnected)target=null;
    host.style.removeProperty('visibility');$('stats').textContent='未截取画面';controls();status(message);record('restore',{reason:message});
  }
  function ensureCurrent(){
    if(!avatar?.isConnected||!target?.isConnected)throw new Error('选中的元素已变化，请重新点选。');
    const a=acceptable(avatar,'avatar'),t=acceptable(target,'target');if(a||t)throw new Error(a||t);
  }
  async function decode(value){
    if(typeof value!=='string'){if(value?.width&&value?.height)return value;throw new Error('截图接口未返回有效画面。');}
    if(!value.startsWith('data:image/png;base64,')&&!value.startsWith('data:image/jpeg;base64,'))throw new Error('截图格式无效。');
    const image=new Image();image.src=value;await image.decode();return image;
  }
  function layoutChanged(){
    return !avatar?.isConnected||!target?.isConnected||innerWidth!==width||innerHeight!==height||devicePixelRatio!==layout?.pixelRatio||scrollX!==layout?.scrollX||scrollY!==layout?.scrollY||!sameRect(rectOf(avatar),layout?.avatar)||!sameRect(rectOf(target),layout?.target);
  }
  async function escape(){
    if(preparing||engine)return;
    const current=++token;preparing=true;picking=null;controls();status('正在读取当前网页画面……');
    try{
      ensureCurrent();width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
      layout={avatar:rectOf(avatar),target:rectOf(target),scrollX,scrollY,pixelRatio:devicePixelRatio};
      // Hide our own controls before browser capture; original elements stay visible.
      host.style.setProperty('visibility','hidden','important');await nextPaint();
      if(current!==token||destroyed)return;
      if(layoutChanged()||document.hidden)throw new Error('截图前页面位置变化，请重试。');
      const image=await decode(await capture());
      if(current!==token||destroyed)return;
      if(layoutChanged()||document.hidden)throw new Error('截图期间页面位置变化，请重试。');
      const sx=image.width/width,sy=image.height/height;
      if(Math.abs(sx/sy-1)>.025)throw new Error('当前画面比例不匹配，请把浏览器缩放复原后重试。');
      const a=visibleRect(layout.avatar),r=visibleRect(layout.target);
      head=document.createElement('canvas');head.width=Math.min(512,Math.max(64,Math.round(a.width*sx)));head.height=Math.min(512,Math.max(64,Math.round(a.height*sy)));
      head.getContext('2d').drawImage(image,a.x*sx,a.y*sy,a.width*sx,a.height*sy,0,0,head.width,head.height);
      snapshot={provider:'viewport-pixels',width:image.width,height:image.height,scaleX:sx,scaleY:sy,headWidth:head.width,headHeight:head.height};
      const instance=engine=new DestructionEngine({canvas:$('shards'),effect:$('effect').value,cellSize:36,interactive:false,showAim:false,showPlayer:false,threshold:1,onFrame:({elapsed,time:now})=>update(elapsed,now)});
      await instance.prepareSnapshot({texture:image,width,height,regions:[{...r,tag:'selected-card'}],dpr,transparent:true});
      if(current!==token||destroyed){instance.dispose();return;}
      if(layoutChanged())throw new Error('准备期间网页布局变化，请重试。');
      instance.M.Composite.remove(instance.physics.world,instance.player);
      $('actor').width=Math.round(width*dpr);$('actor').height=Math.round(height*dpr);
      hideElement(avatar);hideElement(target);preparing=false;host.style.removeProperty('visibility');
      const radius=Math.min(a.width,a.height)/2,scale=clamp(radius/22,.3,4);
      actor={phase:'leaping',x:a.x+a.width/2,y:a.y+a.height/2+80*scale,scale,age:0,facing:1};
      const impactY=r.y+r.height*.62,impactX=clamp(r.x+Math.min(r.width*.3,65),r.x+12,r.x+r.width-12);
      let facing=impactX>95?1:-1;
      const stopX=clamp(impactX-56*1.12*facing,36,width-36);
      const point={x:clamp(stopX+56*1.12*facing,r.x+5,r.x+r.width-5),y:impactY};
      route={home:{x:a.x+a.width/2,y:a.y+a.height/2,radius},startScale:scale,from:{x:actor.x,y:actor.y-80*scale},landing:{x:clamp(actor.x+110,45,width-45),y:clamp(impactY+70,125,height-18)},stop:{x:stopX,y:impactY+22*1.12},point,facing,duration:1.05};
      kicked=false;time=0;lastMeasure=0;controls();status('从你选中的头像里跳出来了！');record('escape',{avatar:a,target:r,effect:instance.effect,tiles:instance.tiles.length,snapshot});instance.start();
      // Layout can change while browser rendering temporarily suspends RAF.
      layoutTimer=setInterval(()=>{if(engine&&layoutChanged())restore('网页位置发生变化，已自动复原。');},180);
    }catch(error){if(current!==token)return;restore();status(`未能开始：${error.message}`,true);record('error',{message:error.message});}
    finally{if(current===token){preparing=false;host.style.removeProperty('visibility');controls();}}
  }
  function recall(){
    if(!engine||!actor||['home','returning'].includes(actor.phase))return;
    route.returnFrom={x:actor.x,y:actor.y-80*actor.scale,scale:actor.scale};actor.phase='returning';actor.age=0;controls();status('听见召唤了，正在回到头像……');record('recall');
  }
  function update(dt,now){
    if(!actor||!engine)return;
    if(now-lastMeasure>120){lastMeasure=now;if(layoutChanged()){restore('网页位置发生变化，已自动复原。');return;}}
    time+=dt;actor.age+=dt;
    if(actor.phase==='leaping'){
      const t=clamp(actor.age/1.05,0,1),u=ease(t);actor.scale=mix(route.startScale,1.12,clamp(t/.55,0,1));actor.x=mix(route.from.x,route.landing.x,u);actor.y=mix(route.from.y,route.landing.y-80*1.12,u)-Math.sin(t*Math.PI)*90+80*actor.scale;
      if(t===1){actor.phase='running';actor.age=0;route.runFrom={x:actor.x,y:actor.y};route.runDuration=clamp(Math.hypot(actor.x-route.stop.x,actor.y-route.stop.y)/280,.45,1.7);actor.facing=route.stop.x>=actor.x?1:-1;status('他正在跑向你选的卡片……');record('land');}
    }else if(actor.phase==='running'){
      const t=clamp(actor.age/route.runDuration,0,1),u=ease(t);actor.x=mix(route.runFrom.x,route.stop.x,u);actor.y=mix(route.runFrom.y,route.stop.y,u);
      if(t===1){actor.phase='kicking';actor.age=0;actor.facing=route.facing;status('脚碰到卡片了，碎片开始运动。');}
    }else if(actor.phase==='kicking'){
      if(!kicked&&actor.age>=.16){kicked=true;const before=engine.tiles.filter(t=>t.detached).length;const hit=engine.impactAt(route.point,{radius:110,strength:1.5,weapon:'blast'});const released=engine.tiles.filter(t=>t.detached).length-before;record('kick',{point:route.point,hit,released});$('stats').textContent=`${engine.tiles.length} 片纹理 · ${released} 片被踢开`;status(hit?'踢中了！碎片保留这张卡片的真实内容。':'这一脚没碰到纹理，请复原后重新选择。',!hit);}
      if(actor.age>=.85){actor.phase='idle';actor.age=0;controls();}
    }else if(actor.phase==='returning'){
      const t=clamp(actor.age/1.15,0,1),u=ease(t);actor.scale=mix(route.returnFrom.scale,route.startScale,u);actor.x=mix(route.returnFrom.x,route.home.x,u);actor.y=mix(route.returnFrom.y,route.home.y,u)-Math.sin(t*Math.PI)*80+80*actor.scale;
      if(t===1){actor.phase='home';for(const saved of originals.filter(item=>item.owner===avatar))restoreElement(saved);originals=originals.filter(item=>item.owner!==avatar);status('头像回来了，卡片碎片还在。点“复原页面”恢复内容。');record('home');controls();}
    }
    draw();
  }
  function draw(){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    if(!actor||!route)return;
    const h=route.home;if(actor.phase==='home')return;
    ctx.save();ctx.strokeStyle='#e59c5e';ctx.setLineDash([3,4]);ctx.lineWidth=2;ctx.beginPath();ctx.arc(h.x,h.y,Math.max(3,h.radius-1),0,Math.PI*2);ctx.stroke();ctx.restore();
    ctx.save();
    const remaining=actor.phase==='returning'?1.15-actor.age:null;
    if(actor.phase==='leaping'&&actor.age<.25||remaining!==null&&remaining<.25){const growth=Math.max(0,remaining??actor.age)*600;ctx.beginPath();ctx.arc(h.x,h.y,h.radius+growth,0,Math.PI*2);ctx.clip();}
    const pose=actor.phase==='leaping'||actor.phase==='returning'?'jump':actor.phase==='running'?'run':actor.phase==='kicking'?'kick':'idle';
    drawCharacter(ctx,{...actor,pose,time,headImage:head});ctx.restore();
  }
  function show(){if(destroyed)return;open=true;host.hidden=false;controls();}
  function close(){restore('已关闭并复原网页。');open=false;host.hidden=true;}
  function toggle(){if(open)close();else show();return getState();}
  function destroy(){if(destroyed)return;restore();destroyed=true;open=false;signal.abort();host.remove();}
  function getState(){return {open,preparing,picking,avatar:avatar?.isConnected?{tag:avatar.tagName.toLowerCase(),rect:rectOf(avatar)}:null,target:target?.isConnected?{tag:target.tagName.toLowerCase(),rect:rectOf(target)}:null,phase:actor?.phase||'ready',phaseLabel:phaseNames[actor?.phase]||'准备点选',snapshot,engine:engine?.getState()||null,events:[...events]};}
  for(const role of ['avatar','target']){
    $(`pick-${role}`).addEventListener('click',()=>beginPick(role),{signal:signal.signal});
    $(`parent-${role}`).addEventListener('click',()=>select(role,(role==='avatar'?avatar:target)?.parentElement),{signal:signal.signal});
  }
  $('escape').addEventListener('click',escape,{signal:signal.signal});$('recall').addEventListener('click',recall,{signal:signal.signal});$('restore').addEventListener('click',()=>restore(),{signal:signal.signal});$('close').addEventListener('click',close,{signal:signal.signal});
  $('scrim').addEventListener('pointermove',event=>{hover=candidateAt(event.clientX,event.clientY);outline('hover-outline',hover?visibleRect(rectOf(hover)):null);},{signal:signal.signal});
  $('scrim').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const item=candidateAt(event.clientX,event.clientY);if(picking&&item)select(picking,item);},{signal:signal.signal});
  const cancelPick=()=>{picking=null;hover=null;$('hover-outline').hidden=true;controls();status('已取消选择。');};
  $('hint').setAttribute('role','button');$('hint').tabIndex=0;
  $('hint').addEventListener('click',cancelPick,{signal:signal.signal});
  $('hint').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();cancelPick();}},{signal:signal.signal});
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(picking){picking=null;hover=null;$('hover-outline').hidden=true;controls();status('已取消选择。');}else if(engine||preparing)restore();},{capture:true,signal:signal.signal});
  const invalidated=event=>{
    if(event?.composedPath?.().includes(host))return;
    if(engine||preparing)restore('滚动或画面尺寸变化，已自动复原。');
    else {$('hover-outline').hidden=true;controls();}
  };
  window.addEventListener('scroll',invalidated,{capture:true,passive:true,signal:signal.signal});window.addEventListener('resize',invalidated,{signal:signal.signal});
  visualViewport?.addEventListener('resize',invalidated,{signal:signal.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(engine||preparing))restore('离开当前标签页，已自动复原。');},{signal:signal.signal});
  window.addEventListener('pagehide',destroy,{signal:signal.signal});
  controls();return {show,toggle,getState,restore,destroy,escape,recall,get engine(){return engine;}};
}
