import {T} from './world-stage.js';

// CASE 09: capture the actual submerged scene, then distort its color/depth in the water shader.
// One bounded offscreen pass; no new movement, collision or weather rules.
export function bindLagoonRefraction(water,{skyMesh}){
 const target=new T.WebGLRenderTarget(1,1,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});
 target.texture.colorSpace=T.LinearSRGBColorSpace;
 target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
 target.depthTexture.minFilter=target.depthTexture.magFilter=T.NearestFilter;
 const plane=new T.Plane(new T.Vector3(0,-1,0),.035),size=new T.Vector2(),viewport=new T.Vector4();
 const uniforms=water.material.uniforms;
 uniforms.submergedColor.value=target.texture;uniforms.submergedDepth.value=target.depthTexture;
 let disposed=false,captures=0,supported=false;
 water.onBeforeRender=(renderer,scene,camera)=>{
  if(disposed)return;
  supported=renderer.capabilities.isWebGL2||renderer.extensions.has('WEBGL_depth_texture');
  uniforms.hasRefraction.value=supported?1:0;
  if(!supported)return;
  renderer.getDrawingBufferSize(size);const width=Math.max(1,Math.round(Math.min(960,size.x*.65))),height=Math.max(1,Math.round(width*size.y/size.x));
  if(target.width!==width||target.height!==height)target.setSize(width,height);
  uniforms.cameraNear.value=camera.near;uniforms.cameraFar.value=camera.far;
  const previous={target:renderer.getRenderTarget(),background:scene.background,tone:renderer.toneMapping,clipping:renderer.clippingPlanes,xr:renderer.xr.enabled,shadow:renderer.shadowMap.autoUpdate,clearColor:renderer.getClearColor(new T.Color()),clearAlpha:renderer.getClearAlpha(),skyVisible:skyMesh?.visible};
  renderer.getViewport(viewport);water.visible=false;if(skyMesh)skyMesh.visible=false;
  scene.background=new T.Color('#285f64');renderer.clippingPlanes=[plane];renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.toneMapping=T.NoToneMapping;
  try{renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);captures++;}
  finally{scene.background=previous.background;renderer.clippingPlanes=previous.clipping;renderer.xr.enabled=previous.xr;renderer.shadowMap.autoUpdate=previous.shadow;renderer.toneMapping=previous.tone;renderer.setRenderTarget(previous.target);renderer.setViewport(viewport);renderer.setClearColor(previous.clearColor,previous.clearAlpha);water.visible=true;if(skyMesh)skyMesh.visible=previous.skyVisible;}
 };
 return {getState:()=>({supported,captures,width:target.width,height:target.height,method:'actual submerged scene color and depth; screen-space wave distortion and depth attenuation',boundary:'single camera-space capture, no multiple scattering or physically traced caustics'}),dispose(){disposed=true;water.onBeforeRender=()=>{};target.depthTexture.dispose();target.dispose();}};
}
