import {HorizonsNode,installHorizonsDouble,Canvas,SkiaImage} from './horizons-dom-double.mjs';
export {Canvas,SkiaImage};
export class VoyagesNode extends HorizonsNode{
 set innerHTML(value){super.innerHTML=value;for(const m of value.matchAll(/<p\b([^>]*)>/g)){const attrs=m[1],n=new VoyagesNode(),cls=attrs.match(/class="([^"]+)"/)?.[1];if(cls)for(const k of cls.split(' '))this.nodes.set('.'+k,n);for(const a of attrs.matchAll(/data-([\w-]+)="([^"]+)"/g)){n.dataset[a[1]]=a[2];const key='[data-'+a[1]+']';if(!this.groups.has(key))this.groups.set(key,[]);this.groups.get(key).push(n)}}}
 get innerHTML(){return super.innerHTML}
 getContext(type){if(type&&type!=='2d')return null;const ctx=super.getContext();if(!ctx.voyagesWrapped){const draw=ctx.drawImage.bind(ctx);ctx.drawImage=(source,...args)=>draw(source.canvas||source,...args);ctx.voyagesWrapped=true}return ctx}
 querySelector(k){if(k==='canvas')return this.children.find(n=>n.canvas&&!n.removed)||null;return super.querySelector(k)}
 hasPointerCapture(id){return this.pointerId===id}
 setPointerCapture(id){this.pointerId=id}
 releasePointerCapture(id){if(this.pointerId===id)this.pointerId=null}
}
export function installVoyagesDouble(web){installHorizonsDouble(web);document.createElement=type=>new VoyagesNode(type==='canvas',type);}
