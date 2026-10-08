export const CIRCUITRY_IDS=['prismcube','orbiter','automata','receiver'];
export const FACES={R:{axis:0,layer:1},L:{axis:0,layer:-1},U:{axis:1,layer:1},D:{axis:1,layer:-1},F:{axis:2,layer:1},B:{axis:2,layer:-1}};
export const SCRAMBLE=[{face:'R',dir:1},{face:'U',dir:1},{face:'F',dir:1},{face:'R',dir:-1},{face:'U',dir:-1}];
export const ORBIT_LANES=12,ORBIT_CENTER={x:560,y:331},ORBIT_RADIUS=220,ORBIT_WAVE=[0,4,9,2,7,11,5,1,8,3,10,6];
export const UNIT_TYPES={warden:{name:'守卫',hp:120,damage:17,armor:3,range:1.1,cooldown:.85},spark:{name:'电弩',hp:68,damage:25,armor:0,range:3.05,cooldown:1.05},mender:{name:'修复',hp:65,damage:7,armor:1,range:2.05,cooldown:1.1}};
export const RADIO_CHANNELS=[{name:'港口信标',frequency:93.6,phase:45,note:165},{name:'山脊信标',frequency:99.2,phase:180,note:220},{name:'塔楼信标',frequency:104.8,phase:300,note:293.665}];
const clone=v=>structuredClone(v),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=v=>typeof v==='number'&&Number.isFinite(v),mod=(v,n)=>(v%n+n)%n,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function cubeHome(){const a=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])a.push({id:a.length,pos:[x,y,z],stickers:[{n:[x,0,0],color:x>0?0:1},{n:[0,y,0],color:y>0?2:3},{n:[0,0,z],color:z>0?4:5}]});return a;}
export function rotateQuarter(v,axis,sign){const [x,y,z]=v;return (axis===0?[x,-sign*z,sign*y]:axis===1?[sign*z,y,-sign*x]:[-sign*y,sign*x,z]).map(n=>n===0?0:n);}
export function twistCube(cubies,face,dir){const{axis,layer}=FACES[face],sign=-dir*layer;for(const c of cubies)if(c.pos[axis]===layer){c.pos=rotateQuarter(c.pos,axis,sign);for(const p of c.stickers)p.n=rotateQuarter(p.n,axis,sign);}return cubies;}
export function cubeSolved(cubies){const faces=new Map();for(const c of cubies)for(const st of c.stickers){const key=st.n.join(',');if(!faces.has(key))faces.set(key,[]);faces.get(key).push(st.color);}return faces.size===6&&[...faces.values()].every(v=>v.length===4&&v.every(c=>c===v[0]));}
function applyPath(path){const c=cubeHome();for(const t of path)twistCube(c,t.face,t.dir);return c;}
export function cubeFaceCount(cubies){const f=new Map();for(const c of cubies)for(const st of c.stickers){const k=st.n.join(',');if(!f.has(k))f.set(k,[]);f.get(k).push(st.color);}return [...f.values()].filter(v=>v.length===4&&v.every(c=>c===v[0])).length;}
const defaultPlan=()=>[{kind:'warden',x:3,y:2},{kind:'spark',x:1,y:1},{kind:'mender',x:1,y:3}];
export function makeArmy(plan){return [...plan.map((p,i)=>({...p,team:0,id:i})),...['warden','spark','spark'].map((kind,i)=>({kind,x:i?7:6,y:[2,1,4][i],team:1,id:i+3}))].map(p=>({...p,hp:UNIT_TYPES[p.kind].hp*(p.team?.8:1),cooldown:0,mana:p.kind==='mender'?8:0,moving:null}));}
export function freshCircuitry(id){const c={id,version:1,time:0,moves:0,won:false,failed:false,message:''};
 if(id==='prismcube')return {...c,cubies:applyPath(SCRAMBLE),path:clone(SCRAMBLE),history:[],turn:null,selected:'R',yaw:.7,pitch:.38,zoom:1,hint:''};
 if(id==='orbiter')return {...c,lane:0,hp:3,kills:0,escaped:0,spawned:0,running:false,autofire:true,elapsed:0,cooldown:0,enemies:[],shots:[],effects:[]};
 if(id==='automata'){const plan=defaultPlan();return {...c,plan,units:makeArmy(plan),selected:0,battle:false,elapsed:0,speed:1,effects:[]};}
 if(id==='receiver')return {...c,channel:0,frequency:96.1,phase:90,width:.9,running:false,stability:0,found:[false,false,false]};throw Error('Unknown circuitry '+id);
}
const validTurn=t=>t&&Object.hasOwn(FACES,t.face)&&[1,-1].includes(t.dir);
export function restoreCircuitry(id,raw){const b=freshCircuitry(id),r=raw?.state??raw;if(!r||r.id!==id||r.version!==1)return b;try{
 if(!finite(r.time)||r.time<0||!Number.isInteger(r.moves)||r.moves<0||typeof r.failed!=='boolean'||typeof r.message!=='string')return b;
 if(id==='prismcube'){
  if(!Array.isArray(r.path)||r.path.length>256||!r.path.every(validTurn)||!Array.isArray(r.history)||r.history.length>128||!r.history.every(validTurn)||JSON.stringify(applyPath(r.path))!==JSON.stringify(r.cubies)||![r.yaw,r.pitch,r.zoom].every(finite)||r.zoom<.65||r.zoom>1.4||!Object.hasOwn(FACES,r.selected))return b;
  if(r.turn&&(!validTurn(r.turn)||!finite(r.turn.time)||r.turn.time<0||r.turn.time>.38||typeof r.turn.undo!=='boolean'))return b;
 }
 if(id==='orbiter'){
  if(!Number.isInteger(r.lane)||r.lane<0||r.lane>=12||!Number.isInteger(r.hp)||r.hp<0||r.hp>3||!['kills','escaped','spawned'].every(k=>Number.isInteger(r[k])&&r[k]>=0&&r[k]<=12)||typeof r.running!=='boolean'||typeof r.autofire!=='boolean'||!finite(r.elapsed)||!finite(r.cooldown)||!Array.isArray(r.enemies)||!Array.isArray(r.shots)||!Array.isArray(r.effects)||r.enemies.length>12||r.shots.length>64||r.effects.length>64)return b;
  if(r.enemies.some(p=>!Number.isInteger(p.id)||p.id<0||p.id>=12||!Number.isInteger(p.lane)||p.lane<0||p.lane>=12||![p.r,p.hp,p.speed].every(finite)||p.r<60||p.r>270||p.hp<1||p.hp>2||p.speed<10||p.speed>22)||r.shots.some(p=>!finite(p.r)||p.r<0||p.r>290||!Number.isInteger(p.lane)||p.lane<0||p.lane>=12)||r.kills+r.escaped+r.enemies.length!==r.spawned)return b;
 }
 if(id==='automata'){
  if(!Array.isArray(r.plan)||r.plan.length!==3||r.plan.some(p=>!UNIT_TYPES[p.kind]||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.x>3||p.y<0||p.y>5)||new Set(r.plan.map(p=>p.x+','+p.y)).size!==3||!Array.isArray(r.units)||r.units.length!==6||!Number.isInteger(r.selected)||r.selected<0||r.selected>2||typeof r.battle!=='boolean'||!finite(r.elapsed)||![1,2].includes(r.speed)||!Array.isArray(r.effects)||r.effects.length>64)return b;
  if(r.units.some((p,i)=>p.id!==i||p.team!==(i<3?0:1)||!UNIT_TYPES[p.kind]||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.x>8||p.y<0||p.y>5||!finite(p.hp)||p.hp<0||p.hp>UNIT_TYPES[p.kind].hp||!finite(p.cooldown)||!finite(p.mana)||p.mana<0||p.mana>8||p.moving&&(!['x','y','progress'].every(k=>finite(p.moving[k]))||!Number.isInteger(p.moving.x)||!Number.isInteger(p.moving.y)||p.moving.x<0||p.moving.x>8||p.moving.y<0||p.moving.y>5||p.moving.progress<0||p.moving.progress>1)))return b;
 }
 if(id==='receiver'&&(!Number.isInteger(r.channel)||r.channel<0||r.channel>2||!finite(r.frequency)||r.frequency<88||r.frequency>108||!finite(r.phase)||r.phase<0||r.phase>=360||!finite(r.width)||r.width<.1||r.width>2||typeof r.running!=='boolean'||!finite(r.stability)||r.stability<0||r.stability>1.2||!Array.isArray(r.found)||r.found.length!==3||r.found.some(v=>typeof v!=='boolean')))return b;
 if(id==='prismcube'&&(r.pitch<-.55||r.pitch>1.15||typeof r.hint!=='string'||r.turn?.undo&&!r.history.length))return b;
 if(id==='orbiter'&&(r.elapsed<0||r.cooldown<0||r.cooldown>.18+1e-7||new Set(r.enemies.map(e=>e.id)).size!==r.enemies.length||r.enemies.some(e=>e.id>=r.spawned||e.r>ORBIT_RADIUS)||r.effects.some(e=>!finite(e.r)||e.r<0||e.r>ORBIT_RADIUS||!Number.isInteger(e.lane)||e.lane<0||e.lane>=12||!finite(e.life)||e.life<=0||e.life>.5||typeof e.hit!=='boolean')))return b;
 if(id==='automata'&&(r.elapsed<0||r.elapsed>45.1||r.units.slice(0,3).some((u,i)=>u.kind!==r.plan[i].kind)||r.units.some(u=>!Number.isInteger(u.mana)||u.cooldown<0||u.cooldown>1.11||u.hp>UNIT_TYPES[u.kind].hp*(u.team?.8:1)||u.moving&&Math.abs(u.moving.x-u.x)+Math.abs(u.moving.y-u.y)!==1)||new Set(r.units.filter(u=>u.hp>0).map(u=>u.x+','+u.y)).size!==r.units.filter(u=>u.hp>0).length||r.effects.some(e=>!['x','y','tx','ty','life'].every(k=>finite(e[k]))||e.x<0||e.x>8||e.tx<0||e.tx>8||e.y<0||e.y>5||e.ty<0||e.ty>5||e.life<=0||e.life>.42||typeof e.heal!=='boolean')))return b;
 for(const k of Object.keys(b))if(Object.hasOwn(r,k))b[k]=clone(r[k]);if(id==='prismcube')b.won=!b.turn&&cubeSolved(b.cubies);if(id==='orbiter')b.won=b.spawned===12&&b.enemies.length===0&&b.hp>0&&b.kills>=10;if(id==='automata')b.won=b.units.slice(3).every(u=>u.hp===0)&&b.units.slice(0,3).some(u=>u.hp>0);if(id==='receiver')b.won=b.found.every(Boolean);return b;
 }catch{return freshCircuitry(id);}}
