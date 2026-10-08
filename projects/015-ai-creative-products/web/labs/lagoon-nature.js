import {T} from './world-stage.js';
import {deciduousTree} from './scenic-craft.js';
import {boulderGeometry as meta} from './assets/boulder/geometry.js';

export function enrichLagoonNature(scene,{coast,landHeight,rockMeshes,onLoad=()=>{}}){
 const trees=[],abort=new AbortController();let alive=true,scannedReady=false,geometry=null;
 const bark=new T.MeshStandardMaterial({color:'#695746',roughness:1}),foliage=new T.MeshStandardMaterial({color:'#82956b',roughness:.84,side:T.DoubleSide});
 for(const [i,z] of [-27,-23,-18,-13,-8,15,20,26,30].entries()){
  const x=coast(z)+4.9+(i%3)*1.7,tree=deciduousTree(scene,{x,z,scale:1.30+(i%3)*.19,seed:880+i,wood:bark,leaf:foliage});tree.position.y=landHeight(x,z);trees.push(tree);
 }
 for(const [i,x,z] of [[10,10,-23],[11,15,-18],[12,21,-12],[13,24,8],[14,18,19],[15,10,24]]){const tree=deciduousTree(scene,{x,z,scale:1.6+(i%2)*.4,seed:900+i,wood:bark,leaf:foliage});tree.position.y=landHeight(x,z);trees.push(tree);}
 const loader=new T.TextureLoader(),base=new URL('./assets/boulder/',import.meta.url);
 const map=(kind,srgb=false)=>{const t=loader.load(new URL(`boulder_01-${kind}.webp`,base).href,()=>{if(alive)onLoad();});t.flipY=false;if(srgb)t.colorSpace=T.SRGBColorSpace;return t;};
 const color=map('color',true),normal=map('normal'),arm=map('arm');
 const scannedMaterial=new T.MeshStandardMaterial({color:'#dedbd0',map:color,normalMap:normal,normalScale:new T.Vector2(.70,-.70),roughness:1,roughnessMap:arm,aoMap:arm,aoMapIntensity:.65,metalness:0});
 fetch(new URL('boulder_01-lod.bin',base),{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Scanned shoreline rock could not load');return r.arrayBuffer();}).then(buffer=>{
  if(!alive)return;
  geometry=new T.BufferGeometry();const values=new Float32Array(buffer,0,meta.vertices*8),interleaved=new T.InterleavedBuffer(values,8);
  geometry.setAttribute('position',new T.InterleavedBufferAttribute(interleaved,3,0));geometry.setAttribute('normal',new T.InterleavedBufferAttribute(interleaved,3,3));geometry.setAttribute('uv',new T.InterleavedBufferAttribute(interleaved,2,6));geometry.setIndex(new T.BufferAttribute(new Uint32Array(buffer,meta.indexOffset,meta.indices),1));
  geometry.computeBoundingBox();const bounds=geometry.boundingBox,center=bounds.getCenter(new T.Vector3()),span=bounds.getSize(new T.Vector3()),factor=.85*2/Math.max(span.x,span.y,span.z);
  geometry.translate(-center.x,-center.y,-center.z);geometry.scale(factor,factor,factor);geometry.computeBoundingSphere();
  for(let i=0;i<rockMeshes.length;i+=3){rockMeshes[i].geometry=geometry;rockMeshes[i].material=scannedMaterial;}
  scannedReady=true;onLoad();
 }).catch(error=>{if(error.name!=='AbortError')console.warn(error.message);});
 return {environment(state){const shown=Math.round(trees.length*(.3+.7*state.density/30));trees.forEach((tree,n)=>tree.visible=n<shown);},getState:()=>({broadleafTrees:trees.length,visibleBroadleafTrees:trees.filter(t=>t.visible).length,scannedShoreRock:{loaded:scannedReady,instances:Math.ceil(rockMeshes.length/3),trianglesPerRock:meta.triangles,source:'Boulder 01 / Rico Cilliers / Poly Haven / CC0',lod:'UV-aware spatial clustering from official glTF',colliders:'original solid-rock envelopes retained'}}),dispose(){alive=false;abort.abort();if(!scannedReady){geometry?.dispose();scannedMaterial.dispose();color.dispose();normal.dispose();arm.dispose();}}};
}
