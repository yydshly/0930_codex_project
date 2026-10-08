import {clamp} from './showcase-core.js';
export const NINE_IDS=['hook','fold','repair','delve','cluster','paint','swarm','kitchen','relay'];
const finite=(v,a,b,f=0)=>Number.isFinite(v)?clamp(v,a,b):f;
const base=id=>({version:1,id,won:false,elapsed:0,moves:0,message:'',phase:'play'});
export const HOOK_ANCHORS=[{x:270,y:130},{x:540,y:105},{x:810,y:130}];
export const HOOK_TERRACES=[{x:70,w:180,y:490},{x:460,w:140,y:490},{x:920,w:170,y:490}];
export const FOLD_NODES=[[-3,0,1],[-1,0,1],[0,14/15,2],[2,14/15,2],[3,28/15,1],[3,28/15,-1],[2,2.8,-2],[0,2.8,-2]];
export function foldProject(p,yaw=0){const a=yaw*Math.PI/2,x=p[0]*Math.cos(a)-p[2]*Math.sin(a),z=p[0]*Math.sin(a)+p[2]*Math.cos(a);return {x:560+(x-z)*60,y:440+(x+z)*28-p[1]*60}}
export function foldConnected(s){if(s.node%2===0)return true;if(s.node>=7)return false;const a=foldProject(FOLD_NODES[s.node],s.yaw),b=foldProject(FOLD_NODES[s.node+1],s.yaw);return Math.hypot(a.x-b.x,a.y-b.y)<2}
export const REPAIR_NAMES=['机芯','表盘','后盖'];
export const REPAIR_SLOTS=[{x:553,y:323,angle:0},{x:553,y:323,angle:0},{x:553,y:323,angle:0}];
export const KITCHEN_STATIONS=[{x:180,y:300},{x:447,y:300},{x:677,y:300},{x:956,y:290}];
export function freshNine(id){const s=base(id);
 if(id==='hook')Object.assign(s,{p:{x:150,y:472,vx:0,vy:0},anchor:-1,selected:0,length:350,checkpoint:0,falls:0});
 if(id==='fold')Object.assign(s,{yaw:0,targetYaw:0,node:0,walk:0});
 if(id==='repair')Object.assign(s,{cover:true,clean:false,selected:0,parts:[{x:825,y:185,angle:90,placed:false},{x:825,y:337,angle:180,placed:false},{x:825,y:493,angle:270,placed:false}],tested:false,seconds:0});
 if(id==='delve'){const cells=Array.from({length:12*22},(_,i)=>i<24?0:i%17===5||i%29===7?2:1);cells[21*12+6]=3;Object.assign(s,{cells,p:{x:6,y:1},ore:0,depth:1,selected:2});}
 if(id==='cluster')Object.assign(s,{p:{x:400,y:360},radius:22,angle:0,items:Array.from({length:28},(_,i)=>({x:260+(i%7)*98,y:160+Math.floor(i/7)*102,size:16+(i%4)*7,type:4+i%4,taken:false})),collected:0,target:null});
 if(id==='paint')Object.assign(s,{p:{x:310,y:350},bot:{x:760,y:250},cells:Array(24*12).fill(0),ink:100,swim:false,paint:true,target:null,timer:75});
 if(id==='swarm')Object.assign(s,{p:{x:270,y:350},workers:Array.from({length:12},(_,i)=>({x:240+i%4*22,y:300+Math.floor(i/4)*25,job:-1})),cargo:[{x:350,y:190,need:3,delivered:false},{x:500,y:440,need:5,delivered:false},{x:870,y:240,need:6,delivered:false}],bridge:0,selected:0,group:6,target:null});
 if(id==='kitchen')Object.assign(s,{p:{x:335,y:455},holding:-1,chop:0,cook:0,stove:false,served:0,orders:[{id:1,patience:65},{id:2,patience:95},{id:3,patience:125}],late:0,station:0,target:null});
 if(id==='relay')Object.assign(s,{role:'operator',stage:0,serial:472,cuts:[],dial:0,button:0,mistakes:0,locked:false});
 return s;
}
export function coverage(s){return s.cells.filter(v=>v===1).length/s.cells.length*100}
export function relaySolution(s){return [(s.serial%2?'coral':'teal'),(Math.floor(s.serial/10)%10)%4,(s.serial%3)+1]}
function near(a,b,d=65){return Math.hypot(a.x-b.x,a.y-b.y)<=d}
export function commandNine(s,name,arg){if(s.phase!=='play'&&!(s.id==='relay'&&name==='role'))return false;let result=false;
 if(s.id==='hook'){
  if(name==='anchor'){s.selected=Math.floor(finite(Number(arg),0,2));result=true}
  if(name==='attach'){const a=HOOK_ANCHORS[s.selected],d=Math.hypot(s.p.x-a.x,s.p.y-a.y);if(d<580){s.anchor=s.selected;s.length=Math.max(90,d);result=true;s.message='绳索已挂住，左右方向增加摆动，松绳保留速度。';}}
  if(name==='release'){s.anchor=-1;result=true;s.message='已释放绳索，物件保持当前惯性。'}
  if(name==='reel'&&s.anchor>=0){s.length=Math.max(100,s.length-35);result=true}
  if(name==='return'){s.p={x:s.checkpoint?530:150,y:472,vx:0,vy:0};s.anchor=-1;result=true}
 }
 if(s.id==='fold'){
  if(name==='rotate'&&!s.walk){s.targetYaw=(s.targetYaw+(Number(arg)||1)+4)%4;result=true}
  if(name==='walk'&&!s.walk&&Math.abs(s.yaw-s.targetYaw)<.001){if(foldConnected(s)){s.walk=.001;result=true;s.message='沿当前投影通路前行。'}else s.message='桥端在画面中没有对齐，旋转镜头再判断。'}
 }
 if(s.id==='repair'){
  if(name==='cover'){if(s.parts.every(p=>!p.placed)){s.cover=!s.cover;result=true}}
  if(name==='clean'&&!s.cover){s.clean=true;result=true}
  if(name==='select'){s.selected=Math.floor(finite(Number(arg),0,2));result=true}
  if(name==='rotate'&&!s.parts[s.selected].placed){s.parts[s.selected].angle=(s.parts[s.selected].angle+90)%360;result=true}
  if(name==='place'&&!s.cover&&s.clean){const p=s.parts[s.selected],prior=s.selected===0||s.parts[s.selected-1].placed;if(prior&&!p.placed&&p.angle===0&&near(p,REPAIR_SLOTS[s.selected],65)){p.placed=true;p.x=553;p.y=323;result=true}else s.message='按机芯→表盘→后盖顺序安装，转正零件并移到表壳。'}
  if(name==='move'&&!s.parts[s.selected].placed&&arg){const p=s.parts[s.selected];p.x=finite(arg.x,160,980,p.x);p.y=finite(arg.y,100,560,p.y);result=true}
  if(name==='remove'){const i=s.parts.findLastIndex(p=>p.placed);if(i>=0){Object.assign(s.parts[i],{placed:false,x:825,y:185+i*154});s.selected=i;result=true}}
  if(name==='test'){if(s.parts.every(p=>p.placed)&&s.clean){s.tested=true;s.won=true;s.phase='won';result=true;s.message='机芯正常运行，怀表已修复。'}else s.message='先移开盖板、清洁，再安装三层零件。'}
 }
 if(s.id==='delve'&&name==='dig'){
  const d=[[0,-1],[1,0],[0,1],[-1,0]][Math.floor(finite(Number(arg),0,3))],x=s.p.x+d[0],y=s.p.y+d[1];if(x>=0&&x<12&&y>=0&&y<22){const i=y*12+x,t=s.cells[i];if(t===2)s.ore++;s.cells[i]=0;s.p={x,y};s.depth=Math.max(s.depth,y);result=true;if(t===3){s.won=true;s.phase='won';s.message='古井信标已找到，开出的路径继续保留。'}}
 }
 if(['cluster','paint','swarm','kitchen'].includes(s.id)&&name==='target'&&arg){s.target={x:finite(arg.x,s.id==='kitchen'?150:185,s.id==='kitchen'?980:950,500),y:finite(arg.y,115,545,330)};result=true}
 if(s.id==='paint'){if(name==='swim'){s.swim=!s.swim;result=true}if(name==='spray'){s.paint=!s.paint;result=true}}
 if(s.id==='swarm'){
  if(name==='select'){s.selected=Math.floor(finite(Number(arg),0,2));result=true}if(name==='group'){s.group=s.group===6?3:s.group===3?12:6;result=true}
  if(name==='recall'){s.workers.forEach(w=>w.job=-1);result=true}
  if(name==='dispatch'){const c=s.cargo[s.selected],free=s.workers.filter(w=>w.job===-1);if(!c.delivered&&(s.selected<2||s.bridge>=1)&&free.length>=c.need&&s.group>=c.need){free.slice(0,s.group).forEach(w=>w.job=s.selected);result=true;s.message='小队已出发，达到人数后会把货物搬回温室。'}else s.message=s.selected===2&&s.bridge<1?'先搬回两件左岸材料修好桥。':'空闲人数或分队规模不足，请召回或调整分队。'}
 }
 if(s.id==='kitchen'){
  if(name==='station'){s.station=Math.floor(finite(Number(arg),0,3));s.target={...KITCHEN_STATIONS[s.station],y:420};result=true}
  if(name==='work'){const station=KITCHEN_STATIONS[s.station];if(!near(s.p,{...station,y:420},85)){s.message='先走到选中工位前，再操作。';return false}if(s.station===0&&s.holding<0){s.holding=8;result=true}if(s.station===1&&s.holding===8){s.chop+=1;if(s.chop>=3){s.holding=9;s.chop=0}result=true}if(s.station===2&&s.holding===9&&!s.stove){s.stove=true;s.cook=0;s.holding=-1;result=true}else if(s.station===2&&s.stove&&s.cook>=4&&s.holding<0){s.holding=11;s.stove=false;result=true}if(s.station===3&&s.holding===11&&s.orders.length){s.orders.shift();s.holding=-1;s.served++;result=true;if(s.served>=3){s.won=true;s.phase='won';s.message='三份热汤全部交付。'}}}
 }
 if(s.id==='relay'){
  if(name==='role'){s.role=s.role==='operator'?'manual':'operator';result=true}
  if(name==='dial'&&s.role==='operator'&&s.stage===1){s.dial=(s.dial+1)%4;result=true}
  if(name==='button'&&s.role==='operator'&&s.stage===2){s.button=(s.button+1)%4;result=true}
  if(name==='wire'&&s.role==='operator'&&s.stage===0){const answer=relaySolution(s)[0];if(arg===answer){s.cuts.push(arg);s.stage=1;result=true}else{s.mistakes++;s.message='这根线路不符合序号规则，可查看说明端。'}}
  if(name==='verify'&&s.role==='operator'){const answers=relaySolution(s);if(s.stage===1&&s.dial===answers[1]){s.stage=2;result=true}else if(s.stage===2&&s.button===answers[2]){s.stage=3;s.won=true;s.phase='won';result=true;s.message='双方信息已核对，航灯重新点亮。'}else{s.mistakes++;s.message='读数尚未符合说明规则，继续交流。'}}
 }
 if(result)s.moves++;return result;
}
function follow(p,target,speed,dt){if(!target)return;const d=Math.hypot(target.x-p.x,target.y-p.y);if(d<.1)return;const step=Math.min(d,speed*dt);p.x+=(target.x-p.x)/d*step;p.y+=(target.y-p.y)/d*step}
const inkIndex=p=>clamp(Math.floor((p.y-110)/36),0,11)*24+clamp(Math.floor((p.x-180)/32),0,23);
function gardenFollow(p,target,speed,dt,bridge){if(!target)return;let goal=target;if(!bridge&&goal.x>775)goal={x:775,y:goal.y};if(bridge){if(p.x<781&&target.x>835)goal=Math.abs(p.y-337)>8&&p.x<771?{x:770,y:337}:{x:850,y:337};else if(p.x>835&&target.x<781)goal=Math.abs(p.y-337)>8&&p.x>845?{x:850,y:337}:{x:770,y:337};else if(p.x>=781&&p.x<=835)goal={x:target.x>p.x?850:770,y:337};}follow(p,goal,speed,dt);}
export function stepNine(s,delta,drive={x:0,y:0}){const dt=Number.isFinite(delta)?clamp(delta,0,.08):0;if(!dt||s.phase!=='play')return;drive={x:finite(drive.x,-1,1),y:finite(drive.y,-1,1)};s.elapsed+=dt;
 if(s.id==='hook'){
  for(let t=0;t<dt;t+=.005){const h=Math.min(.005,dt-t),p=s.p,oldY=p.y;p.vx+=finite(drive.x,-1,1)*240*h;p.vy+=430*h;p.vx*=Math.exp(-.3*h);p.vx=clamp(p.vx,-420,420);p.x+=p.vx*h;p.y+=p.vy*h;
   if(s.anchor>=0){const a=HOOK_ANCHORS[s.anchor],dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy);if(d>s.length){const nx=dx/d,ny=dy/d;p.x=a.x+nx*s.length;p.y=a.y+ny*s.length;const radial=p.vx*nx+p.vy*ny;if(radial>0){p.vx-=radial*nx;p.vy-=radial*ny}}}
   for(const floor of HOOK_TERRACES)if(p.x>=floor.x&&p.x<=floor.x+floor.w&&oldY<=floor.y-18&&p.y>=floor.y-18){p.y=floor.y-18;p.vy=0;if(floor.x===460)s.checkpoint=1;if(floor.x===920){s.won=true;s.phase='won';s.anchor=-1}}
   p.x=clamp(p.x,20,1100);if(p.y>700){s.falls++;commandNine(s,'return')}
  }
 }
 if(s.id==='fold'){s.yaw+=(s.targetYaw-s.yaw)*Math.min(1,dt*12);if(Math.abs(s.targetYaw-s.yaw)<.001)s.yaw=s.targetYaw;if(s.walk){s.walk+=dt/1.1;if(s.walk>=1){s.node++;s.walk=0;if(s.node>=7){s.won=true;s.phase='won'}}}}
 if(s.id==='repair'&&s.tested)s.seconds+=dt;
 const previous=s.p?{...s.p}:null;
 if(['cluster','paint','swarm','kitchen'].includes(s.id)){
  const speed=s.id==='paint'&&s.swim?(s.cells[inkIndex(s.p)]===1?260:90):155;
  if(drive.x||drive.y){s.target=null;const m=Math.max(1,Math.hypot(drive.x,drive.y));s.p.x=clamp(s.p.x+drive.x/m*speed*dt,s.id==='kitchen'?150:185,s.id==='kitchen'?980:950);s.p.y=clamp(s.p.y+drive.y/m*speed*dt,115,545)}else if(s.id==='swarm')gardenFollow(s.p,s.target,speed,dt,s.bridge);else follow(s.p,s.target,speed,dt);
  if(s.id==='swarm'){if(!s.bridge&&s.p.x>775)s.p.x=775;else if(s.bridge&&s.p.x>=781&&s.p.x<=835&&Math.abs(s.p.y-337)>36)s.p.x=previous.x<808?775:841;}
 }
 if(s.id==='cluster'){s.angle+=Math.hypot(s.p.x-previous.x,s.p.y-previous.y)/Math.max(22,s.radius);for(const item of s.items)if(!item.taken&&item.size<=s.radius*1.2&&near(s.p,item,s.radius+item.size*.4)){item.taken=true;s.collected++;s.radius=22+Math.sqrt(s.collected)*9;s.message='已吸附 '+s.collected+' 件，体积变大。'}if(s.collected>=28){s.won=true;s.phase='won'}}
 if(s.id==='paint'){
  const i=inkIndex(s.p);
  if(s.swim){if(s.cells[i]===1)s.ink=Math.min(100,s.ink+dt*30)}else if(s.paint&&s.ink>0){s.ink=Math.max(0,s.ink-dt*7);for(const [dx,dy]of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const x=i%24+dx,y=Math.floor(i/24)+dy;if(x>=0&&x<24&&y>=0&&y<12)s.cells[y*24+x]=1}}
  s.bot.x=560+220*Math.sin(s.elapsed*.3);s.bot.y=300+130*Math.sin(s.elapsed*.52);s.cells[inkIndex(s.bot)]=2;s.timer=Math.max(0,75-s.elapsed);if(coverage(s)>=58){s.won=true;s.phase='won';s.message='青色覆盖达到 58%，本轮完成。'}else if(!s.timer){s.phase='lost';s.message='本轮时间结束，可以重开。'}
 }
 if(s.id==='swarm'){
  s.workers.forEach((w,i)=>{if(w.job<0){const goal={x:s.p.x-25-(i%4)*18,y:s.p.y-12+Math.floor(i/4)*19};gardenFollow(w,goal,130,dt,s.bridge)}else{const c=s.cargo[w.job];if(!c.delivered)gardenFollow(w,c,110,dt,s.bridge);else{gardenFollow(w,{x:225,y:345},100,dt,s.bridge);if(near(w,{x:225,y:345},20))w.job=-1}}});
  s.cargo.forEach((c,j)=>{const team=s.workers.filter(w=>w.job===j);if(!c.delivered&&team.filter(w=>near(w,c,35)).length>=c.need){gardenFollow(c,{x:225,y:345},65,dt,s.bridge);team.forEach((w,i)=>gardenFollow(w,{x:c.x+Math.cos(i*2)*20,y:c.y+Math.sin(i*2)*20},130,dt,s.bridge));if(near(c,{x:225,y:345},24)){c.delivered=true;s.message='材料已送回温室，队员将自动归队。';s.bridge=s.cargo.slice(0,2).every(a=>a.delivered)?1:0;}}});
  if(s.cargo.every(c=>c.delivered)){s.won=true;s.phase='won'}
 }
 if(s.id==='kitchen'){if(s.stove){s.cook=Math.min(4,s.cook+dt);if(4-s.cook<1e-8)s.cook=4}for(const order of s.orders)order.patience=Math.max(0,order.patience-dt);s.late=s.orders.filter(o=>!o.patience).length;if(s.late===s.orders.length&&s.orders.length){s.phase='lost';s.message='顾客等待结束，可重开晚餐。'}}
}
export function restoreNine(id,raw){const s=freshNine(id);if(raw?.version!==1||raw.id!==id)return s;
 // Validate against the default shape. Unknown fields never enter the game.
 function clean(defaults,value){if(typeof defaults==='number')return Number.isFinite(value)?clamp(value,-100000,100000):defaults;if(typeof defaults==='boolean')return typeof value==='boolean'?value:defaults;if(typeof defaults==='string')return typeof value==='string'&&value.length<300?value:defaults;if(defaults===null)return value&&Number.isFinite(value.x)&&Number.isFinite(value.y)?{x:clamp(value.x,0,1120),y:clamp(value.y,0,630)}:null;if(Array.isArray(defaults))return Array.isArray(value)&&value.length===defaults.length?defaults.map((v,i)=>clean(v,value[i])):structuredClone(defaults);if(defaults&&typeof defaults==='object')return Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,clean(v,value?.[k])]));return defaults}
 Object.assign(s,clean(s,raw));s.elapsed=Math.max(0,s.elapsed);s.moves=Math.max(0,Math.floor(s.moves));s.id=id;s.version=1;
 if(id==='hook'){s.selected=clamp(Math.floor(s.selected),0,2);s.anchor=clamp(Math.floor(s.anchor),-1,2);s.p.x=clamp(s.p.x,20,1100);s.p.y=clamp(s.p.y,-400,700);s.length=clamp(s.length,90,580);s.checkpoint=s.checkpoint?1:0;s.won=s.p.x>=920&&Math.abs(s.p.y-472)<2;}
 if(id==='fold'){s.node=clamp(Math.floor(s.node),0,7);s.targetYaw=clamp(Math.floor(s.targetYaw),0,3);s.yaw=clamp(s.yaw,0,3);s.walk=clamp(s.walk,0,.999);s.won=s.node===7;}
 if(id==='repair'){s.selected=clamp(Math.floor(s.selected),0,2);s.parts.forEach(p=>{p.angle=((Math.round(p.angle/90)*90)%360+360)%360;p.x=clamp(p.x,160,980);p.y=clamp(p.y,100,560)});s.won=s.tested&&s.clean&&s.parts.every(p=>p.placed&&p.angle===0);}
 if(id==='delve'){s.cells=s.cells.map(v=>Number.isInteger(v)&&v>=0&&v<=3?v:1);s.p.x=clamp(Math.floor(s.p.x),0,11);s.p.y=clamp(Math.floor(s.p.y),0,21);s.won=s.p.y===21&&s.p.x===6&&s.cells[258]===0;s.selected=clamp(Math.floor(s.selected),0,3);}
 if(id==='cluster'){s.items.forEach((v,i)=>Object.assign(v,{x:freshNine(id).items[i].x,y:freshNine(id).items[i].y,size:freshNine(id).items[i].size,type:4+i%4}));s.collected=s.items.filter(v=>v.taken).length;s.radius=22+Math.sqrt(s.collected)*9;s.won=s.collected===28;}
 if(id==='paint'){s.cells=s.cells.map(v=>Number.isInteger(v)&&v>=0&&v<=2?v:0);s.ink=clamp(s.ink,0,100);s.won=coverage(s)>=58;s.timer=Math.max(0,75-s.elapsed);}
 if(id==='swarm'){s.group=[3,6,12].includes(s.group)?s.group:6;s.selected=clamp(Math.floor(s.selected),0,2);s.workers.forEach(w=>w.job=clamp(Math.floor(w.job),-1,2));s.bridge=s.cargo.slice(0,2).every(c=>c.delivered)?1:0;s.won=s.cargo.every(c=>c.delivered);}
 if(id==='kitchen'){s.holding=[-1,8,9,11].includes(s.holding)?s.holding:-1;s.chop=clamp(Math.floor(s.chop),0,2);s.cook=clamp(s.cook,0,4);s.served=clamp(Math.floor(s.served),0,3);s.station=clamp(Math.floor(s.station),0,3);s.orders=Array.isArray(raw.orders)&&raw.orders.length===3-s.served?raw.orders.filter(o=>Number.isInteger(o.id)&&Number.isFinite(o.patience)).map(o=>({id:clamp(o.id,1,3),patience:clamp(o.patience,0,125)})):freshNine(id).orders.slice(s.served);s.won=s.served===3&&s.orders.length===0;}
 if(id==='relay'){s.role=s.role==='manual'?'manual':'operator';s.serial=472;s.stage=clamp(Math.floor(s.stage),0,3);s.dial=clamp(Math.floor(s.dial),0,3);s.button=clamp(Math.floor(s.button),0,3);s.cuts=Array.isArray(raw.cuts)?raw.cuts.filter(v=>v==='teal').slice(0,1):[];s.won=s.stage===3&&s.cuts.length===1&&s.dial===relaySolution(s)[1]&&s.button===relaySolution(s)[2];if(s.stage&&!s.cuts.length)s.stage=0;}
 if(['cluster','paint','swarm','kitchen'].includes(id)){const lo=id==='kitchen'?150:185,hi=id==='kitchen'?980:950;s.p.x=clamp(s.p.x,lo,hi);s.p.y=clamp(s.p.y,115,545);if(s.target){s.target.x=clamp(s.target.x,lo,hi);s.target.y=clamp(s.target.y,115,545);}}
 if(id==='delve'){s.depth=clamp(Math.floor(Math.max(s.depth,s.p.y)),0,21);s.ore=clamp(Math.floor(s.ore),0,264);}
 if(id==='swarm'){s.cargo.forEach((c,i)=>{c.need=[3,5,6][i];c.x=clamp(c.x,185,950);c.y=clamp(c.y,115,545)});s.workers.forEach(w=>{w.x=clamp(w.x,180,970);w.y=clamp(w.y,100,570)});if(!s.bridge)s.p.x=Math.min(s.p.x,775);}
 s.phase=s.won?'won':((id==='paint'&&!s.timer)||(id==='kitchen'&&s.orders.length&&s.orders.every(o=>!o.patience))?'lost':'play');return s;
}
