import {buildWorld,objectMeshSize} from './world.js';

// Keep the original per-face random stream: rebuilding a later object must
// produce the same colors as rebuilding the entire object list.
export class ObjectMeshCache {
  update(objects,selection=null){
    const selected=new Set(Array.isArray(selection)?selection:[selection]);
    const layoutKey=JSON.stringify(objects.map(o=>[o.id,o.type]));
    const keys=objects.map((o,i)=>JSON.stringify([o.position,o.scale,o.rotation||0,selected.has(i)]));
    if(layoutKey!==this.layoutKey){
      let seed=811,offset=0;
      this.entries=objects.map(o=>{const {floats,randomCalls}=objectMeshSize(o),entry={seed,offset};offset+=floats;for(let j=0;j<randomCalls;j++)seed=(Math.imul(seed,1664525)+1013904223)>>>0;return entry;});
      this.floatLength=offset;this.layoutKey=layoutKey;this.keys=keys;
      return {rebuilt:true,changed:true,data:buildWorld(0,'summer',objects.map((o,i)=>({...o,selected:selected.has(i)})),true),patches:[]};
    }
    const groups=[];
    objects.forEach((o,i)=>{if(keys[i]!==this.keys[i]){const {offset,seed}=this.entries[i],data=buildWorld(0,'summer',[{...o,selected:selected.has(i)}],true,null,seed),last=groups.at(-1);if(last&&last.offset+last.length===offset){last.parts.push(data);last.length+=data.length;}else groups.push({offset,length:data.length,parts:[data]});}});
    const patches=groups.map(({offset,length,parts})=>{if(parts.length===1)return {offset,data:parts[0]};const data=new Float32Array(length);let cursor=0;for(const part of parts){data.set(part,cursor);cursor+=part.length;}return {offset,data};});
    this.keys=keys;
    return {rebuilt:false,changed:patches.length>0,patches};
  }
}
