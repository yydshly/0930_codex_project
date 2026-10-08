// Shared, DOM-free world-XZ geometry for imported pond bindings and fish constraints.
const EPS=1e-8,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
const same=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<EPS;
export function polygonArea(polygon){return polygon.reduce((sum,a,i)=>{const b=polygon[(i+1)%polygon.length];return sum+a.x*b.z-b.x*a.z;},0)*.5;}
function onSegment(a,b,p){return Math.abs(cross(a,b,p))<EPS&&p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.z>=Math.min(a.z,b.z)-EPS&&p.z<=Math.max(a.z,b.z)+EPS;}
function intersects(a,b,c,d){const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
 return ab1*ab2<0&&cd1*cd2<0||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);}
export function pointInPolygon(polygon,x,z){let inside=false;const p={x,z};
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[j],b=polygon[i];if(onSegment(a,b,p))return true;
  if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}
 return inside;
}
export function signedPolygonDistance(polygon,x,z){let best=Infinity,qx=0,qz=0,edgeNX=0,edgeNZ=0;const orientation=Math.sign(polygonArea(polygon))||1;
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(len*len),0,1),px=a.x+dx*t,pz=a.z+dz*t,d2=(px-x)**2+(pz-z)**2;
  if(d2<best){best=d2;qx=px;qz=pz;edgeNX=orientation*dz/len;edgeNZ=-orientation*dx/len;}}
 const d=Math.sqrt(best),sign=pointInPolygon(polygon,x,z)?-1:1;
 return d>EPS?{distance:sign*d,nx:(x-qx)*sign/d,nz:(z-qz)*sign/d}:{distance:0,nx:edgeNX,nz:edgeNZ};
}
export function validateHabitat(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('无效的池塘绑定参数');
 const finite=(v,min,max,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error('无效的'+label);return v;};
 if(!Array.isArray(input.polygon))throw new Error('池塘边界需要3到32个顶点');
 let polygon=input.polygon.map(p=>({x:finite(p?.x,-100,100,'边界X'),z:finite(p?.z,-100,100,'边界Z')}));
 if(polygon.length>3&&same(polygon[0],polygon.at(-1)))polygon=polygon.slice(0,-1);
 if(polygon.length<3||polygon.length>32)throw new Error('池塘边界需要3到32个顶点');
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];if(same(a,b))throw new Error('池塘边界有重复顶点');
  for(let j=i+1;j<polygon.length;j++){if(j===i+1||i===0&&j===polygon.length-1)continue;
   if(intersects(a,b,polygon[j],polygon[(j+1)%polygon.length]))throw new Error('池塘边界不能自交或接触自身');}}
 if(Math.abs(polygonArea(polygon))<.001)throw new Error('池塘边界需要有效面积');
 const waterLevel=finite(input.waterLevel,-10,10,'水位'),depth=finite(input.depth,.2,3,'水深');
 const feedPoint={x:finite(input.feedPoint?.x,-100,100,'投喂点X'),y:waterLevel,z:finite(input.feedPoint?.z,-100,100,'投喂点Z')};
 if(!pointInPolygon(polygon,feedPoint.x,feedPoint.z))throw new Error('投喂点必须位于池塘内');
 if(input.obstacles!==undefined&&!Array.isArray(input.obstacles))throw new Error('障碍物须为数组');
 if((input.obstacles?.length||0)>16)throw new Error('障碍物最多16个');
 const obstacles=(input.obstacles||[]).map(o=>({x:finite(o?.x,-100,100,'障碍X'),z:finite(o?.z,-100,100,'障碍Z'),radius:finite(o?.radius,.05,2,'障碍半径')}));
 if(obstacles.some(o=>Math.hypot(o.x-feedPoint.x,o.z-feedPoint.z)<=o.radius))throw new Error('投喂点不能位于障碍物内');
 return {polygon,waterLevel,depth,feedPoint,obstacles};
}
export function habitatClearance(habitat,x,z){let distance=-signedPolygonDistance(habitat.polygon,x,z).distance;
 for(const o of habitat.obstacles||[])distance=Math.min(distance,Math.hypot(x-o.x,z-o.z)-o.radius);return distance;}
export function projectIntoHabitat(habitat,point,clearance=0){let x=point.x,z=point.z;
 // Alternating projections handle a bank obstacle without pushing the final point back into the bank.
 for(let step=0;step<24;step++){const shore=signedPolygonDistance(habitat.polygon,x,z);if(shore.distance>-clearance){const k=shore.distance+clearance;x-=shore.nx*k;z-=shore.nz*k;}
  for(const [i,o]of (habitat.obstacles||[]).entries()){let dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz),radius=o.radius+clearance;
   if(d<radius){if(d<EPS){const a=(i+1)*2.399963229728653;dx=Math.cos(a);dz=Math.sin(a);d=1;}x=o.x+dx/d*radius;z=o.z+dz/d*radius;}}
  if(habitatClearance(habitat,x,z)>=clearance-1e-6)return {x,z};
 }
 // At opposed bank/cylinder normals, projections can stall. Pick the closest feasible sample.
 const xs=habitat.polygon.map(p=>p.x),zs=habitat.polygon.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);let nearest=null,best=Infinity;
 for(let zi=0;zi<25;zi++)for(let xi=0;xi<25;xi++){const px=minX+(xi+.5)/25*(maxX-minX),pz=minZ+(zi+.5)/25*(maxZ-minZ),d=(px-point.x)**2+(pz-point.z)**2;
  if(d<best&&habitatClearance(habitat,px,pz)>=clearance){nearest={x:px,z:pz};best=d;}}
 return nearest||{x,z};
}
export function sampleHabitatSpawn(habitat,index,size){const xs=habitat.polygon.map(p=>p.x),zs=habitat.polygon.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),clearance=size*.40+.015,candidates=[];
 // Deterministic grid sampling works for concave polygons, unlike an averaged centroid.
 for(let zi=0;zi<25;zi++)for(let xi=0;xi<25;xi++){const x=minX+(xi+.5)/25*(maxX-minX),z=minZ+(zi+.5)/25*(maxZ-minZ),margin=habitatClearance(habitat,x,z);
  if(margin>=clearance)candidates.push({x,z,margin});}
 if(!candidates.length)throw new Error('池塘可游区域过小，或障碍物占满了鱼体所需空间');
 const p=candidates[Math.floor(((index*.6180339887498949+.27)%1)*candidates.length)];return {x:p.x,y:habitat.waterLevel-Math.min(.24,habitat.depth*.45),z:p.z};
}
