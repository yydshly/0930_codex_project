import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Offline frames from the exact shared production renderer. This is not a browser
// screenshot and deliberately does not recreate the page, UI, or playback audio.
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const runtimePackages = process.env.CODEX_WORKSPACE_NODE_MODULES ||
  'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const canvasPath = require.resolve('@napi-rs/canvas', { paths: [runtimePackages, project] });
const { createCanvas, loadImage } = require(canvasPath);
const { build } = require('esbuild');
const outputArgument = process.argv.find(argument => argument.startsWith('--output='));
const outputName = outputArgument ? outputArgument.slice('--output='.length) : 'worlds-v10-qa';
if (!/^[a-z0-9][a-z0-9._-]*$/i.test(outputName) || outputName.includes('..')) {
  throw new Error('--output must be a single safe directory name under the project assets directory.');
}
// Preserve the legacy default directory; a versioned output has separate media and scratch frames.
const tempDir = path.join(project, '.tmp', `${outputName}-offline`);
const outDir = path.join(project, 'assets', outputName);
const animated = process.argv.includes('--animate');
const interactionDemo = process.argv.includes('--interaction-demo');
const requestedFps=Number(process.argv.find(argument=>argument.startsWith('--fps='))?.slice(6)||8);
if(!Number.isInteger(requestedFps)||requestedFps<4||requestedFps>24)throw new Error('--fps must be an integer from 4 to 24.');
const audioTraceArgument=process.argv.find(argument=>argument.startsWith('--audio-trace='));
const audioTracesArgument=process.argv.find(argument=>argument.startsWith('--audio-traces='));
const traceArguments=[...(audioTraceArgument?[audioTraceArgument.slice('--audio-trace='.length)]:[]),
  ...(audioTracesArgument?audioTracesArgument.slice('--audio-traces='.length).split(','):[])];
const audioTraces={};
for(const traceArgument of traceArguments){
  const tracePath=path.resolve(project,traceArgument);
  if(!tracePath.startsWith(path.join(project,'assets')+path.sep))throw new Error('Audio trace must live within project assets.');
  const audioTrace=JSON.parse(await fs.readFile(tracePath,'utf8'));
  if(!['gravity','moon','shadow'].includes(audioTrace.scene)||!Array.isArray(audioTrace.samples)||audioTrace.fps!==requestedFps)throw new Error('Known scene audio trace fps must match video fps.');
  if(audioTraces[audioTrace.scene])throw new Error(`Duplicate audio trace for scene ${audioTrace.scene}.`);
  const bytes=await fs.readFile(path.join(project,audioTrace.source));
  if(createHash('sha256').update(bytes).digest('hex')!==audioTrace.sourceSha256)throw new Error('Audio trace source hash does not match.');
  audioTraces[audioTrace.scene]=audioTrace;
}
const probesOnly = process.argv.includes('--probes-only');
await fs.mkdir(tempDir, { recursive: true });
await fs.mkdir(outDir, { recursive: true });
const compiled = path.join(tempDir, 'WorldScenes.mjs');
const sourceText = await fs.readFile(path.join(project, 'src', 'WorldScenes.ts'), 'utf8');
const sourceSha256 = createHash('sha256').update(sourceText).digest('hex');
await build({ stdin: { contents: sourceText, loader: 'ts',
    sourcefile: 'WorldScenes.ts', resolveDir: path.join(project, 'src') },
  outfile: compiled, bundle: true, platform: 'node', format: 'esm', target: 'es2020' });
const { renderWorld, duration } = await import(pathToFileURL(compiled).href);

function alphaBox(image) {
  const probe = createCanvas(image.width, image.height), context = probe.getContext('2d');
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, image.width, image.height).data;
  let left = image.width, top = image.height, right = -1, bottom = -1;
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    if (data[(y * image.width + x) * 4 + 3] > 32) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  return right < 0 ? [0, 0, image.width, image.height] :
    [left, top, right - left + 1, bottom - top + 1];
}

async function renderFrame(scene, images, imageNames, state, surface, file) {
  const canvas = createCanvas(surface.width, surface.height);
  const context = canvas.getContext('2d'), bounds = [], drawn = [], backgrounds = [];
  const nativeDrawImage = context.drawImage.bind(context);
  context.drawImage = (...args) => {
    const key = imageNames.get(args[0]);
    if (key && context.globalAlpha > .1) {
      (key.startsWith('background') ? backgrounds : drawn).push(key);
    }
    if (args.length === 9 && key && !key.startsWith('background') && context.globalAlpha > .1) {
      const [x, y, w, h] = args.slice(5), matrix = context.getTransform();
      const corners = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([cx,cy]) =>
        [matrix.a*cx+matrix.c*cy+matrix.e, matrix.b*cx+matrix.d*cy+matrix.f]);
      const box = [Math.min(...corners.map(p => p[0])), Math.min(...corners.map(p => p[1])),
        Math.max(...corners.map(p => p[0])), Math.max(...corners.map(p => p[1]))];
      bounds.push({ asset: key, opacity: Number(context.globalAlpha.toFixed(3)),
        box: box.map(n => Number(n.toFixed(1))),
        outside: box[0] < 0 || box[1] < 0 || box[2] > surface.width || box[3] > surface.height });
    }
    return nativeDrawImage(...args);
  };
  context.setTransform(surface.width/1536, 0, 0, surface.height/1024, 0, 0);
  const result = renderWorld(context, images, state);
  const png = canvas.toBuffer('image/png');
  await fs.writeFile(path.join(outDir, file), png);
  manifest.frames.push({ file, scene, time: state.time, state, surface: surface.name,
    width: surface.width, height: surface.height, result, bounds,
    partnerPose: result.partnerPose ?? null, visibleAssets: [...new Set(drawn)],
    visibleBackgrounds: [...new Set(backgrounds)],
    pngSha256: createHash('sha256').update(png).digest('hex') });
  return canvas;
}

