import {T} from './four-playable-stage.js';
import {pbrMaterial,photoEnvironment,roundedBoxGeometry} from './visual-materials.js';

const material=(color,roughness=.8,metalness=0,extra={})=>new T.MeshStandardMaterial({color,roughness,metalness,...extra});
const mesh=(parent,geometry,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;};
const block=(parent,w,h,d,mat,x=0,y=0,z=0,r=0)=>mesh(parent,r?roundedBoxGeometry(w,h,d,r):new T.BoxGeometry(w,h,d),mat,x,y,z);
const beam=(parent,a,b,r,mat,sides=8)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),m=mesh(parent,new T.CylinderGeometry(r,r,delta.length(),sides),mat);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;};
const seeded=(seed=3147)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const canvasMap=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;};

// The straight sections stay parallel to the existing playable rectangle. The
// corner radii grow with each row, so tiers meet as one bowl rather than four boxes.
const BOWL={halfWidth:21.35,halfLength:29.45,radius:5.45,cornerSteps:14,straightSteps:32};
function bowlPath(offset=0){
 const {halfWidth:w,halfLength:l,radius:r,cornerSteps,straightSteps}=BOWL,cx=w-r,cz=l-r,points=[];
 const corners=[[cx,cz,0],[-cx,cz,Math.PI/2],[-cx,-cz,Math.PI],[cx,-cz,Math.PI*1.5]];
 for(let k=0;k<4;k++){
  const [x,z,angle]=corners[k],next=corners[(k+1)%4];
  for(let i=0;i<=cornerSteps;i++){const a=angle+i/ cornerSteps*Math.PI/2;points.push({x:x+(r+offset)*Math.cos(a),z:z+(r+offset)*Math.sin(a),nx:Math.cos(a),nz:Math.sin(a)});}
  const a=angle+Math.PI/2,end={x:x+(r+offset)*Math.cos(a),z:z+(r+offset)*Math.sin(a)},start={x:next[0]+(r+offset)*Math.cos(next[2]),z:next[1]+(r+offset)*Math.sin(next[2])};
  for(let i=1;i<straightSteps;i++){const t=i/straightSteps;points.push({x:end.x+(start.x-end.x)*t,z:end.z+(start.z-end.z)*t,nx:Math.cos(a),nz:Math.sin(a)});}
 }
 return points;
}
const basePath=bowlPath();
function arcLength(path){const lengths=[0];for(let i=1;i<=path.length;i++){const a=path[i-1],b=path[i%path.length];lengths.push(lengths[i-1]+Math.hypot(b.x-a.x,b.z-a.z));}return lengths;}
function aisleAt(p,offset){
 const side=Math.abs(Math.abs(p.x)-(BOWL.halfWidth+offset))<.08,end=Math.abs(Math.abs(p.z)-(BOWL.halfLength+offset))<.08;
 return side&&[3.2,14.2].some(z=>Math.abs(Math.abs(p.z)-z)<.82)||end&&Math.abs(Math.abs(p.x)-8)<.90;
}
// Profiles may be vertical fascias, stepped concrete or gently sloping roof skins.
function ribbon(parent,profile,mat,{gaps=false,uScale=1,uvShift=0}={}){
 const positions=[],uv=[],indices=[],count=basePath.length,sections=profile.length,outerPath=bowlPath(profile[0][0]),lengths=arcLength(outerPath),length=lengths[count];
 for(let i=0;i<=count;i++)for(let k=0;k<sections;k++){const p=basePath[i%count],[offset,y]=profile[k];positions.push(p.x+p.nx*offset,y,p.z+p.nz*offset);uv.push(lengths[i]/length*uScale+uvShift,k/(sections-1));}
 for(let i=0;i<count;i++){const aPath=outerPath[i],bPath=outerPath[(i+1)%count];if(gaps&&aisleAt({x:(aPath.x+bPath.x)/2,z:(aPath.z+bPath.z)/2},profile[0][0]))continue;for(let k=0;k<sections-1;k++){const a=i*sections+k,b=a+sections;indices.push(a,a+1,b,b,a+1,b+1);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(parent,g,mat);
}
function rail(parent,offset,y,r,mat){const points=bowlPath(offset).map(p=>new T.Vector3(p.x,y,p.z)),curve=new T.CatmullRomCurve3(points,true,'centripetal');return mesh(parent,new T.TubeGeometry(curve,points.length*2,r,6,true),mat);}
function crowdMap(){return canvasMap(4096,64,(g,w,h)=>{
 const rand=seeded(9083),shirts=['#577aa6','#8b9ca4','#e0d7c1','#4f6974','#b8755b','#9b9c87','#768990','#cdc6af','#35619a'];
 g.fillStyle='#193443';g.fillRect(0,0,w,h);
 for(let x=1;x<w;x+=7+Math.floor(rand()*3)){
  const occupied=rand()>.12,seat=rand()>.72?'#4d6980':'#2b4b64';g.fillStyle=seat;g.fillRect(x-1,42,6,12);
  if(!occupied)continue;
  const headX=x+rand()*2,headY=20+rand()*9,bodyW=4+rand()*2,bodyH=13+rand()*9;
  g.fillStyle='rgba(0,0,0,.32)';g.fillRect(x-2,headY+5,bodyW+2,bodyH+2);
  g.fillStyle=shirts[Math.floor(rand()*shirts.length)];g.beginPath();g.moveTo(x-2,headY+4);g.quadraticCurveTo(x-1,headY+1,x+2,headY+3);g.lineTo(x+bodyW-1,headY+bodyH);g.lineTo(x-3,headY+bodyH);g.fill();
  g.fillStyle=rand()>.42?'#bdac93':'#807060';g.beginPath();g.ellipse(headX,headY,1.7+rand()*.7,2.2+rand()*.7,0,0,Math.PI*2);g.fill();
  if(rand()>.88){g.strokeStyle=shirts[Math.floor(rand()*shirts.length)];g.lineWidth=1.4;g.beginPath();g.moveTo(x-1,headY+7);g.lineTo(x-4,headY-4);g.stroke();}
 }
 const shade=g.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(7,26,36,.13)');shade.addColorStop(.75,'rgba(9,23,29,0)');shade.addColorStop(1,'rgba(6,18,25,.55)');g.fillStyle=shade;g.fillRect(0,0,w,h);
 });}
function concreteMap(){return canvasMap(512,512,(g,w,h)=>{const rand=seeded(7501);g.fillStyle='#bcc2ba';g.fillRect(0,0,w,h);for(let i=0;i<12000;i++){g.fillStyle=rand()>.53?'rgba(255,255,244,.09)':'rgba(53,62,63,.065)';g.fillRect(rand()*w,rand()*h,rand()*2+1,rand()*2+1);}g.fillStyle='rgba(71,81,82,.15)';g.fillRect(0,0,2,h);g.fillRect(0,0,w,2);});}
function bannerMap(){return canvasMap(4096,128,(g,w,h)=>{
 g.fillStyle='#112839';g.fillRect(0,0,w,h);g.fillStyle='#778c96';g.fillRect(0,0,w,3);g.fillRect(0,h-3,w,3);
 g.font='700 52px sans-serif';g.textBaseline='middle';for(let i=0;i<8;i++){const x=i*512;g.fillStyle=i%2?'#c5d9e3':'#f1cf8d';g.fillText(i%2?'FIELD 01':'RALLY',x+64,67);g.fillStyle='#527487';for(let n=0;n<3;n++){g.beginPath();g.moveTo(x+382+n*22,42);g.lineTo(x+394+n*22,65);g.lineTo(x+382+n*22,88);g.lineTo(x+375+n*22,88);g.lineTo(x+387+n*22,65);g.lineTo(x+375+n*22,42);g.fill();}}
 });}
function roomMap(){return canvasMap(2048,128,(g,w,h)=>{const rand=seeded(321);g.fillStyle='#071c27';g.fillRect(0,0,w,h);for(let i=0;i<16;i++){const x=i*128,v=rand(),light=g.createLinearGradient(x,0,x,h);light.addColorStop(0,v>.3?'#998969':'#4f5c59');light.addColorStop(.6,v>.3?'#cfba8b':'#778276');light.addColorStop(1,'#3c4e4f');g.fillStyle=light;g.fillRect(x+6,7,116,110);g.fillStyle='#364b51';g.fillRect(x+6,77,116,5);g.fillRect(x+29,24,3,53);g.fillRect(x+87,16,3,61);g.fillStyle='#e3c995';g.fillRect(x+42,16,42,5);g.fillStyle='#233944';g.fillRect(x+17,112,106,6);}});}
function fixture(parent,p,y,mat,frame){
 const group=new T.Group();group.position.set(p.x,y,p.z);group.rotation.y=Math.atan2(-p.nx,-p.nz);group.rotation.x=.17;parent.add(group);
 block(group,2.12,.63,.22,frame,0,0,0,.045);for(const x of [-.78,-.26,.26,.78])block(group,.44,.40,.038,mat,x,0,.132,.010);return group;
}
function goal(parent,z,blue,amber,white,frame){
 const color=z<0?amber:blue,sign=Math.sign(z);for(const x of [-5.5,5.5])beam(parent,[x,0,z],[x,4.1,z],.105,color,16);beam(parent,[-5.5,4.04,z],[5.5,4.04,z],.105,color,16);
 for(let x=-5.5;x<=5.5;x+=.55){beam(parent,[x,0,z+sign*3],[x,4.04,z+sign*3],.009,white,4);beam(parent,[x,4.04,z+sign*3],[x,4.04,z],.009,white,4);}
 for(let y=.45;y<=4.05;y+=.45)beam(parent,[-5.5,y,z+sign*3],[5.5,y,z+sign*3],.009,white,4);
 block(parent,11,.015,3,frame,0,.008,z+sign*1.5);
}

export function buildSculptedRallyStadium(stage){
 const scene=stage.scene,arena=new T.Group();arena.name='Rally continuous stadium bowl';scene.add(arena);
 const concrete=material('#9aa9ad',.92,0,{map:concreteMap(),side:T.DoubleSide}),dark=material('#18323e',.85,.08,{side:T.DoubleSide}),steel=material('#b0c0c5',.51,.63),shadowSteel=material('#526c79',.65,.45),white=material('#d3e3da',.84),blue=material('#548cad',.52,.38),amber=material('#e0a851',.56,.32),roof=material('#4b6371',.85,.18,{side:T.DoubleSide}),roofUnder=material('#243e4d',.86,.15,{side:T.DoubleSide}),light=material('#eef5ec',.43,0,{emissive:'#e3eee8',emissiveIntensity:1.7});
 scene.userData.photoEnvironment=photoEnvironment(stage,{outdoor:true,background:true,onLoad:()=>stage.draw()});stage.renderer.toneMappingExposure=1.08;
 const turf=pbrMaterial('grass_ground',{repeat:[22,29],color:'#ffffff',normal:.28,roughness:.98,envMapIntensity:.22,onLoad:()=>stage.draw()});
 turf.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRallyGround;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRallyGround=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRallyGround;').replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;',`float grassLuma=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722));
    float mowing=.025*sin(vRallyGround.z*.7854)+.011*sin(vRallyGround.x*1.83+vRallyGround.z*.22);
    vec3 fieldTint=vec3(.31,.49,.20)+mowing;
    float homeZone=smoothstep(12.7,18.3,vRallyGround.z);
    float awayZone=smoothstep(20.0,27.0,-vRallyGround.z)*.33;
    fieldTint=mix(fieldTint,vec3(.10,.28,.56)+mowing*.7,homeZone);
    fieldTint=mix(fieldTint,vec3(.56,.43,.23)+mowing,awayZone);
    sampledDiffuseColor.rgb=fieldTint*(.84+grassLuma*.43);
    diffuseColor *= sampledDiffuseColor;`));
 };
 turf.customProgramCacheKey=()=> 'rally-continuous-mown-turf-v16';block(arena,40,.10,54,turf,0,-.05,0);
 const fieldLine=(w,d,x,z)=>block(arena,w,.008,d,white,x,.025,z);fieldLine(.10,52,-19.8,0);fieldLine(.10,52,19.8,0);fieldLine(40,.10,0,0);for(const z of [-26,26])fieldLine(40,.10,0,z);for(const z of [-21,21]){fieldLine(13.8,.10,0,z);for(const x of [-6.9,6.9])fieldLine(.10,5,x,z+Math.sign(z)*2.5);}
 const center=mesh(arena,new T.TorusGeometry(5,.044,5,90),white,0,.039,0);center.rotation.x=Math.PI/2;
 const barrier=material('#8dabad',.35,.38,{side:T.DoubleSide});ribbon(arena,[[-.05,.06],[-.05,1.15]],barrier);rail(arena,-.05,1.20,.050,steel);ribbon(arena,[[-.02,.14],[-.02,.30]],dark);
 const crowdTexture=crowdMap(),crowd=material('#ffffff',.94,0,{map:crowdTexture,emissive:'#486178',emissiveIntensity:.15,emissiveMap:crowdTexture,side:T.DoubleSide}),seat=material('#496779',.90,0,{side:T.DoubleSide});
 const tiers=[{rows:11,offset:.78,y:1.60,rise:.34,tread:.62},{rows:13,offset:8.40,y:7.46,rise:.38,tread:.63}];
 for(let tier=0;tier<tiers.length;tier++){
  const info=tiers[tier];for(let row=0;row<info.rows;row++){
   const offset=info.offset+row*info.tread,y=info.y+row*info.rise;
   ribbon(arena,[[offset,y-.34],[offset,y],[offset+info.tread+.035,y]],concrete);
   ribbon(arena,[[offset+.13,y+.012],[offset+.51,y+.012]],seat,{gaps:true});
   const people=ribbon(arena,[[offset+.42,y+.06],[offset+.42,y+.57]],crowd,{gaps:true,uScale:1.05+row*.019,uvShift:(row*.137+tier*.43)%1});people.userData.seating={tier: tier+1,row:row+1,offset,y,fullRingSegments:basePath.length,visibleSegments:people.geometry.index.count/6};
   // Aisle steps remain concrete, with slender rails on their two actual sides.
   for(const side of [-1,1])for(const z of [-14.2,-3.2,3.2,14.2])if(row<info.rows-1)for(const dz of [-.76,.76]){
    const a=[side*(BOWL.halfWidth+offset+.14),y+.71,z+dz],b=[side*(BOWL.halfWidth+offset+info.tread+.14),y+info.rise+.71,z+dz];beam(arena,a,b,.024,steel,6);
    if(row%3===0)beam(arena,[a[0],y+.05,a[2]],a,.018,steel,6);
   }
   for(const sign of [-1,1])for(const x of [-8,8])if(row<info.rows-1)for(const dx of [-.83,.83]){
    const a=[x+dx,y+.71,sign*(BOWL.halfLength+offset+.14)],b=[x+dx,y+info.rise+.71,sign*(BOWL.halfLength+offset+info.tread+.14)];beam(arena,a,b,.024,steel,6);
   }
  }
 }
 // The concourse is set back behind its front fascia. Irregular warm room bays
 // sit within that recess; it is not a solid beige rectangle pasted on a wall.
 ribbon(arena,[[7.60,5.43],[7.60,5.74],[8.50,5.74]],concrete);ribbon(arena,[[8.10,5.68],[8.10,7.16]],dark);
 const roomTexture=roomMap(),rooms=material('#f4ead6',.84,0,{map:roomTexture,emissiveMap:roomTexture,emissive:'#997e4c',emissiveIntensity:.24,side:T.DoubleSide});ribbon(arena,[[7.97,5.88],[7.97,6.99]],rooms,{uScale:1.5});
 const concoursePath=bowlPath(7.84);for(let i=0;i<concoursePath.length;i+=3){const p=concoursePath[i];beam(arena,[p.x,5.70,p.z],[p.x,7.22,p.z],.064,steel,6);}
 const ads=new T.MeshBasicMaterial({map:bannerMap(),side:T.DoubleSide});ribbon(arena,[[7.64,7.13],[7.64,7.70]],ads);rail(arena,7.57,7.68,.045,steel);
 ribbon(arena,[[16.78,12.10],[16.78,14.2]],dark);rail(arena,16.72,12.17,.04,steel);ribbon(arena,[[16.7,13.16],[16.7,13.65]],ads,{uvShift:.15});
 // A complete rounded canopy has a broad visible underside, panel seams and
 // deep radial trusses. Its inner rim and lamps follow the same curved bowl.
 ribbon(arena,[[.78,15.93],[17.5,20.08]],roof);ribbon(arena,[[.78,15.69],[17.5,19.84]],roofUnder);
 rail(arena,.78,15.93,.12,steel);rail(arena,.78,15.36,.085,shadowSteel);rail(arena,9.0,17.76,.070,steel);rail(arena,17.5,20.05,.15,steel);
 const trussPath=bowlPath(.78);let trusses=0,lamps=0;
 for(let i=0;i<trussPath.length;i+=6){
  const p=trussPath[i],inner=[p.x,15.60,p.z],outer=[p.x+p.nx*16.72,19.80,p.z+p.nz*16.72];
  beam(arena,inner,outer,.082,steel);beam(arena,[inner[0],inner[1]-.80,inner[2]],[outer[0],outer[1]-.80,outer[2]],.060,shadowSteel);
  for(let k=0;k<7;k++){
   const t=k/7,u=(k+1)/7,a=[inner[0]+(outer[0]-inner[0])*t,inner[1]+(outer[1]-inner[1])*t-(k%2?.80:0),inner[2]+(outer[2]-inner[2])*t],b=[inner[0]+(outer[0]-inner[0])*u,inner[1]+(outer[1]-inner[1])*u-(k%2?0:.80),inner[2]+(outer[2]-inner[2])*u];beam(arena,a,b,.032,steel,6);
  }
  beam(arena,[outer[0],12.2,outer[2]],outer,.14,shadowSteel,8);trusses++;
  fixture(arena,{x:p.x-p.nx*.25,z:p.z-p.nz*.25,nx:p.nx,nz:p.nz},15.08,light,dark);lamps++;
  if(i%8===0){const flag=new T.Group();flag.position.set(p.x,14.12,p.z);flag.rotation.y=Math.atan2(-p.nx,-p.nz);arena.add(flag);block(flag,.38,1.34,.018,i%16?blue:amber,0,-.25,0);block(flag,.055,1.38,.025,white,-.135,-.25,.012);}
 }
 for(const z of [-33.0,33.0]){
  const sign=Math.sign(z),screenMap=canvasMap(1024,256,g=>{g.fillStyle='#112a3d';g.fillRect(0,0,1024,256);g.fillStyle='#e3c483';g.font='700 66px sans-serif';g.textAlign='center';g.fillText('RALLY / FIELD 01',512,118);g.fillStyle='#adc4d1';g.font='24px sans-serif';g.fillText('DRIVE  +  FLIGHT',512,178);});
  block(arena,10.50,2.64,.26,dark,0,13.39,z+sign*.18,.06);const panel=mesh(arena,new T.PlaneGeometry(10.12,2.29),new T.MeshBasicMaterial({map:screenMap,side:T.DoubleSide}),0,13.39,z);if(sign>0)panel.rotation.y=Math.PI;
  for(const x of [-3.9,3.9])beam(arena,[x,14.7,z],[x,17.15,z],.044,steel,6);
 }
 for(const z of [-27,27])goal(arena,z,blue,amber,white,dark);
 for(const [x,z] of [[-18,-23],[18,23]]){const flood=new T.DirectionalLight('#e4efed',.42);flood.position.set(x,15,z);flood.target.position.set(0,0,0);scene.add(flood,flood.target);}
 // Delicate overhead safety cables provide scale without a flat roof closing
 // the daylight aperture. They are scenery, not additional physics barriers.
 for(const z of [-20,-10,0,10,20]){const curve=new T.CatmullRomCurve3([new T.Vector3(-21.6,15.9,z),new T.Vector3(0,18.8,z),new T.Vector3(21.6,15.9,z)]);mesh(arena,new T.TubeGeometry(curve,24,.011,4),shadowSteel);}
 arena.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;if(o.material&&'envMapIntensity'in o.material)o.material.envMapIntensity=Math.min(o.material.envMapIntensity,.4);}});
 scene.fog=new T.Fog('#a3bbc9',95,175);
 scene.userData.rallyArena={version:16,tiers:2,seatingRows:24,continuousRoundedBowl:true,innerHalfWidth:BOWL.halfWidth,innerHalfLength:BOWL.halfLength,cornerRadius:BOWL.radius,concourseSetback:.5,roofInnerHeight:15.93,roofOuterHeight:20.08,radialTrusses:trusses,floodlightClusters:lamps,actualAisleGaps:true,turf:'one continuous PBR turf with restrained mowing and blended home/away color',physics:'unchanged rectangular playable bounds; decorative bowl and cables do not alter collision',scope:'original authored rounded grandstands, crowd atlas and canopy; no source stadium assets, no full vehicle rigid-body or multiplayer'};
 return arena;
}
