import {W,H,clamp,images,canvasSurface,action} from './showcase-core.js';
import {precisionPanel,pointerPosition,inscription,endCard} from './showcase-precision-kit.js';

export const POOL_RADIUS=13,POOL_BOUNDS={left:141,right:979,top:112,bottom:488};
export const POOL_POCKETS=[{x:137,y:106},{x:560,y:101},{x:983,y:106},{x:137,y:494},{x:560,y:499},{x:983,y:494}];
const COLORS=['#eee9d4','#e8b92e','#3d69b4','#c44635','#864391','#dd722f','#258773','#8d353b','#171c21','#e5bb37','#426bb8','#cb453a','#824996','#d87c36','#2e8c75','#943b44'];
const ball=(id,x,y)=>({id,x,y,vx:0,vy:0,spin:0,potted:false});
export function poolFresh(mode='practice'){
 const balls=[ball(0,355,340)];
 if(mode==='rack'){for(let row=0,id=1;row<5;row++)for(let col=0;col<=row;col++)balls.push(ball(id++,730+row*23.2,315+(col-row/2)*26.8))}
 else [[240,216],[540,178],[885,184],[812,425],[545,427],[252,417]].forEach(([x,y],i)=>balls.push(ball(i+1,x,y)));
 return {version:1,mode:mode==='rack'?'rack':'practice',balls,angle:mode==='rack'?Math.atan2(-25,375):Math.atan2(-124,-115),power:.55,phase:'ready',shots:0,fouls:0,potted:0,elapsed:0,movingTime:0,won:false,message:'移动指针或拖动瞄准，调节力度，按「击球」或空格。六个袋口与球体会真实碰撞。'};
}
export function poolRestore(raw){
 const f=poolFresh();if(!raw||raw.version!==1||!['practice','rack'].includes(raw.mode)||!['ready','moving','won'].includes(raw.phase)||!Array.isArray(raw.balls)||raw.balls.length!==(raw.mode==='rack'?16:7))return f;
 const s=structuredClone(raw);
 if(!s.balls.every((b,i)=>b&&b.id===i&&['x','y','vx','vy','spin'].every(k=>Number.isFinite(b[k]))&&Math.abs(b.vx)<1100&&Math.abs(b.vy)<1100&&b.x>70&&b.x<1050&&b.y>55&&b.y<555&&typeof b.potted==='boolean'))return f;
 if(!['angle','power','shots','fouls','potted','elapsed','movingTime'].every(k=>Number.isFinite(s[k]))||s.power<.15||s.power>1||s.shots<0||s.fouls<0||s.elapsed<0||s.movingTime<0||s.potted!==s.balls.filter(b=>b.id&&b.potted).length||s.phase==='won'&&s.potted!==s.balls.length-1||s.phase==='ready'&&s.balls[0].potted)return f;
 s.won=s.phase==='won';s.message=typeof s.message==='string'?s.message.slice(0,240):f.message;return s;
}
export function poolStrike(s){if(s.phase!=='ready'||s.balls[0].potted||!Number.isFinite(s.angle)||!Number.isFinite(s.power))return false;const b=s.balls[0],v=170+clamp(s.power,.15,1)*620;b.vx=Math.cos(s.angle)*v;b.vy=Math.sin(s.angle)*v;s.phase='moving';s.shots++;s.movingTime=0;s.message='球在滚动 · 等全部停稳，再安排下一杆。';return true}
function respot(s){const cue=s.balls[0];for(const x of [355,290,425,230,495])for(const y of [315,260,370,205,425])if(s.balls.every(b=>b.id===0||b.potted||Math.hypot(b.x-x,b.y-y)>POOL_RADIUS*2+4)){Object.assign(cue,{x,y,vx:0,vy:0,potted:false});return}}
export function poolStep(s,dt){
 const events=[];if(s.phase!=='moving')return events;dt=clamp(dt,0,.05);s.elapsed+=dt;s.movingTime+=dt;
 const steps=Math.max(1,Math.ceil(dt/.003)),h=dt/steps,r=POOL_RADIUS;
 for(let step=0;step<steps;step++){
  for(const b of s.balls){if(b.potted)continue;b.x+=b.vx*h;b.y+=b.vy*h;const speed=Math.hypot(b.vx,b.vy);b.spin+=speed*h/r;const v=Math.max(0,speed-78*h);if(speed){b.vx*=v/speed;b.vy*=v/speed}if(v<4)b.vx=b.vy=0;
   const pocket=POOL_POCKETS.find(p=>Math.hypot(b.x-p.x,b.y-p.y)<24);
   if(pocket){b.potted=true;b.vx=b.vy=0;if(b.id){s.potted++;events.push({type:'pot',id:b.id,x:pocket.x,y:pocket.y});s.message='第 '+b.id+' 号球落袋 · 已清掉 '+s.potted+' 颗。'}else{s.fouls++;events.push({type:'scratch',x:pocket.x,y:pocket.y});s.message='白球落袋 · 停稳后自动回到空位，记一次犯规。'}continue}
   const cornerGap=(y)=>y<136||y>465,sideGap=(x)=>Math.abs(x-560)<24||x<163||x>957;
   if(b.x<POOL_BOUNDS.left+r&&!cornerGap(b.y)){b.x=POOL_BOUNDS.left+r;if(b.vx<0){b.vx=-b.vx*.85;events.push({type:'rail'})}}
   if(b.x>POOL_BOUNDS.right-r&&!cornerGap(b.y)){b.x=POOL_BOUNDS.right-r;if(b.vx>0){b.vx=-b.vx*.85;events.push({type:'rail'})}}
   if(b.y<POOL_BOUNDS.top+r&&!sideGap(b.x)){b.y=POOL_BOUNDS.top+r;if(b.vy<0){b.vy=-b.vy*.85;events.push({type:'rail'})}}
   if(b.y>POOL_BOUNDS.bottom-r&&!sideGap(b.x)){b.y=POOL_BOUNDS.bottom-r;if(b.vy>0){b.vy=-b.vy*.85;events.push({type:'rail'})}}
   // The open jaws lead into pockets; this fallback catches a ball passing the painted jaw edge.
   if(b.x<122||b.x>998||b.y<87||b.y>513){const p=POOL_POCKETS.reduce((a,p)=>Math.hypot(b.x-p.x,b.y-p.y)<Math.hypot(b.x-a.x,b.y-a.y)?p:a);b.x=p.x;b.y=p.y}
  }
  for(let i=0;i<s.balls.length;i++)for(let j=i+1;j<s.balls.length;j++){const a=s.balls[i],b=s.balls[j];if(a.potted||b.potted)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=r*2)continue;const nx=d?dx/d:1,ny=d?dy/d:0,overlap=(r*2-d+.005)/2;a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;const approach=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(approach>0){const impulse=approach*.965;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;if(approach>35)events.push({type:'collision',x:(a.x+b.x)/2,y:(a.y+b.y)/2,speed:approach})}}
 }
 if(s.balls.every(b=>b.potted||Math.hypot(b.vx,b.vy)<4)){
  s.balls.forEach(b=>{b.vx=b.vy=0});if(s.balls[0].potted)respot(s);
  if(s.potted===s.balls.length-1){s.phase='won';s.won=true;s.message='球台已清空 · '+s.shots+' 杆，'+s.fouls+' 次白球落袋。';events.push({type:'won'})}
  else{s.phase='ready';events.push({type:'settled'});if(!events.some(e=>['pot','scratch'].includes(e.type)))s.message='已经停稳 · 瞄准线预览第一处接触，再试下一杆。'}
 }return events;
}
export function poolTrace(s){
 const cue=s.balls[0],dx=Math.cos(s.angle),dy=Math.sin(s.angle),b=POOL_BOUNDS,r=POOL_RADIUS;let t=Infinity,hit=null;
 for(const other of s.balls){if(!other.id||other.potted)continue;const x=other.x-cue.x,y=other.y-cue.y,along=x*dx+y*dy,disc=(r*2)**2-(x*x+y*y-along*along);if(disc>=0){const d=along-Math.sqrt(disc);if(d>0&&d<t){t=d;hit=other}}}
 for(const [v,p,d] of [[b.left+r,cue.x,dx],[b.right-r,cue.x,dx],[b.top+r,cue.y,dy],[b.bottom-r,cue.y,dy]]){const q=(v-p)/d;if(q>.01&&q<t){t=q;hit=null}}
 t=Math.min(t,900);const end={x:cue.x+dx*t,y:cue.y+dy*t};return {cue,end,hit,direction:{x:dx,y:dy},normal:hit?{x:(hit.x-end.x)/(r*2),y:(hit.y-end.y)/(r*2)}:null};
}