function startTwist(s,face,dir,undo=false){if(s.turn||!validTurn({face,dir})||s.path.length>=256||!undo&&s.history.length>=128)return false;s.turn={face,dir,undo,time:0};s.selected=face;s.hint='';return true;}
export function commandCircuitry(s,k,v){if(k==='restart'){Object.assign(s,freshCircuitry(s.id));return true;}if(s.won&&!(s.id==='prismcube'&&['orbit','zoom','select'].includes(k)))return false;let ok=false;
 if(s.id==='prismcube'){
  if(k==='select'&&Object.hasOwn(FACES,v)){s.selected=v;ok=true;}
  if(k==='twist'&&validTurn(v))ok=startTwist(s,v.face,v.dir);
  if(k==='undo'&&s.history.length&&!s.turn){const p=s.history.at(-1);ok=startTwist(s,p.face,-p.dir,true);}
  if(k==='hint'&&!s.turn&&s.path.length){const p=s.path.at(-1);s.hint=p.face+(p.dir>0?' 逆时针':' 顺时针');s.message='下一步可以尝试：'+s.hint;ok=true;}
  if(k==='orbit'&&v&&finite(v.x)&&finite(v.y)){s.yaw+=clamp(v.x,-.3,.3);s.pitch=clamp(s.pitch+clamp(v.y,-.3,.3),-.55,1.15);ok=true;}
  if(k==='zoom'&&finite(v)){s.zoom=clamp(s.zoom+v,.65,1.4);ok=true;}
 }
 if(s.id==='orbiter'){
  if(k==='lane'&&Number.isInteger(v)&&v>=0&&v<12){s.lane=v;ok=true;}
  if(k==='shift'&&[1,-1].includes(v)){s.lane=mod(s.lane+v,12);ok=true;}
  if(k==='launch'&&!s.failed){s.running=!s.running;ok=true;}
  if(k==='autofire'){s.autofire=!s.autofire;ok=true;}
  if(k==='fire'&&s.running&&!s.failed&&s.cooldown<=0&&s.shots.length<64){s.shots.push({lane:s.lane,r:ORBIT_RADIUS-8});s.cooldown=.18;ok=true;}
 }
 if(s.id==='automata'){
  if(k==='select'&&Number.isInteger(v)&&v>=0&&v<3){s.selected=v;ok=true;}
  if(k==='kind'&&UNIT_TYPES[v]&&!s.battle){s.plan[s.selected].kind=v;s.units=makeArmy(s.plan);s.failed=false;ok=true;}
  if(k==='place'&&v&&Number.isInteger(v.x)&&Number.isInteger(v.y)&&v.x>=0&&v.x<=3&&v.y>=0&&v.y<=5&&!s.battle&&!s.plan.some((p,i)=>i!==s.selected&&p.x===v.x&&p.y===v.y)){s.plan[s.selected]={...s.plan[s.selected],x:v.x,y:v.y};s.units=makeArmy(s.plan);s.failed=false;ok=true;}
  if(k==='launch'&&!s.battle&&!s.failed){s.units=makeArmy(s.plan);s.battle=true;s.elapsed=0;s.effects=[];ok=true;}
  if(k==='retry'){s.units=makeArmy(s.plan);s.battle=false;s.elapsed=0;s.effects=[];s.failed=false;ok=true;}
  if(k==='speed'&&[1,2].includes(v)){s.speed=v;ok=true;}
 }
 if(s.id==='receiver'){
  if(['frequency','phase','width'].includes(k)&&finite(v)){s[k]=k==='frequency'?clamp(v,88,108):k==='phase'?mod(v,360):clamp(v,.1,2);s.stability=0;ok=true;}
  if(k==='channel'&&Number.isInteger(v)&&v>=0&&v<3){s.channel=v;s.stability=0;ok=true;}
  if(k==='launch'){s.running=!s.running;ok=true;}
  if(k==='capture'){if(s.found[s.channel])return false;if(s.stability<1.2-1e-6||radioQuality(s)<.84){s.message='信号还不够稳定。对齐频率、相位和带宽后再记录。';return false;}s.found[s.channel]=true;s.stability=0;s.won=s.found.every(Boolean);s.message=s.won?'三座信标已在夜色里接通。':'这个频道已记录，继续调谐下一座信标。';ok=true;}
 }
 if(ok&&!['orbit','zoom','fire'].includes(k)){s.moves++;if(!['hint','capture'].includes(k))s.message='';}return ok;
}
function cubeStep(s,dt){if(!s.turn)return;s.turn.time=Math.min(.38,s.turn.time+dt);if(s.turn.time<.38-1e-7)return;const t=s.turn;twistCube(s.cubies,t.face,t.dir);const last=s.path.at(-1);if(last?.face===t.face&&last.dir===-t.dir)s.path.pop();else s.path.push({face:t.face,dir:t.dir});if(t.undo)s.history.pop();else s.history.push({face:t.face,dir:t.dir});s.turn=null;s.won=cubeSolved(s.cubies);if(s.won)s.message='六面珐琅再次回到了各自的光。';}
function effectsStep(s,dt){for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0).slice(-64);}
function orbiterStep(s,dt){if(!s.running||s.failed)return;s.elapsed+=dt;s.cooldown=Math.max(0,s.cooldown-dt);effectsStep(s,dt);while(s.spawned<12&&s.elapsed>=.6+s.spawned*.9){const i=s.spawned++;s.enemies.push({id:i,lane:ORBIT_WAVE[i],r:72,hp:i%4===3?2:1,speed:14+i%3*2});}if(s.autofire)commandCircuitry(s,'fire');for(const shot of s.shots)shot.r-=500*dt;for(const e of s.enemies)e.r+=e.speed*dt;
 for(const shot of s.shots){const e=s.enemies.find(e=>e.hp>0&&e.lane===shot.lane&&Math.abs(e.r-shot.r)<15);if(e){e.hp--;shot.r=-1;s.effects.push({lane:e.lane,r:e.r,life:.35,hit:true});if(!e.hp)s.kills++;}}
 for(const e of s.enemies)if(e.hp>0&&e.r>=ORBIT_RADIUS-8){e.hp=0;s.hp--;s.escaped++;s.effects.push({lane:e.lane,r:ORBIT_RADIUS,life:.5,hit:false});}
 s.shots=s.shots.filter(v=>v.r>50);s.enemies=s.enemies.filter(e=>e.hp>0);if(s.hp<=0){s.hp=0;s.failed=true;s.running=false;s.message='三个探机越过了外环。换轨瞄准正在靠近的目标，再试一次。';}else if(s.spawned===12&&!s.enemies.length){s.won=s.kills>=10;s.running=false;if(!s.won)s.failed=true;s.message=s.won?'十二条径向航道已清空。':'清除数量不足，请重新守住外环。';}}
