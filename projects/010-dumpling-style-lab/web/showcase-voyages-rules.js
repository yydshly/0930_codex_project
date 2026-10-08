export const VOYAGES_IDS=['cartographer','tendril','cutout','panorama'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,d,a=-1e6,b=1e6)=>Number.isFinite(v)?clamp(v,a,b):d;
export const TAU=Math.PI*2,wrapAngle=a=>((a%TAU)+TAU)%TAU,angleDistance=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const MAP_NODES=[
 {x:200,y:397,name:'南湾营地'}, {x:242,y:225,name:'崖边步道'}, {x:238,y:100,name:'盐风灯塔',survey:'salt',clue:'海风穿过灯塔，石面留着白色盐痕。'}, {x:567,y:193,name:'中央山脊'},
 {x:504,y:342,name:'草地岔口'}, {x:763,y:346,name:'芦苇湿地',survey:'reeds',clue:'水道两旁的芦苇形成连续的湿地带。'}, {x:809,y:469,name:'河口岸线'}, {x:977,y:407,name:'旧港石墙',survey:'masonry',clue:'海港挡浪墙由层层石块垒起，留下修补痕迹。'}
];
export const MAP_EDGES=[[0,1,1.4],[1,2,1.2],[1,4,1.3],[2,3,2.2],[3,4,1.2],[3,5,2.4],[4,5,1.4],[5,6,1.2],[6,7,1.3],[7,0,2.4,'ferry']];
export const mapEdge=(a,b)=>MAP_EDGES.find(v=>v[0]===a&&v[1]===b||v[0]===b&&v[1]===a);
export function mapPosition(a,b,t){const from=MAP_NODES[a],to=MAP_NODES[b],ferry=mapEdge(a,b)?.[3]==='ferry';if(ferry){const mid={x:560,y:590};return {x:(1-t)**2*from.x+2*(1-t)*t*mid.x+t*t*to.x,y:(1-t)**2*from.y+2*(1-t)*t*mid.y+t*t*to.y}}return {x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t}}
export const LIMB_ROOTS=[{x:513,y:380},{x:560,y:405},{x:607,y:380}];
export const LIMB_SOCKETS=[{x:280,y:228},{x:560,y:127},{x:840,y:228}],LIMB_ITEMS=[{x:274,y:471},{x:550,y:505},{x:846,y:471}];
export const LIMB_SEGMENTS=24,LIMB_LENGTH=14;
export function clampReach(root,p){const dx=num(p?.x,root.x)-root.x,dy=num(p?.y,root.y)-root.y,d=Math.hypot(dx,dy)||1,ratio=Math.min(1,(LIMB_SEGMENTS*LIMB_LENGTH-.01)/d);return {x:root.x+dx*ratio,y:root.y+dy*ratio}}
export function solveLimb(root,target,old){
 const end=clampReach(root,target),dx=end.x-root.x,dy=end.y-root.y,d=Math.hypot(dx,dy)||1;
 const usable=Array.isArray(old)&&old.length===LIMB_SEGMENTS+1&&old.every(v=>Number.isFinite(v?.x)&&Number.isFinite(v?.y))&&old.some(v=>Math.hypot(v.x-root.x,v.y-root.y)>1);
 const p=usable?old.map(v=>({x:v.x,y:v.y})):Array.from({length:LIMB_SEGMENTS+1},(_,i)=>{const t=i/LIMB_SEGMENTS,bend=Math.sin(t*Math.PI)*85;return {x:root.x+dx*t-dy/d*bend,y:root.y+dy*t+(Math.hypot(dx,dy)<.001?1:dx/d)*bend}});
 const unit=(x,y,fallback)=>{const length=Math.hypot(x,y);return length>.00001?{x:x/length,y:y/length}:fallback};
 for(let iteration=0;iteration<18;iteration++){p[LIMB_SEGMENTS]={...end};for(let i=LIMB_SEGMENTS-1;i>=0;i--){const next=p[i+1],v=p[i],u=unit(v.x-next.x,v.y-next.y,{x:-1,y:0});p[i]={x:next.x+u.x*LIMB_LENGTH,y:next.y+u.y*LIMB_LENGTH}}p[0]={...root};for(let i=1;i<=LIMB_SEGMENTS;i++){const prev=p[i-1],v=p[i],u=unit(v.x-prev.x,v.y-prev.y,{x:1,y:0});p[i]={x:prev.x+u.x*LIMB_LENGTH,y:prev.y+u.y*LIMB_LENGTH}}if(Math.hypot(p.at(-1).x-end.x,p.at(-1).y-end.y)<.05)break}
 return p;
}
export const PAPER_ANCHORS=[{x:160,y:452},{x:427,y:380},{x:703,y:315},{x:975,y:253}],PAPER_WIDTH=280;
export function paperEndpoints(part){const dx=Math.cos(part.angle)*PAPER_WIDTH*part.scale/2,dy=Math.sin(part.angle)*PAPER_WIDTH*part.scale/2;return [{x:part.x-dx,y:part.y-dy},{x:part.x+dx,y:part.y+dy}]}
export function paperLinks(s){return s.parts.map((part,index)=>{const ends=paperEndpoints(part),nodes=ends.map(p=>PAPER_ANCHORS.findIndex(q=>Math.hypot(p.x-q.x,p.y-q.y)<22));return {index,ends,nodes,valid:nodes.every(v=>v>=0)&&nodes[0]!==nodes[1]}})}
export function paperPath(s){const links=paperLinks(s).filter(v=>v.valid),queue=[{node:0,path:[]}],seen=new Set([0]);while(queue.length){const item=queue.shift();if(item.node===3)return item.path;for(const link of links){const side=link.nodes.indexOf(item.node);if(side<0)continue;const to=link.nodes[1-side];if(seen.has(to))continue;seen.add(to);queue.push({node:to,path:[...item.path,{index:link.index,from:item.node,to}]})}}return null}
export const PANORAMA_TARGETS=[{u:.245,v:.44,name:'盐风灯塔',detail:'石塔守住航道，盐痕记录长期的海风。'},{u:.514,v:.47,name:'潮蚀石拱',detail:'海水穿过玄武岩拱，日落从空隙中透出。'},{u:.798,v:.435,name:'三桅旧埠',detail:'三根旧桅杆依次亮灯，曾为归船标记泊位。'}];
export const panoramaFov=s=>92*Math.PI/180/s.zoom;
export function panoramaProject(s,point){const alpha=angleDistance(point.u*TAU,s.yaw),lat=(.5-point.v)*Math.PI,c=Math.cos(lat),z=Math.cos(alpha)*c*Math.cos(s.pitch)+Math.sin(lat)*Math.sin(s.pitch),y=Math.sin(lat)*Math.cos(s.pitch)-Math.cos(alpha)*c*Math.sin(s.pitch),x=Math.sin(alpha)*c,f=560/Math.tan(panoramaFov(s)/2);return {x:560+x/z*f,y:315-y/z*f,visible:z>0&&Math.abs(x/z*f)<580&&Math.abs(y/z*f)<335}}
export function panoramaAligned(s,i){const t=PANORAMA_TARGETS[i];return s.zoom>=2.2&&Math.abs(angleDistance(t.u*TAU,s.yaw))<.018&&Math.abs((.5-t.v)*Math.PI-s.pitch)<.02}
export function freshVoyages(id){
 const base={id,version:1,won:false,message:'',moves:0};
 if(id==='cartographer')return {...base,current:0,route:[],leg:null,running:false,supplies:16,boat:false,observed:[],visited:[0],zoom:1,pan:{x:0,y:0},distance:0};
 if(id==='tendril')return {...base,selected:0,limbs:[{x:360,y:430},{x:560,y:515},{x:760,y:430}].map((tip,i)=>({target:{...tip},tip:{...tip},points:solveLimb(LIMB_ROOTS[i],tip),holding:-1})),items:LIMB_ITEMS.map(v=>({...v,placed:false,heldBy:-1}))};
 if(id==='cutout')return {...base,parts:[300,600,900].map(x=>({x,y:548,angle:0,scale:1})),selected:0,history:[],editingGesture:false,running:false,failed:false,walker:{...PAPER_ANCHORS[0]},node:0,walkLeg:null,visited:[0],fallVelocity:0};
 if(id==='panorama')return {...base,yaw:.49*TAU,pitch:0,zoom:1,measuring:-1,stable:0,records:[]};
 throw Error('Unknown voyages form '+id);
}
export function restoreVoyages(id,raw){
 const s=freshVoyages(id);if(!raw||raw.id!==id||raw.version!==1)return s;s.moves=num(raw.moves,0,0,1e6);s.message=typeof raw.message==='string'?raw.message.slice(0,400):'';
 if(id==='cartographer'){
  s.current=num(raw.current,0,0,7)|0;s.supplies=num(raw.supplies,16,0,16);s.boat=raw.boat===true;s.observed=(Array.isArray(raw.observed)?raw.observed:[]).filter(v=>[2,5,7].includes(v)).filter((v,i,a)=>a.indexOf(v)===i);s.visited=(Array.isArray(raw.visited)?raw.visited:[]).filter(v=>Number.isInteger(v)&&v>=0&&v<8).filter((v,i,a)=>a.indexOf(v)===i);if(!s.visited.includes(s.current))s.visited.push(s.current);
  let prev=s.current;for(const n of (Array.isArray(raw.route)?raw.route:[]).slice(0,16)){if(!Number.isInteger(n)||!mapEdge(prev,n)||mapEdge(prev,n)[3]==='ferry'&&!s.boat)break;s.route.push(n);prev=n}
  if(raw.leg&&s.route[0]===raw.leg.to&&raw.leg.from===s.current)s.leg={from:s.current,to:s.route[0],progress:num(raw.leg.progress,0,0,1)};
  s.running=raw.running===true&&!!s.route.length;s.zoom=num(raw.zoom,1,1,1.8);s.pan={x:num(raw.pan?.x,0,-350,350),y:num(raw.pan?.y,0,-200,200)};s.distance=num(raw.distance,0,0,10000);s.won=!!raw.won&&s.current===0&&s.observed.length===3&&!s.leg;
 }
 if(id==='tendril'){
  s.selected=num(raw.selected,0,0,2)|0;if(Array.isArray(raw.items)&&raw.items.length===3)raw.items.forEach((v,i)=>{s.items[i].x=num(v?.x,s.items[i].x,30,1090);s.items[i].y=num(v?.y,s.items[i].y,80,555);s.items[i].placed=v?.placed===true;if(s.items[i].placed)Object.assign(s.items[i],LIMB_SOCKETS[i])});
  const held=new Set();if(Array.isArray(raw.limbs)&&raw.limbs.length===3)raw.limbs.forEach((v,i)=>{const root=LIMB_ROOTS[i],tip=clampReach(root,v?.tip),target=clampReach(root,v?.target);s.limbs[i]={tip,target,points:solveLimb(root,tip,v?.points),holding:-1};const item=v?.holding;if(Number.isInteger(item)&&item>=0&&item<3&&!s.items[item].placed&&!held.has(item)){held.add(item);s.limbs[i].holding=item;Object.assign(s.items[item],tip,{heldBy:i})}});s.won=s.items.every(v=>v.placed);
 }
 if(id==='cutout'){
  const validParts=a=>Array.isArray(a)&&a.length===3&&a.every(v=>v&&['x','y','angle','scale'].every(k=>Number.isFinite(v[k])));
  const clean=a=>a.map(v=>({x:num(v.x,300,70,1050),y:num(v.y,548,110,560),angle:num(v.angle,0,-.7,.7),scale:num(v.scale,1,.65,1.3)}));if(validParts(raw.parts))s.parts=clean(raw.parts);s.selected=num(raw.selected,0,0,2)|0;s.history=(Array.isArray(raw.history)?raw.history:[]).filter(validParts).slice(-32).map(clean);
  s.node=num(raw.node,0,0,3)|0;s.walker={x:num(raw.walker?.x,PAPER_ANCHORS[0].x,-100,1220),y:num(raw.walker?.y,PAPER_ANCHORS[0].y,0,900)};s.visited=(Array.isArray(raw.visited)?raw.visited:[0]).filter(v=>Number.isInteger(v)&&v>=0&&v<4);s.failed=raw.failed===true;s.fallVelocity=num(raw.fallVelocity,0,0,700);
  if(raw.walkLeg&&Number.isInteger(raw.walkLeg.index)&&raw.walkLeg.index>=0&&raw.walkLeg.index<3){const link=paperLinks(s)[raw.walkLeg.index];if(link.valid&&link.nodes.includes(s.node)){s.walkLeg={index:link.index,from:s.node,to:link.nodes.find(v=>v!==s.node),progress:num(raw.walkLeg.progress,0,0,1)}}}s.running=raw.running===true&&!s.failed;s.won=raw.won===true&&s.node===3&&!!paperPath(s);if(s.won)s.running=false;
 }
 if(id==='panorama'){s.yaw=wrapAngle(num(raw.yaw,s.yaw));s.pitch=num(raw.pitch,0,-.55,.55);s.zoom=num(raw.zoom,1,1,3.5);s.records=(Array.isArray(raw.records)?raw.records:[]).filter(v=>v&&Number.isInteger(v.index)&&v.index>=0&&v.index<3&&Number.isFinite(v.bearing)&&Number.isFinite(v.elevation)).filter((v,i,a)=>a.findIndex(x=>x.index===v.index)===i).map(v=>({index:v.index,bearing:wrapAngle(v.bearing),elevation:num(v.elevation,0,-.55,.55)}));s.won=s.records.length===3;s.measuring=-1;s.stable=0;}
 return s;
}
function resetWalker(s){s.running=false;s.failed=false;s.won=false;s.walker={...PAPER_ANCHORS[0]};s.node=0;s.visited=[0];s.walkLeg=null;s.fallVelocity=0}
function paperHistory(s){s.history.push(structuredClone(s.parts));if(s.history.length>32)s.history.shift()}
export function commandVoyages(s,key,arg){
 if(key==='restart'){Object.assign(s,freshVoyages(s.id));return true}
 if(s.id==='cartographer'){
  if(key==='view'&&arg){s.zoom=num(arg.zoom,s.zoom,1,1.8);s.pan={x:num(arg.x,s.pan.x,-350,350),y:num(arg.y,s.pan.y,-200,200)};return true}
  if(s.running||s.leg||s.won)return false;
  if(key==='boat'){if(s.boat||![0,7].includes(s.current)||s.supplies<1)return false;s.boat=true;s.supplies-=1;s.message='已领取渡船通行证，消耗 1 份补给。';s.moves++;return true}
  if(key==='node'&&Number.isInteger(arg)&&arg>=0&&arg<8){const prev=s.route.at(-1)??s.current,edge=mapEdge(prev,arg);if(!edge){s.message='这两处没有直接路线，先选择相连地点。';return false}if(edge[3]==='ferry'&&!s.boat){s.message='旧港与营地之间需要渡船通行证。';return false}if(s.route.length>=16)return false;s.route.push(arg);s.message='路线已加入 '+MAP_NODES[arg].name+'。';return true}
  if(key==='undo'){if(!s.route.length)return false;s.route.pop();return true}
  if(key==='clear'){s.route=[];return true}
  if(key==='survey'){const n=MAP_NODES[s.current];if(!n.survey||s.observed.includes(s.current)){s.message='此处没有待记录的观察点。';return false}if(arg!==n.survey){s.message=n.clue+' 请选择匹配的观察标记。';return false}if(s.supplies<.4){s.message='剩余补给不足以完成记录。';return false}s.supplies-=.4;s.observed.push(s.current);s.message='已记录 '+n.name+'：'+n.clue;s.moves++;return true}
  if(key==='launch'){if(!s.route.length)return false;if(MAP_NODES[s.current].survey&&!s.observed.includes(s.current)){s.message='先记录当前观察点，再继续旅行。';return false}let prev=s.current,cost=0;for(const n of s.route){const e=mapEdge(prev,n);cost+=e[2];prev=n}cost+=new Set(s.route.filter(v=>MAP_NODES[v].survey&&!s.observed.includes(v))).size*.4;if(cost>s.supplies+.0001){s.message='计划路线与观察所需补给超过库存，缩短路线或撤回末段。';return false}s.running=true;s.message='队伍按计划出发，抵达观察点会停下来。';s.moves++;return true}
 }
 if(s.id==='tendril'){
  if(key==='select'&&Number.isInteger(arg)&&arg>=0&&arg<3){s.selected=arg;return true}if(s.won)return false;const limb=s.limbs[s.selected];
  if(key==='move'&&arg){limb.target=clampReach(LIMB_ROOTS[s.selected],arg);return true}
  if(key==='grip'){
   if(limb.holding>=0){const i=limb.holding,item=s.items[i],socket=LIMB_SOCKETS[i];item.heldBy=-1;limb.holding=-1;if(Math.hypot(limb.tip.x-socket.x,limb.tip.y-socket.y)<28){Object.assign(item,socket,{placed:true});s.message='样本 '+(i+1)+' 已装入匹配的接口。'}else{Object.assign(item,limb.tip);s.message='已放下样本；重新拿起后送往同色接口。'}s.moves++;s.won=s.items.every(v=>v.placed);if(s.won)s.message='三个样本接口全部装好，研究舱重新亮起。';return true}
   const i=s.items.findIndex(v=>!v.placed&&v.heldBy<0&&Math.hypot(v.x-limb.tip.x,v.y-limb.tip.y)<27);if(i<0){s.message='将末端移到样本旁，再抓取。';return false}limb.holding=i;s.items[i].heldBy=s.selected;s.message='已抓住样本 '+(i+1)+'，携带时柔性臂响应会稍慢。';s.moves++;return true
  }
 }
 if(s.id==='cutout'){
  if(key==='select'&&Number.isInteger(arg)&&arg>=0&&arg<3){s.selected=arg;return true}
  if(key==='begin'){if(s.running)return false;paperHistory(s);s.editingGesture=true;return true}if(key==='end'){s.editingGesture=false;return true}
  if(['move','rotate','scale'].includes(key)){if(s.running)return false;const part=s.parts[s.selected];if(key==='move'&&(!arg||!Number.isFinite(arg.x)||!Number.isFinite(arg.y)))return false;if(key!=='move'&&!Number.isFinite(arg))return false;if(!s.editingGesture)paperHistory(s);if(key==='move'){part.x=clamp(arg.x,70,1050);part.y=clamp(arg.y,110,560)}if(key==='rotate')part.angle=clamp(part.angle+arg,-.7,.7);if(key==='scale')part.scale=clamp(part.scale+arg,.65,1.3);resetWalker(s);s.message='纸片几何已改变，金色端点接通后会成为实际通路。';return true}
  if(key==='undo'){if(s.running||!s.history.length)return false;s.parts=s.history.pop();resetWalker(s);return true}
  if(key==='walk'){resetWalker(s);s.running=true;s.message='纸信使开始试走；没有接通的端点会产生缺口。';s.moves++;return true}
  if(key==='edit'){resetWalker(s);s.message='返回剪纸工作台，作品位置保留。';return true}
 }
 if(s.id==='panorama'){
  if(key==='look'&&arg){s.yaw=wrapAngle(s.yaw+num(arg.x,0));s.pitch=clamp(s.pitch+num(arg.y,0),-.55,.55);return true}
  if(key==='zoom'&&Number.isFinite(arg)){s.zoom=clamp(s.zoom+arg,1,3.5);return true}
  if(key==='measure'){if(s.won||s.measuring>=0)return false;const i=PANORAMA_TARGETS.findIndex((_,i)=>!s.records.some(v=>v.index===i)&&panoramaAligned(s,i));if(i<0){s.message=s.zoom<2.2?'先将望远镜放大到 2.2 倍以上，再让地标标记进入中心准星。':'还未对准待测地标；转动视角，让标记与准星重合。';return false}s.measuring=i;s.stable=0;s.message='正在记录方位，保持准星稳定 1.2 秒。';return true}
 }
 return false;
}
export function stepVoyages(s,dt){
 dt=num(dt,0,0,.08);if(s.won)return;
 if(s.id==='cartographer'&&s.running){
  if(!s.leg){if(!s.route.length){s.running=false;return}const edge=mapEdge(s.current,s.route[0]);if(s.supplies<edge[2]){s.running=false;s.message='补给不足，无法出发。';return}s.supplies-=edge[2];s.leg={from:s.current,to:s.route[0],progress:0}}
  const leg=s.leg,edge=mapEdge(leg.from,leg.to),a=MAP_NODES[leg.from],b=MAP_NODES[leg.to],duration=2+Math.hypot(a.x-b.x,a.y-b.y)/200;leg.progress=Math.min(1,leg.progress+dt/duration);
  if(leg.progress>=1){s.distance+=Math.hypot(a.x-b.x,a.y-b.y);s.current=leg.to;s.route.shift();s.leg=null;if(!s.visited.includes(s.current))s.visited.push(s.current);const n=MAP_NODES[s.current];s.message='已抵达 '+n.name+'。'+(n.clue||'可继续沿计划旅行。');if(n.survey&&!s.observed.includes(s.current)||!s.route.length)s.running=false;if(s.current===0&&s.observed.length===3){s.won=true;s.running=false;s.message='三处观察全部归档，队伍带着完整海岸图返回营地。'}}
 }
 if(s.id==='tendril')s.limbs.forEach((limb,i)=>{const ease=Math.min(1,dt*(limb.holding>=0?6:10)),tip={x:limb.tip.x+(limb.target.x-limb.tip.x)*ease,y:limb.tip.y+(limb.target.y-limb.tip.y)*ease};limb.points=solveLimb(LIMB_ROOTS[i],tip,limb.points);limb.tip={...limb.points.at(-1)};if(limb.holding>=0)Object.assign(s.items[limb.holding],limb.tip)});
 if(s.id==='cutout'&&s.running){
  if(s.fallVelocity>0){s.fallVelocity+=310*dt;s.walker.x+=48*dt;s.walker.y+=s.fallVelocity*dt;if(s.walker.y>690){s.failed=true;s.running=false;s.message='通路在缺口处断开。返回工作台，调整纸桥的端点。'}return}
  if(!s.walkLeg){if(s.node===3){s.won=true;s.running=false;s.message='纸片变成通路，信使已把信送到远岸。';return}const link=paperLinks(s).find(v=>v.valid&&v.nodes.includes(s.node)&&!s.visited.includes(v.nodes.find(n=>n!==s.node)));if(!link){s.fallVelocity=35;s.message='前方还有缺口，信使无法跨过。';return}s.walkLeg={index:link.index,from:s.node,to:link.nodes.find(n=>n!==s.node),progress:0}}
  const leg=s.walkLeg,link=paperLinks(s)[leg.index],side=link.nodes.indexOf(leg.from),a=link.ends[side],b=link.ends[1-side],len=Math.hypot(a.x-b.x,a.y-b.y);leg.progress=Math.min(1,leg.progress+90*dt/len);s.walker={x:a.x+(b.x-a.x)*leg.progress,y:a.y+(b.y-a.y)*leg.progress};if(leg.progress>=1){s.node=leg.to;s.visited.push(s.node);s.walker={...PAPER_ANCHORS[s.node]};s.walkLeg=null}
 }
 if(s.id==='panorama'&&s.measuring>=0){const i=s.measuring;if(!panoramaAligned(s,i)){s.measuring=-1;s.stable=0;s.message='视角离开地标，测量已取消。';return}s.stable+=dt;if(s.stable>=1.2){s.records.push({index:i,bearing:s.yaw,elevation:s.pitch});s.measuring=-1;s.stable=0;s.moves++;s.message='已记录 '+PANORAMA_TARGETS[i].name+'：'+PANORAMA_TARGETS[i].detail;s.won=s.records.length===3;if(s.won)s.message='三处地标方位全部记录，环视海岸的观察页已完成。'}}
}
