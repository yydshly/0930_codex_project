import {T} from './four-playable-stage.js';
import {batchStatic} from './games-art.js';
import {roundedBoxGeometry} from './visual-materials.js';
import {buildSculptedRallyStadium} from './soccer-stadium.js';

const mat=(color,roughness=.65,metalness=0,extra={})=>new T.MeshStandardMaterial({color,roughness,metalness,...extra});
const add=(parent,g,m,x=0,y=0,z=0)=>{const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
const box=(parent,w,h,d,m,x=0,y=0,z=0,r=0)=>add(parent,r?roundedBoxGeometry(w,h,d,r):new T.BoxGeometry(w,h,d),m,x,y,z);
const cylinder=(parent,r1,r2,h,m,x=0,y=0,z=0,axis='y',n=24)=>{const a=add(parent,new T.CylinderGeometry(r1,r2,h,n),m,x,y,z);if(axis==='x')a.rotation.z=Math.PI/2;if(axis==='z')a.rotation.x=Math.PI/2;return a;};
const line=(parent,points,r,m)=>add(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(8,points.length*6),r,5,false),m);
function patch(parent,points,m){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return add(parent,g,m);}
// Longitudinal sections form the bonnet, fenders and tail as a single shell.
function loft(parent,sections,m){const positions=[],uv=[],indices=[],count=10;sections.forEach(([z,w,bottom,top],row)=>{const outline=[[-w,bottom],[-w,top-.09],[-w*.79,top-.015],[-w*.39,top],[w*.39,top],[w*.79,top-.015],[w,top-.09],[w,bottom],[w*.75,bottom-.02],[-w*.75,bottom-.02]];outline.forEach(([x,y],i)=>{positions.push(x,y,z);uv.push(i/count,row/(sections.length-1));if(row<sections.length-1){const a=row*count+i,b=row*count+(i+1)%count;indices.push(a,a+count,b,b,a+count,b+count);}});});for(const row of [0,sections.length-1]){const [z,,bottom,top]=sections[row],center=positions.length/3;positions.push(0,(bottom+top)/2,z);uv.push(.5,.5);for(let i=0;i<count;i++){const a=row*count+i,b=row*count+(i+1)%count;indices.push(...(row?[center,b,a]:[center,a,b]));}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return add(parent,g,m);}
function sidePanel(parent,points,x,width,m){const s=new T.Shape();points.forEach(([z,y],i)=>i?s.lineTo(-z,y):s.moveTo(-z,y));s.closePath();const g=new T.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelSize:.007,bevelThickness:.004,bevelSegments:2,steps:1});g.translate(0,0,-width/2);g.rotateY(Math.PI/2);return add(parent,g,m,x);}