const cellKey=(x,y)=>x+','+y;
function routeStep(s,u,target,range){const occupied=new Set();for(const p of s.units)if(p!==u&&p.hp>0){occupied.add(cellKey(p.x,p.y));if(p.moving)occupied.add(cellKey(p.moving.x,p.moving.y));}const queue=[{x:u.x,y:u.y,first:null}],seen=new Set([cellKey(u.x,u.y)]);
 for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.hypot(p.x-target.x,p.y-target.y)<=range&&p.first)return p.first;const neighbors=[[1,0],[0,-1],[0,1],[-1,0]].map(([x,y])=>({x:p.x+x,y:p.y+y})).sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y));for(const n of neighbors){const k=cellKey(n.x,n.y);if(n.x<0||n.x>8||n.y<0||n.y>5||seen.has(k)||occupied.has(k))continue;seen.add(k);queue.push({...n,first:p.first||n});}}return null;}
export function unitPosition(u){return u.moving?{x:u.x+(u.moving.x-u.x)*u.moving.progress,y:u.y+(u.moving.y-u.y)*u.moving.progress}:{x:u.x,y:u.y};}
function automataStep(s,dt){if(!s.battle||s.failed)return;s.elapsed+=dt;effectsStep(s,dt);for(const u of s.units){if(u.hp<=0)continue;u.cooldown=Math.max(0,u.cooldown-dt);if(u.moving){u.moving.progress+=dt/.48;if(u.moving.progress>=1){u.x=u.moving.x;u.y=u.moving.y;u.moving=null;}continue;}
  const spec=UNIT_TYPES[u.kind],friends=s.units.filter(p=>p.team===u.team&&p.hp>0),enemies=s.units.filter(p=>p.team!==u.team&&p.hp>0);if(!enemies.length)break;
  if(u.kind==='mender'&&u.mana>0&&u.cooldown<=0){const ally=friends.filter(p=>p.hp<UNIT_TYPES[p.kind].hp*(p.team?.8:1)-10&&dist(u,p)<=3.05).sort((a,b)=>a.hp/UNIT_TYPES[a.kind].hp-b.hp/UNIT_TYPES[b.kind].hp)[0];if(ally){ally.hp=Math.min(UNIT_TYPES[ally.kind].hp*(ally.team?.8:1),ally.hp+21);u.mana--;u.cooldown=1;s.effects.push({x:u.x,y:u.y,tx:ally.x,ty:ally.y,life:.42,heal:true});continue;}}
  const target=enemies.sort((a,b)=>dist(u,a)-dist(u,b)||a.id-b.id)[0];if(dist(u,target)<=spec.range){if(u.cooldown<=0){const damage=Math.max(1,spec.damage*(u.team?.82:1)-UNIT_TYPES[target.kind].armor);target.hp=Math.max(0,target.hp-damage);u.cooldown=spec.cooldown;s.effects.push({x:u.x,y:u.y,tx:target.x,ty:target.y,life:.32,heal:false,team:u.team});}}else{const next=routeStep(s,u,target,spec.range);if(next)u.moving={...next,progress:0};}}
 const allies=s.units.slice(0,3).some(u=>u.hp>0),enemy=s.units.slice(3).some(u=>u.hp>0);if(!enemy&&allies){s.won=true;s.battle=false;s.message='布阵变成了队伍自动完成的配合。';}else if(!allies||s.elapsed>=45){s.failed=true;s.battle=false;s.message=allies?'双方陷入僵局，保留布阵重试。':'队伍失利了。让守卫靠前，电弩与修复保持在后排。';}}
export function radioQuality(s){const c=RADIO_CHANNELS[s.channel],drift=.035*Math.sin(s.time*.7+s.channel),df=(s.frequency-c.frequency-drift)/.23,dp=Math.min(mod(s.phase-c.phase,360),mod(c.phase-s.phase,360))/25,dw=(s.width-.35)/.3;return Math.exp(-df*df)*(.25+.75*Math.exp(-dp*dp))*(.4+.6*Math.exp(-dw*dw));}
function receiverStep(s,dt){if(!s.running||s.found[s.channel])return;s.stability=radioQuality(s)>.84?Math.min(1.2,s.stability+dt):Math.max(0,s.stability-dt*2);}
export function stepCircuitry(s,dt,input={}){if(s.won)return;dt=clamp(finite(dt)?dt:0,0,.1);const rate=s.id==='automata'?s.speed:1;for(let left=dt*rate;left>1e-7;){const d=Math.min(1/60,left);left-=d;s.time+=d;if(s.id==='prismcube')cubeStep(s,d);if(s.id==='orbiter')orbiterStep(s,d);if(s.id==='automata')automataStep(s,d);if(s.id==='receiver')receiverStep(s,d);if(s.won)break;}}