export async function createCue({host,input,saved,notify=()=>{},sfx=()=>{}}){
 const art=await images(['table'],'assets/game-forms/cue/'),{element,ctx}=canvasSurface(host),abort=new AbortController();let s=poolRestore(saved),active=false,flashes=[],cueKick=0;
 const ui=precisionPanel(host,'<label>击球力度 <input type="range" min="15" max="100" value="55" aria-label="台球击球力度"><output>55%</output></label><div class="precision-buttons"><button type="button" class="mode">三角开球</button><button type="button" class="primary strike">击球 · 空格</button></div>');
 element.setAttribute('aria-label','暮色台球。移动鼠标或拖动瞄准，调节下方力度，再按击球。白球、彩球、库边和六个袋口真实参与碰撞。');element.style.touchAction='none';
 const power=ui.panel.querySelector('input'),out=ui.panel.querySelector('output'),strikeButton=ui.panel.querySelector('.strike'),modeButton=ui.panel.querySelector('.mode');
 function sync(){const ready=active&&s.phase==='ready';power.disabled=!ready;strikeButton.disabled=!ready;modeButton.disabled=!active||s.phase==='moving';power.value=Math.round(s.power*100);out.textContent=power.value+'%';modeButton.textContent=s.mode==='practice'?'三角开球':'六球练习'}
 function aim(p){if(active&&s.phase==='ready'&&Math.hypot(p.x-s.balls[0].x,p.y-s.balls[0].y)>22)s.angle=Math.atan2(p.y-s.balls[0].y,p.x-s.balls[0].x)}
 for(const type of ['pointermove','pointerdown'])element.addEventListener(type,e=>{if(type==='pointermove'&&e.pointerType==='touch'&&!e.buttons)return;aim(pointerPosition(element,e));if(type==='pointerdown')element.setPointerCapture(e.pointerId)},{signal:abort.signal});
 function strike(){if(active&&poolStrike(s)){cueKick=.18;sfx('shot');sync()}}
 function restart(mode=s.mode){s=poolFresh(mode);flashes=[];sync()}
 power.oninput=()=>{if(active&&s.phase==='ready'){s.power=Number(power.value)/100;sync()}};strikeButton.onclick=strike;modeButton.onclick=()=>{if(active&&s.phase!=='moving')restart(s.mode==='practice'?'rack':'practice')};
 function tick(dt){if(!active)return;dt=clamp(dt,0,.05);if(s.phase==='ready'){s.angle+=input.x*dt*.95;if(input.pressed.has('Space'))strike();if(input.y)s.power=clamp(s.power-input.y*dt*.25,.15,1)}for(const e of poolStep(s,dt)){if(e.type==='pot'){flashes.push({...e,age:0});sfx('pickup')}else if(e.type==='collision')sfx('turn');else if(e.type==='scratch')sfx('hurt');else if(e.type==='won'){notify(s.message);sfx('success')}}flashes.forEach(f=>f.age+=dt);flashes=flashes.filter(f=>f.age<.75);cueKick=Math.max(0,cueKick-dt);sync()}
 function sphere(b,x=b.x,y=b.y,r=POOL_RADIUS){
  ctx.save();ctx.fillStyle='#071b2066';ctx.beginPath();ctx.ellipse(x+3,y+6,r*1.07,r*.83,0,0,Math.PI*2);ctx.fill();const g=ctx.createRadialGradient(x-r*.35,y-r*.5,r*.1,x,y,r);g.addColorStop(0,b.id?'#fff4d8': '#fffefa');g.addColorStop(.22,COLORS[b.id]);g.addColorStop(.72,COLORS[b.id]);g.addColorStop(1,b.id?'#091a25':'#87988e');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.save();ctx.beginPath();ctx.arc(x,y,r-.8,0,Math.PI*2);ctx.clip();if(b.id>8){ctx.strokeStyle='#f2eee0';ctx.lineWidth=r*.65;ctx.beginPath();ctx.moveTo(x-r,y+r*.15*Math.sin(b.spin));ctx.lineTo(x+r,y+r*.15*Math.sin(b.spin));ctx.stroke()}if(b.id){ctx.fillStyle='#fff3d9';ctx.beginPath();ctx.arc(x,y,r*.42,0,Math.PI*2);ctx.fill();ctx.font='600 '+r*.65+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#293032';ctx.fillText(b.id,x,y+.5)}ctx.restore();ctx.fillStyle='#fff9edbb';ctx.beginPath();ctx.ellipse(x-r*.35,y-r*.45,r*.23,r*.13,-.5,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 function draw(){
  ctx.drawImage(art.table,0,0,W,H);inscription(ctx,'暮色台球',s.mode==='rack'?'三角开球 · 自由清台':'六球练习 · 找到下一条入袋路线');
  if(s.phase==='ready'){const t=poolTrace(s);ctx.save();ctx.strokeStyle='#fff7d699';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(t.cue.x,t.cue.y);ctx.lineTo(t.end.x,t.end.y);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#f7e3acaa';ctx.beginPath();ctx.arc(t.end.x,t.end.y,POOL_RADIUS,0,Math.PI*2);ctx.stroke();if(t.hit){ctx.strokeStyle='#eecb67bb';ctx.beginPath();ctx.moveTo(t.hit.x,t.hit.y);ctx.lineTo(t.hit.x+t.normal.x*120,t.hit.y+t.normal.y*120);ctx.stroke()}ctx.translate(t.cue.x,t.cue.y);ctx.rotate(s.angle);const offset=28+16*s.power;const cue=ctx.createLinearGradient(-230,0,-offset,0);cue.addColorStop(0,'#392620');cue.addColorStop(.35,'#8b4f26');cue.addColorStop(.7,'#d6ab6a');cue.addColorStop(1,'#efddb0');ctx.lineCap='round';ctx.lineWidth=7;ctx.strokeStyle='#03171755';ctx.beginPath();ctx.moveTo(-240,4);ctx.lineTo(-offset,4);ctx.stroke();ctx.lineWidth=5;ctx.strokeStyle=cue;ctx.beginPath();ctx.moveTo(-240,0);ctx.lineTo(-offset,0);ctx.stroke();ctx.strokeStyle='#9bdddc';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-offset-5,0);ctx.lineTo(-offset,0);ctx.stroke();ctx.restore()}
  for(const b of s.balls)if(!b.potted)sphere(b);
  for(const f of flashes){ctx.save();ctx.globalAlpha=1-f.age/.75;ctx.strokeStyle='#e8cc82';ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,16+f.age*28,0,Math.PI*2);ctx.stroke();ctx.restore()}
  ctx.save();ctx.font='12px "Microsoft YaHei",sans-serif';ctx.fillStyle='#e1d0ab';ctx.textAlign='right';ctx.fillText('已入袋 '+s.potted+' / '+(s.balls.length-1)+'  ·  '+s.shots+' 杆',1035,39);ctx.restore();
  if(s.phase==='won')endCard(ctx,'这一桌，清得漂亮',s.shots+' 杆清台 · '+s.fouls+' 次白球落袋');
 }
 sync();return {tick,draw,onStart(){active=true;sync()},setActive(v){active=!!v;sync()},getState:()=>structuredClone(s),getStatus:()=>({goal:s.won?'球台已清空':'将 '+(s.balls.length-1)+' 颗彩球全部打入袋口',message:s.message,stats:['入袋 '+s.potted+'/'+(s.balls.length-1),'击球 '+s.shots+' 杆','白球落袋 '+s.fouls+' 次'],actions:[action('重新摆球',()=>restart(),!active||s.phase==='moving')]}),command(name,value){if(name==='aim'&&Number.isFinite(value)&&s.phase==='ready'){s.angle=value;return true}if(name==='power'&&Number.isFinite(value)&&s.phase==='ready'){s.power=clamp(value,.15,1);sync();return true}if(name==='strike'){const n=s.shots;strike();return n<s.shots}return false},dispose(){abort.abort();ui.dispose();flashes=[]}};
}
