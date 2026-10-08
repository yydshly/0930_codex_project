// CASE 05: authored contours and connected joints, not source-game assets.
import {T} from './four-playable-stage.js';
import {batchStatic} from './games-art.js';
import {pbrMaterial,photoEnvironment,roundedBoxGeometry} from './visual-materials.js';
import {defenseFinish,plateUV,armorFastener,jointSleeve} from './defense-finish.js';

const material=(color,roughness=.6,metalness=0,extra={})=>new T.MeshStandardMaterial({color,roughness,metalness,...extra});
function mesh(parent,geometry,mat,x=0,y=0,z=0){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function block(parent,w,h,d,mat,x=0,y=0,z=0,r=.008){return mesh(parent,roundedBoxGeometry(w,h,d,r),mat,x,y,z);}
function ellipsoid(parent,rx,ry,rz,mat,x=0,y=0,z=0){const m=mesh(parent,new T.SphereGeometry(1,20,14),mat,x,y,z);m.scale.set(rx,ry,rz);return m;}
function cylinder(parent,r1,r2,length,mat,x,y,z,axis='y'){const m=mesh(parent,new T.CylinderGeometry(r1,r2,length,16),mat,x,y,z);if(axis==='z')m.rotation.x=Math.PI/2;if(axis==='x')m.rotation.z=Math.PI/2;return m;}
function profile(parent,points,width,mat,x=0,holes=[]){const s=new T.Shape();points.forEach(([z,y],i)=>i?s.lineTo(-z,y):s.moveTo(-z,y));s.closePath();for(const ring of holes){const p=new T.Path();ring.forEach(([z,y],i)=>i?p.lineTo(-z,y):p.moveTo(-z,y));p.closePath();s.holes.push(p);}const g=new T.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2,curveSegments:10,steps:1});g.translate(0,0,-width/2);g.rotateY(Math.PI/2);plateUV(g);return mesh(parent,g,mat,x);}
function frontPanel(parent,points,depth,mat,z=0,x=0){const shape=new T.Shape();points.forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2,steps:1});g.translate(x,0,z-depth/2);plateUV(g);return mesh(parent,g,mat);}
// Elliptical sections describe a continuous designed shell rather than a stack of boxes.
function shell(parent,rings,mat,x=0,z=0){rings=[...rings].sort((a,b)=>a[0]-b[0]);const p=[],uv=[],idx=[],segments=24;for(let row=0;row<rings.length;row++){const [y,rx,rz,offset=0,power=2]=rings[row];for(let n=0;n<=segments;n++){const a=n/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);p.push(x+Math.sign(c)*Math.abs(c)**(2/power)*rx,y,z+offset+Math.sign(s)*Math.abs(s)**(2/power)*rz);uv.push(n/segments,row/(rings.length-1));if(row<rings.length-1&&n<segments){const i=row*(segments+1)+n;idx.push(i,i+segments+1,i+1,i+1,i+segments+1,i+segments+2);}}}for(const row of [0,rings.length-1]){const [y,,,offset=0]=rings[row],c=p.length/3;p.push(x,y,z+offset);uv.push(.5,.5);for(let n=0;n<segments;n++){const i=row*(segments+1)+n;idx.push(...(row?[c,i,i+1]:[c,i+1,i]));}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(parent,g,mat);}
function seam(parent,a,b,r,mat){const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start),m=cylinder(parent,r,r,direction.length(),mat,...start.clone().add(end).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());return m;}
// Static geometry inside an articulated joint must remain in that joint's coordinates.
function batchJoint(group){const position=group.position.clone();group.position.set(0,0,0);batchStatic(group);group.position.copy(position);group.updateMatrixWorld(true);}

