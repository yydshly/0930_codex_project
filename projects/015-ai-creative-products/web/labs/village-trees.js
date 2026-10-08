// CASE 07: layered, overlapping sprays, connected branches and fine-scale leaves.
import '../demo/runtime/vendor/three-r160.min.js';
import {batchStatic,craftBeam} from './scenic-craft.js';
const T=globalThis.THREE;
function leafGeometry(){const p=[],uv=[],idx=[];for(let n=0;n<=4;n++){const t=n/4,w=Math.sin(t*Math.PI)*.049*(1+.13*Math.cos(t*19));p.push(-w,t*.18,Math.sin(t*Math.PI)*.012,0,t*.18,Math.sin(t*Math.PI)*.022,w,t*.18,Math.sin(t*Math.PI)*.012);uv.push(0,t,.5,t,1,t);if(n<4){const a=n*3;for(let k=0;k<2;k++)idx.push(a+k,a+k+1,a+k+3,a+k+1,a+k+4,a+k+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.userData.shared=true;return g;}
const leaf=leafGeometry();
export function marketTree(parent,{x,z,scale=1,seed=1,leafCount=4000,wood,leaf:leafMaterial}){
 let n=seed+193;const random=()=>{n=n*16807%2147483647;return(n-1)/2147483646;},group=new T.Group();group.position.set(x,0,z);group.scale.setScalar(scale);parent.add(group);
 const spine=[new T.Vector3(0,0,0),new T.Vector3(-.09,1.3,.055),new T.Vector3(.10,2.75,.02),new T.Vector3(-.045,4.15,-.065),new T.Vector3(.02,5.03,-.13)];
 const curve=new T.CatmullRomCurve3(spine),g=new T.TubeGeometry(curve,16,1,8,false),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const t=Math.floor(i/9)/16,c=curve.getPointAt(Math.min(1,t)),radius=.20*Math.pow(1-t,.83)+.017,v=new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)).sub(c).multiplyScalar(radius).add(c);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();
 const trunk=new T.Mesh(g,wood);trunk.castShadow=trunk.receiveShadow=true;group.add(trunk);
 const pockets=[];
 for(let branch=0;branch<10;branch++){
  const tier=Math.floor(branch/3),a=branch*2.399+seed*.33+(random()-.5)*.36,y=1.87+tier*.55+(random()-.5)*.17,reach=1.63-tier*.13+random()*.30,start=curve.getPoint(Math.min(.9,y/5.03)),knot=new T.Vector3(Math.cos(a)*reach*.49,y+.51,Math.sin(a)*reach*.49),tip=new T.Vector3(Math.cos(a)*reach,y+.84+random()*.26,Math.sin(a)*reach);
  craftBeam(group,start.toArray(),knot.toArray(),.063,wood);craftBeam(group,knot.toArray(),tip.toArray(),.037,wood);
  for(let twig=0;twig<4;twig++){
   const b=a+(twig-1.5)*.48,end=tip.clone().add(new T.Vector3(Math.cos(b)*(.25+random()*.43),-.13+random()*.37,Math.sin(b)*(.25+random()*.43))),origin=knot.clone().lerp(tip,.35+twig*.13);
   craftBeam(group,origin.toArray(),end.toArray(),.017,wood);
   // Interleaved sprays contain inner leaves as well as branch tips. Their
   // elongated envelopes overlap, so this is not a row of isolated leaf balls.
   pockets.push({center:origin.clone().lerp(end,.60+random()*.20),direction:b,spread:.44+random()*.18,tier});
  }
 }
 pockets.push({center:new T.Vector3(.10,4.78,-.11),direction:.6,spread:.70,tier:3},{center:new T.Vector3(-.39,4.35,.25),direction:2.3,spread:.63,tier:3});
 const count=leafCount,foliage=new T.InstancedMesh(leaf,leafMaterial,count),dummy=new T.Object3D(),color=new T.Color();
 for(let i=0;i<count;i++){
  const pocket=pockets[i%pockets.length],c=pocket.center,a=random()*Math.PI*2,b=Math.acos(random()*2-1),r=Math.cbrt(random()),along=Math.sin(b)*Math.cos(a)*r*pocket.spread*1.3,across=Math.sin(b)*Math.sin(a)*r*pocket.spread*.78;
  dummy.position.set(c.x+Math.cos(pocket.direction)*along-Math.sin(pocket.direction)*across,c.y+Math.cos(b)*r*pocket.spread*.48,c.z+Math.sin(pocket.direction)*along+Math.cos(pocket.direction)*across);
  dummy.rotation.set(Math.PI/2+(random()-.5)*1.9,pocket.direction+(random()-.5)*2.1,(random()-.5)*1.1);dummy.scale.setScalar(1.12+random()*.50);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);
  const edge=Math.min(1,Math.hypot(dummy.position.x,dummy.position.z)/2.2),light=.205+edge*.064+pocket.tier*.019+random()*.060;
  color.setHSL(.255+random()*.020,.35+random()*.13,light);foliage.setColorAt(i,color);
 }
 foliage.castShadow=foliage.receiveShadow=true;group.add(foliage);batchStatic(group);group.userData.art={type:'connected layered branch sprays',leafCount:count,leafLength:.18,branchPockets:pockets.length,crownTiers:4,foliagePlacement:'elongated overlapping branch sprays; darker inner leaves and lighter upper tips'};return group;
}
