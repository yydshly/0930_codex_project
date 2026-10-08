import { clamp, fragmentsForRect, destructionProgress, closestRayHit, makeTileBody } from './model.js';
import { EffectLayer, effectProfiles } from './effects.js';

function snapshotInput({texture,width,height,regions,dpr=1,transparent=true}={}){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width>8192||height>8192)throw new Error('截图场景尺寸必须在 1–8192 CSS 像素之间。');
  if(!Number.isFinite(dpr)||dpr<.5||dpr>3)throw new Error('截图像素倍率必须在 0.5–3 之间。');
  width=Math.round(width);height=Math.round(height);
  const pixelWidth=Math.round(width*dpr),pixelHeight=Math.round(height*dpr);
  if(pixelWidth*pixelHeight>32*1024*1024)throw new Error('截图场景像素过多，请缩小可见区域。');
  const canvas=texture&&typeof texture.getContext==='function';
  const image=texture&&Number.isFinite(texture.naturalWidth)&&Number.isFinite(texture.naturalHeight)&&texture.complete!==false;
  const inputWidth=image?texture.naturalWidth:texture?.width,inputHeight=image?texture.naturalHeight:texture?.height;
  if((!canvas&&!image)||!Number.isFinite(inputWidth)||!Number.isFinite(inputHeight)||inputWidth<=0||inputHeight<=0)throw new Error('请提供已加载的截图 Image 或非空 canvas。');
  if(!Array.isArray(regions)||regions.length>256)throw new Error('截图区域必须是最多 256 个矩形的数组。');
  regions=regions.map(region=>{
    if(!region||!['x','y','width','height'].every(key=>Number.isFinite(region[key]))||region.width<0||region.height<0)throw new Error('截图区域必须包含有效的 x、y、width、height。');
    const x=clamp(region.x,0,width),y=clamp(region.y,0,height);
    return {x,y,width:Math.max(0,clamp(region.x+region.width,0,width)-x),height:Math.max(0,clamp(region.y+region.height,0,height)-y),tag:typeof region.tag==='string'?(region.tag.trim().slice(0,128)||'content'):'content'};
  }).filter(region=>region.width>0&&region.height>0);
  return {texture,width,height,regions,dpr,transparent:Boolean(transparent),pixelWidth,pixelHeight};
}

