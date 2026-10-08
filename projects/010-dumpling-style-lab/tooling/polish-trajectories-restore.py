from pathlib import Path
P=Path(__file__).resolve().parents[1];f=P/'web/showcase-trajectories-rules.js';s=f.read_text(encoding='utf-8')
a="for(let i=0;i<2;i++){let previous=r.units[i];const start=r.phase==='executing'?r.slot:0;for(const p of r.plans[i].slice(start)){if(distance(previous,p)>1.01)return b;previous=p;}}"
b="for(let i=0;i<2;i++){const plan=r.plans[i];for(let j=1;j<plan.length;j++)if(distance(plan[j-1],plan[j])>1.01)return b;if(r.phase==='planning'&&plan.length&&distance(r.units[i],plan[0])>1.01)return b;}"
assert a in s;s=s.replace(a,b);f.write_text(s,encoding='utf-8')
f=P/'tooling/render-trajectories-scenes.mjs';s=f.read_text(encoding='utf-8');s="import assert from 'node:assert/strict';"+s;s=s.replace('game.draw();const canvas=',"assert.deepEqual(game.getState(),states[id][phase],id+' '+phase+' production factory must restore the actual playthrough');game.draw();const canvas=");f.write_text(s,encoding='utf-8')
print('Completed and blocked tactical routes restore without revalidating executed moves as future moves')
