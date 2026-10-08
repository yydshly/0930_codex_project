import {buildWorld,clamp} from './world.js';
import {raycastTerrain} from './voxel.js';

// The broad bounds include rock roughness and its moss cap. The final test uses
// the same triangles as the renderer, including two-sided faces and rotation.
function bounds(object){
  const [x,y,z]=object.position,[sx,sy,sz]=object.scale,a=object.rotation||0,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
  const ex=(sx*c+sz*s)*1.1,ez=(sx*s+sz*c)*1.1,ey=sy*1.1;
  return [[x-ex,y-ey,z-ez],[x+ex,y+Math.max(ey,object.type==='rock'?sy*.7+.105:0),z+ez]];
}
function intersectsBounds(origin,direction,[lo,hi],limit){
  let near=0,far=limit;
  for(let axis=0;axis<3;axis++){
    if(Math.abs(direction[axis])<1e-12){if(origin[axis]<lo[axis]||origin[axis]>hi[axis])return false;continue;}
    const a=(lo[axis]-origin[axis])/direction[axis],b=(hi[axis]-origin[axis])/direction[axis];
    near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return false;
  }
  return true;
}
export function raycastObjectMesh(vertices,origin,direction,limit=70){
  let closest=limit,found=false;
  for(let i=0;i<vertices.length;i+=27){
    const ax=vertices[i],ay=vertices[i+1],az=vertices[i+2];
    const e1x=vertices[i+9]-ax,e1y=vertices[i+10]-ay,e1z=vertices[i+11]-az,e2x=vertices[i+18]-ax,e2y=vertices[i+19]-ay,e2z=vertices[i+20]-az;
    const px=direction[1]*e2z-direction[2]*e2y,py=direction[2]*e2x-direction[0]*e2z,pz=direction[0]*e2y-direction[1]*e2x,det=e1x*px+e1y*py+e1z*pz;
    if(Math.abs(det)<1e-10)continue;
    const tx=origin[0]-ax,ty=origin[1]-ay,tz=origin[2]-az,u=(tx*px+ty*py+tz*pz)/det;
    if(u<0||u>1)continue;
    const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x,v=(direction[0]*qx+direction[1]*qy+direction[2]*qz)/det;
    if(v<0||u+v>1)continue;
    const t=(e2x*qx+e2y*qy+e2z*qz)/det;
    if(t>=0&&t<=closest){closest=t;found=true;}
  }
  return found?closest:null;
}
export class ObjectPicker {
  constructor(){this.entries=new Map();}
  pick(objects,origin,direction,field=null,limit=70){
    if(!objects.length){this.entries.clear();return null;}
    const length=Math.hypot(...direction);if(length<1e-12)return null;
    direction=direction.map(v=>v/length);
    if(field){const terrain=raycastTerrain(field,origin,direction,limit);if(terrain)limit=Math.min(limit,Math.hypot(...terrain.point.map((v,i)=>v-origin[i]))+.01);}
    const live=new Set(objects.map(o=>o.id));for(const id of this.entries.keys())if(!live.has(id))this.entries.delete(id);
    let best=null;
    objects.forEach((object,index)=>{
      if(!intersectsBounds(origin,direction,bounds(object),limit))return;
      const key=JSON.stringify([object.type,object.position,object.scale,object.rotation||0]);let entry=this.entries.get(object.id);
      if(entry?.key!==key){entry={key,vertices:buildWorld(0,'summer',[object],true)};this.entries.set(object.id,entry);}
      const distance=raycastObjectMesh(entry.vertices,origin,direction,limit);
      if(distance!==null&&(best===null||distance<best.distance)){best={index,distance,point:origin.map((v,i)=>v+direction[i]*distance)};limit=distance;}
    });
    return best;
  }
}

