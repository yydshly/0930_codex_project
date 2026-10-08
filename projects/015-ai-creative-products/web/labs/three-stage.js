import '../demo/runtime/vendor/three-r160.min.js';
export const T=window.THREE;
export function createStage(element,{background='#183d35',target=[0,.8,0],radius=14,yaw=.7,pitch=.65,minAspect=1.35}={}){
  let canvas=element,renderer;
  try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});}
  catch{
    const replacement=canvas.cloneNode(true);canvas.replaceWith(replacement);canvas=replacement;
    return {supported:false,canvas,context:canvas.getContext('2d'),dispose(){}};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
  const scene=new T.Scene();scene.background=new T.Color(background);
  const camera=new T.PerspectiveCamera(43,1,.1,150),focus=new T.Vector3(...target);
  let width=0,height=0,disposed=false,drag=null,resolutionLimit=null;
  const controller=new AbortController(),signal=controller.signal;
  function updateCamera(){const viewRadius=radius*Math.max(1,minAspect/camera.aspect);camera.position.set(focus.x+Math.sin(yaw)*Math.cos(pitch)*viewRadius,focus.y+Math.sin(pitch)*viewRadius,focus.z+Math.cos(yaw)*Math.cos(pitch)*viewRadius);camera.lookAt(focus);}
  function resize(){const rect=canvas.getBoundingClientRect();if(rect.width!==width||rect.height!==height){width=Math.max(1,rect.width);height=Math.max(1,rect.height);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7,resolutionLimit?resolutionLimit/width:Infinity));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}}
  function setResolutionLimit(value){resolutionLimit=value;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7,value?value/Math.max(1,width):Infinity));}
  function draw(){if(disposed)return;resize();updateCamera();renderer.render(scene,camera);}
  const observer=new ResizeObserver(draw);observer.observe(canvas);
  canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);},{signal});
  canvas.addEventListener('pointermove',event=>{if(!drag)return;yaw-=(event.clientX-drag.x)*.007;pitch=Math.min(1.3,Math.max(.12,pitch+(event.clientY-drag.y)*.006));drag={x:event.clientX,y:event.clientY};draw();},{signal});
  canvas.addEventListener('pointerup',()=>drag=null,{signal});canvas.addEventListener('pointercancel',()=>drag=null,{signal});
  canvas.addEventListener('wheel',event=>{event.preventDefault();radius=Math.min(32,Math.max(6,radius+event.deltaY*.009));draw();},{signal,passive:false});
  canvas.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')yaw-=.15;else if(event.key==='ArrowRight')yaw+=.15;else if(event.key==='ArrowUp')pitch=Math.min(1.3,pitch+.08);else if(event.key==='ArrowDown')pitch=Math.max(.12,pitch-.08);else return;event.preventDefault();draw();},{signal});
  return {supported:true,canvas,renderer,scene,camera,draw,setResolutionLimit,setFraming({target,radius:nextRadius}){focus.set(...target);radius=nextRadius;},orbit(delta){yaw+=delta;draw();},setTarget(x,y,z){focus.set(x,y,z);draw();},getOrbit:()=>({yaw,pitch,radius}),dispose(){disposed=true;controller.abort();observer.disconnect();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])if(material){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();}};
}
export function mesh(geometry,color){const object=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.65}));object.castShadow=true;object.receiveShadow=true;return object;}
export function box(width,height,depth,color,x=0,y=0,z=0){const object=mesh(new T.BoxGeometry(width,height,depth),color);object.position.set(x,y,z);return object;}
