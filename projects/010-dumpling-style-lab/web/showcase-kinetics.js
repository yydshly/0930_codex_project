import {canvasSurface,images,glow} from './showcase-core.js';
import {sceneHeading} from './showcase-observation-kit.js?v=20261004-2';
import {voyageText as text,voyagePlate as plate,voyageRing as ring,voyageComplete} from './showcase-voyages-kit.js';
import {kineticsController} from './showcase-kinetics-kit.js';
import {WIND_STARS} from './showcase-kinetics-rules.js';
import {KINETICS_SPRITES as frames} from './showcase-kinetics-sprites.js';
function sprite(c,im,box,x,y,height,flip=false){const [sx,sy,ex,ey]=box,w=height*(ex-sx)/(ey-sy);c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.drawImage(im,sx,sy,ex-sx,ey-sy,-w/2,-height,w,height);c.restore();}
const poseHeight=(kind,pose,h)=>h*(frames[kind][pose][3]-frames[kind][pose][1])/(frames[kind][0][3]-frames[kind][0][1]);
function star(c,x,y,filled){c.save();c.translate(x,y);c.rotate(-Math.PI/2);c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?7:15;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fillStyle=filled?'#fff1b8':'#f4c981';c.strokeStyle='#fff5d3';c.lineWidth=1.5;c.shadowColor='#ffe6b9';c.shadowBlur=filled?22:10;c.fill();c.stroke();c.restore();}
export function drawKineticsScene(c,s,art){c.drawImage(art[s.id],0,0,1120,630);
 if(s.id==='ribbon'){
  c.save();c.lineCap=c.lineJoin='round';for(const line of s.lines){if(line.length<2)continue;c.beginPath();line.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle='#543950';c.lineWidth=13;c.stroke();c.shadowColor='#fac6f0';c.shadowBlur=18;c.strokeStyle='#ecb8dd';c.lineWidth=7;c.stroke();c.shadowBlur=0;c.strokeStyle='#fff1d1';c.lineWidth=2;c.stroke();}c.restore();
  WIND_STARS.forEach((p,i)=>{glow(c,p.x,p.y,34,s.stars[i]?'#ffdda355':'#d2b8f333');star(c,p.x,p.y,s.stars[i]);});ring(c,155,356,19,'#f0d1dc',2);ring(c,995,212,29,'#eecdb3',3);ring(c,995,212,38,'#efcfbb66',1);text(c,'右岸投递口',995,267,13,'#f2e0df','center');sprite(c,art.courier,frames.courier,s.ball.x,s.ball.y+25,53);
  sceneHeading(c,'把风画成路','画出的线路成为真正的运动轨道');plate(c,28,562,1064,45,'#30223bdc');text(c,`墨水 ${Math.round(s.ink)} / 1500`,47,591,17);text(c,`风印 ${s.stars.filter(Boolean).length} / 3`,335,591,17);text(c,s.running?'信使正在沿线行进':s.failed?'路线有缺口 · 返回绘制调整':'从左向右画线 · 出发后才能检验通路',1070,591,14,'#ead5df','right');
  if(s.won)voyageComplete(c,'风信已送到远岸','你画的路线，成为了信使走过的归途');
 }
 if(s.id==='rescue'){
  if(!s.spawned){for(let i=0;i<4;i++)sprite(c,art.crew,frames.crew[0],85+i*33,250,50);text(c,'十二人等待放行',133,282,13,'#f7dca3','center');}
  if(s.stairs){const st=s.stairs,count=Math.ceil((610-st.base)/23),built=Math.floor(count*st.progress);for(let i=0;i<built;i++){const x=st.base+i*(610-st.base)/count,y=250-55*i/count;c.save();c.shadowColor='#080d13aa';c.shadowBlur=5;c.drawImage(art.wood,0,0,art.wood.width,art.wood.height,x-2,y,28,9);c.fillStyle='#d6a86e';c.fillRect(x-2,y,28,2);c.strokeStyle='#78593f';c.lineWidth=3;c.beginPath();c.moveTo(x+7,y+9);c.lineTo(x-2,y+27);c.stroke();c.restore();}}
  if(!s.wall.open){c.save();const left=805+45*s.wall.progress,w=45*(1-s.wall.progress);c.beginPath();c.rect(left,194,w,56);c.clip();c.drawImage(art.stone,left,194,w,56);c.strokeStyle='#564630';c.lineWidth=2;for(let y=208;y<=250;y+=14){c.beginPath();c.moveTo(left,y);c.lineTo(850,y);c.stroke();}c.beginPath();c.moveTo(825,194);c.lineTo(825,250);c.stroke();c.restore();text(c,'可开凿石墙',828,173,12,'#ffdc9f','center');}
  for(const w of s.workers){if(w.status==='lost')continue;const pose=w.status==='rescued'?7:w.role==='builder'?4:w.role==='digger'?5:w.role==='blocker'?6:Math.floor(w.travel/9)%4;sprite(c,art.crew,frames.crew[pose],w.x,w.y,poseHeight('crew',pose,50),w.dir<0);if(w.status==='live'&&s.selected===w.index){ring(c,w.x,w.y-25,31,'#ffe2a4',1.5);text(c,String(w.index+1),w.x,w.y-66,13,'#fff1c2','center');}if(w.role!=='walk'&&w.status==='live')text(c,{builder:'造梯',digger:'开凿',blocker:'阻挡'}[w.role],w.x,w.y+22,11,'#f9dfa7','center');}
  sceneHeading(c,'矿井十二人','队员自动行走，你决定谁造路、谁阻挡、谁开凿');plate(c,28,553,1064,55,'#241b1ae8');text(c,`已救出 ${s.rescued} / 12`,47,586,18);text(c,`损失 ${s.lost} / 2`,285,586,18);text(c,`造梯 ${s.tools.builder} · 开凿 ${s.tools.digger} · 阻挡 ${s.tools.blocker}`,485,586,15);text(c,s.running?'点击队员安排技能':'可以暂停安排，再放行',1070,586,13,'#eadac1','right');if(s.won)voyageComplete(c,'救援队平安抵达',`${s.rescued} 位队员走过了你改变的矿井`);
 }
 if(s.id==='rewind'){
  const w=s.world,p=w.player,box=frames.clockbridge,[sx,sy,ex,ey]=box;c.drawImage(art.clockbridge,sx,sy,ex-sx,ey-sy,254,w.bridgeY,584,584*(ey-sy)/(ex-sx));
  c.save();c.translate(610,w.weight.y-19);c.rotate(w.weight.angle*.06);c.fillStyle='#9d7942';c.strokeStyle='#f2ce8e';c.lineWidth=2;c.beginPath();c.roundRect(-16,-23,32,42,4);c.fill();c.stroke();c.fillStyle='#574233';c.fillRect(-8,-14,16,24);c.restore();
  plate(c,157,301,46,42,s.persistent.sealed?'#6b8a69':'#2d4649');ring(c,180,316,10,s.persistent.sealed?'#c8eab6':'#e8c789',2);text(c,s.persistent.sealed?'锁桥已生效':'左侧控制台 · E',180,280,12,'#f1dab2','center');
  if(!s.persistent.crystal){glow(c,650,528,40,'#d9d0ff55');c.save();c.translate(650,528);c.rotate(Math.sin(w.time*1.6)*.08);c.fillStyle='#cee0f7';c.strokeStyle='#fff3d3';c.lineWidth=2;c.beginPath();c.moveTo(0,-17);c.lineTo(11,0);c.lineTo(0,17);c.lineTo(-11,0);c.closePath();c.fill();c.stroke();c.restore();text(c,'时间晶石 · E',650,566,12,'#f3e9c4','center');}
  if(!w.gateOpen){plate(c,968,256,31,89,'#213737dd');c.strokeStyle='#c7ac78';c.strokeRect(973,260,21,82);}text(c,w.gateOpen?'门已开启':'出口门 · E',985,237,12,'#f1dab2','center');
  const pose=!p.onGround?(p.vy<0?5:6):Math.abs(p.vx)>.1?Math.floor(w.time*9)%4:4;sprite(c,art.explorer,frames.explorer[pose],p.x,p.y,poseHeight('explorer',pose,61),p.dir<0);if(s.persistent.crystal){glow(c,p.x,p.y-36,20,'#d4e2ff55');ring(c,p.x,p.y-36,8,'#e2efff',2);}
  sceneHeading(c,'钟楼的第二次',s.rewinding?'人物、桥与配重一起退回过去':'时间晶石留在手中，世界可以退回过去');plate(c,28,580,1064,30,'#102b36e3');c.fillStyle='#89968e55';c.fillRect(47,594,385,4);c.fillStyle=s.rewinding?'#bcdbe8':'#dbbd7e';c.fillRect(47,594,385*Math.min(1,s.history.length/901),4);text(c,`可回溯 ${(s.history.length/30).toFixed(1)} 秒`,458,601,13);text(c,s.persistent.sealed?'桥已锁定 · 去右门':s.persistent.crystal?'按住 R 回到控制台':'桥下取晶石 → 回溯 → 左台锁桥',1070,601,13,'#e8dcc6','right');if(s.won)voyageComplete(c,'钟楼的门再次打开','世界恢复了过去，你带来了过去没有的晶石');
 }
}
export async function createKinetics(options){if(options.id==='nested')return (await import('./showcase-kinetics-3d.js')).createNested(options);const names=options.id==='ribbon'?['ribbon','courier']:options.id==='rescue'?['rescue','crew','wood','stone']:['rewind','explorer','clockbridge'];const art=await images(names,'assets/game-forms/kinetics/'),{element,ctx}=canvasSurface(options.host);return kineticsController(options,{element,draw:s=>drawKineticsScene(ctx,s,art),dispose(){element.remove();}});}