function renderProbe(scene, images, imageNames, state, label) {
  const canvas = createCanvas(640, 426), context = canvas.getContext('2d');
  const drawn = [], backgrounds = [], nativeDrawImage = context.drawImage.bind(context);
  context.drawImage = (...args) => {
    const key = imageNames.get(args[0]);
    if (key && context.globalAlpha > .1) {
      (key.startsWith('background') ? backgrounds : drawn).push(key);
    }
    return nativeDrawImage(...args);
  };
  context.setTransform(640/1536, 0, 0, 426/1024, 0, 0);
  const result = renderWorld(context, images, state);
  const pixels = context.getImageData(0, 0, 640, 426).data;
  return { label, scene, state, result, partnerPose: result.partnerPose ?? null,
    visibleAssets: [...new Set(drawn)], visibleBackgrounds: [...new Set(backgrounds)],
    pixelSha256: createHash('sha256').update(Buffer.from(pixels)).digest('hex') };
}

const scenes = ['gravity', 'moon', 'shadow'];
const times = [2, 11, 21, 29];
const transitionTimes = [5, 15, 26];
const surfaces = [
  { name: 'desktop', width: 1536, height: 1024, mobile: false },
  { name: 'mobile', width: 390, height: 260, mobile: true }
];
const manifest = {
  kind: 'offline-production-renderer-frames',
  disclaimer: 'Shared WorldScenes.ts rendered by @napi-rs/canvas; not browser screenshots. No page UI, audio, real API writes, or browser-level verification.',
  duration, source: 'src/WorldScenes.ts', sourceSha256, times, transitionTimes, outputName,
  audioTraceInputs:Object.fromEntries(Object.entries(audioTraces).map(([scene,trace])=>[scene,
    {source:trace.source,sourceSha256:trace.sourceSha256,fps:trace.fps,note:trace.note}])),
  baseState: { count: 1, poses: [], x: .64, y: .5, strength: 50, age: 100,
    interaction: 0, dragging: false, reduced: false, captureAge: 100 },
  assetBoxes: {}, assetSources: {}, frames: [], animations: [], behaviorMatrix: [], checks: [], additionalContactSheets: []
};
let prior;
if (probesOnly) {
  prior = JSON.parse(await fs.readFile(path.join(outDir, 'offline-render-verification.json'), 'utf8'));
  if (prior.sourceSha256 !== sourceSha256) throw new Error('Media manifest belongs to another renderer snapshot. Re-render final frames before probes.');
  if (!prior.assetSources) throw new Error('Media manifest has no asset fingerprints. Re-render final frames before probes.');
  manifest.frames = prior.frames;
  manifest.animations = prior.animations;
  manifest.additionalContactSheets=prior.additionalContactSheets||[];
}

