import {W,H,canvasSurface,images,clamp} from './showcase-core.js';
import {sceneHeading} from './showcase-observation-kit.js?v=20261004-2';
import {voyagesController,voyageText as text,voyagePlate as plate,voyageRing as ring,voyageComplete} from './showcase-voyages-kit.js';
import {MAP_NODES,MAP_EDGES,mapPosition,LIMB_ROOTS,LIMB_SOCKETS,PAPER_ANCHORS,paperEndpoints,paperLinks,TAU} from './showcase-voyages-rules.js';
const colors=['#8fd3ee','#edc078','#92dfb8'];
function sprite(c,im,box,x,y,height){const [sx,sy,ex,ey]=box,w=height*(ex-sx)/(ey-sy);c.drawImage(im,sx,sy,ex-sx,ey-sy,x-w/2,y-height,w,height)}
function mapLine(c,a,b){c.beginPath();const p=mapPosition(a,b,0);c.moveTo(p.x,p.y);for(let t=.02;t<=1.01;t+=.02){const q=mapPosition(a,b,Math.min(t,1));c.lineTo(q.x,q.y)}c.stroke()}
export function drawVoyagesScene(c,s,art,clock=0){
 if(s.id==='cartographer'){c.fillStyle='#25474a';c.fillRect(0,0,W,H)}else c.drawImage(art[s.id],0,0,W,H);
 if(s.id==='cartographer'){
  c.save();c.translate(560+s.pan.x,315+s.pan.y);c.scale(s.zoom,s.zoom);c.translate(-560,-315);c.drawImage(art.cartographer,0,0,W,H);c.lineCap='round';
  for(const [a,b,cost,kind] of MAP_EDGES){c.strokeStyle=kind==='ferry'?'#bfe6e0b0':'#413b2988';c.lineWidth=kind==='ferry'?2:3;c.setLineDash(kind==='ferry'?[7,7]:[2,5]);mapLine(c,a,b)}
  let prev=s.current;for(const n of s.route){c.lineWidth=8;c.setLineDash([]);c.strokeStyle='#192f3599';mapLine(c,prev,n);c.lineWidth=3;c.strokeStyle='#ffe7a4';c.setLineDash([10,6]);mapLine(c,prev,n);prev=n}c.setLineDash([]);
  MAP_NODES.forEach((v,i)=>{const done=s.observed.includes(i),visited=s.visited.includes(i);c.fillStyle=done?'#8fcdb0':visited?'#d9bd7c':'#213c42';c.strokeStyle='#f6dfa0';c.lineWidth=2;c.beginPath();c.arc(v.x,v.y,v.survey?12:8,0,TAU);c.fill();c.stroke();const lx=i===7?v.x-26:v.x+21,ly=v.y+(i===0?26:4),align=i===7?'right':'left';c.save();c.font='14px "Microsoft YaHei"';const tw=c.measureText(v.name).width;plate(c,align==='right'?lx-tw-8:lx-8,ly-19,tw+16,26,'#1e373bd9');text(c,(done?'✓ ':'')+v.name,lx,ly,14,'#fff0c8',align);c.restore();if(done)text(c,'✓',v.x,v.y+5,13,'#18392d','center')});
  const p=s.leg?mapPosition(s.leg.from,s.leg.to,s.leg.progress):MAP_NODES[s.current];ring(c,p.x,p.y,21,'#ffd477',3);c.save();c.translate(p.x,p.y-16);c.fillStyle='#183b42';c.strokeStyle='#ffe0a0';c.lineWidth=2;c.beginPath();c.moveTo(0,-27);c.lineTo(10,-10);c.lineTo(0,-4);c.lineTo(-10,-10);c.closePath();c.fill();c.stroke();c.restore();c.restore();
  sceneHeading(c,'把海岸走成地图','相连地点规划 → 按路线旅行 → 到站观察 → 带回记录');plate(c,26,551,1068,55,'#173237e8');text(c,`补给 ${s.supplies.toFixed(1)} / 16`,46,584,18);text(c,`观察 ${s.observed.length} / 3`,250,584,18);text(c,s.boat?'渡船通行证 · 已领取':'南侧渡船 · 需要通行证',460,584,14);text(c,s.running?'队伍正在旅行':s.route.length?'路线已规划，等待出发':'点击带圆标的相连地点',1073,584,14,'#e1dec0','right');
  if(s.won)voyageComplete(c,'海岸观察图已归档','三处真实到访 · 完成记录 · 返回营地');
 }
 if(s.id==='tendril'){
  const shade=c.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#061e2b44');shade.addColorStop(.5,'#05142100');shade.addColorStop(1,'#061e2baa');c.fillStyle=shade;c.fillRect(0,0,W,H);
  LIMB_SOCKETS.forEach((v,i)=>{plate(c,v.x-62,v.y-48,124,100,'#0c2c38d6');ring(c,v.x,v.y,31,colors[i],4);ring(c,v.x,v.y,23,'#b7cbbd88');text(c,['潮汐蓝','礁石金','海藻青'][i],v.x,v.y-60,15,colors[i],'center');text(c,s.items[i].placed?'样本就位':'同色样本接口',v.x,v.y+45,11,'#d3e2ce','center')});
  for(let i=0;i<3;i++){const limb=s.limbs[i],points=limb.points;c.save();c.lineJoin=c.lineCap='round';c.beginPath();points.forEach((p,n)=>n?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle='#05131b';c.lineWidth=23;c.shadowBlur=14;c.shadowColor='#020e16';c.stroke();c.shadowBlur=0;c.strokeStyle=colors[i];c.lineWidth=s.selected===i?15:12;c.stroke();c.strokeStyle='#f3ddb56b';c.lineWidth=3;c.stroke();for(let n=2;n<points.length-1;n+=3){const p=points[n],q=points[n+1];c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(q.y-p.y,q.x-p.x));c.fillStyle='#4c5351';c.fillRect(-2,-9,4,18);c.fillStyle='#dcbd78';c.fillRect(-1,-8,2,16);c.restore()}ring(c,limb.tip.x,limb.tip.y,16,colors[i],3);if(s.selected===i){ring(c,limb.tip.x,limb.tip.y,25,colors[i]+'99',1);text(c,String(i+1),limb.tip.x,limb.tip.y+5,14,'#fff1c6','center')}c.restore();}
  sprite(c,art.body,[80,64,1147,1163],560,411,180);
  s.items.forEach((v,i)=>{const g=c.createLinearGradient(v.x-17,v.y-22,v.x+17,v.y+22);g.addColorStop(0,'#edfbe1');g.addColorStop(.2,colors[i]);g.addColorStop(.8,'#285465');g.addColorStop(1,'#081c2a');c.save();c.translate(v.x,v.y);if(v.heldBy>=0)c.rotate(Math.sin(clock*2+i)*.08);c.fillStyle=g;c.strokeStyle=colors[i];c.lineWidth=2;c.beginPath();c.roundRect(-16,-25,32,50,10);c.fill();c.stroke();c.fillStyle='#edd6a0';c.fillRect(-17,-19,34,6);c.fillRect(-17,14,34,6);c.fillStyle='#f8eebf';c.fillRect(-7,-7,14,14);c.restore();if(!v.placed&&v.heldBy<0)text(c,'样本 '+(i+1),v.x,v.y+48,13,colors[i],'center')});
  sceneHeading(c,'潮间柔性臂','三条独立肢体 · 拖末端 → 抓取 → 移到同色接口 → 松开');plate(c,28,551,1064,54,'#0b2634e8');text(c,'每条臂都受长度约束',49,583,14,'#b2dbd5');text(c,`当前：${s.selected+1} 号臂`,320,583,16,colors[s.selected]);text(c,s.limbs[s.selected].holding>=0?'携带时响应稍慢':'末端靠近物件才能抓取',560,583,14);text(c,`装配 ${s.items.filter(v=>v.placed).length} / 3`,1070,584,19,'#f4d7a0','right');if(s.won)voyageComplete(c,'样本接口全部就位','三个肢体协作，研究舱重新亮起');
 }
 if(s.id==='cutout'){
  const links=paperLinks(s);c.save();c.strokeStyle='#f8e0a379';c.lineWidth=1;c.setLineDash([3,7]);for(let i=0;i<3;i++){c.beginPath();c.moveTo(PAPER_ANCHORS[i].x,PAPER_ANCHORS[i].y);c.lineTo(PAPER_ANCHORS[i+1].x,PAPER_ANCHORS[i+1].y);c.stroke()}c.restore();
  PAPER_ANCHORS.forEach((p,i)=>{plate(c,p.x-26,p.y+1,52,26,'#335c5ddb');ring(c,p.x,p.y,12,'#ffe1a1',3);c.fillStyle='#f4d491';c.beginPath();c.arc(p.x,p.y,4,0,TAU);c.fill();text(c,i===0?'出发台':i===3?'远岸投递口':'锚点 '+i,p.x,p.y-30,13,'#f8e7bd','center')});
  s.parts.forEach((p,i)=>{const width=280*p.scale,height=width*259/2103;c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.shadowColor='#25333166';c.shadowBlur=9;c.shadowOffsetY=8;c.drawImage(art.bridge,34,233,2103,259,-width/2,-9*p.scale,width,height);c.restore();const ends=paperEndpoints(p);for(let n=0;n<2;n++){const end=ends[n],near=links[i].nodes[n]>=0;ring(c,end.x,end.y,near?10:7,near?'#ffe1a1':'#dbe1ce',near?3:2)}if(s.selected===i&&!s.running){c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.strokeStyle='#f4d392';c.lineWidth=1;c.setLineDash([5,4]);c.strokeRect(-width/2-8,-21,width+16,height+32);c.restore();plate(c,p.x-33,p.y+height+15,66,25);text(c,'纸桥 '+(i+1),p.x,p.y+height+32,12,'#f3dfaf','center')}});
  const bob=s.running&&!s.fallVelocity?Math.sin(clock*11)*2:0;sprite(c,art.messenger,[125,54,1411,949],s.walker.x,s.walker.y+bob,54);ring(c,s.walker.x,s.walker.y+3,4,'#ffe9b588');
  sceneHeading(c,'纸片成为归途','纸片的位置、角度和长度，会直接改变信使的通路');plate(c,27,579,1066,34,'#263f42e3');text(c,'拖动纸桥 · Q / E 旋转 · 下方调整长度',45,601,13);text(c,`已连接 ${links.filter(v=>v.valid).length} / 3`,1069,601,14,'#f7dea4','right');if(s.won)voyageComplete(c,'信已送到远岸','你移动的纸片，成为了信使真正走过的路');
 }
}
export async function createVoyages(options){
 const {id,host}=options;if(id==='panorama')return (await import('./showcase-voyages-panorama.js')).createPanorama(options);const art=await images(id==='tendril'?['tendril','body']:id==='cutout'?['cutout','bridge','messenger']:['cartographer'],'assets/game-forms/voyages/'),{element,ctx}=canvasSurface(host);
 return voyagesController(options,{element,links:s=>paperLinks(s).filter(v=>v.valid).length,draw:(s,clock)=>drawVoyagesScene(ctx,s,art,clock),dispose(){element.remove()}});
}
