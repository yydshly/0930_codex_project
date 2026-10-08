// Original parametric industrial design. Local Three.js is MIT licensed.
import './vendor/three-r160.min.js';
import {materialTexture,microTexture} from './scene-materials.js?v=20261002-8';

const T = globalThis.THREE;
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const parts = ['shade','diffuser','stem','base'];
const views = {
  hero:{yaw:.48,pitch:.32,zoom:1},
  front:{yaw:0,pitch:.31,zoom:1},
  detail:{yaw:.62,pitch:.27,zoom:1.47},
  structure:{yaw:.36,pitch:.31,zoom:1}
};

function availableWebGL(){
  try { const probe=document.createElement('canvas'); const gl=probe.getContext('webgl2')||probe.getContext('webgl'); if(!gl)return false; gl.getExtension('WEBGL_lose_context')?.loseContext();return true; } catch {return false;}
}
function gradientTexture(stops, size=256){
  const c=document.createElement('canvas');c.width=c.height=size;
  const context=c.getContext('2d'),gradient=context.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  stops.forEach(([p,color])=>gradient.addColorStop(p,color));context.fillStyle=gradient;context.fillRect(0,0,size,size);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;
}
function lathe(points,material){
  const geometry=new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),144);
  // LatheGeometry supplies identical normals at both sides of the UV seam.
  const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function ring(radius,tube,y,material,segments=144){
  const mesh=new T.Mesh(new T.TorusGeometry(radius,tube,12,segments),material);mesh.rotation.x=Math.PI/2;mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function cylinder(r1,r2,height,y,material,segments=96){
  const mesh=new T.Mesh(new T.CylinderGeometry(r1,r2,height,segments),material);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}

export function createProductRenderer(canvas,getState){
  if(!T||!availableWebGL())return createFallback(canvas,getState);
  let renderer;
  try {renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});} catch {return createFallback(canvas,getState);}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.VSMShadowMap;

  const scene=new T.Scene();scene.background=new T.Color('#eae7de');scene.fog=new T.Fog('#eae7de',13,38);
  const camera=new T.PerspectiveCamera(35,1,.1,70);
  // The room remains legible behind the close-up. It is a conceptual panorama,
  // with a fixed composition yaw, rather than a measured reconstruction.
  const roomScene=new T.Scene(),roomCamera=new T.PerspectiveCamera(60,1,.1,70),roomYawOffset=-.90;
  const grain=microTexture();const paint=new T.MeshPhysicalMaterial({color:'#356873',metalness:.07,roughness:.46,clearcoat:.16,clearcoatRoughness:.44,bumpMap:grain,bumpScale:.0018});
  const metal=new T.MeshStandardMaterial({color:'#e2d4bc',metalness:.94,roughness:.22,bumpMap:grain,bumpScale:.0008});
  const darkMetal=new T.MeshStandardMaterial({color:'#343e3e',metalness:.8,roughness:.32});
  const rubber=new T.MeshStandardMaterial({color:'#222c2b',roughness:.88,metalness:0});
  const diffuserMat=new T.MeshPhysicalMaterial({color:'#fffbef',roughness:.47,metalness:0,emissive:'#ffd58f',emissiveIntensity:.7,clearcoat:.13});
  const pcbMat=new T.MeshStandardMaterial({color:'#b69957',metalness:.58,roughness:.42});
  const ledMat=new T.MeshStandardMaterial({color:'#fff4d2',emissive:'#ffe6ad',emissiveIntensity:2,roughness:.28});
  const group=new T.Group();scene.add(group);
  const modules=Object.fromEntries(parts.map(p=>[p,new T.Group()]));Object.values(modules).forEach(g=>group.add(g));
  const ledModule=new T.Group();group.add(ledModule);
  const profiles={shade:[]};
  // Closed shell, with a rolled edge; no triangular facets in the silhouette.
  for(let i=0;i<=36;i++){const t=i/36*Math.PI/2;profiles.shade.push([1.105*Math.sin(t),2.315+.58*Math.cos(t)]);}
  profiles.shade.push([1.106,2.3],[1.102,2.284],[1.083,2.277],[1.055,2.287]);
  for(let i=36;i>=0;i--){const t=i/36*Math.PI/2;profiles.shade.push([1.055*Math.sin(t),2.306+.536*Math.cos(t)]);}
  modules.shade.add(lathe([...profiles.shade].reverse(),paint));
  const rim=ring(1.083,.012,2.279,metal);modules.shade.add(rim);
  const topKnob=cylinder(.047,.047,.007,2.9,paint);modules.shade.add(topKnob);
  // Slightly convex opal light plate, held separately from the painted shell.
  modules.diffuser.add(lathe([[0,2.163],[.18,2.163],[.50,2.174],[.81,2.191],[1.054,2.211],[1.080,2.228],[1.078,2.255],[1.051,2.267],[0,2.267]],diffuserMat));
  modules.diffuser.add(ring(1.063,.007,2.251,metal));
  // LED carrier and twelve visible emitter packages are exposed on disassembly.
  ledModule.add(cylinder(.58,.58,.036,2.23,pcbMat));
  ledModule.add(ring(.573,.016,2.244,darkMetal));
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,led=new T.Mesh(new T.BoxGeometry(.075,.027,.042),ledMat);
    led.position.set(Math.cos(a)*.43,2.255,Math.sin(a)*.43);led.rotation.y=-a;ledModule.add(led);
  }
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const screw=cylinder(.018,.018,.012,2.253,metal,32);screw.position.x=Math.cos(a)*.54;screw.position.z=Math.sin(a)*.54;ledModule.add(screw);}
  ledModule.add(cylinder(.105,.12,.15,2.12,darkMetal));
  // Tapered metal stem and discrete machining rings at its lower collar.
  modules.stem.add(lathe([[0,.247],[.084,.247],[.092,.288],[.094,.34],[.090,1.91],[.088,2.059],[.080,2.079],[0,2.079]],metal));
  modules.stem.add(cylinder(.096,.096,.044,.345,metal));
  modules.stem.add(cylinder(.09,.094,.064,2.075,metal));
  for(let i=0;i<4;i++)modules.stem.add(ring(.092,.0018,.414+i*.012,darkMetal,96));
  // Rounded cast base, non-slip foot, and a capacitive brass touch button.
  modules.base.add(lathe([[0,.045],[.61,.045],[.716,.055],[.759,.085],[.774,.129],[.768,.173],[.743,.214],[.69,.247],[.59,.267],[.25,.273],[0,.273]],paint));
  modules.base.add(ring(.704,.027,.048,rubber));
  modules.base.add(ring(.742,.004,.202,darkMetal));
  const button=cylinder(.07,.07,.012,.273,metal,64);button.position.set(.39,.27,.21);modules.base.add(button);
  const innerButton=cylinder(.052,.052,.007,.282,darkMetal,64);innerButton.position.set(.39,.28,.21);modules.base.add(innerButton);
  const indicator=new T.Mesh(new T.SphereGeometry(.009,12,8),ledMat);indicator.position.set(.39,.288,.235);modules.base.add(indicator);
  const cableCurve=new T.CatmullRomCurve3([new T.Vector3(0,.103,-.65),new T.Vector3(.17,.045,-1.0),new T.Vector3(.7,.028,-1.35),new T.Vector3(1.17,.026,-1.5)]);
  const cable=new T.Mesh(new T.TubeGeometry(cableCurve,48,.023,10,false),rubber);cable.castShadow=true;modules.base.add(cable);
  const port=cylinder(.029,.029,.12,.10,darkMetal,24);port.rotation.x=Math.PI/2;port.position.z=-.71;modules.base.add(port);

  // A real PMREM environment, generated locally from broad studio reflection panels.
  const environmentScene=new T.Scene();environmentScene.background=new T.Color('#d2d0c9');
  const enclosure=new T.Mesh(new T.BoxGeometry(30,18,30),new T.MeshBasicMaterial({color:'#bdbbb3',side:T.BackSide}));enclosure.position.y=7;environmentScene.add(enclosure);
  function panel(width,height,position,intensity){
    const m=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({color:new T.Color().setRGB(intensity,intensity,intensity)}));
    m.position.set(...position);m.lookAt(0,1.4,0);environmentScene.add(m);
  }
  panel(4,7,[-5,5,6],3.8);panel(2.5,7,[5,4,3],2.4);panel(6,3,[0,8,-3],3.5);panel(.75,6,[4,3,-5],1.6);
  const pmrem=new T.PMREMGenerator(renderer),environmentTarget=pmrem.fromScene(environmentScene,.045);scene.environment=environmentTarget.texture;
  let reflectionTarget=null,panoramaReady=false,panoramaFailed=false;
  const backgroundColor=new T.Color('#2e211b');
  const panorama=new T.TextureLoader().load(new URL('./assets/studio-environment-v5.webp',import.meta.url).href,()=>{if(disposed)return;panorama.mapping=T.EquirectangularReflectionMapping;
    // Capture the same oriented room for material highlights (r160 has no
    // Scene.backgroundRotation/environmentRotation properties).
    const captureScene=new T.Scene(),sphere=new T.Mesh(new T.SphereGeometry(24,64,40),new T.MeshBasicMaterial({map:panorama,side:T.BackSide}));sphere.rotation.y=roomYawOffset;captureScene.add(sphere);reflectionTarget=pmrem.fromScene(captureScene,.035);sphere.geometry.dispose();sphere.material.dispose();
    panoramaReady=true;stateFingerprint='';draw();},undefined,()=>{if(!disposed){panoramaReady=false;panoramaFailed=true;stateFingerprint='';draw();}});panorama.colorSpace=T.SRGBColorSpace;
  const stoneTexture=materialTexture('stone',[38,38],()=>draw()),woodTexture=materialTexture('wood',[.4,.4],()=>draw());
  const floorMat=new T.MeshStandardMaterial({color:'#80684f',bumpMap:grain,bumpScale:.002,roughness:.9,metalness:0});
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.125;floor.receiveShadow=true;scene.add(floor);
  // A solid walnut display slab gives the object a tactile, lit physical setting.
  const shape=new T.Shape(),w=1.9,d=1.55,r=.06;shape.moveTo(-w+r,-d);shape.lineTo(w-r,-d);shape.quadraticCurveTo(w,-d,w,-d+r);shape.lineTo(w,d-r);shape.quadraticCurveTo(w,d,w-r,d);shape.lineTo(-w+r,d);shape.quadraticCurveTo(-w,d,-w,d-r);shape.lineTo(-w,-d+r);shape.quadraticCurveTo(-w,-d,-w+r,-d);
  const woodMat=new T.MeshStandardMaterial({color:'#b79b76',map:woodTexture,bumpMap:woodTexture,bumpScale:.004,roughness:.69});
  const slab=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSegments:3,bevelSize:.012,bevelThickness:.01,curveSegments:16}),woodMat);slab.rotation.x=-Math.PI/2;slab.position.y=-.11;slab.receiveShadow=true;slab.castShadow=true;scene.add(slab);
  const tableSupport=new T.Group();scene.add(tableSupport);
  const supportMat=new T.MeshStandardMaterial({color:'#604a35',map:woodTexture,bumpMap:woodTexture,bumpScale:.003,roughness:.73});
  function tableMember(w,h,d,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,h,d),supportMat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;tableSupport.add(m);}
  for(const sign of [-1,1]){tableMember(3.52,.24,.075,0,-.21,sign*1.35);tableMember(.075,.24,2.65,sign*1.69,-.21,0);}
  for(const x of [-1.67,1.67])for(const z of [-1.31,1.31]){
    const leg=new T.Mesh(new T.CylinderGeometry(.07,.043,2.7,12),supportMat);leg.position.set(x,-1.49,z);leg.castShadow=true;leg.receiveShadow=true;tableSupport.add(leg);
  }
  const shadowTexture=gradientTexture([[0,'rgba(14,20,18,.42)'],[.28,'rgba(14,20,18,.32)'],[.6,'rgba(14,20,18,.10)'],[1,'rgba(14,20,18,0)']]);
  const contact=new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.36}));contact.rotation.x=-Math.PI/2;contact.position.y=.023;scene.add(contact);
  const glowTexture=gradientTexture([[0,'rgba(255,209,126,.6)'],[.32,'rgba(255,220,157,.26)'],[1,'rgba(255,220,157,0)']]);
  const glow=new T.Mesh(new T.PlaneGeometry(4.3,4.3),new T.MeshBasicMaterial({map:glowTexture,transparent:true,depthWrite:false,opacity:.15,blending:T.AdditiveBlending}));glow.rotation.x=-Math.PI/2;glow.position.y=.024;scene.add(glow);
  const key=new T.DirectionalLight('#fff0da',3.1);key.position.set(-3.6,6,4);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=6;key.shadow.camera.bottom=-3;key.shadow.camera.near=.1;key.shadow.camera.far=20;key.shadow.bias=-.0002;key.shadow.normalBias=.012;key.shadow.radius=6;key.shadow.blurSamples=12;scene.add(key);
  const fill=new T.DirectionalLight('#eaf4ff',.72);fill.position.set(4,3.5,3);scene.add(fill);
  const rimLight=new T.DirectionalLight('#ffffff',1.4);rimLight.position.set(1,5,-5);scene.add(rimLight);
  const ambient=new T.HemisphereLight('#ffffff','#928677',.35);scene.add(ambient);
  const bulb=new T.PointLight('#ffd99c',0,5,2);bulb.position.set(0,2.21,0);scene.add(bulb);

  let width=1,height=1,visible=true,disposed=false,raf=0,last=0,view='hero',part=null;
  let yaw=views.hero.yaw,pitch=views.hero.pitch,zoom=1,goalYaw=yaw,goalPitch=pitch,goalZoom=1;
  let explosion=clamp(Number(getState().explode)||0,0,100)/100,goalExplosion=explosion;
  let dragging=false,moved=false,prev={x:0,y:0},pointerMap=new Map(),pinch=0;
  let stateFingerprint='',eventFingerprint='',anchorFingerprint='',dirty=true,lastAnchorTime=0;
  const box=new T.Box3(),target=new T.Vector3(),projection=new T.Vector3();
  const anchors={shade:new T.Vector3(.87,2.48,0),diffuser:new T.Vector3(.84,2.24,0),stem:new T.Vector3(.13,1.18,0),base:new T.Vector3(.61,.17,.16)};
  function hidden(){return document.hidden||!visible||Boolean(canvas.closest('[hidden]'));}
  function emitState(){const d=getViewState();const fingerprint=JSON.stringify(d);if(fingerprint!==eventFingerprint){eventFingerprint=fingerprint;canvas.dispatchEvent(new CustomEvent('product-render-state',{detail:d}));}}
  function emitAnchors(force=false){
    const now=performance.now();if(!force&&now-lastAnchorTime<90)return;lastAnchorTime=now;
    const positions={};for(const p of parts){projection.copy(anchors[p]);modules[p].localToWorld(projection);projection.project(camera);positions[p]={x:Math.round((projection.x*.5+.5)*width),y:Math.round((-.5*projection.y+.5)*height),visible:projection.z>-1&&projection.z<1&&Math.abs(projection.x)<1&&Math.abs(projection.y)<1};}
    const fingerprint=JSON.stringify(positions);if(force||fingerprint!==anchorFingerprint){anchorFingerprint=fingerprint;canvas.dispatchEvent(new CustomEvent('product-anchors',{detail:positions}));}
  }
  function dimensions(){const r=canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);if(w!==width||h!==height){width=w;height=h;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();dirty=true;}}
  function applyConfiguration(state){
    goalExplosion=clamp(Number(state.explode)||0,0,100)/100;
    const fingerprint=JSON.stringify([state.color,state.finish,state.light,state.room,state.setting,state.reflections,panoramaReady]);if(fingerprint===stateFingerprint)return;stateFingerprint=fingerprint;
    paint.color.set(state.color||'#356873');const gloss=state.finish==='gloss';paint.roughness=gloss?.21:.46;paint.metalness=gloss?.09:.04;paint.clearcoat=gloss?.80:.13;paint.clearcoatRoughness=gloss?.20:.46;
    const amount=clamp(Number(state.light)||0,0,100)/100,night=state.room==='night';
    diffuserMat.color.set(amount>0?'#fff5dd':'#ecebe4');diffuserMat.emissiveIntensity=amount*(night?1.6:.65);ledMat.emissiveIntensity=amount*3;
    bulb.intensity=amount*(night?18:3.8);glow.material.opacity=amount*(night?.56:.08);
    const interior=state.setting==='interior'&&panoramaReady;
    backgroundColor.set(night?'#101e19':'#2e211b');scene.background=interior?null:backgroundColor;roomScene.background=panorama;roomScene.backgroundBlurriness=.006;roomScene.backgroundIntensity=night?.10:.82;floor.visible=!interior;tableSupport.visible=interior;scene.fog.color.copy(backgroundColor);floorMat.color.set(night?'#354c3b':'#80684f');woodMat.color.set(night?'#c3b596':'#b79b76');
    scene.environment=state.reflections===false?null:(reflectionTarget?.texture||environmentTarget.texture);
    key.intensity=night?.20:2.55;fill.intensity=night?.09:.23;rimLight.intensity=night?.32:.45;ambient.intensity=night?.10:.32;
    for(const material of [paint,metal,darkMetal,pcbMat,rubber])material.envMapIntensity=night?.42:1.45;
    renderer.toneMappingExposure=night?.95:1.06;
    dirty=true;
  }
  function framing(){
    // Reserve space for the editorial heading and the bottom view controls.
    const mobile=width<500,closeUp=view==='detail'||part!==null;
    const totalHeight=2.9+explosion*1.55,centerY=1.45+explosion*(mobile?.775:.58);
    const usableH=clamp((height-(mobile?190:150)-(mobile?86:closeUp?64:96))/height,.44,.78);
    const usableW=mobile?.89:.79;
    const t=Math.tan(camera.fov*Math.PI/360);
    const showTable=getState().setting==='interior'&&(view==='hero'||view==='front');
    const verticalDistance=(totalHeight*.97*(showTable?1.10:1))/(2*t*usableH),horizontalDistance=2.38/(2*t*camera.aspect*usableW);
    let distance=Math.max(verticalDistance,horizontalDistance)/zoom;
    // A detail preset enlarges the object, but preserves the complete curved edge.
    // User-controlled custom zoom is free to inspect a closer crop.
    if(view==='detail'&&(part===null||part==='shade'||part==='diffuser'))distance=Math.max(distance,horizontalDistance);
    if(view==='detail'&&part==='base')distance=Math.max(distance,1.72/(2*t*camera.aspect*usableW));
    let focusY=centerY;
    if(view==='detail'||part==='shade'||part==='diffuser')focusY=2.34+explosion*.8;
    if(part==='base')focusY=.36-explosion*.38;
    if(part==='stem')focusY=1.2;
    const offset=(mobile?.108:closeUp?.055:0)*distance*2*t;
    target.set(0,focusY+offset,0);
    camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);
    camera.lookAt(target);camera.updateMatrixWorld();
  }
  function step(timestamp,force=false){
    const offscreen=hidden();
    raf=0;if(disposed||canvas.closest('[hidden]')||(!force&&offscreen)){last=0;return;}
    dimensions();const s=getState();applyConfiguration(s);const dt=Math.min(250,last?timestamp-last:16);last=timestamp;
    const speed=reducedMotion()||(force&&offscreen)?1:1-Math.exp(-dt/135);
    explosion+=(goalExplosion-explosion)*speed;yaw+=(goalYaw-yaw)*speed;pitch+=(goalPitch-pitch)*speed;zoom+=(goalZoom-zoom)*speed;
    if(s.spin&&!dragging&&!offscreen){goalYaw+=dt*.00016;yaw=goalYaw;dirty=true;}
    modules.shade.position.y=explosion*1.18;modules.diffuser.position.y=explosion*.47;ledModule.position.y=explosion*.19;modules.base.position.y=-explosion*.37;
    group.position.y=explosion*.37;bulb.position.y=2.21+explosion*.84;contact.material.opacity=.36-explosion*.06;
    scene.updateMatrixWorld();framing();
    if(s.setting==='interior'&&panoramaReady){
      roomCamera.aspect=width/height;roomCamera.updateProjectionMatrix();
      const roomYaw=yaw+roomYawOffset;roomCamera.lookAt(-Math.sin(roomYaw),.075,-Math.cos(roomYaw));roomCamera.updateMatrixWorld();
      renderer.autoClear=false;renderer.clear();renderer.render(roomScene,roomCamera);renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;
    }else renderer.render(scene,camera);
    emitState();emitAnchors();dirty=false;
    const moving=Math.abs(explosion-goalExplosion)>.001||Math.abs(yaw-goalYaw)>.001||Math.abs(pitch-goalPitch)>.001||Math.abs(zoom-goalZoom)>.001;
    if(!offscreen&&(moving||s.spin||dragging))raf=requestAnimationFrame(step);else last=0;
  }
  function schedule(){if(!disposed&&!raf&&!hidden())raf=requestAnimationFrame(step);}
  function draw(){if(disposed)return;dirty=true;applyConfiguration(getState());if(!canvas.closest('[hidden]')){if(raf){cancelAnimationFrame(raf);raf=0;}dimensions();step(performance.now(),true);emitAnchors(true);}}
  function setView(next){const v=views[next];if(!v)return;view=next;part=null;goalYaw=v.yaw;goalPitch=v.pitch;goalZoom=v.zoom;dirty=true;emitState();schedule();}
  function focus(next){if(!parts.includes(next))return;part=next;view='detail';goalZoom=next==='base'?1.42:1.28;goalYaw=.45;goalPitch=next==='shade'||next==='diffuser'?.10:.28;dirty=true;emitState();schedule();}
  const onDown=e=>{pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);dragging=true;moved=false;prev={x:e.clientX,y:e.clientY};if(pointerMap.size===2){const pts=[...pointerMap.values()];pinch=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);}canvas.style.cursor='grabbing';};
  const onMove=e=>{if(!pointerMap.has(e.pointerId))return;pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointerMap.size===2){const p=[...pointerMap.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)goalZoom=clamp(goalZoom*distance/pinch,.7,1.65);pinch=distance;}else{const dx=e.clientX-prev.x,dy=e.clientY-prev.y;goalYaw+=dx*.008;goalPitch=clamp(goalPitch+dy*.005,-.13,.67);moved=moved||Math.abs(dx)+Math.abs(dy)>2;prev={x:e.clientX,y:e.clientY};}view='custom';part=null;dirty=true;schedule();};
  const onUp=e=>{pointerMap.delete(e.pointerId);dragging=pointerMap.size>0;pinch=0;canvas.style.cursor='grab';if(dragging)prev=[...pointerMap.values()][0];schedule();};
  const onWheel=e=>{e.preventDefault();goalZoom=clamp(goalZoom*Math.exp(-e.deltaY*.001),.7,1.65);view='custom';part=null;dirty=true;schedule();};
  const onKey=e=>{const actions={ArrowLeft:()=>goalYaw-=.18,ArrowRight:()=>goalYaw+=.18,ArrowUp:()=>goalPitch=clamp(goalPitch-.08,-.13,.67),ArrowDown:()=>goalPitch=clamp(goalPitch+.08,-.13,.67),'+':()=>goalZoom=clamp(goalZoom+.08,.7,1.65),'-':()=>goalZoom=clamp(goalZoom-.08,.7,1.65),Home:()=>setView('hero')};if(actions[e.key]){e.preventDefault();actions[e.key]();if(e.key!=='Home'){view='custom';part=null;}dirty=true;schedule();}};
  canvas.style.touchAction='none';canvas.style.cursor='grab';
  canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);canvas.addEventListener('lostpointercapture',onUp);canvas.addEventListener('wheel',onWheel,{passive:false});canvas.addEventListener('keydown',onKey);
  const onVisibility=()=>{if(!document.hidden)schedule();};document.addEventListener('visibilitychange',onVisibility);
  const resize=new ResizeObserver(()=>{dirty=true;schedule();});resize.observe(canvas);
  // Scene selection and anchor scrolling can queue several entries for this canvas.
  // The newest entry describes its current visibility; the first may be stale.
  const intersection=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)schedule();else if(raf){cancelAnimationFrame(raf);raf=0;last=0;}});intersection.observe(canvas);
  const onLost=e=>{e.preventDefault();if(raf)cancelAnimationFrame(raf);raf=0;canvas.dispatchEvent(new CustomEvent('product-render-state',{detail:{renderer:'webgl',view,zoom,part,contextLost:true}}));};
  const onRestored=()=>{dirty=true;schedule();};canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
  function dispose(){
    if(disposed)return;disposed=true;if(raf)cancelAnimationFrame(raf);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',onVisibility);
    for(const [name,fn] of [['pointerdown',onDown],['pointermove',onMove],['pointerup',onUp],['pointercancel',onUp],['lostpointercapture',onUp],['wheel',onWheel],['keydown',onKey],['webglcontextlost',onLost],['webglcontextrestored',onRestored]])canvas.removeEventListener(name,fn);
    const geometries=new Set(),materials=new Set();for(const source of [scene,environmentScene])source.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());shadowTexture.dispose();glowTexture.dispose();stoneTexture.dispose();woodTexture.dispose();grain.dispose();panorama.dispose();reflectionTarget?.dispose();environmentTarget.dispose();pmrem.dispose();renderer.dispose();
  }
  function getViewState(){return {renderer:'webgl',view,zoom:Number(zoom.toFixed(2)),part,setting:getState().setting||'studio',reflections:getState().reflections!==false,environmentReady:panoramaReady,environmentFailed:panoramaFailed,backgroundSource:getState().setting==='interior'&&panoramaReady?'generated-panorama':'studio-color'};}
  draw();return {draw,setView,focus,dispose,rendererType:'webgl',reset(){view='hero';part=null;goalYaw=views.hero.yaw;goalPitch=views.hero.pitch;goalZoom=1;emitState();schedule();},getViewState};
}

