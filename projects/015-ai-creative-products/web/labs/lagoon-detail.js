import {T} from './world-stage.js';

// CASE 09 only: original shoreline craft, not Meshy or source meshes.
const seeded=seed=>()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646;};
export function lagoonWater(){
  return new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,uniforms:{time:{value:0},light:{value:1},roughWeather:{value:0},sunDirection:{value:new T.Vector3(-.5,.8,.3)},skyColor:{value:new T.Color('#bfd9df')},skyMap:{value:null},hasSky:{value:0},submergedColor:{value:null},submergedDepth:{value:null},hasRefraction:{value:0},cameraNear:{value:.08},cameraFar:{value:180},boatHeading:{value:3.14159265359},boat:{value:new T.Vector2(-15,7)}},vertexShader:`
    varying vec3 world;varying vec3 normalW;varying vec4 projected;varying float surfaceViewDepth;uniform float time,roughWeather;
    void main(){vec3 p=position;float amp=1.+roughWeather*.7;float a=p.x*.38+p.z*.19+time*.7,b=p.z*.47-p.x*.12-time*.51;p.y+=(sin(a)*.052+sin(b)*.042)*amp;world=(modelMatrix*vec4(p,1.)).xyz;normalW=normalize(mat3(modelMatrix)*vec3((-cos(a)*.0198+cos(b)*.00504)*amp,1.,(-cos(a)*.00988-cos(b)*.01974)*amp));vec4 view=viewMatrix*vec4(world,1.);surfaceViewDepth=-view.z;projected=projectionMatrix*view;gl_Position=projected;}
  `,fragmentShader:`
    varying vec3 world;varying vec3 normalW;varying vec4 projected;varying float surfaceViewDepth;uniform float time,light,roughWeather,hasSky,hasRefraction,cameraNear,cameraFar,boatHeading;uniform vec3 skyColor,sunDirection;uniform sampler2D skyMap,submergedColor,submergedDepth;uniform vec2 boat;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    float cellCaustic(vec2 p){p+=vec2(sin(p.y*.7+time*.32),cos(p.x*.8-time*.25))*.28;vec2 cell=floor(p),f=fract(p);float a=8.,b=8.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 n=vec2(float(x),float(y)),point=vec2(hash(cell+n),hash(cell+n+11.3)),d=n+point-f;float q=dot(d,d);if(q<a){b=a;a=q;}else b=min(b,q);}return 1.-smoothstep(.025,.105,b-a);}
    float wave(vec2 p){return sin(p.x*1.67+p.y*.71+time*.63)*.017+cos(p.y*2.13-p.x*.88-time*.47)*.010+noise(p*4.+vec2(time*.035,-time*.06))*.012;}
    void main(){
      float shore=-6.+sin(world.z*.14)*1.1+sin(world.z*.38)*.45;float depth=shore-world.x;if(depth<-.06)discard;
      vec2 boatDelta=world.xz-boat;float localX=cos(boatHeading)*boatDelta.x-sin(boatHeading)*boatDelta.y,localZ=sin(boatHeading)*boatDelta.x+cos(boatHeading)*boatDelta.y;float boatT=(localZ+2.4)/4.8;float hullWidth=max(.028,sin(min(1.,max(0.,boatT)*1.6)*1.570796)*(1.04-.10*boatT));if(abs(localZ)<2.4&&abs(localX)<hullWidth*.91)discard;
      vec3 eye=normalize(cameraPosition-world);float distanceToEye=length(cameraPosition-world);
      float detail=1.-smoothstep(12.,50.,distanceToEye);float dx=(wave(world.xz+vec2(.03,0.))-wave(world.xz-vec2(.03,0.)))/.06,dz=(wave(world.xz+vec2(0.,.03))-wave(world.xz-vec2(0.,.03)))/.06;
      vec2 bc=world.xz-boat;float br=length(bc),contact=cos(br*5.-time*1.8)*exp(-br*.5)*.009;
      vec3 ripple=normalize(normalW+vec3((-dx+bc.x/max(br,.1)*contact)*detail*(1.+roughWeather),0.,(-dz+bc.y/max(br,.1)*contact)*detail*(1.+roughWeather)));
      float fresnel=.04+.96*pow(1.-max(dot(ripple,eye),0.),5.);
      vec3 color=mix(vec3(.11,.48,.42),vec3(.015,.27,.33),smoothstep(0.,22.,depth));
      if(hasRefraction>.5){vec2 screen=projected.xy/projected.w*.5+.5;vec2 refracted=clamp(screen+ripple.xz*.012*(1.-fresnel)*(1.+roughWeather*.4),vec2(.002),vec2(.998));float sampled=texture2D(submergedDepth,refracted).x;float bedViewDepth=cameraNear*cameraFar/(cameraFar-(cameraFar-cameraNear)*sampled);if(bedViewDepth<surfaceViewDepth){refracted=screen;sampled=texture2D(submergedDepth,refracted).x;bedViewDepth=cameraNear*cameraFar/(cameraFar-(cameraFar-cameraNear)*sampled);}float thickness=sampled>.999?max(5.,depth*.22):clamp(bedViewDepth-surfaceViewDepth,0.,16.);vec3 transmission=exp(-vec3(.32,.12,.08)*thickness);color=texture2D(submergedColor,refracted).rgb*transmission+vec3(.018,.21,.24)*(1.-transmission);}
      float n=noise(world.xz*.9+vec2(time*.025,time*.02));float caustic=pow(max(0.,sin((world.x+world.z*.57)*2.9+n*6.-time*.32)),12.);
      color+=vec3(.18,.28,.20)*(caustic*.08+cellCaustic(world.xz*2.7)*.12)*(1.-smoothstep(1.,8.,depth))*detail;
      vec3 reflection=skyColor;vec3 reflected=reflect(-eye,ripple);if(hasSky>.5){vec2 uv=vec2(atan(reflected.z,reflected.x)/6.2831853+.5,acos(clamp(reflected.y,-1.,1.))/3.1415926);reflection=texture2D(skyMap,uv).rgb*.66;}
      color=mix(color,reflection,fresnel*.83);
      float wash=.38+sin(time*.75+world.z*.17)*.16+noise(world.xz*2.)*.21;float foam=(1.-smoothstep(.02,.14,abs(depth-wash)))*(1.-smoothstep(.25,.7,noise(world.xz*3.+time*.04)));
      color=mix(color,vec3(.85,.91,.80),foam*.33);float glint=pow(max(dot(reflect(-normalize(sunDirection),ripple),eye),0.),80.);color+=vec3(1.,.94,.78)*glint*1.1*light;
      color=mix(color,skyColor,1.-exp(-distanceToEye*.005));float alpha=hasRefraction>.5?1.:mix(.33,.94,smoothstep(0.,6.,depth));gl_FragColor=vec4(color*(.24+light*.76),alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `});
}