export function makeDefenseWeapon(){
 const g=new T.Group(),metal=defenseFinish('#46504b',.48,.72,'steel'),dark=defenseFinish('#172324',.68,.30,'steel'),polymer=defenseFinish('#363d35',.87,.08,'rubber'),edge=defenseFinish('#7d877a',.54,.64,'steel'),brass=material('#a49262',.5,.55),ink=material('#0b1516',.94),glass=material('#273f38',.19,.38);
 // The receiver joins the barrel shroud, stock tube and sloped grip in one silhouette.
 profile(g,[[-.32,.068],[-.24,.103],[.18,.103],[.25,.065],[.22,-.087],[-.18,-.092],[-.30,-.046]],.145,metal);
 profile(g,[[-.62,.052],[-.30,.069],[-.27,-.035],[-.35,-.086],[-.60,-.069]],.128,polymer,0,Array.from({length:4},(_,i)=>{const z=-.58+i*.063;return [[z-.018,.018],[z+.018,.018],[z+.018,-.018],[z-.018,-.018]];}));
 cylinder(g,.024,.024,.37,dark,0,.017,-.725,'z');cylinder(g,.034,.030,.09,metal,0,.017,-.91,'z');
 const bore=mesh(g,new T.CircleGeometry(.021,20),ink,0,.017,-.961);bore.rotation.y=Math.PI;
 for(const z of [-.94,-.89]){const ring=mesh(g,new T.TorusGeometry(.029,.004,6,20),edge,0,.017,z);}
 // Skeleton stock has actual open space, a cheek line and a thin butt plate.
 cylinder(g,.028,.028,.18,dark,0,.042,.32,'z');
 profile(g,[[.32,.062],[.65,.073],[.68,.024],[.65,-.16],[.61,-.18],[.50,-.09],[.34,-.04]],.085,polymer,0,[[[.39,.021],[.59,.024],[.59,-.098],[.53,-.068],[.39,-.018]]]);
 block(g,.098,.227,.034,dark,0,-.042,.667,.018);block(g,.080,.021,.21,polymer,0,.087,.51,.006);
 profile(g,[[.10,-.065],[.17,-.069],[.27,-.27],[.18,-.289],[.105,-.155]],.086,polymer);
 // Lower energy cell and cut-through trigger guard remain subordinate to the receiver.
 profile(g,[[-.17,-.067],[-.045,-.070],[-.020,-.253],[-.12,-.279],[-.176,-.242]],.091,dark);
 profile(g,[[-.04,-.063],[.12,-.066],[.135,-.155],[-.025,-.169]],.038,metal,0,[[[-.005,-.092],[.095,-.092],[.094,-.137],[-.004,-.143]]]);
 seam(g,[0,-.093,.065],[0,-.136,.042],.008,brass);
 for(const x of [-.078,.078]){block(g,.008,.069,.17,dark,x,.016,.065,.006);block(g,.012,.035,.101,ink,x,.035,-.048,.004);block(g,.015,.011,.096,edge,x,.061,-.049,.004);}
 // Panel boundaries, recessed fasteners and a side charging lever read at first-person distance.
 for(const side of [-1,1]){
  const x=side*.078;
  for(const [y,z] of [[.074,-.21],[-.060,-.19],[.060,.166],[-.056,.161]])armorFastener(g,x,y,z,edge,.007,'x');
  block(g,.007,.003,.31,ink,x,.080,-.034,.001);block(g,.008,.003,.29,ink,x,-.060,-.035,.001);
  for(let n=0;n<5;n++)block(g,.006,.027,.025,ink,side*.070,.024,-.55+n*.056,.003);
  block(g,.019,.022,.044,metal,side*.089,.043,.122,.004);
  const lever=block(g,.048,.020,.014,dark,side*.109,.053,.104,.003);lever.rotation.y=side*-.25;
  // Faint edge abrasion follows machined surfaces rather than outlining every part.
  block(g,.003,.002,.125,edge,side*.081,.084,-.11,.001);
  block(g,.003,.002,.054,edge,side*.081,-.065,.133,.001);
  for(let n=0;n<3;n++)block(g,.002,.002,.015,edge,side*.081,.062-n*.004,-.15+n*.008,.001);
 }
 cylinder(g,.025,.025,.018,metal,0,.017,-.838,'z');
 for(let n=0;n<6;n++)block(g,.064,.005,.002,ink,0,.023+n*.017,.687,.001);
 for(let n=0;n<8;n++)block(g,.13,.014,.023,dark,0,.118,-.23+n*.048,.003);
 block(g,.071,.052,.12,dark,0,.145,.027,.007);
 const optic=mesh(g,new T.TorusGeometry(.040,.008,8,24),metal,0,.201,.015);cylinder(g,.041,.041,.028,dark,0,.201,.004,'z');
 const lens=mesh(g,new T.CircleGeometry(.030,24),glass,0,.201,.021);lens.material.side=T.DoubleSide;
 block(g,.022,.004,.005,brass,0,.196,.033,.001);
 for(let n=0;n<5;n++){const rib=block(g,.090,.015,.023,dark,0,-.195+n*.027,.208-n*.012,.003);rib.rotation.x=-.38;}
 const charge=block(g,.005,.044,.043,material('#729d8b',.5,.2,{emissive:'#436856',emissiveIntensity:.28}),-.081,.025,.174,.002);
 g.userData.muzzle={x:0,y:.017,z:-.962};g.userData.viewBase={x:.29,y:-.31,z:-.91};g.userData.charge=charge;
 g.userData.design={parts:['receiver','barrel','vented handguard','open stock','sloped grip','trigger guard','energy cell','ring sight','panel fasteners','side charging lever','brushed coating and bounded edge wear'],length:1.642,unscaledHeight:.498,model:'original authored bevelled profiles and local finish textures; no external game assets'};
 batchStatic(g);g.traverse(o=>{if(o.isMesh)o.castShadow=false;});return g;
}