for (const scene of scenes) {
  const assetDir = path.join(project, 'web', 'worlds', scene);
  const entries = (await fs.readdir(assetDir)).filter(name => name.endsWith('.png')).sort();
  const images = {}, imageNames = new Map();
  for (const file of entries) {
    const assetPath = path.join(assetDir, file), assetBytes = await fs.readFile(assetPath);
    // Decode by path: canvas's Buffer SVG heuristic mistakes C2PA PNG metadata's SVG icon for SVG pixels.
    const key = file.slice(0, -4), image = await loadImage(assetPath);
    // Match the live loader's alpha > 32 rule, but do not scan/crop backgrounds.
    const box = key.startsWith('background') ? [0, 0, image.width, image.height] : alphaBox(image);
    images[key] = { image, box }; imageNames.set(image, key);
    manifest.assetBoxes[`${scene}/${key}`] = box;
    const sha256 = createHash('sha256').update(assetBytes).digest('hex');
    manifest.assetSources[`${scene}/${key}`] = {
      source: `web/worlds/${scene}/${file}`, sha256, bytes: assetBytes.length,
      width: image.width, height: image.height, alphaScanned: !key.startsWith('background')
    };
    if (prior && prior.assetSources[`${scene}/${key}`]?.sha256 !== sha256) {
      throw new Error(`Media manifest belongs to another asset snapshot: ${scene}/${key}. Re-render final frames before probes.`);
    }
  }
  if (!probesOnly) for (const surface of surfaces) {
    const strip = createCanvas(surface.width * times.length, surface.height);
    const stripContext = strip.getContext('2d');
    for (let index = 0; index < times.length; index++) {
      const time = times[index];
      const state = { scene, time, ...manifest.baseState, mobile: surface.mobile };
      const file = `${scene}-${surface.name}-act-${index+1}-offline.png`;
      const canvas = await renderFrame(scene, images, imageNames, state, surface, file);
      stripContext.drawImage(canvas, index*surface.width, 0);
    }
    await fs.writeFile(path.join(outDir, `${scene}-${surface.name}-four-acts-offline.png`),
      strip.toBuffer('image/png'));
    for (const time of transitionTimes) {
      await renderFrame(scene, images, imageNames,
        { scene, time, ...manifest.baseState, mobile: surface.mobile }, surface,
        `${scene}-${surface.name}-transition-${time}s-offline.png`);
    }
    if (scene === 'shadow') {
      await renderFrame(scene, images, imageNames,
        { scene, time: 11, ...manifest.baseState, mobile: surface.mobile,
          age: .9, strength: 100, x: .12, interaction: 1 }, surface,
        `${scene}-${surface.name}-high-strength-leap-offline.png`);
    }
  }
  if (!probesOnly) for (const surface of surfaces) {
    // v8: inspect action and collection handoffs separately from the scripted story.
    for (const kind of ['action', 'capture']) {
      const beats = kind==='capture'?[.12,.7,1.9,2.8]:[.12,.7,1.5,2.8], strip = createCanvas(surface.width * beats.length, surface.height);
      const stripContext = strip.getContext('2d');
      for (let index = 0; index < beats.length; index++) {
        const age = beats[index], state = { scene, time: 5, ...manifest.baseState,
          mobile: surface.mobile, interaction: 1,
          ...(kind === 'action' ? { age } : { captureAge: age, captureX: .64, captureY: .5,
            capturePose: 'dancer-spin', count: 2, poses: scene === 'shadow' ?
              [{ x: .64, y: .5, time: 5, strength: 50, pose: 'dancer-spin' }] : [] }) };
        const canvas = await renderFrame(scene, images, imageNames, state, surface,
          `${scene}-${surface.name}-${kind}-beat-${index+1}-offline.png`);
        stripContext.drawImage(canvas, index * surface.width, 0);
      }
      await fs.writeFile(path.join(outDir, `${scene}-${surface.name}-${kind}-sequence-offline.png`),
        strip.toBuffer('image/png'));
    }
    for (const x of [.12, .9]) await renderFrame(scene, images, imageNames,
      { scene, time: 11, ...manifest.baseState, mobile: surface.mobile,
        age: .7, strength: 100, x, interaction: 1, dragging: true }, surface,
      `${scene}-${surface.name}-edge-${x < .5 ? 'left' : 'right'}-offline.png`);
    const detail=scene==='gravity'?{name:'growth',beats:[0,1,2,3,4]}:
      scene==='moon'?{name:'stitch',beats:[1.76,2.12,2.28,2.58]}:
        {name:'spin',beats:[.45,.68,.85,1.2,1.55,1.9,2.15]};
    const strip=createCanvas(surface.width*detail.beats.length,surface.height),stripContext=strip.getContext('2d');
    for(let index=0;index<detail.beats.length;index++){
      const beat=detail.beats[index],state={scene,time:5,...manifest.baseState,mobile:surface.mobile,
        ...(scene==='gravity'?{count:beat}:scene==='moon'?{count:1,captureAge:beat}:
          {age:beat,interaction:2})};
      const canvas=await renderFrame(scene,images,imageNames,state,surface,
        `${scene}-${surface.name}-${detail.name}-detail-${index+1}-offline.png`);
      stripContext.drawImage(canvas,index*surface.width,0);
    }
    await fs.writeFile(path.join(outDir,`${scene}-${surface.name}-${detail.name}-sequence-offline.png`),strip.toBuffer('image/png'));
    // v10: inspect a held input after the action has ended and the persistent
    // result chosen by a visitor, rather than relying only on whole-scene motion.
    const extraGroups=scene==='gravity'?[
      {name:'germination',states:[1.2,1.5,1.95,2.45,2.8].map(captureAge=>({count:4,captureAge,
        gardenPlots:[{x:.42,y:.745},{x:.49,y:.75},{x:.56,y:.745},{x:.62,y:.75}]}))},
      {name:'chosen-plot',states:[
        {count:1,gardenPlots:[{x:.43,y:.74}]},
        {count:1,gardenPlots:[{x:.61,y:.755}]},
        {count:1,gardenPlots:[{x:.43,y:.74}],gardenPreview:{x:.61,y:.755}}]}
    ]:scene==='shadow'?[
      {name:'held-light',states:[{x:.15,y:.25},{x:.15,y:.85},{x:.9,y:.25},{x:.9,y:.85}]
        .map(pointer=>({...pointer,dragging:true,age:5,interaction:2}))}
    ]:[];
    for(const group of extraGroups){
      const extraStrip=createCanvas(surface.width*group.states.length,surface.height),extraContext=extraStrip.getContext('2d');
      for(let index=0;index<group.states.length;index++){
        const canvas=await renderFrame(scene,images,imageNames,
          {scene,time:5,...manifest.baseState,mobile:surface.mobile,...group.states[index]},surface,
          `${scene}-${surface.name}-${group.name}-${index+1}-offline.png`);
        extraContext.drawImage(canvas,index*surface.width,0);
      }
      const file=`${scene}-${surface.name}-${group.name}-sequence-offline.png`;
      await fs.writeFile(path.join(outDir,file),extraStrip.toBuffer('image/png'));manifest.additionalContactSheets.push(file);
    }
    if(scene==='moon'){
      // Crop directly from exact shared-renderer frames; no redraw or image edit.
      const detailWidth=surface.mobile?175:600,detailHeight=surface.mobile?110:375;
      const crop=createCanvas(detailWidth*detail.beats.length,detailHeight),cropContext=crop.getContext('2d');
      for(let index=0;index<detail.beats.length;index++){
        const frame=await loadImage(path.join(outDir,`${scene}-${surface.name}-stitch-detail-${index+1}-offline.png`));
        const scale=surface.width/1536;
        cropContext.drawImage(frame,760*scale,500*scale,600*scale,375*scale,index*detailWidth,0,detailWidth,detailHeight);
      }
      const file=`moon-${surface.name}-stitch-closeup-sequence-offline.png`;
      await fs.writeFile(path.join(outDir,file),crop.toBuffer('image/png'));manifest.additionalContactSheets.push(file);
    }
  }
  const probeBase = { scene, time: 11, ...manifest.baseState, mobile: false };
  const probes = [
    { label: 'strength-0', state: { ...probeBase, strength: 0 } },
    { label: 'strength-100', state: { ...probeBase, strength: 100 } },
    { label: 'pointer-left', state: { ...probeBase, x: .12, age: .2, dragging: true, interaction: 1 } },
    { label: 'pointer-right', state: { ...probeBase, x: .9, age: .2, dragging: true, interaction: 1 } }
  ];
  probes.push(
    { label: 'finale-count-0', state: { ...probeBase, time: 29, count: 0 } },
    { label: 'finale-count-8', state: { ...probeBase, time: 29, count: 8 } },
    // Use the calm first-act handoff: the finale already forces the light carrier's brave pose.
    { label: 'partner-reaction-age-005', state: { ...probeBase, time: 5, age: .05, interaction: 1 } },
    { label: 'partner-reaction-age-150', state: { ...probeBase, time: 5, age: 1.5, interaction: 1 } }
  );
  for (const age of [.12, .7, 1.5, 2.8, 4]) probes.push({ label: `action-age-${age}`,
    state: { ...probeBase, time: 5, age, interaction: 1 } });
  for (const time of times) {
    probes.push({ label: `capture-act-${Math.floor(time/8)+1}-before`,
      state: { ...probeBase, time, count: 2 } });
    probes.push({ label: `capture-act-${Math.floor(time/8)+1}-during`,
      state: { ...probeBase, time, count: 2, captureAge: .7,
        captureX: .64, captureY: .5, capturePose: 'dancer-spin' } });
  }
  for (const captureAge of [.12, .7, 1.5, 2.8, 4]) probes.push({ label: `capture-age-${captureAge}`,
    state: { ...probeBase, time: 5, count: 2, captureAge, captureX: .64, captureY: .5,
      capturePose: 'dancer-spin' } });
  probes.push({ label: 'reduced-static-result', state: { ...probeBase, reduced: true,
    time: 5, age: 2.5, captureAge: 2.5, capturePose: 'dancer-spin' } });
  for(const x of [.15,.9])probes.push({label:`held-drag-${x<.5?'left':'right'}`,
    state:{...probeBase,time:5,age:5,interaction:2,dragging:true,x,y:.6}});
  if (scene === 'moon') probes.push(
    { label: 'ending-idle', state: { ...probeBase, time: 31 } },
    { label: 'ending-click', state: { ...probeBase, time: 31, age: .7, interaction: 1 } });
  if (scene === 'shadow') {
    for (const interaction of [0,1,2,3]) probes.push({ label: `ending-click-${interaction}`,
      state: { ...probeBase, time: 31, age: .7, interaction } });
    probes.push({ label: 'saved-leap-at-time-0', state: { ...probeBase, time: 2,
      poses: [{ x: .64, y: .5, time: 0, strength: 50, pose: 'dancer-leap' }] } });
  }
  if (scene === 'shadow') probes.push({ label: 'saved-spin-at-time-0', state: { ...probeBase, time: 2,
    poses: [{ x: .64, y: .5, time: 0, strength: 50, pose: 'dancer-spin' }] } });
  if(scene==='gravity'){
    for(const count of [0,1,2,3,4])probes.push({label:`growth-count-${count}`,state:{...probeBase,time:5,count}});
    for(const captureAge of [1.2,1.5,1.95,2.45,2.8])probes.push({label:`germination-age-${captureAge}`,
      state:{...probeBase,time:5,count:4,captureAge,gardenPlots:[{x:.42,y:.745},{x:.49,y:.75},{x:.56,y:.745},{x:.62,y:.75}]}});
    for(const x of [.43,.61])probes.push({label:`chosen-plot-${x<.5?'left':'right'}`,
      state:{...probeBase,time:5,count:1,gardenPlots:[{x,y:.75}]}});
    probes.push({label:'preview-without-new-plant',state:{...probeBase,time:5,count:1,
      gardenPlots:[{x:.43,y:.75}],gardenPreview:{x:.61,y:.75}}});
    probes.push({label:'rolled-memory-new-plant',state:{...probeBase,time:5,count:5,captureAge:1.5,
      gardenPlots:[{x:.49,y:.75},{x:.56,y:.745},{x:.62,y:.75},{x:.45,y:.755}]}});
    probes.push({label:'plots-outside-safe-island',state:{...probeBase,time:5,count:2,
      gardenPlots:[{x:-1,y:2},{x:4,y:-1}],gardenPreview:{x:4,y:4}}});
  }
  if(scene==='moon')for(const captureAge of [1.76,2.12,2.28,2.58])probes.push({label:`stitch-age-${captureAge}`,state:{...probeBase,time:5,count:1,captureAge}});
  if(scene==='shadow'){
    for(const y of [.25,.85])probes.push({label:`held-light-${y<.5?'high':'low'}`,
      state:{...probeBase,time:5,age:5,dragging:true,x:.65,y}});
    for(const reduced of [false,true])probes.push({label:`held-light-${reduced?'reduced':'normal'}-static`,
      state:{...probeBase,time:5,age:5,dragging:true,x:.65,y:.85,reduced}});
    for(const age of [.45,.68,.85,1.2,1.55,1.9,2.15])probes.push({label:`spin-age-${age}`,state:{...probeBase,time:5,age,interaction:2}});
  }
  if(scene==='shadow'||scene==='gravity')for(const reduced of [false,true])for(const level of [0,1])probes.push({label:`audio-${reduced?'reduced':'normal'}-${level}`,
    state:{...probeBase,reduced,audio:{energy:level,low:level,high:level}}});
  manifest.behaviorMatrix.push(...probes.map(({ state, label }) =>
    renderProbe(scene, images, imageNames, state, label)));
  if (animated) {
    const fps = requestedFps, width = 640, height = 426;
    const frameDir = path.join(tempDir, `${scene}-${fps}fps-${width}-${sourceSha256.slice(0,8)}`);
    await fs.mkdir(frameDir, { recursive: true });
    const canvas = createCanvas(width, height), context = canvas.getContext('2d');
    context.setTransform(width/1536, 0, 0, height/1024, 0, 0);
    for (let frame = 0; frame < duration * fps; frame++) {
      const time=frame/fps, state={ scene, time, ...manifest.baseState, mobile:false };
      if(interactionDemo){
        const actionTimes=[3.5,10.5,18.5,26.5], captureTimes=[5,13,21,29];
        const actionIndex=actionTimes.findLastIndex(beat=>time>=beat);
        const captureIndex=captureTimes.findLastIndex(beat=>time>=beat);
        const remembered=['dancer-leap','dancer-bow','dancer-spin','dancer'];
        state.age=actionIndex<0?100:time-actionTimes[actionIndex];
        state.interaction=actionIndex+1;
        state.x=actionIndex<0?.64:[.35,.72,.48,.65][actionIndex];
        state.captureAge=captureIndex<0?100:time-captureTimes[captureIndex];
        state.captureX=state.x;state.captureY=.5;
        state.capturePose=captureIndex<0?undefined:remembered[captureIndex];
        state.count=1+captureIndex+1;
        state.poses=scene==='shadow'?captureTimes.slice(0,captureIndex+1).map((beat,index)=>
          ({x:[.35,.72,.48,.65][index],y:.5,time:beat,strength:50,pose:remembered[index]})).slice(-3):[];
        if(scene==='gravity'){
          state.count=captureIndex+1;
          state.gardenPlots=[{x:.42,y:.747},{x:.62,y:.755},{x:.53,y:.735},{x:.48,y:.765}].slice(0,state.count);
        }
      }
      const audioTrace=audioTraces[scene];
      if(audioTrace){const sample=audioTrace.samples[frame];if(!sample)throw new Error(`Missing ${scene} audio trace frame.`);state.audio={energy:sample.energy,low:sample.low,high:sample.high};}
      renderWorld(context, images, state);
      await fs.writeFile(path.join(frameDir, `${String(frame).padStart(4, '0')}.png`),
        canvas.toBuffer('image/png'));
      if (frame % 64 === 0) console.log(`Offline renderer ${scene}: ${frame}/${duration*fps} frames`);
    }
    const videoPath = path.join(outDir, `${scene}-32s-${interactionDemo?'interaction-':''}offline.mp4`);
    const ffmpeg = process.env.CODEX_WORKSPACE_FFMPEG ||
      'D:/26project/26audio_and_video_project/ffmpeg-n6.1.3-win64-gpl-shared-6.1/bin/ffmpeg.exe';
    const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y',
      '-framerate', String(fps), '-i', path.join(frameDir, '%04d.png'), '-an',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-t', String(duration), videoPath],
    { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) throw new Error(`MP4 export failed: ${result.stderr}`);
    const ffprobe = path.join(path.dirname(ffmpeg), 'ffprobe.exe');
    const probe = spawnSync(ffprobe, ['-v', 'error', '-show_entries',
      'format=duration,size:stream=width,height,nb_frames,avg_frame_rate', '-of', 'json', videoPath],
    { encoding: 'utf8', windowsHide: true });
    if (probe.status !== 0) throw new Error(`MP4 verification failed: ${probe.stderr}`);
    const media = JSON.parse(probe.stdout), receipt = { file: path.basename(videoPath),
      width: Number(media.streams[0].width), height: Number(media.streams[0].height),
      frames: Number(media.streams[0].nb_frames), sourceFps: fps,
      durationMs: Math.round(Number(media.format.duration)*1000), bytes: Number(media.format.size) };
    manifest.animations.push({ ...receipt,
      audioTraceUsed:!!audioTraces[scene],
      audioSourceSha256:audioTraces[scene]?.sourceSha256??null,
      interactionDemo, actionTimes:interactionDemo?[3.5,10.5,18.5,26.5]:[],
      captureTimes:interactionDemo?[5,13,21,29]:[],
      note: 'Offline shared renderer animation; not a browser recording. Interaction demo supplies scripted action/collection state, not real UI events. PNG frames are unaltered production renderer output. FFmpeg used only to export silent H.264 MP4.' });
    console.log(JSON.stringify(receipt));
  }
}
// Keep behavioral claims tied to pixels and the exact asset snapshot, not just chapter copy.
const expectedActionPoses = {
  gravity: ['stone-awake', 'wind-gust'],
  moon: ['tailor-chase', 'moon-hiccup'],
  shadow: ['dancer-leap', 'dancer-bow']
};
const expectedFinalePartners = { gravity: 'wind-rest', moon: 'tailor-proud', shadow: 'light-brave' };
const newResponsePoses={gravity:'stone-proud',moon:'moon-content',shadow:'dancer-spin'};
for (const scene of scenes) {
  const sceneFrames = manifest.frames.filter(frame => frame.scene === scene);
  const sceneProbes = manifest.behaviorMatrix.filter(probe => probe.scene === scene);
  const visible = new Set(sceneFrames.flatMap(frame => frame.visibleAssets || []));
  manifest.checks.push({label:'response-pose-visible',scene,asset:newResponsePoses[scene],
    passed:visible.has(newResponsePoses[scene]),
    evidence:sceneFrames.filter(frame=>frame.visibleAssets?.includes(newResponsePoses[scene])).map(frame=>frame.file)});
  for (const asset of expectedActionPoses[scene]) manifest.checks.push({
    label: 'action-pose-visible', scene, asset, passed: visible.has(asset),
    evidence: sceneFrames.filter(frame => frame.visibleAssets?.includes(asset)).map(frame => frame.file)
  });
  const finale = sceneFrames.filter(frame => frame.time === 29);
  manifest.checks.push({ label: 'finale-background-visible', scene,
    passed: finale.length === surfaces.length && finale.every(frame => frame.visibleBackgrounds?.includes('background-finale')),
    evidence: finale.map(frame => ({ file: frame.file, visibleBackgrounds: frame.visibleBackgrounds })) });
  manifest.checks.push({ label: 'finale-partner-visible', scene, asset: expectedFinalePartners[scene],
    passed: finale.length === surfaces.length && finale.every(frame => frame.visibleAssets?.includes(expectedFinalePartners[scene])),
    evidence: finale.map(frame => ({ file: frame.file, partnerPose: frame.partnerPose, visibleAssets: frame.visibleAssets })) });
  const count0 = sceneProbes.find(probe => probe.label === 'finale-count-0');
  const count8 = sceneProbes.find(probe => probe.label === 'finale-count-8');
  manifest.checks.push({ label: 'saved-count-changes-finale', scene,
    passed: Boolean(count0 && count8 && count0.pixelSha256 !== count8.pixelSha256),
    evidence: [count0, count8].filter(Boolean).map(({ label, pixelSha256, partnerPose, visibleAssets }) =>
      ({ label, pixelSha256, partnerPose, visibleAssets })) });
  const heldDrag=sceneProbes.filter(probe=>probe.label.startsWith('held-drag-'));
  manifest.checks.push({label:'held-drag-responds-after-action-finishes',scene,
    passed:heldDrag.length===2&&heldDrag.every(probe=>probe.result.actionPhase==='idle')&&heldDrag[0].pixelSha256!==heldDrag[1].pixelSha256,
    evidence:heldDrag.map(({label,state,pixelSha256})=>({label,x:state.x,age:state.age,pixelSha256}))});
  const early = sceneProbes.find(probe => probe.label === 'partner-reaction-age-005');
  const late = sceneProbes.find(probe => probe.label === 'partner-reaction-age-150');
  const recipient=scene==='gravity'?'pose':'partnerPose';
  manifest.checks.push({ label: 'delayed-recipient-replies', scene, recipient,
    passed: Boolean(early && late && typeof early.result[recipient] === 'string' &&
      early.result[recipient] !== late.result[recipient] && early.pixelSha256 !== late.pixelSha256),
    evidence: [early, late].filter(Boolean).map(({ label, pixelSha256, result, visibleAssets }) =>
      ({ label, pixelSha256, recipientPose:result[recipient], visibleAssets })) });
  const actions = sceneProbes.filter(probe => probe.label.startsWith('action-age-'));
  manifest.checks.push({ label: 'action-has-four-stages-and-idle', scene,
    passed: new Set(actions.map(probe => probe.result.actionPhase)).size === 5 &&
      actions.every(probe => typeof probe.result.actionPhase === 'string'),
    evidence: actions.map(({label,result}) => ({label,actionPhase:result.actionPhase})) });
  for (let act=1; act<=4; act++) {
    const before=sceneProbes.find(probe=>probe.label===`capture-act-${act}-before`);
    const during=sceneProbes.find(probe=>probe.label===`capture-act-${act}-during`);
    manifest.checks.push({ label: 'collection-visible-in-every-act', scene, act,
      passed: Boolean(before && during && before.pixelSha256 !== during.pixelSha256),
      evidence: [before,during].filter(Boolean).map(({label,pixelSha256,result})=>
        ({label,pixelSha256,capturePhase:result.capturePhase})) });
  }
  const captureStages=sceneProbes.filter(probe=>probe.label.startsWith('capture-age-'));
  manifest.checks.push({ label: 'collection-progresses-and-settles', scene,
    passed: new Set(captureStages.map(probe=>probe.pixelSha256)).size >=4 &&
      captureStages.every(probe=>Number.isFinite(probe.result.captureProgress)),
    evidence:captureStages.map(({label,pixelSha256,result})=>({label,pixelSha256,
      captureProgress:result.captureProgress,capturePhase:result.capturePhase})) });
  if(scene==='moon'){
    const stitching=sceneProbes.filter(probe=>probe.label.startsWith('stitch-age-'));
    manifest.checks.push({label:'three-stitches-evolve',scene,
      passed:new Set(stitching.map(probe=>probe.result.stitchStage)).size>=3&&new Set(stitching.map(probe=>probe.pixelSha256)).size===stitching.length,
      evidence:stitching.map(({label,result})=>({label,stitchStage:result.stitchStage}))});
    const placements=stitching.map(probe=>probe.result.patchPlacements.at(-1));
    manifest.checks.push({label:'saved-patch-tightens-and-turns-between-stitches',scene,
      passed:placements.length>=3&&placements.every(point=>point&&Number.isFinite(point.angle))&&
        Math.max(...placements.map(point=>point.x))-Math.min(...placements.map(point=>point.x))>5&&
        Math.max(...placements.map(point=>point.angle))-Math.min(...placements.map(point=>point.angle))>.12,
      evidence:stitching.map(({label,result})=>({label,patch:result.patchPlacements.at(-1)}))});
    const idle=sceneProbes.find(probe=>probe.label==='ending-idle');
    const click=sceneProbes.find(probe=>probe.label==='ending-click');
    manifest.checks.push({label:'saved-finale-does-not-mask-hiccup',scene,
      passed:idle?.result.pose==='moon-content' && click?.result.pose==='moon-hiccup',
      evidence:[idle,click].filter(Boolean).map(({label,result})=>({label,pose:result.pose}))});
  }
  if(scene==='gravity'||scene==='shadow'){
    const normal=sceneProbes.filter(probe=>probe.label.startsWith('audio-normal'));
    const reduced=sceneProbes.filter(probe=>probe.label.startsWith('audio-reduced'));
    manifest.checks.push({label:`audio-signal-affects-${scene}`,scene,
      passed:normal.length===2&&normal[0].pixelSha256!==normal[1].pixelSha256,
      note:'Artificial input probes test optional signal rendering; not actual browser audio evidence.'});
    manifest.checks.push({label:'reduced-motion-ignores-audio',scene,
      passed:reduced.length===2&&reduced[0].pixelSha256===reduced[1].pixelSha256});
  }
  if(scene==='shadow'){
    const heldLight=sceneProbes.filter(probe=>/^held-light-(high|low)$/.test(probe.label));
    manifest.checks.push({label:'dancer-ducks-under-held-light',scene,
      passed:heldLight.length===2&&heldLight[0].pixelSha256!==heldLight[1].pixelSha256&&
        heldLight[0].result.followCrouch<heldLight[1].result.followCrouch,
      evidence:heldLight.map(({label,result})=>({label,followLean:result.followLean,followCrouch:result.followCrouch}))});
    const reducedLight=sceneProbes.find(probe=>probe.label==='held-light-reduced-static');
    const normalLight=sceneProbes.find(probe=>probe.label==='held-light-normal-static');
    manifest.checks.push({label:'reduced-motion-retains-selected-light-pose',scene,
      passed:!!reducedLight&&!!normalLight&&reducedLight.result.followCrouch===normalLight.result.followCrouch&&
        reducedLight.result.followLean===normalLight.result.followLean});
    const spins=sceneProbes.filter(probe=>probe.label.startsWith('spin-age-'));
    manifest.checks.push({label:'spin-is-continuous',scene,
      passed:new Set(spins.map(probe=>probe.result.spinPhase)).size===spins.length&&new Set(spins.map(probe=>probe.pixelSha256)).size===spins.length,
      evidence:spins.map(({label,result})=>({label,spinPhase:result.spinPhase}))});
    const variants=sceneProbes.filter(probe=>probe.label.startsWith('ending-click-'));
    manifest.checks.push({label:'four-ending-action-poses',scene,
      passed:variants.length===4 && new Set(variants.map(probe=>probe.result.pose)).size===4,
      evidence:variants.map(({label,result})=>({label,pose:result.pose}))});
  }
  if(scene==='gravity'){
    const growth=sceneProbes.filter(probe=>probe.label.startsWith('growth-count'));
    const firstActs=sceneFrames.filter(frame=>frame.time===2);
    manifest.checks.push({label:'collection-grows-persistent-saplings',scene,
      passed:new Set(growth.map(probe=>probe.pixelSha256)).size===growth.length&&firstActs.every(frame=>frame.visibleAssets.includes('tree')),
      evidence:growth.map(({label,result})=>({label,growthStage:result.growthStage}))});
    const phases=sceneProbes.filter(probe=>probe.label.startsWith('germination-age-'));
    manifest.checks.push({label:'new-plant-germinates-unfolds-and-settles',scene,
      passed:new Set(phases.map(probe=>probe.result.gardenGrowthPhase)).size===5&&
        new Set(phases.map(probe=>probe.pixelSha256)).size===5&&
        phases[0].result.gardenPlants.at(-1).growth===0&&phases.at(-1).result.gardenPlants.at(-1).growth===1,
      evidence:phases.map(({label,result})=>({label,phase:result.gardenGrowthPhase,plant:result.gardenPlants.at(-1)}))});
    const selected=sceneProbes.filter(probe=>probe.label.startsWith('chosen-plot-'));
    manifest.checks.push({label:'chosen-plot-changes-persistent-world',scene,
      passed:selected.length===2&&selected[0].pixelSha256!==selected[1].pixelSha256&&
        selected[0].result.gardenPlants[0].x!==selected[1].result.gardenPlants[0].x,
      evidence:selected.map(({label,result,pixelSha256})=>({label,plant:result.gardenPlants[0],pixelSha256}))});
    const rolled=sceneProbes.find(probe=>probe.label==='rolled-memory-new-plant');
    manifest.checks.push({label:'fifth-collection-keeps-surviving-plants-grown',scene,
      passed:rolled?.result.gardenPlants.length===4&&rolled.result.gardenPlants.slice(0,3).every(plant=>plant.growth===1)&&
        rolled.result.gardenPlants[3].growth<1,
      evidence:rolled?.result.gardenPlants});
    const preview=sceneProbes.find(probe=>probe.label==='preview-without-new-plant');
    manifest.checks.push({label:'preview-does-not-plant-or-increment-count',scene,
      passed:preview?.result.gardenPlants.length===1&&preview.result.gardenPreviewAnchor?.x===.61&&
        preview.pixelSha256!==selected[0].pixelSha256,
      evidence:preview?{plants:preview.result.gardenPlants,preview:preview.result.gardenPreviewAnchor}:null});
    const unsafe=sceneProbes.find(probe=>probe.label==='plots-outside-safe-island');
    manifest.checks.push({label:'plant-and-preview-roots-stay-on-safe-island',scene,
      passed:!!unsafe&&[...unsafe.result.gardenPlants,unsafe.result.gardenPreviewAnchor].every(plot=>
        plot.x>=.39&&plot.x<=.66&&plot.y>=.73&&plot.y<=.765),
      evidence:unsafe?{plants:unsafe.result.gardenPlants,preview:unsafe.result.gardenPreviewAnchor}:null});
  }
}
manifest.counts = { frames: manifest.frames.length,
  behaviorProbes: manifest.behaviorMatrix.length, contactSheets: scenes.length * surfaces.length * 4+manifest.additionalContactSheets.length,
  animations: manifest.animations.length, assetSources: Object.keys(manifest.assetSources).length };
await fs.writeFile(path.join(outDir, 'offline-render-verification.json'),
  JSON.stringify(manifest, null, 2) + '\n');
const outsideCharacters = manifest.frames.flatMap(frame => frame.bounds
  .filter(bound => bound.outside && /^(stone|wind|moon|tailor|dancer|light)/.test(bound.asset))
  .map(bound => ({ scene: frame.scene, surface: frame.surface, time: frame.time, ...bound })));
console.log(JSON.stringify({ kind: manifest.kind, outDir, frames: manifest.frames.length,
  contactSheets: manifest.counts.contactSheets, outsideCharacters, checks: manifest.checks,
  counts: manifest.counts,
  behaviorMatrix: manifest.behaviorMatrix.map(({ label, scene, result, partnerPose, visibleAssets, visibleBackgrounds, pixelSha256 }) =>
    ({ label, scene, pose: result.pose, partnerPose, visibleAssets, visibleBackgrounds, pixelSha256 })) }, null, 2));