function leafShape(){
  const g=new T.BufferGeometry(),p=[],uv=[],idx=[];
  for(let row=0;row<=12;row++){const t=row/12,w=Math.pow(Math.sin(t*Math.PI),.72)*.35;for(const s of [-1,0,1]){p.push(s*w,.05+Math.sin(t*Math.PI)*.18+t*.36-Math.abs(s)*w*.23,t*1.28);uv.push((s+1)/2,t);}if(row<12){const a=row*3;for(let col=0;col<2;col++)idx.push(a+col,a+col+3,a+col+1,a+col+1,a+col+3,a+col+4);}}
  g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function leafMap(){
  const c=document.createElement('canvas');c.width=128;c.height=256;const x=c.getContext('2d'),r=seeded(420);x.fillStyle='#bbc990';x.fillRect(0,0,128,256);
  const grad=x.createLinearGradient(0,0,128,0);grad.addColorStop(0,'#667b4055');grad.addColorStop(.5,'#e3dc9866');grad.addColorStop(1,'#617e4455');x.fillStyle=grad;x.fillRect(0,0,128,256);
  x.strokeStyle='#dee0ac66';x.lineWidth=1.8;x.beginPath();x.moveTo(64,0);x.lineTo(64,256);x.stroke();x.lineWidth=.7;for(let y=22;y<248;y+=18){x.beginPath();x.moveTo(64,y);x.quadraticCurveTo(40,y-3,10,y-23);x.moveTo(64,y);x.quadraticCurveTo(88,y-3,118,y-23);x.stroke();}for(let n=0;n<1700;n++){x.fillStyle=r()>.5?'#ebecbd0d':'#3858210a';x.fillRect(r()*128,r()*256,1,1);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}

function smoothCoincidentNormals(geometry){
  geometry.computeVertexNormals();const p=geometry.attributes.position,n=geometry.attributes.normal,sums=new Map(),keys=[];
  for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100000)).join(':');keys.push(key);let sum=sums.get(key);if(!sum){sum=new T.Vector3();sums.set(key,sum);}sum.add(new T.Vector3(n.getX(i),n.getY(i),n.getZ(i)));}
  for(const sum of sums.values())sum.normalize();for(let i=0;i<n.count;i++){const v=sums.get(keys[i]);n.setXYZ(i,v.x,v.y,v.z);}n.needsUpdate=true;
}

