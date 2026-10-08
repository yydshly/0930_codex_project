import {clamp} from './world.js';

const cloneHit=hit=>({point:[...hit.point],normal:[...hit.normal]});
export class BrushStroke {
  constructor(hit,radius){this.spacing=radius*.23;this.reset(hit);}
  reset(hit){this.previous=hit?cloneHit(hit):null;this.carry=0;}
  sample(hit){
    if(!hit){this.reset(null);return [];}
    if(!this.previous){this.reset(hit);return [cloneHit(hit)];}
    const before=this.previous,distance=Math.hypot(...hit.point.map((v,i)=>v-before.point[i]));this.previous=cloneHit(hit);
    if(distance<1e-9)return [];
    // Large jumps can represent a ray crossing a gap between separate surfaces.
    if(distance>this.spacing*64){this.reset(hit);return [cloneHit(hit)];}
    const count=Math.floor((distance+this.carry+1e-9)/this.spacing),samples=[];
    for(let i=1;i<=count;i++){
      const t=clamp((i*this.spacing-this.carry)/distance,0,1),normal=before.normal.map((v,j)=>v+(hit.normal[j]-v)*t),length=Math.hypot(...normal);
      samples.push({point:before.point.map((v,j)=>v+(hit.point[j]-v)*t),normal:length>1e-8?normal.map(v=>v/length):[...hit.normal]});
    }
    this.carry=Math.max(0,distance+this.carry-count*this.spacing);
    return samples;
  }
}
export function brushEdits(hits,{op,radius,strength=.65,mirror=false,level}){
  const edits=[],offset=op==='cut'?-.55*radius:op==='add'?.15*radius:0;
  for(const hit of hits){
    const center=hit.point.map((v,i)=>clamp(v+hit.normal[i]*offset,i===0?-5.5:i===1?.05:-4.8,i===0?5.5:i===1?12.6:4.8)),edit={op,center,radius};
    if(['smooth','flatten'].includes(op))edit.strength=strength;
    if(op==='flatten')edit.level=clamp(level??hit.point[1],.05,12.8);
    edits.push(edit);if(mirror&&Math.abs(center[0])>.03)edits.push({...edit,center:[-center[0],center[1],center[2]]});
  }
  return edits;
}
