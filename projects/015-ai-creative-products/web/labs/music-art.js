import {T} from './three-stage.js';
import {pbrMaterial,photoEnvironment,roundedBoxGeometry} from './visual-materials.js';
import {agedPianoSurface} from './music-surface.js';
import {sculptCat,createCatLegSkin} from './music-sculpt.js';

export function buildPianoStudio(stage,{keys,robot,cat,arms,feet}){
 const scene=stage.scene,redraw=()=>stage.draw(),environment=photoEnvironment(stage,{onLoad:redraw}),surface=agedPianoSurface();
 scene.background=new T.Color('#302720');scene.fog=new T.FogExp2('#302720',.018);stage.renderer.toneMappingExposure=.79;
 scene.add(new T.HemisphereLight('#e9dfcf','#27232c',.20));
 const sun=new T.DirectionalLight('#ffe2b3',3.15);sun.position.set(-6,8,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:9,bottom:-9,near:.5,far:35});sun.shadow.bias=-.0002;sun.shadow.normalBias=.02;sun.shadow.radius=4;scene.add(sun);
 const fill=new T.DirectionalLight('#8aadc5',.26);fill.position.set(6,4,3);scene.add(fill);
 const faceLight=new T.DirectionalLight('#fff0df',.82);faceLight.position.set(-3,4,6);scene.add(faceLight);
 const rim=new T.DirectionalLight('#ffd09a',.92);rim.position.set(3,4.7,-1.8);scene.add(rim);
 const lampLight=new T.PointLight('#ffb867',18,10,2);lampLight.position.set(4,4.2,-.7);scene.add(lampLight);
 const walnut=pbrMaterial('walnut_veneer',{repeat:[2,1],color:'#b9a28c',normal:.13,roughness:.48,clearcoat:.34,clearcoatRoughness:.24,onLoad:redraw});
 const floorMat=pbrMaterial('wood_floor',{repeat:[4,3],roughness:.65,normal:.28,color:'#b9a88e',onLoad:redraw});
 const plaster=new T.MeshStandardMaterial({color:'#5b4d41',roughness:.96});
 const brass=new T.MeshStandardMaterial({color:'#af8950',metalness:.84,roughness:.3,envMapIntensity:.7});
 const darkWood=new T.MeshStandardMaterial({color:'#2e231d',roughness:.58});
 const paint=surface.paint,wornWood=surface.wood;
 const ivory=new T.MeshPhysicalMaterial({color:'#eee2c9',roughness:.25,clearcoat:.24,clearcoatRoughness:.22,envMapIntensity:.35});
 const ebony=new T.MeshPhysicalMaterial({color:'#18191b',roughness:.23,clearcoat:.25,envMapIntensity:.55});
 const make=(geometry,material,x=0,y=0,z=0,parent=scene)=>{const object=new T.Mesh(geometry,material);object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;parent.add(object);return object;};
 const block=(w,h,d,material,x,y,z,r=.04,parent=scene)=>make(roundedBoxGeometry(w,h,d,r),material,x,y,z,parent);
 const sphere=(rx,ry,rz,material,x,y,z,parent=scene)=>{const m=make(new T.SphereGeometry(1,28,20),material,x,y,z,parent);m.scale.set(rx,ry,rz);return m;};
 const line=(points,material,r=.012,parent=scene)=>make(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,6,false),material,0,0,0,parent);
 make(new T.PlaneGeometry(22,16),floorMat,0,-.21,1).rotation.x=-Math.PI/2;
 block(20,10,.2,plaster,0,4.8,-2.25,.01);block(20,.24,.15,darkWood,0,.05,-2.1,.018);
 // Panelled wall, a real inset window and soft daylight establish a physical room.
 const wallTrim=new T.MeshStandardMaterial({color:'#49403a',roughness:.82});
 for(let i=-4;i<=4;i++){block(.025,6,.035,wallTrim,i*2.1,3,-2.09,.003);}
 for(const y of [1.1,4.5])block(20,.026,.04,wallTrim,0,y,-2.07,.004);
 const windowMat=new T.MeshBasicMaterial({color:'#ead4a4'});
 block(3.0,3.4,.22,walnut,-6,3.8,-2,.08);block(2.72,3.12,.025,windowMat,-6,3.8,-1.86,.03);
 for(const x of [-6.48,-5.52])block(.07,3.1,.15,walnut,x,3.8,-1.72,.013);
 for(const y of [3.3,4.3])block(2.7,.065,.15,walnut,-6,y,-1.72,.01);
 block(3.34,.15,.6,walnut,-6,2.12,-1.66,.04);
 // The broad cabinet is faded blue-gray paint over timber. Narrow chipped
 // mouldings reveal brown edges without covering the faces in noisy scratches.
 block(9,1.46,2.25,paint,0,.7,.08,.035);
 block(8.65,1.82,.64,paint,0,2.1,-.77,.035);
 block(9.4,.19,2.54,paint,0,1.48,.1,.032);
 block(9.15,.16,.9,paint,0,3.09,-.72,.03);
 for(const x of [-4.31,4.31]){block(.32,1.62,2.18,paint,x,.82,.26,.035);block(.39,.15,2.42,paint,x,1.56,.26,.022);}
 for(const x of [-3.65,0,3.65])block(.08,1.19,.065,paint,x,.73,1.225,.009);
 for(const y of [.24,1.25])block(7.38,.055,.055,paint,0,y,1.223,.009);
 block(8.13,1.32,.045,wornWood,0,2.12,-.416,.015);block(7.92,1.14,.05,paint,0,2.12,-.38,.018);
 for(const y of [1.56,2.69])block(8.22,.047,.045,paint,0,y,-.35,.009);
 for(const x of [-4.1,4.1])block(.047,1.15,.045,paint,x,2.12,-.35,.009);
 block(8.43,.11,1.86,darkWood,0,1.6,.44,.025);
 for(let i=0;i<26;i++){
  const midi=45+Math.floor(i/7)*12+[0,2,3,5,7,8,10][i%7],key=block(.307,.2,1.42,ivory.clone(),-4.025+i*.322,1.68,.5,.018);
  key.userData={midi,baseY:1.68,color:'#eee2c9'};keys.push(key);
  if([0,2,3,5,6].includes(i%7)){const k=block(.181,.22,.82,ebony.clone(),key.position.x+.161,1.855,.15,.017);k.userData={midi:midi+1,baseY:1.855,color:'#18191b'};keys.push(k);}
 }
 for(const x of [-.24,0,.24]){line([[x,.13,1.07],[x,.09,1.34],[x,.07,1.63]],brass,.036);sphere(.11,.032,.21,brass,x,.073,1.61);}
 // Engraved maker plaque and a curved actual music stand.
 const plaqueCanvas=document.createElement('canvas');plaqueCanvas.width=1024;plaqueCanvas.height=128;
 const pg=plaqueCanvas.getContext('2d');pg.fillStyle='#3b2a1d';pg.fillRect(0,0,1024,128);pg.fillStyle='#d7b778';pg.textAlign='center';pg.font='38px Georgia';pg.fillText('F I E L D  &  S O N S',512,65);pg.font='17px Georgia';pg.fillText('ORIGINAL DUET · RESEARCH IN MOTION',512,97);
 const plaqueTexture=new T.CanvasTexture(plaqueCanvas);plaqueTexture.colorSpace=T.SRGBColorSpace;
 make(new T.PlaneGeometry(2.9,.36),new T.MeshStandardMaterial({map:plaqueTexture,roughness:.6}),0,2.81,-.326);
 block(2.68,1.45,.075,paint,.22,2.35,-.24,.035);block(2.92,.065,.4,paint,.22,1.89,-.02,.019);
 const scoreCanvas=document.createElement('canvas');scoreCanvas.width=1024;scoreCanvas.height=720;const scoreTexture=new T.CanvasTexture(scoreCanvas);scoreTexture.colorSpace=T.SRGBColorSpace;
 const paper=new T.MeshStandardMaterial({map:scoreTexture,color:'#fff5e2',roughness:.92,side:T.DoubleSide});
 const musicSheet=make(new T.PlaneGeometry(2.51,1.46),paper,.22,2.37,-.178);musicSheet.rotation.x=-.065;
 function updateScore(notes,title){const g=scoreCanvas.getContext('2d');g.fillStyle='#f4ecd9';g.fillRect(0,0,1024,720);g.fillStyle='#5a5048';g.textAlign='center';g.font='42px Georgia';g.fillText('FIELD DUET',512,63);g.font='18px Georgia';g.fillText(title+' · Original piano composition',512,96);g.textAlign='left';for(let row=0;row<4;row++){const y=159+row*133;g.strokeStyle='#888074';g.lineWidth=1.7;for(let j=0;j<5;j++){g.beginPath();g.moveTo(65,y+j*10);g.lineTo(960,y+j*10);g.stroke();}for(let i=0;i<8;i++){const midi=notes[row*8+i]??60,x=99+i*112,yy=y+46-(midi-60)*3.05;g.fillStyle='#49443e';g.beginPath();g.ellipse(x,yy,9,5.2,-.25,0,Math.PI*2);g.fill();g.fillRect(x+8,yy-33,2.7,34);if(i%4===3)g.fillRect(x+42,y,1.6,40);}}g.strokeStyle='#c7bcaa';g.lineWidth=2;g.beginPath();g.moveTo(512,120);g.lineTo(512,675);g.stroke();scoreTexture.needsUpdate=true;redraw();}
 // Warm brass task lamp, green glass shade and a small stack of paper.
 block(1.1,.08,.61,darkWood,3.57,3.25,-.66,.05);
 line([[3.57,3.25,-.66],[3.57,3.7,-.66],[3.36,4.05,-.67],[3.18,4.06,-.65]],brass,.038);
 const shadeMat=new T.MeshPhysicalMaterial({color:'#536f55',roughness:.27,clearcoat:.5,envMapIntensity:.6});
 const shade=make(new T.CapsuleGeometry(.2,.7,6,24),shadeMat,3.04,4.01,-.65);shade.rotation.z=Math.PI/2;shade.scale.z=1.4;
 for(let i=0;i<4;i++)block(.96,.015,.59,new T.MeshStandardMaterial({color:i%2?'#c9b99b':'#e8d9b8',roughness:1}),-3.25,3.22+i*.018,-.66,.006);
 // A compact square toy: one coral shell, flat chevron eyes and short block
 // limbs. The hidden contact rig still drives real key presses from the score.
 const enamel=new T.MeshStandardMaterial({color:'#ff9b86',roughness:.72,metalness:0,envMapIntensity:0});
 const coralSide=new T.MeshStandardMaterial({color:'#cf6853',roughness:.65,envMapIntensity:.16});
 const faceInk=new T.MeshStandardMaterial({color:'#3a3025',roughness:.88});
 const glass=new T.MeshPhysicalMaterial({color:'#131612',roughness:.27,clearcoat:.3,envMapIntensity:.24});
 robot.name='piano-robot';
 const robotHead=new T.Group();robotHead.name='robot-head';robotHead.position.set(0,.93,0);robot.add(robotHead);robot.userData.head=robotHead;
 const shell=block(1.18,1.18,.66,enamel,0,0,0,.022,robotHead);shell.name='robot-square-shell';shell.receiveShadow=false;
 for(const x of [-.28,.28]){
  for(const side of [-1,1]){const eye=block(.071,.235,.013,faceInk,x+side*.065,.24,.339,.004,robotHead);eye.rotation.z=side*.65;eye.castShadow=false;eye.name='robot-chevron-eye';}
 }
 for(const x of [-.65,.65]){
  const arm=new T.Group();arm.position.set(x,.67,.02);robot.add(arm);
  const upper=block(.165,1,.18,enamel,0,-.2,0,.012,arm);
  const fore=block(.15,1,.175,coralSide,0,-.5,.04,.012,arm);
  const joint=block(.17,.17,.18,coralSide,0,-.35,.08,.013,arm);
  const hand=block(.18,.11,.22,enamel,0,-.65,.1,.012,arm);
  arm.userData={upper,fore,joint,hand,side:Math.sign(x)};arms.push(arm);
 }
 robot.userData.legs=[];
 for(const [i,x] of [-.29,.29].entries()){
  const group=new T.Group();group.name='robot-leg-'+i;group.position.set(x,.39,.035);robot.add(group);
  const upper=block(.23,1,.245,enamel,0,-.08,0,.01,group);upper.name='robot-leg-upper-'+i;upper.scale.y=.16;
  const lower=block(.215,1,.235,coralSide,0,-.195,.02,.01,group);lower.name='robot-leg-lower-'+i;lower.scale.y=.13;
  const joint=block(.215,.08,.235,coralSide,0,-.16,.01,.009,group);joint.name='robot-knee-'+i;
  lower.visible=joint.visible=false;
  const foot=block(.245,.13,.34,enamel,x,-.015,.07,.012,robot);foot.name='robot-foot-'+i;foot.userData.contactHeight=.065;
  robot.userData.legs.push({group,upper,lower,joint,foot,hipX:x,hipZ:.035});
 }
 robot.position.set(-1.9,1.82,.63);scene.add(robot);
 // One continuous surface carries face, neck, shoulder, belly and haunch.
 // Its head bone deforms the shoulder smoothly when following the melody.
 const fur=new T.MeshPhysicalMaterial({color:'#181615',roughness:.67,clearcoat:0,envMapIntensity:.24});
 const noseMat=new T.MeshStandardMaterial({color:'#a27769',roughness:.75});
 cat.name='piano-cat';const sculpt=sculptCat(fur);cat.add(sculpt.mesh);const catHead=sculpt.head;cat.userData.head=catHead;
 for(const x of [-.17,.16]){const e=make(new T.ConeGeometry(.115,.27,3),fur,x,.245,.0,catHead);e.name='cat-ear';e.rotation.z=x<0?.16:-.16;e.rotation.y=Math.PI/4;const inner=make(new T.ConeGeometry(.064,.17,3),noseMat,x,.257,.047,catHead);inner.name='cat-inner-ear';inner.rotation.x=.14;}
 for(const [x,z] of [[-.16,.225],[-.01,.285]]){sphere(.042,.058,.018,new T.MeshPhysicalMaterial({color:'#d2b268',roughness:.19,clearcoat:.5}),x,.04,z,catHead).name='cat-eye';sphere(.011,.043,.007,glass,x,.042,z+.018,catHead).name='cat-pupil';sphere(.007,.009,.005,new T.MeshBasicMaterial({color:'#fff2cd'}),x-.01,.061,z+.025,catHead).name='cat-eye-glint';}
 sphere(.039,.028,.021,fur,-.052,-.085,.291,catHead).name='cat-muzzle-left';sphere(.039,.028,.021,fur,.028,-.085,.291,catHead).name='cat-muzzle-right';sphere(.023,.015,.013,noseMat,-.012,-.063,.315,catHead).name='cat-nose';
 for(const side of [-1,1])for(let i=0;i<3;i++)line([[-.012+side*.045,-.085,.31],[-.012+side*.14,-.093+(i-1)*.018,.33],[-.012+side*.23,-.09+(i-1)*.028,.35]],new T.MeshStandardMaterial({color:'#999187',roughness:.9}),.002,catHead).name='cat-whisker';
 cat.userData.legs=[];
 for(const x of [.39,-.43])for(const z of [-.08,.08]){
  const i=feet.length,group=new T.Group();group.name='cat-leg-'+i;group.position.set(x,x<0?.392:.304,z);cat.add(group);
  const upper=make(new T.CylinderGeometry(.062,.075,1,14),fur,0,-.095,0,group);upper.name='cat-leg-upper-'+i;upper.scale.y=.19;
  const lower=make(new T.CylinderGeometry(.047,.062,1,14),fur,0,-.255,0,group);lower.name='cat-leg-lower-'+i;lower.scale.y=.13;
  const joint=sphere(.072,.072,.072,fur,0,-.19,0,group);joint.name='cat-knee-'+i;
  upper.visible=lower.visible=joint.visible=false;const skin=createCatLegSkin(fur);group.add(skin);
  const foot=sphere(.10,.065,.125,fur,x,.06,z,cat);foot.name='cat-paw-'+i;foot.userData.contactHeight=.065;feet.push(foot);
  cat.userData.legs.push({group,upper,lower,joint,skin,foot,hipX:x,hipZ:z});
 }
 const tail=line([[.47,.34,-.03],[.74,.26,-.01],[.91,.21,.06],[.94,.42,.09]],fur,.062,cat);cat.position.set(1.4,1.79,.7);scene.add(cat);
 // A handful of real 3D dust motes catch the window light, with no fake background image.
 const positions=new Float32Array(95*3);let seed=91;for(let i=0;i<positions.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;positions[i]=(seed/4294967296-.5)*(i%3===1?5:14);if(i%3===1)positions[i]+=3.1;}
 const dustSprite=document.createElement('canvas');dustSprite.width=dustSprite.height=32;const dg=dustSprite.getContext('2d'),halo=dg.createRadialGradient(16,16,0,16,16,16);halo.addColorStop(0,'rgba(255,255,255,.6)');halo.addColorStop(1,'rgba(255,255,255,0)');dg.fillStyle=halo;dg.fillRect(0,0,32,32);
 const dust=new T.BufferGeometry();dust.setAttribute('position',new T.BufferAttribute(positions,3));scene.add(new T.Points(dust,new T.PointsMaterial({map:new T.CanvasTexture(dustSprite),color:'#edd6b2',size:.008,transparent:true,opacity:.16,depthWrite:false})));
 return {tail,updateScore,dispose(){surface.dispose();environment.dispose();}};
}