export function buildLagoonDetail(scene,{coast,landHeight,sand,rock,colliders}){
  const group=new T.Group();group.name='case09-shoreline';scene.add(group);const random=seeded(8419),rockColliders=[],rockMeshes=[];
  const shoreGeometry=new T.BufferGeometry(),positions=[],uvs=[],colors=[],indices=[],wet=new T.Color('#a1a58a'),dry=new T.Color('#ffffff');
  for(let row=0;row<=144;row++){const z=-36+row*.5,c=coast(z);for(let col=0;col<=6;col++){const d=-.4+col*.56,x=c+d,y=landHeight(x,z)+.009;positions.push(x,y,z);uvs.push(x/100+.5,z/100+.5);const color=wet.clone().lerp(dry,Math.min(1,Math.max(0,(d-.15)/2)));colors.push(color.r,color.g,color.b);}if(row<144)for(let col=0;col<6;col++){const a=row*7+col;indices.push(a,a+7,a+1,a+1,a+7,a+8);}}
  shoreGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));shoreGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));shoreGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));shoreGeometry.setIndex(indices);shoreGeometry.computeVertexNormals();const shoreMat=sand.clone();shoreMat.vertexColors=true;shoreMat.roughness=.63;const shore=new T.Mesh(shoreGeometry,shoreMat);shore.receiveShadow=true;group.add(shore);
  // Unequal boulder pockets leave gaps and keep the dock approach clear.
  const rockGeometry=new T.IcosahedronGeometry(1,3),rp=rockGeometry.attributes.position;for(let n=0;n<rp.count;n++){const x=rp.getX(n),y=rp.getY(n),z=rp.getZ(n),f=1+Math.sin(x*4.2+z*2.8)*.12+Math.cos(y*4.1-x*2.7)*.065;rp.setXYZ(n,x*f,y*f,z*f);}smoothCoincidentNormals(rockGeometry);const rockMat=rock.clone();rockMat.color.set('#a9b8b6');rockMat.roughness=.94;
  let rockCount=0;for(const zBase of [-30,-23,-16,-9,-3,12,20,29]){const center=coast(zBase)-.38;for(let n=0;n<3;n++){const z=zBase+(random()-.5)*2.2,x=center+(random()-.5)*2.4,size=n===0?1.05+random()*.6:.34+random()*.58,m=new T.Mesh(rockGeometry,rockMat);m.position.set(x,landHeight(x,z)+size*.24,z);m.scale.set(size*1.25,size*.78,size);m.rotation.set(random()*.2,random()*6.28,random()*.17);m.castShadow=m.receiveShadow=true;group.add(m);rockMeshes.push(m);const c={kind:'circle',x,z,r:size*1.20};colliders.push(c);rockColliders.push(c);rockCount++;}}
  const seabed=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),rockMat,110),bedPose=new T.Object3D();
  for(let n=0;n<110;n++){const z=-32+random()*65,x=coast(z)-.8-random()*5.8,s=.10+random()*.30;bedPose.position.set(x,landHeight(x,z)+s*.14,z);bedPose.rotation.set(random()*.6,random()*6.28,random()*.5);bedPose.scale.set(s*1.4,s*.52,s);bedPose.updateMatrix();seabed.setMatrixAt(n,bedPose.matrix);}seabed.receiveShadow=true;seabed.castShadow=false;group.add(seabed);
  const pebbleGeo=new T.IcosahedronGeometry(1,1),pebbles=new T.InstancedMesh(pebbleGeo,rockMat,170),dummy=new T.Object3D(),shade=new T.Color();for(let n=0;n<170;n++){const z=-33+random()*67,x=coast(z)+.25+random()*1.95,s=.035+random()*.10;dummy.position.set(x,landHeight(x,z)+s*.15,z);dummy.rotation.set(random(),random()*6.28,random());dummy.scale.set(s*1.4,s*.6,s);dummy.updateMatrix();pebbles.setMatrixAt(n,dummy.matrix);shade.setHSL(.10+random()*.06,.09,.49+random()*.20);pebbles.setColorAt(n,shade);}pebbles.receiveShadow=true;group.add(pebbles);
  const wind={time:{value:0},strength:{value:1}},leafMat=new T.MeshStandardMaterial({color:'#ffffff',map:leafMap(),side:T.DoubleSide,roughness:.63,emissive:'#182713',emissiveIntensity:.08});leafMat.onBeforeCompile=shader=>{shader.uniforms.lagoonTime=wind.time;shader.uniforms.lagoonWind=wind.strength;shader.vertexShader='uniform float lagoonTime;uniform float lagoonWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\n transformed.x += sin(lagoonTime*.75+instanceMatrix[3].x*.41+instanceMatrix[3].z*.29)*.025*lagoonWind*position.z*position.z;\n transformed.y += sin(lagoonTime*.91+instanceMatrix[3].z)*.009*lagoonWind*position.z;\n#endif');};leafMat.customProgramCacheKey=()=> 'case09-broadleaf-wind-v1';
  const leaves=new T.InstancedMesh(leafShape(),leafMat,4200);let leafCount=0,pockets=0;
  for(let n=0;n<430;n++){const z=-30+random()*61,x=coast(z)+2.7+random()*23;if((x<7&&z>-5&&z<4)||Math.hypot(x-8,z-6)<5.5||Math.hypot(x-15,z+8)<3.5||Math.hypot(x-.5,z-11.8)<3.4)continue;const scale=.95+random()*.65;pockets++;for(let k=0;k<7;k++){dummy.position.set(x+(random()-.5)*.12,landHeight(x,z)+.02,z+(random()-.5)*.12);dummy.rotation.set(-.70+random()*.45,k*2.399+n,(random()-.5)*.12);dummy.scale.setScalar(scale*(.75+random()*.45));dummy.updateMatrix();leaves.setMatrixAt(leafCount,dummy.matrix);shade.setHSL(.23+random()*.055,.28+random()*.18,.40+random()*.14);leaves.setColorAt(leafCount++,shade);}}
  leaves.count=leafCount;leaves.castShadow=leaves.receiveShadow=true;group.add(leaves);
  let visibleLeaves=leafCount,weather='clear',hour=15;
  return {rockColliders,rockMeshes,boatHitsRock(x,z,heading){const sin=Math.sin(heading),cos=Math.cos(heading);return rockColliders.some(c=>{const dx=c.x-x,dz=c.z-z,side=dx*cos-dz*sin,along=dx*sin+dz*cos;return (side/(c.r+1.0))**2+(along/(c.r+2.1))**2<1;});},update(state){wind.time.value=state.time;wind.strength.value=state.weather==='storm'?3.4:state.weather==='rain'?1.65:1;weather=state.weather;hour=state.hour;},environment(state){visibleLeaves=Math.round(leafCount*Math.min(1,state.density/30));leaves.count=visibleLeaves;const wetWeather=['rain','storm'].includes(state.weather);shoreMat.color.set(wetWeather?'#c7c9ae':'#ffffff');shoreMat.roughness=wetWeather?.44:.63;},getState(){return {shoreline:'continuous damp-sand and pebble transition',shoreLength:72,wetSandWidth:3.36,wetSandRoughness:shoreMat.roughness,rockCount,pebbleInstances:pebbles.count,solidRockColliders:rockColliders.length,shoreRocks:rockColliders.map(c=>({x:c.x,z:c.z,radius:c.r})),boatRockBoundary:'oriented ellipse (1m half-width, 2.1m half-length) expanded by each solid rock radius; no rigid-body contact',undergrowthPockets:pockets,visibleUndergrowthPockets:Math.ceil(visibleLeaves/7),totalBroadLeaves:leafCount,visibleBroadLeaves:visibleLeaves,weather,hour,windStrength:wind.strength.value,submergedStones:seabed.count,water:'actual submerged-scene refraction and depth attenuation; filtered wave normals, illustrative caustics and sky reflection',assets:'original procedural mesh and existing CC0 sand/stone maps'};}};
}
