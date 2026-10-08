// Lifecycle adapter for production factories, not a browser or CSS renderer.
import fs from 'node:fs';
import path from 'node:path';
import {setMaxListeners} from 'node:events';
import {Canvas,Image as SkiaImage} from 'skia-canvas';
export {Canvas,SkiaImage};
export class NodeDouble{
 constructor(canvas=false){this.style={setProperty(){},removeProperty(){}};this.classes=new Set();this.classList={add:(...k)=>k.forEach(v=>this.classes.add(v)),remove:(...k)=>k.forEach(v=>this.classes.delete(v)),toggle:k=>this.classes.has(k)?this.classes.delete(k):this.classes.add(k)};this.dataset={};this.children=[];this.afterNodes=[];this.nodes=new Map();this.listeners=new Map();this.buttons=[];this.capture=new Set();if(canvas)this.canvas=new Canvas(1120,630)}
 set innerHTML(value){this.html=value;this.buttons=[...value.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].map(m=>{const b=new NodeDouble();for(const a of m[1].matchAll(/data-(command|hold)="([^"]*)"/g))b.dataset[a[1]]=a[2];b.textContent=m[2];return b})}
 get innerHTML(){return this.html||''}
 append(...nodes){this.children.push(...nodes)}after(node){this.afterNodes.push(node)}remove(){this.removed=true}setAttribute(k,v){this[k]=v}setPointerCapture(id){this.capture.add(id)}
 addEventListener(type,fn,options={}){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);if(options.signal){setMaxListeners(100,options.signal);options.signal.addEventListener('abort',()=>this.listeners.get(type)?.delete(fn),{once:true})}}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn)}
 emit(type,args={}){if(this.disabled)return;const e={pointerId:1,clientX:0,clientY:0,preventDefault(){},...args};for(const fn of this.listeners.get(type)||[])fn(e)}
 getContext(){return this.canvas.getContext('2d')}getBoundingClientRect(){return {top:0,left:0,width:1120,height:630}}closest(){return this}
 querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new NodeDouble());return this.nodes.get(k)}querySelectorAll(k){return k==='[data-command]'?this.buttons.filter(b=>'command'in b.dataset):k==='[data-hold]'?this.buttons.filter(b=>'hold'in b.dataset):[]}
 click(){if(!this.disabled)this.onclick?.()}
}
export function installLifecycleDouble(web){globalThis.document={createElement:type=>new NodeDouble(type==='canvas')};globalThis.Image=class extends SkiaImage{set src(url){super.src=fs.readFileSync(path.join(web,url));queueMicrotask(()=>this.onload?.())}get src(){return super.src}};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};}
