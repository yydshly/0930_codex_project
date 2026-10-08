import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlushSplats, MIN_PLUSH_SPLATS, MAX_PLUSH_SPLATS} from '../src/gaussian-plush.js';

const opts={seed:'repeatable-coat',count:2000};
const valid = dataset => {
  assert.equal(dataset.splats.length,dataset.meta.count);
  for (const splat of dataset.splats) {
    for (const field of ['position','scale','rotation','color']) assert.ok(splat[field].every(Number.isFinite),field);
    assert.ok(splat.scale.every(v => v > 0));
    assert.ok(splat.color.every(v => v >= 0 && v <= 1));
    assert.ok(Math.abs(Math.hypot(...splat.rotation)-1) < 1e-10);
    assert.ok(splat.opacity >= 0 && splat.opacity <= 1);
  }
};

test('Gaussian plush is deterministic, closed, finite and includes the entire character in count', () => {
  const a=createPlushSplats(opts), b=createPlushSplats(opts);
  assert.deepEqual(a,b);
  assert.equal(a.splats.length,2000);
  assert.equal(a.meta.bodyCount+a.meta.faceCount+a.meta.hatCount,2000);
  assert.ok(a.meta.hatCount > 0);
  assert.ok(a.splats.some(s => s.position[2] > .4));
  assert.ok(a.splats.some(s => s.position[2] < -.4));
  assert.ok(a.splats.some(s => s.color.every(v => v > .7)),'eye glints are Gaussian geometry');
  assert.ok(a.splats.some(s => s.color.every(v => v < .01)),'eyes are Gaussian geometry');
  assert.ok(a.splats.some(s => Math.max(...s.scale)/Math.min(...s.scale) > 2),'tufts have anisotropic covariance');
  valid(a);
});

test('seed, shape, linear coat color, softness and beret controls change actual asset data', () => {
  const base=createPlushSplats(opts), nextSeed=createPlushSplats({...opts,seed:'another-coat'});
  assert.notDeepEqual(base.splats[0],nextSeed.splats[0]);
  const red=createPlushSplats({...opts,color:'#ed9b9b'});
  assert.ok(base.splats[0].color[2] > base.splats[0].color[0]);
  assert.ok(red.splats[0].color[0] > red.splats[0].color[2]);
  assert.deepEqual(base.splats[0].position,red.splats[0].position);
  assert.ok(base.splats[0].color[0] < .45,'RGB values are linear, not copied sRGB channels');
  const short=createPlushSplats({...opts,softness:0}), soft=createPlushSplats({...opts,softness:1});
  const shortBody=short.splats.slice(0,short.meta.bodyCount);
  assert.ok(shortBody.some((s,i) => s.position.some((v,j) => v !== soft.splats[i].position[j])),'softness changes coat geometry');
  assert.ok(shortBody.some((s,i) => s.scale.some((v,j) => v !== soft.splats[i].scale[j])),'softness changes coat covariance');
  const noHat=createPlushSplats({...opts,hat:false});
  assert.equal(noHat.meta.hatCount,0); assert.equal(noHat.splats.length,2000);
  assert.ok(noHat.meta.bodyCount > base.meta.bodyCount);
  for (const shape of ['star','cloud','orb']) {
    const candidate=createPlushSplats({...opts,shape}); valid(candidate);
    if (shape !== 'star') assert.notDeepEqual(base.splats[0].position,candidate.splats[0].position);
  }
});

test('default 32000-splat asset fits character coordinates and keeps a dense coat', () => {
  const dataset=createPlushSplats(); valid(dataset);
  assert.equal(dataset.splats.length,32000); assert.equal(dataset.meta.source,'procedural');
  const bounds=[0,1,2].map(axis => [Math.min(...dataset.splats.map(s => s.position[axis])),Math.max(...dataset.splats.map(s => s.position[axis]))]);
  assert.ok(bounds[0][0] < -.8 && bounds[0][1] > .8);
  assert.ok(bounds[1][0] > -1.3 && bounds[1][1] < 1.75,'rounded fleece belly and thick beret stay within the character envelope');
  assert.ok(bounds[2][0] < -.5 && bounds[2][1] > .5);
});

test('procedural asset options reject unsafe counts and malformed controls', () => {
  for (const count of [0,MIN_PLUSH_SPLATS-1,MAX_PLUSH_SPLATS+1,Infinity,NaN,2000.5,'32000']) assert.throws(() => createPlushSplats({count}),/数量/);
  for (const softness of [-1,1.1,NaN,Infinity,'soft']) assert.throws(() => createPlushSplats({softness}),/柔软度/);
  assert.throws(() => createPlushSplats({color:'rgb(0,0,0)'}),/颜色/);
  assert.throws(() => createPlushSplats({shape:'bunny'}),/形状/);
  assert.throws(() => createPlushSplats({seed:'x'.repeat(257)}),/种子/);
  assert.throws(() => createPlushSplats({hat:'yes'}),/帽子/);
  valid(createPlushSplats({...opts,color:'#abc'}));
});

const extent=(splats,axis) => {
  let min=Infinity,max=-Infinity;
  for (const splat of splats) {min=Math.min(min,splat.position[axis]);max=Math.max(max,splat.position[axis]);}
  return max-min;
};
const percentile=(values,q) => values.sort((a,b) => a-b)[Math.floor((values.length-1)*q)];
const luminance=color => color[0]*.2126+color[1]*.7152+color[2]*.0722;

