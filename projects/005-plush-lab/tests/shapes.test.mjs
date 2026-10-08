import test from 'node:test';
import assert from 'node:assert/strict';
import {shapePoint} from '../src/shapes.js';

const oldShapes=['pear','bean','triangle','heart','egg'];
const newShapes=['bunny','bear','star'];
function previousSurface(shape,theta,phi){
  const y=Math.cos(theta),ring=Math.sin(theta);let rx=1,ry=1.1,rz=.77;
  if(shape==='pear'){rx=1.04*(1-.23*y+.10*Math.cos(y*5));ry=1.14}
  if(shape==='bean'){rx=1.04*(1+.09*Math.cos(phi*2)*(1-y*y));ry=.94;rz=.78}
  if(shape==='triangle'){rx=1.02*(1-.55*y);ry=1.17;rz=.74}
  if(shape==='heart'){rx=1.05*(1+.38*y);ry=.99;rz=.69}
  if(shape==='egg'){rx=.93*(1-.13*y);ry=1.15;rz=.76}
  let py=y*ry;
  if(shape==='heart')py-=.24*Math.exp(-Math.pow(Math.sin(phi)*ring/.25,2))*Math.max(0,y);
  return [ring*Math.sin(phi)*rx,py,ring*Math.cos(phi)*rz];
}
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const subtract=(a,b)=>a.map((v,i)=>v-b[i]);

test('existing five bodies retain their exact shape',()=>{
  for(const shape of oldShapes)for(const [theta,phi] of [[0,0],[.34,-2.3],[1.45,1.25],[2.17,-.53],[Math.PI,Math.PI]]){
    assert.deepEqual(shapePoint(shape,theta,phi),previousSurface(shape,theta,phi));
  }
});

test('every body stays finite and closes its longitude seam',()=>{
  for(const shape of [...oldShapes,...newShapes])for(let i=0;i<=56;i++){
    const theta=Math.PI*i/56;
    for(let j=0;j<=80;j++)assert.ok(shapePoint(shape,theta,Math.PI*2*j/80).every(Number.isFinite),shape);
    const first=shapePoint(shape,theta,0),last=shapePoint(shape,theta,Math.PI*2);
    assert.ok(Math.hypot(...subtract(first,last))<1e-12,`${shape} seam`);
  }
});

test('bunny has two tall furry ear lobes above its central crown',()=>{
  const crown=shapePoint('bunny',0,0),theta=Math.asin(.43);
  const left=shapePoint('bunny',theta,-Math.PI/2),right=shapePoint('bunny',theta,Math.PI/2);
  assert.ok(left[0]<-.3&&right[0]>.3);
  assert.ok(left[1]>crown[1]+.5&&right[1]>crown[1]+.5);
  assert.ok(left[1]<1.6&&right[1]<1.6);
  assert.ok(Math.abs(left[1]-right[1])<1e-12);
});

test('bear has two rounded ear lobes separated by its head',()=>{
  const crown=shapePoint('bear',0,0),theta=Math.atan2(.64,1.2);
  const left=shapePoint('bear',theta,-Math.PI/2),right=shapePoint('bear',theta,Math.PI/2);
  assert.ok(left[0]<-.6&&right[0]>.6);
  assert.ok(left[1]>crown[1]+.2&&right[1]>crown[1]+.2);
  assert.ok(left[1]<1.26&&right[1]<1.26);
});

test('bear front silhouette has broad circular ear caps and shoulder notches',()=>{
  const contour=Array.from({length:2001},(_,i)=>shapePoint('bear',Math.PI*.5*i/2000,Math.PI/2));
  const cap=contour.filter(([x,y])=>x>.35&&x<.93&&y>1.09);
  // Check the actual front outline: an arc around the ear center, with enough
  // width close to its top to distinguish a round cap from a triangular peak.
  assert.ok(cap.length>20);
  for(const [x,y] of cap)assert.ok(Math.abs(Math.hypot(x-.64,y-.82)-.38)<.002);
  const top=Math.max(...cap.map(([,y])=>y));
  const upperCap=cap.filter(([,y])=>y>top-.05);
  const capWidth=Math.max(...upperCap.map(([x])=>x))-Math.min(...upperCap.map(([x])=>x));
  assert.ok(capWidth>.34,`round cap width ${capWidth}`);
  const shoulder=contour.filter(([x])=>x>.15&&x<.4);
  assert.ok(Math.min(...shoulder.map(([,y])=>y))<shapePoint('bear',0,0)[1]-.02);
});

test('rounded star has exactly five planar silhouette lobes',()=>{
  const radii=Array.from({length:720},(_,i)=>{
    const angle=Math.PI*2*i/720,x=Math.sin(angle),y=Math.cos(angle);
    const point=shapePoint('star',Math.acos(Math.max(-1,Math.min(1,y))),x>=0?Math.PI/2:-Math.PI/2);
    return Math.hypot(point[0],point[1]);
  });
  const peaks=radii.filter((radius,i)=>radius>radii[(i+719)%720]&&radius>radii[(i+1)%720]);
  assert.equal(peaks.length,5);
  assert.ok(Math.max(...radii)<1.25&&Math.min(...radii)>.75);
  assert.deepEqual(shapePoint('star',Math.PI/2,0).map(v=>Math.abs(v)<1e-12?0:v),[0,0,.78]);
});

test('new body poles are continuous and lower surfaces stay smooth',()=>{
  for(const shape of newShapes)for(const theta of [0,Math.PI]){
    const pole=shapePoint(shape,theta,0);
    for(let j=0;j<32;j++){
      const phi=j*Math.PI/16;
      assert.ok(Math.hypot(...subtract(pole,shapePoint(shape,theta,phi)))<1e-12,`${shape} closed pole`);
      const near=shapePoint(shape,theta===0?.0001:Math.PI-.0001,phi);
      assert.ok(Math.hypot(...subtract(pole,near))<.001,`${shape} smooth pole`);
    }
  }
});

test('new body finite-difference normals remain valid away from poles',()=>{
  for(const shape of newShapes)for(let i=1;i<56;i++)for(let j=0;j<80;j++){
    const theta=Math.PI*i/56,phi=Math.PI*2*j/80;
    const alongTheta=subtract(shapePoint(shape,theta+.001,phi),shapePoint(shape,theta-.001,phi));
    const alongPhi=subtract(shapePoint(shape,theta,phi+.001),shapePoint(shape,theta,phi-.001));
    const normal=cross(alongTheta,alongPhi),length=Math.hypot(...normal);
    assert.ok(Number.isFinite(length)&&length>1e-8,`${shape} valid normal at ${i}/${j}`);
  }
});
