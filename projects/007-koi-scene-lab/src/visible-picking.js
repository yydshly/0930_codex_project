// Raycaster does not filter hidden ancestors or material visibility. The
// render-visible triangle and its material, rather than a bounding box, own
// picking. A transparent water shader can explicitly opt into pass-through.
export function isRenderVisible(object, stop=null) {
  for(let node=object;node;node=node.parent){if(node.visible===false)return false;if(node===stop)break;}
  return true;
}

function materialAtHit(hit) {
  const material=hit.object.material;
  return Array.isArray(material)?material[hit.face?.materialIndex??0]:material;
}
function hitIsVisible(hit,root) {
  const material=materialAtHit(hit);
  // Line/point thresholds are world-space tolerances, not their visible
  // screen silhouette. Mesh triangles keep tiny dragonfly legs from making
  // an invisible one-unit-wide click target or blocking another animal.
  return hit.object.isMesh&&isRenderVisible(hit.object,root)&&!!material&&material.visible!==false&&material.opacity!==0;
}
function isInside(object,ancestor) {
  for(let node=object;node;node=node.parent)if(node===ancestor)return true;
  return false;
}
export function actorRoot(object, actors) {
  for(let node=object;node&&node!==actors;node=node.parent)
    if(node.userData?.actor&&isInside(node,actors))return node;
  return null;
}

export function pickVisibleActor(raycaster, actors, {scene=null,passThrough=[]}={}) {
  const root=scene??(()=>{let node=actors;while(node.parent)node=node.parent;return node;})();
  root.updateWorldMatrix(true,true);
  const hits=raycaster.intersectObject(root,true).filter(hit=>hitIsVisible(hit,root));
  for(const candidate of hits){
    const actor=actorRoot(candidate.object,actors);
    if(!actor)continue;
    const blocked=hits.some(hit=>{
      if(hit.distance>=candidate.distance-1e-5||isInside(hit.object,actor))return false;
      if(passThrough.some(object=>object&&isInside(hit.object,object)))return false;
      const material=materialAtHit(hit);
      return !material.transparent&&!(material.transmission>0);
    });
    if(!blocked)return actor.userData.actor;
  }
  return null;
}
