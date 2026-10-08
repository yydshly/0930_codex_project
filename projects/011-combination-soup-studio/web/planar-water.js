// Camera reflection and oblique clipping adapted from Three.js r160 Reflector (MIT).
// https://github.com/mrdoob/three.js/blob/r160/examples/jsm/objects/Reflector.js
const T=globalThis.THREE;
export function planarWater(renderer,scene){
  const target=new T.WebGLRenderTarget(768,768,{type:T.HalfFloatType,depthBuffer:true});
  const matrix=new T.Matrix4(),bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  const plane=new T.Plane(),normal=new T.Vector3(0,1,0),point=new T.Vector3(),look=new T.Vector3(),up=new T.Vector3(),clip=new T.Vector4(),q=new T.Vector4();
  let virtual=null,fingerprint='';
  function update(camera,water,dirty=false){
    camera.updateMatrixWorld();water.updateMatrixWorld();
    const key=camera.matrixWorld.elements.join(',')+camera.projectionMatrix.elements.join(',');
    if(!dirty&&key===fingerprint)return;fingerprint=key;
    if(!virtual||virtual.isOrthographicCamera!==camera.isOrthographicCamera)virtual=camera.clone();
    point.setFromMatrixPosition(water.matrixWorld);
    virtual.position.copy(camera.position);virtual.position.y=2*point.y-camera.position.y;
    camera.getWorldDirection(look);look.add(camera.position);look.y=2*point.y-look.y;
    up.setFromMatrixColumn(camera.matrixWorld,1).reflect(normal);virtual.up.copy(up);virtual.lookAt(look);
    virtual.far=camera.far;virtual.updateMatrixWorld();virtual.projectionMatrix.copy(camera.projectionMatrix);
    matrix.copy(bias).multiply(virtual.projectionMatrix).multiply(virtual.matrixWorldInverse);
    plane.setFromNormalAndCoplanarPoint(normal,point).applyMatrix4(virtual.matrixWorldInverse);
    clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
    q.set(Math.sign(clip.x),Math.sign(clip.y),1,1).applyMatrix4(virtual.projectionMatrix.clone().invert());clip.multiplyScalar(2/clip.dot(q));
    const e=virtual.projectionMatrix.elements;e[2]=clip.x-e[3];e[6]=clip.y-e[7];e[10]=clip.z-e[11]-.001;e[14]=clip.w-e[15];
    const current=renderer.getRenderTarget();water.visible=false;
    renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,virtual);renderer.setRenderTarget(current);water.visible=true;
  }
  function attach(shader){
    shader.uniforms.uWaterReflection={value:target.texture};shader.uniforms.uWaterProjection={value:matrix};
    shader.vertexShader='uniform mat4 uWaterProjection; varying vec4 vWaterProjection;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWaterProjection=uWaterProjection*modelMatrix*vec4(transformed,1.0);');
    shader.fragmentShader='uniform sampler2D uWaterReflection; varying vec4 vWaterProjection;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 reflectionUv=vWaterProjection.xy/vWaterProjection.w+normal.xy*.009;
      vec3 reflected=texture2D(uWaterReflection,clamp(reflectionUv,vec2(.001),vec2(.999))).rgb;
      float fresnel=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),3.0);
      outgoingLight=mix(outgoingLight*.48,reflected*vec3(.62,.79,.74),.57+.32*fresnel);
      diffuseColor.a=.82+.13*fresnel;
      #include <opaque_fragment>`);
  }
  return {update,attach,dispose(){target.dispose();}};
}
