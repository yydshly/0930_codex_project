import { clamp } from './model.js';
export const effectProfiles = {
  glass:{name:'玻璃裂解',icon:'◇',color:'#178c9a',background:'#eaf3f5',interaction:'direct',simulation:'不规则三角形 · 刚体碰撞',description:'把页面裂成不规则三角形，碎片带着原内容旋转、弹跳。',use:'产品揭晓、科技展示、冲击反馈',help:'点按或拖拽页面产生裂解 · 选择点触、扩散或冲击 · F / G 可对准光标触发'},
  paper:{name:'纸片飘散',icon:'≋',color:'#ae6845',background:'#faf4e9',interaction:'direct',simulation:'细长纸片 · 风力与摆动',description:'文字与卡片变成细长纸带，轻轻飘散、翻转，缓慢落下。',use:'编辑内容、邀请函、节庆活动',help:'点按或拖拽吹散纸片 · 强度控制飘散速度 · 调节重力观察纸带运动'},
  pixels:{name:'像素消融',icon:'▦',color:'#efb95b',background:'#161f30',interaction:'direct',simulation:'纹理采样 · 粒子衰减',description:'内容分解为细小像素颗粒，向上漂浮并逐渐消失。',use:'游戏入口、数字内容、加载转场',help:'点按或拖拽让内容像素化消融 · 粒子颜色来自页面纹理 · 无角色射击'},
  neon:{name:'霓虹聚合',icon:'◎',color:'#53efdb',background:'#0c1830',interaction:'direct',simulation:'发光轨迹 · 曲线聚合',description:'页面化为彩色光点，沿弧线汇入能量环，形成回收反馈。',use:'数据归集、积分收集、科技活动',help:'点按或拖拽收集光点 · 光点汇入右下方能量环 · 可观察收集轨迹'},
  ripple:{name:'涟漪揭幕',icon:'◉',color:'#467cbf',background:'#edf4ff',interaction:'direct',simulation:'圆形遮罩 · 面积采样',description:'从触点扩散水波，平滑擦开内容，以柔和方式完成揭晓。',use:'渐进导览、优惠揭晓、轻互动',help:'点按或拖拽擦开页面 · 圆形遮罩累积揭晓面积 · 选择更大的范围加快揭幕'},
  classic:{name:'方块破坏',icon:'▧',color:'#087f71',interaction:'shooter',simulation:'矩形切片 · 刚体碰撞',description:'保留原有角色射击和方块碰撞，用于对比不同交互方式。',use:'动作游戏、碰撞教学、基线对照',help:'A / D 移动 · 空格跳跃 · 鼠标瞄准射击 · F 发射，G 爆破 · 1 / 2 / 3 切换武器'}
};

