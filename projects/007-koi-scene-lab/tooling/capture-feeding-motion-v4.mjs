import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const frameDir=root+'.tmp/feeding-motion-v4/';
const output=root+'assets/feeding-motion-v4.gif';
await mkdir(frameDir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const errors=[],frames=[];
try{
  const page=await browser.newPage({viewport:{width:1536,height:1120}});
  page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:8947/#scene',{timeout:90000});
  await page.waitForFunction(()=>window.__courtyard?.frameIndex>2,null,{timeout:120000});
  await page.evaluate(()=>{const c=window.__courtyard;c.active=false;c.reset();});
  await page.locator('#feed').click();
  const advance=seconds=>page.evaluate(seconds=>{const c=window.__courtyard;for(let t=0;t<seconds-1e-7;t+=.025)c.updateDynamics(Math.min(.025,seconds-t));},seconds);
  await advance(1.3);
  const fixedCamera=await page.evaluate(()=>{
    const c=window.__courtyard,p=c.interaction.grain.getWorldPosition(c.interaction.rig.root.position.clone());
    c.camera.position.set(p.x-.23,p.y+.25,p.z+.22);
    c.controls.target.copy(p).add({x:.018,y:.012,z:0});
    c.camera.fov=44;c.camera.updateProjectionMatrix();c.transition=null;c.controls.update();
    return {position:c.camera.position.toArray(),target:c.controls.target.toArray(),fov:c.camera.fov};
  });
  const clip=await page.locator('#scene-canvas').boundingBox();
  for(let i=0;i<17;i++){
    if(i)await advance(.1);
    const frame=await page.evaluate(fixed=>{
      const c=window.__courtyard;
      c.transition=null;c.camera.position.fromArray(fixed.position);c.controls.target.fromArray(fixed.target);
      c.camera.fov=fixed.fov;c.camera.updateProjectionMatrix();c.controls.update();
      c.water.update(c.time,c.settings,c.sunDirection,c.sun.color,0);
      c.water.renderPasses([c.school.group,c.school.food],[c.waterfall.group,c.interaction.rig.root]);
      c.composer.render();document.body.classList.add('clean-scene');
      const h=c.interaction;
      return {time:c.time,mode:h.mode,phase:h.phase,gap:h.rig.pinchGap,emitted:h.emitted,
        held:h.grain.children.filter(m=>m.visible).length,
        pellets:c.school.food.children.filter(m=>m.visible).map(m=>({position:m.position.toArray(),landed:Boolean(m.userData.particle?.landed),eaten:Boolean(m.userData.particle?.eaten)}))};
    },fixedCamera);
    const filename=String(i).padStart(3,'0')+'.png';
    await page.screenshot({path:frameDir+filename,clip,timeout:90000});
    frames.push({frame:i,file:filename,...frame});
    console.log('Captured '+filename+' at '+frame.time.toFixed(2)+' s; released '+frame.emitted+' / 6');
  }
  const python="from pathlib import Path\nfrom PIL import Image\nimport sys\nframes_dir=Path(sys.argv[1])\noutput=Path(sys.argv[2])\nimages=[]\nfor path in sorted(frames_dir.glob('[0-9][0-9][0-9].png')):\n    im=Image.open(path).convert('RGB')\n    im=im.resize((760,round(im.height*760/im.width)),Image.Resampling.LANCZOS)\n    images.append(im)\npalette=images[0].quantize(colors=256)\nquantized=[im.quantize(palette=palette,dither=Image.Dither.FLOYDSTEINBERG) for im in images]\ndurations=[400]+[100]*(len(quantized)-2)+[400]\nquantized[0].save(output,save_all=True,append_images=quantized[1:],duration=durations,loop=0,disposal=2,optimize=False)\nprint(str(output)+'; '+str(len(quantized))+' frames; '+str(quantized[0].size))\n";
  await writeFile(frameDir+'encode.py',python);
  const encoded=spawnSync('D:/software/python310/python.exe',[frameDir+'encode.py',frameDir,output],{encoding:'utf8'});
  if(encoded.status!==0)throw new Error(encoded.stderr||'GIF encoding failed');
  const result={createdAt:new Date().toISOString(),source:'Actual local browser WebGL rendering, without added scene elements',url:'http://127.0.0.1:8947/#scene',simulationStep:.025,captureStep:.1,frameCount:frames.length,simulationStart:frames[0].time,simulationEnd:frames.at(-1).time,frameDurationsMs:[400,...Array(frames.length-2).fill(100),400],fixedCamera,output,frames,errors};
  await writeFile(root+'notes/feeding-motion-v4.json',JSON.stringify(result,null,2));
  console.log(encoded.stdout.trim());console.log(JSON.stringify({frames:frames.length,errors,output}));
  if(errors.length)process.exitCode=1;
}finally{await browser.close();}
