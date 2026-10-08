import '../vendor/three-r160.min.js';
import {makeToiletParts} from './toilet-shapes.js';
import {createToiletRoom} from './toilet-room.js';
const T=globalThis.THREE,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const views={hero:{yaw:.72,pitch:.25,zoom:1},front:{yaw:0,pitch:.20,zoom:1},side:{yaw:Math.PI/2,pitch:.17,zoom:1},structure:{yaw:.62,pitch:.26,zoom:.95}};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function hasGL(){try{const c=document.createElement('canvas'),g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return false;g.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}}
export function createToiletRenderer(canvas,getState){
  if(!T||!hasGL())return fallback(canvas,getState);
  let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});}catch{return fallback(canvas,getState);}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene();scene.background=new T.Color('#ece9e1');const camera=new T.PerspectiveCamera(36,1,.04,40);
  const ceramic=new T.MeshPhysicalMaterial({color:'#f5f1e7',roughness:.13,clearcoat:1,clearcoatRoughness:.10,metalness:0,ior:1.5,envMapIntensity:1.30,side:T.DoubleSide});
  const seatMat=new T.MeshPhysicalMaterial({color:'#f5f1e7',roughness:.19,clearcoat:.95,clearcoatRoughness:.16,envMapIntensity:1.2,side:T.DoubleSide});
  const chrome=new T.MeshStandardMaterial({color:'#b8b9b4',metalness:1,roughness:.24}),rubber=new T.MeshStandardMaterial({color:'#383c35',roughness:.95}),dark=new T.MeshStandardMaterial({color:'#1d2723',roughness:.40});
  const waterMat=new T.MeshPhysicalMaterial({color:'#c1dbd4',transparent:true,opacity:.62,roughness:.10,metalness:0,clearcoat:1});
  const stage=createToiletRoom(T,renderer,scene,()=>draw()),{grain,envScene,pmrem,environment}=stage;
  let modelGroup=new T.Group(),bodyGroup,seatGroup,lidPivot,tankGroup,rulers,newModel=null,disposed=false,raf=0,visible=true,width=1,height=1,view=getState().view||'hero',yaw=views[view]?.yaw??.72,pitch=views[view]?.pitch??.25,zoom=views[view]?.zoom??1;
  let goal={yaw,pitch,zoom},lid=0,explode=0,fingerprint='',last=0;
  scene.add(modelGroup);
  function clearModel(){const geometries=new Set(),textures=new Set();modelGroup.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.userData.labelTexture)textures.add(o.userData.labelTexture);if(o.userData.privateMaterial)o.material.dispose();});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());scene.remove(modelGroup);modelGroup=new T.Group();scene.add(modelGroup);}
  function ruler(points,label,position){
    const line=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color:'#566c65'}));line.userData.privateMaterial=true;rulers.add(line);
    const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');x.fillStyle='#fffdf2';x.beginPath();x.roundRect(0,0,512,96,12);x.fill();x.fillStyle='#354d43';x.font='500 43px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(label,256,49);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
    const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,toneMapped:false}));sprite.scale.set(.68,.128,1);sprite.position.set(...position);sprite.userData.labelTexture=texture;sprite.userData.privateMaterial=true;rulers.add(sprite);
  }
  function buildModel(m){
    clearModel();newModel=m.id;const w=m.width*.003,d=m.depth*.003,h=m.height*.003,sy=m.seatHeight*.003;
    ({bodyGroup,seatGroup,lidPivot,tankGroup}=makeToiletParts(T,m,{ceramic,seatMat,chrome,dark,waterMat,rubber}));
    rulers=new T.Group();modelGroup.add(bodyGroup,seatGroup,lidPivot,tankGroup,rulers);stage.fitGround(w,d);
    const v=(x,y,z)=>[x,y,z];
    ruler([v(-w/2,.055,d/2+.19),v(w/2,.055,d/2+.19)],`宽 ${m.width} mm`,[0,.055,d/2+.28]);
    ruler([v(-w/2-.23,.05,-d/2),v(-w/2-.23,.05,d/2)],`长 ${m.depth} mm`,[-w/2-.29,.07,.12]);
    ruler([v(w/2+.20,.03,-d*.3),v(w/2+.20,h,-d*.3)],`高 ${m.height} mm`,[w/2+.27,h*.64,-d*.3]);
    ruler([v(-w/2-.13,.03,d*.23),v(-w/2-.13,sy,d*.23)],`坐高 ${m.seatHeight}`,[-w/2-.22,sy*.66,d*.23]);
  }
  function dimensions(){const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}}
  function hidden(){return document.hidden||canvas.closest('[hidden]')||!visible;}
  function pose(){
    const bounds=new T.Box3().setFromObject(bodyGroup);for(const part of [seatGroup,lidPivot,tankGroup])bounds.union(new T.Box3().setFromObject(part));if(rulers.visible)bounds.union(new T.Box3().setFromObject(rulers));const center=bounds.getCenter(new T.Vector3()),t=Math.tan(camera.fov*Math.PI/360),usableH=.77,usableW=width<430?.70:.79,target=new T.Vector3(0,center.y-.15,0);
    const dir=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),right=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),up=new T.Vector3(-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch));let distance=3.35;
    // Include each corner's depth so the front of an opened product stays in frame.
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new T.Vector3(x,y,z).sub(target),depth=p.dot(dir);distance=Math.max(distance,depth+Math.abs(p.dot(up))/(t*usableH),depth+Math.abs(p.dot(right))/(t*camera.aspect*usableW));}
    distance/=zoom;camera.position.copy(target).addScaledVector(dir,distance);camera.lookAt(target);camera.updateMatrixWorld();
  }
  function state(){return {renderer:'webgl',kind:'toilet',modelId:newModel,view,zoom:Number(zoom.toFixed(3)),yaw:Number(yaw.toFixed(3)),pitch:Number(pitch.toFixed(3)),backgroundSource:getState().setting==='studio'?'architectural-studio':'procedural-bathroom',visualRevision:'20261002-11',materialsReady:stage.materialsReady(),dimensions:getState().dimensions===true};}
  function emit(){canvas.dataset.materialsReady=String(stage.materialsReady());const s=state(),f=JSON.stringify(s);if(f!==fingerprint){fingerprint=f;canvas.dispatchEvent(new CustomEvent('toilet-render-state',{detail:s}));}}
  function step(now,force=false){raf=0;if(disposed||canvas.closest('[hidden]')||(!force&&hidden())){last=0;return;}dimensions();const s=getState();if(newModel!==s.model.id)buildModel(s.model);
    const lidTarget=s.lid/100*(s.model.tank?1.51:1.72);const dt=Math.min(100,last?now-last:16);last=now;const factor=reduced()||force?1:1-Math.exp(-dt/130);yaw+=(goal.yaw-yaw)*factor;pitch+=(goal.pitch-pitch)*factor;zoom+=(goal.zoom-zoom)*factor;lid+=(lidTarget-lid)*factor;explode+=(s.explode/100-explode)*factor;
    ceramic.color.set(s.color);seatMat.color.set(s.color);seatGroup.position.y=s.model.seatHeight*.003-.04+explode*.39;lidPivot.position.y=lidPivot.userData.baseY+explode*.80;lidPivot.rotation.x=-lid;tankGroup.position.y=explode*.42;rulers.visible=s.dimensions===true;
    stage.setSetting(s.setting);scene.updateMatrixWorld();pose();stage.render(camera);emit();const moving=Math.abs(yaw-goal.yaw)+Math.abs(pitch-goal.pitch)+Math.abs(zoom-goal.zoom)+Math.abs(lid-lidTarget)+Math.abs(explode-s.explode/100)>.002;
    if(moving&&!hidden())raf=requestAnimationFrame(step);else last=0;
  }
  function schedule(){if(!disposed&&!raf&&!hidden())raf=requestAnimationFrame(step);}
  function draw(instant=true){if(disposed)return;if(raf)cancelAnimationFrame(raf);raf=0;step(performance.now(),instant===true);}
  function setView(next){if(!views[next])return;view=next;goal={...views[next]};draw(false);}
  const pointers=new Map();let prev=null,pinch=0;
  const down=e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);prev={x:e.clientX,y:e.clientY};if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}canvas.style.cursor='grabbing';};
  const move=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)goal.zoom=clamp(goal.zoom*distance/pinch,.75,1.55);pinch=distance;}else{goal.yaw=clamp(goal.yaw+(e.clientX-prev.x)*.006,-1.72,1.72);goal.pitch=clamp(goal.pitch+(e.clientY-prev.y)*.004,.05,.75);prev={x:e.clientX,y:e.clientY};}view='custom';schedule();};
  const up=e=>{pointers.delete(e.pointerId);pinch=0;prev=[...pointers.values()][0]||null;canvas.style.cursor='grab';};
  const wheel=e=>{e.preventDefault();goal.zoom=clamp(goal.zoom*Math.exp(-e.deltaY*.001),.75,1.55);view='custom';schedule();};
  const keydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){setView('hero');return;}if(e.key==='ArrowLeft')goal.yaw=clamp(goal.yaw-.16,-1.72,1.72);if(e.key==='ArrowRight')goal.yaw=clamp(goal.yaw+.16,-1.72,1.72);if(e.key==='ArrowUp')goal.pitch=clamp(goal.pitch-.07,.05,.75);if(e.key==='ArrowDown')goal.pitch=clamp(goal.pitch+.07,.05,.75);if(e.key==='+')goal.zoom=clamp(goal.zoom+.1,.75,1.55);if(e.key==='-')goal.zoom=clamp(goal.zoom-.1,.75,1.55);view='custom';schedule();};
  canvas.style.touchAction='none';canvas.style.cursor='grab';const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up],['wheel',wheel,{passive:false}],['keydown',keydown]];listeners.forEach(([n,f,o])=>canvas.addEventListener(n,f,o));
  const onLost=e=>{e.preventDefault();if(raf)cancelAnimationFrame(raf);raf=0;canvas.dispatchEvent(new CustomEvent('toilet-render-state',{detail:{renderer:'webgl',contextLost:true}}));};const onRestored=()=>draw();canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
  const resize=new ResizeObserver(draw);resize.observe(canvas);const intersection=new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)schedule();else if(raf){cancelAnimationFrame(raf);raf=0;}});intersection.observe(canvas);const visibility=()=>{if(!document.hidden)schedule();};document.addEventListener('visibilitychange',visibility);
  function dispose(){if(disposed)return;disposed=true;if(raf)cancelAnimationFrame(raf);resize.disconnect();intersection.disconnect();stage.dispose();document.removeEventListener('visibilitychange',visibility);listeners.forEach(([n,f,o])=>canvas.removeEventListener(n,f,o));canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);clearModel();const geometries=new Set(),materials=new Set([ceramic,seatMat,chrome,rubber,dark,waterMat]);for(const s of [scene,envScene])s.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());grain.dispose();environment.dispose();pmrem.dispose();renderer.dispose();}
  draw();return {draw,setView,dispose,getViewState:state,rendererType:'webgl'};
}
function fallback(canvas,getState){
  const ctx=canvas.getContext('2d');let disposed=false,view='hero';
  function draw(){if(disposed||!ctx)return;const r=canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height),dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#ece9df';ctx.fillRect(0,0,w,h);const s=getState(),m=s.model,k=Math.min(w*.44/(m.width/365),h*.55/(m.height/485)),cx=w*.5,cy=h*.72;
    ctx.fillStyle='#d2ccbe';ctx.fillRect(0,cy+10,w,h);ctx.save();ctx.translate(cx,cy);ctx.scale(k,k);ctx.fillStyle=s.color;ctx.strokeStyle='#98a29a';ctx.lineWidth=.008;ctx.beginPath();ctx.roundRect(-.43,-.78,.86,.79,.18);ctx.fill();ctx.stroke();ctx.fillStyle='#b3c0b9';ctx.beginPath();ctx.ellipse(0,-.77,.40,.11,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=s.color;ctx.beginPath();ctx.ellipse(0,-.79-s.explode*.002,.45,.10,0,0,Math.PI*2);ctx.fill();if(s.lid>15){ctx.beginPath();ctx.ellipse(0,-1.14-s.explode*.004,.45,.39,0,0,Math.PI*2);ctx.fill();ctx.stroke();}if(m.tank){ctx.beginPath();ctx.roundRect(-.38,-1.55,.76,.72,.065);ctx.fill();ctx.stroke();}ctx.restore();ctx.font='12px system-ui';ctx.fillStyle='#596d62';ctx.textAlign='center';ctx.fillText('二维兼容形体图 · 现场条件与配置核对可用',w/2,h-70);canvas.dispatchEvent(new CustomEvent('toilet-render-state',{detail:{renderer:'canvas',kind:'toilet',modelId:m.id,view}}));
  }
  const resize=new ResizeObserver(draw);resize.observe(canvas);draw();return {draw,setView(v){view=v;draw();},dispose(){disposed=true;resize.disconnect();},rendererType:'canvas',getViewState:()=>({renderer:'canvas',kind:'toilet',view,modelId:getState().model.id})};
}
