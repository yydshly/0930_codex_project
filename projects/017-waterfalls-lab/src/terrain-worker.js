import {TerrainFieldCache,buildTerrainMesh,sampleField,surfaceHeight} from './voxel.js';
import {buildWorld} from './world.js';
const cache=new TerrainFieldCache();
self.onmessage=({data})=>{try{const field=cache.update(data.preset,data.edits);const terrain=buildTerrainMesh(field);const mesh=buildWorld(data.preset,data.season,[],false,{mesh:terrain,sample:p=>sampleField(field,p),height:(x,z)=>surfaceHeight(field,x,z)});self.postMessage({version:data.version,mesh},[mesh.buffer]);}catch(error){self.postMessage({version:data.version,error:error.message});}};
