import {gardenKinds,createPlant,validateGarden} from './garden-model.mjs';
export const kinds=gardenKinds;
const order=['water','meadow','air'],clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export const stageOf=p=>p.growth<2?0:p.growth<4?1:p.growth<7?2:3;
export const stageName=p=>['种子','萌芽','开花','丰盛'][stageOf(p)];
export function voiceName(p){const names={water:'莲',meadow:'花',air:'铃'};return p.mix.map(m=>names[m.kind]).join('')+(p.mix.length>1?' · 混合声':' · '+kinds[p.kind].voice);}
const rhythm=kind=>kind==='meadow'?[true,false,false,false,true,false,false,false]:kind==='air'?[false,true,false,true,false,true,false,true]:[true,false,true,false,true,false,true,false];
export function seed(kind,x,y,held,id){return {...createPlant(kind,x,y,held,id),mix:[{kind,weight:1}],mass:1,growth:0,generation:0,lineage:[],part:kind==='meadow'?'harmony':kind==='air'?'pulse':'melody',gain:.7,pattern:rhythm(kind)};}
export function grow(plant){return {...plant,growth:clamp(plant.growth+1,0,9)};}
export function phraseNotes(p){const count=[2,4,6,8][stageOf(p)];return Array.from({length:count},(_,i)=>p.notes[i%p.notes.length]);}
export function migrate(value){
  if(value?.format==='sound-garden'&&value.version===1){const old=validateGarden(value);return {format:'sound-garden-ecosystem',version:1,bpm:84,plants:old.plants.map(p=>({...seed(p.kind,p.x,p.y,p.held,p.id),notes:p.notes}))};}
  return validateEcosystem(value);
}
export function validateEcosystem(value){
  if(value?.format!=='sound-garden-ecosystem'||value.version!==1||!Number.isInteger(value.bpm)||value.bpm<60||value.bpm>120||!Array.isArray(value.plants)||value.plants.length>24)throw new Error('声音生态文件格式不正确。');
  const ids=new Set();
  const plants=value.plants.map(p=>{
    if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||!kinds[p.kind]||!Number.isFinite(p.x)||p.x<.08||p.x>.92||!Number.isFinite(p.y)||p.y<.32||p.y>.88||!Number.isFinite(p.held)||p.held<0||p.held>3||!Array.isArray(p.notes)||p.notes.length<2||p.notes.length>12||p.notes.some(n=>!Number.isInteger(n)||n<48||n>96)||!Array.isArray(p.mix)||!p.mix.length||p.mix.length>3||new Set(p.mix.map(m=>m.kind)).size!==p.mix.length||p.mix.some(m=>!kinds[m.kind]||!Number.isFinite(m.weight)||m.weight<=0||m.weight>1)||Math.abs(p.mix.reduce((n,m)=>n+m.weight,0)-1)>1e-6||!Number.isInteger(p.mass)||p.mass<1||p.mass>12||!Number.isInteger(p.growth)||p.growth<0||p.growth>9||!Number.isInteger(p.generation)||p.generation<0||p.generation>8||!Array.isArray(p.lineage)||p.lineage.length>12||p.lineage.some(n=>typeof n!=='string'||n.length>80)||!['melody','harmony','pulse'].includes(p.part)||!Number.isFinite(p.gain)||p.gain<0||p.gain>1||!Array.isArray(p.pattern)||p.pattern.length!==8||p.pattern.some(n=>typeof n!=='boolean'))throw new Error('植物的音序、成长或混合比例无法读取。');
    ids.add(p.id);return {id:p.id,kind:p.kind,x:p.x,y:p.y,held:p.held,notes:[...p.notes],mix:p.mix.map(m=>({kind:m.kind,weight:m.weight})),mass:p.mass,growth:p.growth,generation:p.generation,lineage:[...p.lineage],part:p.part,gain:p.gain,pattern:[...p.pattern]};
  });return {format:'sound-garden-ecosystem',version:1,bpm:value.bpm,plants};
}
function pair(plants,a,b){const first=plants.find(p=>p.id===a),second=plants.find(p=>p.id===b);if(!first||!second||a===b)throw new Error('按顺序选两株不同的植物。');return [first,second];}
const interleave=(a,b)=>Array.from({length:Math.min(12,Math.max(a.length,b.length)*2)},(_,i)=>(i%2?b:a)[Math.floor(i/2)%(i%2?b:a).length]);
export function absorb(plants,a,b){
  const [host,food]=pair(plants,a,b),result={...host,notes:interleave(host.notes,food.notes),mass:clamp(host.mass+food.mass,1,12),growth:clamp(host.growth+2,0,9),lineage:[...host.lineage,voiceName(food)].slice(-12)};
  return {plants:plants.filter(p=>p.id!==b).map(p=>p.id===a?result:p),result,parents:[host,food]};
}
export function fuse(plants,a,b,id){
  const [first,second]=pair(plants,a,b);if(plants.some(p=>p.id===id))throw new Error('新植物的编号已经存在。');
  const weights=Object.fromEntries(order.map(k=>[k,0]));for(const p of [first,second])for(const m of p.mix)weights[m.kind]+=m.weight*p.mass;
  const total=first.mass+second.mass,mix=order.filter(k=>weights[k]>0).map(kind=>({kind,weight:weights[kind]/total}));
  const dominant=[...mix].sort((a,b)=>b.weight-a.weight||order.indexOf(a.kind)-order.indexOf(b.kind))[0].kind;
  const result={...seed(dominant,(first.x+second.x)/2,(first.y+second.y)/2,(first.held+second.held)/2,id),notes:interleave(first.notes,second.notes),mix,mass:clamp(total,1,12),growth:2,generation:clamp(Math.max(first.generation,second.generation)+1,0,8),lineage:[voiceName(first),voiceName(second)]};
  return {plants:[...plants.filter(p=>p.id!==a&&p.id!==b),result],result,parents:[first,second]};
}
export function cycleEvents(plants){
  const events=[];
  for(const plant of plants){let index=0;const notes=phraseNotes(plant);
    plant.pattern.forEach((on,step)=>{if(!on)return;const midi=notes[index++%notes.length];
      events.push({id:plant.id,step,midi:plant.part==='harmony'?midi-12:midi,beats:plant.part==='harmony'?3.4:plant.part==='pulse'?.45:1.2,gain:plant.gain});
    });
  }return events.sort((a,b)=>a.step-b.step);
}
