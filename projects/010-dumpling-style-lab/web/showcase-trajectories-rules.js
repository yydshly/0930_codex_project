export const TRAJECTORY_IDS=['dicework','synchro','perigee'];
export const DICE_CATEGORIES=[['chance','点数总和'],['triple','三同'],['four','四同'],['house','葫芦'],['straight','四连顺'],['quint','五同']];
export const WALLS=[[4,1],[4,4],[5,0],[5,5]],BEACON={x:8,y:2},GRID_W=10,GRID_H=6;
const clone=v=>structuredClone(v),num=v=>typeof v==='number'&&Number.isFinite(v),int=Number.isInteger,clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),same=(a,b)=>a.x===b.x&&a.y===b.y;
export const cellOpen=p=>p&&int(p.x)&&int(p.y)&&p.x>=0&&p.y>=0&&p.x<GRID_W&&p.y<GRID_H&&!WALLS.some(([x,y])=>x===p.x&&y===p.y);
export function diceScore(faces,key){const counts=Array(7).fill(0);for(const n of faces)counts[n]++;const sum=faces.reduce((a,b)=>a+b,0),max=Math.max(...counts),runs=[1,2,3].some(n=>[n,n+1,n+2,n+3].every(v=>counts[v]));return ({chance:sum,triple:max>=3?sum:0,four:max>=4?sum:0,house:counts.includes(3)&&counts.includes(2)?25:0,straight:runs?30:0,quint:max===5?50:0})[key]??0;}
const faceArray=a=>Array.isArray(a)&&a.length===5&&a.every(n=>int(n)&&n>=1&&n<=6),category=k=>DICE_CATEGORIES.some(([id])=>id===k);
function randomFace(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return 1+Math.floor(s.rng/4294967296*6);}
export function freshTrajectory(id,choice){const base={id,version:1,time:0,moves:0,won:false,failed:false,message:''};
 if(id==='dicework'){const seed=int(choice)&&choice>0?choice>>>0:5489;return {...base,seed,rng:seed,faces:[1,1,1,1,1],held:Array(5).fill(false),rolls:0,animation:null,chosen:null,records:[]};}
 if(id==='synchro')return {...base,units:[{id:0,team:0,x:1,y:1,hp:4},{id:1,team:0,x:1,y:4,hp:4},{id:2,team:1,x:8,y:1,hp:3},{id:3,team:1,x:8,y:4,hp:3}],plans:[[],[]],selected:0,phase:'planning',round:0,slot:0,age:0,speed:1,shots:[],log:[]};
 if(id==='perigee')return {...base,simTime:0,ship:{x:1.8,y:0,vx:0,vy:Math.sqrt(1/1.8)*.92},heading:Math.PI/2,stationAngle:.16,stationRadius:1.85,fuel:1,burns:0,running:false,warp:1,zoom:125,trail:[],trailClock:0,burnFx:0};
 throw Error('Unknown trajectory '+id);
}
export function enemyPlans(s){return s.units.filter(u=>u.team===1).map(u=>{const route=u.id===2?[[7,1],[6,1],[6,2],[5,2]]:[[7,4],[6,4],[6,3],[5,3]];let last={x:u.x,y:u.y};return route.map(([x,y])=>{const q={x,y};if(distance(last,q)<=1.01&&cellOpen(q))last=q;return {...last};});});}
export function lineVisible(a,b){let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1,err=dx-dy;while(x!==b.x||y!==b.y){const e=2*err;if(e> -dy){err-=dy;x+=sx;}if(e<dx){err+=dx;y+=sy;}if(!cellOpen({x,y}))return false;}return true;}
export function slotDestinations(s){const enemies=enemyPlans(s),wishes=s.units.map(u=>{if(!u.hp)return {x:u.x,y:u.y};const p=u.team===0?s.plans[u.id][s.slot]:enemies[u.id-2][s.slot];return p&&distance(u,p)<=1.01?{...p}:{x:u.x,y:u.y};});
 for(let pass=0;pass<4;pass++){const blocked=[];for(let i=0;i<s.units.length;i++){const u=s.units[i];if(!u.hp)continue;const wanted=wishes[i];if(same(wanted,u))continue;const collision=s.units.some((v,j)=>j!==i&&v.hp&&(same(wanted,wishes[j])||same(wanted,v)&&same(wishes[j],v)||u.team!==v.team&&same(wanted,v)&&same(wishes[j],u)));if(collision)blocked.push(i);}if(!blocked.length)break;for(const i of blocked)wishes[i]={x:s.units[i].x,y:s.units[i].y};}return wishes;
}
function tacticalOutcome(s){s.failed=!s.units.some(u=>u.team===0&&u.hp>0);s.won=!s.failed&&s.units.filter(u=>u.team===1).every(u=>u.hp===0)&&s.units.some(u=>u.team===0&&u.hp>0&&same(u,BEACON));if(s.won||s.failed){s.phase='ended';s.message=s.won?'同步行动完成，信标已重新接通。':'两台侦察机都停止了。调整路线后重试。';}}
function resolveSlot(s){const dest=slotDestinations(s);s.units.forEach((u,i)=>{u.x=dest[i].x;u.y=dest[i].y;});const damage=Array(4).fill(0),shots=[];
 for(const u of s.units.filter(u=>u.hp>0)){const targets=s.units.filter(v=>v.hp>0&&v.team!==u.team&&distance(u,v)<=3.05&&lineVisible(u,v)).sort((a,b)=>distance(u,a)-distance(u,b)||a.id-b.id);if(targets.length){const v=targets[0];damage[v.id]++;shots.push({from:{x:u.x,y:u.y},to:{x:v.x,y:v.y},team:u.team,age:0});}}
 s.units.forEach((u,i)=>u.hp=Math.max(0,u.hp-damage[i]));s.shots=shots;s.log.push({round:s.round,slot:s.slot,positions:s.units.map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp}))});s.log=s.log.slice(-32);s.slot++;tacticalOutcome(s);if(s.phase==='executing'&&s.slot===4){s.phase='planning';s.plans=[[],[]];s.slot=0;s.age=0;if(s.round>=8){s.failed=true;s.phase='ended';s.message='八轮行动已用完，重新规划抵达信标的路径。';}}
}
export function stationState(s){const a=s.stationAngle,r=s.stationRadius,w=Math.sqrt(1/(r*r*r));return {x:r*Math.cos(a),y:r*Math.sin(a),vx:-r*w*Math.sin(a),vy:r*w*Math.cos(a)};}
export function orbitMetrics(s){const p=s.ship,t=stationState(s),r=Math.hypot(p.x,p.y),v=Math.hypot(p.vx,p.vy);return {radius:r,speed:v,gap:distance(p,t),relativeSpeed:Math.hypot(p.vx-t.vx,p.vy-t.vy),energy:v*v/2-1/r};}
function acceleration(p){const r=Math.max(.1,Math.hypot(p.x,p.y)),f=-1/(r*r*r);return {x:p.x*f,y:p.y*f};}
export function driftOrbit(p,dt){const a=acceleration(p),x=p.x+p.vx*dt+.5*a.x*dt*dt,y=p.y+p.vy*dt+.5*a.y*dt*dt,b=acceleration({x,y});return {x,y,vx:p.vx+.5*(a.x+b.x)*dt,vy:p.vy+.5*(a.y+b.y)*dt};}
export function predictOrbit(s,n=220,dt=.035){let p={...s.ship};const points=[];for(let i=0;i<n;i++){p=driftOrbit(p,dt);if(Math.hypot(p.x,p.y)<.8||Math.hypot(p.x,p.y)>6)break;points.push({x:p.x,y:p.y});}return points;}
function burn(s,dx,dy){const size=Math.hypot(dx,dy);if(size<1e-9||s.fuel<=0)return false;const cost=Math.min(size,s.fuel);s.ship.vx+=dx/size*cost;s.ship.vy+=dy/size*cost;s.fuel=Math.max(0,s.fuel-cost);s.burns++;s.burnFx=.4;return true;}
export function commandTrajectory(s,k,v){if(k==='restart'){Object.assign(s,freshTrajectory(s.id,s.seed));return true;}if(s.id==='dicework'&&k==='next'){Object.assign(s,freshTrajectory(s.id,(s.seed+977)>>>0));return true;}if(s.won||s.failed)return false;let ok=false;
 if(s.id==='dicework'&&!s.animation){
  if(k==='hold'&&int(v)&&v>=0&&v<5&&s.rolls>0&&s.rolls<3){s.held[v]=!s.held[v];ok=true;}
  if(k==='roll'&&s.rolls<3){const mask=s.held.map(v=>!v);if(!mask.some(Boolean)){s.message='五枚骰子都已锁定；先释放一枚，或选择类别记录。';return false;}const target=s.faces.map((n,i)=>mask[i]?randomFace(s):n);s.animation={age:0,from:[...s.faces],target,mask};s.rolls++;s.chosen=null;ok=true;}
  if(k==='choose'&&s.rolls&&category(v)&&!s.records.some(r=>r.category===v)){s.chosen=v;ok=true;}
  if(k==='bank'&&s.chosen&&s.rolls){s.records.push({category:s.chosen,faces:[...s.faces],points:diceScore(s.faces,s.chosen),rolls:s.rolls});s.held=Array(5).fill(false);s.rolls=0;s.chosen=null;s.won=s.records.length===3;s.message=s.won?'三轮组合已记下，比较保留与重掷的取舍。':'本轮已经记录，下一轮从全部五枚开始。';ok=true;}
 }
 if(s.id==='synchro'){
  if(k==='speed'&&[1,2].includes(v)){s.speed=v;ok=true;}
  if(s.phase==='planning'){
   if(k==='select'&&[0,1].includes(v)&&s.units[v].hp){s.selected=v;ok=true;}
   if(k==='path'||k==='wait'){const plan=s.plans[s.selected],last=plan.at(-1)||s.units[s.selected],p=k==='wait'?{x:last.x,y:last.y}:v;if(s.units[s.selected].hp&&plan.length<4&&cellOpen(p)&&distance(last,p)<=1.01){plan.push({x:p.x,y:p.y});ok=true;}else{s.message='只可追加相邻空格或等待，每台最多四步。';}}
   if(k==='undo'&&s.plans[s.selected].length){s.plans[s.selected].pop();ok=true;}
   if(k==='clear'){s.plans[s.selected]=[];ok=true;}
   if(k==='commit'){s.phase='executing';s.round++;s.slot=0;s.age=0;ok=true;}
  }
 }
 if(s.id==='perigee'){
  if(k==='launch'){s.running=!s.running;ok=true;}
  if(k==='heading'&&num(v)){s.heading=((v%(Math.PI*2))+Math.PI*2)%(Math.PI*2);ok=true;}
  if(k==='turn'&&[1,-1].includes(v)){s.heading=(s.heading+v*Math.PI/12+Math.PI*2)%(Math.PI*2);ok=true;}
  if(k==='aim'){const p=s.ship,t=stationState(s),angle=v==='prograde'?Math.atan2(p.vy,p.vx):v==='retrograde'?Math.atan2(-p.vy,-p.vx):v==='inward'?Math.atan2(-p.y,-p.x):v==='outward'?Math.atan2(p.y,p.x):v==='target'?Math.atan2(t.y-p.y,t.x-p.x):null;if(angle!==null){s.heading=angle;ok=true;}}
  if(k==='impulse'){const amount=num(v)?clamp(v,0,.12):.035;ok=burn(s,Math.cos(s.heading)*amount,Math.sin(s.heading)*amount);}
  if(k==='circularize'){const r=Math.hypot(s.ship.x,s.ship.y),v=Math.sqrt(1/r),dx=-s.ship.y/r*v-s.ship.vx,dy=s.ship.x/r*v-s.ship.vy,n=Math.hypot(dx,dy),a=Math.min(.12,n);s.heading=Math.atan2(dy,dx);ok=burn(s,n?dx/n*a:0,n?dy/n*a:0);}
  if(k==='warp'&&[1,3,6].includes(v)){s.warp=v;ok=true;}
  if(k==='zoom'&&[60,90,125].includes(v)){s.zoom=v;ok=true;}
  if(k==='dock'){const m=orbitMetrics(s);if(m.gap<=.09&&m.relativeSpeed<=.09&&s.burns>0){s.won=true;s.running=false;s.message='距离与相对速度都满足条件，交会完成。';ok=true;}else s.message=`交会还需距离 ≤ 0.09、相对速度 ≤ 0.09，且已执行一次推力修正。当前 ${m.gap.toFixed(3)} / ${m.relativeSpeed.toFixed(3)}。`;}
 }
 if(ok){s.moves++;if(!['bank','dock'].includes(k))s.message='';}return ok;
}
export function stepTrajectory(s,dt,throttle=false){if(s.won||s.failed)return;dt=clamp(num(dt)?dt:0,0,.1);if(s.id==='perigee'&&!s.running)return;
 for(let left=dt;left>1e-7;){const d=Math.min(1/120,left);left-=d;s.time+=d;
  if(s.id==='dicework'&&s.animation){s.animation.age+=d;if(s.animation.age>=.8-1e-7){s.faces=[...s.animation.target];s.animation=null;}}
  if(s.id==='synchro'){for(const shot of s.shots)shot.age+=d;s.shots=s.shots.filter(v=>v.age<.45);if(s.phase==='executing'){s.age+=d*s.speed;if(s.age>=.5-1e-7){s.age-=.5;resolveSlot(s);}}}
  if(s.id==='perigee'){const h=d*.35*s.warp;s.simTime+=h;if(throttle)burn(s,Math.cos(s.heading)*.15*h,Math.sin(s.heading)*.15*h);s.ship=driftOrbit(s.ship,h);s.stationAngle=(s.stationAngle+Math.sqrt(1/s.stationRadius**3)*h)%(2*Math.PI);s.burnFx=Math.max(0,s.burnFx-d);s.trailClock+=h;if(s.trailClock>=.025){s.trail.push({x:s.ship.x,y:s.ship.y});s.trail=s.trail.slice(-400);s.trailClock%=.025;}const r=Math.hypot(s.ship.x,s.ship.y);if(r<=.8||r>=6||s.simTime>=45){s.failed=true;s.running=false;s.message=r<=.8?'飞船进入行星表面，重试并减少向内推力。':r>=6?'飞船离开演示空间，调整推力方向后重试。':'模拟时间已用完，可重试练习。';}}
  if(s.won||s.failed)break;
 }
}
export function restoreTrajectory(id,raw){const r=raw?.state??raw,b=freshTrajectory(id,r?.seed);if(!r||r.id!==id||r.version!==1)return b;try{
 if(!num(r.time)||r.time<0||!int(r.moves)||r.moves<0||typeof r.message!=='string')return b;
 if(id==='dicework'){
  if(!int(r.seed)||r.seed<1||r.seed>4294967295||!int(r.rng)||r.rng<0||r.rng>4294967295||!faceArray(r.faces)||!Array.isArray(r.held)||r.held.length!==5||r.held.some(v=>typeof v!=='boolean')||!int(r.rolls)||r.rolls<0||r.rolls>3||r.chosen!==null&&!category(r.chosen)||!Array.isArray(r.records)||r.records.length>3||new Set(r.records.map(v=>v.category)).size!==r.records.length||r.records.some(v=>!category(v.category)||!faceArray(v.faces)||v.points!==diceScore(v.faces,v.category)||!int(v.rolls)||v.rolls<1||v.rolls>3)||r.animation&&(!num(r.animation.age)||r.animation.age<0||r.animation.age>.8||!faceArray(r.animation.from)||!faceArray(r.animation.target)||!Array.isArray(r.animation.mask)||r.animation.mask.length!==5||r.animation.mask.some(v=>typeof v!=='boolean')))return b;
  if(r.chosen&&r.records.some(v=>v.category===r.chosen)||r.rolls===0&&r.held.some(Boolean))return b;
 }
 if(id==='synchro'){
  if(!Array.isArray(r.units)||r.units.length!==4||r.units.some((u,i)=>u.id!==i||u.team!==(i<2?0:1)||!cellOpen(u)||!int(u.hp)||u.hp<0||u.hp>(i<2?4:3))||new Set(r.units.filter(u=>u.hp).map(u=>u.x+','+u.y)).size!==r.units.filter(u=>u.hp).length||!Array.isArray(r.plans)||r.plans.length!==2||r.plans.some(a=>!Array.isArray(a)||a.length>4||a.some(p=>!cellOpen(p)))||![0,1].includes(r.selected)||!['planning','executing','ended'].includes(r.phase)||!int(r.round)||r.round<0||r.round>8||!int(r.slot)||r.slot<0||r.slot>4||!num(r.age)||r.age<0||r.age>.5||![1,2].includes(r.speed)||!Array.isArray(r.shots)||r.shots.some(v=>!cellOpen(v.from)||!cellOpen(v.to)||![0,1].includes(v.team)||!num(v.age)||v.age<0||v.age>.45)||!Array.isArray(r.log)||r.log.length>32)return b;
  for(let i=0;i<2;i++){const plan=r.plans[i];for(let j=1;j<plan.length;j++)if(distance(plan[j-1],plan[j])>1.01)return b;if(r.phase==='planning'&&plan.length&&distance(r.units[i],plan[0])>1.01)return b;}
 }
 if(id==='perigee'&&(!num(r.simTime)||r.simTime<0||!r.ship||!['x','y','vx','vy'].every(k=>num(r.ship[k])&&Math.abs(r.ship[k])<=20)||Math.hypot(r.ship.x,r.ship.y)<.1||!num(r.heading)||Math.abs(r.heading)>10||!num(r.stationAngle)||r.stationAngle<0||r.stationAngle>2*Math.PI||r.stationRadius!==1.85||!num(r.fuel)||r.fuel<0||r.fuel>1||!int(r.burns)||r.burns<0||typeof r.running!=='boolean'||![1,3,6].includes(r.warp)||![60,90,125].includes(r.zoom)||!Array.isArray(r.trail)||r.trail.length>400||r.trail.some(p=>!num(p.x)||!num(p.y)||Math.abs(p.x)>6.1||Math.abs(p.y)>6.1)||!num(r.trailClock)||r.trailClock<0||r.trailClock>=.025||!num(r.burnFx)||r.burnFx<0||r.burnFx>.4))return b;
 for(const k of Object.keys(b))if(Object.hasOwn(r,k))b[k]=clone(r[k]);
 if(id==='dicework'){b.won=b.records.length===3;b.failed=false;}
 if(id==='synchro'){tacticalOutcome(b);if(!b.won&&!b.failed&&b.round>=8&&b.phase==='ended')b.failed=true;}
 if(id==='perigee'){const m=orbitMetrics(b);b.won=r.won===true&&b.burns>0&&m.gap<=.09&&m.relativeSpeed<=.09;b.failed=!b.won&&(m.radius<=.8||m.radius>=6||b.simTime>=45);if(b.won||b.failed)b.running=false;}
 return b;
 }catch{return b;}}
