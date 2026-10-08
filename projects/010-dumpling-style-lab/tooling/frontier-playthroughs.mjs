import assert from 'node:assert/strict';
import {freshFrontier,commandFrontier as cmd,stepFrontier as tick,TEMPO_TARGETS,COIL_POSTS,ECHO_BEACONS} from '../web/showcase-frontier-rules.js';
export const snapshots={};
const snap=(s,key)=>{(snapshots[s.id]??={})[key]=structuredClone(s)};
const advance=(s,seconds,drive={})=>{for(let t=0;t<seconds;t+=.05)tick(s,.05,drive)};
const gotoFlat=(s,p)=>{for(let i=0;i<2000&&Math.hypot(s.p.x-p.x,s.p.y-p.y)>5;i++){const dx=p.x-s.p.x,dy=p.y-s.p.y,scale=Math.max(Math.abs(dx),Math.abs(dy),1);tick(s,.03,{x:dx/scale,y:dy/scale})}};
const angleError=(target,yaw)=>{let e=target-yaw;while(e>Math.PI)e-=Math.PI*2;while(e< -Math.PI)e+=Math.PI*2;return e;};
function navigate(s,target,body=false){for(let i=0;i<3000;i++){const p=body?s.head:s.p,dx=target.x-p.x,dz=target.z-p.z;if(s.won||Math.hypot(dx,dz)<.18)return;const e=angleError(Math.atan2(dx,-dz),s.yaw);tick(s,.04,{x:Math.abs(e)>.025?Math.sign(e)*Math.min(1,Math.abs(e)*2):0,y:Math.abs(e)<.3?-1:0});}throw Error('navigation did not arrive: '+s.id)}
export function playthroughs(){
 let s=freshFrontier('tempo');snap(s,'initial');gotoFlat(s,TEMPO_TARGETS[0]);snap(s,'progress');for(const p of TEMPO_TARGETS.slice(1))gotoFlat(s,p);gotoFlat(s,{x:245,y:170});assert(s.won);snap(s,'complete');
 s=freshFrontier('flux');snap(s,'initial');cmd(s,'brush',4);cmd(s,'pour',{x:66,y:47});advance(s,.1);cmd(s,'brush',3);for(let i=0;i<35&&!s.won;i++){cmd(s,'pour',{x:66,y:40});advance(s,.34);if(i===0)snap(s,'progress');}for(let i=0;i<12&&!s.won;i++){cmd(s,'pour',{x:87,y:40});advance(s,.7);}advance(s,5);assert(s.won,`flux ${s.collected} ${s.quenched}`);snap(s,'complete');
 s=freshFrontier('coil');snap(s,'initial');navigate(s,{x:-2.8,z:.5},true);assert(cmd(s,'grip'));advance(s,3,{x:1});for(let i=0;i<8;i++){cmd(s,'rise');tick(s,.05);}assert(s.rings[0]);snap(s,'progress');cmd(s,'grip');navigate(s,{x:1.6,z:-2},true);assert(cmd(s,'grip'));advance(s,3,{x:1});for(let i=0;i<10;i++){cmd(s,'rise');tick(s,.05);}assert(s.won);snap(s,'complete');
 s=freshFrontier('axiom');snap(s,'initial');cmd(s,'word',{x:0,y:1});cmd(s,'word',{x:-1,y:0});cmd(s,'select',3);cmd(s,'word',{x:0,y:-1});cmd(s,'word',{x:0,y:-1});snap(s,'progress');cmd(s,'walk',{x:0,y:-1});for(let i=0;i<7;i++)cmd(s,'walk',{x:1,y:0});assert(s.won);snap(s,'complete');
 s=freshFrontier('folio');snap(s,'initial');for(let stage=0;stage<3;stage++){for(const [world,pos]of [[stage,0],[stage+1,1]]){cmd(s,'select',s.order.indexOf(world));cmd(s,'swap',pos);if(!s.zoom[world])cmd(s,'zoom');}assert(cmd(s,'link'));advance(s,2.2);if(stage===0)snap(s,'progress');}assert(s.won);snap(s,'complete');
 s=freshFrontier('expose');snap(s,'initial');assert(cmd(s,'capture'));assert(cmd(s,'place'));while(s.p.z> -8)tick(s,.05,{y:-1});snap(s,'progress');assert(cmd(s,'capture'));assert(cmd(s,'place'));for(let i=0;i<120&&!s.won;i++)tick(s,.05,{y:-1});assert(s.won);snap(s,'complete');
 s=freshFrontier('script');snap(s,'initial');for(const c of ['TAKE','DOWN','RIGHT','RIGHT','RIGHT','RIGHT','UP','DROP','DOWN','LEFT','LEFT','LEFT','LEFT','UP','LOOP'])assert(cmd(s,'append',c));cmd(s,'run');for(let i=0;i<500&&!s.won;i++){tick(s,.05);if(s.delivered===1&&!snapshots.script.progress)snap(s,'progress');}assert(s.won);snap(s,'complete');
 s=freshFrontier('echo');snap(s,'initial');for(const [i,b]of ECHO_BEACONS.entries()){navigate(s,b);if(i===0)snap(s,'progress');}assert(s.won);snap(s,'complete');
 return snapshots;
}
