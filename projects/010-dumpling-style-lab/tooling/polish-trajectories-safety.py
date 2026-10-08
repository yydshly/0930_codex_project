from pathlib import Path
P=Path(__file__).resolve().parents[1]
f=P/'web/showcase-trajectories-rules.js';s=f.read_text(encoding='utf-8')
a="for(let pass=0;pass<4;pass++){let changed=false;for(let i=0;i<s.units.length;i++){const u=s.units[i];if(!u.hp)continue;const wanted=wishes[i];if(same(wanted,u))continue;const collision=s.units.some((v,j)=>j!==i&&v.hp&&(same(wanted,wishes[j])||same(wanted,v)&&same(wishes[j],v)||u.team!==v.team&&same(wanted,v)&&same(wishes[j],u)));if(collision){wishes[i]={x:u.x,y:u.y};changed=true;}}if(!changed)break;}"
b="for(let pass=0;pass<4;pass++){const blocked=[];for(let i=0;i<s.units.length;i++){const u=s.units[i];if(!u.hp)continue;const wanted=wishes[i];if(same(wanted,u))continue;const collision=s.units.some((v,j)=>j!==i&&v.hp&&(same(wanted,wishes[j])||same(wanted,v)&&same(wishes[j],v)||u.team!==v.team&&same(wanted,v)&&same(wishes[j],u)));if(collision)blocked.push(i);}if(!blocked.length)break;for(const i of blocked)wishes[i]={x:s.units[i].x,y:s.units[i].y};}"
assert a in s;s=s.replace(a,b).replace('<.55','<.8').replace('<=.55','<=.8')
f.write_text(s,encoding='utf-8')
f=P/'web/showcase-trajectories-kit.js';s=f.read_text(encoding='utf-8');a="if(i>=0)run('hold',i);}"
b="if(i>=0)run('hold',i);if(p.y>=417&&p.y<=524){const choice=Math.floor((p.x-65)/166);if(choice>=0&&choice<6&&p.x<=65+choice*166+156)run('choose',DICE_CATEGORIES[choice][0]);}}"
assert a in s;s=s.replace(a,b);f.write_text(s,encoding='utf-8')
f=P/'tooling/trajectories-playthroughs.mjs';s=f.read_text(encoding='utf-8').replace('orbitMetrics}', 'orbitMetrics,diceScore}').replace('const {diceScore}=awaitless;','').replace("import {diceScore} from '../web/showcase-trajectories-rules.js';const awaitless={diceScore};",'');f.write_text(s,encoding='utf-8')
print('Symmetric collisions, planet collision matches visible radius, dice category hit targets')