export class DestructionEngine {
  constructor({canvas,source,cellSize=48,background='#eef3f6',threshold=.35,goalTag=null,effect='classic',onEvent=()=>{},interactive=true,onFrame=null,showAim=true,showPlayer=true}) {
    this.M=globalThis.Matter;
    if (!this.M) throw new Error('物理依赖未加载，请刷新页面。');
    Object.assign(this,{canvas,source,cellSize,background,threshold,goalTag,onEvent,interactive,showAim,showPlayer});
    this.onFrame=typeof onFrame==='function'?onFrame:null;
    this.effect=effectProfiles[effect]?effect:'classic';
    this.ctx=canvas.getContext('2d'); this.tiles=[]; this.keys=new Set(); this.weapon='pulse';
    this.state='idle'; this.complete=false; this.hits=0; this.shots=0; this.frameId=null;
    this.gravity=1; this.force=1; this.debug=false; this.auto=false; this.autoTime=0;
    this.tracers=[]; this.particles=[]; this.aim=null; this.lastShot=-Infinity;
    if(this.interactive)this.bindInput();
  }
  emit(type,data={}) { this.onEvent({type,...data}); }
  async prepare() {
    if(this.disposed)return;
    if(typeof globalThis.html2canvas!=='function')throw new Error('网页渲染依赖 html2canvas 未加载；截图输入请使用 prepareSnapshot。');
    if(!this.source?.getBoundingClientRect||!this.source?.querySelectorAll)throw new Error('请提供有效的网页场景 source。');
    const token=this.beginPreparation();
    await document.fonts.ready;
    if(this.disposed||token!==this.preparationId)return;
    const bounds=this.source.getBoundingClientRect();
    const width=Math.round(bounds.width),height=Math.round(bounds.height),dpr=Math.min(globalThis.devicePixelRatio||1,2);
    const regions=[...this.source.querySelectorAll('[data-destructible]')].map(element=>{
      const r=element.getBoundingClientRect();
      const x=clamp(r.left-bounds.left,0,width),y=clamp(r.top-bounds.top,0,height);
      return {x,y,width:Math.max(0,Math.min(r.right-bounds.left,width)-x),height:Math.max(0,Math.min(r.bottom-bounds.top,height)-y),tag:element.dataset.tag||'content'};
    }).filter(r=>r.width>1&&r.height>1);
    const texture=await globalThis.html2canvas(this.source,{scale:dpr,backgroundColor:this.background,logging:false,useCORS:false,allowTaint:false});
    if(this.disposed||token!==this.preparationId)return;
    this.initializeScene({texture,width,height,regions,dpr,transparent:false});
    return this;
  }
  // A visible-tab screenshot covers the stage; region geometry remains in CSS pixels.
  // Normalize its resolution once so every existing effect samples the same texture.
  async prepareSnapshot(input){
    if(this.disposed)return;
    const config=snapshotInput(input);
    if(!Number.isFinite(this.cellSize)||this.cellSize<16)throw new Error('cellSize must be at least 16 px');
    const perCell=this.effect==='glass'?2:this.effect==='paper'?Math.ceil(this.cellSize/Math.max(12,this.cellSize*.38)):1;
    const estimate=config.regions.reduce((count,r)=>count+Math.ceil(r.width/this.cellSize)*Math.ceil(r.height/this.cellSize)*perCell,0);
    if(estimate>12000)throw new Error('截图碎片过多，请缩小目标或增大 cellSize。');
    const token=this.beginPreparation();
    if(this.disposed||token!==this.preparationId)return;
    const texture=document.createElement('canvas');texture.width=config.pixelWidth;texture.height=config.pixelHeight;
    texture.getContext('2d').drawImage(config.texture,0,0,config.pixelWidth,config.pixelHeight);
    this.initializeScene({...config,texture});
    return this;
  }
  beginPreparation(){
    this.preparationId=(this.preparationId||0)+1;
    cancelAnimationFrame(this.frameId);this.frameId=null;this.keys.clear();this.pointerDown=false;
    this.state='loading';this.emit('loading');return this.preparationId;
  }
  initializeScene({texture,width,height,regions,dpr,transparent}){
    if(this.physics){this.M.Composite.clear(this.physics.world,false);this.M.Engine.clear(this.physics);}
    Object.assign(this,{texture,width,height,regions,dpr,transparent});
    this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);
    this.base=null;
    if(!transparent){
      this.base=document.createElement('canvas');this.base.width=texture.width;this.base.height=texture.height;
      const baseCtx=this.base.getContext('2d');baseCtx.drawImage(texture,0,0);baseCtx.fillStyle=this.background;
      for(const region of regions)baseCtx.fillRect(region.x*dpr,region.y*dpr,region.width*dpr,region.height*dpr);
    }
    this.complete=false;this.firstHit=false;this.hits=0;this.shots=0;this.lastShot=-Infinity;
    this.tracers=[];this.particles=[];this.autoTime=0;this.lastStats=0;
    this.physics=this.M.Engine.create({enableSleeping:true});this.physics.gravity.y=this.gravity;
    this.tiles=regions.flatMap(region=>fragmentsForRect(region,this.cellSize,region.tag,this.effect)).map(tile=>{
      const body=makeTileBody(this.M,tile);
      return {...tile,body,detached:false};
    });
    const floor=this.M.Bodies.rectangle(this.width/2,this.height+18,this.width+100,40,{isStatic:true,label:'floor'});
    const left=this.M.Bodies.rectangle(-25,this.height/2,50,this.height*3,{isStatic:true});
    const right=this.M.Bodies.rectangle(this.width+25,this.height/2,50,this.height*3,{isStatic:true});
    this.player=this.M.Bodies.rectangle(42,this.height-31,18,40,{inertia:Infinity,friction:.08,restitution:0,label:'player'});
    this.M.Composite.add(this.physics.world,[...this.tiles.map(t=>t.body),floor,left,right,this.player]);
    this.effects=new EffectLayer(this);
    this.aim={x:this.width*.65,y:this.height*.4};this.state='ready';this.emit('ready',{effect:this.effect,tiles:this.tiles.length,width:this.width,height:this.height});
    this.draw();
  }
  start() {
    if (this.state==='running'||this.state==='loading'||this.disposed) return;
    if (!this.physics) throw new Error('请先准备场景');
    this.state='running';this.lastTime=performance.now();this.accumulator=0;this.fps=60;
    this.emit('start');this.frameId=requestAnimationFrame(time=>this.frame(time));
  }
  setPaused(paused) {
    if(paused&&this.state==='running'){this.state='paused';cancelAnimationFrame(this.frameId);this.frameId=null;this.keys.clear();this.pointerDown=false;this.emit('pause');}
    else if(!paused&&this.state==='paused'){this.start();this.emit('resume');}
  }
  setOptions(options) {
    if (Number.isFinite(options.gravity)) {this.gravity=clamp(options.gravity,0,2);if(this.physics)this.physics.gravity.y=this.gravity;}
    if (Number.isFinite(options.force)) this.force=clamp(options.force,.3,2.5);
    if (options.debug!==undefined) this.debug=Boolean(options.debug);
    if (options.weapon&&['pulse','scatter','blast'].includes(options.weapon))this.weapon=options.weapon;
    if (options.auto!==undefined) this.auto=Boolean(options.auto);
    if (this.state==='paused'||this.state==='ready')this.draw();
  }
  jump() {
    if(this.state!=='running')return;
    if (Math.abs(this.player.velocity.y)<1.2 || this.player.position.y>this.height-35) this.M.Body.setVelocity(this.player,{x:this.player.velocity.x,y:-11});
  }
  bindInput() {
    const signal=(this.inputAbort=new AbortController()).signal;
    this.canvas.addEventListener('pointermove',event=>this.updateAim(event),{signal});
    this.canvas.addEventListener('pointerdown',event=>{
      if(this.state!=='running')return;event.preventDefault();this.canvas.focus({preventScroll:true});this.updateAim(event);
      if(event.button===2)this.fire('blast');else{this.pointerDown=true;this.fire();}this.canvas.setPointerCapture?.(event.pointerId);
    },{signal});
    const release=()=>{this.pointerDown=false;};
    this.canvas.addEventListener('pointerup',release,{signal});this.canvas.addEventListener('pointercancel',release,{signal});
    this.canvas.addEventListener('contextmenu',event=>event.preventDefault(),{signal});
    this.canvas.addEventListener('keydown',event=>{
      if(['KeyA','KeyD','ArrowLeft','ArrowRight','Space','KeyF','KeyG','Digit1','Digit2','Digit3'].includes(event.code))event.preventDefault();
      this.keys.add(event.code);if(event.code==='Space'&&!event.repeat)this.jump();
      if(event.code==='KeyF')this.fire();if(event.code==='KeyG')this.fire('blast');
    },{signal});
    this.canvas.addEventListener('keyup',event=>this.keys.delete(event.code),{signal});
    window.addEventListener('blur',()=>{this.keys.clear();this.pointerDown=false;},{signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.setPaused(true);},{signal});
  }
  updateAim(event) {
    const r=this.canvas.getBoundingClientRect();this.aim={x:clamp((event.clientX-r.left)*this.width/r.width,0,this.width),y:clamp((event.clientY-r.top)*this.height/r.height,0,this.height)};
  }
  fire(weapon=this.weapon,target=this.aim) {
    if(this.state!=='running'||!target)return false;
    const now=performance.now();if(now-this.lastShot<(weapon==='blast'?260:weapon==='scatter'?170:100))return false;
    this.lastShot=now;this.shots++;
    if(this.effect!=='classic')return this.activateDirect(weapon,target);
    const origin={x:this.player.position.x+8,y:this.player.position.y-8};
    const angle=Math.atan2(target.y-origin.y,target.x-origin.x);
    const spread=weapon==='scatter'?[-.12,-.06,0,.06,.12]:[0];let hit=false;
    for(const offset of spread){
      const dx=Math.cos(angle+offset),dy=Math.sin(angle+offset),end={x:origin.x+dx*Math.hypot(this.width,this.height)*2,y:origin.y+dy*Math.hypot(this.width,this.height)*2};
      const tile=closestRayHit(this.M,this.tiles,origin,end);
      const point=tile?{...tile.body.position}:end;
      this.tracers.push({origin,end:point,life:weapon==='blast'?.18:.09,weapon});
      if(tile){hit=true;this.hits++;
        const radius=weapon==='blast'?110:weapon==='scatter'?20:30;
        for(const other of this.tiles){if(!other.detached&&Math.hypot(other.body.position.x-point.x,other.body.position.y-point.y)<=radius)this.detach(other,point,{dx,dy},weapon);}
        this.burst(point,weapon);
      }
    }
    return this.finishInteraction(hit,weapon);
  }
  activateDirect(weapon,point){
    const radius=(weapon==='blast'?115:weapon==='scatter'?80:42)*(this.effect==='ripple'?this.force:1);let hit=false;
    if(this.effect==='ripple')hit=this.effects.reveal(point,radius);
    else for(const tile of this.tiles){
      if(tile.detached)continue;const dx=tile.body.position.x-point.x,dy=tile.body.position.y-point.y,distance=Math.hypot(dx,dy);
      if(distance>radius)continue;const length=Math.max(distance,1);this.detach(tile,point,{dx:dx/length,dy:dy/length},weapon);hit=true;
    }
    if(hit){this.hits++;this.effects.pulse(point,weapon);}
    return this.finishInteraction(hit,weapon);
  }
  // External actors use stage coordinates and the same fragment/physics lifecycle.
  impactAt(point,{radius=75,strength=1,weapon='blast'}={}){
    if(this.state!=='running'||this.disposed||!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return false;
    const now=performance.now();if(now-this.lastShot<100)return false;
    this.lastShot=now;this.shots++;
    radius=clamp(Number.isFinite(radius)?radius:75,8,300);
    strength=clamp(Number.isFinite(strength)?strength:1,.1,3);
    weapon=['pulse','scatter','blast'].includes(weapon)?weapon:'blast';
    const center={x:clamp(point.x,0,this.width),y:clamp(point.y,0,this.height)};let hit=false;
    for(const tile of this.tiles){
      if(tile.detached)continue;
      const dx=tile.body.position.x-center.x,dy=tile.body.position.y-center.y,distance=Math.hypot(dx,dy);
      if(distance>radius)continue;
      const length=Math.max(distance,1);
      this.detach(tile,center,{dx:dx/length,dy:dy/length},weapon,strength);hit=true;
    }
    if(hit){this.hits++;this.effects.pulse(center,weapon);}
    return this.finishInteraction(hit,weapon);
  }
  finishInteraction(hit,weapon){
    if(hit&&!this.firstHit){this.firstHit=true;this.emit('first-hit',{weapon,effect:this.effect});}
    this.emit('shot',{weapon,effect:this.effect,hit,shots:this.shots,hits:this.hits});
    const stats=this.getState();
    if(!this.complete&&stats.goalRatio>=this.threshold){this.complete=true;this.emit('complete',{ratio:stats.ratio,goalRatio:stats.goalRatio,shots:this.shots});}
    return hit;
  }
  detach(tile,point,direction,weapon,strength=1) {
    tile.detached=true;this.M.Body.setStatic(tile.body,false);
    this.M.Body.setDensity(tile.body,.001);this.M.Sleeping.set(tile.body,false);
    const boost=weapon==='blast'?7:3.2,dx=tile.body.position.x-point.x,dy=tile.body.position.y-point.y;
    this.M.Body.setVelocity(tile.body,{x:(direction.dx*boost+dx*.035)*this.force*strength,y:(direction.dy*boost+dy*.035-2)*this.force*strength});
    this.M.Body.setAngularVelocity(tile.body,(Math.random()-.5)*.15*this.force*strength);
    this.effects.detached(tile,point,direction,weapon);
  }
  burst(point,weapon) {
    for(let i=0;i<(weapon==='blast'?18:6);i++){const a=Math.random()*Math.PI*2;const v=40+Math.random()*150;this.particles.push({x:point.x,y:point.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.3,weapon});}
  }
  frame(time) {
    if(this.state!=='running'||this.disposed)return;
    const elapsed=Math.max(0,Math.min((time-this.lastTime)/1000,.06));this.lastTime=time;this.fps=this.fps*.9+(elapsed>0?1/elapsed:60)*.1;
    const moving=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0);
    this.M.Body.setVelocity(this.player,{x:moving*4,y:this.player.velocity.y});
    if(this.pointerDown)this.fire();
    if(this.auto){this.autoTime+=elapsed;if(this.autoTime>.14){this.autoTime=0;const targets=this.tiles.filter(t=>!t.detached&&(!this.goalTag||t.tag===this.goalTag));const target=targets[Math.floor(Math.random()*targets.length)];if(target)this.fire('blast',target.body.position);else this.auto=false;}}
    this.effects.update(elapsed);
    this.accumulator=Math.min(this.accumulator+elapsed,.08);
    while(this.accumulator>=1/60){this.M.Engine.update(this.physics,1000/60);this.accumulator-=1/60;}
    for(const tile of this.tiles){if(tile.detached&&tile.body.position.y>this.height+180&&!tile.removed){this.M.Composite.remove(this.physics.world,tile.body);tile.removed=true;}}
    this.tracers=this.tracers.filter(t=>(t.life-=elapsed)>0);
    this.particles=this.particles.filter(p=>{p.life-=elapsed;p.x+=p.vx*elapsed;p.y+=p.vy*elapsed;p.vy+=600*this.gravity*elapsed;return p.life>0;});
    this.onFrame?.({engine:this,elapsed,time});
    if(this.state!=='running'||this.disposed)return;
    this.draw();
    if(!this.lastStats||time-this.lastStats>180){this.lastStats=time;this.emit('stats',this.getState());}
    this.frameId=requestAnimationFrame(next=>this.frame(next));
  }
  draw() {
    if(!this.texture)return;const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,this.width,this.height);
    if(this.effect==='ripple'){
      if(this.transparent){ctx.save();ctx.beginPath();for(const region of this.regions)ctx.rect(region.x,region.y,region.width,region.height);ctx.clip();this.effects.drawReveal(ctx);ctx.restore();}
      else this.effects.drawReveal(ctx);
    }
    else{
      if(this.base)ctx.drawImage(this.base,0,0,this.width,this.height);
      for(const tile of this.tiles){if(tile.removed)continue;const {position,angle}=tile.body;const cx=tile.cx??tile.x+tile.width/2,cy=tile.cy??tile.y+tile.height/2;ctx.save();ctx.translate(position.x,position.y);ctx.rotate(angle);
        if(tile.vertices){ctx.beginPath();tile.vertices.forEach((v,i)=>{if(i===0)ctx.moveTo(v.x-cx,v.y-cy);else ctx.lineTo(v.x-cx,v.y-cy);});ctx.closePath();ctx.clip();}
        ctx.drawImage(this.texture,tile.x*this.dpr,tile.y*this.dpr,tile.width*this.dpr,tile.height*this.dpr,tile.x-cx,tile.y-cy,tile.width,tile.height);
        if(this.effect==='glass'&&tile.detached){ctx.fillStyle='#8ee3ea22';ctx.fillRect(tile.x-cx,tile.y-cy,tile.width,tile.height);}
        if(this.debug||this.effect==='glass'&&tile.detached){ctx.strokeStyle=tile.detached?(this.effect==='glass'?'#49aabc':'#f39e39'):'#18a284';ctx.lineWidth=1;
          if(tile.vertices){ctx.beginPath();tile.vertices.forEach((v,i)=>{if(i===0)ctx.moveTo(v.x-cx,v.y-cy);else ctx.lineTo(v.x-cx,v.y-cy);});ctx.closePath();ctx.stroke();}
          else ctx.strokeRect(tile.x-cx,tile.y-cy,tile.width,tile.height);
        }ctx.restore();}
    }
    for(const t of this.tracers){ctx.strokeStyle=t.weapon==='blast'?'#e97736':'#42d8bc';ctx.lineWidth=t.weapon==='blast'?4:2;ctx.beginPath();ctx.moveTo(t.origin.x,t.origin.y);ctx.lineTo(t.end.x,t.end.y);ctx.stroke();}
    for(const p of this.particles){ctx.fillStyle=p.weapon==='blast'?'#ed9c32':'#3eab8c';ctx.globalAlpha=Math.min(1,p.life*4);ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;
    this.effects.draw(ctx);
    if(this.showPlayer&&this.effect==='classic')this.drawPlayer();
    if(this.showAim&&this.aim){ctx.strokeStyle=this.effect==='classic'?(this.background==='#122d3c'?'#c5f4d9':'#087f71'):effectProfiles[this.effect].color;ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(this.aim.x,this.aim.y,this.effect==='classic'?8:17,0,Math.PI*2);
      if(this.effect==='classic'){ctx.moveTo(this.aim.x-12,this.aim.y);ctx.lineTo(this.aim.x+12,this.aim.y);ctx.moveTo(this.aim.x,this.aim.y-12);ctx.lineTo(this.aim.x,this.aim.y+12);}
      else{ctx.moveTo(this.aim.x-4,this.aim.y);ctx.lineTo(this.aim.x+4,this.aim.y);ctx.moveTo(this.aim.x,this.aim.y-4);ctx.lineTo(this.aim.x,this.aim.y+4);}
      ctx.stroke();}
  }
  drawPlayer(){
    const ctx=this.ctx,{x,y}=this.player.position;const dark=this.background==='#122d3c';ctx.strokeStyle=dark?'#c7f8df':'#173c4c';ctx.fillStyle=dark?'#c7f8df':'#173c4c';ctx.lineWidth=3.2;ctx.lineCap='round';
    ctx.beginPath();ctx.arc(x,y-15,5.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(x,y+6);ctx.moveTo(x,y+5);ctx.lineTo(x-7,y+17);ctx.moveTo(x,y+5);ctx.lineTo(x+7,y+17);ctx.stroke();
    const angle=Math.atan2(this.aim.y-y,this.aim.x-x);ctx.save();ctx.translate(x,y-6);ctx.rotate(angle);ctx.strokeStyle='#087f71';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(17,0);ctx.stroke();ctx.restore();
  }
  getState(){
    const progress=destructionProgress(this.tiles,this.goalTag);return {state:this.state,effect:this.effect,...progress,hits:this.hits,shots:this.shots,complete:this.complete,tiles:this.tiles.length,dynamic:this.tiles.filter(t=>t.detached&&!t.removed).length,visuals:this.effects?.count||0,collected:this.effects?.collection||0,fps:Math.round(this.fps||0),width:this.width,height:this.height,gravity:this.gravity,force:this.force,auto:this.auto};
  }
  dispose(){this.disposed=true;this.preparationId=(this.preparationId||0)+1;this.state='disposed';cancelAnimationFrame(this.frameId);this.frameId=null;this.inputAbort?.abort();this.keys.clear();if(this.physics){this.M.Composite.clear(this.physics.world,false);this.M.Engine.clear(this.physics);}this.tiles=[];}
}
