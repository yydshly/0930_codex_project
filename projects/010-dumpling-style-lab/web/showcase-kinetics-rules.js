// Each scene has its own participation model. Visuals never determine success.
export const KINETICS_IDS=['ribbon','rescue','rewind','nested'];
export const WIND_STARS=[{x:330,y:298},{x:550,y:251},{x:785,y:212}];
export const WIND_ROUTE=[{x:155,y:356},{x:330,y:316},{x:550,y:269},{x:785,y:230},{x:995,y:230}];
export const SCALE=8,BRIDGE_LENGTH=1.8,BRIDGE_WIDTH=.85;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=v=>typeof v==='number'&&Number.isFinite(v),clone=v=>structuredClone(v),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=v=>v&&finite(v.x)&&finite(v.y),screen=v=>({x:clamp(v.x,40,1080),y:clamp(v.y,100,550)});
export function freshKinetics(id){
 const common={id,version:1,moves:0,won:false,failed:false,message:'',time:0};
 if(id==='ribbon')return {...common,lines:[],drawing:false,ink:1500,ball:{x:155,y:338,vx:0,vy:0,spin:0,rail:null},stars:[false,false,false],running:false,dash:0};
 if(id==='rescue')return {...common,workers:[],spawned:0,spawnClock:0,running:false,selected:0,tools:{builder:1,digger:1,blocker:2},stairs:null,wall:{open:false,progress:0},rescued:0,lost:0};
 if(id==='rewind'){const world={time:0,player:{x:105,y:344,vx:0,vy:0,onGround:true,dir:1},bridgeY:344,triggered:false,countdown:1,weight:{x:610,y:344,vy:0,angle:0},gateOpen:false};return {...common,world,persistent:{crystal:false,sealed:false},history:[clone(world)],recordClock:0,rewinding:false,rewindClock:0};}
 if(id==='nested')return {...common,bridges:[{mx:-3.9/SCALE,mz:1.1/SCALE,angle:Math.PI/2},{mx:3.9/SCALE,mz:1.1/SCALE,angle:Math.PI/2}],selected:0,mode:'model',actor:{x:-4.2,z:0,y:0,vy:0},yaw:.53,pitch:.69,zoom:1,history:[]};
 throw Error('Unknown kinetics scene: '+id);
}
function validWorld(w){return w&&finite(w.time)&&w.player&&['x','y','vx','vy'].every(k=>finite(w.player[k]))&&finite(w.bridgeY)&&finite(w.countdown)&&w.weight&&['x','y','vy','angle'].every(k=>finite(w.weight[k]))&&w.player.x>=40&&w.player.x<=1080&&w.player.y>=0&&w.player.y<=600&&w.bridgeY>=344&&w.bridgeY<=560;}
export function restoreKinetics(id,raw){
 const base=freshKinetics(id),r=raw?.state??raw;if(!r||r.id!==id)return base;
 try{
  if(!finite(r.moves)||!finite(r.time))return base;
  if(id==='ribbon'){
   if(!Array.isArray(r.lines)||r.lines.length>32||r.lines.some(v=>!Array.isArray(v)||v.length>256||v.some(p=>!point(p)||p.x<40||p.x>1080||p.y<100||p.y>550))||!point(r.ball)||!finite(r.ball.vx)||!finite(r.ball.vy)||!Array.isArray(r.stars)||r.stars.length!==3)return base;
   const used=r.lines.reduce((a,line)=>a+line.reduce((n,p,i)=>n+(i?dist(p,line[i-1]):0),0),0);if(used>1500.01)return base;
   Object.assign(base,clone(r),{drawing:false,ink:1500-used,dash:0});base.ball.rail=null;base.won=base.stars.every(Boolean)&&dist(base.ball,{x:995,y:212})<32;base.failed=!!r.failed;base.running=!!r.running&&!base.won&&!base.failed;
  }
  if(id==='rescue'){
   if(!Array.isArray(r.workers)||r.workers.length>12||r.workers.some(w=>!point(w)||!finite(w.vy)||!['walk','builder','digger','blocker'].includes(w.role)||!['live','rescued','lost'].includes(w.status))||!finite(r.spawned)||r.spawned!==r.workers.length||!r.tools||Object.values(r.tools).some(v=>!Number.isInteger(v)||v<0||v>2)||!r.wall||!finite(r.wall.progress)||r.stairs&&(!finite(r.stairs.base)||!finite(r.stairs.progress)||r.stairs.base<245||r.stairs.base>320))return base;
   Object.assign(base,clone(r));base.selected=clamp(Math.floor(r.selected)||0,0,11);base.rescued=base.workers.filter(w=>w.status==='rescued').length;base.lost=base.workers.filter(w=>w.status==='lost').length;base.won=base.rescued>=10&&base.rescued+base.lost===12;base.failed=base.lost>2;base.running=!!r.running&&!base.won&&!base.failed;
  }
  if(id==='rewind'){
   if(!validWorld(r.world)||!r.persistent||!Array.isArray(r.history)||r.history.length>901||!r.history.every(validWorld))return base;
   Object.assign(base,clone(r),{rewinding:false,rewindClock:0,recordClock:0});base.persistent={crystal:!!r.persistent.crystal,sealed:!!r.persistent.crystal&&!!r.persistent.sealed};base.world.gateOpen=base.persistent.sealed&&!!r.world.gateOpen;base.won=base.world.gateOpen&&base.world.player.x>=1030;base.failed=false;
  }
  if(id==='nested'){
   if(!Array.isArray(r.bridges)||r.bridges.length!==2||r.bridges.some(b=>!['mx','mz','angle'].every(k=>finite(b[k]))||Math.abs(b.mx)>.65||Math.abs(b.mz)>.3)||!r.actor||!['x','z','y','vy'].every(k=>finite(r.actor[k]))||!finite(r.yaw)||!finite(r.pitch)||!finite(r.zoom))return base;
   Object.assign(base,clone(r));base.selected=clamp(Math.floor(r.selected)||0,0,1);base.mode=r.mode==='walk'?'walk':'model';base.history=Array.isArray(r.history)?r.history.slice(-40).filter(h=>Array.isArray(h)&&h.length===2&&h.every(b=>['mx','mz','angle'].every(k=>finite(b[k])))):[];base.zoom=clamp(r.zoom,.75,1.4);base.pitch=clamp(r.pitch,.35,1.2);base.won=base.actor.x>=4.15&&Math.abs(base.actor.z)<.7&&Math.abs(base.actor.y)<.05;base.failed=base.actor.y< -3;
  }
  return base;
 }catch{return freshKinetics(id);}
}
function reset(s){Object.assign(s,freshKinetics(s.id));return true;}
export function commandKinetics(s,k,v){
 if(k==='restart')return reset(s);if(s.won&&!['orbit','zoom'].includes(k))return false;
 let ok=false;
 if(s.id==='ribbon'){
  if(k==='begin'&&!s.running&&point(v)&&s.lines.length<32&&s.ink>1){s.lines.push([screen(v)]);s.drawing=true;ok=true;}
  if(k==='stroke'&&s.drawing&&point(v)){
   const line=s.lines.at(-1),p=screen(v),d=dist(line.at(-1),p);if(d>=4&&d<=s.ink&&line.length<256){line.push(p);s.ink-=d;ok=true;}
  }
  if(k==='end'){s.drawing=false;ok=true;}
  if(k==='undo'&&!s.running&&s.lines.length){const line=s.lines.pop();s.ink=Math.min(1500,s.ink+line.reduce((n,p,i)=>n+(i?dist(p,line[i-1]):0),0));s.drawing=false;ok=true;}
  if(k==='clear'&&!s.running){s.lines=[];s.ink=1500;s.drawing=false;ok=true;}
  if(k==='launch'&&!s.running&&s.lines.some(v=>v.length>1)){s.ball={x:155,y:338,vx:0,vy:0,spin:0,rail:null};s.stars=[false,false,false];s.failed=false;s.running=true;s.drawing=false;ok=true;}
  if(k==='edit'){s.running=false;s.failed=false;s.ball={x:155,y:338,vx:0,vy:0,spin:0,rail:null};s.stars=[false,false,false];ok=true;}
  if(k==='dash'&&s.running){s.dash=1;ok=true;}
 }
 if(s.id==='rescue'){
  if(k==='release'&&!s.failed){s.running=!s.running;ok=true;}
  if(k==='select'&&Number.isInteger(v)&&v>=0&&v<s.workers.length){s.selected=v;ok=true;}
  if(k==='skill'&&['builder','digger','blocker','walk'].includes(v)){
   const w=s.workers[s.selected];if(w?.status==='live'){
    if(v==='walk'&&w.role==='blocker'){w.role='walk';ok=true;}
    if(w.role==='walk'&&s.tools[v]>0){
     if(v==='builder'&&!s.stairs&&w.dir===1&&w.x>=245&&w.x<=320&&Math.abs(w.y-250)<6){s.stairs={base:w.x,progress:0,worker:w.index};w.role=v;s.tools[v]--;ok=true;}
     if(v==='digger'&&!s.wall.open&&Math.abs(w.x-805)<48&&Math.abs(w.y-250)<6){w.role=v;s.tools[v]--;ok=true;}
     if(v==='blocker'&&rescueGround(s,w.x)!==null){w.role=v;s.tools[v]--;ok=true;}
    }
   }
   if(!ok)s.message='选择合适位置的队员：造梯在坑边，开凿在石墙前；无效指令不消耗技能。';
  }
 }
 if(s.id==='rewind'){
  if(k==='rewind'){s.rewinding=!!v;s.rewindClock=0;ok=s.history.length>1;}
  if(k==='back'){let n=Math.min(30,s.history.length-1);if(n>0){while(n-->0)s.history.pop();s.world=clone(s.history.at(-1));s.rewindClock=s.recordClock=0;ok=true;}}
  if(k==='jump'&&s.world.player.onGround&&!s.rewinding){s.world.player.vy=-315;s.world.player.onGround=false;ok=true;}
  if(k==='interact'&&!s.rewinding){const p=s.world.player;
   if(!s.persistent.crystal&&dist({x:p.x,y:p.y-29},{x:650,y:528})<35){s.persistent.crystal=true;s.message='晶石不受时间影响。按住 R，带它回到左侧控制台。';ok=true;}
   else if(s.persistent.crystal&&!s.persistent.sealed&&Math.abs(p.x-180)<45&&Math.abs(p.y-344)<6){s.persistent.sealed=true;s.world.bridgeY=344;s.world.triggered=false;s.world.countdown=1;s.message='桥已锁定。走到右侧门前按 E 开门。';ok=true;}
   else if(s.persistent.sealed&&Math.abs(p.x-980)<48&&Math.abs(p.y-344)<6){s.world.gateOpen=true;ok=true;}
   else s.message='E：下层拾晶石 → 回退到左台锁桥 → 右侧开门。';
  }
 }
 if(s.id==='nested'){
  if(k==='select'&&[0,1].includes(v)){s.selected=v;ok=true;}
  if(k==='mode'&&['model','walk'].includes(v)){s.mode=v;ok=true;}
  if(k==='move'&&s.mode==='model'&&v&&finite(v.mx)&&finite(v.mz)){s.bridges[s.selected].mx=clamp(v.mx,-.65,.65);s.bridges[s.selected].mz=clamp(v.mz,-.3,.3);ok=true;}
  if(k==='begin'&&s.mode==='model'){s.history.push(clone(s.bridges));if(s.history.length>40)s.history.shift();ok=true;}
  if(k==='shift'&&s.mode==='model'&&v&&finite(v.x)&&finite(v.z)){s.history.push(clone(s.bridges));if(s.history.length>40)s.history.shift();s.bridges[s.selected].mx=clamp(s.bridges[s.selected].mx+v.x/SCALE,-.65,.65);s.bridges[s.selected].mz=clamp(s.bridges[s.selected].mz+v.z/SCALE,-.3,.3);ok=true;}
  if(k==='rotate'&&s.mode==='model'&&finite(v)){s.history.push(clone(s.bridges));if(s.history.length>40)s.history.shift();s.bridges[s.selected].angle=(s.bridges[s.selected].angle+v)%(Math.PI*2);ok=true;}
  if(k==='undo'&&s.mode==='model'&&s.history.length){s.bridges=s.history.pop();ok=true;}
  if(k==='retry'){s.actor={x:-4.2,z:0,y:0,vy:0};s.failed=false;s.mode='model';ok=true;}
  if(k==='orbit'&&point(v)){s.yaw+=v.x;s.pitch=clamp(s.pitch+v.y,.35,1.2);ok=true;}
  if(k==='zoom'&&finite(v)){s.zoom=clamp(s.zoom+v,.75,1.4);ok=true;}
 }
 if(ok){if(!['stroke','end','rewind','orbit','move'].includes(k))s.moves++;s.message=s.message||'操作已生效';}return ok;
}
function nearestRail(s,p){let best=null;for(let l=0;l<s.lines.length;l++)for(let i=0;i<s.lines[l].length-1;i++){const a=s.lines[l][i],b=s.lines[l][i+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(len*len||1),0,1),q={x:a.x+dx*t,y:a.y+dy*t},d=dist(q,p);if(t>=.999&&i===s.lines[l].length-2)continue;if(d<22&&(!best||d<best.d))best={line:l,index:i,t,d};}return best;}
function windStep(s,dt){if(!s.running||s.failed)return;const b=s.ball;s.dash=Math.max(0,s.dash-dt);if(!b.rail)b.rail=nearestRail(s,{x:b.x,y:b.y+18});
 if(b.rail){let travel=(s.dash>0?175:105)*dt;for(let n=0;n<32&&travel>0&&b.rail;n++){
  const r=b.rail,line=s.lines[r.line],a=line?.[r.index],z=line?.[r.index+1];if(!a||!z){b.rail=null;break;}
  const len=dist(a,z),remaining=len*(1-r.t),take=Math.min(travel,remaining);r.t+=take/(len||1);travel-=take;b.x=a.x+(z.x-a.x)*r.t;b.y=a.y+(z.y-a.y)*r.t-18;b.spin+=take/18;b.vx=(z.x-a.x)/(len||1)*105;b.vy=(z.y-a.y)/(len||1)*105;
  if(r.t>=1-1e-7){if(r.index<line.length-2){r.index++;r.t=0;}else{b.rail=null;b.x+=Math.sign(b.vx||1)*2;break;}}
 }}else{b.vy+=420*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<280&&b.y>=338&&b.vy>=0){b.y=338;b.vy=0;}if(b.x>850&&b.y>=212&&b.vy>=0&&b.y<250){b.y=212;b.vy=0;}}
 WIND_STARS.forEach((p,i)=>{if(dist(b,p)<28)s.stars[i]=true;});if(s.stars.every(Boolean)&&dist(b,{x:995,y:212})<30){s.won=true;s.running=false;s.message='三枚风印已送达。';}if(b.y>590||b.x>1110||b.x<10){s.failed=true;s.running=false;s.message='路线断开了。回到绘制，补上缺口再试。';}
}
export function rescueGround(s,x){let y=x>=60&&x<=330||x>=590&&x<=1060?250:null;if(s.stairs){const st=s.stairs,end=st.base+(610-st.base)*st.progress;if(x>=st.base&&x<=end+2){const top=250-55*(x-st.base)/(610-st.base);y=y===null?top:Math.min(y,top);}}return y;}
function rescueStep(s,dt){if(!s.running||s.failed)return;s.spawnClock-=dt;if(s.spawned<12&&s.spawnClock<=0){const i=s.spawned++;s.workers.push({index:i,x:100,y:250,vy:0,dir:1,role:'walk',status:'live',onGround:true,fallStart:250,travel:0});s.spawnClock+=1.4;}
 if(s.stairs&&s.stairs.progress<1){s.stairs.progress=Math.min(1,s.stairs.progress+dt/4);const w=s.workers[s.stairs.worker];if(w?.status==='live'){w.x=s.stairs.base+(610-s.stairs.base)*s.stairs.progress;w.y=250-55*s.stairs.progress;w.travel+=dt*45;if(s.stairs.progress===1)w.role='walk';}}
 const diggers=s.workers.filter(w=>w.status==='live'&&w.role==='digger');if(diggers.length){s.wall.progress=Math.min(1,s.wall.progress+dt/2.5);if(s.wall.progress===1){s.wall.open=true;diggers.forEach(w=>w.role='walk');}}
 for(const w of s.workers){if(w.status!=='live'||['builder','digger','blocker'].includes(w.role))continue;
  let nx=w.x+w.dir*38*dt;if(nx<61){nx=61;w.dir=1;}if(!s.wall.open&&nx>=790&&nx<=863&&w.y>185){nx=w.dir>0?790:863;w.dir*=-1;}
  for(const b of s.workers)if(b!==w&&b.status==='live'&&b.role==='blocker'&&Math.abs(b.y-w.y)<20&&(w.x-b.x)*(nx-b.x)<=0&&Math.abs(w.x-b.x)<15){nx=w.x;w.dir*=-1;}
  w.travel+=Math.abs(nx-w.x);w.x=nx;const ground=rescueGround(s,w.x);
  if(ground!==null&&w.onGround&&Math.abs(ground-w.y)<7){w.y=ground;w.vy=0;}
  else{if(w.onGround){w.fallStart=w.y;w.onGround=false;}const oldY=w.y;w.vy+=620*dt;w.y+=w.vy*dt;if(ground!==null&&w.vy>=0&&oldY<=ground+5&&w.y>=ground){if(ground-w.fallStart>105){w.status='lost';s.lost++;}else{w.y=ground;w.vy=0;w.onGround=true;}}}
  if(w.y>560){w.status='lost';s.lost++;}if(w.status==='live'&&w.x>=1020&&Math.abs(w.y-250)<7){w.status='rescued';s.rescued++;}
 }
 if(s.lost>2){s.failed=true;s.running=false;s.message='损失超过两人。重开后在队伍到达坑边前安排造梯。';}if(s.rescued+s.lost===12&&s.rescued>=10){s.won=true;s.running=false;s.message='救援队抵达出口。';}
}
function rewindStep(s,dt,input){
 if(s.rewinding){s.rewindClock+=dt*60;let count=Math.floor(s.rewindClock);s.rewindClock-=count;while(count-->0&&s.history.length>1)s.history.pop();s.world=clone(s.history.at(-1));s.recordClock=0;return;}
 const w=s.world,p=w.player,oldBridge=w.bridgeY;w.time+=dt;p.vx=clamp(input.x||0,-1,1)*180;if(p.vx)p.dir=Math.sign(p.vx);
 if(!s.persistent.sealed&&!w.triggered&&p.x>450&&p.x<510&&p.y<355){w.triggered=true;w.countdown=1;}
 if(s.persistent.sealed){w.bridgeY=344;w.triggered=false;}else if(w.triggered){w.countdown-=dt;if(w.countdown<=0)w.bridgeY=Math.min(560,w.bridgeY+280*dt);}
 if(p.onGround&&p.x>254&&p.x<838)p.y+=w.bridgeY-oldBridge;
 let nx=clamp(p.x+p.vx*dt,60,1050);if(p.y>355){if(nx<264)nx=264;if(nx>828)nx=828;}if(!w.gateOpen&&nx>968&&p.y<355)nx=968;p.x=nx;
 const floor=p.x<254||p.x>838?344:Math.min(560,w.bridgeY),oldY=p.y;
 if(p.onGround&&Math.abs(p.y-floor)<7){p.y=floor;p.vy=0;}else{p.onGround=false;p.vy+=800*dt;p.y+=p.vy*dt;if(p.vy>=0&&oldY<=floor+5&&p.y>=floor){p.y=floor;p.vy=0;p.onGround=true;}}
 if(w.weight.y<560){w.weight.vy+=780*dt;w.weight.y=Math.min(w.bridgeY,w.weight.y+w.weight.vy*dt);w.weight.angle+=dt*.7;if(w.weight.y===w.bridgeY)w.weight.vy=0;}
 if(w.gateOpen&&p.x>=1030){s.won=true;s.message='你把下层的时间带回了上层。';}
 s.recordClock+=dt;if(s.recordClock>=1/30){s.recordClock-=1/30;s.history.push(clone(w));if(s.history.length>901)s.history.shift();}
}
export function nestedSupport(s,x,z){
 if(Math.abs(z)<=2&&(x>=-5&&x<=-2||x>=2&&x<=5)||Math.abs(x)<=.7&&Math.abs(z)<=1)return true;
 return s.bridges.some(b=>{const dx=x-b.mx*SCALE,dz=z-b.mz*SCALE,c=Math.cos(b.angle),n=Math.sin(b.angle);return Math.abs(dx*c+dz*n)<=BRIDGE_LENGTH/2+.025&&Math.abs(-dx*n+dz*c)<=BRIDGE_WIDTH/2+.015;});
}
function nestedStep(s,dt,input){if(s.mode!=='walk'||s.failed)return;const a=s.actor,x=clamp(input.x||0,-1,1),z=clamp(input.z??input.y??0,-1,1),length=Math.max(1,Math.hypot(x,z));a.x=clamp(a.x+x/length*1.6*dt,-5.4,5.4);a.z=clamp(a.z+z/length*1.6*dt,-2.5,2.5);if(nestedSupport(s,a.x,a.z)&&a.y>=-.03){a.y=0;a.vy=0;}else{a.vy-=7*dt;a.y+=a.vy*dt;if(a.y< -3){s.failed=true;s.message='通路有缺口。回到模型调整桥，庭院会同步改变。';}}
 if(a.x>=4.15&&Math.abs(a.z)<.7&&Math.abs(a.y)<.05){s.won=true;s.message='你在小模型上搭出的路，已在大庭院里走通。';}
}
export function stepKinetics(s,dt,input={}){if(s.won)return;dt=clamp(finite(dt)?dt:0,0,.1);for(let left=dt;left>1e-7;){const d=Math.min(left,1/60);left-=d;s.time+=d;if(s.id==='ribbon')windStep(s,d);if(s.id==='rescue')rescueStep(s,d);if(s.id==='rewind')rewindStep(s,d,input);if(s.id==='nested')nestedStep(s,d,input);if(s.won)break;}}
