import {THREE,modelsAt,fitModel,surface3D,projectPoint,instanceStatics} from './showcase-3d-kit.js';
import {action,safeSaved,clamp} from './showcase-core.js';

const STATIONS={bay:{name:'海湾站',color:0xc7a65e,z:2.7},forest:{name:'山林站',color:0x5ba195,z:-2.7}},SPEED=1.8;
export const SIGNAL_TIMETABLE=[{id:'W01',entry:'west',target:'bay',kind:'city',spawn:0},{id:'N02',entry:'north',target:'forest',kind:'freight',spawn:0},{id:'W03',entry:'west',target:'forest',kind:'steam',spawn:9},{id:'N04',entry:'north',target:'bay',kind:'city',spawn:9},{id:'W05',entry:'west',target:'bay',kind:'freight',spawn:18},{id:'N06',entry:'north',target:'forest',kind:'steam',spawn:18}];
const fresh=()=>({version:1,elapsed:0,phase:'dispatch',won:false,score:0,signals:{west:false,north:false},switch:'bay',delivered:[],failure:null,trains:SIGNAL_TIMETABLE.map((t,i)=>({...t,status:i<2?'approach':'pending',distance:0,route:null,blocked:false})),switchChanges:0,signalChanges:0,denied:0,replays:0});
function sampled(points){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],.09,p[1])),false,'centripetal'),v=curve.getPoints(Math.max(80,points.length*24)),distance=[0];for(let i=1;i<v.length;i++)distance.push(distance.at(-1)+v[i].distanceTo(v[i-1]));return {points:v,distance,length:distance.at(-1)}}
const APPROACH={west:sampled([[-8.6,0],[-3.5,0],[1,0]]),north:sampled([[-2,-7],[-2,-3.5],[-2,-1.45],[-1.86,-.48],[-1.08,-.05],[1,0]])},BRANCHES={bay:sampled([[1,0],[2.05,.03],[2.7,.47],[3.35,1.92],[4.1,2.68],[7.7,2.7]]),forest:sampled([[1,0],[2.05,-.03],[2.7,-.47],[3.35,-1.92],[4.1,-2.68],[7.7,-2.7]])};
// Both stop lines have the same remaining distance to the merge. Releasing
// both entries at once can therefore create a real overlap, not merely a
// conflicting authorization counter disconnected from train positions.
const STOPS={west:5.1,north:APPROACH.north.length-(APPROACH.west.length-5.1)};
function at(path,d){const points=path.points,dist=path.distance;if(d<=0){const direction=points[1].clone().sub(points[0]).normalize();return {p:points[0].clone().addScaledVector(direction,d),direction}}let i=1;while(i<dist.length-1&&dist[i]<d)i++;const fraction=clamp((d-dist[i-1])/(dist[i]-dist[i-1]),0,1),direction=points[i].clone().sub(points[i-1]).normalize();return {p:points[i-1].clone().lerp(points[i],fraction),direction}}
function trainAt(t,d=t.distance){const approach=APPROACH[t.entry];if(d<=approach.length||!t.route)return at(approach,d);return at(BRANCHES[t.route],d-approach.length)}
const isLive=t=>t.status!=='pending'&&t.status!=='arrived',inBlock=t=>isLive(t)&&!!t.route&&trainAt(t).p.x<4.85;

