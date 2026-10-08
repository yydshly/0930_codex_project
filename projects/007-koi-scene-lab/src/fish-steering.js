/*! Steering adapted from Koi Pond Garden, ©2026 Sourany Phomhome.
 * MIT: web/upstream/KOI-LICENSE.txt. Fixed upstream: 18213ec590e987f605cce6564471e6c0f9451d37.
 * Snapshot updates, polygon shoreline queries and bounded Jacobi collision resolution are local adaptations. */
import {pondBoundary} from './config.js';
import {signedPolygonDistance} from './habitat-geometry.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

// Read from one immutable frame snapshot: steering must not depend on fish update order.
export function schoolSnapshot(fish){return fish.map((f,i)=>({id:f.id??i,x:f.group.position.x,y:f.group.position.y,z:f.group.position.z,
 heading:f.heading,size:f.group.scale.x,speed:f.speed,pitch:f.pitch||0}));}
export function boidsForces(snapshot,index,feeding=0){const f=snapshot[index];let sx=0,sz=0,ax=0,az=0,cx=0,cz=0,neighbors=0;
 for(let j=0;j<snapshot.length;j++){if(j===index)continue;const o=snapshot[j],dx=o.x-f.x,dz=o.z-f.z,d2=dx*dx+dz*dz;if(d2>2.6)continue;
  const d=Math.sqrt(d2),sepRadius=(f.size+o.size)*.62*(1-.45*feeding);
  if(d<sepRadius&&Math.abs(o.y-f.y)<.3){let nx,nz;
   if(d>1e-5){nx=dx/d;nz=dz/d;}else{const a=(Math.min(f.id,o.id)+1)*2.399963229728653,s=f.id<o.id?1:-1;nx=Math.cos(a)*s;nz=Math.sin(a)*s;}
   const k=(sepRadius-d)/sepRadius;sx-=nx*k;sz-=nz*k;}
  ax+=Math.cos(o.heading);az-=Math.sin(o.heading);cx+=dx;cz+=dz;neighbors++;
 }
 if(neighbors){ax/=neighbors;az/=neighbors;cx/=neighbors;cz/=neighbors;}
 return {separation:{x:sx,z:sz},alignment:{x:ax,z:az},cohesion:{x:cx,z:cz},neighbors};
}

