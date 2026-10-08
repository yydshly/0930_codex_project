import {clamp} from './showcase-core.js';
import {pointerPosition} from './showcase-precision-kit.js';
import {restoreVoyages,commandVoyages,stepVoyages,MAP_NODES,paperEndpoints,TAU} from './showcase-voyages-rules.js';
import {voyagesPanel,VOYAGES_INFO} from './showcase-voyages-panel.js';
export function voyagesController(options,surface){
 const {id,host,input,saved,sfx=()=>{}}=options,element=surface.element;let s=restoreVoyages(id,saved),active=false,clock=0,drag=null;const holds=new Set(),events=new AbortController(),signal=events.signal;
 element.setAttribute('aria-label',VOYAGES_INFO[id].title+'。'+VOYAGES_INFO[id].help);
 const stats=()=>id==='cartographer'?[MAP_NODES[s.current].name,`记录 ${s.observed.length}/3`,`补给 ${s.supplies.toFixed(1)}`,s.running?'旅行中':'路线规划']:id==='tendril'?[`样本 ${s.items.filter(v=>v.placed).length}/3`,`第 ${s.selected+1} 条臂`,s.limbs[s.selected].holding<0?'空闲':'携带样本']:id==='cutout'?[`连通 ${surface.links?.(s)??0}/3`,`纸桥 ${s.selected+1}`,s.running?'试走中':s.failed?'调整缺口':'剪纸工作台']:[`方位 ${(s.yaw/TAU*360).toFixed(1)}°`,`仰角 ${(s.pitch*180/Math.PI).toFixed(1)}°`,`${s.zoom.toFixed(2)} 倍`,`测绘 ${s.records.length}/3`,surface.mode];
 const sync=()=>ui.sync(active,s,stats());
 function run(key,value){if(!active)return false;const [k,a]=key.split(':');let arg=value??(a!==undefined&&Number.isFinite(+a)?+a:a);if(k==='view')arg=value??{zoom:s.zoom+(+a)*.15,x:s.pan.x,y:s.pan.y};if(k==='rotate'&&value===undefined)arg=(+a)*Math.PI/60;if(k==='scale'&&value===undefined)arg=(+a)*.05;const won=s.won,ok=commandVoyages(s,k,arg);if(ok&&!['move','look','view','begin','end'].includes(k))sfx(!won&&s.won?'success':'turn');sync();return ok}
 const ui=voyagesPanel(host,id,run,(key,on)=>{if(!active)return;if(id==='cutout'){if(on&&!holds.size)run('begin');if(!on&&holds.size===1&&holds.has(key))run('end')}on?holds.add(key):holds.delete(key)});sync();
 const mapPoint=p=>({x:(p.x-560-s.pan.x)/s.zoom+560,y:(p.y-315-s.pan.y)/s.zoom+315});
 const release=()=>{const pointerId=drag?.pointerId;drag=null;if(pointerId!==undefined&&element.hasPointerCapture?.(pointerId))element.releasePointerCapture(pointerId);holds.clear();if(s.id==='cutout')commandVoyages(s,'end')};
 element.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();element.focus({preventScroll:true});const p=pointerPosition(element,e);if(p.x<0||p.x>1120||p.y<0||p.y>630)return;
  if(id==='cartographer'){const q=mapPoint(p),n=MAP_NODES.findIndex(v=>Math.hypot(v.x-q.x,v.y-q.y)<30/s.zoom);if(n>=0){run('node',n);return}drag={p,pan:{...s.pan},pointerId:e.pointerId}}
  if(id==='tendril'){const n=s.limbs.findIndex(v=>Math.hypot(v.tip.x-p.x,v.tip.y-p.y)<30);if(n>=0)run('select',n);run('move',p);drag={pointerId:e.pointerId}}
  if(id==='cutout'){if(s.running)return;const n=s.parts.map((v,i)=>{const dx=p.x-v.x,dy=p.y-v.y;return {i,x:dx*Math.cos(v.angle)+dy*Math.sin(v.angle),y:-dx*Math.sin(v.angle)+dy*Math.cos(v.angle),width:280*v.scale}}).find(v=>Math.abs(v.x)<v.width/2+10&&Math.abs(v.y)<30);if(!n)return;run('select',n.i);run('begin');drag={offset:{x:p.x-s.parts[n.i].x,y:p.y-s.parts[n.i].y},pointerId:e.pointerId}}
  if(id==='panorama')drag={p,pointerId:e.pointerId};if(drag)element.setPointerCapture(e.pointerId);
 },{signal});
 element.addEventListener('pointermove',e=>{if(!active||!drag||drag.pointerId!==e.pointerId)return;const p=pointerPosition(element,e);if(id==='cartographer')run('view',{zoom:s.zoom,x:drag.pan.x+p.x-drag.p.x,y:drag.pan.y+p.y-drag.p.y});if(id==='tendril')run('move',p);if(id==='cutout')run('move',{x:p.x-drag.offset.x,y:p.y-drag.offset.y});if(id==='panorama'){run('look',{x:-(p.x-drag.p.x)*.0028/s.zoom,y:(p.y-drag.p.y)*.0028/s.zoom});drag.p=p}},{signal});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,release,{signal});window.addEventListener('blur',release,{signal});
 element.addEventListener('wheel',e=>{if(!active||!['panorama','cartographer','cutout'].includes(id))return;e.preventDefault();if(id==='panorama')run('zoom',e.deltaY<0?.15:-.15);if(id==='cartographer')run('view',{zoom:s.zoom+(e.deltaY<0?.12:-.12),x:s.pan.x,y:s.pan.y});if(id==='cutout')run('rotate',e.deltaY<0?-Math.PI/60:Math.PI/60)},{signal,passive:false});
 element.addEventListener('keydown',e=>{if(!active||e.target!==element)return;if(id==='tendril'&&['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();run('select',+e.code.at(-1)-1)}if(id==='cutout'&&e.code==='KeyQ'){e.preventDefault();if(!e.repeat)run('rotate',-Math.PI/60)}},{signal});
 let keyboardGesture=false;
 return {onStart(){active=true;sync()},setActive(v){if(active===v)return;active=v;if(!v){release();keyboardGesture=false}sync()},command:run,tick(dt){if(!active)return;dt=clamp(Number.isFinite(dt)?dt:0,0,.08);clock+=dt;const x=(input?.x||0)+(holds.has('right')?1:0)-(holds.has('left')?1:0),y=(input?.y||0)+(holds.has('down')?1:0)-(holds.has('up')?1:0);
  if(id==='tendril'){if(x||y)run('move',{x:s.limbs[s.selected].target.x+x*180*dt,y:s.limbs[s.selected].target.y+y*180*dt});if(input?.pressed?.has('Space'))run('grip')}
  if(id==='cutout'){if((x||y)&&!s.running){if(!keyboardGesture&&!holds.size)run('begin');keyboardGesture=true;run('move',{x:s.parts[s.selected].x+x*120*dt,y:s.parts[s.selected].y+y*120*dt})}else if(keyboardGesture){run('end');keyboardGesture=false}if(input?.pressed?.has('KeyE'))run('rotate',Math.PI/60);if(input?.pressed?.has('Space'))run('walk')}
  if(id==='panorama'){if(x||y)run('look',{x:x*dt*.7/s.zoom,y:-y*dt*.6/s.zoom});if(input?.pressed?.has('Space')||input?.pressed?.has('KeyE'))run('measure')}
  const won=s.won;stepVoyages(s,dt);if(!won&&s.won)sfx('success');sync();
 },draw(){surface.draw(s,clock)},getState(){return structuredClone(s)},getStatus(){return {goal:s.won?VOYAGES_INFO[id].title+' · 完成':VOYAGES_INFO[id].goal,message:s.message||VOYAGES_INFO[id].help,stats:stats(),actions:[]}},dispose(){active=false;release();events.abort();ui.dispose();surface.dispose()}};
}
export function voyageText(c,t,x,y,size=16,color='#f7e8c3',align='left'){c.save();c.font=`${size}px "Microsoft YaHei",sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(t,x,y);c.restore()}
export function voyagePlate(c,x,y,w,h,color='#0b2734e6'){c.save();c.fillStyle=color;c.strokeStyle='#d2bd8050';c.lineWidth=1;c.beginPath();c.roundRect(x,y,w,h,10);c.fill();c.stroke();c.restore()}
export function voyageRing(c,x,y,r,color='#c4edcf',width=2){c.save();c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.restore()}
export function voyageComplete(c,title,detail){voyagePlate(c,260,450,600,76,'#102b32ee');voyageText(c,title,560,483,25,'#ffe0a1','center');voyageText(c,detail,560,510,14,'#d4e7d1','center')}