export function makeDefenseGuard(){
 const root=new T.Group(),body=new T.Group(),head=new T.Group(),pelvis=new T.Group();root.add(body,head,pelvis);
 const armor=defenseFinish('#697567',.79,.18),darkArmor=defenseFinish('#394c48',.73,.35),undersuit=defenseFinish('#202d2c',.95,.02,'rubber'),joint=defenseFinish('#4e605c',.59,.58,'steel'),trim=defenseFinish('#8d947e',.76,.25),visor=material('#132b2a',.29,.38),light=material('#b5c4a7',.36,.40,{emissive:'#859879',emissiveIntensity:.35});
 shell(body,[[1.04,.145,.103],[1.12,.169,.132],[1.28,.229,.156],[1.43,.252,.140],[1.52,.215,.123],[1.57,.135,.080]],undersuit);
 shell(body,[[1.19,.174,.142,.025,2.8],[1.30,.232,.160,.014,2.8],[1.44,.241,.150,.008,2.8],[1.50,.198,.125,0,2.6]],armor);
 // A curved breastplate, abdominal segmentation and clavicles follow the torso.
 // Two fitted chest leaves leave a dark centre seam and an articulated lower edge.
 for(const side of [-1,1]){
  frontPanel(body,[[side*.016,1.447],[side*.172,1.435],[side*.195,1.373],[side*.151,1.293],[side*.020,1.278]],.024,darkArmor,.164);
  for(const [x,y] of [[.145,1.415],[.145,1.319]])armorFastener(body,side*x,y,.183,joint,.007);
  for(let n=0;n<3;n++)block(body,.053,.005,.004,undersuit,side*.094,1.383-n*.018,.183,.001);
 }
 frontPanel(body,[[-.103,1.266],[-.097,1.231],[.097,1.231],[.103,1.266]],.016,trim,.160);
 block(body,.017,.153,.013,undersuit,0,1.370,.175,.003);
 for(const side of [-1,1]){seam(body,[side*.164,1.47,.128],[side*.025,1.438,.186],.011,trim);seam(body,[side*.172,1.337,.166],[side*.141,1.270,.166],.007,undersuit);}
 frontPanel(body,[[-.140,1.182],[-.149,1.124],[-.119,1.053],[.119,1.053],[.149,1.124],[.140,1.182]],.026,darkArmor,.108);
 seam(body,[-.130,1.128,.127],[.130,1.128,.127],.006,undersuit);
 for(let n=0;n<3;n++)frontPanel(body,[[-.117,1.180-n*.044],[-.103,1.153-n*.044],[.103,1.153-n*.044],[.117,1.180-n*.044]],.014,armor,.132-n*.014);
 for(const side of [-1,1]){seam(body,[side*.176,1.223,.076],[side*.129,1.113,.080],.011,undersuit);armorFastener(body,side*.145,1.179,.144,joint,.005);}
 cylinder(body,.072,.078,.125,joint,0,1.62,0);for(const x of [-.028,.028])seam(body,[x,1.60,.06],[x,1.65,.06],.010,undersuit);
 // Helmet is a continuous tapered surface with brow, cheek guards and a recessed visor.
 shell(head,[[1.65,.077,.091,0,2.6],[1.69,.107,.103,0,2.7],[1.78,.119,.106,0,2.8],[1.86,.116,.106,0,2.7],[1.92,.085,.080,0,2.4],[1.944,.037,.038]],armor);
 const face=ellipsoid(head,.096,.035,.017,visor,0,1.819,.106);block(head,.173,.010,.014,light,0,1.822,.121,.003);
 for(const side of [-1,1]){const cheek=ellipsoid(head,.023,.052,.021,darkArmor,side*.076,1.724,.090);cheek.rotation.z=side*-.23;cylinder(head,.025,.025,.012,trim,side*.119,1.773,0,'x');}
 shell(head,[[1.650,.077,.088],[1.671,.088,.101],[1.699,.096,.097]],darkArmor);seam(head,[-.095,1.851,.085],[.095,1.851,.085],.013,darkArmor);
 frontPanel(head,[[-.058,1.742],[-.063,1.700],[0,1.681],[.063,1.700],[.058,1.742]],.015,darkArmor,.110);
 for(const side of [-1,1]){for(let n=0;n<3;n++)block(head,.028,.004,.005,undersuit,side*.040,1.723-n*.009,.126,.001);armorFastener(head,side*.079,1.873,.088,joint,.005);}
 block(head,.011,.054,.007,darkArmor,0,1.91,.076,.002);
 shell(pelvis,[[.81,.127,.090],[.88,.183,.125],[.99,.187,.123],[1.08,.159,.108]],undersuit);
 shell(pelvis,[[.842,.128,.094],[.903,.181,.132],[1.010,.185,.133],[1.040,.157,.115]],armor);
 frontPanel(pelvis,[[-.085,1.010],[-.072,.884],[0,.819],[.072,.884],[.085,1.010]],.021,darkArmor,.136);block(pelvis,.155,.046,.028,darkArmor,0,1.048,.122,.010);
 block(pelvis,.067,.039,.019,joint,0,1.049,.149,.006);
 for(const side of [-1,1]){block(pelvis,.048,.058,.027,undersuit,side*.130,1.025,.123,.008);block(pelvis,.010,.047,.010,trim,side*.113,1.025,.145,.002);frontPanel(pelvis,[[side*.108,.985],[side*.177,.976],[side*.173,.893],[side*.123,.869]],.015,darkArmor,.122);}
 batchStatic(body);batchStatic(head);batchStatic(pelvis);
 root.userData.limbs=[];
 for(const side of [-1,1]){
  const arm=new T.Group(),elbow=new T.Group(),leg=new T.Group(),knee=new T.Group();arm.position.set(side*.279,1.468,0);elbow.position.y=-.310;leg.position.set(side*.124,.892,0);knee.position.y=-.398;
  cylinder(arm,.054,.054,.113,joint,0,-.003,0,'x');shell(arm,[[-.117,.074,.073,0,2.9],[-.061,.103,.089,0,3.1],[.025,.104,.089,0,3.1],[.059,.085,.079,0,2.9],[.074,.047,.059]],armor,side*.014);
  frontPanel(arm,[[-.069,.009],[-.080,-.068],[-.059,-.112],[.059,-.112],[.080,-.068],[.069,.009]],.018,darkArmor,.086,side*.012);
  seam(arm,[-.062,-.086,.087],[.062,-.086,.087],.004,trim);for(const x of [-.063,.063])armorFastener(arm,x,-.041,.100,joint,.006);
  shell(arm,[[.009,.061,.071],[-.08,.080,.083],[-.21,.069,.070],[-.292,.054,.058]],darkArmor);seam(arm,[0,-.08,-.043],[0,-.27,-.049],.022,undersuit);batchJoint(arm);
  cylinder(elbow,.051,.051,.105,joint,0,0,0,'x');jointSleeve(elbow,{y:-.012,length:.060,rx:.052,rz:.053,material:undersuit,rings:4});shell(elbow,[[-.052,.060,.060,0,2.8],[-.10,.070,.068,0,3.0],[-.21,.055,.057,0,2.8],[-.280,.047,.045,0,2.6]],armor);
  frontPanel(elbow,[[-.045,.028],[-.057,-.020],[-.036,-.063],[.036,-.063],[.057,-.020],[.045,.028]],.017,darkArmor,.063);
  frontPanel(elbow,[[-.040,-.096],[-.034,-.216],[.034,-.216],[.040,-.096]],.014,darkArmor,.065);for(const y of [-.110,-.204])armorFastener(elbow,0,y,.079,joint,.005);
  const wrist=cylinder(elbow,.046,.047,.050,undersuit,0,-.298,0);ellipsoid(elbow,.049,.071,.026,undersuit,0,-.371,.005);
  for(let n=0;n<4;n++){const finger=ellipsoid(elbow,.009,.045,.013,darkArmor,-.027+n*.018,-.424,.013);finger.rotation.x=-.18;}
  ellipsoid(elbow,.016,.038,.019,undersuit,side*.042,-.374,.018);batchJoint(elbow);arm.add(elbow);root.add(arm);
  cylinder(leg,.061,.061,.13,joint,0,0,0,'x');shell(leg,[[-.02,.086,.092],[-.095,.100,.107],[-.30,.075,.085],[-.383,.058,.060]],darkArmor);frontPanel(leg,[[-.056,-.076],[-.070,-.16],[-.047,-.306],[.047,-.306],[.070,-.16],[.056,-.076]],.025,armor,.094,side*.010);
  for(const y of [-.108,-.284])armorFastener(leg,side*.010,y,.111,joint,.006);seam(leg,[-.051,-.246,.098],[.051,-.246,.098],.004,undersuit);batchJoint(leg);
  cylinder(knee,.047,.047,.108,joint,0,0,0,'x');jointSleeve(knee,{y:-.027,length:.085,rx:.052,rz:.053,material:undersuit});frontPanel(knee,[[-.048,.037],[-.060,-.012],[-.042,-.073],[.042,-.073],[.060,-.012],[.048,.037]],.025,trim,.063);shell(knee,[[-.057,.058,.063,0,2.8],[-.112,.071,.073,0,2.8],[-.25,.057,.061,0,2.6],[-.34,.042,.046]],armor);
  frontPanel(knee,[[-.035,-.125],[-.024,-.304],[.024,-.304],[.035,-.125]],.012,darkArmor,.070);armorFastener(knee,0,-.009,.083,joint,.006);
  cylinder(knee,.041,.044,.060,undersuit,0,-.350,0);const boot=block(knee,.146,.112,.259,darkArmor,0,-.433,.052,.031);block(knee,.150,.024,.268,undersuit,0,-.483,.052,.010);block(knee,.125,.053,.085,joint,0,-.422,.131,.016);for(let n=0;n<3;n++)block(knee,.115,.007,.013,undersuit,0,-.389,.003+n*.022,.002);batchJoint(knee);leg.add(knee);root.add(leg);root.userData.limbs.push({side,arm,elbow,leg,knee});
 }
 root.userData.design={height:1.95,shoulderWidth:.78,hipHeight:.892,connectedJoints:['neck','shoulder','elbow','hip','knee','ankle'],finish:['paired chest leaves','segmented abdomen','fitted shoulder shells','ribbed joint sleeves','panel fasteners','local coating breakup'],model:'original contoured patrol armor; no source-game mesh'};
 return root;
}