export function createShoreline(scale=1,samples=128){const vertices=[];
 for(let i=0;i<samples;i++){const p=pondBoundary(i/samples*Math.PI*2,scale);vertices.push({x:-.5+(p.x+.5)*.98,z:-.15+(p.z+.15)*.98});}
 return {scale,vertices};
}
// Polygon distance is in scene metres. Its gradient points toward the nearest shore from inside.
export function signedShoreDistance(shore,x,z){let inside=false,best=Infinity,qx=0,qz=0;
 if(shore.habitat)return signedPolygonDistance(shore.vertices,x,z);
 const v=shore.vertices;for(let i=0,j=v.length-1;i<v.length;j=i++){
  const a=v[j],b=v[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+dx*t,pz=a.z+dz*t,d2=(px-x)**2+(pz-z)**2;
  if(d2<best){best=d2;qx=px;qz=pz;}
  if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }
 const d=Math.sqrt(best),sign=inside?-1:1;
 if(d>1e-8)return {distance:sign*d,nx:(x-qx)*sign/d,nz:(z-qz)*sign/d};
 // A finite difference at an exact vertex would be ambiguous; outward radial normal is stable.
 const r=Math.hypot(x+.5,z+.15)||1;return {distance:0,nx:(x+.5)/r,nz:(z+.15)/r};
}
export function shorelineSteering(shore,f,clearance=.48){const look=.34+Math.max(0,f.speed)*1.5,
 lx=f.x+Math.cos(f.heading)*look,lz=f.z-Math.sin(f.heading)*look,q=signedShoreDistance(shore,lx,lz),strength=Math.max(0,q.distance+clearance)*6;
 return {x:-q.nx*strength,z:-q.nz*strength,distance:q.distance,look};
}
export function turnStep(heading,rate,bearing,dt,{maxRate=1.8,acceleration=2.5,gain=1.4}={}){
 // When a mode lowers its rate limit, decelerate toward it rather than discontinuously clipping momentum.
 const desired=clamp(angleDelta(bearing,heading)*gain,-maxRate,maxRate),next=rate+clamp(desired-rate,-acceleration*dt,acceleration*dt);
 return {heading:heading+next*dt,rate:next};
}

const spine=[.30,0,-.30];
function sphere(f,u){const cp=Math.cos(f.pitch||0),sp=Math.sin(f.pitch||0),offset=u*f.size;
 return {x:f.x+Math.cos(f.heading)*cp*offset,y:f.y+sp*offset,z:f.z-Math.sin(f.heading)*cp*offset};}
export function bodySpheres(f){return spine.map(u=>({...sphere(f,u),radius:f.size*.1}));}
export function obstacleSteering(f,obstacles){let x=0,z=0;const look=.30+Math.max(0,f.speed)*1.4,lx=f.x+Math.cos(f.heading)*look,lz=f.z-Math.sin(f.heading)*look;
 for(const [i,o]of obstacles.entries()){let dx=lx-o.x,dz=lz-o.z,d=Math.hypot(dx,dz),range=o.radius+f.size*.35+.30;if(d>=range)continue;
  if(d<1e-7){const angle=(i+1)*2.399963229728653;dx=Math.cos(angle);dz=Math.sin(angle);d=1;}
  const k=(range-Math.hypot(lx-o.x,lz-o.z))*7;x+=dx/d*k;z+=dz/d*k;}
 return {x,z};
}
export function bodyOverlap(a,b){let deepest=0;const radius=(a.size+b.size)*.1;
 for(const u of spine)for(const w of spine){const p=sphere(a,u),q=sphere(b,w);deepest=Math.max(deepest,radius-Math.hypot(q.x-p.x,(q.y-p.y)*1.15,q.z-p.z));}
 return Math.max(0,deepest);
}
// Apply equal/opposite pair impulses simultaneously. A crowded cluster cannot receive unbounded pushes.
export function resolveBodies(fish,{iterations=3,maxCorrection=.018}={}){let contacts=0,maxOverlap=0;
 for(let step=0;step<iterations;step++){const pushes=fish.map(()=>({x:0,y:0,z:0}));
  for(let i=0;i<fish.length;i++)for(let j=i+1;j<fish.length;j++){const a=fish[i],b=fish[j],radius=(a.size+b.size)*.1;
   if(Math.hypot(a.x-b.x,a.z-b.z)>(a.size+b.size)*.55)continue;
   let px=0,py=0,pz=0,count=0;
   for(const u of spine)for(const w of spine){const p=sphere(a,u),q=sphere(b,w);let dx=q.x-p.x,dy=(q.y-p.y)*1.15,dz=q.z-p.z,d=Math.hypot(dx,dy,dz);
    if(d>=radius)continue;if(d<1e-6){const angle=(Math.min(a.id,b.id)+1)*2.399963229728653,s=a.id<b.id?1:-1;dx=Math.cos(angle)*s;dy=0;dz=Math.sin(angle)*s;d=1;}
    const penetration=radius-(Math.hypot(q.x-p.x,(q.y-p.y)*1.15,q.z-p.z)),k=penetration*.5/d;
    px+=dx*k;py+=dy*k*.22;pz+=dz*k;count++;maxOverlap=Math.max(maxOverlap,penetration);
   }
   if(!count)continue;contacts++;const magnitude=Math.hypot(px,py,pz),limit=Math.min(1,maxCorrection/Math.max(magnitude,1e-8));px*=limit;py*=limit;pz*=limit;
   pushes[i].x-=px;pushes[i].y-=py;pushes[i].z-=pz;pushes[j].x+=px;pushes[j].y+=py;pushes[j].z+=pz;
  }
  // One shared scale preserves the centre of mass even in a tightly packed many-fish cluster.
  const largest=pushes.reduce((m,p)=>Math.max(m,Math.hypot(p.x,p.y,p.z)),0),scale=Math.min(1,maxCorrection/Math.max(largest,1e-8));
  for(let i=0;i<fish.length;i++){fish[i].x+=pushes[i].x*scale;fish[i].y+=pushes[i].y*scale;fish[i].z+=pushes[i].z*scale;}
 }
 return {contacts,maxOverlap};
}