// A deliberately labelled fallback, preserving configuration and image export.
function createFallback(canvas,getState){
  const ctx=canvas.getContext('2d');let view='hero',zoom=1,part=null,disposed=false;
  function draw(){
    if(disposed||!ctx||canvas.closest('[hidden]'))return;
    const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,r.width),h=Math.max(1,r.height);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const s=getState(),night=s.room==='night',e=clamp(Number(s.explode)||0,0,100)/100,color=s.color||'#3478fa';
    const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,night?'#223538':'#f4f0e7');bg.addColorStop(1,night?'#142125':'#dcd8ce');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const scale=Math.min(w*.34,(h-160)/((3.1+e*1.6)*1.3))*zoom,cx=w*.5,cy=h*.6;
    ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);const light=s.light/100;
    function painted(x,y,width,height,radius){const gradient=ctx.createLinearGradient(x,y,x+width,y);gradient.addColorStop(0,'#fff6');gradient.addColorStop(.22,color);gradient.addColorStop(.68,color);gradient.addColorStop(1,'#0005');ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(x,y,width,height,radius);ctx.fill();}
    ctx.save();ctx.translate(0,1.3);ctx.scale(1,.16);const sh=ctx.createRadialGradient(0,0,0,0,0,1.2);sh.addColorStop(0,'#0006');sh.addColorStop(1,'#0000');ctx.fillStyle=sh;ctx.fillRect(-1.3,-1.3,2.6,2.6);ctx.restore();
    painted(-.15,-.7,.3,1.74,.09);painted(-.76,1,.0+1.52,.23,.15);
    const sy=-.74-e*1.03;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-1.1,sy);ctx.bezierCurveTo(-1.12,sy-.71,1.12,sy-.71,1.1,sy);ctx.bezierCurveTo(.72,sy+.12,-.72,sy+.12,-1.1,sy);ctx.fill();
    const dome=ctx.createLinearGradient(-1,sy-.55,1,sy);dome.addColorStop(0,'#ffffff66');dome.addColorStop(.45,'#fff0');dome.addColorStop(1,'#0004');ctx.fillStyle=dome;ctx.fill();
    ctx.fillStyle=`rgb(255,${Math.round(229+light*20)},${Math.round(187+light*42)})`;ctx.beginPath();ctx.ellipse(0,-.69-e*.47,1.035,.095,0,0,Math.PI*2);ctx.fill();
    ctx.restore();ctx.font='11px system-ui';ctx.fillStyle=night?'#bbcccb':'#566864';ctx.textAlign='center';ctx.fillText('当前设备使用二维预览 · 可调整配置并导出画面',w/2,h-78);
    canvas.dispatchEvent(new CustomEvent('product-render-state',{detail:getViewState()}));
  }
  const resize=new ResizeObserver(draw);resize.observe(canvas);const observe=new IntersectionObserver(e=>{if(e[e.length-1].isIntersecting)draw();});observe.observe(canvas);
  function getViewState(){return {renderer:'canvas',view,zoom,part,setting:'studio',reflections:false,environmentReady:false,environmentFailed:false,backgroundSource:'canvas-gradient'};}
  draw();return {draw,rendererType:'canvas',setView(next){view=next;zoom=next==='detail'?1.25:1;draw();},focus(next){part=next;view='detail';zoom=1.2;draw();},reset(){view='hero';part=null;zoom=1;draw();},dispose(){disposed=true;resize.disconnect();observe.disconnect();},getViewState};
}
