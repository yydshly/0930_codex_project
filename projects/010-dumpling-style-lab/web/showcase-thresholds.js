import {canvasSurface,images,glow,vignette} from './showcase-core.js';
import {sceneHeading} from './showcase-observation-kit.js?v=20261004-2';
import {voyageText as text,voyagePlate as plate,voyageRing as ring,voyageComplete} from './showcase-voyages-kit.js';
import {thresholdsController} from './showcase-thresholds-kit.js';
import {THRESHOLDS_SPRITES as frames} from './showcase-thresholds-sprites.js';
import {GRAVITY_SOLIDS,GRAVITY_HAZARDS,GRAVITY_ORBS,PHASE_COMMON,PHASE_PLATFORMS,PHASE_ORBS,PORTAL_ORBS,portalPair,VOICE_CUES,pitchHeight} from './showcase-thresholds-rules.js';
function crop(c,im,b,x,y,w,h){c.drawImage(im,b[0],b[1],b[2]-b[0],b[3]-b[1],x,y,w,h);}
function actor(c,s,art){const p=s.p,pose=!p.onGround?(p.vy<0?5:6):Math.abs(p.vx)>1?Math.floor(p.travel/10)%4:4,b=frames.walker[pose],scale=48/(frames.walker[0][3]-frames.walker[0][1]),h=(b[3]-b[1])*scale,w=(b[2]-b[0])*scale;glow(c,p.x,p.y,28,s.id==='phasewalk'&&s.phase?'#d8c2ff66':'#f9e8bc55');
 c.save();c.translate(p.x,p.y);c.scale(p.dir<0?-1:1,s.id==='inverter'&&s.gravity<0?-1:1);c.shadowColor='#fff2c8';c.shadowBlur=3;crop(c,art.walker,b,-w/2,24-h,w,h);c.restore();}
function ledge(c,r,art,tint='#f0d4a1',flip=false){c.save();c.translate(r.x,r.y);if(flip){c.translate(0,r.h);c.scale(1,-1);}c.shadowColor='#090d1acc';c.shadowBlur=14;c.shadowOffsetY=7;crop(c,art.ledge,frames.ledge,0,0,r.w,Math.max(24,Math.min(65,r.w*.11)));c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle=tint;c.lineWidth=2;c.beginPath();c.moveTo(0,1);c.lineTo(r.w,1);c.stroke();c.restore();}
function orb(c,p,got,tone='#f7d39a',index){glow(c,p.x,p.y,33,got?'#fff5b955':tone+'55');ring(c,p.x,p.y,17,got?'#fff1c5':tone,1.5);c.save();c.translate(p.x,p.y);c.rotate(Math.PI/4);c.fillStyle=got?'#fff0c0':tone;c.fillRect(-5,-5,10,10);c.restore();if(index!==undefined)text(c,String(index+1),p.x,p.y-29,12,tone,'center');}
function trace(c,s,color){if(s.trace.length<2)return;c.save();c.lineWidth=2;c.lineCap='round';c.strokeStyle=color;c.setLineDash([3,7]);c.beginPath();s.trace.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.restore();}
function background(c,s,art){if(s.id==='phasewalk'){c.drawImage(art.day,0,0,1120,630);c.save();c.globalAlpha=s.blend;c.drawImage(art.night,0,0,1120,630);c.restore();}else c.drawImage(art[{inverter:'gravity',transit:'portal',cantor:'voice'}[s.id]],0,0,1120,630);vignette(c);c.fillStyle='#0b122a15';c.fillRect(0,108,1120,435);}
function transitBase(c,s,art){background(c,s,art);ledge(c,{x:70,y:340,w:165,h:20},art,'#f4d0a2');ledge(c,{x:830,y:315,w:230,h:22},art,'#f4d0a2');
 c.save();const g=c.createLinearGradient(600,0,620,0);g.addColorStop(0,'#26333d');g.addColorStop(1,'#8a7152');c.fillStyle=g;c.fillRect(600,140,20,390);c.strokeStyle='#d4ab76';c.lineWidth=2;c.strokeRect(600,140,20,390);c.restore();
 plate(c,60,520,1000,18,'#292432');c.strokeStyle='#aa635c';c.beginPath();c.moveTo(60,520);c.lineTo(1060,520);c.stroke();PORTAL_ORBS.forEach((p,i)=>orb(c,p,s.orbs[i],i===1?'#a9e6ec':'#f2c691',i));trace(c,s,'#b4eef6aa');
 c.save();c.translate(s.p.x,s.p.y);c.rotate(s.p.spin*.1);crop(c,art.sphere,frames.sphere,-17,-17,34,34);c.restore();
}
function portalWindow(c,canvas,a,b,color){c.save();c.beginPath();c.ellipse(a.x,a.y,a.ny?64:13,a.ny?13:64,0,0,Math.PI*2);c.clip();c.fillStyle='#11162e';c.fillRect(a.x-68,a.y-68,136,136);c.drawImage(canvas,Math.max(0,b.x-72),Math.max(0,b.y-72),144,144,a.x-66,a.y-66,132,132);c.fillStyle=color+'33';c.fillRect(a.x-70,a.y-70,140,140);c.restore();
 c.save();c.shadowColor=color;c.shadowBlur=20;c.strokeStyle=color;c.lineWidth=5;c.beginPath();c.ellipse(a.x,a.y,a.ny?64:13,a.ny?13:64,0,0,Math.PI*2);c.stroke();c.shadowBlur=0;c.strokeStyle='#ffe5b988';c.lineWidth=1;c.beginPath();c.ellipse(a.x,a.y,a.ny?70:18,a.ny?18:70,0,0,Math.PI*2);c.stroke();c.restore();}
