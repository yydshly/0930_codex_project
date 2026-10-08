import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {readFile,writeFile} from 'node:fs/promises';
const bytes=await readFile(new URL('../web/assets/hand-right.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
let mesh;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});const skeleton=mesh.skeleton;
const wrist=skeleton.bones.find(b=>b.name==='wrist'),middle=skeleton.bones.find(b=>b.name==='middle-finger-tip');
const origin=wrist.getWorldPosition(new THREE.Vector3()),forward=middle.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
const up=new THREE.Vector3(1,0,0).addScaledVector(forward,-forward.x).normalize(),side=new THREE.Vector3().crossVectors(forward,up).normalize();
const normalize=new THREE.Matrix4().makeBasis(forward,up,side).invert().multiply(new THREE.Matrix4().makeTranslation(-origin.x,-origin.y,-origin.z));
const points=[],weights=[],lookup=new Map(),remap=[];
const g=mesh.geometry,pa=g.attributes.position,wi=g.attributes.skinIndex,ww=g.attributes.skinWeight;
for(let i=0;i<pa.count;i++){
  const p=new THREE.Vector3().fromBufferAttribute(pa,i).applyMatrix4(normalize),key=p.toArray().map(x=>Math.round(x*1e6)).join(',');
  let index=lookup.get(key);if(index===undefined){index=points.length;lookup.set(key,index);points.push(p.toArray());const w={};for(let k=0;k<4;k++){const b=wi.array[i*4+k],v=ww.array[i*4+k];if(v>0)w[b]=(w[b]||0)+v;}weights.push(w);}remap.push(index);
}
let triangles=[];for(let i=0;i<g.index.count;i+=3)triangles.push([remap[g.index.array[i]],remap[g.index.array[i+1]],remap[g.index.array[i+2]]]);
// The source closes the wrist. Cut a cross-section before extending the arm.
const crossings=new Map(),cut=.005,clipped=[];
const cross=(a,b)=>{const key=[a,b].sort((a,b)=>a-b).join(',');if(crossings.has(key))return crossings.get(key);const t=(cut-points[a][0])/(points[b][0]-points[a][0]),p=points[a].map((v,k)=>v*(1-t)+points[b][k]*t),w={};
  for(const [bone,v]of Object.entries(weights[a]))w[bone]=(w[bone]||0)+v*(1-t);for(const [bone,v]of Object.entries(weights[b]))w[bone]=(w[bone]||0)+v*t;
  const id=points.length;points.push(p);weights.push(w);crossings.set(key,id);return id;};
for(const f of triangles){const poly=[];for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3],inside=points[a][0]>=cut,next=points[b][0]>=cut;if(inside)poly.push(a);if(inside!==next)poly.push(cross(a,b));}
  for(let i=1;i<poly.length-1;i++)clipped.push([poly[0],poly[i],poly[i+1]]);}
