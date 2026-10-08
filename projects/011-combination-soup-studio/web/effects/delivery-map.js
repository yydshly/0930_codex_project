
// Selected Delivery Map rendering from the source page: full coast, towns, kitchen arm,
// parcel arcs, parachutes, landing rings and original drawing details.
import {scope} from './runtime.js';
import {coast,tasmania,towns as townData} from './map-data.js';
// Limits are measured in CSS pixels, independent of map and device-pixel scaling.
const MIN_PARCEL_PX=22,MIN_LABEL_PX=10,FLIGHT_EDGE_PX=2,MANUAL_TRACK_MS=8000;
function flightGeometry(b,ds){
 const scale=Math.max(1.8,MIN_PARCEL_PX/(15*ds)),edge=FLIGHT_EDGE_PX/ds;
 const ceiling=13*scale+edge;
 // At very small sizes, the parcel can sit slightly above the actual city pin.
 const landingY=Math.max(b.y1,ceiling);
 let peak=b.idealPeak;
 for(let i=1;i<200;i++){
  const p=i/200,room=b.y0+(landingY-b.y0)*p-ceiling;
  peak=Math.min(peak,room/Math.sin(Math.PI*p));
 }
 return {scale,edge,landingY,peak:Math.max(0,peak*.995)};
}
function chuteOpening(x,y,scale,edge){
 return Math.max(0,Math.min(1,(y-edge)/(32*scale),(x-edge)/(12*scale),(620-x-edge)/(12*scale)));
}
export function mount(host,{reduced,onState}){
 host.innerHTML=`<div class="native-effect native-map"><div class="native-heading"><span>04 / FROM THE KITCHEN</span><h3>To all of <em>Australia.</em></h3><p>点一下地图，让厨房用筷子把外卖盒送过去。</p></div><div class="native-map-status"><span>LAST DROP / 最近落点</span><strong id="stop" data-arrival>Australia</strong><small>DEMO DELIVERIES <b id="stops" data-sent>0</b></small></div><div class="native-map-target" data-target aria-live="polite"><span>YOUR DROP / 本次投送</span><strong data-target-name>点选目的地</strong><small data-target-progress>等待操作</small></div><div class="native-dotmap" id="dotmap"><canvas id="dmap" class="delivery-canvas-native" role="img" aria-label="原站澳大利亚点阵地图，厨房向城市投送带降落伞的外卖盒"></canvas></div><div class="native-map-controls"><button type="button" data-city="Sydney">Sydney</button><button type="button" data-city="Perth">Perth</button><button type="button" data-city="Hobart">Hobart</button><label><input data-auto type="checkbox" ${reduced?'':'checked'}><span data-auto-label>自动投送</span></label></div></div>`;
 const life=scope(host),$=s=>host.querySelector(s),watch=()=>()=>true,RM=reduced;
 const GOLD='#f4b73a',NEON='#ff5c8a',PAPER='#f6ecd6',RED='#d2331f',INK='#1c0f0a';
 function notify(){onState({演示投送次数:flung,最近落点:stop.textContent,本次目标:manualTarget?.n||'尚未选择',本次状态:$('[data-target-progress]').textContent,飞行中:boxes.length,城市:towns.length+' 个原站坐标'});}

const tas=tasmania;
const P=([lo,la])=>[(lo-112)*12.2+10,(-la-10)*13.4+10];
const towns=townData.map(t=>({n:t[0],p:P([t[1],t[2]])}));
const BB=P([150.2,-35.72]);const HOME=[566,300];
function monoFont(size,weight=600){return weight+' '+Math.max(size,MIN_LABEL_PX/DS)+'px "SoupMono",monospace'}
function labelLeft(preferred,width){const edge=FLIGHT_EDGE_PX/DS,right=dm.width/(DS*MDP)-edge;return Math.max(edge,Math.min(preferred,right-width))}
function centeredLabel(text,x,y){const m=dx.measureText(text),edge=FLIGHT_EDGE_PX/DS,right=dm.width/(DS*MDP)-edge,leftExtent=m.actualBoundingBoxLeft??m.width/2,rightExtent=m.actualBoundingBoxRight??m.width/2;const anchor=Math.max(edge+leftExtent,Math.min(x,right-rightExtent));dx.fillText(text,anchor,y)}
function pill(t,x,y,left,hq){const ui=Math.max(1,MIN_LABEL_PX/(10*DS));dx.font=monoFont(10,hq?700:600);const w=dx.measureText(t).width+12*ui;const bx=labelLeft(left?x-9*ui-w:x+9*ui,w),by=y-8*ui;dx.fillStyle=hq?NEON:'rgba(12,4,3,.9)';dx.beginPath();dx.roundRect?dx.roundRect(bx,by,w,16*ui,8*ui):dx.rect(bx,by,w,16*ui);dx.fill();dx.fillStyle=hq?INK:PAPER;dx.textAlign='left';dx.fillText(t,bx+6*ui,by+11.5*ui);if(!hq){dx.fillStyle=GOLD;dx.fillRect(x-4,y-4,8,8)}}
const polys=[coast.map(P),tas.map(P)];
function inside(x,y,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const[xi,yi]=poly[i],[xj,yj]=poly[j];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c}return c}
const mdots=[];for(let y=6;y<470;y+=9)for(let x=6;x<520;x+=9)if(polys.some(p=>inside(x,y,p)))mdots.push({x,y,h:0});
const dm=$('#dmap'),dx=dm.getContext('2d'),dmw=$('#dotmap'),stop=$('#stop'),stopsN=$('#stops');
let DS=1;const MDP=Math.min(2,devicePixelRatio||1),mapOn=watch(dm),dotL=document.createElement('canvas');
function dmSize(){const r=dmw.getBoundingClientRect();DS=r.width/620;dm.width=r.width*MDP;dm.height=r.height*MDP;dotL.width=dm.width;dotL.height=dm.height;const q=dotL.getContext('2d');q.setTransform(DS*MDP,0,0,DS*MDP,0,0);q.fillStyle=GOLD;q.globalAlpha=.45;q.beginPath();for(const d of mdots){q.moveTo(d.x+2.3,d.y);q.arc(d.x,d.y,2.3,0,6.3)}q.fill()}
dmSize();

