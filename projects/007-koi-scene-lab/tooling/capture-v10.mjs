import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {stat} from 'node:fs/promises';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const suffix=process.argv.includes('--before')?'before-v10':'v10';
if(suffix.startsWith('before')){try{await stat(root+'assets/shoal-'+suffix+'.png');throw new Error('Baseline already exists; refusing to overwrite historical capture');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1536,height:1120},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:8947/?capture='+suffix+'#scene',{timeout:90000});
 await page.waitForFunction(()=>window.__courtyard?.frameIndex>2,null,{timeout:120000});
 await page.evaluate(()=>{const c=window.__courtyard;c.active=false;c.reset();c.setView('shoal',true);c.renderCurrent();});
 await page.locator('#scene-canvas').screenshot({path:root+'assets/shoal-'+suffix+'.png',timeout:90000});
 await page.locator('#fish-shot').selectOption('detail');await page.locator('#fish-inspect').click();
 await page.evaluate(()=>{const c=window.__courtyard,t=c.transition;c.camera.position.copy(t.to);c.controls.target.copy(t.toTarget);c.camera.fov=t.fov;c.camera.updateProjectionMatrix();for(let i=0;i<60;i++)c.updateDynamics(1/60);const target=c.fishObservationTarget(c.followFish);c.camera.position.add(target.clone().sub(c.controls.target));c.controls.target.copy(target);c.transition=null;c.renderCurrent();});
 await page.locator('#scene-canvas').screenshot({path:root+'assets/koi-detail-'+suffix+'.png',timeout:90000});
 await page.evaluate(()=>{const c=window.__courtyard;c.reset();c.interaction.start('feed');for(let i=0;i<64;i++)c.updateDynamics(.025);const h=c.interaction,p=h.point;c.transition=null;c.camera.position.set(p.x-.62,p.y+.68,p.z+.85);c.controls.target.set(p.x,p.y+.055,p.z-.08);c.camera.fov=46;c.camera.updateProjectionMatrix();c.controls.update();c.renderCurrent();});
 await page.locator('#scene-canvas').screenshot({path:root+'assets/feeding-'+suffix+'.png',timeout:90000});
 console.log('Captured actual WebGL: '+suffix);
}finally{await browser.close();}
