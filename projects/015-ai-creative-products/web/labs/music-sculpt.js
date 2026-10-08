import {T} from './three-stage.js';

// A single loft carries the cat's back, belly, shoulder, neck and face. The
// head bone blends through the shoulder; there is no separate ball-shaped head.
export function sculptCat(material){
 const profile=new T.CatmullRomCurve3([
  [-.84,.55,.002,.002],[-.78,.58,.14,.16],[-.65,.62,.195,.21],
  [-.49,.43,.36,.235],[-.33,.35,.30,.245],[-.15,.33,.265,.255],
  [.14,.32,.27,.28],[.39,.34,.275,.30],[.57,.35,.22,.235],[.68,.35,.003,.003]
 ].map(([x,y,ry,rz])=>new T.Vector3(x,y,ry)),false,'catmullrom',.45);
 // Depth follows its own smooth profile, while all rings share one surface.
 const depths=[.002,.16,.21,.29,.34,.34,.35,.35,.28,.003];
 const depthCurve=new T.CatmullRomCurve3(depths.map((r,i)=>new T.Vector3(i/(depths.length-1),r,0)),false,'catmullrom',.45);
 const rings=88,sides=40,positions=[],indices=[],weights=[],skin=[];
 const smooth=v=>{v=T.MathUtils.clamp(v,0,1);return v*v*(3-2*v);};
 for(let i=0;i<=rings;i++){
  const u=i/rings,p=profile.getPoint(u),depth=depthCurve.getPoint(u).y;
  for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI*2,y=p.y+Math.cos(a)*Math.max(.002,p.z),z=Math.sin(a)*Math.max(.002,depth);
   positions.push(p.x,y,z);
   const headWeight=smooth((-.10-p.x)/.42)*smooth((y-.32)/.28);
   skin.push(0,1,0,0);weights.push(1-headWeight,headWeight,0,0);
   if(i<rings&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(skin,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new T.SkinnedMesh(geometry,material),torso=new T.Bone(),head=new T.Bone();
 torso.name='cat-torso-bone';head.name='cat-head-bone';head.position.set(-.52,.616,.015);torso.add(head);mesh.add(torso);mesh.bind(new T.Skeleton([torso,head]));mesh.name='cat-continuous-body';mesh.castShadow=mesh.receiveShadow=true;
 return {mesh,head};
}

// One tapered skin follows each actual hip-to-paw solution. Hidden rig segments
// still provide the contact solver, but the visible leg has no exposed knees.
export function createCatLegSkin(material){
 const rings=12,sides=16,geometry=new T.BufferGeometry(),positions=new Float32Array((rings+1)*(sides+1)*3),indices=[];
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const n=i*(sides+1)+j;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}
 geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setIndex(indices);
 const mesh=new T.Mesh(geometry,material);mesh.name='cat-continuous-leg';mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
 const up=new T.Vector3(0,1,0),axis=new T.Vector3(),side=new T.Vector3(),normal=new T.Vector3();
 mesh.userData.update=(target,knee)=>{
  const curve=new T.CatmullRomCurve3([new T.Vector3(0,.04,0),knee.clone().multiplyScalar(.55),knee.clone(),target.clone().add(new T.Vector3(0,.045,0)),target.clone()],false,'centripetal');
  for(let i=0;i<=rings;i++){
   const u=i/rings,p=curve.getPoint(u);axis.copy(curve.getTangent(u)).normalize();side.crossVectors(axis,Math.abs(axis.y)>.95?new T.Vector3(0,0,1):up).normalize();normal.crossVectors(side,axis).normalize();
   const radius=T.MathUtils.lerp(.085,.055,u)+Math.sin(u*Math.PI)*.007;
   for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,n=(i*(sides+1)+j)*3;positions[n]=p.x+radius*(side.x*Math.cos(a)+normal.x*Math.sin(a));positions[n+1]=p.y+radius*(side.y*Math.cos(a)+normal.y*Math.sin(a));positions[n+2]=p.z+radius*(side.z*Math.cos(a)+normal.z*Math.sin(a));}
  }
  geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();
 };
 return mesh;
}
