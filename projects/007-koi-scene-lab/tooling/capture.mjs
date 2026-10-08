import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),stamp=process.argv[2]||'final';
await mkdir(root+'assets',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const errors=[],requests=[];
try{
 const page=await browser.newPage({viewport:{width:1536,height:1120},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:8947/#scene',{timeout:90000});
 await page.waitForFunction(()=>window.__courtyard?.frameIndex>3,null,{timeout:120000});
 await page.evaluate(()=>window.__courtyard.active=false);
 await page.screenshot({path:root+'assets/studio-'+stamp+'.png',fullPage:true,timeout:90000});
 await page.evaluate(()=>document.body.classList.add('clean-scene'));
 const clip=await page.locator('#scene-canvas').boundingBox();
 await page.screenshot({path:root+'assets/scene-'+stamp+'.png',clip,timeout:90000});
 const debug=await page.evaluate(()=>({frame:window.__courtyard.frameIndex,time:window.__courtyard.time,
  info:window.__courtyard.renderer.info.render,size:[window.__courtyard.canvas.width,window.__courtyard.canvas.height],
  children:window.__courtyard.root.children.length,referenceSize:[document.querySelector('#reference-overlay').naturalWidth,document.querySelector('#reference-overlay').naturalHeight],
  overflow:document.documentElement.scrollWidth>innerWidth}));
 await writeFile(root+'notes/capture-'+stamp+'.json',JSON.stringify({debug,errors,requests},null,2));
 console.log(JSON.stringify({debug,errors,screenshot:root+'assets/scene-'+stamp+'.png'}));
}finally{await browser.close();}
