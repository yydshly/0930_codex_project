import {FrontierNode,installFrontierDouble,Canvas,SkiaImage} from './frontier-dom-double.mjs';
export {Canvas,SkiaImage};
// Extends the existing lifecycle adapter for native inputs/windows. No CSS/layout engine.
export class HorizonsNode extends FrontierNode{
 constructor(canvas=false,tag='div'){super(canvas);this.tag=tag;this.groups=new Map();this.clientWidth=1120;this.clientHeight=630;this.hidden=false;}
 set innerHTML(value){super.innerHTML=value;this.buttons.forEach(b=>{b.tag='button';b.closest=s=>s==='button'?b:null});
  for(const m of value.matchAll(/<(input|select|form|section|div|span)\b([^>]*)>/g)){const tag=m[1],attrs=m[2],cls=attrs.match(/class="([^"]+)"/)?.[1],n=new HorizonsNode(false,tag);if(cls)for(const k of cls.split(' '))this.nodes.set('.'+k,n);for(const a of attrs.matchAll(/data-([\w-]+)="([^"]+)"/g)){n.dataset[a[1]]=a[2];const key='[data-'+a[1]+']';if(!this.groups.has(key))this.groups.set(key,[]);this.groups.get(key).push(n)} }
  if(value.includes('h-blueprint'))this.groups.set('.h-blueprint span',Array.from({length:25},()=>new HorizonsNode()));
  const submit=this.buttons.find(b=>!b.dataset.command);if(submit)for(const key of ['.h-parser-form','.h-sub-ballast'])if(this.nodes.has(key))this.nodes.get(key).nodes.set('button',submit);
 }
 get innerHTML(){return super.innerHTML}
 querySelector(k){if(k==='canvas')return this.children.find(n=>n.canvas)||null;if(!this.nodes.has(k))this.nodes.set(k,new HorizonsNode(false,k==='button'?'button':'div'));return this.nodes.get(k)}
 querySelectorAll(k){return this.groups.get(k)||super.querySelectorAll(k)}
 focus(){document.activeElement=this}
 closest(k){return k==='button'?this.tag==='button'?this:null:this}
 emit(type,args={}){super.emit(type,{target:this,stopPropagation(){},...args})}
}
export function installHorizonsDouble(web){installFrontierDouble(web);document.createElement=type=>new HorizonsNode(type==='canvas',type);document.activeElement=null;}
