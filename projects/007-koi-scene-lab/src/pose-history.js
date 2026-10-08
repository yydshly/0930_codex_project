// Render interpolation temporarily changes display poses, never the simulation.
// Nodes are duck-typed Three.js objects; uniforms are scalar {value} references.
function capture(nodes,uniforms,time){return {time,nodes:new Map(nodes.map(node=>{node.updateWorldMatrix(true,false);const p={position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),visible:node.visible,geometry:node.geometry,matrix:node.matrix.clone(),matrixAutoUpdate:node.matrixAutoUpdate};if(!node.matrixAutoUpdate){p.worldPosition=node.position.clone();p.worldQuaternion=node.quaternion.clone();p.worldScale=node.scale.clone();node.matrixWorld.decompose(p.worldPosition,p.worldQuaternion,p.worldScale);}return [node,p];})),uniforms:new Map(uniforms.map(ref=>[ref,ref.value]))};}
function restore(snapshot){for(const [node,p]of snapshot.nodes){node.position.copy(p.position);node.quaternion.copy(p.quaternion);node.scale.copy(p.scale);node.visible=p.visible;if(p.geometry)node.geometry=p.geometry;node.matrixAutoUpdate=p.matrixAutoUpdate;node.matrix.copy(p.matrix);node.matrixWorldNeedsUpdate=true;}for(const [ref,value]of snapshot.uniforms)ref.value=value;}
const snapshotIdentities=new WeakMap();let nextSnapshotIdentity=1;
function snapshotIdentity(value){if(!value)return null;if(!snapshotIdentities.has(value))snapshotIdentities.set(value,nextSnapshotIdentity++);return snapshotIdentities.get(value);}
// Exact content equality for a frozen display, independent of newly allocated
// snapshot containers and geometry upload versions. Only requested when paused.
export function poseSnapshotSignature(snapshot,extra=[]){if(!snapshot)return null;
 return JSON.stringify([snapshot.time,[...snapshot.nodes].map(([node,p])=>[snapshotIdentity(node),snapshotIdentity(p.geometry),p.visible,p.matrixAutoUpdate,p.position.toArray(),p.quaternion.toArray(),p.scale.toArray(),p.matrix.toArray(),p.worldPosition?.toArray(),p.worldQuaternion?.toArray(),p.worldScale?.toArray()]),[...snapshot.uniforms].map(([ref,value])=>[snapshotIdentity(ref),value]),extra]);
}
export class PoseHistory{
 constructor(){this.previous=this.current=null;}
 record(nodes,uniforms,time,reset=false){const current=capture(nodes,uniforms,time);this.previous=reset||!this.current?current:this.current;this.current=current;}
 withInterpolated(alpha,render){if(!this.current)return render();const b=this.current,a=this.previous,k=Math.max(0,Math.min(1,alpha)),saved=capture([...b.nodes.keys()],[...b.uniforms.keys()],b.time);
  try{for(const [node,q]of b.nodes){const p=a.nodes.get(node)??q;
    if(!q.matrixAutoUpdate&&p.worldPosition){const position=q.worldPosition.clone().lerpVectors(p.worldPosition,q.worldPosition,k),quaternion=q.worldQuaternion.clone().slerpQuaternions(p.worldQuaternion,q.worldQuaternion,k),scale=q.worldScale.clone().lerpVectors(p.worldScale,q.worldScale,k);node.matrix.compose(position,quaternion,scale);if(node.parent){node.parent.updateWorldMatrix(true,false);node.matrix.premultiply(node.parent.matrixWorld.clone().invert());}node.matrixWorldNeedsUpdate=true;}
    else{node.position.lerpVectors(p.position,q.position,k);node.quaternion.slerpQuaternions(p.quaternion,q.quaternion,k);node.scale.lerpVectors(p.scale,q.scale,k);node.updateMatrix();}
    node.visible=k<1?p.visible:q.visible;if(p.geometry&&q.geometry)node.geometry=k<1?p.geometry:q.geometry;
   }
   for(const [ref,value]of b.uniforms)ref.value=(a.uniforms.get(ref)??value)*(1-k)+value*k;
   return render(a.time*(1-k)+b.time*k);
  }finally{restore(saved);}
 }
}
