import '../vendor/three-r160.min.js';
const T=globalThis.THREE,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const views={hero:{yaw:.72,pitch:.25,zoom:1},front:{yaw:0,pitch:.20,zoom:1},side:{yaw:Math.PI/2,pitch:.17,zoom:1},structure:{yaw:.62,pitch:.26,zoom:.95}};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function hasGL(){try{const c=document.createElement('canvas'),g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return false;g.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}}
// A closed elliptical shell, including its inner bowl. Geometry is original.
function shell(profile,material,segments=96){
  const pos=[],uv=[],idx=[];
  for(let j=0;j<profile.length;j++)for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,p=profile[j],n=p.n||2.6,co=Math.cos(a),si=Math.sin(a);
    pos.push(Math.sign(co)*Math.pow(Math.abs(co),2/n)*p.rx,p.y,Math.sign(si)*Math.pow(Math.abs(si),2/n)*p.rz+(p.z||0));uv.push(i/segments,j/(profile.length-1));
  }
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const mesh=new T.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function rounded(w,h,d,r,material){
  r=Math.min(r,w/3,h/3,d/3);const s=new T.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:5,steps:1,curveSegments:16});g.translate(0,0,-(d-2*r)/2);g.computeVertexNormals();
  const m=new T.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;return m;
}
function disc(rx,rz,y,z,material){const m=new T.Mesh(new T.CircleGeometry(1,80),material);m.rotation.x=-Math.PI/2;m.scale.set(rx,rz,1);m.position.set(0,y,z);m.receiveShadow=true;return m;}
function grainTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),img=x.createImageData(128,128);let seed=241;for(let i=0;i<img.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=122+(seed%13);img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;}x.putImageData(img,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(8,8);return t;}
export function createToiletRenderer(canvas,getState){
  if(!T||!hasGL())return fallback(canvas,getState);
  let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});}catch{return fallback(canvas,getState);}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene();scene.background=new T.Color('#ece9e1');const camera=new T.PerspectiveCamera(36,1,.04,40);
  const grain=grainTexture(),ceramic=new T.MeshPhysicalMaterial({color:'#f5f1e7',roughness:.18,clearcoat:.86,clearcoatRoughness:.12,metalness:0,ior:1.48,side:T.DoubleSide});
  const seatMat=new T.MeshPhysicalMaterial({color:'#f5f1e7',roughness:.26,clearcoat:.65,clearcoatRoughness:.19,side:T.DoubleSide});
  const chrome=new T.MeshStandardMaterial({color:'#bebeb5',metalness:1,roughness:.18}),rubber=new T.MeshStandardMaterial({color:'#777e79',roughness:.82}),dark=new T.MeshStandardMaterial({color:'#25322e',roughness:.4});
  const tileMat=new T.MeshStandardMaterial({color:'#b4b6ac',roughness:.48,bumpMap:grain,bumpScale:.009}),wallMat=new T.MeshStandardMaterial({color:'#b5beae',roughness:.83,bumpMap:grain,bumpScale:.009}),wood=new T.MeshStandardMaterial({color:'#7e5d42',roughness:.65,bumpMap:grain,bumpScale:.004}),brass=new T.MeshStandardMaterial({color:'#ab9367',metalness:.88,roughness:.31});
  const waterMat=new T.MeshPhysicalMaterial({color:'#b8d8d1',transparent:true,opacity:.62,roughness:.11,metalness:.07,clearcoat:1});
  const room=new T.Group();scene.add(room);
  const floor=new T.Mesh(new T.PlaneGeometry(9,10),tileMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;room.add(floor);
  const wall=new T.Mesh(new T.PlaneGeometry(9,6),wallMat);wall.position.set(0,2.5,-1.35);wall.receiveShadow=true;room.add(wall);
  const grout=new T.LineBasicMaterial({color:'#bcb8ab',transparent:true,opacity:.52});
  const floorLines=[];for(let i=-5;i<=5;i++){floorLines.push(new T.Vector3(i*.72,-.008,-4),new T.Vector3(i*.72,-.008,4),new T.Vector3(-4,-.008,i*.72),new T.Vector3(4,-.008,i*.72));}
  const lines=new T.LineSegments(new T.BufferGeometry().setFromPoints(floorLines),grout);room.add(lines);
  const wallLines=[];for(let i=-4;i<=4;i++)wallLines.push(new T.Vector3(i*.92,-.02,-1.346),new T.Vector3(i*.92,5,-1.346));for(let i=1;i<=5;i++)wallLines.push(new T.Vector3(-4,i*.74,-1.346),new T.Vector3(4,i*.74,-1.346));room.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(wallLines),new T.LineBasicMaterial({color:'#c7c3b7',transparent:true,opacity:.5})));
  // A wall panel and a restrained niche keep the product in an actual 3D room.
  for(let i=0;i<13;i++){const slat=new T.Mesh(new T.BoxGeometry(.042,4.2,.035),wood);slat.position.set(1.35+i*.068,2.07,-1.31);slat.castShadow=true;room.add(slat);}
  const niche=new T.Mesh(new T.BoxGeometry(.89,.77,.02),new T.MeshStandardMaterial({color:'#89938b',roughness:.86}));niche.position.set(-1.51,2.05,-1.325);room.add(niche);
  const shelf=new T.Mesh(new T.BoxGeometry(.94,.055,.28),tileMat);shelf.position.set(-1.51,1.64,-1.20);shelf.castShadow=true;room.add(shelf);
  const bottle=rounded(.115,.25,.095,.025,new T.MeshStandardMaterial({color:'#414c3f',roughness:.48}));bottle.position.set(-1.68,1.79,-1.13);room.add(bottle);const cap=new T.Mesh(new T.CylinderGeometry(.03,.03,.04,24),brass);cap.position.set(-1.68,1.94,-1.13);room.add(cap);
  const towelRail=new T.Mesh(new T.CylinderGeometry(.014,.014,.57,20),brass);towelRail.rotation.z=Math.PI/2;towelRail.position.set(-1.51,1.17,-1.08);room.add(towelRail);
  const towel=new T.Mesh(new T.PlaneGeometry(.36,.47),new T.MeshStandardMaterial({color:'#eee9d8',roughness:1,side:T.DoubleSide,bumpMap:grain,bumpScale:.005}));towel.position.set(-1.47,.935,-1.065);room.add(towel);
  const key=new T.DirectionalLight('#fff1df',2.7);key.position.set(-3.4,6,4);key.castShadow=true;key.shadow.mapSize.set(1536,1536);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-3;key.shadow.normalBias=.018;key.shadow.bias=-.00025;key.shadow.radius=3;scene.add(key);
  const fill=new T.DirectionalLight('#e1edf1',.85);fill.position.set(3,3,2);scene.add(fill);scene.add(new T.HemisphereLight('#f1f3e8','#9e9480',1.05));
  const envScene=new T.Scene();envScene.background=new T.Color('#bfc2b9');const enclosure=new T.Mesh(new T.BoxGeometry(20,16,20),new T.MeshBasicMaterial({color:'#9a9e92',side:T.BackSide}));envScene.add(enclosure);
  for(const [w,h,x,y,z,intensity] of [[4,6,-4,3,4,4.5],[2,5,4,3,2,2.3],[6,3,0,6,-2,3.2]]){const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color().setRGB(intensity,intensity,intensity)}));panel.position.set(x,y,z);panel.lookAt(0,1,0);envScene.add(panel);}
  const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(envScene,.045);scene.environment=environment.texture;
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
    clearModel();newModel=m.id;const w=m.width*.003,d=m.depth*.003,h=m.height*.003,sy=m.seatHeight*.003,rz=d*(m.tank?.325:.415),center=m.tank?.27:.10,rx=w*.48,rim=sy-.085;
    bodyGroup=new T.Group();seatGroup=new T.Group();lidPivot=new T.Group();tankGroup=new T.Group();rulers=new T.Group();modelGroup.add(bodyGroup,seatGroup,lidPivot,tankGroup,rulers);
    const profile=[
      {y:.025,rx:rx*.65,rz:rz*.71,z:center-.045},{y:.065,rx:rx*.69,rz:rz*.74,z:center-.045},{y:.18,rx:rx*.73,rz:rz*.78,z:center-.035},{y:rim*.40,rx:rx*.78,rz:rz*.83,z:center-.025},{y:rim*.61,rx:rx*.87,rz:rz*.91,z:center},{y:rim*.79,rx:rx*.96,rz:rz*.975,z:center},{y:rim-.10,rx:rx,rz,z:center},{y:rim-.018,rx:rx*1.01,rz:rz*1.005,z:center},{y:rim+.018,rx:rx*.975,rz:rz*.975,z:center},{y:rim+.015,rx:rx*.755,rz:rz*.78,z:center+.025},{y:rim-.065,rx:rx*.73,rz:rz*.76,z:center+.025},{y:rim-.18,rx:rx*.66,rz:rz*.68,z:center+.05},{y:rim*.56,rx:rx*.48,rz:rz*.47,z:center+.075},{y:.46,rx:.14,rz:.18,z:center+.10},{y:.43,rx:.115,rz:.14,z:center+.10}
    ];bodyGroup.add(shell(profile,ceramic));bodyGroup.add(disc(.116,.141,.431,center+.10,dark));bodyGroup.add(disc(.16,.195,.462,center+.10,waterMat));
    // The back skirt joins the bowl to the tank/valve enclosure.
    const back=rounded(w*.68,rim-.1,d*.23,.075,ceramic);back.position.set(0,(rim-.1)/2+.03,-d*.34);bodyGroup.add(back);
    const foot=disc(rx*.64,rz*.70,.023,center-.045,rubber);bodyGroup.add(foot);
    const seatRx=rx*.99,seatRz=rz*.985;
    seatGroup.position.y=sy-.035;seatGroup.add(shell([{y:-.025,rx:seatRx,rz:seatRz,z:center},{y:.028,rx:seatRx,rz:seatRz,z:center},{y:.028,rx:seatRx*.72,rz:seatRz*.745,z:center+.026},{y:-.025,rx:seatRx*.72,rz:seatRz*.745,z:center+.026},{y:-.025,rx:seatRx,rz:seatRz,z:center}],seatMat));
    const hingeZ=center-seatRz*.88;lidPivot.position.set(0,sy+.018,hingeZ);lidPivot.userData.baseY=sy+.018;
    const lr=seatRx*1.025,lz=seatRz*1.035;
    lidPivot.add(shell([{y:0,rx:0,rz:0,z:lz*.86},{y:0,rx:lr*.94,rz:lz*.94,z:lz*.86},{y:.021,rx:lr,rz:lz,z:lz*.86},{y:.049,rx:lr*.94,rz:lz*.94,z:lz*.86},{y:.057,rx:lr*.7,rz:lz*.7,z:lz*.86},{y:.063,rx:0,rz:0,z:lz*.86}],seatMat));
    for(const x of [-w*.22,w*.22]){const hinge=new T.Mesh(new T.CylinderGeometry(.035,.035,.095,32),chrome);hinge.rotation.z=Math.PI/2;hinge.position.set(x,sy+.012,hingeZ);bodyGroup.add(hinge);}
    if(m.tank){
      const th=Math.max(.5,h-rim-.085),tank=rounded(w*.90,th,d*.195,.055,ceramic);tank.position.set(0,rim+th/2,-d*.365);tankGroup.add(tank);
      const tankLid=rounded(w*.94,.045,d*.212,.015,seatMat);tankLid.position.set(0,h-.055,-d*.365);tankGroup.add(tankLid);
      const flush=new T.Mesh(new T.CylinderGeometry(.071,.071,.018,48),chrome);flush.position.set(0,h-.018,-d*.365);tankGroup.add(flush);
      const divide=new T.Mesh(new T.BoxGeometry(.002,.021,.11),dark);divide.position.copy(flush.position);tankGroup.add(divide);
    }else{
      const smart=rounded(w*.91,Math.max(.12,h-sy-.06),d*.20,.048,seatMat);smart.position.set(0,sy+.08,-d*.35);tankGroup.add(smart);
      const line=new T.Mesh(new T.BoxGeometry(w*.76,.006,.005),dark);line.position.set(0,sy+.086,-d*.245);tankGroup.add(line);
      const button=new T.Mesh(new T.CylinderGeometry(.025,.025,.007,32),chrome);button.rotation.z=Math.PI/2;button.position.set(w*.463,sy+.068,-d*.33);tankGroup.add(button);
    }
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
  function state(){return {renderer:'webgl',kind:'toilet',modelId:newModel,view,zoom:Number(zoom.toFixed(3)),yaw:Number(yaw.toFixed(3)),pitch:Number(pitch.toFixed(3)),backgroundSource:'procedural-bathroom',dimensions:getState().dimensions===true};}
  function emit(){const s=state(),f=JSON.stringify(s);if(f!==fingerprint){fingerprint=f;canvas.dispatchEvent(new CustomEvent('toilet-render-state',{detail:s}));}}
  function step(now,force=false){raf=0;if(disposed||canvas.closest('[hidden]')||(!force&&hidden())){last=0;return;}dimensions();const s=getState();if(newModel!==s.model.id)buildModel(s.model);
    const dt=Math.min(100,last?now-last:16);last=now;const factor=reduced()||force?1:1-Math.exp(-dt/130);yaw+=(goal.yaw-yaw)*factor;pitch+=(goal.pitch-pitch)*factor;zoom+=(goal.zoom-zoom)*factor;lid+=(s.lid/100*1.72-lid)*factor;explode+=(s.explode/100-explode)*factor;
    ceramic.color.set(s.color);seatMat.color.set(s.color);seatGroup.position.y=s.model.seatHeight*.003-.035+explode*.39;lidPivot.position.y=lidPivot.userData.baseY+explode*.80;lidPivot.rotation.x=-lid;tankGroup.position.y=explode*.42;rulers.visible=s.dimensions===true;
    scene.updateMatrixWorld();pose();renderer.render(scene,camera);emit();const moving=Math.abs(yaw-goal.yaw)+Math.abs(pitch-goal.pitch)+Math.abs(zoom-goal.zoom)+Math.abs(lid-s.lid/100*1.72)+Math.abs(explode-s.explode/100)>.002;
    if(moving&&!hidden())raf=requestAnimationFrame(step);else last=0;
  }
  function schedule(){if(!disposed&&!raf&&!hidden())raf=requestAnimationFrame(step);}
  function draw(){if(disposed)return;if(raf)cancelAnimationFrame(raf);raf=0;step(performance.now(),true);}
  function setView(next){if(!views[next])return;view=next;goal={...views[next]};draw();}
  const pointers=new Map();let prev=null,pinch=0;
  const down=e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);prev={x:e.clientX,y:e.clientY};if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}canvas.style.cursor='grabbing';};
  const move=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)goal.zoom=clamp(goal.zoom*distance/pinch,.75,1.55);pinch=distance;}else{goal.yaw=clamp(goal.yaw+(e.clientX-prev.x)*.006,-1.72,1.72);goal.pitch=clamp(goal.pitch+(e.clientY-prev.y)*.004,.05,.75);prev={x:e.clientX,y:e.clientY};}view='custom';schedule();};
  const up=e=>{pointers.delete(e.pointerId);pinch=0;prev=[...pointers.values()][0]||null;canvas.style.cursor='grab';};
  const wheel=e=>{e.preventDefault();goal.zoom=clamp(goal.zoom*Math.exp(-e.deltaY*.001),.75,1.55);view='custom';schedule();};
  const keydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){setView('hero');return;}if(e.key==='ArrowLeft')goal.yaw=clamp(goal.yaw-.16,-1.72,1.72);if(e.key==='ArrowRight')goal.yaw=clamp(goal.yaw+.16,-1.72,1.72);if(e.key==='ArrowUp')goal.pitch=clamp(goal.pitch-.07,.05,.75);if(e.key==='ArrowDown')goal.pitch=clamp(goal.pitch+.07,.05,.75);if(e.key==='+')goal.zoom=clamp(goal.zoom+.1,.75,1.55);if(e.key==='-')goal.zoom=clamp(goal.zoom-.1,.75,1.55);view='custom';schedule();};
  canvas.style.touchAction='none';canvas.style.cursor='grab';const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up],['wheel',wheel,{passive:false}],['keydown',keydown]];listeners.forEach(([n,f,o])=>canvas.addEventListener(n,f,o));
  const onLost=e=>{e.preventDefault();if(raf)cancelAnimationFrame(raf);raf=0;canvas.dispatchEvent(new CustomEvent('toilet-render-state',{detail:{renderer:'webgl',contextLost:true}}));};const onRestored=()=>draw();canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
  const resize=new ResizeObserver(draw);resize.observe(canvas);const intersection=new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)schedule();else if(raf){cancelAnimationFrame(raf);raf=0;}});intersection.observe(canvas);const visibility=()=>{if(!document.hidden)schedule();};document.addEventListener('visibilitychange',visibility);
  function dispose(){if(disposed)return;disposed=true;if(raf)cancelAnimationFrame(raf);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);listeners.forEach(([n,f,o])=>canvas.removeEventListener(n,f,o));canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);clearModel();const geometries=new Set(),materials=new Set([ceramic,seatMat,chrome,rubber,dark,waterMat]);for(const s of [scene,envScene])s.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());grain.dispose();environment.dispose();pmrem.dispose();renderer.dispose();}
  draw();return {draw,setView,dispose,getViewState:state,rendererType:'webgl'};
}
function fallback(canvas,getState){
  const ctx=canvas.getContext('2d');let disposed=false,view='hero';
  function draw(){if(disposed||!ctx)return;const r=canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height),dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#ece9df';ctx.fillRect(0,0,w,h);const s=getState(),m=s.model,k=Math.min(w*.44/(m.width/365),h*.55/(m.height/485)),cx=w*.5,cy=h*.72;
    ctx.fillStyle='#d2ccbe';ctx.fillRect(0,cy+10,w,h);ctx.save();ctx.translate(cx,cy);ctx.scale(k,k);ctx.fillStyle=s.color;ctx.strokeStyle='#98a29a';ctx.lineWidth=.008;ctx.beginPath();ctx.roundRect(-.43,-.78,.86,.79,.18);ctx.fill();ctx.stroke();ctx.fillStyle='#b3c0b9';ctx.beginPath();ctx.ellipse(0,-.77,.40,.11,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=s.color;ctx.beginPath();ctx.ellipse(0,-.79-s.explode*.002,.45,.10,0,0,Math.PI*2);ctx.fill();if(s.lid>15){ctx.beginPath();ctx.ellipse(0,-1.14-s.explode*.004,.45,.39,0,0,Math.PI*2);ctx.fill();ctx.stroke();}if(m.tank){ctx.beginPath();ctx.roundRect(-.38,-1.55,.76,.72,.065);ctx.fill();ctx.stroke();}ctx.restore();ctx.font='12px system-ui';ctx.fillStyle='#596d62';ctx.textAlign='center';ctx.fillText('二维兼容形体图 · 现场条件与配置核对可用',w/2,h-70);canvas.dispatchEvent(new CustomEvent('toilet-render-state',{detail:{renderer:'canvas',kind:'toilet',modelId:m.id,view}}));
  }
  const resize=new ResizeObserver(draw);resize.observe(canvas);draw();return {draw,setView(v){view=v;draw();},dispose(){disposed=true;resize.disconnect();},rendererType:'canvas',getViewState:()=>({renderer:'canvas',kind:'toilet',view,modelId:getState().model.id})};
}
