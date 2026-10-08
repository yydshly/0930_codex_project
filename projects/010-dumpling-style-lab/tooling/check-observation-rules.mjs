import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {SEEK_TARGETS,seekFresh,seekRestore,seekCamera,seekPick,seekHint,seekWorld,seekScreen,createSeek} from '../web/showcase-seek.js';
import {CONDUIT_LEVELS,conduitFresh,conduitSolution,conduitRestore,conduitMask,conduitTrace,conduitRotate,conduitUndo,conduitLaunch,conduitStep,conduitNext,createConduit} from '../web/showcase-conduit.js';
const checks=[];function check(name,run){run();checks.push(name)}
const centre=t=>({x:t.rect[0]+t.rect[2]/2,y:t.rect[1]+t.rect[3]/2});
check('Eight distinct target regions fit actual room coordinates',()=>{assert.equal(SEEK_TARGETS.length,8);assert.equal(new Set(SEEK_TARGETS.map(t=>t.id)).size,8);for(const t of SEEK_TARGETS){const [x,y,w,h]=t.rect;assert(x>=0&&y>=0&&x+w<=1120&&y+h<=630);assert(w>15&&h>15)}});
check('Clicking an object records its identity only once',()=>{const s=seekFresh(),t=SEEK_TARGETS[0];assert.equal(seekPick(s,centre(t)).id,t.id);assert.equal(seekPick(s,centre(t)),null);assert.equal(s.found.length,1)});
check('Empty scenery does not complete an object',()=>{const s=seekFresh();assert.equal(seekPick(s,{x:560,y:40}),null);assert.equal(s.found.length,0)});
check('Every authored hotspot is independently reachable',()=>{for(const t of SEEK_TARGETS){const s=seekFresh();assert.equal(seekPick(s,centre(t))?.id,t.id)}});
check('Finding all eight targets reaches completion',()=>{const s=seekFresh();for(const t of SEEK_TARGETS)seekPick(s,centre(t));assert(s.won);assert.equal(seekPick(s,centre(SEEK_TARGETS[0])),null)});
check('Restore filters duplicates and unknown object identities',()=>{const s=seekRestore({...seekFresh(),found:['teapot','teapot','fake'],won:true});assert.deepEqual(s.found,['teapot']);assert(!s.won)});
check('Restore derives completed state from all actual identities',()=>{assert(seekRestore({...seekFresh(),found:SEEK_TARGETS.map(t=>t.id),won:false}).won)});
check('Malformed camera and hint data restore safely',()=>{const s=seekRestore({version:1,zoom:Infinity,cx:NaN,cy:Infinity,hints:-2,elapsed:Infinity});assert.equal(s.zoom,1);assert.equal(s.cx,560);assert.equal(s.cy,315);assert.equal(s.hints,0);assert.equal(s.elapsed,0)});
check('Zoom coordinate mapping round-trips target position',()=>{const s=seekCamera({...seekFresh(),zoom:2.4,cx:470,cy:410}),p=centre(SEEK_TARGETS[4]),q=seekWorld(s,seekScreen(s,p));assert(Math.abs(p.x-q.x)<1e-8&&Math.abs(p.y-q.y)<1e-8)});
check('Camera never exposes empty pixels at scene edges',()=>{const s=seekCamera({...seekFresh(),zoom:2.4,cx:-999,cy:9999});assert.equal(s.cx,1120/4.8);assert.equal(s.cy,630-630/4.8)});
check('Three hints locate but never auto-find objects',()=>{const s=seekFresh();for(let i=0;i<3;i++)assert(seekHint(s));assert.equal(seekHint(s),null);assert.equal(s.found.length,0);assert.equal(s.hints,0)});
check('Hints skip an already found selected object',()=>{const s=seekFresh();seekPick(s,centre(SEEK_TARGETS[0]));s.selected='teapot';assert.notEqual(seekHint(s).id,'teapot')});
check('Pipe masks rotate coherently and straight rotates by two axes',()=>{assert.deepEqual([0,1,2,3].map(rot=>conduitMask({type:'elbow',rot})),[9,3,6,12]);assert.deepEqual([0,1,2,3].map(rot=>conduitMask({type:'straight',rot})),[10,5,10,5])});
for(let level=0;level<2;level++){
 check('Pipe level '+level+' starts disconnected and has a valid complete route',()=>{const s=conduitFresh(level);assert(!conduitTrace(s).reached);s.tiles=conduitSolution(level);const t=conduitTrace(s);assert(t.reached);assert.equal(t.cells.length,CONDUIT_LEVELS[level].path.length);assert.equal(t.cells[0].entry,3);assert.equal(t.cells.at(-1).exit,1)});
 check('Pipe level '+level+' solves through ordinary rotations',()=>{const s=conduitFresh(level),solution=conduitSolution(level);for(let i=0;i<s.tiles.length;i++)while(s.tiles[i].rot!==solution[i].rot)assert(conduitRotate(s,i));assert(conduitTrace(s).reached);assert(conduitLaunch(s));assert.equal(conduitStep(s,.01),null);let result;for(let i=0;i<1000&&s.phase==='flow';i++)result=conduitStep(s,.025)||result;assert.equal(result,'success');assert.equal(s.phase,level?'won':'cleared')});
}
check('Disconnected pump runs then returns to editable state',()=>{const s=conduitFresh();assert(conduitLaunch(s));assert(!conduitRotate(s));let result;for(let i=0;i<500&&s.phase==='flow';i++)result=conduitStep(s,.025)||result;assert.equal(result,'leak');assert.equal(s.phase,'edit');assert.equal(s.progress,0)});
check('Undo restores the complete previous rotation state and move count',()=>{const s=conduitFresh(),before=structuredClone(s.tiles);conduitRotate(s,3);assert.equal(s.moves,1);assert(conduitUndo(s));assert.deepEqual(s.tiles,before);assert.equal(s.moves,0);assert(!conduitUndo(s))});
check('Invalid tile index never mutates network',()=>{const s=conduitFresh(),before=JSON.stringify(s);assert(!conduitRotate(s,-1));assert(!conduitRotate(s,1000));assert.equal(JSON.stringify(s),before)});
check('Restore rejects forged completion on disconnected pipes',()=>{const s=conduitRestore({...conduitFresh(1),phase:'won',won:true});assert.equal(s.phase,'edit');assert(!s.won)});
check('Restore retains valid completed network and next stage',()=>{const s=conduitFresh(1);s.tiles=conduitSolution(1);s.phase='won';const restored=conduitRestore(s);assert(restored.won);assert.equal(restored.completed,2);const first=conduitFresh();first.tiles=conduitSolution(0);first.phase='cleared';assert.equal(conduitNext(first).level,1);assert.equal(conduitNext(conduitFresh()).level,0)});
check('Restore validates tile types and undo history dimensions',()=>{const raw=conduitFresh();raw.tiles[0].type='unknown';raw.history=[[],[99]];const s=conduitRestore(raw);assert.deepEqual(s.tiles,conduitFresh().tiles);assert.equal(s.history.length,0)});
check('Save round-trip preserves rotations and in-flight progress',()=>{const s=conduitFresh();conduitRotate(s,2);conduitLaunch(s);conduitStep(s,.2);const r=conduitRestore(JSON.parse(JSON.stringify(s)));assert.deepEqual(r.tiles,s.tiles);assert.equal(r.progress,s.progress);assert.equal(r.phase,'flow')});
// Lifecycle doubles exercise real factory timing and draw branches; CUA verifies actual pixels.
const gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,p)=>p in t?t[p]:()=>{}});
class NodeDouble{
 constructor(){this.style={setProperty(){},removeProperty(){}};this.classList={add(){},remove(){},toggle(){}};this.nodes=new Map();this.dataset={};this.children=[]}
 append(...n){this.children.push(...n)}after(){}remove(){}setAttribute(){}addEventListener(){}removeEventListener(){}setPointerCapture(){}
 getContext(){return context}toDataURL(){return 'data:image/png;base64,'}getBoundingClientRect(){return {top:0,left:0,width:1120,height:630}}
 closest(){return this}querySelector(sel){if(!this.nodes.has(sel))this.nodes.set(sel,new NodeDouble());return this.nodes.get(sel)}
 querySelectorAll(sel){return sel==='[data-d]'?[0,1,2,3].map(d=>{const n=new NodeDouble();n.dataset.d=String(d);return n}):[]}
 click(){if(!this.disabled)this.onclick?.()}
}
globalThis.document={createElement:()=>new NodeDouble()};globalThis.Image=class{set src(v){this.width=1672;this.height=941;queueMicrotask(()=>this.onload?.())}};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
for(const [name,factory] of [['seek',createSeek],['conduit',createConduit]]){
 const input={keys:new Set(),pressed:new Set(),pointers:[],x:0,y:0},game=await factory({host:new NodeDouble(),input});
 check(name+' factory tolerates a negative initial RAF delta and absent transient feedback',()=>{game.onStart();const before=game.getState();game.tick(-.001);assert.doesNotThrow(()=>game.draw());assert.deepEqual(game.getState(),before);game.tick(NaN);assert.doesNotThrow(()=>game.draw());assert.deepEqual(game.getState(),before)});
 check(name+' factory pause freezes motion and resume continues real state',()=>{if(name==='conduit')input.pressed.add('KeyE');game.tick(.025);input.pressed.clear();const moving=game.getState();game.setActive(false);game.tick(10);game.draw();assert.deepEqual(game.getState(),moving);game.setActive(true);game.tick(.025);assert.notDeepEqual(game.getState(),moving);game.dispose()});
}
const report={passed:checks.length,checks,limits:'Production rules and lifecycle doubles; actual rendering and gestures are verified separately through CUA.'};fs.writeFileSync(fileURLToPath(new URL('../notes/observation-rules-check-20261004.json',import.meta.url)),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
