export const ISLAND_AREAS={
 camp:{name:'探险营地 · 风帆湾',spawn:{x:.1,z:1.7},lands:[{x:0,z:0,rx:5.35,rz:4.45,n:16},{x:7.5,z:.4,rx:1.75,rz:2.0,n:12}],targets:[
  {id:'camp-rope',x:-3.65,z:.75,name:'绳索工具箱',kind:'rope'},
  {id:'camp-lantern',x:-3.35,z:-2.05,name:'探险灯架',kind:'lantern'},
  {id:'camp-herb',x:.15,z:3.4,name:'羽叶草',kind:'herb'},
  {id:'camp-map',x:-.55,z:-.65,name:'营地探险地图',kind:'map'},
  {id:'camp-shelf',x:-1.9,z:-2.6,name:'标本陈列台',kind:'shelf'},
  {id:'camp-anchor',x:3.6,z:.4,name:'断桥锚柱',kind:'anchor'},
  {id:'camp-tower',x:7.7,z:.4,name:'云塔航路',kind:'tower'},
  {id:'camp-depart',x:7.7,z:.4,name:'遗迹航路',kind:'depart'}]},
 ruins:{name:'遗迹岛 · 回声拱门',spawn:{x:0,z:2.75},lands:[{x:0,z:0,rx:4.65,rz:4.25,n:16},{x:6.75,z:.4,rx:2.0,rz:2.55,n:12},{x:-6.65,z:.4,rx:1.9,rz:2.25,n:12}],targets:[
  {id:'ruins-return',x:0,z:3.2,name:'回营地的风帆',kind:'return'},
  {id:'ruins-obelisk',x:-1.45,z:-1.3,name:'留灯人的石碑',kind:'obelisk'},
  {id:'ruins-lamp',x:2.85,z:.4,name:'封印照明槽',kind:'seal'},
  {id:'ruins-crystal',x:-6.55,z:.4,name:'风晶标本',kind:'crystal'},
  {id:'ruins-rubbing',x:6.85,z:.4,name:'星纹拓片',kind:'rubbing'}]},
 tower:{name:'云塔岛 · 归航灯',spawn:{x:0,z:2.7},lands:[{x:0,z:0,rx:4.7,rz:4.0,n:16},{x:-6.7,z:.4,rx:1.9,rz:2.2,n:12},{x:6.7,z:.4,rx:2.0,rz:2.2,n:12}],targets:[
  {id:'tower-return',x:0,z:3.0,name:'回营地的风帆',kind:'return'},
  {id:'tower-note',x:-2.2,z:-1.3,name:'守灯人的留言',kind:'note'},
  {id:'tower-wind',x:-6.55,z:.4,name:'风向校准台',kind:'wind'},
  {id:'tower-star',x:6.55,z:.4,name:'归路星环',kind:'star'},
  {id:'tower-beacon',x:0,z:.2,name:'归航灯开关',kind:'beacon'}]}
};
export function vertices(land){const a=[];for(let i=0;i<land.n;i++){const t=i/land.n*Math.PI*2;a.push([land.x+Math.cos(t)*land.rx,land.z+Math.sin(t)*land.rz])}return a}
function polygonContains(p,x,z){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
export function canWalk(s,x,z){const def=ISLAND_AREAS[s.area];let floor=def.lands.some(l=>polygonContains(vertices({...l,rx:l.rx-.14,rz:l.rz-.14}),x,z));if(s.area==='camp'){if(s.bridgeOpen&&x>=4.2&&x<=6.1&&z>=-.12&&z<=.92)floor=true;if(x>1.5&&x<3.35&&z<-1.45&&z>-3.15)return false;if(x>-.95&&x<.0&&z>-1.02&&z<-.4)return false}else if(s.area==='tower'){if(x>=-5.4&&x<=-4.1&&z>=-.08&&z<=.88)floor=true;if(s.windAligned&&x>=4.2&&x<=5.15&&z>=-.08&&z<=.88)floor=true;if(Math.hypot(x,z+1.65)<1.04)return false;}else{if(x>=-5.35&&x<=-4.15&&z>=-.08&&z<=.88)floor=true;if(s.sealOpen&&x>=4.2&&x<=5.1&&z>=-.08&&z<=.88)floor=true;if(x>1.2&&x<2.15&&z>-2.75&&z<-1.1)return false;if(Math.hypot(x+1.45,z+1.3)<.38)return false}return floor}
// A small navigation grid respects the actual island edges and unlocked bridges.
export function pathTo(s,x,z){const unit=.38,minX=-9.2,minZ=-5.1,w=50,h=29,key=(a,b)=>b*w+a,cell=(x,z)=>[Math.max(0,Math.min(w-1,Math.floor((x-minX)/unit))),Math.max(0,Math.min(h-1,Math.floor((z-minZ)/unit)))],point=(a,b)=>({x:minX+(a+.5)*unit,z:minZ+(b+.5)*unit}),start=cell(s.player.x,s.player.z),queue=[start],seen=new Map([[key(...start),null]]);let best=start,dist=Infinity;for(let i=0;i<queue.length;i++){const a=queue[i],p=point(...a),d=Math.hypot(p.x-x,p.z-z);if(d<dist){dist=d;best=a}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=a[0]+dx,zz=a[1]+dz,k=key(xx,zz),v=point(xx,zz);if(xx<0||zz<0||xx>=w||zz>=h||seen.has(k)||!canWalk(s,v.x,v.z))continue;seen.set(k,a);queue.push([xx,zz])}}const result=[];let at=best;while(at&&key(...at)!==key(...start)){result.push(point(...at));at=seen.get(key(...at))}return {points:result.reverse(),distance:dist}}
export function currentTargets(s){return ISLAND_AREAS[s.area].targets.filter(t=>t.id!=='camp-tower'||s.reported)}
