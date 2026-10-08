// CASE 05: authored coating breakup, machined fasteners and flexible joint sleeves.
// These small local textures are original surface marks, not extracted game assets.
import {T} from './four-playable-stage.js';

const finishes=new Map();
function finishMaps(kind){
 if(finishes.has(kind))return finishes.get(kind);
 const size=512, canvases=Array.from({length:3},()=>{const c=document.createElement('canvas');c.width=c.height=size;return c;}),[color,rough,height]=canvases.map(c=>c.getContext('2d'));
 let seed=kind==='steel'?409:kind==='rubber'?809:613;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 color.fillStyle='#eeeeeb';color.fillRect(0,0,size,size);rough.fillStyle='#f0f0f0';rough.fillRect(0,0,size,size);height.fillStyle='#808080';height.fillRect(0,0,size,size);
 // Low-frequency coating variation is deliberately quiet enough to read as a material.
 for(let i=0;i<95;i++){const x=random()*size,y=random()*size,r=8+random()*42,a=.014+random()*.042,g=color.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(48,49,43,${a})`);g.addColorStop(1,'rgba(48,49,43,0)');color.fillStyle=g;color.fillRect(x-r,y-r,2*r,2*r);}
 for(let i=0;i<14500;i++){const x=random()*size,y=random()*size,v=112+Math.floor(random()*34);color.fillStyle=random()>.5?'rgba(255,255,244,.035)':'rgba(37,40,36,.035)';color.fillRect(x,y,1,1);height.fillStyle=`rgb(${v},${v},${v})`;height.fillRect(x,y,1,1);}
 if(kind==='steel'){
  for(let i=0;i<510;i++){const y=random()*size,x=random()*size,w=8+random()*100;color.fillStyle='rgba(71,77,74,.075)';color.fillRect(x,y,w,.4);height.fillStyle='#959595';height.fillRect(x,y,w,.45);rough.fillStyle='#bbbbbb';rough.fillRect(x,y,w,.65);}
 }else if(kind==='paint'){
  for(let i=0;i<55;i++){const x=random()*size,y=random()*size,w=1+random()*13;color.fillStyle='rgba(61,66,60,.30)';color.fillRect(x,y,w,.8+random()*1.8);color.fillStyle='rgba(255,255,236,.34)';color.fillRect(x,y-1,w,.45);rough.fillStyle='#b9b9b9';rough.fillRect(x,y,w,2);}
 }else{
  for(let y=0;y<size;y+=7){color.fillStyle='rgba(43,48,46,.09)';color.fillRect(0,y,size,1);height.fillStyle='#727272';height.fillRect(0,y,size,1);}
 }
 const maps=canvases.map((c,i)=>{const t=new T.CanvasTexture(c);if(i===0)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;});
 const result={map:maps[0],roughnessMap:maps[1],bumpMap:maps[2]};finishes.set(kind,result);return result;
}

export function defenseFinish(color,roughness=.7,metalness=.2,kind='paint',extra={}){
 const m=new T.MeshStandardMaterial({color,roughness,metalness,...finishMaps(kind),bumpScale:kind==='rubber'?.001:.0016,envMapIntensity:kind==='steel'?.20:.27,...extra});
 m.userData.finish=kind;return m;
}

// Extruded plate faces use their local surface extents, not metre-sized default UVs.
export function plateUV(geometry){
 geometry.computeBoundingBox();const box=geometry.boundingBox,size=box.getSize(new T.Vector3()),p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
 for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));let u,v;if(ax>=ay&&ax>=az){u=(p.getZ(i)-box.min.z)/Math.max(size.z,.0001);v=(p.getY(i)-box.min.y)/Math.max(size.y,.0001);}else if(ay>=az){u=(p.getX(i)-box.min.x)/Math.max(size.x,.0001);v=(p.getZ(i)-box.min.z)/Math.max(size.z,.0001);}else{u=(p.getX(i)-box.min.x)/Math.max(size.x,.0001);v=(p.getY(i)-box.min.y)/Math.max(size.y,.0001);}uv.setXY(i,u,v);}
 uv.needsUpdate=true;return geometry;
}

export function armorFastener(parent,x,y,z,material,r=.006,axis='z'){
 const g=new T.CylinderGeometry(r,r,r*.5,6),m=new T.Mesh(g,material);m.position.set(x,y,z);if(axis==='z')m.rotation.x=Math.PI/2;if(axis==='x')m.rotation.z=Math.PI/2;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}

export function jointSleeve(parent,{y=0,length=.09,rx=.055,rz=.055,material,rings=5}){
 for(let i=0;i<rings;i++){const m=new T.Mesh(new T.TorusGeometry(1,.13,4,20),material);m.rotation.x=Math.PI/2;m.scale.set(rx,rz,.035);m.position.set(0,y-length/2+i*length/(rings-1),0);m.castShadow=m.receiveShadow=true;parent.add(m);}
}