export class EffectLayer {
  constructor(engine){this.engine=engine;this.profile=effectProfiles[engine.effect];this.particles=[];this.rings=[];this.time=0;this.collection=0;
    if(['pixels','neon'].includes(engine.effect))this.imageData=engine.texture.getContext('2d').getImageData(0,0,engine.texture.width,engine.texture.height);
    if(engine.effect==='ripple'){this.mask=document.createElement('canvas');this.mask.width=engine.canvas.width;this.mask.height=engine.canvas.height;this.maskCtx=this.mask.getContext('2d');this.reveals=[];}
  }
  pulse(point,weapon){this.rings.push({x:point.x,y:point.y,age:0,radius:weapon==='blast'?115:weapon==='scatter'?80:42});}
  detached(tile,point,direction,weapon){
    const e=this.engine;tile.effectAge=0;tile.phase=Math.random()*Math.PI*2;
    if(e.effect==='paper'){e.M.Body.set(tile.body,{frictionAir:.055,restitution:.08});e.M.Body.setVelocity(tile.body,{x:direction.dx*1.9*e.force,y:(direction.dy-2)*e.force});}
    if(!['pixels','neon'].includes(e.effect))return;
    e.M.Composite.remove(e.physics.world,tile.body);tile.removed=true;tile.visualGone=true;
    const {width,height,data}=this.imageData,step=e.effect==='pixels'?7:9;
    for(let y=tile.y+step/2;y<tile.y+tile.height;y+=step)for(let x=tile.x+step/2;x<tile.x+tile.width;x+=step){
      if(this.particles.length>=6500)break;
      const px=clamp(Math.round(x*e.dpr),0,width-1),py=clamp(Math.round(y*e.dpr),0,height-1),i=(py*width+px)*4;
      if(data[i+3]<20||Math.max(data[i],data[i+1],data[i+2])<45)continue;
      const angle=Math.atan2(y-point.y,x-point.x);const speed=(20+Math.random()*80)*e.force;
      this.particles.push({x,y,startX:x,startY:y,prevX:x,prevY:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-35,age:0,life:e.effect==='neon'?(1.5+Math.random()*.65)/Math.sqrt(e.force):1.1+Math.random()*.7,phase:Math.random()*Math.PI*2,size:2+Math.random()*3,color:e.effect==='neon'?['#55f2db','#bf87ff','#a0d8ff'][Math.floor(Math.random()*3)]:`rgb(${data[i]},${data[i+1]},${data[i+2]})`});
    }
  }
  reveal(point,radius){
    const e=this.engine;this.reveals.push({...point,radius});const ctx=this.maskCtx;ctx.save();ctx.setTransform(e.dpr,0,0,e.dpr,0,0);ctx.beginPath();
    for(const r of e.regions)ctx.rect(r.x,r.y,r.width,r.height);ctx.clip();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);ctx.fill();ctx.restore();
    let changed=false;
    for(const tile of e.tiles){if(tile.detached)continue;let covered=0;for(let row=0;row<5;row++)for(let col=0;col<5;col++){
      const x=tile.x+(col+.5)*tile.width/5,y=tile.y+(row+.5)*tile.height/5;
      if(this.reveals.some(r=>Math.hypot(x-r.x,y-r.y)<=r.radius))covered++;
    }
      const before=tile.progress||0;tile.progress=covered/25;if(tile.progress>before)changed=true;
      if(tile.progress===1){tile.detached=true;tile.removed=true;e.M.Composite.remove(e.physics.world,tile.body);}
    }
    return changed;
  }
  update(elapsed){
    this.time+=elapsed;const e=this.engine;
    if(e.effect==='paper')for(const tile of e.tiles){if(!tile.detached||tile.removed)continue;tile.effectAge+=elapsed;
      e.M.Body.applyForce(tile.body,tile.body.position,{x:Math.sin(tile.effectAge*2+tile.phase)*tile.body.mass*.00016*e.force,y:-tile.body.mass*.00072*e.gravity});
      e.M.Body.setAngularVelocity(tile.body,Math.sin(tile.effectAge*2.8+tile.phase)*.035);
    }
    this.particles=this.particles.filter(p=>{
      p.age+=elapsed;p.prevX=p.x;p.prevY=p.y;if(p.age>=p.life){if(e.effect==='neon')this.collection++;return false;}
      if(e.effect==='neon'){const t=p.age/p.life,ease=t*t*(3-2*t),arc=Math.sin(t*Math.PI),sink={x:e.width-65,y:e.height-62};
        p.x=p.startX+(sink.x-p.startX)*ease+Math.sin(t*7+p.phase)*arc*42;p.y=p.startY+(sink.y-p.startY)*ease-Math.sin(t*Math.PI)*80;
      }else{p.x+=p.vx*elapsed;p.y+=p.vy*elapsed;p.vy-=30*elapsed;p.vx*=Math.max(0,1-elapsed*.65);}
      return true;
    });this.rings=this.rings.filter(r=>(r.age+=elapsed)<1.1);
  }
  drawReveal(ctx){const e=this.engine;ctx.drawImage(e.texture,0,0,e.width,e.height);ctx.save();ctx.globalCompositeOperation='destination-out';ctx.drawImage(this.mask,0,0,e.width,e.height);ctx.globalCompositeOperation='destination-over';const gradient=ctx.createLinearGradient(0,0,e.width,e.height);gradient.addColorStop(0,'#b8dcec');gradient.addColorStop(.5,'#e9f3ff');gradient.addColorStop(1,'#b8e3d5');ctx.fillStyle=gradient;ctx.fillRect(0,0,e.width,e.height);ctx.restore();}
  draw(ctx){const e=this.engine,mode=e.effect;
    if(mode==='neon'){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#36d8ce';ctx.lineWidth=1;const x=e.width-65,y=e.height-62;
      for(let i=0;i<3;i++){ctx.globalAlpha=.22+i*.12;ctx.beginPath();ctx.arc(x,y,18+i*8+Math.sin(this.time*2+i)*2,0,Math.PI*2);ctx.stroke();}
      ctx.globalAlpha=.9;ctx.fillStyle='#c4ffee';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText(String(this.collection),x,y+4);ctx.restore();}
    ctx.save();if(mode==='neon')ctx.globalCompositeOperation='lighter';
    for(const p of this.particles){const t=p.age/p.life;ctx.globalAlpha=Math.min(1,(1-t)*3);ctx.fillStyle=p.color;
      if(mode==='neon'){ctx.strokeStyle=p.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.prevX,p.prevY);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillRect(p.x,p.y,2.5,2.5);}
      else{const size=p.size*(1-t*.7);ctx.fillRect(Math.round(p.x/2)*2,Math.round(p.y/2)*2,size,size);}
    }ctx.restore();
    if(mode!=='classic')for(const r of this.rings){const t=r.age/1.1;ctx.save();ctx.globalAlpha=(1-t)*.6;ctx.strokeStyle=this.profile.color;ctx.lineWidth=mode==='ripple'?2:1;ctx.beginPath();ctx.arc(r.x,r.y,12+t*r.radius,0,Math.PI*2);ctx.stroke();
      if(mode==='ripple'){ctx.globalAlpha=(1-t)*.2;ctx.beginPath();ctx.arc(r.x,r.y,4+t*r.radius*.65,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  }
  get count(){return this.engine.effect==='ripple'?this.rings.length:this.particles.length;}
}