const BADGE=new Image();BADGE.src='source-assets/map-badge.svg';
let boxes=[],rings=[],pins=[],flung=0,arm=0,armV=0,nextAuto=0;
let manualTarget=null,manualId=0,manualDone=false,manualHighlightUntil=0,autoHeldUntil=0;
// Fractional powers of the original 60 Hz spring preserve its motion at any refresh rate.
const springR=Math.sqrt(.86),springCos=(1-.08*.86+.86)/(2*springR),springTheta=Math.acos(springCos),springSin=Math.sin(springTheta);
function advanceArm(dt){
 const damping=Math.pow(springR,dt),c=Math.cos(springTheta*dt),q=Math.sin(springTheta*dt)/springSin;
 const nextArm=damping*(c*arm+q*((1-.08*.86)/springR*arm+.86/springR*armV-springCos*arm));
 armV=damping*(c*armV+q*(-.08*.86/springR*arm+.86/springR*armV-springCos*armV));arm=nextArm;
}
function fling(t,manual=false){
 const d=Math.hypot(t.p[0]-HOME[0],t.p[1]-HOME[1]),now=performance.now();
 const b={t,id:flung+1,manual,x0:HOME[0]-3,y0:HOME[1]-8,x1:t.p[0],y1:t.p[1],dur:1600+d*9,st:now,idealPeak:60+d*.55,spin:(Math.random()-.5)*8};
 boxes.push(b);armV=-.5;flung++;stopsN.textContent=flung;
 if(manual){manualTarget=t;manualId=b.id;manualDone=false;manualHighlightUntil=Infinity;autoHeldUntil=now+Math.max(MANUAL_TRACK_MS,b.dur+1800);nextAuto=Math.max(nextAuto,autoHeldUntil);$('[data-target-name]').textContent=t.n;$('[data-target-progress]').textContent='投送中 · 跟随高亮包裹';$('[data-target]').dataset.state='flying';}
 return b;
}
function sendManual(t){const b=fling(t,true),now=performance.now();if(RM)b.st=now-b.dur-1;drawMap(now,0);if(RM)drawMap(now,0);notify()}
function nearest(x,y){let b=towns[0],bd=1e9;for(const t of towns){const d=Math.hypot(t.p[0]-x,t.p[1]-y);if(d<bd){bd=d;b=t}}return b}
life.listen(dm,'click',e=>{const r=dm.getBoundingClientRect();sendManual(nearest((e.clientX-r.left)/DS,(e.clientY-r.top)/DS))});
function drawBox(x,y,rot,s,chute){dx.save();dx.translate(x,y);
  if(chute){const canopy=s*chute;dx.strokeStyle=PAPER;dx.lineWidth=.8;dx.beginPath();dx.moveTo(-6*s,-2*s);dx.lineTo(-11*canopy,-20*canopy);dx.moveTo(6*s,-2*s);dx.lineTo(11*canopy,-20*canopy);dx.stroke();
    dx.fillStyle=NEON;dx.beginPath();dx.arc(0,-20*canopy,12*canopy,Math.PI,0);dx.fill();dx.fillStyle=PAPER;dx.beginPath();dx.arc(0,-20*canopy,12*canopy,Math.PI*1.33,Math.PI*1.66);dx.lineTo(0,-20*canopy);dx.fill()}
  dx.rotate(rot);dx.fillStyle=PAPER;dx.strokeStyle=INK;dx.lineWidth=1.3;dx.beginPath();dx.moveTo(-7.5*s,-6*s);dx.lineTo(7.5*s,-6*s);dx.lineTo(5.6*s,7*s);dx.lineTo(-5.6*s,7*s);dx.closePath();dx.fill();dx.stroke();
  if(BADGE.complete&&BADGE.naturalWidth){dx.drawImage(BADGE,-4.6*s,-4.2*s,9.2*s,9.2*s)}else{dx.fillStyle=RED;dx.beginPath();dx.arc(0,.4*s,4.4*s,0,6.3);dx.fill()}dx.strokeStyle=INK;dx.beginPath();dx.arc(0,-8*s,4*s,Math.PI,0);dx.stroke();dx.restore()}
