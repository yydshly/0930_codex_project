import test from 'node:test';
import assert from 'node:assert/strict';
import {validateHabitat,pointInPolygon,signedPolygonDistance,projectIntoHabitat,sampleHabitatSpawn,habitatClearance,polygonArea} from '../src/habitat-geometry.js';
import {signedShoreDistance,shorelineSteering,bodySpheres,obstacleSteering} from '../src/fish-steering.js';
const polygon=[{x:-2,z:-1},{x:2,z:-1},{x:2,z:1},{x:-2,z:1}];
const fixture=(patch={})=>validateHabitat({polygon,waterLevel:.7,depth:.65,feedPoint:{x:-1,z:.4},obstacles:[{x:0,z:0,radius:.3}],...patch});

test('binding validates world polygon/water/obstacles and normalizes feed height without aliasing input',()=>{const source={polygon:polygon.map(p=>({...p})),waterLevel:.7,depth:.65,feedPoint:{x:-1,y:99,z:.4},obstacles:[]},h=validateHabitat(source);
 assert.deepEqual(h.feedPoint,{x:-1,y:.7,z:.4});source.polygon[0].x=99;assert.equal(h.polygon[0].x,-2);
 assert.equal(validateHabitat({...source,polygon:[...polygon,polygon[0]]}).polygon.length,4);
});
test('self crossing, repeated/touching edges, degenerate and oversized polygons are rejected',()=>{
 for(const bad of [[{x:0,z:0},{x:2,z:2},{x:0,z:2},{x:2,z:0}], [{x:0,z:0},{x:1,z:0},{x:2,z:0}], [{x:0,z:0},{x:1,z:0},{x:1,z:0},{x:0,z:1}],polygon.map((p,i)=>({...p,x:i===0?101:p.x})),Array.from({length:33},(_,i)=>({x:Math.cos(i),z:Math.sin(i)}))])assert.throws(()=>fixture({polygon:bad}));
});
test('invalid water/depth/feed/obstacle values fail before binding application',()=>{
 for(const waterLevel of [-10.01,10.01,NaN])assert.throws(()=>fixture({waterLevel}));
 for(const depth of [.199,3.001,Infinity])assert.throws(()=>fixture({depth}));
 assert.throws(()=>fixture({feedPoint:{x:5,z:0}}));assert.throws(()=>fixture({feedPoint:{x:0,z:0}}));
 for(const radius of [.049,2.001,NaN])assert.throws(()=>fixture({obstacles:[{x:0,z:0,radius}]}));
 assert.throws(()=>fixture({obstacles:Array.from({length:17},()=>({x:0,z:0,radius:.1}))}));
});
test('concave polygons classify their cutout correctly and accept the boundary',()=>{const p=[{x:0,z:0},{x:3,z:0},{x:3,z:1},{x:1,z:1},{x:1,z:3},{x:0,z:3}];
 assert.ok(pointInPolygon(p,.5,2));assert.ok(!pointInPolygon(p,2,2));assert.ok(pointInPolygon(p,1,2));assert.ok(signedPolygonDistance(p,.5,2).distance<0);assert.ok(signedPolygonDistance(p,2,2).distance>0);
});
test('polygon distance gradients stay outward for clockwise/counterclockwise and translated shorelines',()=>{for(const vertices of [polygon,[...polygon].reverse(),polygon.map(p=>({x:p.x+45,z:p.z-20}))]){
 const offset=vertices[0].x>10?{x:45,z:-20}:{x:0,z:0},q=signedPolygonDistance(vertices,offset.x+1.8,offset.z),outside=signedPolygonDistance(vertices,offset.x+2.2,offset.z);
 assert.ok(q.distance<0&&q.nx>.99);assert.ok(outside.distance>0&&outside.nx>.99);
 const exact=signedPolygonDistance(vertices,offset.x+2,offset.z);assert.equal(exact.distance,0);assert.ok(exact.nx>.99);assert.ok(Math.abs(polygonArea(vertices))>0);
}});
test('imported shoreline uses its world polygon and predicts avoidance before crossing',()=>{const shore={habitat:true,vertices:polygon},fish={x:1.5,z:0,heading:0,speed:.25,size:.6};
 assert.ok(signedShoreDistance(shore,1.5,0).distance<0);assert.ok(shorelineSteering(shore,fish).x<0);assert.ok(signedShoreDistance(shore,3,0).distance>0);
});
test('deterministic spawns fit whole three-ball footprints and avoid imported cylinders',()=>{const h=fixture();for(let i=0;i<20;i++){const p=sampleHabitatSpawn(h,i,.78);assert.deepEqual(p,sampleHabitatSpawn(h,i,.78));assert.ok(habitatClearance(h,p.x,p.z)>=.78*.4+.015-1e-9);
 for(const heading of [0,1,2,3])for(const sphere of bodySpheres({...p,id:i,heading,size:.78,pitch:0}))assert.ok(habitatClearance(h,sphere.x,sphere.z)>=sphere.radius);
 assert.ok(p.y>h.waterLevel-h.depth&&p.y<h.waterLevel);}});
test('projection remains inside concave shore and outside cylinders including a bank obstacle',()=>{
 const h=fixture({obstacles:[{x:1.6,z:0,radius:.7}]});for(const p of [{x:4,z:0},{x:1.8,z:0},{x:1.6,z:0},{x:-3,z:2}]){const q=projectIntoHabitat(h,p,.15);assert.ok(habitatClearance(h,q.x,q.z)>=.15-1e-6);}
 const concave=fixture({polygon:[{x:-2,z:-2},{x:2,z:-2},{x:2,z:-.5},{x:-.5,z:-.5},{x:-.5,z:2},{x:-2,z:2}],feedPoint:{x:-1,z:0},obstacles:[]});
 const q=projectIntoHabitat(concave,{x:1,z:1},.1);assert.ok(habitatClearance(concave,q.x,q.z)>=.1-1e-6);
});
test('regions that cannot fit a fish footprint fail rather than silently spawning outside',()=>{const h=fixture({polygon:[{x:0,z:0},{x:.3,z:0},{x:.3,z:.3},{x:0,z:.3}],feedPoint:{x:.1,z:.1},obstacles:[]});assert.throws(()=>sampleHabitatSpawn(h,0,.7));});
test('debug body spheres match actual collision shape and predictive cylinders produce finite steering',()=>{const f={id:0,x:0,y:-.2,z:0,heading:.4,pitch:.3,size:.6,speed:.2},s=bodySpheres(f);assert.equal(s.length,3);assert.ok(s.every(p=>p.radius===.06&&Number.isFinite(p.x+p.y+p.z)));
 assert.equal(s[1].x,f.x);assert.equal(s[1].y,f.y);const steering=obstacleSteering({...f,x:-.8,heading:0},[{x:0,z:0,radius:.3}]);assert.ok(steering.x<0);assert.ok(Number.isFinite(steering.x+steering.z));
});
