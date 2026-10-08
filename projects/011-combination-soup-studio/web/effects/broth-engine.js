
// Selected Broth Engine rendering from the source page, adapted to a scoped lifecycle.
// Preserve bowl geometry, glow sprites, ingredient drops and original motion constants.
import {scope,clamp} from './runtime.js';
export function mount(host,{reduced,onState}){
  host.innerHTML=`<div class="native-effect native-broth"><div class="native-heading"><span>03 / THE BROTH ENGINE</span><h3>Stirred.<br>Never <em>templated.</em></h3><p>原站点云绘制核心。绕圈加速，倾斜让汤与食材越过碗口。</p><p class="native-broth-hint">按住汤面绕圈，搅满 8 圈获得粒子奖励；移动指针或拖动滑杆观察溢出。</p></div><div class="native-broth-recipe"><div class="native-recipe-layer stock"><b>Stock</b><span>点云碗体与透视投影</span></div><div class="native-recipe-layer flavour"><b>Flavour</b><span>搅动加速与倾斜汤面</span></div><div class="native-recipe-layer garnish"><b>Garnish</b><span>蒸汽、食材与落点弹跳</span></div></div><div class="native-engine" id="engine"><canvas id="eng" class="broth-canvas-native" tabindex="0" role="img" aria-label="原站点云汤碗，按住绕圈搅动；方向键与按钮也可操作"></canvas><div class="hud hud-tl">BROTH ENGINE<br>SIM. RPM <b id="engRpm">120</b><br>SIM. TEMP <b id="engTemp">97.6</b>°</div><div class="hud hud-tr">FILL <b id="engFill" data-fill>100</b>%</div><div class="hud hud-laps" id="hudLaps">YOUR LAPS<br><b data-laps>0.0</b><span data-laps-goal> / 8</span><progress data-laps-progress max="8" value="0" aria-label="搅动8圈挑战进度"></progress><small data-challenge>搅满 8 圈，解锁粒子奖励</small></div><div class="hud hud-bl" id="engIng">FULL · TILT TO SPILL</div><div class="native-spill" id="spill" data-spill>SPILL / 汤面溢出</div></div><div class="native-broth-status" role="status" aria-live="polite"><b data-demo-state>${reduced?'静态模式':'自动体验'}</b><span data-demo-step>${reduced?'可手动搅动，也可选择播放自动体验':'正在搅动；操作汤碗即可接管'}</span></div><div class="native-broth-controls"><button type="button" data-demo aria-pressed="${!reduced}">${reduced?'播放自动体验':'暂停自动体验'}</button><button type="button" data-stir>搅一圈</button><label>手动倾斜<input data-tilt type="range" min="-85" max="85" value="0" aria-label="手动倾斜汤碗"></label><button type="button" data-refill>重新注汤</button><button type="button" class="native-motion-optional" data-motion aria-pressed="false">开启手机倾斜</button></div></div>`;
  const life=scope(host),$=selector=>host.querySelector(selector),RM=reduced;
  const root=$('.native-broth'),demoButton=$('[data-demo]'),motionButton=$('[data-motion]');
  const lapValue=$('[data-laps]'),lapProgress=$('[data-laps-progress]'),challenge=$('[data-challenge]');
  let laps=0,lastAng=null,dragging=false,gyro=false,bowlUnlocked=false,disposed=false;
  let autoRunning=!RM,demoElapsed=0,demoPhase=-1,motionWanted=false,motionPending=false,motionEpoch=0,beta0=null,gamma0=null;
  function notify(){lapValue.textContent=laps.toFixed(1);lapProgress.value=Math.min(8,laps);$('[data-fill]').textContent=Math.round(L*100);onState({体验模式:autoRunning?'自动演示（不计挑战圈数）':gyro?'手机倾斜':RM?'手动静态':'手动操作',搅动圈数:+laps.toFixed(1),本地挑战:bowlUnlocked?'8 圈已达成':Math.min(8,laps).toFixed(1)+' / 8',汤量:Math.round(L*100)+'%',倾斜:+tx.toFixed(2),渲染:'原站汤碗与食材绘制适配'});}
  function modeText(label,detail){const title=$('[data-demo-state]'),body=$('[data-demo-step]');if(title.textContent!==label)title.textContent=label;if(body.textContent!==detail)body.textContent=detail;}
  function checkChallenge(){if(laps<8||bowlUnlocked)return;bowlUnlocked=true;root.classList.add('done');$('#hudLaps').classList.add('done');for(let i=0;i<60;i++)addSwirl();challenge.textContent='8 圈达成 · 粒子奖励已解锁';}
const ec=$('#eng'),ex=ec.getContext('2d');
// A module can be opened directly, without the source page's long lead-in scroll.
// Start with visible broth; the refill control retains the original filling animation.
let spillLogged=false,EW=0,rot=0,spin=0.01,boost=0,dragX=null,L=1,tx=0,tz=0,ttx=0,ttz=0,spillT=-Infinity;
const EDP=Math.min(2,devicePixelRatio||1);let hudT=0;const glow={};function glowOf(c){if(glow[c])return glow[c];const g=document.createElement('canvas');g.width=g.height=32;const q=g.getContext('2d');q.shadowColor=c;q.shadowBlur=8;q.fillStyle=c;q.beginPath();q.arc(16,16,5,0,6.3);q.fill();return glow[c]=g}
function eSize(){const r=ec.getBoundingClientRect();EW=r.width;ec.width=r.width*EDP;ec.height=r.height*EDP}
eSize();
const BD=.85; // bowl depth in model units (y down, rim at 0)
const bowlPts=[];for(let a=0;a<=14;a++){const th=(a/14)*(Math.PI/2);const n=Math.max(8,Math.round(56*Math.sin(th)));for(let b=0;b<n;b++){const ph=b/n*Math.PI*2;bowlPts.push([Math.sin(th)*Math.cos(ph),Math.cos(th)*BD,Math.sin(th)*Math.sin(ph),a])}}
const INGS=[['STOCK','#f4b73a'],['FLAVOUR','#ff5c8a'],['GARNISH','#2fa37c'],['CODE','#4fd8ff'],['MOTION','#b28cff']];
let swirl=[];function addSwirl(){const k=INGS[Math.random()*INGS.length|0];swirl.push({a:Math.random()*6.28,r:Math.random(),c:k[1],life:0})}
for(let i=0;i<60;i++)addSwirl();
let drops=[],steamE=[];
const tilt=.42,ct=Math.cos(tilt),st=Math.sin(tilt);
function projW(X,Y,Z){const Yv=Y*ct-Z*st,Z2=Y*st+Z*ct;const f=3.2/(3.2+Z2);return[EW/2+X*EW*.33*f,EW*.5+Yv*EW*.33*f,f,Z2]}
const surfY=(X,Z,ys)=>ys-tx*X*.9-tz*Z*.9; // surface height at a world point (y down)
let lastIng=0;
function drawIng(k,s){ex.lineWidth=1.2*s;ex.strokeStyle='rgba(28,15,10,.55)';
  if(k===0){ex.fillStyle='#f6ecd6';ex.beginPath();ex.moveTo(-7*s,2*s);ex.quadraticCurveTo(0,-9*s,7*s,2*s);ex.closePath();ex.fill();ex.stroke();for(let i=-2;i<=2;i++){ex.beginPath();ex.moveTo(i*2.2*s,-2.5*s);ex.lineTo(i*2.6*s,.5*s);ex.stroke()}}
  else if(k===1){ex.strokeStyle='#ff7a45';ex.lineWidth=3.2*s;ex.lineCap='round';ex.beginPath();ex.arc(0,0,5*s,.3,Math.PI*1.6);ex.stroke();ex.fillStyle='#ff7a45';ex.beginPath();ex.arc(4.5*s,-2*s,1.6*s,0,6.3);ex.fill()}
  else if(k===2){ex.strokeStyle='#f4d58a';ex.lineWidth=1.8*s;ex.beginPath();for(let x=-8;x<=8;x+=1){ex.lineTo(x*s,Math.sin(x*.9)*2.4*s)}ex.stroke()}
  else if(k===3){ex.fillStyle='#d2331f';ex.beginPath();ex.ellipse(0,0,2.4*s,7*s,0,0,6.3);ex.fill();ex.fillStyle='#2fa37c';ex.fillRect(-1*s,-9*s,2*s,3*s)}
  else{ex.fillStyle='#2fa37c';ex.beginPath();ex.ellipse(0,0,6*s,3.2*s,0,0,6.3);ex.fill();ex.strokeStyle='#e8f7d8';ex.beginPath();ex.moveTo(-6*s,0);ex.lineTo(6*s,0);ex.stroke()}}
// Source constants are defined per 60 Hz frame. Fractional steps preserve their
// duration at 30/60/75/120 Hz; long frames use smaller steps for drop collisions.
function emit(rate,step,spawn){const count=rate*step,whole=Math.floor(count);for(let i=0;i<whole;i++)spawn();if(Math.random()<count-whole)spawn();}
function advanceEng(ts,frames){
  for(let remaining=Math.min(frames,2.4);remaining>1e-6;){
    const step=Math.min(1,remaining);remaining-=step;
    spin+=((0.01+boost)-spin)*(1-Math.pow(.95,step));boost*=Math.pow(.97,step);rot+=spin*step;
    tx+=(ttx-tx)*(1-Math.pow(.92,step));tz+=(ttz-tz)*(1-Math.pow(.92,step));
    const ys=BD*(1-L),rS=Math.sqrt(Math.max(0,1-(ys/BD)**2));
    // Original rim test and ingredient launches, integrated in simulation time.
    let spilling=0,sx=0,sz=0;
    for(let i=0;i<32;i++){const ph=i/32*6.283,X=Math.cos(ph),Z=Math.sin(ph),h=surfY(X,Z,ys);if(h<0&&-h>spilling){spilling=-h;sx=X;sz=Z}}
    if(spilling>0&&L>.05){L=Math.max(0,L-.0035*(1+spilling*4)*step);spillT=ts;
      emit(.5,step,()=>drops.push({x:sx*1.02+(Math.random()-.5)*.1,y:0,z:sz*1.02+(Math.random()-.5)*.1,vx:sx*.018+(Math.random()-.5)*.006,vy:-.012,vz:sz*.018,k:Math.random()*5|0,r:Math.random()*6,vr:(Math.random()-.5)*.3,b:0}));spillLogged=true;
    }else if(L<1)L=Math.min(1,L+.0022*step);
    if(L>.02){
      emit(Math.min(1,.6+boost*15),step,()=>{if(swirl.length<90)addSwirl();});
      for(const q of swirl){q.a+=(spin*2.2+.008)*step;q.life+=step;}
      emit(.35*L,step,()=>steamE.push({x:(Math.random()-.5)*rS,z:(Math.random()-.5)*rS,y:ys-.02,l:0}));
    }
    for(let i=steamE.length-1;i>=0;i--){const q=steamE[i];q.l+=step;q.y-=.012*step;q.x+=Math.sin(q.l*.05)*.004*step;if(q.l>90)steamE.splice(i,1);}
    for(let i=drops.length-1;i>=0;i--){const d=drops[i];
      if(!d.rest){d.vy+=.004*step;d.x+=d.vx*step;d.y+=d.vy*step;d.z+=d.vz*step;d.r+=d.vr*step;if(d.y>1.25){d.y=1.25;d.vy*=-.35;d.vx*=.6;d.vz*=.6;d.vr*=.5;if(++d.b>2)d.rest=true;}}
      else{d.life=(d.life||0)+step;if(d.life>220)drops.splice(i,1);}
    }
  }
}
function drawEng(ts,frames=0){
  if(frames>0)advanceEng(ts,frames);
  const k=EDP;ex.setTransform(k,0,0,k,0,0);ex.clearRect(0,0,EW,EW);
  const ys=BD*(1-L),rS=Math.sqrt(Math.max(0,1-(ys/BD)**2));
  const cr=Math.cos(rot),sr=Math.sin(rot);
  $('#spill').classList.toggle('on',ts-spillT<500);
  // bowl shell: points under the surface glow as broth, the rest stay wireframe
  for(const[x,y,z,a]of bowlPts){const X=x*cr-z*sr,Z=x*sr+z*cr;const inBroth=L>.01&&y>surfY(X,Z,ys);const[px,py,f,zz]=projW(X,y,Z);const rim=a===14;
    if(inBroth){ex.fillStyle='rgba(244,183,58,'+(0.55+(1-zz)*.25)+')';ex.beginPath();ex.arc(px,py,2.1*f,0,6.3);ex.fill()}
    else{ex.fillStyle=rim?'#8fe9ff':'rgba(79,216,255,'+(0.22+(1-zz)*.25)+')';ex.beginPath();ex.arc(px,py,(rim?2.2:1.3)*f,0,6.3);ex.fill()}}
  // broth surface: a tilted disc of swirling ingredients
  if(L>.02){
    ex.fillStyle='rgba(244,160,40,.16)';ex.beginPath();for(let i=0;i<=40;i++){const ph=i/40*6.283,X=Math.cos(ph)*rS,Z=Math.sin(ph)*rS;const[px,py]=projW(X,Math.max(0,surfY(X,Z,ys)),Z);i?ex.lineTo(px,py):ex.moveTo(px,py)}ex.fill();
    for(const q of swirl){const r=q.r*rS*.95,X=Math.cos(q.a)*r,Z=Math.sin(q.a)*r;const Y=Math.max(0,surfY(X,Z,ys));const[px,py,f]=projW(X,Y,Z);
      const gs=16*f;ex.drawImage(glowOf(q.c),px-gs,py-gs,gs*2,gs*2)}
  }
  for(const q of steamE){const[px,py,f]=projW(q.x,q.y,q.z);ex.fillStyle='rgba(246,236,214,'+(0.45*(1-q.l/90))+')';ex.beginPath();ex.arc(px,py,(2+q.l*.05)*f,0,6.3);ex.fill()}
  // spilled drops fall off the rim
  // bench line
  if(drops.length){const[bx0,by]=projW(-1.4,1.25,0),[bx1]=projW(1.4,1.25,0);ex.strokeStyle='rgba(143,233,255,.25)';ex.setLineDash([3,5]);ex.beginPath();ex.moveTo(bx0,by);ex.lineTo(bx1,by);ex.stroke();ex.setLineDash([])}
  for(const d of drops){
    const[px,py,f]=projW(d.x,d.y,d.z);ex.save();ex.translate(px,py);ex.rotate(d.r);ex.globalAlpha=d.life?Math.max(0,1-(d.life-160)/60):1;const s=f*1.25;drawIng(d.k,s);ex.restore()}

  if(ts-hudT>160){hudT=ts;$('#engRpm').textContent=Math.round(spin*12000);$('#engTemp').textContent=(97.6+Math.sin(ts/900)*.4+boost*40).toFixed(1);$('#engFill').textContent=Math.round(L*100);notify()}
  if(ts-lastIng>1400){lastIng=ts;$('#engIng').textContent=L<1?'FILLING: '+INGS[(ts/1400|0)%INGS.length][0]:'FULL · TILT TO SPILL'}

}

function stirIt(){boost=Math.min(.09,boost+.05);for(let i=0;i<20;i++)addSwirl();}

  function redraw(){if(RM&&!autoRunning){tx=ttx;tz=ttz;drawEng(performance.now(),1);}notify();}
  function stopAuto(){
    if(!autoRunning)return;autoRunning=false;ttx=ttz=0;root.classList.remove('auto-running');root.dataset.experience=RM?'reduced':'manual';demoButton.textContent='播放自动体验';demoButton.setAttribute('aria-pressed','false');
    modeText(RM?'手动静态':'手动体验','按住汤面绕圈；移动指针或拖动滑杆让汤洒出');
  }
  function stopMotion(message){
    const wasActive=motionWanted||motionPending||gyro;
    motionEpoch++;motionWanted=motionPending=gyro=false;beta0=gamma0=null;window.removeEventListener('deviceorientation',onOrient);motionButton.setAttribute('aria-pressed','false');motionButton.textContent=motionButton.disabled?'使用滑杆倾斜':'开启手机倾斜';root.classList.remove('motion-active');
    if(wasActive){ttx=ttz=0;root.dataset.experience=RM?'reduced':'manual';}
    if(message)modeText('手动倾斜可用',message);
  }
  function manualMode(){stopAuto();if(motionWanted||motionPending||gyro)stopMotion();}
  function toggleDemo(){
    if(autoRunning){stopAuto();drawEng(performance.now());notify();return;}
    stopMotion();autoRunning=true;demoElapsed=0;demoPhase=-1;ttx=ttz=0;root.classList.add('auto-running');root.dataset.experience='auto';demoButton.textContent='暂停自动体验';demoButton.setAttribute('aria-pressed','true');modeText('自动体验','正在搅动；操作汤碗即可接管');notify();
  }
  function driveDemo(frames){
    demoElapsed+=frames*16.67;const t=demoElapsed%10000,phase=t<1300?0:t<3500?1:t<9000?2:3;
    if(phase!==demoPhase){demoPhase=phase;modeText('自动体验',['自动搅动 · 观察粒子加速','自动倾斜 · 观察食材溢出与弹跳','自动回正 · 汤面逐渐恢复','体验循环 · 操作汤碗即可接管'][phase]);}
    // Drive the same source variables as the pointer and slider. No playback,
    // separate drawing or synthetic laps are used for this preview.
    if(phase===0){boost=Math.max(boost,.035);ttx=ttz=0;}
    else if(phase===1){ttx=.65*Math.sin((t-1300)/2200*Math.PI/2);ttz=-.14;}
    else ttx=ttz=0;
    $('[data-tilt]').value=Math.round(ttx*100);
  }
  function onOrient(e){
    if(disposed||!motionWanted||!Number.isFinite(e.gamma)||!Number.isFinite(e.beta))return;
    if(beta0===null){beta0=e.beta;gamma0=e.gamma;gyro=true;motionPending=false;root.classList.add('motion-active');root.dataset.experience='motion';motionButton.textContent='关闭手机倾斜';motionButton.setAttribute('aria-pressed','true');modeText('手机倾斜已开启','保持当前姿势作为基准；左右倾斜观察汤面与食材');}
    ttx=clamp((e.gamma-gamma0)/35,-.85,.85);ttz=clamp((e.beta-beta0)/-35,-.85,.85);$('[data-tilt]').value=Math.round(ttx*100);redraw();
  }
  async function toggleMotion(){
    if(motionWanted||motionPending||gyro){stopMotion('已关闭手机倾斜，可继续拖动滑杆');redraw();return;}
    stopAuto();const DOE=window.DeviceOrientationEvent;
    if(!DOE||!window.isSecureContext){modeText('手动倾斜可用','此环境没有可用的设备倾斜接口，请使用滑杆');return;}
    const epoch=++motionEpoch;motionPending=true;motionButton.textContent='等待倾斜权限…';
    try{
      // iOS permission is requested only inside this explicit button action.
      if(typeof DOE.requestPermission==='function'&&await DOE.requestPermission()!=='granted'){if(!disposed&&epoch===motionEpoch)stopMotion('没有获得倾斜权限，请使用滑杆');return;}
      if(disposed||epoch!==motionEpoch)return;
      motionWanted=true;beta0=gamma0=null;window.addEventListener('deviceorientation',onOrient);motionButton.textContent='等待传感器…';modeText('等待设备倾斜','轻轻倾斜手机；没有传感器时可以使用滑杆');
      life.timeout(()=>{if(!disposed&&epoch===motionEpoch&&!gyro){stopMotion('未收到设备倾斜信号，请使用滑杆');redraw();}},2800);
    }catch(_){if(!disposed&&epoch===motionEpoch){stopMotion('设备没有允许倾斜读取，请使用滑杆');redraw();}}
  }
  function stir(){manualMode();laps++;stirIt();rot+=Math.PI*2;checkChallenge();redraw();}
  const canvas=ec;
  life.listen(canvas,'pointerdown',e=>{manualMode();dragging=true;lastAng=null;dragX=e.clientX;try{canvas.setPointerCapture(e.pointerId);}catch(_){}redraw();});
  life.listen(canvas,'pointermove',e=>{const r=canvas.getBoundingClientRect();
    if(e.pointerType==='mouse'&&!gyro){stopAuto();ttx=clamp(((e.clientX-r.left)/r.width-.5)*2.4,-1,1);ttz=clamp(((e.clientY-r.top)/r.height-.5)*-2,-1,1);}
    if(dragging){const a=Math.atan2(e.clientY-r.top-r.height*.5,e.clientX-r.left-r.width*.5);if(lastAng!==null){let d=a-lastAng;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;laps+=Math.abs(d)/(2*Math.PI);rot+=d*.6;boost=Math.min(.09,boost+Math.abs(d)*.02);}lastAng=a;const d=e.clientX-dragX;dragX=e.clientX;rot+=d*.01;boost=Math.min(.09,boost+Math.abs(d)*.0004);checkChallenge();}
    redraw();
  });
  function release(){dragging=false;lastAng=null;dragX=null;}
  life.listen(canvas,'pointerup',release);life.listen(canvas,'pointercancel',release);
  life.listen(canvas,'pointerleave',()=>{if(!gyro&&!autoRunning){ttx=ttz=0;if(!dragging)redraw();}});
  life.listen(demoButton,'click',toggleDemo);life.listen(motionButton,'click',toggleMotion);
  life.listen($('[data-stir]'),'click',stir);
  life.listen($('[data-refill]'),'click',()=>{manualMode();L=RM?1:0;ttx=ttz=tx=tz=0;drops=[];spillT=-Infinity;$('[data-tilt]').value=0;redraw();});
  life.listen($('[data-tilt]'),'input',e=>{const value=+e.target.value;manualMode();ttx=value/100;ttz=0;$('[data-tilt]').value=value;redraw();});
  life.listen(canvas,'keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();stir();}else if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();manualMode();ttx=clamp(ttx+(e.key==='ArrowUp'?.12:-.12),-.85,.85);$('[data-tilt]').value=Math.round(ttx*100);redraw();}});
  life.listen(window,'resize',()=>{eSize();drawEng(performance.now());});
  const ro=new ResizeObserver(()=>{eSize();drawEng(performance.now());});ro.observe(host);
  if(!window.DeviceOrientationEvent){motionButton.disabled=true;motionButton.textContent='使用滑杆倾斜';motionButton.title='当前浏览器没有设备方向接口';}
  root.classList.toggle('auto-running',autoRunning);root.dataset.experience=autoRunning?'auto':'reduced';
  life.loop((ts,frames)=>{if(RM&&!autoRunning)return;if(autoRunning)driveDemo(frames);drawEng(ts,frames);});
  drawEng(performance.now());notify();
  return {dispose(){disposed=true;motionEpoch++;window.removeEventListener('deviceorientation',onOrient);ro.disconnect();life.dispose();}};
}
