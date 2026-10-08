import {sourceDirection} from './sources.js';
import {DX,GRID} from './world.js';
import {sampleField} from './voxel.js';

export function aimJet(source,target,gravity){
  const [x,y,z]=target.map((v,i)=>v-source.position[i]),range=Math.hypot(x,z),speed=source.speed;
  if(!(speed>0)||!(gravity>0)||!target.every(Number.isFinite))return null;
  if(range<1e-5)return y<-.001?{yaw:source.yaw,pitch:-90}:null;
  const v2=speed*speed,discriminant=v2*v2-gravity*(gravity*range*range+2*y*v2);
  if(discriminant<0)return null;
  const tangent=(gravity*range*range+2*y*v2)/(range*(v2+Math.sqrt(discriminant)));
  const pitch=Math.atan(tangent)*180/Math.PI;
  if(pitch>75||pitch<-90)return null;
  return {yaw:Math.atan2(x,z)*180/Math.PI,pitch};
}

export function traceJet(source,gravity,field){
  const points=[[...source.position]],inside=p=>p[0]>-GRID[0]*DX/2+DX&&p[0]<GRID[0]*DX/2-DX&&p[1]>.05&&p[1]<(GRID[1]-2)*DX&&p[2]>-GRID[2]*DX/2+DX&&p[2]<GRID[2]*DX/2-DX;
  if(!source.enabled||source.power<=0)return {points:[],impact:null,reason:'off'};
  if(!inside(source.position))return {points,impact:null,reason:'outside'};
  if(sampleField(field,source.position)<=0)return {points,impact:null,reason:'blocked'};
  const velocity=sourceDirection(source).map(v=>v*source.speed);
  for(let step=1;step<=100;step++){
    const t=step*.04,next=source.position.map((v,i)=>v+velocity[i]*t-(i===1?.5*gravity*t*t:0));
    const previous=points.at(-1),segments=Math.max(1,Math.ceil(Math.hypot(...next.map((v,i)=>v-previous[i]))/(DX*.4)));
    for(let j=1;j<=segments;j++){
      const p=previous.map((v,i)=>v+(next[i]-v)*j/segments);
      if(!inside(p))return {points,impact:null,reason:'outside'};
      if(sampleField(field,p)<=0){
        let a=previous.map((v,i)=>v+(next[i]-v)*(j-1)/segments),b=p;
        for(let k=0;k<8;k++){const m=a.map((v,i)=>(v+b[i])*.5);if(sampleField(field,m)>0)a=m;else b=m;}
        const impact=a.map((v,i)=>(v+b[i])*.5);points.push(impact);return {points,impact,reason:'hit'};
      }
    }
    points.push(next);
  }
  return {points,impact:null,reason:'open'};
}
