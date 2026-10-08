// Render the production draw() methods through Skia. This is not browser QA.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Canvas,Image as SkiaImage} from 'file:///C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/node_modules/skia-canvas/lib/index.mjs';
import {createBubble} from '../web/showcase-bubble.js';
import {createSonar} from '../web/showcase-sonar.js';
const P=fileURLToPath(new URL('../',import.meta.url)),web=path.join(P,'web'),out=path.join(P,'assets/game-forms/logic-qa');fs.mkdirSync(out,{recursive:true});
class NodeDouble{
 constructor(canvas=false){this.style={setProperty(){},removeProperty(){}};this.classList={add(){},remove(){},toggle(){}};this.dataset={};this.children=[];this.nodes=new Map();this.listeners=new Map();if(canvas)this.canvas=new Canvas(1120,630)}
 append(...nodes){this.children.push(...nodes)}after(){}remove(){}setAttribute(){}addEventListener(k,fn){this.listeners.set(k,fn)}removeEventListener(k){this.listeners.delete(k)}getContext(){return this.canvas.getContext('2d')}getBoundingClientRect(){return {top:0,left:0,width:1120,height:630}}closest(){return this}querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new NodeDouble());return this.nodes.get(k)}querySelectorAll(k){return k==='[data-dir]'?['left','up','down','right'].map(d=>{const n=new NodeDouble();n.dataset.dir=d;return n}):[]}click(){if(!this.disabled)this.onclick?.()}
}
globalThis.document={createElement:type=>new NodeDouble(type==='canvas')};
globalThis.Image=class extends SkiaImage{set src(url){super.src=fs.readFileSync(path.join(web,url));queueMicrotask(()=>this.onload?.())}get src(){return super.src}};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const results=[];
for(const [name,factory] of [['bubble',createBubble],['sonar',createSonar]]){const host=new NodeDouble(),input={x:0,y:0,pressed:new Set()},game=await factory({host,input});game.draw();const canvas=host.children[0].canvas;await canvas.toFile(path.join(out,name+'-initial.png'));game.onStart();game.tick(-.01);game.tick(NaN);game.draw();if(name==='sonar'){input.pressed.add('Space');game.tick(.025);input.pressed.clear();game.draw();await canvas.toFile(path.join(out,name+'-progress.png'))}game.setActive(false);const before=JSON.stringify(game.getState());game.tick(100);game.draw();if(JSON.stringify(game.getState())!==before)throw new Error('Pause changed '+name);results.push({name,state:game.getState(),status:game.getStatus(),render:'Actual production draw method, Skia canvas; DOM lifecycle double, not browser screenshot.'});game.dispose()}
const pair=new Canvas(1280,435),ctx=pair.getContext('2d');ctx.fillStyle='#0a1722';ctx.fillRect(0,0,1280,435);ctx.fillStyle='#eaddbd';ctx.font='600 23px "Microsoft YaHei",sans-serif';ctx.fillText('琉璃穹顶 · 泡泡发射消除',28,38);ctx.fillText('深海测绘 · 数字线索排雷',666,38);ctx.font='13px "Microsoft YaHei",sans-serif';ctx.fillStyle='#a4c6c2';ctx.fillText('瞄准 / 侧壁反弹 / 三颗连通 / 悬空掉落',28,65);ctx.fillText('首击安全 / 八邻格数字 / 标记 / 线索解释',666,65);for(const [n,name]of ['bubble','sonar'].entries()){const im=new SkiaImage();im.src=fs.readFileSync(path.join(out,name+'-initial.png'));ctx.drawImage(im,28+n*638,83,610,343)}await pair.toFile(path.join(out,'production-scenes.png'));
fs.writeFileSync(path.join(out,'render-review.json'),JSON.stringify({results,browserVerified:false,blocker:'CUA node kernel cannot start: windows sandbox setup refresh had errors.'},null,2));console.log('Production scenes rendered; pause/invalid timing checked. Browser QA remains unavailable.');