export function poseDefenseGuard(g,{phase,walk,wind,progress}){for(const limb of g.userData.limbs||[]){const stride=walk*limb.side;limb.leg.rotation.x=stride*.22;limb.knee.rotation.x=Math.max(0,-stride)*.32+.045;
 limb.arm.rotation.x=phase==='windup'?-1.28-.28*wind:phase==='strike'?-1.10:phase==='recovery'?-1.10*(1-progress):-.075-stride*.17;
 limb.arm.rotation.z=phase==='windup'?limb.side*(.24+.12*wind):limb.side*.07;
 limb.elbow.rotation.x=phase==='windup'?-.72:phase==='strike'?-.18:phase==='recovery'?-.18-.08*progress:-.22;
}}

export function buildDefenseRoom(stage,obstacles,colliders){
 const s=stage.scene,wall=pbrMaterial('concrete_floor',{repeat:[6,2],color:'#84817a',normal:.42,roughness:.98,onLoad:()=>stage.draw()}),floor=pbrMaterial('concrete_floor',{repeat:[8,8],color:'#74756b',normal:.3,roughness:.92,onLoad:()=>stage.draw()}),steel=material('#414b4a',.72,.38),rack=material('#253331',.88,.25),dark=material('#182421',.97),ivory=material('#a3a38d',.87),warm=material('#ded5ba',.6,.05,{emissive:'#e3c491',emissiveIntensity:.65}),cool=material('#bfcec5',.5,.25,{emissive:'#90b7b1',emissiveIntensity:.8});
 s.userData.photoEnvironment=photoEnvironment(stage,{onLoad:()=>stage.draw()});stage.renderer.toneMappingExposure=.92;
 s.add(new T.HemisphereLight('#c3d0c9','#322f28',.48));const overhead=new T.DirectionalLight('#d9ddc8',.74);overhead.position.set(1.5,3.78,5);overhead.target.position.set(0,.8,-4);overhead.castShadow=true;overhead.shadow.mapSize.set(1024,1024);Object.assign(overhead.shadow.camera,{left:-12,right:12,top:13,bottom:-13,far:30});overhead.shadow.normalBias=.025;s.add(overhead,overhead.target);
 block(s,23,.13,23,floor,0,-.09,0,.001);block(s,23,.20,23,steel,0,4.15,0,.003);
 for(const x of [-11.5,11.5])block(s,.26,4.1,23,wall,x,2,0,.001);for(const z of [-11.5,11.5])block(s,23,4.1,.26,wall,0,2,z,.001);
 // Physical expansion joints replace the saturated oversized grid.
 for(let z=-9;z<11;z+=3.6)block(s,22,.007,.010,dark,0,.008,z,.001);for(const x of [-7.3,-.5,6.3])block(s,.010,.007,22,dark,x,.008,0,.001);
 for(const x of [-11.22,11.22]){block(s,.10,.25,22.5,steel,x,.19,0);for(const y of [2.8,3.2]){cylinder(s,.045,.045,21.9,steel,x,y,0,'z');}}
 for(const z of [-8,-2.6,4.8]){block(s,23,.18,.20,steel,0,3.99,z);}
 // Human-scale central doorway has opaque jambs and a real ray-blocking header.
 const portalZ=-5.5;for(const side of [-1,1]){
  const x=side*4.6,w=5.9,m=block(s,w,4,.30,wall,x,2,portalZ,.018);colliders.push(m);obstacles.push({x,z:portalZ,w,d:.30});
  block(s,.17,2.58,.40,steel,side*1.58,1.29,portalZ+.025,.012);block(s,w,.19,.41,steel,x,.17,portalZ+.03);
 }
 block(s,3.30,1.40,.31,wall,0,3.31,portalZ,.016);block(s,3.44,.18,.47,steel,0,2.57,portalZ+.025,.014);
 const door=block(s,1.92,2.28,.095,dark,0,1.14,-11.29,.016);for(const side of [-1,1])block(s,.13,2.45,.14,steel,side*1.035,1.225,-11.17,.010);block(s,2.23,.13,.16,steel,0,2.41,-11.17,.010);
 block(s,.014,2.1,.025,ivory,0,1.10,-11.23,.002);block(s,.043,.23,.034,ivory,.73,1.1,-11.19,.009);
 for(const o of obstacles.slice(0,2)){
  const group=new T.Group();group.position.set(o.x,0,o.z);s.add(group);const c=block(group,o.w,2.72,o.d,rack,0,1.36,0,.022);colliders.push(c);
  for(const side of [-1,1]){const face=side*(o.d/2+.035);for(const x of [-o.w/2+.075,o.w/2-.075])block(group,.055,2.66,.075,steel,x,1.38,face);
   for(let row=0;row<8;row++){const y=.26+row*.31;block(group,o.w-.22,.269,.055,dark,0,y,face);for(let n=0;n<8;n++)block(group,.105,.005,.009,steel,-.67+n*.19,y+.026,face+side*.033);block(group,.019,.018,.012,cool,-.71,y+.06,face+side*.035);}
  }
  // Cabinet sides retain structure and depth rather than bare shiny wall panels.
  for(const side of [-1,1]){const x=side*(o.w/2+.019);block(group,.045,2.62,o.d-.12,steel,x,1.35,0);for(let n=0;n<6;n++)block(group,.048,.028,.57,dark,x+side*.024,1.80+n*.085,.05);}
 }
 const fixture=(x,z,color,power)=>{const lamp=new T.Group();lamp.position.set(x,3.84,z);s.add(lamp);cylinder(lamp,.30,.23,.08,steel,0,0,0);cylinder(lamp,.225,.225,.012,color,0,-.046,0);const l=new T.PointLight(color===warm?'#e6c695':'#a4d0c7',power,11,2);l.position.set(x,3.53,z);s.add(l);};
 fixture(-1.3,-7.3,warm,43);fixture(4.8,4.6,cool,37);fixture(-6.3,3.5,warm,23);fixture(7.8,-7.8,cool,28);fixture(.3,-2.6,cool,20);
 const doorwayLight=new T.SpotLight('#e6cf9c',48,12,.67,.5,2);doorwayLight.position.set(-.45,3.65,-3.7);doorwayLight.target.position.set(0,1.2,-5.65);s.add(doorwayLight,doorwayLight.target);
 // A directional pool reaches the approaching guard and casts a real floor shadow.
 const patrolLight=new T.SpotLight('#b9c8b5',32,13,.70,.65,2);patrolLight.position.set(1.35,3.72,3.3);patrolLight.target.position.set(-.35,.62,-.4);patrolLight.castShadow=true;patrolLight.shadow.mapSize.set(1024,1024);patrolLight.shadow.bias=-.0003;patrolLight.shadow.normalBias=.012;s.add(patrolLight,patrolLight.target);
 // Low storage on the left and recessed services on the right break the room's symmetry.
 for(const [x,z] of [[-9.7,5.4],[-9.7,6.5],[-8.7,6.4]]){block(s,.76,.68,.83,steel,x,.35,z,.030);for(const side of [-1,1])block(s,.062,.67,.89,ivory,x+side*.29,.35,z,.006);}
 for(let n=0;n<4;n++)block(s,1.25,.54,.08,steel,10.93,1.0+n*.63,-2.5-n*.9,.005).rotation.y=-Math.PI/2;
 for(const mat of [wall,floor,steel,rack,dark,ivory,warm,cool])mat.envMapIntensity=.13;
 s.fog=new T.Fog('#292f2b',17,35);s.userData.defenseRoom={doorway:{width:3.0,height:2.48,z:portalZ},closedDoor:{width:1.92,height:2.28,z:-11.29},ceilingHeight:4.15,lighting:'warm entry, cool foreground and one shadow-casting patrol pool; no source lighting algorithm claimed'};
 return makeDefenseWeapon();
}
