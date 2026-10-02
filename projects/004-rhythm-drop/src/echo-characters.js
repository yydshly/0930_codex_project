import * as THREE from 'three';

export const identities={
  kong:{name:'空空',color:0xe7d8b7,feature:'真实空腔',voice:'柔和气声与钢琴颗粒'},
  zhe:{name:'折折',color:0xdca18b,feature:'开合折耳',voice:'纸片轻响与清脆短音'},
  dong:{name:'咚咚',color:0x789183,feature:'压缩风箱',voice:'温暖低音与软鼓点'},
  su:{name:'簌簌',color:0xdac273,feature:'细长风尾',voice:'轻风与高音'},
};

function clothTexture(){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#808080';ctx.fillRect(0,0,256,256);
  let seed=193;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  for(let i=0;i<11000;i++){const shade=105+Math.floor(random()*46);ctx.strokeStyle=`rgb(${shade},${shade},${shade})`;ctx.lineWidth=.35;const x=random()*256,y=random()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*2-1,y+1+random()*3);ctx.stroke();}
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,2);return texture;
}
function shape(points){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
function rounded(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}

export function createEchoCharacter(id,{textured=true}={}){
  if(!identities[id])throw new Error('Unknown echo character');
  const root=new THREE.Group();root.name=id;root.userData.identity=identities[id];
  const body=new THREE.Group();root.add(body);
  const bump=textured?clothTexture():null;
  const material=color=>new THREE.MeshStandardMaterial({color,roughness:.96,bumpMap:bump,bumpScale:.016});
  const main=material(identities[id].color),ivory=material(0xf0e4cc),sage=material(0x8d9d80),coral=material(0xd89982),thread=material(0xdac398),ink=new THREE.MeshStandardMaterial({color:0x3e342b,roughness:.35});
  const add=(geometry,mat,parent,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
  const ball=(parent,mat,x,y,z,r,sx=1,sy=1,sz=1)=>{const m=add(new THREE.SphereGeometry(r,24,16),mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m;};
  const extrude=(s,depth,mat,parent,bevel=.035)=>{const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:24,steps:1});g.translate(0,0,-depth/2);return add(g,mat,parent);};
  const slab=(parent,w,h,d,mat,x,y,z,r=.06)=>{const m=extrude(rounded(w,h,r),d,mat,parent,.018);m.position.set(x,y,z);return m;};
  const seam=(points,parent=body,colorMat=thread,r=.009)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(10,points.length*4),r,5,false),colorMat,parent);
  const stitches=(from,to,count,parent=body)=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to);for(let i=0;i<count;i++){const p=a.clone().lerp(b,i/(count-1));const m=add(new THREE.CapsuleGeometry(.009,.044,2,6),thread,parent,p.x,p.y,p.z);m.rotation.z=-.7;}};
  let torso,ears=[],fold,compress,tail,faceY,faceZ,armY,armX,feetX,footMat=main;

  if(id==='kong'){
    const outer=new THREE.Shape();outer.moveTo(-.62,.24);outer.quadraticCurveTo(-.78,.24,-.74,.52);outer.lineTo(-.65,1.44);outer.bezierCurveTo(-.64,1.93,-.22,2.15,.11,2.05);outer.bezierCurveTo(.52,2.03,.69,1.80,.71,1.40);outer.lineTo(.77,.47);outer.quadraticCurveTo(.79,.24,.59,.24);outer.closePath();
    const hole=new THREE.Path();hole.absellipse(.012,.965,.40,.61,0,Math.PI*2,true);outer.holes.push(hole);
    torso=extrude(outer,.40,main,body,.04);torso.name='hollow-arch';
    const long=new THREE.Group();long.name='listening-tab';long.position.set(.35,1.98,-.04);body.add(long);const longShape=new THREE.Shape();longShape.moveTo(-.06,0);longShape.bezierCurveTo(-.01,.18,.07,.36,.045,.57);longShape.quadraticCurveTo(.02,.71,-.08,.69);longShape.bezierCurveTo(-.23,.66,-.15,.37,-.13,.18);longShape.closePath();extrude(longShape,.052,sage,long,.018);stitches([-.07,.09,.05],[-.06,.60,.05],5,long);ears.push(long);
    const short=new THREE.Group();short.position.set(-.46,1.96,-.015);body.add(short);const shortShape=new THREE.Shape();shortShape.moveTo(-.08,0);shortShape.bezierCurveTo(-.18,.18,-.25,.38,-.08,.40);shortShape.bezierCurveTo(.05,.39,.16,.26,.13,.13);shortShape.lineTo(.045,.14);shortShape.quadraticCurveTo(.06,.28,-.045,.29);shortShape.quadraticCurveTo(-.13,.24,.0,.04);shortShape.closePath();extrude(shortShape,.065,coral,short,.016);ears.push(short);stitches([-.07,.04,.055],[-.10,.27,.055],3,short);
    const patch=slab(body,.23,.32,.024,sage,-.53,.53,.254,.03);patch.rotation.z=.17;stitches([-.61,.44,.29],[-.59,.63,.29],3);
    const backPatch=slab(body,.23,.32,.024,sage,-.53,.53,-.254,.03);backPatch.rotation.z=.17;stitches([-.61,.44,-.29],[-.59,.63,-.29],3);
    seam([[-.66,.35,.25],[-.65,.92,.25],[-.49,1.70,.25],[-.03,2.02,.25],[.54,1.72,.25],[.68,.96,.25],[.69,.35,.25]],body,ivory,.006);
    faceY=1.80;faceZ=.268;armY=1.18;armX=.70;feetX=.38;
  }else if(id==='zhe'){
    torso=extrude(shape([[0,.24],[-.64,1.10],[-.30,1.87],[.26,1.78],[.64,1.0]]),.32,main,body,.04);torso.name='folded-kite';
    const ridge=[0,1.02,.40],outline=[[0,.24,.19],[-.64,1.10,.19],[-.30,1.87,.19],[.26,1.78,.19],[.64,1,.19]];
    outline.forEach((a,i)=>{const b=outline[(i+1)%outline.length],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...b,...a,...ridge],3));g.computeVertexNormals();const facet=add(g,material([0xdca18b,0xe5b09a,0xd89480,0xe1a58e,0xcb907d][i]),body);facet.name='fold-facet-'+i;});
    fold=new THREE.Group();fold.position.set(-.50,1.40,-.035);body.add(fold);
    for(let i=0;i<6;i++){const a=(90+i*23)*Math.PI/180,b=a+23*Math.PI/180,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.04,Math.cos(a)*.80,Math.sin(a)*.80,i%2?.06:-.10,Math.cos(b)*.80,Math.sin(b)*.80,i%2?-.10:.06],3));g.computeVertexNormals();const mat=material(i%2?0xe4baa2:0xdba18a);mat.side=THREE.DoubleSide;add(g,mat,fold);seam([[0,0,.04],[Math.cos(a)*.80,Math.sin(a)*.80,.08]],fold,ivory,.006);}
    extrude(shape([[.38,1.50],[.75,1.78],[.61,1.25]]),.1,main,body,.025);
    seam([[0,.32,.27],[0,1.02,.416],[0,1.72,.23]],body,ivory,.008);
    faceY=1.30;faceZ=.365;armY=.90;armX=.58;feetX=.26;
  }else if(id==='dong'){
    torso=extrude(shape([[-.89,.31],[-.81,1.01],[-.56,1.59],[.52,1.59],[.84,1.03],[.92,.31]]),.55,main,body,.07);torso.name='bellows-shell';
    const facePlate=slab(body,1.15,.60,.035,ivory,0,1.27,.342,.15);
    compress=new THREE.Group();compress.position.y=.34;body.add(compress);
    for(let i=0;i<3;i++){slab(compress,1.58+i*.065,.19,.72,main,0,.13+i*.245,.05,.085);stitches([-.66,.13+i*.245,.437],[.68,.13+i*.245,.437],13,compress);}
    faceY=1.38;faceZ=.404;armY=.86;armX=.92;feetX=.53;
  }else{
    const pod=new THREE.Shape();pod.moveTo(-.05,.26);pod.bezierCurveTo(-.55,.54,-.46,1.53,-.24,1.95);pod.quadraticCurveTo(-.04,2.22,.17,1.92);pod.bezierCurveTo(.48,1.43,.47,.62,.09,.26);pod.closePath();torso=extrude(pod,.35,main,body,.045);torso.name='wind-pod';
    const petal=new THREE.Shape();petal.moveTo(-.08,1.90);petal.quadraticCurveTo(-.04,2.20,-.24,2.19);petal.quadraticCurveTo(-.57,2.17,-.61,1.96);petal.quadraticCurveTo(-.36,1.82,-.08,1.90);extrude(petal,.055,main,body,.025).position.z=.20;
    tail=new THREE.Group();tail.position.set(.02,1.96,-.12);body.add(tail);
    const windCurve=new THREE.CatmullRomCurve3([[0,0,0],[.38,.15,0],[.72,.45,0],[.73,.77,0],[.47,1.08,0],[.34,1.31,0],[.43,1.42,0]].map(p=>new THREE.Vector3(...p))),left=[],right=[];
    for(let i=0;i<=40;i++){const t=i/40,p=windCurve.getPoint(t),d=windCurve.getTangent(t),w=.077*(1-t*.55);left.push([p.x-d.y*w,p.y+d.x*w]);right.push([p.x+d.y*w,p.y-d.x*w]);}
    extrude(shape([...left,...right.reverse()]),.035,sage,tail,.014);
    stitches([.51,.32,.06],[.69,.62,.06],4,tail);seam([[.0,.39,.26],[.08,1.0,.235],[.0,1.78,.23]],body,thread,.008);
    faceY=1.46;faceZ=.246;armY=1.02;armX=.40;feetX=.16;
  }

  const face=new THREE.Group();face.position.set(0,faceY,faceZ);body.add(face);
  const eyes=new THREE.Group();face.add(eyes);const brows=[];
  for(const side of [-1,1]){ball(eyes,ink,side*.18,0,.015,.065,.78,1.3,.43);ball(eyes,ivory,side*.18-.014,.024,.045,.017);const brow=seam([[side*.18-.048,.135,.006],[side*.18,.156,.014],[side*.18+.044,.139,.006]],face,ink,.010);brows.push(brow);}
  const smile=seam([[-.055,-.13,.018],[0,-.157,.029],[.058,-.13,.018]],face,ink,.012);
  const frown=seam([[-.048,-.16,.018],[0,-.138,.029],[.048,-.16,.018]],face,ink,.011);frown.visible=false;
  const tight=seam([[-.058,-.147,.018],[0,-.145,.028],[.058,-.149,.018]],face,ink,.011);tight.visible=false;
  const mouth=ball(face,ink,0,-.13,.019,.05,1,.80,.26);mouth.name='voice-mouth';mouth.visible=false;
  const closedEyes=new THREE.Group();face.add(closedEyes);closedEyes.visible=false;
  for(const side of [-1,1])seam([[side*.18-.042,-.004,.019],[side*.18,-.02,.023],[side*.18+.042,-.004,.019]],closedEyes,ink,.011);
  const cheeks=[];for(const side of [-1,1])cheeks.push(ball(face,material(id==='zhe'?0xeab5a0:0xdab098),side*.28,-.09,.007,.055,1,.48,.13));
  const arms=[],feet=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*armX,armY,0);body.add(arm);const upper=add(new THREE.CapsuleGeometry(id==='dong'?.12:.085,.19,5,16),main,arm,0,-.14,.035);upper.rotation.z=side*.17;ball(arm,main,0,-.30,.065,id==='dong'?.14:.11,1,.95,.8);arms.push(arm);
    const foot=ball(root,footMat,side*feetX,.12,.08,id==='dong'?.25:.21,id==='su'?.75:1,.48,id==='su'?.80:1.03);feet.push(foot);
  }
  const waves=new THREE.Group();body.add(waves);waves.position.set(0,id==='kong'?.965:.8,0);
  for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(id==='kong'?.26:.35,.012,6,48),new THREE.MeshBasicMaterial({color:0xf4dc9b,transparent:true,opacity:0,depthWrite:false}));ring.position.z=(i-1)*.22;waves.add(ring);}
  let lastState={};
  function animate(time,state={}){
    const p=Math.min(1,Math.max(0,state.pulse??0)),waiting=state.mode==='waiting',listening=state.mode==='listening',replying=state.mode==='replying';lastState=state;
    const emotion=state.emotion??(state.worried?'embarrassed':listening?'attentive':replying?'glad':'curious'),look=state.look??(listening?-.6:0),gesture=state.gesture??(listening?'listen':replying?'offer':'rest');
    const breath=Math.sin(time*1.65)*.005*(state.breath??1),squash=state.squash??p*.05,stride=state.walkCycle??time*10;
    body.scale.set(1+squash*.65,1-squash+breath,1);body.rotation.z=(state.lean??(listening?-.045:0))+(state.walking?Math.sin(stride)*.025:0);body.rotation.x=emotion==='embarrassed'?.035:0;
    face.rotation.y=look*(emotion==='defensive'?.22:.10);eyes.position.x=look*.037;eyes.position.y=['embarrassed','hurt','guarded','shy'].includes(emotion)?-.022:emotion==='surprised'?.015:0;
    const blink=(time+(id==='zhe'?1.3:0))%4.7,settled=emotion==='calm';
    eyes.visible=!settled;closedEyes.visible=settled;eyes.scale.y=blink>4.50&&blink<4.66?.10:emotion==='glad'?.82:emotion==='surprised'?1.20:1;
    const uncertain=['uncertain','vulnerable','flustered','guarded'].includes(emotion),singing=replying&&p>.13;
    smile.visible=!['embarrassed','surprised','hurt','defensive','guarded','flustered'].includes(emotion)&&(!uncertain||(state.confidence??.35)>.55)&&!singing;
    frown.visible=['embarrassed','hurt'].includes(emotion)&&!singing;tight.visible=(emotion==='defensive'||uncertain&&!smile.visible)&&!singing;mouth.visible=emotion==='surprised'||singing;
    smile.scale.set(emotion==='glad'?1.50:emotion==='calm'?.8:1,emotion==='attentive'?.6:1,1);mouth.scale.set(emotion==='surprised'?.80:1,.65+p*.75,.26);
    brows.forEach((b,i)=>{const side=i===0?-1:1;b.rotation.z=['embarrassed','hurt','vulnerable'].includes(emotion)?side*-.19:emotion==='defensive'?(i===0?-.08:.13):uncertain?(i===0?-.15:.04):['hopeful','relieved','shy'].includes(emotion)?side*.10:emotion==='attentive'?side*.08:0;b.position.y=emotion==='surprised'?.052:emotion==='glad'?.012:0;});
    cheeks.forEach(c=>c.visible=['embarrassed','glad','hopeful','shy','relieved'].includes(emotion));
    arms.forEach((arm,i)=>{
      const side=i===0?-1:1,raise=gesture==='offer'?.68+p*.24:gesture==='welcome'?.42:gesture==='wave'?.65:gesture==='half-wave'?(i===1?.36:.08):gesture==='pull-back'?.32:gesture==='tuck'?.22:.08;
      arm.rotation.z=side*raise;arm.rotation.x=state.walking?Math.sin(stride+i*Math.PI)*.32:['tuck','pull-back'].includes(gesture)?-.55:gesture==='offer'?-.25:0;
      if(gesture==='wave'&&i===1)arm.rotation.z=.85+(state.reducedMotion?0:Math.sin(time*3.8)*.12);
      if(gesture==='settle'){arm.rotation.z=side*.25;arm.rotation.x=-.35;}
    });
    if(gesture==='listen'){arms[1].rotation.z=.95;arms[1].rotation.x=-.40;arms[0].rotation.z=-.16;}
    feet.forEach((foot,i)=>{const step=state.walking?Math.sin(stride+i*Math.PI):0;foot.rotation.x=step*.22;foot.position.y=.12+Math.max(0,step)*.085;foot.position.z=.08+step*.10;});
    ears.forEach((ear,i)=>{ear.rotation.x=i===0&&state.earsAim!==undefined?-.35:0;ear.rotation.z=i===0&&state.earsAim!==undefined?state.earsAim:(i===0?1:-1)*(listening?.15:['embarrassed','hurt','guarded'].includes(emotion)?-.20:emotion==='surprised'?.18:emotion==='calm'?-.035:Math.sin(time*1.5+i)*.018+p*.08);});
    if(fold){const openness=state.foldOpen??(listening?1:waiting?.42:.65+p*.35);fold.scale.set(openness,1,1);fold.rotation.z=listening?-.06:Math.sin(time)*.035;}
    if(compress)compress.scale.y=1-p*.18;
    if(tail)tail.rotation.z=(waiting||state.reducedMotion?0:Math.sin(time*2.4)*.09)+p*.14;
    waves.children.forEach((ring,i)=>{const u=((state.noteAge??(1-p)*.6)-i*.09)/.58,v=Math.min(1,Math.max(0,u));ring.visible=!state.reducedMotion&&p>.01&&u>=0&&u<1;ring.material.opacity=(1-v)*.4;ring.scale.setScalar(.70+v*.60);ring.position.z=.24+v*.8;});
  }
  return {id,root,body,torso,face,arms,feet,fold,compress,tail,ears,waves,animate,get state(){return lastState;},dispose(){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.bumpMap)textures.add(m.bumpMap);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
