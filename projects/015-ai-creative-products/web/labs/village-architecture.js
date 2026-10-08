// CASE 07 only. Original static architecture from the visible lane reference,
// not source geometry or a claim about the source author's toolchain.
import {pbrMaterial} from './visual-materials.js';
import {laneTimberMaterial,wornTimberGeometry,lanePlaster} from './village-surfaces.js';
export function buildLaneHouse(group,options){
 const{T,width,height,depth,index,mat,geo,mesh,box,beam,palette,registerGlass,onLoad,textures,batchStatic,roofTiles}=options;
 const half=width/2,rise=1.45,counters={windowCount:0,shutterLeafCount:0,hingeCount:0,archDoorCount:0,rectDoorCount:0,brickCount:0,timberJointCount:0};
 const rng=(()=>{let seed=742+index*971;return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};})();
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const g=canvas.getContext('2d');
 g.fillStyle=index?'#c4c0a8':'#bd8f7b';g.fillRect(0,0,512,512);
 for(let n=0;n<440;n++){g.fillStyle=rng()>.48?'rgba(255,249,229,.028)':'rgba(94,74,48,.023)';g.beginPath();g.ellipse(rng()*512,rng()*512,8+rng()*41,5+rng()*28,rng()*6.3,0,Math.PI*2);g.fill();}
 const damp=g.createLinearGradient(0,0,0,512);damp.addColorStop(0,'#524c3900');damp.addColorStop(.77,'#524c3900');damp.addColorStop(1,'#524c394a');g.fillStyle=damp;g.fillRect(0,0,512,512);
 const plasterMap=new T.CanvasTexture(canvas);plasterMap.colorSpace=T.SRGBColorSpace;plasterMap.anisotropy=4;textures.push(plasterMap);
 const plaster=mat(index?'#bcb9a7':'#b7a08a',{map:plasterMap,bumpMap:palette.plaster.bumpMap,bumpScale:.055,roughness:.98}),inner=mat('#443f34',{roughness:1}),lead=mat('#4f5550',{metalness:.35,roughness:.76}),iron=mat('#302c25',{metalness:.48,roughness:.69});
 const timbers=laneTimberMaterial({mat,textures,seed:89+index*31});let timberIndex=0;
 function timber(w,h,d,x,y,z,parent){const n=timberIndex++,material=timbers[(n+index)%3];return mesh(geo(wornTimberGeometry(w,h,d,n+index*19)),material,x,y,z,parent);}
 function timberBeam(start,end,width,parent){const a=new T.Vector3(...start),b=new T.Vector3(...end),line=b.clone().sub(a),m=timber(width,line.length(),width,0,0,0,parent);m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),line.normalize());return m;}
 // Each real stone has mineral variation, not a second brick grid inside it.
 const sample=pbrMaterial('concrete_floor',{repeat:[1,1],normal:.30,onLoad});
 const stones=['#87836f','#726f62','#98927b'].map(color=>mat(color,{map:sample.map,normalMap:sample.normalMap,normalScale:new T.Vector2(.30,.30),roughnessMap:sample.roughnessMap,roughness:.98}));sample.dispose();
 const glassCanvas=document.createElement('canvas');glassCanvas.width=128;glassCanvas.height=256;const gc=glassCanvas.getContext('2d'),tint=gc.createLinearGradient(0,0,88,256);
 tint.addColorStop(0,'#a5b5ac');tint.addColorStop(.46,'#73847c');tint.addColorStop(1,'#536861');gc.fillStyle=tint;gc.fillRect(0,0,128,256);
 for(let n=0;n<38;n++){gc.fillStyle=n%2?'#ffffff09':'#21352f09';gc.fillRect(rng()*128,0,1+rng()*3,256);}
 const glassMap=new T.CanvasTexture(glassCanvas);glassMap.colorSpace=T.SRGBColorSpace;textures.push(glassMap);
 const glassMaterial=mat('#83918a',{map:glassMap,metalness:.16,roughness:.42,emissive:'#ce9549',emissiveIntensity:.055});registerGlass(glassMaterial);
 // The recessed core stays solid. Apertures cut through the exterior wall slab.
 box(width-.64,height,depth-.64,inner,0,height/2,0,group);
 function rectangle(x,y,w,h){const p=new T.Path();p.moveTo(x-w/2,y-h/2);p.lineTo(x+w/2,y-h/2);p.lineTo(x+w/2,y+h/2);p.lineTo(x-w/2,y+h/2);p.closePath();return p;}
 function archPath(cx){const p=new T.Path();p.moveTo(cx-.55,.04);p.lineTo(cx+.55,.04);p.lineTo(cx+.55,1.67);p.absarc(cx,1.67,.55,0,Math.PI,false);p.lineTo(cx-.55,.04);p.closePath();return p;}
 function wall(span,windows,door,parent){
  const s=new T.Shape();s.moveTo(-span/2,0);s.lineTo(span/2,0);s.lineTo(span/2,height);s.lineTo(-span/2,height);s.closePath();
  for(const w of windows)s.holes.push(rectangle(w.x,w.y,.84,1.08));
  if(door)s.holes.push(door.arch?archPath(door.x):rectangle(door.x,1.09,1.10,2.10));
  const geometry=geo(new T.ExtrudeGeometry(s,{depth:.24,bevelEnabled:false,curveSegments:12}));geometry.translate(0,0,-.24);
  const p=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/span+.5,p.getY(i)/height);
  const surface=lanePlaster({span,height,index,windows,door,mat,textures,seed:742+index*971+Math.round(span*17)+timberIndex});
  mesh(geometry,surface,0,0,0,parent);
 }
 function lattice(cx,cy,parent){
  const w=.68,h=.88;
  for(const slope of [-1.24,1.24])for(let n=-6;n<=6;n++){
   const offset=n*.185,points=[];
   for(const x of [-w/2,w/2]){const y=slope*x+offset;if(Math.abs(y)<=h/2+.001)points.push([x,y]);}
   for(const y of [-h/2,h/2]){const x=(y-offset)/slope;if(Math.abs(x)<w/2-.001)points.push([x,y]);}
   if(points.length>=2)beam([cx+points[0][0],cy+points[0][1],-.178],[cx+points[1][0],cy+points[1][1],-.178],.014,lead,parent);
  }
 }
 function window(w,parent){
  counters.windowCount++;
  const{x,y}=w;
  // Four jambs have real depth; glass and diamond lead strips sit 20 cm inside.
  for(const side of [-1,1])timber(.12,1.22,.29,x+side*.43,y,-.065,parent);
  for(const side of [-1,1])timber(.89,.10,.29,x,y+side*.55,-.065,parent);
  const glass=box(.71,.93,.025,glassMaterial,x,y,-.20,parent);glass.castShadow=false;
  lattice(x,y,parent);box(1.08,.11,.46,stones[0],x,y-.64,.05,parent);
  for(const side of [-1,1]){
   const pivot=new T.Group();pivot.position.set(x+side*.52,y,.065);pivot.rotation.y=side*.47;parent.add(pivot);counters.shutterLeafCount++;
   timber(.33,1.12,.065,side*.17,0,0,pivot);
   for(let n=0;n<9;n++){const slat=timber(.31,.064,.038,side*.17,-.435+n*.107,.057,pivot);slat.rotation.x=.24+(rng()-.5)*.055;}
   for(const yy of [-.47,.47])timber(.33,.062,.052,side*.17,yy,.077,pivot);
   for(const yy of [-.34,.34]){
    mesh(geo(new T.CylinderGeometry(.019,.019,.13,6)),iron,0,yy,.04,pivot);box(.27,.038,.025,iron,side*.145,yy,.09,pivot);counters.hingeCount++;
   }
  }
 }
 function stoneBrick(w,h,d,material,x,y,z,parent){
  const chip=Math.min(w,h)*(.045+rng()*.035),s=new T.Shape();s.moveTo(-w/2+chip,-h/2);s.lineTo(w/2-chip*.7,-h/2+(rng()-.5)*.009);s.lineTo(w/2,-h/2+chip);s.lineTo(w/2,h/2-chip*.7);s.lineTo(w/2-chip,h/2);s.lineTo(-w/2+chip*.4,h/2);s.lineTo(-w/2,h/2-chip);s.lineTo(-w/2,-h/2+chip*.7);s.closePath();
  const geometry=geo(new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.013,bevelThickness:.010,bevelSegments:1,steps:1}));geometry.translate(0,0,-d/2);
  counters.brickCount++;return mesh(geometry,material,x,y,z,parent);
 }
 function door(d,parent){
  const cx=d.x;
  if(d.arch){
   counters.archDoorCount++;
   for(let n=0;n<11;n++){
    const a=n*Math.PI/11+.012,b=(n+1)*Math.PI/11-.012,s=new T.Shape(),ri=.555,ro=.745;
    s.moveTo(cx+Math.cos(a)*ri,1.67+Math.sin(a)*ri);s.lineTo(cx+Math.cos(a)*ro,1.67+Math.sin(a)*ro);s.lineTo(cx+Math.cos(b)*ro,1.67+Math.sin(b)*ro);s.lineTo(cx+Math.cos(b)*ri,1.67+Math.sin(b)*ri);s.closePath();
    const geometry=geo(new T.ExtrudeGeometry(s,{depth:.25,bevelEnabled:true,bevelSegments:1,bevelSize:.012,bevelThickness:.012}));geometry.translate(0,0,-.14);mesh(geometry,stones[n%3],0,0,0,parent);
   }
   for(const side of [-1,1])for(let n=0;n<6;n++)stoneBrick(.22,.24,.29,stones[(n+1)%3],cx+side*.657,.17+n*.26,-.04,parent);
  }else{
   counters.rectDoorCount++;for(const side of [-1,1])timber(.15,2.23,.31,cx+side*.62,1.12,-.055,parent);timber(1.40,.19,.34,cx,2.23,-.04,parent);
  }
  for(let n=0;n<11;n++){
   const l=cx-.538+n*.098,r=l+.09,top=x=>d.arch?1.67+Math.sqrt(Math.max(0,.55*.55-(x-cx)*(x-cx))):2.13,s=new T.Shape();
   s.moveTo(l,.08);s.lineTo(r,.08);s.lineTo(r,top(r));for(let k=1;k<=4;k++){const x=r+(l-r)*k/4;s.lineTo(x,top(x));}s.closePath();
   const geometry=geo(new T.ExtrudeGeometry(s,{depth:.035,bevelEnabled:false}));geometry.translate(0,0,-.225);const p=geometry.attributes.position,uv=geometry.attributes.uv;for(let k=0;k<p.count;k++)uv.setXY(k,(p.getX(k)-l)/(r-l),p.getY(k)/2.6+n*.17);mesh(geometry,timbers[n%3],0,0,0,parent);
  }
  for(const yy of [.42,1.32])box(.91,.061,.05,iron,cx,yy,-.172,parent);
  const ring=mesh(geo(new T.TorusGeometry(.065,.012,6,12)),iron,cx+.28,1.02,-.145,parent);ring.rotation.y=.05;
  stoneBrick(1.43,.12,.61,stones[1],cx,.065,.07,parent);
 }
 const faces=[{span:width,x:0,z:depth/2,angle:0,kind:'front'},{span:width,x:0,z:-depth/2,angle:Math.PI,kind:'back'},{span:depth,x:half,z:0,angle:Math.PI/2,kind:index===0?'lane':'outside'},{span:depth,x:-half,z:0,angle:-Math.PI/2,kind:index===1?'lane':'outside'}];
 for(const f of faces){
  const parent=new T.Group();parent.position.set(f.x,0,f.z);parent.rotation.y=f.angle;group.add(parent);
  const full=f.kind==='front'||f.kind==='lane',windows=full?[{x:-f.span*.25,y:3.25},{x:f.span*.25,y:3.25},{x:-f.span*.25,y:1.55}]:[{x:0,y:3.25}],entry=f.kind==='lane'?{x:f.span*.24,arch:index===1}:null;
  wall(f.span,windows,entry,parent);windows.forEach(w=>window(w,parent));if(entry)door(entry,parent);
  // True offset courses, shaded mortar gaps and bevelled corner contact edges.
  for(let row=0;row<3;row++){
   let start=-f.span/2-(row%2?.27:0),n=0;
   while(start<f.span/2){
    const unit=.43+rng()*.28,l=Math.max(-f.span/2,start),r=Math.min(f.span/2,start+unit);start+=unit;n++;if(r-l<.12)continue;
    if(entry&&Math.abs((l+r)/2-entry.x)<.64)continue;
    const brick=stoneBrick(r-l-.019,.185+rng()*.017,.165+rng()*.026,stones[(n+row+index)%3],(l+r)/2,.12+row*.215+(rng()-.5)*.012,.026,parent);brick.rotation.z=(rng()-.5)*.030;
   }
  }
  for(const yy of [.74,2.32,height])timber(f.span+.05,.13,.18,0,yy,.054,parent);
  if(index===0){for(const xx of [-f.span/2,0,f.span/2])timber(.15,height,.18,xx,height/2,.065,parent);}
  else{for(const xx of [-f.span/2,f.span/2])timber(.13,height-2.32,.17,xx,(height+2.32)/2,.052,parent);}
  if(full){
   for(const side of [-1,1])timberBeam([side*f.span/2,height-.62,.059],[side*(f.span/2-.46),height,.059],.095,parent);
   // Flush wooden pins mark real beam intersections rather than adding ornaments.
   for(const xx of index===0?[-f.span/2+.035,0,f.span/2-.035]:[-f.span/2+.035,f.span/2-.035])for(const yy of index===0?[.74,2.32]:[2.32]){
    const peg=mesh(geo(new T.CylinderGeometry(.017,.017,.014,7)),timbers[0],xx,yy,.162,parent);peg.rotation.x=Math.PI/2;counters.timberJointCount++;
   }
  }
 }
 if(index===1)for(const xx of [-half,half])for(const zz of [-depth/2,depth/2]){
  let y=.77,n=0;while(y<height){const h=.19+rng()*.065,w=n%2?.26+rng()*.065:.16+rng()*.055,d=n%2?.16+rng()*.055:.26+rng()*.065,brick=stoneBrick(w,h,d,stones[n%3],xx,y+h/2,zz,group);brick.rotation.y=(rng()-.5)*.044;y+=h+.017+rng()*.013;n++;}
 }
 const shape=new T.Shape();shape.moveTo(-half,0);shape.lineTo(half,0);shape.lineTo(0,rise);shape.closePath();
 for(const side of [-1,1]){
  const front=side*(depth/2+.002),face=mesh(geo(new T.ShapeGeometry(shape)),plaster,0,height,front,group);if(side<0)face.rotation.y=Math.PI;
  for(const s of [-1,1])timberBeam([s*half,height,front],[0,height+rise,front],.14,group);timber(.13,rise,.16,0,height+rise/2,front,group);
 }
 const angle=Math.atan2(rise,half),slope=Math.hypot(half+.3,rise);
 for(const side of [-1,1]){
  const roof=box(slope,.17,depth+.64,palette.roof,side*half/2,height+rise/2,0,group);roof.rotation.z=-side*angle;
  timber(.17,.24,depth+.72,side*(half+.17),height-.07,0,group);
  timber(.13,.065,depth+.74,side*(half+.13),height-.23,0,group);
  for(let n=0;n<Math.ceil(depth/.51)+1;n++)timberBeam([side*(half-.28),height-.21,-depth/2+n*.51],[side*(half+.30),height+.03,-depth/2+n*.51],.10,group);
 }
 for(const end of [-1,1])for(const side of [-1,1]){
  timberBeam([side*(half+.27),height-.14,end*(depth/2+.33)],[0,height+rise+.14,end*(depth/2+.33)],.18,group);
  timberBeam([side*(half+.27),height-.20,end*(depth/2+.36)],[0,height+rise+.08,end*(depth/2+.36)],.055,group);
 }
 timber(.14,.13,depth+.78,0,height+rise+.13,0,group);roofTiles(group,{width,depth,height,rise,material:palette.roof});
 group.traverse(o=>{if(o.isInstancedMesh&&o.material===palette.roof){const color=new T.Color();for(let n=0;n<o.count;n++){color.setRGB(.82+rng()*.18,.80+rng()*.17,.78+rng()*.18);o.setColorAt(n,color);}}});
 batchStatic(group);
 const prune=parent=>{for(const child of [...parent.children]){if(child.isGroup){prune(child);if(!child.children.length)parent.remove(child);}}};prune(group);
 let staticMeshCount=0,instancedMeshCount=0;group.traverse(o=>{if(o.isInstancedMesh)instancedMeshCount++;else if(o.isMesh)staticMeshCount++;});
 return {type:index===0?'warm timber lane facade':'pale masonry lane facade',...counters,recessDepth:.20,wallThickness:.24,diamondLead:true,glass:'Original cool-grey reflective tint; no scene refraction',eaveLayers:3,brickCourses:3,staticMeshCount,instancedMeshCount,surfaces:'Face-specific rain traces, plaster loss and window-corner hairline cracks; length-aligned solid timber grain, softened sections and flush joinery pins',geometry:'Original cut wall slabs, recessed panes, fixed hinged shutters, uneven stone courses, arch stones and layered eaves'};
}