export function drawThresholdsScene(c,s,art,portalBuffer){
 if(s.id==='transit'){
  const off=portalBuffer||document.createElement('canvas');off.width=1120;off.height=630;transitBase(off.getContext('2d'),s,art);c.drawImage(off,0,0);const[a,b]=portalPair(s);portalWindow(c,off,a,b,'#e8b27d');portalWindow(c,off,b,a,'#90e5ee');
  text(c,'A · 下落入口',a.x,560,13,'#f5d5b5','center');text(c,'B · 侧向出口',b.x+25,b.y-78,13,'#b4f2ef','center');text(c,'高台接收区',944,361,13,'#e7d5b8','center');
  if(s.running){c.strokeStyle='#b6eefa';c.lineWidth=2;c.beginPath();c.moveTo(s.p.x,s.p.y);c.lineTo(s.p.x+s.p.vx*.12,s.p.y+s.p.vy*.12);c.stroke();}sceneHeading(c,'折向的航程','二维双向传送门 · 出口窗口实时取自另一端场景');
 }else{
  background(c,s,art);
  if(s.id==='inverter'){
   GRAVITY_SOLIDS.forEach((r,i)=>{if(i<2)ledge(c,r,art,'#a8e1cf',i===1);else{c.save();c.translate(r.x+r.w,r.y);c.rotate(Math.PI/2);crop(c,art.ledge,frames.ledge,0,0,r.h,r.w);c.restore();}});
   for(const r of GRAVITY_HAZARDS){c.save();c.fillStyle='#943f4188';c.fillRect(r.x,r.y,r.w,r.h);c.shadowColor='#e6865d';c.shadowBlur=8;c.strokeStyle='#fac694';c.lineWidth=2;for(let x=r.x+5;x<r.x+r.w-5;x+=16){c.beginPath();const ceiling=r.y<200;c.moveTo(x,ceiling?r.y:r.y+r.h);c.lineTo(x+6,ceiling?r.y+r.h:r.y);c.lineTo(x+12,ceiling?r.y:r.y+r.h);c.stroke();}c.restore();}
   GRAVITY_ORBS.forEach((p,i)=>orb(c,p,s.orbs[i],'#e4d5a5',i));trace(c,s,'#b3ebd599');actor(c,s,art);ring(c,1010,174,25,'#b5e4c4',2);text(c,'上层归途',1010,222,13,'#d4efd7','center');sceneHeading(c,'倒悬温室',s.gravity<0?'脚下是天花板 · 落到台面才能再次翻转':'在地面与天花板间翻转重力');
  }
  if(s.id==='phasewalk'){
   PHASE_COMMON.forEach(r=>ledge(c,r,art,'#e9dbc9'));for(let phase=0;phase<2;phase++){const current=s.phase===phase;c.save();c.globalAlpha=current?1:s.peek?.48:.2;for(const r of PHASE_PLATFORMS[phase]){ledge(c,r,art,phase?'#c9b7ff':'#f0c995');text(c,phase?'夜层':'白昼',r.x+r.w/2,r.y+51,12,phase?'#d6cbff':'#ffe0b6','center');}c.restore();}
   PHASE_ORBS.forEach((p,i)=>{c.save();c.globalAlpha=p.phase===s.phase?1:s.peek?.5:.2;orb(c,p,s.orbs[i],p.phase?'#d8bcff':'#f9d49f',i);c.restore();});trace(c,s,s.phase?'#d9c3fa88':'#f5d5ad88');actor(c,s,art);ring(c,1010,476,25,'#eddbc1',2);sceneHeading(c,'昼夜之间',s.phase?'夜层实体 · 白昼石台只能预览':'白昼实体 · 夜层石台只能预览');
  }
  if(s.id==='cantor'){
   for(const [i,v] of VOICE_CUES.entries()){const y=pitchHeight(v.frequency*s.base/110,s.base),tone=['#f3d49b','#b8dedb','#d9c0fa'][i];c.save();c.strokeStyle=tone+'44';c.setLineDash([4,12]);c.beginPath();c.moveTo(84,y);c.lineTo(1040,y);c.stroke();c.restore();glow(c,v.x,y,66,tone+'33');ring(c,v.x,y,43,s.orbs[i]?'#fff0c3':tone,3);c.strokeStyle='#fff2cb';c.lineWidth=6;c.beginPath();c.arc(v.x,y,43,-Math.PI/2,-Math.PI/2+Math.PI*2*s.progress[i]/.7);c.stroke();text(c,['低音','中音','高音'][i],v.x,y-63,15,tone,'center');text(c,Math.round(v.frequency*s.base/110)+' Hz',v.x,y+71,12,tone,'center');}
   trace(c,s,'#e0c5fb99');const b=frames.vessel,w=80,h=w*(b[3]-b[1])/(b[2]-b[0]);glow(c,s.p.x-30,s.p.y,29,'#f6ba8f66');crop(c,art.vessel,b,s.p.x-w/2,s.p.y-h/2,w,h);ring(c,1030,208,35,'#ebd7fa',2);text(c,'声光港口',1030,265,13,'#e7ddf8','center');sceneHeading(c,'以声音飞行',s.inputSource==='microphone'?'真实麦克风音高 · 停止哼唱会停下前进':'音符键盘试玩 · Z / X / C 分别控制三段音高');
  }
 }
 plate(c,28,579,1064,32,'#111a2ae8');const count=s.orbs.filter(Boolean).length;text(c,`星印 ${count} / ${s.orbs.length}`,46,601,14,'#f5e2c4');text(c,s.failed?'路线失败 · 下方重试':s.won?'本段完成':s.id==='inverter'?`翻转 ${s.flips} 次 · ${s.gravity>0?'重力向下':'重力向上'}`:s.id==='phasewalk'?`切换 ${s.swaps} 次 · ${s.phase?'夜层':'白昼'}`:s.id==='transit'?s.lastTransfer?`穿越速率 ${s.lastTransfer.speedBefore.toFixed(0)} → ${s.lastTransfer.speedAfter.toFixed(0)} px/s`:'布置 A / B → 发射 → 按右加速 → 松开下落':s.frequency?`检测音高 ${s.frequency.toFixed(0)} Hz · ${s.running?'飞行中':'飞行暂停'}`:'停止发声 / 松开音符会停下前进',1070,601,14,'#dfe3ea','right');
 if(s.failed){plate(c,360,85,400,45,'#321e2ce8');text(c,'本次路线未完成 · 调整后重试',560,114,17,'#ffd6bd','center');}if(s.won)voyageComplete(c,{'inverter':'倒悬归途已连通','phasewalk':'昼夜共同拼成了归路','transit':'坠落成为了另一段航程','cantor':'声音托起了一段航程'}[s.id],s.message);
}
export async function createThresholds(options){const names=options.id==='inverter'?['gravity','walker','ledge']:options.id==='phasewalk'?['day','night','walker','ledge']:options.id==='transit'?['portal','sphere','ledge']:['voice','vessel'],art=await images(names,'assets/game-forms/thresholds/'),{element,ctx}=canvasSurface(options.host),off=options.id==='transit'?document.createElement('canvas'):null;return thresholdsController(options,{element,draw:s=>drawThresholdsScene(ctx,s,art,off),dispose(){element.remove();}});}
