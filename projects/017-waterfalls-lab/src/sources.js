import {DX,GRID} from './world.js';

export const DEFAULT_SOURCE_CONFIG={enabled:true,power:1,radius:.45,yaw:0,pitch:-17,speed:1.96};
export function allSources(scene){return [{...DEFAULT_SOURCE_CONFIG,...scene.sourceConfig,position:scene.source},...(scene.extraSources||[])];}
export function changeSource(scene,index,patch){
  if(index===0){if(patch.position)scene.source=[...patch.position];const {position,...config}=patch;scene.sourceConfig={...DEFAULT_SOURCE_CONFIG,...scene.sourceConfig,...config};}
  else Object.assign(scene.extraSources[index-1],patch);
}
export function sourceDirection(source){const yaw=source.yaw*Math.PI/180,pitch=source.pitch*Math.PI/180;return [Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];}
export function packSources(scene){
  const sources=allSources(scene),total=sources.reduce((sum,s)=>sum+(s.enabled?s.power:0),0),data=new Float32Array(Math.max(1,sources.length)*8);let cumulative=0;
  sources.forEach((s,i)=>{cumulative+=s.enabled?s.power:0;const velocity=sourceDirection(s).map(v=>v*s.speed/(120*DX));data.set([s.position[0]/DX+GRID[0]/2,s.position[1]/DX,s.position[2]/DX+GRID[2]/2,total?cumulative/total:0,...velocity,s.radius/DX],i*8);});
  return {data,count:sources.length,total:total*scene.flow};
}
export class SourceUploadCache {
  update(scene,force=false){
    const key=JSON.stringify(allSources(scene));
    if(force||key!==this.key){const packed=packSources({...scene,flow:1});this.power=packed.total;this.result={...packed,changed:true};this.key=key;}
    else this.result.changed=false;
    this.result.total=this.power*scene.flow;
    return this.result;
  }
}
