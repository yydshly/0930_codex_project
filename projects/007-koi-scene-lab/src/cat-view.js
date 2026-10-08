import {sphereFitDistance} from './camera-framing.js';

// Keep the camera on the foreground side of the route. Actor yaw must not
// orbit the camera across the bank and replace the garden with empty gravel.
export function catObservationView(sphere,aspect=1){
 const c=sphere.center,offset={x:-.12,y:.055,z:-.34},fov=52;
 const target=[c.x+offset.x,c.y+offset.y,c.z+offset.z];
 const radius=Math.max(.32,sphere.radius)+Math.hypot(offset.x,offset.y,offset.z);
 const distance=sphereFitDistance(radius,fov,aspect,1.14);
 const direction=[1.05,.88,1.5],length=Math.hypot(...direction);
 return {position:target.map((v,i)=>v+direction[i]/length*distance),target,fov};
}