function drawMap(ts,dt=0){
  if(!mapOn())return;
  dx.setTransform(1,0,0,1,0,0);dx.clearRect(0,0,dm.width,dm.height);dx.drawImage(dotL,0,0);const k=DS*MDP;dx.setTransform(k,0,0,k,0,0);
  if(!RM&&$('[data-auto]').checked&&ts>nextAuto&&ts>autoHeldUntil){nextAuto=ts+900+Math.random()*900;fling(towns[Math.random()*towns.length|0])}
  $('[data-auto-label]').textContent=$('[data-auto]').checked&&ts<autoHeldUntil?'自动投送暂缓':'自动投送';
  for(const d of mdots){if(rings.length)for(const r of rings){const dd=Math.abs(Math.hypot(d.x-r.x,d.y-r.y)-r.r);if(dd<6)d.h=Math.max(d.h,1-dd/6)}if(d.h<.01){d.h=0;continue}d.h*=Math.pow(.95,dt);
    dx.fillStyle=d.h>.08?NEON:GOLD;dx.globalAlpha=.45+d.h*.55;dx.beginPath();dx.arc(d.x,d.y,2.3+d.h*2,0,6.3);dx.fill()}
  dx.globalAlpha=1;
  rings=rings.filter(r=>(r.r+=1.6*dt)<46);
  // pins that stay after landing
  pins=pins.filter(q=>ts-q.t<5200);
  for(const q of pins){const a=Math.min(1,(5200-(ts-q.t))/800);dx.globalAlpha=a;dx.fillStyle=GOLD;dx.fillRect(q.x-4,q.y-4,8,8);pill(q.n,q.x,q.y,q.x>400);dx.globalAlpha=1}
  // A manual click marks its destination immediately, before the parcel lands.
  if(manualTarget&&ts<manualHighlightUntil){const [mx,my]=manualTarget.p,ui=Math.max(1,1/DS),pulse=RM?0:(Math.sin(ts/180)+1)/2;dx.strokeStyle=NEON;dx.lineWidth=2/DS;dx.beginPath();dx.arc(mx,my,(7+pulse*3)*ui,0,6.3);dx.stroke();dx.fillStyle=NEON;dx.beginPath();dx.arc(mx,my,3*ui,0,6.3);dx.fill();if(!manualDone)pill(manualTarget.n,mx,my,mx>400,true);}
  // HQ: a big noodle box moored off Batemans Bay; chopsticks flick parcels out of its lit window
  advanceArm(dt);
  const hx=HOME[0],hy=HOME[1],pulse=(ts/1400)%1,bob=Math.sin(ts/700)*1.6;
  // tether + home pin on the coast
  dx.strokeStyle=NEON;dx.lineWidth=1.6;dx.setLineDash([3,4]);dx.beginPath();dx.moveTo(BB[0],BB[1]);dx.quadraticCurveTo((BB[0]+hx)/2+6,BB[1]+30,hx-14,hy+22+bob);dx.stroke();dx.setLineDash([]);
  dx.strokeStyle=NEON;dx.globalAlpha=1-pulse;dx.lineWidth=2;dx.beginPath();dx.arc(BB[0],BB[1],4+pulse*18,0,6.3);dx.stroke();dx.globalAlpha=1;
  dx.fillStyle=NEON;dx.beginPath();dx.arc(BB[0],BB[1],4,0,6.3);dx.fill();
  // water ripples under the box
  dx.strokeStyle='rgba(143,233,255,.35)';dx.lineWidth=1;for(let r=0;r<3;r++){const rr=((ts/900+r/3)%1);dx.globalAlpha=1-rr;dx.beginPath();dx.ellipse(hx,hy+26,18+rr*24,4+rr*5,0,0,6.3);dx.stroke()}dx.globalAlpha=1;
  dx.save();dx.translate(hx,hy+bob);dx.scale(1.25,1.25);
  dx.fillStyle=PAPER;dx.strokeStyle=INK;dx.lineWidth=1.6;dx.beginPath();dx.moveTo(-17,-16);dx.lineTo(17,-16);dx.lineTo(12,16);dx.lineTo(-12,16);dx.closePath();dx.fill();dx.stroke();
  dx.beginPath();dx.moveTo(-17,-16);dx.lineTo(-10,-24);dx.lineTo(10,-24);dx.lineTo(17,-16);dx.fillStyle='#e8dcc0';dx.fill();dx.stroke();
  dx.strokeStyle=INK;dx.beginPath();dx.arc(0,-24,9,Math.PI,0);dx.stroke();
  dx.fillStyle=GOLD;dx.shadowColor=GOLD;dx.shadowBlur=10;dx.fillRect(-7,-9,14,10);dx.shadowBlur=0;dx.strokeRect(-7,-9,14,10);dx.beginPath();dx.moveTo(0,-9);dx.lineTo(0,1);dx.stroke();
  dx.fillStyle=RED;dx.fillRect(-12,6,24,4);
  dx.save();dx.translate(-2,-4);dx.rotate(-2.2-arm*2.2);dx.strokeStyle='#c8964a';dx.lineWidth=2.6;dx.lineCap='round';dx.beginPath();dx.moveTo(0,0);dx.lineTo(0,-26);dx.moveTo(3,0);dx.lineTo(4,-26);dx.stroke();dx.restore();
  dx.restore();
  dx.font=monoFont(10,700);dx.textAlign='center';dx.fillStyle=NEON;centeredLabel('HQ',hx,hy+44);dx.fillStyle=PAPER;dx.font=monoFont(9);centeredLabel('BATEMANS BAY',hx,hy+44+Math.max(12,12/DS));
  // boxes in flight
  boxes=boxes.filter(b=>{if(b.layoutScale!==DS){b.geometry=flightGeometry(b,DS);b.layoutScale=DS;}const g=b.geometry,p=Math.min(1,Math.max(0,(ts-b.st)/b.dur));const x=b.x0+(b.x1-b.x0)*p,y=b.y0+(g.landingY-b.y0)*p-Math.sin(Math.PI*p)*g.peak;
    dx.globalAlpha=manualTarget&&!manualDone&&b.id!==manualId ? .35 : 1;
    // shadow on the ground
    dx.fillStyle='rgba(0,0,0,.35)';dx.beginPath();dx.ellipse(b.x0+(b.x1-b.x0)*p,b.y0+(b.y1-b.y0)*p,5+6*(1-Math.sin(Math.PI*p)),2.5,0,0,6.3);dx.fill();
    // trail
    dx.strokeStyle='rgba(255,92,138,.35)';dx.setLineDash([2,4]);dx.beginPath();for(let q=Math.max(0,p-.25);q<=p;q+=.02){const tx=b.x0+(b.x1-b.x0)*q,ty=b.y0+(g.landingY-b.y0)*q-Math.sin(Math.PI*q)*g.peak;q===Math.max(0,p-.25)?dx.moveTo(tx,ty):dx.lineTo(tx,ty)}dx.stroke();dx.setLineDash([]);
    const deployed=p>.62,chute=deployed?chuteOpening(x,y,g.scale,g.edge):0;drawBox(x,y,deployed?Math.sin(ts/200)*.2:b.spin*p,g.scale,chute);dx.globalAlpha=1;
    if(p>=1){rings.push({x:b.x1,y:b.y1,r:2});pins.push({x:b.x1,y:b.y1,n:b.t.n,t:ts});stop.textContent=b.t.n;if(b.id===manualId){manualDone=true;manualHighlightUntil=ts+1800;$('[data-target-progress]').textContent='已落地';$('[data-target]').dataset.state='landed';}return false}return true});

}

 host.querySelectorAll('[data-city]').forEach(b=>life.listen(b,'click',()=>sendManual(towns.find(t=>t.n===b.dataset.city))));
 life.listen($('[data-auto]'),'change',()=>{nextAuto=Math.max(performance.now()+900,autoHeldUntil);drawMap(performance.now(),0);notify();});
 life.listen(window,'resize',()=>{dmSize();if(RM)drawMap(performance.now());});
 const ro=new ResizeObserver(()=>{dmSize();if(RM)drawMap(performance.now());});ro.observe(host);
 let lastHUD=0;
 if(!RM)life.loop((ts,dt)=>{drawMap(ts,dt);if(ts-lastHUD>160){lastHUD=ts;notify();}});
 drawMap(performance.now());notify();
 return {dispose(){ro.disconnect();life.dispose();}};
}