export function makeRallyCoupe(){
 const car=new T.Group(),paint=new T.MeshPhysicalMaterial({color:'#2e4e82',roughness:.28,metalness:.60,clearcoat:1,clearcoatRoughness:.17}),edge=mat('#4f6d91',.33,.67),trim=mat('#192b35',.58,.46),rubber=mat('#101c21',.93),glass=new T.MeshPhysicalMaterial({color:'#152a37',roughness:.16,metalness:.25,clearcoat:1}),alloy=mat('#a2acaa',.32,.86),hubMat=mat('#43596b',.43,.70),red=mat('#b65240',.34,.3,{emissive:'#a92721',emissiveIntensity:.65}),white=mat('#dbe8db',.32,.35,{emissive:'#a7d8dd',emissiveIntensity:.8});
 const wheelZ=[-1.04,1.02],sections=[[-1.70,.76,-.17,.17],[-1.49,.88,-.16,.23],[-1.36,.92,.087,.277],[-1.17,.935,.207,.30],[-1.04,.94,.225,.305],[-.87,.925,.194,.306],[-.68,.92,.045,.294],[-.54,.88,-.17,.273],[.51,.87,-.17,.265],[.69,.92,.066,.272],[.89,.935,.207,.287],[1.02,.94,.225,.290],[1.18,.933,.198,.285],[1.36,.91,.067,.266],[1.49,.87,-.16,.237],[1.67,.77,-.17,.18]];
 loft(car,sections,paint);box(car,1.57,.10,1.06,trim,0,-.165,0,.035);
 // Cabin follows a raked windshield and fastback rear glass, with no upright SUV block.
 loft(car,[[-.64,.67,.266,.275],[-.39,.65,.275,.43],[-.035,.595,.285,.665],[.42,.586,.279,.660],[.83,.665,.270,.396],[1.02,.69,.264,.278]],paint);
 glass.side=T.DoubleSide;patch(car,[[-.57,.456,-.38],[.57,.456,-.38],[.52,.678,-.038],[-.52,.678,-.038]],glass);
 patch(car,[[-.515,.681,.428],[-.602,.417,.845],[.602,.417,.845],[.515,.681,.428]],glass);
 for(const side of [-1,1]){
  patch(car,[[side*.647,.402,-.37],[side*.610,.620,-.026],[side*.604,.618,.372],[side*.662,.366,.748]],glass);
  line(car,[[side*.68,.290,-.54],[side*.71,.274,.53]],.009,trim);line(car,[[side*.67,.285,.53],[side*.71,.236,.65],[side*.77,.194,.52]],.007,trim);
  box(car,.015,.027,.104,alloy,side*.728,.299,.46,.005);box(car,.12,.079,.16,paint,side*.758,.344,-.32,.022);
  line(car,[[side*.772,.211,-1.49],[side*.796,.257,-1.33],[side*.82,.280,-1.06]],.009,edge);
  box(car,.055,.074,1.08,trim,side*.874,-.097,0,.013);
  const browMat=paint.clone();browMat.color.set('#365884');for(const z of wheelZ){const arch=add(car,new T.TorusGeometry(.461,.030,7,40,Math.PI),browMat,side*.936,-.27,z);arch.rotation.y=Math.PI/2;}
  box(car,.492,.053,.051,white,side*.470,.128,-1.711,.016);box(car,.532,.055,.050,red,side*.465,.119,1.690,.015);
 }
 // Fine grille openings, bumper splitter, diffuser and modest integrated rear wing.
 box(car,1.45,.077,.094,trim,0,-.079,-1.69,.019);box(car,1.72,.027,.145,trim,0,-.197,-1.64,.008);box(car,.648,.063,.019,rubber,0,.016,-1.751,.006);
 for(let i=0;i<7;i++)box(car,.056,.010,.026,alloy,-.253+i*.084,.016,-1.766,.002);
 box(car,1.44,.095,.076,trim,0,-.089,1.704,.020);box(car,.51,.113,.019,rubber,0,.093,1.722,.008);box(car,.36,.053,.023,hubMat,0,.089,1.737,.004);
 for(const x of [-.53,-.25,.25,.53])box(car,.027,.091,.21,trim,x,-.174,1.57,.004);
 for(const side of [-1,1])box(car,.047,.153,.055,trim,side*.56,.33,1.41,.010);box(car,1.64,.044,.223,trim,0,.406,1.41,.011);
 // Narrow bonnet stripes turn down toward the nose and are subordinate to the surface.
 for(const x of [-.21,.21])patch(car,[[x-.025,.285,-1.32],[x+.025,.285,-1.32],[x+.025,.312,-.68],[x-.025,.312,-.68]],edge);
 batchStatic(car);const wheels=[];
 for(const x of [-.982,.982])for(const z of wheelZ){const wheel=new T.Group();car.add(wheel);cylinder(wheel,.38,.38,.285,rubber,0,0,0,'x',40);const face=Math.sign(x)*.15;cylinder(wheel,.267,.267,.011,trim,face,0,0,'x',32);const rim=add(wheel,new T.TorusGeometry(.249,.021,8,36),alloy,face+Math.sign(x)*.009,0,0);rim.rotation.y=Math.PI/2;
  for(let n=0;n<7;n++){const spoke=box(wheel,.017,.045,.385,alloy,face+Math.sign(x)*.013,0,0,.010);spoke.rotation.x=n*Math.PI/7+.20;}
  cylinder(wheel,.077,.077,.028,hubMat,face+Math.sign(x)*.022,0,0,'x',24);
  for(let n=0;n<5;n++)cylinder(wheel,.008,.008,.030,alloy,face+Math.sign(x)*.034,Math.sin(n*Math.PI*2/5)*.050,Math.cos(n*Math.PI*2/5)*.050,'x',8);
  for(const stripe of [-.075,.075]){const ring=add(wheel,new T.TorusGeometry(.374,.004,4,40),trim,stripe,0,0);ring.rotation.y=Math.PI/2;}
  batchStatic(wheel);wheel.position.set(x,-.27,z);wheels.push(wheel);
 }
 const flame=new T.Group(),glow=mat('#74ceea',.3,0,{emissive:'#3498c6',emissiveIntensity:2,transparent:true,opacity:.58,depthWrite:false});flame.position.z=1.82;
 for(const side of [-1,1]){const pipe=add(car,new T.CylinderGeometry(.075,.082,.18,20,1,true),alloy,side*.45,-.097,1.77);pipe.rotation.x=Math.PI/2;add(car,new T.CircleGeometry(.063,20),rubber,side*.45,-.097,1.865);const cone=add(flame,new T.ConeGeometry(.09,.80,12,1,true),glow,side*.45,-.098,.43);cone.rotation.x=Math.PI/2;}
 flame.visible=false;car.add(flame);car.userData.wheels=wheels;car.userData.flame=flame;car.userData.design={profile:'low raked two-door fastback coupe',body:'continuous longitudinal sections with true wheel arch clearance',wheelRadius:.38,wheelCenters:wheelZ,roofHeight:1.315,length:3.4,scope:'original authored surfaces; no original game vehicle assets'};return car;
}

export const buildCoveredRallyArena=buildSculptedRallyStadium;
