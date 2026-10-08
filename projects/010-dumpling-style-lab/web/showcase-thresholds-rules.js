export const THRESHOLDS_IDS=['inverter','phasewalk','transit','cantor'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=v=>typeof v==='number'&&Number.isFinite(v),clone=v=>structuredClone(v),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rect=(x,y,w,h)=>({x,y,w,h});
export const GRAVITY_SOLIDS=[rect(60,520,1000,18),rect(60,130,1000,16),rect(430,310,30,210)];
export const GRAVITY_HAZARDS=[rect(260,490,130,30),rect(500,146,150,29),rect(720,490,120,30)];
export const GRAVITY_ORBS=[{x:310,y:178},{x:580,y:488},{x:880,y:178}];
export const PHASE_COMMON=[rect(60,510,175,20),rect(950,510,110,20)];
export const PHASE_PLATFORMS=[[rect(270,450,175,22),rect(675,330,175,22)],[rect(465,390,190,22),rect(850,450,120,22)]];
export const PHASE_ORBS=[{x:370,y:416,phase:0},{x:550,y:356,phase:1},{x:750,y:296,phase:0},{x:960,y:416,phase:1}];
export const PORTAL_ENTRIES=[320,400,460],PORTAL_EXITS=[220,260,340],PORTAL_ORBS=[{x:460,y:475},{x:800,y:270},{x:985,y:298}];
export const NOTE_FREQUENCIES=[146.832,220,329.628],VOICE_CUES=NOTE_FREQUENCIES.map((frequency,i)=>({x:360+i*260,frequency}));
export function pitchHeight(f,base=110){return 460-320*clamp(Math.log2(Math.max(1,f)/base)/2,0,1);}
const person=(x,y)=>({x,y,vx:0,vy:0,onGround:true,dir:1,travel:0});
export function freshThresholds(id){const c={id,version:1,time:0,moves:0,won:false,failed:false,message:'',trace:[]};
 if(id==='inverter')return {...c,p:person(140,496),gravity:1,orbs:[false,false,false],flips:0,checkpoint:0};
 if(id==='phasewalk')return {...c,p:person(130,486),phase:0,blend:0,orbs:[false,false,false,false],swaps:0,checkpoint:{x:130,y:486,phase:0},peek:false};
 if(id==='transit')return {...c,p:{x:155,y:323,vx:0,vy:0,onGround:true,spin:0},entry:0,exit:2,running:false,orbs:[false,false,false],transits:0,cooldown:0,lastTransfer:null};
 if(id==='cantor')return {...c,p:{x:100,y:460},orbs:[false,false,false],progress:[0,0,0],running:false,base:110,frequency:0,rms:0,confidence:0,inputSource:'keyboard'};
 throw Error('Unknown form '+id);
}
function overlaps(p,r,hx=12,hy=24){return p.x+hx>r.x&&p.x-hx<r.x+r.w&&p.y+hy>r.y&&p.y-hy<r.y+r.h;}
export function restoreThresholds(id,raw){const b=freshThresholds(id),r=raw?.state??raw;if(!r||r.id!==id||r.version!==1)return b;try{
 if(!finite(r.time)||r.time<0||!Number.isInteger(r.moves)||r.moves<0||typeof r.failed!=='boolean'||typeof r.message!=='string'||!r.p||!finite(r.p.x)||!finite(r.p.y)||Math.abs(r.p.x)>1200||Math.abs(r.p.y)>1000||!Array.isArray(r.orbs)||r.orbs.length!==b.orbs.length||r.orbs.some(v=>typeof v!=='boolean'))return b;
 if(id!=='cantor'&&(!finite(r.p.vx)||!finite(r.p.vy)||Math.abs(r.p.vx)>2000||Math.abs(r.p.vy)>2000||typeof r.p.onGround!=='boolean'))return b;
 if(['inverter','phasewalk'].includes(id)&&(!finite(r.p.travel)||r.p.travel<0||![1,-1].includes(r.p.dir)))return b;
 if(id==='transit'&&(!finite(r.p.spin)||typeof r.running!=='boolean'||r.lastTransfer&&(!finite(r.lastTransfer.speedBefore)||!finite(r.lastTransfer.speedAfter))))return b;
 if(id==='cantor'&&typeof r.running!=='boolean')return b;
 if(id==='inverter'&&(![1,-1].includes(r.gravity)||!Number.isInteger(r.flips)||![0,1].includes(r.checkpoint)))return b;
 if(id==='phasewalk'&&(![0,1].includes(r.phase)||!Number.isInteger(r.swaps)||r.swaps<0||!finite(r.blend)||r.blend<0||r.blend>1||!r.checkpoint||!['x','y','phase'].every(k=>finite(r.checkpoint[k]))||![0,1].includes(r.checkpoint.phase)||r.checkpoint.x<60||r.checkpoint.x>1060||r.checkpoint.y<100||r.checkpoint.y>510))return b;
 if(id==='transit'&&(![0,1,2].includes(r.entry)||![0,1,2].includes(r.exit)||!finite(r.transits)||!finite(r.cooldown)))return b;
 if(id==='cantor'&&(!finite(r.base)||r.base<65||r.base>330||!Array.isArray(r.progress)||r.progress.length!==3||r.progress.some(v=>!finite(v)||v<0||v>.7)))return b;
 Object.assign(b,clone(r));b.trace=Array.isArray(r.trace)?r.trace.slice(-64).filter(p=>p&&finite(p.x)&&finite(p.y)):[];
 if(id==='phasewalk')b.peek=false;
 if(id==='cantor'){b.frequency=0;b.rms=0;b.confidence=0;b.inputSource='keyboard';}
 b.won=b.orbs.every(Boolean)&&(id==='inverter'?b.p.x>=985&&b.p.y<210:id==='phasewalk'?b.p.x>=985&&b.p.onGround&&b.p.y>450:id==='transit'?b.p.x>=985&&b.p.onGround&&Math.abs(b.p.y-298)<3:b.p.x>=995);return b;
 }catch{return freshThresholds(id);}}
export function commandThresholds(s,k,v){if(k==='restart'){Object.assign(s,freshThresholds(s.id));return true;}if(s.won&&!['tone','sample','peek'].includes(k))return false;let ok=false;
 if(k==='retry'){
  s.failed=false;s.trace=[];if(s.id==='inverter'){s.p=person(s.checkpoint?670:140,496);s.gravity=1;}
  if(s.id==='phasewalk'){s.p=person(s.checkpoint.x,s.checkpoint.y);s.phase=s.checkpoint.phase;s.blend=s.phase;}
  if(s.id==='transit'){s.p={x:155,y:323,vx:0,vy:0,onGround:true,spin:0};s.orbs=[false,false,false];s.running=false;s.cooldown=0;}
  if(s.id==='cantor'){s.p={x:100,y:460};s.orbs=[false,false,false];s.progress=[0,0,0];s.running=false;s.frequency=s.rms=s.confidence=0;}
  ok=true;
 }
 if(s.id==='inverter'&&k==='flip'&&s.p.onGround&&!s.failed){s.gravity*=-1;s.p.onGround=false;s.p.vy=0;s.flips++;ok=true;}
 if(s.id==='phasewalk'){
  if(k==='jump'&&s.p.onGround&&!s.failed){s.p.vy=-355;s.p.onGround=false;ok=true;}
  if(k==='swap'&&!s.failed){const next=1-s.phase;if(PHASE_PLATFORMS[next].some(r=>overlaps(s.p,r))){s.message='另一层的石台占据了这里，跳离后再切换。';return false;}s.phase=next;s.swaps++;s.p.onGround=false;ok=true;}
  if(k==='peek'){s.peek=!!v;ok=true;}
 }
 if(s.id==='transit'){
  if(['entry','exit'].includes(k)&&Number.isInteger(v)&&v>=0&&v<=2&&!s.running){s[k]=v;ok=true;}
  if(k==='launch'&&!s.running&&!s.failed){s.running=true;ok=true;}
  if(k==='edit'){s.running=false;s.failed=false;s.p={x:155,y:323,vx:0,vy:0,onGround:true,spin:0};s.orbs=[false,false,false];s.cooldown=0;ok=true;}
 }
 if(s.id==='cantor'){
  if(k==='launch'&&!s.failed){s.running=!s.running;ok=true;}
  if(k==='tone'&&finite(v)&&v>=0&&v<=1000){s.inputSource='keyboard';s.frequency=v;s.rms=v?.12:0;s.confidence=v?1:0;ok=true;}
  if(k==='sample'&&v&&finite(v.frequency)&&finite(v.rms)&&finite(v.confidence)&&v.frequency>=0&&v.frequency<=1000){s.inputSource='microphone';s.frequency=v.frequency;s.rms=clamp(v.rms,0,1);s.confidence=clamp(v.confidence,0,1);ok=true;}
  if(k==='calibrate'&&s.frequency>65&&s.confidence>.8){s.base=clamp(s.frequency,65,330);s.message='已把当前舒适音高设为最低音。依次提高四度、再五度，匹配三枚音环。';ok=true;}
  if(k==='base'&&finite(v)){s.base=clamp(v,65,330);ok=true;}
 }
 if(ok&&!['sample','tone','peek'].includes(k)){s.moves++;if(k!=='calibrate')s.message='';}return ok;
}
function collidePerson(s,dt,x,solids,g=1){const p=s.p,oldX=p.x;p.vx=clamp(x||0,-1,1)*180;p.x=clamp(p.x+p.vx*dt,72,1048);for(const r of solids)if(overlaps(p,r)){p.x=p.vx>0?r.x-12:r.x+r.w+12;p.vx=0;}p.travel+=Math.abs(p.x-oldX);if(p.x!==oldX)p.dir=Math.sign(p.x-oldX);
 const oldY=p.y;p.vy+=g*740*dt;p.y+=p.vy*dt;p.onGround=false;for(const r of solids){if(p.x+12<=r.x||p.x-12>=r.x+r.w)continue;
  if(p.vy>=0&&oldY+24<=r.y+.1&&p.y+24>=r.y){p.y=r.y-24;p.vy=0;p.onGround=g>0;}
  else if(p.vy<0&&oldY-24>=r.y+r.h-.1&&p.y-24<=r.y+r.h){p.y=r.y+r.h+24;p.vy=0;p.onGround=g<0;}
 }
}
function inverterStep(s,dt,input){if(s.failed)return;collidePerson(s,dt,input.x,GRAVITY_SOLIDS,s.gravity);if(GRAVITY_HAZARDS.some(r=>overlaps(s.p,r,10,21))){s.failed=true;s.message='碰到了荆棘。落在安全台面后翻转重力，绕过上下障碍。';}
 GRAVITY_ORBS.forEach((p,i)=>{if(dist(s.p,p)<29)s.orbs[i]=true;});if(s.orbs[1])s.checkpoint=1;if(s.orbs.every(Boolean)&&s.p.x>=985&&s.p.y<210){s.won=true;s.message='地面与天花板，成为同一条归途。';}}
function phaseStep(s,dt,input){s.blend+=(s.phase-s.blend)*(1-Math.exp(-8*dt));if(s.failed)return;collidePerson(s,dt,input.x,[...PHASE_COMMON,...PHASE_PLATFORMS[s.phase]]);PHASE_ORBS.forEach((p,i)=>{if(p.phase===s.phase&&dist(s.p,p)<31){s.orbs[i]=true;if(s.p.onGround)s.checkpoint={x:s.p.x,y:s.p.y,phase:s.phase};}});if(s.p.y>585){s.failed=true;s.message='这一层没有支撑。跳跃时切换到下一段石台所在的世界。';}if(s.orbs.every(Boolean)&&s.p.x>=985&&s.p.onGround&&s.p.y>450){s.won=true;s.message='两个世界共同拼成了归路。';}}
export function portalTransfer(p,from,to){const t={x:from.ny,y:-from.nx},u={x:to.ny,y:-to.nx},offset=(p.x-from.x)*t.x+(p.y-from.y)*t.y,along=p.vx*t.x+p.vy*t.y,normal=p.vx*from.nx+p.vy*from.ny;return {x:to.x-u.x*offset+to.nx*18,y:to.y-u.y*offset+to.ny*18,vx:-along*u.x-normal*to.nx,vy:-along*u.y-normal*to.ny,onGround:false,spin:p.spin};}
export function portalPair(s){return [{x:PORTAL_ENTRIES[s.entry],y:520,nx:0,ny:-1},{x:620,y:PORTAL_EXITS[s.exit],nx:1,ny:0}];}
function transitStep(s,dt,input){if(!s.running||s.failed)return;const p=s.p,old={...p},x=clamp(input.x||0,-1,1);s.cooldown=Math.max(0,s.cooldown-dt);p.vx=clamp(p.vx+x*(p.onGround?470:110)*dt,-650,650);if(!x)p.vx*=Math.exp(-dt*(p.onGround?4:.25));p.vy+=700*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.spin+=(p.x-old.x)/17;p.onGround=false;
 let transferred=false;const portals=portalPair(s);if(s.cooldown===0)for(let i=0;i<2;i++){const a=portals[i],oldD=(old.x-a.x)*a.nx+(old.y-a.y)*a.ny,newD=(p.x-a.x)*a.nx+(p.y-a.y)*a.ny,tangent=(p.x-a.x)*a.ny-(p.y-a.y)*a.nx;if(oldD>=17&&newD<17&&Math.abs(tangent)<57){const before={vx:p.vx,vy:p.vy},out=portalTransfer(p,a,portals[1-i]);Object.assign(p,out);transferred=true;s.cooldown=.25;s.transits++;s.lastTransfer={from:i,before,after:{vx:p.vx,vy:p.vy},speedBefore:Math.hypot(before.vx,before.vy),speedAfter:Math.hypot(p.vx,p.vy)};break;}}
 // Solid launch ledge, target platform, wall frame and bottom floor.
 if(!transferred)for(const r of [rect(70,340,165,20),rect(830,315,230,22)])if(p.vy>=0&&old.y+17<=r.y+.1&&p.y+17>=r.y&&p.x+17>r.x&&p.x-17<r.x+r.w){p.y=r.y-17;p.vy=0;p.onGround=true;}
 if(p.x<60){p.x=60;p.vx=0;}if(p.x>1043){p.x=1043;p.vx=0;}
 if(s.cooldown===0&&p.x<637&&p.x>583&&p.y>140&&p.y<530){if(Math.abs(p.y-portals[1].y)>=57||p.vx>0){p.x=old.x<600?583:637;p.vx=0;}}
 if(p.y>513){p.y=513;p.vy=0;s.failed=true;s.running=false;s.message='落在底层了。调整入口与出口，让下落速度转成冲向高台的惯性。';}
 PORTAL_ORBS.forEach((v,i)=>{if(dist(p,v)<34)s.orbs[i]=true;});if(s.orbs.every(Boolean)&&p.x>=985&&p.onGround&&Math.abs(p.y-298)<3){s.won=true;s.running=false;s.message='坠落没有结束，而是换了一个方向。';}}
function cantorStep(s,dt){if(!s.running||s.failed)return;const voiced=s.frequency>65&&s.rms>.012&&s.confidence>.75;if(voiced){const target=pitchHeight(s.frequency,s.base);s.p.y+=(target-s.p.y)*(1-Math.exp(-5*dt));s.p.x+=90*dt;}else s.p.y+=(460-s.p.y)*(1-Math.exp(-1.6*dt));
 VOICE_CUES.forEach((v,i)=>{const frequency=v.frequency*s.base/110,y=pitchHeight(frequency,s.base);if(!s.orbs[i]&&Math.abs(s.p.x-v.x)<58&&Math.abs(s.p.y-y)<27&&voiced){s.progress[i]=Math.min(.7,s.progress[i]+dt);if(s.progress[i]>=.7-1e-6)s.orbs[i]=true;}else if(!s.orbs[i])s.progress[i]=Math.max(0,s.progress[i]-dt*.7);if(!s.orbs[i]&&s.p.x>v.x+65){s.failed=true;s.running=false;s.message='错过音环了。先匹配音高，再持续飞过；松开音符或停止哼唱会停下前进。';}});
 if(s.orbs.every(Boolean)&&s.p.x>=995){s.won=true;s.running=false;s.message='三段音高，托起了一段航程。';}}
export function stepThresholds(s,dt,input={}){if(s.won)return;dt=clamp(finite(dt)?dt:0,0,.1);for(let left=dt;left>1e-7;){const d=Math.min(1/60,left);left-=d;s.time+=d;if(s.id==='inverter')inverterStep(s,d,input);if(s.id==='phasewalk')phaseStep(s,d,input);if(s.id==='transit')transitStep(s,d,input);if(s.id==='cantor')cantorStep(s,d);if(!s.failed&&(s.id!=='transit'||s.running)&&(s.id!=='cantor'||s.running)){const last=s.trace.at(-1);if(!last||dist(last,s.p)>8){s.trace.push({x:s.p.x,y:s.p.y});if(s.trace.length>64)s.trace.shift();}}if(s.won)break;}}
