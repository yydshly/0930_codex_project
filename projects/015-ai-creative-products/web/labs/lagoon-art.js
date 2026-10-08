// CASE 09 authored boat and offshore land forms. Original geometry; no source/Meshy asset claims.
import {T} from './world-stage.js';
import {roundedBoxGeometry} from './visual-materials.js';
import {addMesh,craftBox,batchStatic} from './scenic-craft.js';
export function buildResearchBoat(group,{wood,dark}){
 const hull=wood.clone();hull.color.set('#a99c84');hull.roughness=.9;const trim=dark.clone();trim.color.set('#a59175');
 const shell=new T.BufferGeometry(),p=[],uv=[],idx=[],width=t=>Math.max(.028,Math.sin(Math.min(1,t*1.6)*Math.PI*.5)*(1.04-.10*t));
 for(let i=0;i<=36;i++){const t=i/36,z=-2.4+t*4.8,w=width(t),cross=[[-w,.66],[-w*.69,-.05],[0,-.17],[w*.69,-.05],[w,.66]];for(const [x,y] of cross){p.push(x,y,z);uv.push(z*.42,x*.9+y*.5);}if(i<36){const a=i*5,b=a+5;for(let j=0;j<4;j++)idx.push(a+j,a+j+1,b+j,a+j+1,b+j+1,b+j);}}
 shell.setAttribute('position',new T.Float32BufferAttribute(p,3));shell.setAttribute('uv',new T.Float32BufferAttribute(uv,2));shell.setIndex(idx);shell.computeVertexNormals();hull.side=T.DoubleSide;addMesh(group,shell,hull);
 const inner=shell.clone(),ip=inner.attributes.position;for(let i=0;i<ip.count;i++){ip.setX(i,ip.getX(i)*.91);ip.setY(i,ip.getY(i)+.08);}const indices=Array.from(inner.index.array);for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];inner.setIndex(indices);inner.computeVertexNormals();addMesh(group,inner,hull);
 for(const side of [-1,1]){const rail=new T.CatmullRomCurve3(Array.from({length:25},(_,i)=>{const t=i/24;return new T.Vector3(side*width(t),.66,-2.4+t*4.8);}));addMesh(group,new T.TubeGeometry(rail,48,.047,8,false),trim);}
 craftBox(group,1.90,.58,.075,hull,0,.30,2.37);
 const bow=new T.Shape(),bw=width(0);bow.moveTo(-bw,.66);bow.lineTo(-bw*.69,-.05);bow.lineTo(0,-.17);bow.lineTo(bw*.69,-.05);bow.lineTo(bw,.66);bow.closePath();addMesh(group,new T.ShapeGeometry(bow),hull,0,0,-2.4);
 for(let i=1;i<9;i++){const z=-2.4+i*.51,w=width((z+2.4)/4.8),rib=new T.CatmullRomCurve3([new T.Vector3(-w*.9,.57,z),new T.Vector3(-w*.62,.05,z),new T.Vector3(0,-.025,z),new T.Vector3(w*.62,.05,z),new T.Vector3(w*.9,.57,z)]);addMesh(group,new T.TubeGeometry(rib,24,.021,5,false),trim);}
 for(let i=0;i<7;i++)craftBox(group,.168,.065,3.5,hull,-.54+i*.18,-.026,.24);
 for(const z of [-1.16,.25,1.33]){const w=width((z+2.4)/4.8);for(let j=0;j<3;j++)craftBox(group,w*1.83,.092,.138,hull,0,.47,z-.145+j*.15);for(const side of [-1,1])craftBox(group,.045,.45,.37,trim,side*w*.75,.24,z);}
 const metal=new T.MeshPhysicalMaterial({color:'#273230',roughness:.32,metalness:.23,clearcoat:.42,clearcoatRoughness:.22}),steel=new T.MeshStandardMaterial({color:'#8f9992',roughness:.4,metalness:.6});
 const engine=new T.Group();engine.position.set(-.31,0,2.34);group.add(engine);
 addMesh(engine,roundedBoxGeometry(.61,.73,.47,.12),metal,0,1.04,.08);addMesh(engine,roundedBoxGeometry(.64,.12,.49,.045),metal,0,.70,.08);
 craftBox(engine,.17,.91,.15,metal,0,.15,.17);addMesh(engine,roundedBoxGeometry(.29,.18,.31,.07),metal,0,-.31,.18);
 for(const side of [-1,1]){craftBox(engine,.075,.29,.28,steel,side*.20,.56,-.11);craftBox(engine,.08,.09,.36,metal,side*.20,.55,-.04);}
 const prop=addMesh(engine,new T.CylinderGeometry(.08,.08,.18,12),steel,0,-.31,.41);prop.rotation.x=Math.PI/2;
 for(let i=0;i<3;i++){const blade=addMesh(engine,new T.SphereGeometry(1,12,8),steel,Math.sin(i*Math.PI*2/3)*.105,-.31+Math.cos(i*Math.PI*2/3)*.105,.46);blade.scale.set(.065,.17,.017);blade.rotation.z=-i*Math.PI*2/3;}
 const tiller=new T.CatmullRomCurve3([new T.Vector3(.22,.79,.02),new T.Vector3(.39,.81,-.24),new T.Vector3(.46,.80,-.58)]);addMesh(engine,new T.TubeGeometry(tiller,16,.03,6,false),metal);
 const badge=document.createElement('canvas');badge.width=256;badge.height=128;const c=badge.getContext('2d');c.fillStyle='#273230';c.fillRect(0,0,256,128);c.strokeStyle='#758079';c.lineWidth=2;c.strokeRect(17,14,222,99);c.fillStyle='#bdc7bb';c.font='bold 34px sans-serif';c.fillText('FIELD',24,69);c.font='12px sans-serif';c.fillText('RESEARCH / ELECTRIC',25,91);const map=new T.CanvasTexture(badge);map.colorSpace=T.SRGBColorSpace;const decal=addMesh(engine,new T.PlaneGeometry(.37,.19),new T.MeshBasicMaterial({map}),0,1.12,-.162);decal.rotation.y=Math.PI;
 batchStatic(group);group.userData.art={hull:'pointed bow, broad transom, continuous outer and inner shell',interior:'frame ribs, floor slats and three weathered benches',motor:'rounded cowling, transom brackets, tiller, lower unit and propeller',length:4.8,width:2.08,scope:'Original conceptual research boat. No source geometry or simulated marine dynamics.'};return group;
}
export function addCoastalDistance(scene){
 const material=new T.MeshStandardMaterial({color:'#364e4a',roughness:1});
 for(const [n,x,z,sx,sz,h] of [[0,-43,-44,14,9,8],[1,-58,-22,12,10,6],[2,-67,12,16,9,7]]){
  const g=new T.PlaneGeometry(sx*2,sz*2,32,24);g.rotateX(-Math.PI/2);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const u=p.getX(i)/sx,v=p.getZ(i)/sz;
   const peak=.76*Math.exp(-((u+.28)**2*5+(v+.12)**2*5))+.59*Math.exp(-((u-.23)**2*13+(v-.18)**2*8))+.29*Math.exp(-((u-.61)**2*22+(v+.08)**2*13));
   const ridge=1+.065*Math.sin(u*16+n)*Math.cos(v*13)+.04*Math.sin(v*21+u*7);
   p.setY(i,h*peak*ridge-.85);
  }
  g.computeVertexNormals();const land=addMesh(scene,g,material,x,0,z);land.castShadow=false;
 }
}