// Render changes are isolated from the original six-train simulation. All
// route samples, distances, stop lines and train safety rules stay unchanged.
export async function createSignal({host,input,saved,notify,sfx}){
 const [art,town,industrial,commercial,suburban,roads,cars]=await Promise.all([
  modelsAt('assets/game-forms/signal/',['railroad-straight','train-diesel-a','train-electric-city-a','train-electric-city-b','train-locomotive-a','train-locomotive-passenger-a','train-carriage-container-red']),
  modelsAt('assets/game-forms/district/',['tree-large','tree-small']),
  modelsAt('assets/game-forms/signal-polished/industrial/',['building-t','building-p','shipping-container-a','shipping-container-b','detail-tank']),
  modelsAt('assets/game-forms/signal-polished/commercial/',['detail-awning-wide']),
  modelsAt('assets/game-forms/signal-polished/suburban/',['fence-1x4','planter']),
  modelsAt('assets/game-forms/signal-polished/roads/',['light-curved','construction-fence','construction-cone','dumpster','road-straight']),
  modelsAt('assets/game-forms/signal-polished/cars/',['delivery'])
 ]);
 const world=surface3D(host,{background:'#b8c9c6',fov:29,far:100,shadows:true}),{scene,camera,element,renderer}=world;
 renderer.toneMappingExposure=.97;
 let s=safeSaved(saved,fresh()),active=false;
 if(!Array.isArray(s.trains)||s.trains.length!==6)s=fresh();
 element.setAttribute('aria-label','岔口信号精修版，三维微缩铁路。西线、北线信号决定列车停行，道岔选择海湾站或山林站；共享区段有车时道岔锁定。');
 const library=new THREE.Group();library.visible=false;
 for(const pack of [art,town,industrial,commercial,suburban,roads,cars])for(const gltf of Object.values(pack))library.add(gltf.scene);
 scene.add(library);
 scene.add(new THREE.HemisphereLight(0xd9ece5,0x747059,2.05));
 const sun=new THREE.DirectionalLight(0xffe5c3,2.45);sun.position.set(-11,19,12);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
 Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:.1,far:50});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.shadow.radius=4;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xd4e7ee,.38);fill.position.set(10,7,-12);scene.add(fill);
 scene.fog=new THREE.Fog('#b8c9c6',42,75);
 const mat=(color,roughness=1,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
 const materials={land:mat(0x9fac83),edge:mat(0xbaa98d),earth:mat(0x7e806c),gravel:mat(0x8a9184),platform:mat(0xd2ceba,.9),curb:mat(0xeee9d6),post:mat(0x384c4a,.48,{metalness:.5}),water:mat(0x5a9193,.26,{metalness:.18}),road:mat(0x727f79),wood:mat(0x978062),white:mat(0xe8e3d2),gold:mat(STATIONS.bay.color),teal:mat(STATIONS.forest.color)};
 function add(o){o.castShadow=o.receiveShadow=true;scene.add(o);return o}
 function box(size,p,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...p);return add(o)}
 function roundedSlab(w,d,r,y,height,material,cx=0,cz=0){const shape=new THREE.Shape(),x=-w/2,z=-d/2;shape.moveTo(x+r,z);shape.lineTo(x+w-r,z);shape.quadraticCurveTo(x+w,z,x+w,z+r);shape.lineTo(x+w,z+d-r);shape.quadraticCurveTo(x+w,z+d,x+w-r,z+d);shape.lineTo(x+r,z+d);shape.quadraticCurveTo(x,z+d,x,z+d-r);shape.lineTo(x,z+r);shape.quadraticCurveTo(x,z,x+r,z);const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.06,bevelThickness:.045,curveSegments:12}),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(cx,y,cz);return add(mesh)}
 // The cutaway edge gives the railway a physical miniature scale; the
 // waterfront, town and forest occupy distinct levels around its trackbed.
 roundedSlab(20.1,16.2,.9,-1.04,.66,materials.edge,-.2,-.85);
 roundedSlab(20,13.5,.7,-.42,.21,materials.land,-.2,-2.2);
 roundedSlab(20,3.4,.6,-.36,.06,materials.water,-.2,6.04);
 roundedSlab(24,20,1.1,-1.34,.15,mat(0xa9bcb3),-.2,-.2);
 box([20,.16,.24],[-.2,-.26,4.67],materials.edge);
 // Small deterministic gravel marks provide texture at normal viewing size
 // while the rails, sleepers, rolling stock and buildings remain authored GLB.
 const gravelCanvas=document.createElement('canvas');gravelCanvas.width=gravelCanvas.height=128;
 const gc=gravelCanvas.getContext('2d');gc.fillStyle='#939687';gc.fillRect(0,0,128,128);let seed=741;
 for(let i=0;i<1550;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%128;seed=(seed*1664525+1013904223)>>>0;const y=seed%128;gc.fillStyle=['#aeb1a3','#777e75','#b8bbaf','#858c7c'][i%4];gc.fillRect(x,y,i%3+1,1+i%2)}
 const gravelMap=new THREE.CanvasTexture(gravelCanvas);gravelMap.wrapS=gravelMap.wrapT=THREE.RepeatWrapping;gravelMap.colorSpace=THREE.SRGBColorSpace;
 materials.gravel.map=gravelMap;
 function ribbon(path,width,y,material,start=0){const positions=[],uv=[],indices=[],n=Math.ceil((path.length-start)/.17);for(let i=0;i<=n;i++){const d=start+(path.length-start)*i/n,{p,direction}=at(path,d),normal=new THREE.Vector3(direction.z,0,-direction.x);for(const side of [-1,1]){positions.push(p.x+normal.x*width*.5*side,y,p.z+normal.z*width*.5*side);uv.push(side===-1?0:1,d*1.5)}}for(let i=0;i<n;i++){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;scene.add(mesh);return mesh}
 for(const path of [APPROACH.west,APPROACH.north,BRANCHES.bay,BRANCHES.forest]){ribbon(path,1.38,-.09,materials.earth);ribbon(path,1.17,-.02,materials.gravel)}
 // Warp the original rail/sleeper mesh onto the exact arc-length route. Long
 // rail faces are subdivided before bending, avoiding chord shortcuts on bends.
 const trackOriginal=art['railroad-straight'].scene;trackOriginal.updateMatrixWorld(true);
 const trackBounds=new THREE.Box3().setFromObject(trackOriginal),trackSize=trackBounds.getSize(new THREE.Vector3()),trackCenter=trackBounds.getCenter(new THREE.Vector3());
 function bendTrack(path,start,length){trackOriginal.traverse(source=>{if(!source.isMesh)return;const original=source.geometry.index?source.geometry.toNonIndexed():source.geometry.clone(),pos=original.getAttribute('position'),texture=original.getAttribute('uv'),positions=[],uv=[];
   function vertex(i){return {p:new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(source.matrixWorld),u:texture?new THREE.Vector2().fromBufferAttribute(texture,i):new THREE.Vector2()}}
   function midpoint(a,b){return {p:a.p.clone().lerp(b.p,.5),u:a.u.clone().lerp(b.u,.5)}}
   function output(v){const along=(v.p.z-trackBounds.min.z)/(trackSize.z||1),{p,direction}=at(path,start+along*length),cross=(v.p.x-trackCenter.x)*.82/(trackSize.x||1);positions.push(p.x+direction.z*cross,.025+(v.p.y-trackBounds.min.y)*.085/(trackSize.y||1),p.z-direction.x*cross);uv.push(v.u.x,v.u.y)}
   function triangle(a,b,c,depth=0){const spans=[Math.abs(a.p.z-b.p.z),Math.abs(b.p.z-c.p.z),Math.abs(c.p.z-a.p.z)],max=Math.max(...spans);if(max*length/(trackSize.z||1)>.24&&depth<6){if(spans[0]===max){const mid=midpoint(a,b);triangle(a,mid,c,depth+1);triangle(mid,b,c,depth+1)}else if(spans[1]===max){const mid=midpoint(b,c);triangle(a,b,mid,depth+1);triangle(a,mid,c,depth+1)}else{const mid=midpoint(c,a);triangle(a,b,mid,depth+1);triangle(mid,b,c,depth+1)}}else{output(a);output(b);output(c)}}
   for(let i=0;i<pos.count;i+=3)triangle(vertex(i),vertex(i+1),vertex(i+2));original.dispose();const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,source.material);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
  })}
 function distanceAtX(path,x){let d=0;while(d<path.length&&at(path,d).p.x<x)d+=.035;return Math.min(d,path.length)}
 function track(path,start=0,end=path.length){const tile=3.25;for(let d=start;d<end;d+=tile)bendTrack(path,d,Math.min(tile,end-d))}
 track(APPROACH.west);
 track(APPROACH.north,0,distanceAtX(APPROACH.north,-.95));
 track(BRANCHES.bay);
 track(BRANCHES.forest,distanceAtX(BRANCHES.forest,1.75));
 const staticModels=[];
 function authored(gltf,size,pos,axis='x',rotation=0){const o=fitModel(gltf,size,axis),bounds=new THREE.Box3().setFromObject(o);o.userData.floorOffset=-bounds.min.y;o.position.set(pos[0],pos[1]+o.userData.floorOffset,pos[2]);o.rotation.y=rotation;scene.add(o);staticModels.push(o);return o}
 const stationObjects={},signs=[];
 function sign(text,detail,color,width,pos,rotation=0){const c=document.createElement('canvas');c.width=512;c.height=160;const g=c.getContext('2d');g.fillStyle='#e7e5d7';g.fillRect(0,0,512,160);g.fillStyle=color;g.fillRect(0,0,16,160);g.font='bold 54px "Microsoft YaHei",sans-serif';g.fillStyle='#334942';g.fillText(text,36,75);g.font='24px sans-serif';g.fillStyle='#7d897c';g.fillText(detail,38,121);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshStandardMaterial({map:tex,roughness:.9,side:THREE.DoubleSide});const o=new THREE.Mesh(new THREE.PlaneGeometry(width,width*160/512),material);o.position.set(...pos);o.rotation.y=rotation;add(o);signs.push(o);return o}
 for(const [key,v] of Object.entries(STATIONS)){const side=key==='bay'?1:-1,pc=v.z+side*1.03,color=key==='bay'?materials.gold:materials.teal;
  roundedSlab(4.55,1.27,.12,.02,.17,materials.platform,6.0,pc);
  box([4.55,.025,.10],[6,.24,v.z+side*.425],color);
  for(let x=4.15;x<8.1;x+=.34)box([.15,.014,.10],[x,.245,v.z+side*.55],materials.white);
  roundedSlab(2.15,1.85,.1,-.33,.15,materials.platform,7.85,v.z+side*2.03);
  const building=authored(industrial['building-t'],1.8,[7.85,-.18,v.z+side*2.03],'x',side===1?Math.PI:0);
  for(const x of [4.75,5.92]){const canopy=authored(commercial['detail-awning-wide'],1.08,[x,1.0,pc+side*.17],'x',side===1?Math.PI:0);canopy.scale.z*=3.25;box([.035,.84,.035],[x-.43,.61,pc+side*.29],materials.post);box([.035,.84,.035],[x+.43,.61,pc+side*.29],materials.post)}
  for(const x of [4.2,6.8]){authored(roads['light-curved'],1.38,[x,.19,pc+side*.3],'y',side===1?Math.PI:0);authored(suburban.planter,.32,[x+.25,.2,pc+side*.34],'x')}
  sign(v.name,key==='bay'?'01 / BAY LINE':'02 / FOREST LINE',key==='bay'?'#b69a56':'#518d81',1.52,[6.42,.77,pc+side*.32],side===1?0:Math.PI/8);
  stationObjects[key]={building};
 }
 // Town-side service yard: warehouse, stacked authored containers, delivery
 // vehicle, fencing and a road outside the running railway envelope.
 roundedSlab(6.3,2.45,.14,-.19,.04,materials.road,-5.85,2.83);
 const shed=authored(industrial['building-p'],2.55,[-5.9,-.13,3.36],'x',Math.PI);
 authored(industrial['detail-tank'],.62,[-7.42,-.13,3.3],'x',Math.PI/2);
 for(const [name,x,z,level] of [['shipping-container-a',-3.6,3.0,0],['shipping-container-b',-3.6,3.02,.5],['shipping-container-b',-3.65,3.82,0]])authored(industrial[name],1.6,[x,-.13+level,z],'z',Math.PI/2);
 authored(cars.delivery,1.18,[-7.85,-.14,2.24],'z',Math.PI/2);
 for(const x of [-8.15,-6.55,-4.95])authored(suburban['fence-1x4'],1.65,[x,-.15,1.36],'x');
 for(const x of [-8.0,-5.2,-2.8])authored(roads['light-curved'],1.38,[x,-.14,3.93],'y',Math.PI);
 authored(roads.dumpster,.38,[-4.28,-.14,2.01],'z');
 for(const p of [[-7.0,1.75],[-6.55,1.76],[-2.96,2.1]])authored(roads['construction-cone'],.16,[p[0],-.14,p[1]],'y');
 // An independent lane and signal cabin make the two railway approaches read
 // as entrances to a small operating site instead of lines on an empty plane.
 for(let z=-6.7;z<-.9;z+=1.14)authored(roads['road-straight'],1.14,[-4.07,-.18,z],'x');
 authored(industrial['building-t'],1.24,[-5.55,-.18,-2.27],'x',Math.PI/2);
 authored(roads['light-curved'],1.35,[-4.7,-.13,-3.36],'y',Math.PI/2);
 authored(roads['construction-fence'],.75,[-3.12,-.13,-1.13],'z',Math.PI/2);
 // Forest masses are grouped at different depths and scales; gaps preserve
 // sightlines to signals, the common block and the station platform.
 const trees=[[-8.55,-5.95,1.6],[-7.64,-5.68,1.17],[-8.66,-4.42,1.34],[-6.77,-6.14,1.42],[-5.73,-6.76,1.12],[-.26,-6.69,1.35],[1.19,-6.8,1.61],[2.18,-6.17,1.27],[3.4,-6.46,1.56],[4.6,-6.34,1.03],[5.48,-6.02,1.42],[7.25,-6.19,1.55],[8.36,-5.55,1.26],[.48,-4.8,.91],[1.17,-4.28,.72],[8.57,-4.08,.94],[-8.46,4.03,.97],[-1.32,3.1,.91],[-.58,3.48,.67],[.44,3.76,.89],[1.1,4.21,.72],[2.02,4.18,.63]];
 trees.forEach(([x,z,size],i)=>authored(town[i%4===1?'tree-small':'tree-large'],size,[x,-.17,z],'y',i*.76));
 for(const [x,z,size] of [[-7.86,-6.25,1.5],[-.1,-7.35,1.95],[3.8,-7.25,2.4],[7.4,-7.01,1.9]]){const hill=new THREE.Mesh(new THREE.SphereGeometry(size,16,10),mat(0x98a57d));hill.scale.set(1,.22,.71);hill.position.set(x,-.14,z);hill.receiveShadow=true;scene.add(hill)}
 // Waterfront foreground: quay, timber landing and warm marker lamps.
 box([3.25,.12,.49],[4.35,-.23,5.37],materials.wood);for(const x of [2.96,4.2,5.45])box([.08,.49,.08],[x,-.49,5.37],materials.post);
 for(let i=0;i<18;i++)box([.08,.025,.51],[2.81+i*.176,-.15,5.37],materials.edge);
 for(const x of [-7.7,-5.6,-.6,1.6,8.4])authored(suburban['fence-1x4'],1.62,[x,-.12,4.37],'x');
 const ripples=[];for(let i=0;i<8;i++){const o=new THREE.Mesh(new THREE.PlaneGeometry(.45+i%3*.2,.022),new THREE.MeshBasicMaterial({color:0xb3ccbf,transparent:true,opacity:.35}));o.rotation.x=-Math.PI/2;o.position.set(-7.6+i*2.05,-.293,5.95+(i%2)*.62);scene.add(o);ripples.push(o)}
 const northStop=at(APPROACH.north,STOPS.north).p,signalObjects={};
 for(const [entry,p] of Object.entries({west:[-3.5,0,.72],north:[northStop.x-.75,0,northStop.z]})){
  box([.14,1.5,.14],[p[0],.63,p[2]],materials.post);box([.40,.06,.35],[p[0],-.06,p[2]],materials.platform);
  const housing=box([.32,.64,.22],[p[0],1.51,p[2]],materials.post),lamps=[];
  for(const [j,color] of [[0,0xff765e],[1,0x73e4ba]]){const light=new THREE.Mesh(new THREE.SphereGeometry(.095,16,12),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.2,roughness:.3}));light.position.set(p[0],1.66-j*.3,p[2]+.145);scene.add(light);lamps.push(light)}
  signalObjects[entry]={p:{x:p[0],y:1.8,z:p[2]},lamps,housing};
 }
 const switchMark=new THREE.Group();switchMark.position.set(1.55,.1,0);
 const switchRing=new THREE.Mesh(new THREE.TorusGeometry(.47,.025,8,48),new THREE.MeshBasicMaterial({color:0xe5cc8d}));switchRing.rotation.x=-Math.PI/2;switchMark.add(switchRing);
 const needle=new THREE.Mesh(new THREE.BoxGeometry(.065,.025,.74),materials.gold);needle.position.set(0,.035,0);switchMark.add(needle);scene.add(switchMark);
 const routeMarkers={};for(const [key,path] of Object.entries(BRANCHES)){const positions=[];for(let d=2.25;d<path.length-.12;d+=.13){const {p,direction}=at(path,d);positions.push(p.x+direction.z*.56,.07,p.z-direction.x*.56)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const o=new THREE.Line(g,new THREE.LineBasicMaterial({color:STATIONS[key].color,transparent:true,opacity:.82}));scene.add(o);routeMarkers[key]=o}
 instanceStatics(scene,staticModels);
 const trainObjects=s.trains.map(t=>{const names=t.kind==='city'?['train-electric-city-a','train-electric-city-b']:t.kind==='freight'?['train-diesel-a','train-carriage-container-red']:['train-locomotive-a','train-locomotive-passenger-a'];return names.map(n=>authored(art[n],1.4,[0,.14,0],'z'))});
 const smoke=s.trains.map(t=>{if(t.kind!=='steam')return null;return Array.from({length:5},()=>{const o=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,1),new THREE.MeshBasicMaterial({color:0xe5e5db,transparent:true,opacity:.24,depthWrite:false}));scene.add(o);return o})});
 const overlay=document.createElement('div');overlay.className='signal-polish-hud';overlay.innerHTML='<div class="sp-brand"><small>JUNCTION 06</small><b>岔口信号</b></div><div class="sp-progress"><span>正确到站</span><b></b><small></small></div><div class="sp-block"><i></i><b></b><span></span><em></em></div><div class="sp-result" hidden><small></small><b></b><span></span></div>';host.append(overlay);
 const style=document.createElement('style');style.textContent=`.signal-polish-hud{position:absolute;inset:0;pointer-events:none;color:#304740;font-family:"Microsoft YaHei",sans-serif}.sp-brand{position:absolute;left:2.3%;top:3.4%;display:flex;align-items:center;gap:10px;padding:8px 12px;background:#edf0e4d9;border:1px solid #ffffff73;border-radius:7px;box-shadow:0 3px 12px #34483c13}.sp-brand small{font:8px sans-serif;letter-spacing:1.4px;color:#6c7f70}.sp-brand b{font-size:15px;letter-spacing:2px}.sp-progress{position:absolute;right:2.3%;top:3.4%;padding:8px 12px;background:#f0f0e7db;border:1px solid #ffffff73;border-radius:7px;display:flex;align-items:center;gap:11px}.sp-progress span{font-size:9px;color:#6d7b69}.sp-progress b{font-size:18px}.sp-progress small{font-size:9px;color:#7d8b7c}.sp-block{position:absolute;left:2.3%;right:auto;max-width:48%;bottom:2.3%;padding:9px 12px;border:1px solid #ffffff80;background:#edf0e4dc;border-radius:7px;display:flex;align-items:center;gap:8px;box-shadow:0 3px 12px #34483c13;line-height:1.3}.sp-block i{width:6px;height:6px;border-radius:50%;flex-shrink:0}.sp-block b{font-size:10px;font-weight:600}.sp-block span{display:none;font-size:9px;color:#788571}.sp-block em{font-size:9px;font-style:normal;margin-left:7px;color:#75826f;white-space:nowrap}.sp-label{position:absolute;transform:translate(-50%,-100%);font-size:10px;white-space:nowrap;color:#3c4e42;background:#eeeee0d6;padding:3px 6px;border-radius:4px;box-shadow:0 2px 7px #31433714}.sp-label[data-control=bay],.sp-label[data-control=forest]{font-size:10px;font-weight:600;padding:4px 7px;border-bottom:2px solid var(--route)}.sp-train{position:absolute;transform:translate(-50%,-100%);font-size:9px;font-weight:500;white-space:nowrap;padding:4px 6px;color:#394f43;background:#f5f2e4e8;border:1px solid #fff9;border-left:3px solid var(--route);border-radius:4px;box-shadow:0 2px 8px #1d393026}.sp-result{position:absolute;left:29%;right:29%;top:35%;padding:22px;background:#f4f2e7f2;border:1px solid #fff9;border-radius:12px;display:grid;gap:10px;text-align:center;box-shadow:0 15px 45px #29444733}.sp-result[hidden]{display:none}.sp-result small{font-size:10px;letter-spacing:2px;color:#6d9480}.sp-result b{font-size:20px}.sp-result span{font-size:12px;line-height:1.7}@media(max-width:600px){.sp-brand{top:3%;padding:5px 7px;gap:6px}.sp-brand small{font-size:6px;letter-spacing:.5px}.sp-brand b{font-size:10px;letter-spacing:1px}.sp-progress{top:3%;padding:5px 7px;gap:6px}.sp-progress span{font-size:7px}.sp-progress b{font-size:12px}.sp-progress small{display:none}.sp-block{padding:6px 8px;gap:5px;bottom:2%;max-width:48%}.sp-block b{font-size:8px}.sp-block span{display:none}.sp-block em{display:none;font-size:7px}.sp-label{font-size:7px;padding:2px 3px}.sp-label[data-control=bay],.sp-label[data-control=forest]{font-size:8px;padding:3px 4px}.sp-label[data-control=west],.sp-label[data-control=north],.sp-label[data-control=switch]{display:none}.sp-train{font-size:7px;padding:3px 4px}.sp-result{left:12%;right:12%;top:32%;padding:15px}.sp-result b{font-size:15px}.sp-result span{font-size:10px}}`;host.append(style);
 const labels={};for(const [key,label,p] of [['bay','海湾 · 金线',{x:6.5,y:1.06,z:3.67}],['forest','山林 · 青线',{x:6.5,y:1.06,z:-3.67}],['west','西线',signalObjects.west.p],['north','北线',signalObjects.north.p],['switch','道岔',{x:1.55,y:.45,z:0}]]){const node=document.createElement('span');node.className='sp-label';node.dataset.control=key;node.textContent=label;node.style.setProperty('--route',key==='bay'?'#b79a56':'#518d81');overlay.append(node);labels[key]={node,p}}
 const trainLabels=s.trains.map(()=>{const node=document.createElement('span');node.className='sp-train';overlay.append(node);return node});


 function block(){return s.trains.filter(inBlock)}
 function fail(kind,detail){s.phase='failed';s.failure={kind,...detail,at:s.elapsed};sfx('hurt');notify(kind==='collision'?'共享区段发生相撞。两条入口需要轮流放行。':'列车到达了错误车站。放行前请按它的目的地设置道岔。')}
 function signal(entry){if(!active||s.phase!=='dispatch')return;s.signals[entry]=!s.signals[entry];s.signalChanges++;sfx('door');notify((entry==='west'?'西线':'北线')+'信号已设为'+(s.signals[entry]?'绿灯，列车会越过停车线。':'红灯，下一班车停在停车线。'));sync()}
 function changeSwitch(){if(!active||s.phase!=='dispatch')return;if(block().length){s.denied++;notify('道岔已锁定：列车尾部离开共享区段后才能改线。');return}s.switch=s.switch==='bay'?'forest':'bay';s.switchChanges++;sfx('turn');notify('道岔指向'+STATIONS[s.switch].name+'。通过入口信号的下一班车将沿这条实际轨道行驶。');sync()}
 function restart(){if(!active)return;const count=s.replays+1;s=fresh();s.replays=count;notify('新一轮调度开始。先检查车次目的地，再设道岔，最后放行一条入口。');sync()}
 function tick(dt){if(!active||s.phase!=='dispatch')return;s.elapsed+=dt;if(input.pressed.has('KeyE'))changeSwitch();for(const q of input.pointers){const controls=[['west',signalObjects.west.p],['north',signalObjects.north.p],['switch',{x:1.55,y:.15,z:0}]],hit=controls.map(([key,p])=>({key,screen:projectPoint(camera,p)})).find(o=>Math.hypot(o.screen.x-q.x,o.screen.y-q.y)<35);if(hit)hit.key==='switch'?changeSwitch():signal(hit.key)}
  for(const t of s.trains){if(t.status==='pending'){const preceding=s.trains.find(o=>o.entry===t.entry&&o.id!==t.id&&isLive(o));if(s.elapsed>=t.spawn&&!preceding){t.status='approach';t.distance=0}}if(!isLive(t))continue;const stop=STOPS[t.entry];if(!t.route&&t.distance>=stop-.0001){if(!s.signals[t.entry]){t.distance=stop;t.status='waiting';t.blocked=true;continue}t.route=s.switch;t.status='running';t.blocked=false;sfx('engine',20)}let distance=t.distance+SPEED*dt;if(!t.route&&distance>=stop){if(s.signals[t.entry]){t.route=s.switch;t.status='running';t.blocked=false}else{distance=stop;t.status='waiting';t.blocked=true}}t.distance=distance;
   if(t.route&&t.distance>=APPROACH[t.entry].length+BRANCHES[t.route].length){t.distance=APPROACH[t.entry].length+BRANCHES[t.route].length;if(t.route!==t.target){t.status='misrouted';fail('wrong-station',{train:t.id,expected:t.target,arrived:t.route});break}t.status='arrived';s.delivered.push(t.id);s.score+=300;sfx('pickup');notify(t.id+' 已实际抵达'+STATIONS[t.target].name+'。正确到站 '+s.delivered.length+'/6。')}
  }
  if(s.phase==='dispatch'){const live=s.trains.filter(isLive);for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){const a=live[i],b=live[j];if(!a.route||!b.route)continue;let min=Infinity;for(const da of [0,-1.48])for(const db of [0,-1.48])min=Math.min(min,trainAt(a,a.distance+da).p.distanceTo(trainAt(b,b.distance+db).p));if(min<.7){fail('collision',{trains:[a.id,b.id],separation:min});break}}}
  if(s.phase==='dispatch'&&s.delivered.length===6){s.won=true;s.phase='won';s.score+=Math.max(0,Math.round(600-s.elapsed*2));sfx('success');notify('六班列车正确到站。道岔、信号与区段的调度记录已保存。')}sync();
 }
 let lastAspect=0;
 function cameraSync(){
  // At 4:3 on phones the wider lens retains both entry trains and stations.
  camera.fov=camera.aspect<1.5?40:33.5;
  camera.position.set(7.6,17.8,19.4);camera.lookAt(-.65,.1,0);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);lastAspect=camera.aspect;
 }
 function sync(){
  if(lastAspect!==camera.aspect)cameraSync();
  const occupied=block(),mobile=host.clientWidth<600;
  needle.rotation.y=s.switch==='bay'?-.54:.54;
  switchRing.material.color.set(occupied.length?0xc98258:STATIONS[s.switch].color);
  for(const [key,marker] of Object.entries(routeMarkers))marker.material.opacity=s.switch===key?.96:.20;
  for(const [entry,o] of Object.entries(signalObjects)){
   o.lamps.forEach((l,i)=>{const lit=(s.signals[entry]?1:0)===i;l.material.emissiveIntensity=lit?1.35:.03;l.material.color.set(lit?(i?0x7ae2bd:0xff8166):0x455154)});
   labels[entry].node.textContent=(entry==='west'?'西线':'北线')+' · '+(s.signals[entry]?'绿':'红');
  }
  labels.switch.node.textContent=(occupied.length?'锁定 · ':'道岔 · ')+(s.switch==='bay'?'海湾':'山林');
  for(const {node,p} of Object.values(labels)){const q=projectPoint(camera,p);node.style.left=q.x/1120*100+'%';node.style.top=q.y/630*100+'%';node.hidden=!q.visible}
  s.trains.forEach((t,i)=>{
   const live=t.status!=='pending'&&t.status!=='arrived';
   trainObjects[i].forEach((o,j)=>{o.visible=live;const q=trainAt(t,t.distance-j*1.48);o.position.set(q.p.x,.1+o.userData.floorOffset,q.p.z);o.rotation.y=Math.atan2(q.direction.x,q.direction.z)});
   const p=trainAt(t).p,q=projectPoint(camera,{x:p.x,y:1.27,z:p.z}),l=trainLabels[i];
   l.hidden=!live||!q.visible;l.style.left=q.x/1120*100+'%';l.style.top=q.y/630*100+'%';
   l.textContent=t.id+' → '+(t.target==='bay'?'海湾':'山林')+(t.blocked?' · 待行':'');
   l.style.setProperty('--route',t.target==='bay'?'#b79a56':'#518d81');
   if(smoke[i])smoke[i].forEach((o,j)=>{o.visible=live&&!t.blocked&&t.distance>.1;const age=(s.elapsed*.7+j*.2)%1,q=trainAt(t,t.distance-.15-age*.47);o.position.set(q.p.x+age*.22,1.1+age*.8,q.p.z);o.scale.setScalar(.5+age*1.3);o.material.opacity=(1-age)*.23});
  });
  for(const [i,o] of ripples.entries())o.material.opacity=.23+Math.sin(s.elapsed*.32+i)*.08;
  overlay.querySelector('.sp-progress b').textContent=s.delivered.length+' / 6';
  overlay.querySelector('.sp-progress small').textContent=Math.floor(s.elapsed)+'s';
  overlay.querySelector('.sp-block b').textContent=occupied.length?'区段占用 · '+occupied.map(t=>t.id).join(' / '):'共享区段空闲';
  overlay.querySelector('.sp-block i').style.background=occupied.length?'#bd8156':'#659079';
  overlay.querySelector('.sp-block span').textContent=occupied.length?'保持道岔，等待列车离开':'选择目的地，再放行一条入口';
  overlay.querySelector('.sp-block em').textContent='西 '+(s.signals.west?'● 绿':'● 红')+'  /  北 '+(s.signals.north?'● 绿':'● 红')+'  ·  '+(s.switch==='bay'?'金线':'青线');
  const result=overlay.querySelector('.sp-result');result.hidden=s.phase==='dispatch';
  result.querySelector('small').textContent=s.won?'DISPATCH COMPLETE':'暂停调度';
  result.querySelector('b').textContent=s.won?'六班列车，都有归途。':s.failure?.kind==='collision'?'共享区段发生相撞':'列车抵达了错误车站';
  result.querySelector('span').textContent=s.won?'正确到站 6 / 6 · 可重新调度并保留完成记录。':s.failure?.kind==='collision'?'轮流放行两条入口；等列车离开共享区段再改线。':s.failure?`${s.failure.train} 需要前往${STATIONS[s.failure.expected].name}，却到了${STATIONS[s.failure.arrived].name}。`:'继续检查信号与目的地。';
 }
 cameraSync();sync();
 return {
  setActive(v){active=!!v},tick,draw(){sync();world.draw()},
  getState:()=>({...structuredClone(s),active,block:block().map(t=>t.id),trainPositions:s.trains.filter(isLive).map(t=>({id:t.id,...Object.fromEntries(['x','y','z'].map(k=>[k,trainAt(t).p[k]])),screen:projectPoint(camera,trainAt(t).p)})),controlsScreen:{west:projectPoint(camera,signalObjects.west.p),north:projectPoint(camera,signalObjects.north.p),switch:projectPoint(camera,{x:1.55,y:.15,z:0})},stops:STOPS,approachLengths:{west:APPROACH.west.length,north:APPROACH.north.length},stations:STATIONS,rules:{speed:SPEED,trains:6,collisionRadius:.7,carriageOffset:1.48,sharedExitX:4.85},models:23,edition:'polished'}),
  getStatus:()=>({goal:s.won?'六班列车正确到站':s.phase==='failed'?'重新调度，修正信号与去向':'设置道岔与区段信号，让六班列车正确到站',message:s.phase==='failed'?'列车位置保持在失误现场。重新调度可恢复六班时刻表。':'红灯把车停在停车线，绿灯允许前进。按车次标签选择海湾站或山林站，再只放行一条入口。共享区段有车时道岔锁定；另一条入口需要保持红灯。到站后才计数。E 尝试切换道岔。',stats:['到站 '+s.delivered.length+'/6','道岔 '+STATIONS[s.switch].name,'共享区段 '+(block().length?'占用':'空闲'),'时间 '+Math.floor(s.elapsed)+'s'],actions:s.phase==='dispatch'?[action('西线信号：'+(s.signals.west?'绿灯':'红灯'),()=>signal('west')),action('北线信号：'+(s.signals.north?'绿灯':'红灯'),()=>signal('north')),action('道岔：'+STATIONS[s.switch].name+(block().length?' · 锁定':''),changeSwitch,block().length>0),action('重新调度',restart)]:[action('重新调度',restart)]}),
  dispose(){overlay.remove();style.remove();world.dispose()}
 };
}