export const OBJECT_BOUNDS=[[-5.3,5.3],[.12,12.4],[-4.5,4.5]];
export class ObjectDrag {
  constructor(position,point,clientY,axis='plane',bounds=OBJECT_BOUNDS){
    this.bounds=bounds;this.position=[...position];this.rebase(point,clientY,axis);
  }
  rebase(point,clientY,axis){this.base=[...this.position];this.anchor=point?[...point]:null;this.clientY=clientY;this.axis=axis;}
  update(point,clientY,axis=this.axis,step=0){
    if(axis!==this.axis){this.rebase(point,clientY,axis);return [...this.position];}
    if(axis!=='y'&&!point){this.rebase(null,clientY,axis);return [...this.position];}
    if(axis!=='y'&&!this.anchor){this.rebase(point,clientY,axis);return [...this.position];}
    const delta=axis==='y'?[0,(this.clientY-clientY)*.018,0]:[point[0]-this.anchor[0],0,point[2]-this.anchor[2]];
    const axes=axis==='x'?[0]:axis==='z'?[2]:axis==='y'?[1]:[0,2];
    this.position=[...this.base];for(const i of axes){const move=step>0?Math.round(delta[i]/step)*step:delta[i];if(Math.abs(move)>1e-8)this.position[i]=clamp(this.base[i]+move,...this.bounds[i]);}
    return [...this.position];
  }
}
export function mirrorObject(object,id){const copy=structuredClone(object);copy.id=id;copy.position[0]=-copy.position[0];copy.rotation=-(copy.rotation||0);return copy;}
export function mirrorSource(source){const copy=structuredClone(source);copy.position[0]=-copy.position[0];copy.yaw=-copy.yaw;return copy;}

export class ObjectSelection {
  constructor(){this.ids=new Set();this.active=null;}
  clear(){this.ids.clear();this.active=null;}
  replace(objects,indices,active=indices.at(-1)){
    this.ids=new Set(indices.filter(i=>objects[i]).map(i=>objects[i].id));this.active=objects[active]?.id??null;this.prune(objects);
  }
  choose(objects,index,additive=false){
    const object=objects[index];if(!object){if(!additive)this.clear();return;}
    if(!additive)this.replace(objects,[index],index);
    else{this.ids.has(object.id)?this.ids.delete(object.id):this.ids.add(object.id);this.active=object.id;this.prune(objects);}
  }
  prune(objects){const live=new Set(objects.map(o=>o.id));for(const id of this.ids)if(!live.has(id))this.ids.delete(id);if(!this.ids.has(this.active))this.active=[...this.ids].at(-1)??null;}
  indices(objects){this.prune(objects);return objects.flatMap((o,i)=>this.ids.has(o.id)?[i]:[]);}
  primary(objects){this.prune(objects);const index=objects.findIndex(o=>o.id===this.active);return index<0?null:index;}
}
// Use a single translation for the whole group. Bounds permit the existing
// position of imported objects, while preventing them from moving farther out.
export function groupMoveRange(positions){if(!positions.length)return [[0,0],[0,0],[0,0]];return OBJECT_BOUNDS.map(([lo,hi],axis)=>[Math.max(...positions.map(p=>Math.min(lo,p[axis])-p[axis])),Math.min(...positions.map(p=>Math.max(hi,p[axis])-p[axis]))]);}
export class ObjectGroupDrag extends ObjectDrag {
  constructor(positions,point,clientY,axis='plane',primary=0){
    const pivot=positions[primary],range=groupMoveRange(positions);super(pivot,point,clientY,axis,range.map(([lo,hi],i)=>[pivot[i]+lo,pivot[i]+hi]));
    this.original=positions.map(p=>[...p]);this.pivot=[...pivot];
  }
  update(...args){const position=super.update(...args);return this.original.map(p=>p.map((v,i)=>v+(position[i]-this.pivot[i])));}
}
export function copyObjects(objects,indices,makeId,mirrored=false){
  const picked=indices.map(i=>objects[i]),range=groupMoveRange(picked.map(o=>o.position));
  let offset=[.45,0,0].map((v,i)=>clamp(v,...range[i]));
  if(offset[0]<.1)offset=[-.45,0,0].map((v,i)=>clamp(v,...range[i]));
  if(Math.abs(offset[0])<.1)offset=[0,0,.45].map((v,i)=>clamp(v,...range[i]));
  return picked.map(o=>{if(mirrored)return mirrorObject(o,makeId());const copy=structuredClone(o);copy.id=makeId();copy.position=copy.position.map((v,i)=>v+offset[i]);return copy;});
}
export function selectionBounds(objects,indices){
  if(!indices.length)return null;
  const boxes=indices.map(i=>bounds(objects[i])),lo=[0,1,2].map(i=>Math.min(...boxes.map(b=>b[0][i]))),hi=[0,1,2].map(i=>Math.max(...boxes.map(b=>b[1][i])));
  return {center:lo.map((v,i)=>(v+hi[i])/2),radius:Math.hypot(...lo.map((v,i)=>(hi[i]-v)/2))};
}
