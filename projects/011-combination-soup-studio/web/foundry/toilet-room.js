// Original architectural stage with physical environment reflections and a planar floor reflection.
export function createToiletRoom(T, renderer, scene, onChange=()=>{}) {
  let seed=8317;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function stone(green=false) {
    const c=document.createElement('canvas');c.width=c.height=512;
    const ctx=c.getContext('2d'),data=ctx.createImageData(512,512);
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){
      const k=(y*512+x)*4,grain=(random()-.5)*11;
      const wave=Math.sin(x*.028+Math.sin(y*.023)*2.4)+Math.sin(y*.011+x*.019)*.45;
      const vein=Math.pow(Math.max(0,1-Math.abs(Math.sin(x*.047+y*.018+wave*.88))*9),3);
      const field=Math.sin(x*.021+y*.003)*2+Math.cos(y*.034)*2;
      const base=green?[58,73,63]:[185,171,147];
      for(let i=0;i<3;i++)data.data[k+i]=base[i]+grain+field+vein*(green?16:-26);
      data.data[k+3]=255;
    }
    ctx.putImageData(data,0,0);const texture=new T.CanvasTexture(c);
    texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.repeat.set(green?3:4,green?2:4);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const grain=stone(),greenStone=stone(true);
  const floorMat=new T.MeshStandardMaterial({color:'#f0e9dc',map:grain,roughness:.39,bumpMap:grain,bumpScale:.016});
  const wallMat=new T.MeshStandardMaterial({color:'#65785f',map:greenStone,roughness:.72,bumpMap:greenStone,bumpScale:.012});
  const loadedTextures=[],loader=new T.TextureLoader();let loaded=0,failed=false;
  function loadMaterial(name,materials,repeat){
    const texture=loader.load(new URL('./assets/'+name,import.meta.url).href,()=>{
      if(disposed){texture.dispose();return;}texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(...repeat);
      texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      for(const material of materials){material.map=texture;material.bumpMap=texture;material.needsUpdate=true;}loaded++;onChange();
    },undefined,()=>{failed=true;onChange();});loadedTextures.push(texture);
  }
  const floor=new T.Mesh(new T.PlaneGeometry(14,14),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.014;floor.receiveShadow=true;scene.add(floor);
  const room=new T.Group();scene.add(room);
  const wall=new T.Mesh(new T.PlaneGeometry(11,7),wallMat);wall.position.set(0,3.45,-1.25);wall.receiveShadow=true;room.add(wall);
  const jointMat=new T.LineBasicMaterial({color:'#b2a68e',transparent:true,opacity:.25});
  const points=[];for(let i=-6;i<=6;i++){
    points.push(new T.Vector3(i*.93,-.010,-6),new T.Vector3(i*.93,-.010,6),
      new T.Vector3(-6,-.010,i*1.4),new T.Vector3(6,-.010,i*1.4));
  }
  const joints=new T.LineSegments(new T.BufferGeometry().setFromPoints(points),jointMat);scene.add(joints);
  const stoneSide=new T.Mesh(new T.BoxGeometry(.20,7,1.15),floorMat);
  stoneSide.position.set(2.32,3.45,-.72);stoneSide.castShadow=true;stoneSide.receiveShadow=true;room.add(stoneSide);
  const nicheMat=new T.MeshStandardMaterial({color:'#293c32',map:greenStone,roughness:.86});
  const niche=new T.Mesh(new T.BoxGeometry(.87,1.04,.036),nicheMat);niche.position.set(1.45,2.35,-1.218);room.add(niche);
  const shelf=new T.Mesh(new T.BoxGeometry(.88,.035,.29),floorMat);shelf.position.set(1.45,1.85,-1.08);shelf.castShadow=true;room.add(shelf);
  const towelMat=new T.MeshStandardMaterial({color:'#c6bdaa',roughness:1,bumpMap:grain,bumpScale:.011});
  for(let i=0;i<3;i++){
    const towel=new T.Mesh(new T.BoxGeometry(.52,.064,.23,4,2,4),towelMat);
    towel.position.set(1.45,1.899+i*.059,-1.056);towel.rotation.y=.018*i;towel.castShadow=true;room.add(towel);
  }
  const container=new T.Mesh(new T.CylinderGeometry(.061,.060,.22,64),floorMat);container.position.set(1.72,2.01,-1.045);container.castShadow=true;room.add(container);
  const lamp=new T.PointLight('#ffd7a1',.45,2,2);lamp.position.set(1.45,2.75,-.97);room.add(lamp);
  // A physically lit bevel at the edge of the niche catches the warm side light.
  const trim=new T.Mesh(new T.BoxGeometry(.89,.014,.07),new T.MeshStandardMaterial({color:'#aa9168',metalness:.85,roughness:.25}));
  trim.position.set(1.45,2.865,-1.17);room.add(trim);
  const key=new T.DirectionalLight('#fff1dc',3.1);key.position.set(-3.5,5.2,3);
  key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-3.8;key.shadow.camera.right=3.8;
  key.shadow.camera.top=4.5;key.shadow.camera.bottom=-2.8;key.shadow.normalBias=.033;key.shadow.bias=-.00015;key.shadow.radius=4;scene.add(key);
  const fill=new T.DirectionalLight('#e9f3f6',.38);fill.position.set(3,3,3);scene.add(fill);
  const rim=new T.DirectionalLight('#ffe1ad',1.1);rim.position.set(3,3,-.7);scene.add(rim);
  scene.add(new T.HemisphereLight('#dbe3df','#695948',.38));
  // Soft contact absorption under the actual 3D skirt, combined with the light's shadow.
  const oc=document.createElement('canvas');oc.width=oc.height=256;const ocx=oc.getContext('2d');
  const gradient=ocx.createRadialGradient(128,128,10,128,128,128);gradient.addColorStop(0,'rgba(28,23,17,.46)');
  gradient.addColorStop(.55,'rgba(28,23,17,.28)');gradient.addColorStop(1,'rgba(28,23,17,0)');
  ocx.fillStyle=gradient;ocx.fillRect(0,0,256,256);
  const contactTexture=new T.CanvasTexture(oc),contact=new T.Mesh(new T.PlaneGeometry(1,1),
    new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,toneMapped:false}));
  contact.rotation.x=-Math.PI/2;contact.position.y=-.003;scene.add(contact);
  const envScene=new T.Scene();envScene.background=new T.Color('#333c35');
  envScene.add(new T.Mesh(new T.BoxGeometry(20,16,20),new T.MeshBasicMaterial({color:'#66716b',side:T.BackSide})));
  const panels=[[1.8,5,-3,1.3,4,7.2],[.65,5,3,3,2,5.0],[5,1.3,0,6,-1,4.0],[1.4,3,-2,2,-3,1.9]];
  for(const [w,h,x,y,z,intensity] of panels){
    const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color().setRGB(intensity,intensity*.97,intensity*.9)}));
    panel.position.set(x,y,z);panel.lookAt(0,1,0);envScene.add(panel);
  }
  const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(envScene,.025);scene.environment=environment.texture;
  const target=new T.WebGLRenderTarget(640,640,{depthBuffer:true}),mirrorCamera=new T.PerspectiveCamera();
  const textureMatrix=new T.Matrix4(),bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  const reflected=new T.Mesh(new T.PlaneGeometry(14,14),new T.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:{reflection:{value:target.texture},textureMatrix:{value:textureMatrix},strength:{value:.16}},
    vertexShader:'uniform mat4 textureMatrix; varying vec4 reflectionUV; void main(){vec4 world=modelMatrix*vec4(position,1.0);reflectionUV=textureMatrix*world;gl_Position=projectionMatrix*viewMatrix*world;}',
    fragmentShader:'uniform sampler2D reflection; uniform float strength; varying vec4 reflectionUV; void main(){vec2 uv=reflectionUV.xy/reflectionUV.w;vec3 c=vec3(0.);float o=.0018;for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){c+=texture2D(reflection,uv+vec2(float(i),float(j))*o).rgb/9.;}}gl_FragColor=vec4(c,strength); \n #include <tonemapping_fragment> \n #include <colorspace_fragment> }'
  }));
  reflected.rotation.x=-Math.PI/2;reflected.position.y=-.008;scene.add(reflected);
  let setting='interior',disposed=false,reflectionEnvironment=null;
  const normalBackground=new T.Color('#2d3e35'),studioBackground=new T.Color('#ebe6dc');
  function setSetting(next){setting=next==='studio'?'studio':'interior';room.visible=setting==='interior';scene.background=setting==='studio'?studioBackground:normalBackground;reflected.material.uniforms.strength.value=setting==='studio'?.10:.16;}
  function render(camera){
    if(disposed)return;
    const previous=renderer.getRenderTarget(),clipping=renderer.clippingPlanes;
    mirrorCamera.copy(camera);mirrorCamera.position.copy(camera.position);mirrorCamera.position.y=-camera.position.y;
    const direction=new T.Vector3();camera.getWorldDirection(direction);stoneSide.visible=direction.z<-.30;direction.y=-direction.y;
    mirrorCamera.up.set(0,-1,0);mirrorCamera.lookAt(mirrorCamera.position.clone().add(direction));mirrorCamera.updateMatrixWorld();
    textureMatrix.copy(bias).multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse);
    floor.visible=false;joints.visible=false;reflected.visible=false;contact.visible=false;
    renderer.clippingPlanes=[new T.Plane(new T.Vector3(0,1,0),.005)];
    renderer.setRenderTarget(target);renderer.render(scene,mirrorCamera);
    renderer.setRenderTarget(previous);renderer.clippingPlanes=clipping;
    floor.visible=true;joints.visible=true;reflected.visible=true;contact.visible=true;
    renderer.render(scene,camera);
  }
  const panorama=loader.load(new URL('../assets/studio-environment-v5.webp',import.meta.url).href,()=>{
    if(disposed){panorama.dispose();return;}
    panorama.colorSpace=T.SRGBColorSpace;
    const lightScene=new T.Scene(),sphere=new T.Mesh(new T.SphereGeometry(22,64,40),new T.MeshBasicMaterial({map:panorama,color:new T.Color().setRGB(3.1,2.95,2.7),side:T.BackSide}));
    sphere.rotation.y=-.3;lightScene.add(sphere);
    reflectionEnvironment=pmrem.fromScene(lightScene,.012);scene.environment=reflectionEnvironment.texture;
    sphere.geometry.dispose();sphere.material.dispose();loaded++;onChange();
  },undefined,()=>{failed=true;onChange();});loadedTextures.push(panorama);
  loadMaterial('toilet-travertine-v11.webp' ,[floorMat],[4,4]);
  loadMaterial('toilet-green-stone-v11.webp',[wallMat,nicheMat],[2,1.4]);
  setSetting('interior');
  return {grain,greenStone,envScene,pmrem,environment,render,setSetting,
    materialsReady(){return loaded===3&&!failed;},
    fitGround(w,d){contact.scale.set(w*1.75,d*1.20,1);contact.position.z=-.03;},
    dispose(){if(disposed)return;disposed=true;target.dispose();reflectionEnvironment?.dispose();greenStone.dispose();contactTexture.dispose();loadedTextures.forEach(t=>t.dispose());}
  };
}