const used=[...new Set(clipped.flat())],newIds=new Map(used.map((v,i)=>[v,i])),keptP=used.map(i=>points[i]),keptW=used.map(i=>weights[i]);
points.splice(0,points.length,...keptP);weights.splice(0,weights.length,...keptW);triangles=clipped.map(f=>f.map(i=>newIds.get(i)));
const edgeMap=new Map();for(const f of triangles)for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');const edge=edgeMap.get(key)||{a,b,count:0};edge.count++;edgeMap.set(key,edge);}
const boundary=[...edgeMap.values()].filter(e=>e.count===1),adj=new Map();for(const {a,b}of boundary){(adj.get(a)||adj.set(a,[]).get(a)).push(b);(adj.get(b)||adj.set(b,[]).get(b)).push(a);}
// Traverse in the directed winding of the original faces. The new strip must
// reverse each seam edge; arbitrary undirected traversal can turn it inside out.
const directed=new Map(boundary.map(e=>[e.a,e.b])),ring=[],start=boundary[0].a;let current=start;
do{ring.push(current);current=directed.get(current);if(current===undefined)throw new Error('Broken wrist boundary');}while(current!==start&&ring.length<200);
console.log(JSON.stringify({vertices:points.length,faces:triangles.length,boundary:boundary.length,ring:ring.length,bones:skeleton.bones.length}));
// Continue the open wrist into a tapered forearm; preserve the existing seam.
const center=ring.reduce((a,i)=>a.map((v,k)=>v+points[i][k]/ring.length),[0,0,0]);
let prior=ring;
for(const [x,scale]of [[-.035,1.00],[-.075,1.06],[-.13,1.23],[-.21,1.42],[-.31,1.59],[-.43,1.76],[-.60,1.91]]){
  const next=ring.map(i=>{const p=points[i],id=points.length,angle=Math.atan2((p[2]-center[2])/.026,(p[1]-center[1])/.014);
    points.push([x,center[1]+Math.cos(angle)*.0170*scale,center[2]+Math.sin(angle)*.0290*scale]);const k=Math.max(0,1-(-x-.022)/.11);weights.push({0:k,25:1-k});return id;});
  for(let i=0;i<ring.length;i++){const j=(i+1)%ring.length;triangles.push([prior[j],prior[i],next[i]],[prior[j],next[i],next[j]]);}prior=next;
}
// Loop subdivision smooths the inexpensive source topology, with the same
// barycentric interpolation for skin weights and positions.
const mix=(ids,factors)=>{const p=[0,0,0],w={};ids.forEach((id,i)=>{points[id].forEach((v,k)=>p[k]+=v*factors[i]);for(const [b,v]of Object.entries(weights[id]))w[b]=(w[b]||0)+v*factors[i];});return [p,w];};
for(let level=0;level<2;level++){
  const edges=new Map(),neighbors=points.map(()=>new Set()),borders=points.map(()=>[]);
  for(const f of triangles)for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3],c=f[(i+2)%3],key=[a,b].sort((a,b)=>a-b).join(',');neighbors[a].add(b);neighbors[b].add(a);const e=edges.get(key)||{a,b,opposite:[]};e.opposite.push(c);edges.set(key,e);}
  for(const e of edges.values())if(e.opposite.length===1){borders[e.a].push(e.b);borders[e.b].push(e.a);}
  const p2=[],w2=[];points.forEach((p,i)=>{let out;const ns=[...neighbors[i]];
    if(borders[i].length===2)out=mix([i,...borders[i]],[.75,.125,.125]);else{const beta=ns.length===3?3/16:3/(8*ns.length);out=mix([i,...ns],[1-ns.length*beta,...ns.map(()=>beta)]);}p2.push(out[0]);w2.push(out[1]);});
  for(const e of edges.values()){e.index=p2.length;const out=e.opposite.length===2?mix([e.a,e.b,...e.opposite],[.375,.375,.125,.125]):mix([e.a,e.b],[.5,.5]);p2.push(out[0]);w2.push(out[1]);}
  const edge=(a,b)=>edges.get([a,b].sort((a,b)=>a-b).join(',')).index,t2=[];
  for(const [a,b,c]of triangles){const ab=edge(a,b),bc=edge(b,c),ca=edge(c,a);t2.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}points.splice(0,points.length,...p2);weights.splice(0,weights.length,...w2);triangles=t2;
}
const bones=skeleton.bones.map(b=>{const m=normalize.clone().multiply(b.matrixWorld),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();m.decompose(p,q,s);return {name:b.name,position:p.toArray(),quaternion:q.toArray()};});
const index=[],weight=[];for(const w of weights){const top=Object.entries(w).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((a,[,v])=>a+v,0);for(let k=0;k<4;k++){index.push(k<top.length?Number(top[k][0]):0);weight.push(k<top.length?top[k][1]/sum:0);}}
const rounded=a=>a.map(v=>Math.round(v*1e7)/1e7);
const data={source:'@webxr-input-profiles/assets 1.0.20 / generic-hand/right.glb / MIT',bones,position:rounded(points.flat()),skinIndex:index,skinWeight:rounded(weight),index:triangles.flat()};
await writeFile(new URL('../src/hand-topology.json',import.meta.url),JSON.stringify(data));console.log(JSON.stringify({finalVertices:points.length,finalFaces:triangles.length,wristCenter:center}));