test('reference star has a broad flat belly, a wide filled beret and two eyes without a mouth', () => {
  const dataset=createPlushSplats(),{bodyCount,faceCount,hatCount,layers}=dataset.meta;
  const body=dataset.splats.slice(0,bodyCount),hat=dataset.splats.slice(bodyCount+faceCount);
  const width=extent(body,0),height=extent(body,1),hatRatio=extent(hat,0)/width;
  assert.ok(hatRatio > .73 && hatRatio < .81,'the beret is close to the reference three-quarter body width');
  const crown=hat.slice(0,layers.hatCrownCount);
  assert.ok(extent(crown,1)/height > .27 && extent(crown,1)/height < .35,'the crown stays thick without swallowing the shoulders');
  // The inward-closing underside and its fine wool can sit below the visible
  // crown. Check the outer shell instead of rejecting that hidden filling.
  assert.ok(Math.min(...crown.filter(s=>s.position[0]>-.80).map(s=>s.position[1]))>.80,'the fitted crown ends at the head while its outer left edge can drape');
  const frontHem=(lo,hi)=>Math.min(...crown.filter(s=>s.position[0]>lo&&s.position[0]<hi&&s.position[2]>.15).map(s=>s.position[1]));
  const valleyHem=frontHem(-.2,.2);
  assert.ok(frontHem(-.75,-.5)>valleyHem+.07 && frontHem(.45,.7)>valleyHem+.07,'both shoulder hems rise around a central valley');
  const crownLight=crown.filter(s=>s.position[1]>1.05&&s.position[2]>.15).map(s=>luminance(s.color));
  const foldContrast=percentile([...crownLight],.9)-percentile([...crownLight],.1);
  assert.ok(foldContrast>.004 && foldContrast<.012 && percentile([...crownLight],.9)<.02,'matte black wool retains fold depth without becoming glossy grey');
  assert.equal(layers.smileCount,0,'the reference has no visible mouth');
  assert.equal(layers.eyeCount+layers.glintCount,faceCount,'the face budget is entirely glass eyes and glints');
  assert.ok(layers.hatFillCount > 0,'the expanded crown includes opaque black filling');
  assert.equal(layers.hatCrownCount+layers.hatFillCount+layers.hatFiberCount+layers.hatBrimCount+layers.hatNubCount,hatCount);
  const lowest=Math.min(...body.map(s=>s.position[1])),bottom=body.filter(s=>s.position[1]<lowest+height*.10);
  assert.ok(extent(bottom,0)/width > .50,'the bottom tenth remains wide rather than narrowing into a pear');
  const lowY=splats=>Math.min(...splats.map(s=>s.position[1]));
  const center=body.filter(s=>Math.abs(s.position[0])<width*.10),left=body.filter(s=>s.position[0]<-width*.18),right=body.filter(s=>s.position[0]>width*.18);
  assert.ok(Math.abs(lowY(center)-lowY(left))<height*.04 && Math.abs(lowY(center)-lowY(right))<height*.04,'the belly has a shallow rounded base across both sides');
});

test('stuffed body, glass eyes and wool crown retain real three-dimensional volume', () => {
  const dataset=createPlushSplats(),{layers,bodyCount,faceCount}=dataset.meta;
  const body=dataset.splats.slice(0,bodyCount);
  const firstEye=dataset.splats.slice(bodyCount,bodyCount+Math.floor(layers.eyeCount/2));
  const crown=dataset.splats.slice(bodyCount+faceCount,bodyCount+faceCount+layers.hatCrownCount);
  assert.ok(extent(body,2)/extent(body,0) > .65,'the body is thick stuffing');
  assert.ok(extent(firstEye,2)/extent(firstEye,0) > .65,'eyes are convex glass volumes');
  assert.ok(extent(crown,1)/extent(crown,0) > .32,'the crown has wool volume');
  const eyeLight=firstEye.map(s => luminance(s.color));
  assert.ok(Math.max(...eyeLight)-Math.min(...eyeLight) > .05,'glass has shaded reflections beyond a flat black fill');
});

test('32k and 80k coats keep resolved short curls, fine covariance and root/crest contrast', () => {
  for (const count of [32000,80000]) {
    const dataset=createPlushSplats({count,seed:'short-curl-density'}),{layers,bodyCount}=dataset.meta;
    const fibers=dataset.splats.slice(layers.fillCount+layers.shellCount,bodyCount);
    const minor=fibers.map(s => Math.min(...s.scale)),major=fibers.map(s => Math.max(...s.scale));
    const medianMinor=percentile([...minor],.5);
    assert.ok(medianMinor > .0015 && medianMinor < .0035,'curl cross sections remain visible without broad plates');
    // This percentile includes the rounded tuft cores as well as fine fibers.
    // Cores need volume; the median minor axis still rejects broad leaf fibers.
    assert.ok(percentile([...major],.90) < .023,'raised fleece cores stay compact rather than becoming broad leaves');
    assert.ok(percentile(fibers.map(s => Math.max(...s.scale)/Math.min(...s.scale)),.5) > 2.8,'the coat retains directional covariance');
    const front=fibers.filter(s => s.position[2]>.4).map(s => luminance(s.color));
    assert.ok(percentile([...front],.9)-percentile([...front],.1) > .13,'root occlusion and curved crests have tonal depth');
    assert.equal(dataset.splats.length,count);valid(dataset);
  }
});
