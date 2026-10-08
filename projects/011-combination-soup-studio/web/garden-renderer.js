import './vendor/three-r160.min.js';
import {drawGarden} from './renderers.js';
import {materialTexture,microTexture,studioEnvironment,disposeScene} from './scene-materials.js?v=20261002-8';
import {planarWater} from './planar-water.js?v=20261002-8';
const T=globalThis.THREE,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createGardenRenderer(canvas,getState){
  let renderer;
  try{const probe=document.createElement('canvas'),gl=probe.getContext('webgl2')||probe.getContext('webgl');if(!gl)return fallback(canvas,getState);gl.getExtension('WEBGL_lose_context')?.loseContext();renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});}catch{return fallback(canvas,getState);}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const scene=new T.Scene();scene.background=new T.Color('#e7e2d4');scene.fog=new T.Fog('#e7e2d4',38,90);
  const perspective=new T.PerspectiveCamera(35,1,.1,150),plan=new T.OrthographicCamera(-10,10,10,-10,.1,150);
  const env=studioEnvironment(renderer);scene.environment=env.texture;let reflectionDirty=true,waterMesh=null;const pondReflection=planarWater(renderer,scene);
  const loaded=()=>{reflectionDirty=true;draw();};const stone=materialTexture('stone',[2,2],loaded),wood=materialTexture('wood',[1,1],loaded),gravel=materialTexture('gravel',[3,3],loaded),micro=microTexture();const leaf=new T.TextureLoader().load(new URL('./assets/maple-leaf-v5.webp',import.meta.url).href,loaded);leaf.colorSpace=T.SRGBColorSpace;leaf.anisotropy=8;
  // Periodic wave normals provide sub-mesh detail without random frame noise.
  const waveSize=256,waveData=new Uint8Array(waveSize*waveSize*4);
  for(let y=0;y<waveSize;y++)for(let x=0;x<waveSize;x++){
    const u=x/waveSize*Math.PI*2,v=y/waveSize*Math.PI*2;
    const nx=Math.cos(u*3+v*2+.2)*.12+Math.cos(u*5-v*7+1.1)*.075+Math.cos(u*13+v*9+2.7)*.04+Math.cos(u*19-v*17+.4)*.022;
    const ny=Math.cos(u*3+v*2+.2)*.08-Math.cos(u*5-v*7+1.1)*.105+Math.cos(u*13+v*9+2.7)*.028-Math.cos(u*19-v*17+.4)*.020;
    const length=Math.hypot(nx,ny,1),i=(y*waveSize+x)*4;
    waveData[i]=Math.round((nx/length*.5+.5)*255);waveData[i+1]=Math.round((ny/length*.5+.5)*255);waveData[i+2]=Math.round((1/length*.5+.5)*255);waveData[i+3]=255;
  }
  const waves=new T.DataTexture(waveData,waveSize,waveSize,T.RGBAFormat);waves.wrapS=waves.wrapT=T.RepeatWrapping;waves.magFilter=T.LinearFilter;waves.minFilter=T.LinearMipmapLinearFilter;waves.generateMipmaps=true;waves.needsUpdate=true;
  const floorMat=new T.MeshStandardMaterial({color:'#cfc6b1',roughness:.95,bumpMap:micro,bumpScale:.008});const floor=new T.Mesh(new T.PlaneGeometry(180,180),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.45;floor.receiveShadow=true;scene.add(floor);
  const key=new T.DirectionalLight('#fff0db',2.55);key.position.set(-7,11,-9);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.near=.1;key.shadow.camera.far=45;key.shadow.normalBias=.016;key.shadow.bias=-.0001;scene.add(key);
  const fill=new T.DirectionalLight('#e3efec',.45);fill.position.set(8,6,6);scene.add(fill);const ambient=new T.HemisphereLight('#edf1e7','#776c4e',.52);scene.add(ambient);
  let model=new T.Group();scene.add(model);let waterMaterial=null,lights=[],litMaterials=[];
  let width=1,height=1,visible=true,disposed=false,raf=0,last=0,time=0,view='perspective',yaw=.52,elevation=.57,zoom=1,geometryKey='',lightingKey='',lastState='';
  let dragging=false,pointers=new Map(),previous={x:0,y:0},pinch=0;
  function mesh(geometry,material,x=0,y=0,z=0,parent=model){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(w,h,d,mat,x=0,y=0,z=0,parent=model){return mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);}
  function releaseModel(){const gs=new Set(),ms=new Set();model.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());scene.remove(model);model=new T.Group();scene.add(model);}
  function leafPlane(){const g=new T.PlaneGeometry(1,1,4,5),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin((y+.5)*Math.PI)*.16+x*x*.27);}g.computeVertexNormals();return g;}
  function build(s){
    releaseModel();lights=[];litMaterials=[];const W=s.width,D=s.depth,deckRatio=s.priority==='gather'?.3:.18,deckW=W*deckRatio,leftW=W-deckW,bedD=D*s.green/100/(1-deckRatio)/2,middleD=D-2*bedD,pondW=W*D*s.pond/100/middleD,edge=.14;
    let seed=3311;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const stoneMat=new T.MeshStandardMaterial({color:'#b8b5a9',map:stone,bumpMap:stone,bumpScale:.012,roughness:.83});
    const paleStone=new T.MeshStandardMaterial({color:'#d5d2c5',map:stone,bumpMap:stone,bumpScale:.008,roughness:.80});
    const woodMat=new T.MeshStandardMaterial({color:'#b7a081',map:wood,bumpMap:wood,bumpScale:.004,roughness:.64});
    const earth=new T.MeshStandardMaterial({color:'#555543',map:gravel,bumpMap:gravel,bumpScale:.012,roughness:1});
    const bark=new T.MeshStandardMaterial({color:'#60513c',map:wood,bumpMap:wood,bumpScale:.035,roughness:.98});
    const darkMetal=new T.MeshStandardMaterial({color:'#344238',roughness:.7,metalness:.3});
    const foliage=new T.MeshStandardMaterial({color:'#b8c3a0',map:leaf,alphaTest:.48,roughness:.82,metalness:0,side:T.DoubleSide});
    foliage.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat leafLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(leafLuma)*vec3(.89,1.04,.78),.34);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight+=diffuseColor.rgb*.11*(gl_FrontFacing?.35:1.0);\n#include <opaque_fragment>');
    };
    const moss=new T.MeshStandardMaterial({color:'#6a7751',map:gravel,bumpMap:gravel,bumpScale:.04,roughness:1});
    // Area partitions follow the same dimensional formulas as the visible metrics.
    const leftX=-deckW/2,pondX=-W/2+pondW/2,deckX=W/2-deckW/2;
    // Split the foundation around an actual recessed basin instead of a flat plate.
    box(W+.25,.12,D+.25,stoneMat,0,-.385,0);
    const endD=(D-middleD)/2+.125,rightW=W-pondW+.125;
    for(const sign of [-1,1])box(W+.25,.43,endD,stoneMat,0,-.11,sign*(middleD/2+endD/2));
    box(.125,.43,middleD,stoneMat,-W/2-.0625,-.11,0);
    box(rightW,.43,middleD,stoneMat,-W/2+pondW+rightW/2,-.11,0);
    for(const sign of [-1,1]){box(leftW,.18,bedD,paleStone,leftX,.16,sign*(D/2-bedD/2));box(leftW,.17,bedD,earth,leftX,.30,sign*(D/2-bedD/2));box(leftW,.12,.13,paleStone,leftX,.34,sign*(D/2-bedD));}
    const pathW=Math.max(.12,leftW-pondW),pathX=-W/2+pondW+pathW/2;
    box(pathW,.15,middleD,paleStone,pathX,.17,0);box(deckW,.18,D,woodMat,deckX,.16,0);const cols=Math.max(1,Math.floor(pathW/.82)),rows=Math.max(2,Math.floor(middleD/.8));
    for(let x=0;x<cols;x++)for(let z=0;z<rows;z++){const tile=paleStone.clone();tile.color.multiplyScalar(.92+random()*.12);box(pathW/cols-.034,.045,middleD/rows-.035,tile,pathX-pathW/2+(x+.5)*pathW/cols,.257,-middleD/2+(z+.5)*middleD/rows);}
    const boards=Math.max(6,Math.ceil(deckW/.19));for(let i=0;i<boards;i++){const mat=woodMat.clone();mat.color.multiplyScalar(.91+random()*.17);box(deckW/boards-.008,.14,D,mat,W/2-deckW+(i+.5)*deckW/boards,.27,0);}
    const pondBed=new T.MeshStandardMaterial({color:'#8b9685',map:gravel,bumpMap:gravel,bumpScale:.025,roughness:.94});
    box(pondW-edge*2,.025,middleD-edge*2,pondBed,pondX,-.24,0);
    for(const sign of [-1,1]){box(pondW,.50,edge,paleStone,pondX,.005,sign*(middleD/2-edge/2));box(edge,.50,middleD,paleStone,pondX+sign*(pondW/2-edge/2),.005,0);}
    for(const sign of [-1,1]){box(pondW+.08,.16,edge,paleStone,pondX,.26,sign*(middleD/2-edge/2));box(edge,.16,middleD,paleStone,pondX+sign*(pondW/2-edge/2),.26,0);}
    waves.repeat.set(Math.max(1,pondW*.9),Math.max(1,middleD*.9));
    waterMaterial=new T.MeshPhysicalMaterial({color:'#34594d',roughness:.15,metalness:.02,clearcoat:1,clearcoatRoughness:.16,transparent:true,opacity:.72,side:T.DoubleSide,normalMap:waves,normalScale:new T.Vector2(.20,.20),envMapIntensity:.65,depthWrite:false});
    waterMaterial.onBeforeCompile=shader=>{shader.uniforms.uGardenTime={value:time};shader.vertexShader='uniform float uGardenTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z += sin(position.x*4.1+uGardenTime*.85)*.008 + cos(position.y*5.2-uGardenTime*.68)*.005;');shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal = normalize(vec3(-cos(position.x*4.1+uGardenTime*.85)*.0328,sin(position.y*5.2-uGardenTime*.68)*.026,1.0));');pondReflection.attach(shader);waterMaterial.userData.shader=shader;};
    const water=mesh(new T.PlaneGeometry(Math.max(.1,pondW-edge*2),middleD-edge*2,48,48),waterMaterial,pondX,.274,0);water.rotation.x=-Math.PI/2;water.castShadow=false;waterMesh=water;reflectionDirty=true;
    for(let i=0;i<95;i++){const rock=mesh(new T.IcosahedronGeometry(.035+random()*.065,1),stoneMat,pondX+(random()-.5)*(pondW-.38),-.21,(random()-.5)*(middleD-.38));rock.scale.set(1,.64,1.24);rock.rotation.set(random(),random(),random());}
    // Slender branches and thousands of individually oriented leaves, not sphere canopies.
    function taperedBranch(points,baseRadius,tipRadius,parent){
      const curve=new T.CatmullRomCurve3(points),segments=16,radial=8,g=new T.TubeGeometry(curve,segments,1,radial,false),p=g.attributes.position;
      for(let s=0;s<=segments;s++){const center=curve.getPointAt(s/segments),radius=T.MathUtils.lerp(baseRadius,tipRadius,s/segments);for(let j=0;j<=radial;j++){const i=s*(radial+1)+j;p.setXYZ(i,center.x+(p.getX(i)-center.x)*radius,center.y+(p.getY(i)-center.y)*radius,center.z+(p.getZ(i)-center.z)*radius);}}
      g.computeVertexNormals();mesh(g,bark,0,0,0,parent);
    }
    function tree(x,z,size=1){
      const group=new T.Group();group.position.set(x,.38,z);model.add(group);
      taperedBranch([new T.Vector3(0,0,0),new T.Vector3(.07,.70,.02),new T.Vector3(-.12,1.30,.08),new T.Vector3(.02,2.04,.04)],.072,.015,group);
      const crowns=[];
      for(let j=0;j<7;j++){
        const a=j*2.399+.12,r=.62+random()*.50,y=1.52+(j%3)*.25+random()*.15,end=new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r*.83);
        taperedBranch([new T.Vector3(-.04,.85+j*.10,.02),new T.Vector3(end.x*.45,y-.32,end.z*.4),end],.026,.006,group);
        for(let twig=0;twig<3;twig++){
          const angle=a+(twig-1)*.82,length=.28+random()*.20,tip=end.clone().add(new T.Vector3(Math.cos(angle)*length,.09+random()*.24,Math.sin(angle)*length));
          taperedBranch([end.clone().multiplyScalar(.86),end,tip],.009,.0015,group);
          crowns.push({center:tip,radius:.24+random()*.08,depth:.36+random()*.19});
        }
        crowns.push({center:new T.Vector3(end.x*.53,end.y-.04,end.z*.53),radius:.30,depth:.46});
      }
      crowns.push({center:new T.Vector3(.01,2.23,.04),radius:.43,depth:.52},{center:new T.Vector3(.10,1.82,-.08),radius:.39,depth:.50});
      const perCrown=48,count=crowns.length*perCrown,leaves=new T.InstancedMesh(leafPlane(),foliage,count),m=new T.Object3D(),color=new T.Color();
      for(let i=0;i<count;i++){
        const cluster=crowns[Math.floor(i/perCrown)],a=random()*Math.PI*2,r=Math.sqrt(random())*cluster.radius,y=(random()-.5)*cluster.depth*Math.sqrt(1-r*r/(cluster.radius*cluster.radius));
        m.position.set(cluster.center.x+Math.cos(a)*r,cluster.center.y+y,cluster.center.z+Math.sin(a)*r);
        m.rotation.set(-Math.PI/2+(random()-.5)*1.1,random()*Math.PI*2,(random()-.5)*1.1);
        const size=.105+random()*.065;m.scale.set(size,size*1.08,1);m.updateMatrix();leaves.setMatrixAt(i,m.matrix);
        color.setHSL(.21+random()*.035,.12+random()*.14,.48+random()*.23);leaves.setColorAt(i,color);
      }
      leaves.castShadow=true;leaves.receiveShadow=true;group.add(leaves);group.scale.setScalar(size);
    }
    tree(-W/2+1.1,-D/2+Math.min(bedD*.55,.8),1);tree(-deckW/2+1.25,-D/2+bedD*.53,.83);
    const shrubShape=new T.Shape();shrubShape.moveTo(0,-.5);shrubShape.bezierCurveTo(.43,-.2,.39,.28,0,.5);shrubShape.bezierCurveTo(-.39,.28,-.43,-.2,0,-.5);
    const shrubGeometry=new T.ShapeGeometry(shrubShape,5),shrubPositions=shrubGeometry.attributes.position;
    for(let i=0;i<shrubPositions.count;i++)shrubPositions.setZ(i,.13*Math.sin((shrubPositions.getY(i)+.5)*Math.PI)-Math.abs(shrubPositions.getX(i))*.18);shrubGeometry.computeVertexNormals();
    const shrubMaterial=new T.MeshStandardMaterial({color:'#6e8060',side:T.DoubleSide,roughness:.83});
    function shrub(x,z,radius){const count=280,g=new T.InstancedMesh(shrubGeometry,shrubMaterial,count),m=new T.Object3D(),c=new T.Color();for(let i=0;i<count;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*radius,top=Math.sqrt(1-r*r/(radius*radius));m.position.set(x+Math.cos(a)*r,.43+top*(.23+random()*.28),z+Math.sin(a)*r);const size=.09+random()*.055;m.scale.set(size,size*1.15,1);m.rotation.set(-1.3+random()*.9,a,(random()-.5)*1.1);m.updateMatrix();g.setMatrixAt(i,m.matrix);c.setHSL(.22+random()*.05,.10+random()*.20,.44+random()*.29);g.setColorAt(i,c);}g.castShadow=true;g.receiveShadow=true;model.add(g);}
    for(const sign of [-1,1])for(let i=0;i<Math.max(4,Math.round(leftW));i++){const x=-W/2+.48+i*(leftW-.9)/Math.max(3,Math.round(leftW)-1),z=sign*(D/2-bedD*.50);shrub(x,z,Math.min(.46,bedD*.36));}
    const bladeGeo=new T.PlaneGeometry(.034,.42,1,5);const vertices=bladeGeo.attributes.position;for(let i=0;i<vertices.count;i++){const y=vertices.getY(i)+.21;vertices.setXYZ(i,vertices.getX(i)*Math.max(.02,1-y/.42),y,Math.pow(y/.42,2)*.18);}bladeGeo.computeVertexNormals();const grassMaterial=new T.MeshStandardMaterial({color:'#6f8460',side:T.DoubleSide,roughness:.9});const blades=new T.InstancedMesh(bladeGeo,grassMaterial,1100);const blade=new T.Object3D(),bladeColor=new T.Color();for(let i=0;i<1100;i++){const sign=i%2?1:-1;blade.position.set(-W/2+.25+random()*(leftW-.5),.34,sign*(D/2-bedD+.15+random()*Math.max(.1,bedD-.3)));blade.rotation.set(.05,random()*6.28,(random()-.5)*.55);blade.scale.setScalar(.55+random()*.65);blade.updateMatrix();blades.setMatrixAt(i,blade.matrix);bladeColor.setRGB(.70+random()*.25,.74+random()*.24,.61+random()*.26);blades.setColorAt(i,bladeColor);}blades.castShadow=true;model.add(blades);
    // A low boundary, dining furniture and a light pergola define a usable space.
    const plaster=new T.MeshStandardMaterial({color:'#ded6c3',bumpMap:micro,bumpScale:.02,roughness:.95});box(W,.69,.15,plaster,0,.53,-D/2-.04);
    for(let i=0;i<Math.ceil(deckW/.24);i++)box(.055,1.48,.055,woodMat,W/2-deckW+.12+i*.24,1.08,-D/2+.18);
    const frameZ=-D*.28,frameWidth=Math.max(1.4,deckW-.35);for(const dx of [-1,1])for(const dz of [-1,1])box(.085,2.12,.085,woodMat,deckX+dx*frameWidth/2,1.38,frameZ+dz*.87);
    for(let i=0;i<8;i++)box(frameWidth+.28,.09,.07,woodMat,deckX,2.47,frameZ-.95+i*.27);
    const tableRadius=Math.min(.72,deckW*.31),tableZ=D*.13;mesh(new T.CylinderGeometry(tableRadius,tableRadius,.075,48),woodMat,deckX,.93,tableZ);mesh(new T.CylinderGeometry(.14,.19,.61,20),darkMetal,deckX,.615,tableZ);
    for(const dz of [-1,1]){box(Math.max(.80,deckW-.34),.08,.35,woodMat,deckX,.70,tableZ+dz*.96);for(const dx of [-1,1])box(.06,.36,.26,darkMetal,deckX+dx*Math.max(.26,deckW*.23),.49,tableZ+dz*.96);}
    const ceramic=new T.MeshStandardMaterial({color:'#ede2c5',roughness:.55});for(const dx of [-1,1])mesh(new T.CylinderGeometry(.085,.06,.085,20),ceramic,deckX+dx*.24,1.02,tableZ+.10);mesh(new T.CylinderGeometry(.12,.13,.15,24),ceramic,deckX,1.04,tableZ-.13);
    const glow=new T.MeshStandardMaterial({color:'#ead5a9',emissive:'#ffe0a1',emissiveIntensity:0,roughness:.4});litMaterials.push(glow);
    for(const z of [-D*.32,D*.32]){box(.12,.39,.12,darkMetal,-W/2+pondW+.18,.43,z);box(.15,.12,.15,glow,-W/2+pondW+.18,.68,z);}
    for(const [x,z] of [[deckX,D*.18],[pondX,-middleD*.27],[-W/2+pondW+.3,middleD*.3]]){const light=new T.PointLight('#ffdca0',0,15,2);light.position.set(x,1.2,z);model.add(light);lights.push(light);}
    const boulder=mesh(new T.DodecahedronGeometry(.44,1),stoneMat,-W/2+.54,.51,D/2-bedD*.55);boulder.scale.set(1,.5,.84);boulder.rotation.set(.2,.5,.4);mesh(new T.SphereGeometry(.23,12,8),moss,boulder.position.x+.14,.74,boulder.position.z+.10).scale.set(1,.28,.8);
    const spread=Math.max(W,D);key.shadow.camera.left=key.shadow.camera.bottom=-spread*.78;key.shadow.camera.right=key.shadow.camera.top=spread*.78;key.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;reflectionDirty=true;lightingKey='';
  }
  function lighting(s){const night=s.time==='night';if(lightingKey===s.time)return;lightingKey=s.time;scene.background.set(night?'#14231e':'#e7e2d4');scene.fog.color.copy(scene.background);floorMat.color.set(night?'#354633':'#cfc6b1');key.color.set(night?'#c6d9e8':'#fff0cf');key.intensity=night?.54:2.55;fill.intensity=night?.14:.45;ambient.intensity=night?.22:.52;lights.forEach(l=>l.intensity=night?48:0);litMaterials.forEach(m=>m.emissiveIntensity=night?2.7:0);waterMaterial.color.set(night?'#132e26':'#234c3e');model.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.envMapIntensity=night?.32:.75);});waterMaterial.envMapIntensity=night?.85:1.05;renderer.toneMappingExposure=night?.90:1.08;renderer.shadowMap.needsUpdate=true;reflectionDirty=true;}
  function hidden(){return !visible||document.hidden||Boolean(canvas.closest('[hidden]'));}
  function dimensions(){const r=canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);}}
  function cameraFor(s){
    const aspect=width/height,mobile=width<500;
    if(view==='plan'){
      scene.fog.near=60;scene.fog.far=140;const fit=Math.max(s.depth+4.7,(s.width+3.0)/aspect)/zoom;
      plan.left=-fit*aspect/2;plan.right=fit*aspect/2;plan.top=fit/2;plan.bottom=-fit/2;
      plan.up.set(0,0,-1);plan.position.set(0,35,-fit*.05);plan.lookAt(0,0,-fit*.05);plan.updateProjectionMatrix();return plan;
    }
    const t=Math.tan(perspective.fov*Math.PI/360),usableH=mobile?(height-235)/height:(height-190)/height;
    let span,totalH,focus=new T.Vector3(0,.5,0);
    if(view==='water'||view==='plant'){
      const deckRatio=s.priority==='gather'?.3:.18,bedD=s.depth*s.green/100/(1-deckRatio)/2,middleD=s.depth-2*bedD,pondW=s.width*s.depth*s.pond/100/middleD;
      if(view==='plant'){focus.set(-s.width/2+1.1,1.55,-s.depth/2+Math.min(bedD*.55,.8));span=3.25;totalH=2.9;}
      else{focus.set(-s.width/2+pondW/2,.28,0);span=Math.min(5,pondW+.9);totalH=Math.min(4,middleD*.60+.8);}
    }else{span=s.width*Math.abs(Math.cos(yaw))+s.depth*Math.abs(Math.sin(yaw))+1.2;totalH=(s.width*Math.abs(Math.sin(yaw))+s.depth*Math.abs(Math.cos(yaw)))*Math.sin(elevation)+2.2;}
    const distance=Math.max(span/(2*t*aspect*.86),totalH/(2*t*Math.max(.46,usableH)))/zoom;
    scene.fog.near=Math.max(38,distance+Math.max(s.width,s.depth)*.8);scene.fog.far=scene.fog.near+60;
    focus.y+=distance*2*t*(mobile?.095:.060);perspective.aspect=aspect;perspective.up.set(0,1,0);
    perspective.position.set(focus.x+Math.sin(yaw)*Math.cos(elevation)*distance,focus.y+Math.sin(elevation)*distance,focus.z+Math.cos(yaw)*Math.cos(elevation)*distance);
    perspective.lookAt(focus);perspective.updateProjectionMatrix();return perspective;
  }
  function getViewState(){return {renderer:'webgl',view,zoom:Number(zoom.toFixed(2)),yaw:Number(yaw.toFixed(2)),elevation:Number(elevation.toFixed(2)),motion:Boolean(getState().motion)};}
  function emit(){const d=getViewState(),k=JSON.stringify(d);if(k!==lastState){lastState=k;canvas.dispatchEvent(new CustomEvent('garden-render-state',{detail:d}));}}
  function render(force=false){if(disposed||canvas.closest('[hidden]')||(!force&&hidden()))return;dimensions();const s=getState(),k=JSON.stringify([s.width,s.depth,s.pond,s.green,s.priority]);if(k!==geometryKey){geometryKey=k;build(s);}lighting(s);if(waterMaterial?.userData.shader)waterMaterial.userData.shader.uniforms.uGardenTime.value=time;waves.offset.set(time*.012,-time*.008);const camera=cameraFor(s);if(waterMesh){pondReflection.update(camera,waterMesh,reflectionDirty);reflectionDirty=false;}renderer.render(scene,camera);emit();}
  function frame(timestamp){raf=0;if(disposed||hidden()){last=0;return;}if(last&&timestamp-last<32){raf=requestAnimationFrame(frame);return;}const dt=Math.min(80,last?timestamp-last:16);last=timestamp;if(getState().motion&&view!=='plan')time+=dt/1000;render();if(getState().motion&&view!=='plan')raf=requestAnimationFrame(frame);else last=0;}
  function schedule(){if(!disposed&&!raf&&!hidden())raf=requestAnimationFrame(frame);}
  function draw(){if(disposed)return;if(raf){cancelAnimationFrame(raf);raf=0;}render(true);schedule();}
  function setView(next){if(!['plan','perspective','water','plant'].includes(next))return;view=next;zoom=1;if(next==='water'||next==='plant'){yaw=.52;elevation=next==='plant'?.52:.66;}draw();}
  function reset(){view='perspective';yaw=.52;elevation=.57;zoom=1;draw();}
  function down(e){if(view==='plan')return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);dragging=true;previous={x:e.clientX,y:e.clientY};if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}}
  function move(e){if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)zoom=clamp(zoom*distance/pinch,.7,1.6);pinch=distance;}else{yaw+=(e.clientX-previous.x)*.006;elevation=clamp(elevation+(e.clientY-previous.y)*.004,.5,1.27);previous={x:e.clientX,y:e.clientY};}draw();}
  function up(e){pointers.delete(e.pointerId);dragging=pointers.size>0;pinch=0;if(dragging)previous=[...pointers.values()][0];}
  function wheel(e){e.preventDefault();zoom=clamp(zoom*Math.exp(-e.deltaY*.001),.7,1.6);draw();}
  function keydown(e){let handled=true;switch(e.key){case 'ArrowLeft':yaw-=.16;break;case 'ArrowRight':yaw+=.16;break;case 'ArrowUp':elevation=clamp(elevation+.08,.5,1.27);break;case 'ArrowDown':elevation=clamp(elevation-.08,.5,1.27);break;case '+':zoom=clamp(zoom+.1,.7,1.6);break;case '-':zoom=clamp(zoom-.1,.7,1.6);break;case 'Home':reset();break;default:handled=false;}if(handled){e.preventDefault();draw();}}
  for(const [event,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up],['wheel',wheel],['keydown',keydown]])canvas.addEventListener(event,fn,{passive:false});
  const resize=new ResizeObserver(()=>draw());resize.observe(canvas);const intersection=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)draw();else if(raf){cancelAnimationFrame(raf);raf=0;last=0;}});intersection.observe(canvas);const visibility=()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}else draw();};document.addEventListener('visibilitychange',visibility);
  function dispose(){if(disposed)return;disposed=true;if(raf)cancelAnimationFrame(raf);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);for(const [event,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up],['wheel',wheel],['keydown',keydown]])canvas.removeEventListener(event,fn);disposeScene(scene);[stone,wood,gravel,micro,leaf,waves].forEach(t=>t.dispose());pondReflection.dispose();env.dispose();renderer.dispose();}
  draw();return {draw,setView,reset,dispose,getViewState,rendererType:'webgl'};
}
function fallback(canvas,getState){let disposed=false;const inner=document.createElement('canvas');const draw=()=>{if(!disposed&&!canvas.closest('[hidden]')){const r=canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height),dpr=Math.min(devicePixelRatio||1,2),plotH=Math.max(120,h-280);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=getState().time==='night'?'#182820':'#e7e2d4';ctx.fillRect(0,0,w,h);inner.getBoundingClientRect=()=>({width:w-24,height:plotH});drawGarden(inner,getState());ctx.drawImage(inner,12,155,w-24,plotH);canvas.dispatchEvent(new CustomEvent('garden-render-state',{detail:{renderer:'canvas',view:'plan',zoom:1,motion:false}}));}};const resize=new ResizeObserver(draw);resize.observe(canvas);const io=new IntersectionObserver(entries=>{if(entries[entries.length-1].isIntersecting)draw();});io.observe(canvas);draw();return {draw,setView(){draw();},reset(){draw();},rendererType:'canvas',getViewState(){return {renderer:'canvas',view:'plan',zoom:1,motion:false};},dispose(){disposed=true;resize.disconnect();io.disconnect();}};}
