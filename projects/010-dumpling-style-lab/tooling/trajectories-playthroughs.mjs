import assert from 'node:assert/strict';import {freshTrajectory,commandTrajectory as cmd,stepTrajectory,orbitMetrics,diceScore} from '../web/showcase-trajectories-rules.js';
export const IDS=['dicework','synchro','perigee'];
export function advance(s,t){while(t>1e-8){const d=Math.min(t,.1);stepTrajectory(s,d);t-=d;}}
export function playTrajectory(id){const s=freshTrajectory(id),snapshots={initial:structuredClone(s)},run=(k,v)=>{assert.equal(cmd(s,k,v),true,id+' '+k+' '+JSON.stringify(v));};
 if(id==='dicework'){for(let round=0;round<3;round++){run('roll');advance(s,.85);const counts=s.faces.map(n=>s.faces.filter(v=>v===n).length);for(let i=0;i<5;i++)if(counts[i]>=2)run('hold',i);if(!s.held.every(Boolean)){run('roll');advance(s,.85);}const used=new Set(s.records.map(r=>r.category)),keys=['chance','triple','straight','house','four','quint'].filter(k=>!used.has(k));let best=keys.sort((a,b)=>diceScore(s.faces,b)-diceScore(s.faces,a))[0];run('choose',best);if(round===1)snapshots.progress=structuredClone(s);run('bank');}}
 if(id==='synchro'){run('select',0);for(const [x,y] of [[2,1],[3,1],[3,2],[4,2]])run('path',{x,y});run('select',1);for(const [x,y] of [[2,4],[3,4],[3,3],[4,3]])run('path',{x,y});run('commit');advance(s,1.35);snapshots.progress=structuredClone(s);advance(s,.7);run('commit');advance(s,2.05);run('select',0);for(const x of [5,6,7,8])run('path',{x,y:2});run('commit');advance(s,2.05);}
 if(id==='perigee'){run('circularize');run('launch');run('warp',3);let seen=false;for(let i=0;i<1000&&!s.won&&!s.failed;i++){advance(s,.05);const m=orbitMetrics(s);if(!seen&&m.gap<.2){snapshots.progress=structuredClone(s);seen=true;}if(m.gap<=.09&&m.relativeSpeed<=.09)run('dock');}assert.ok(seen,'orbit has actual intermediate approach');}
 assert.ok(s.won&&!s.failed,id+' normal playthrough completes');snapshots.complete=structuredClone(s);return {s,snapshots};
}

