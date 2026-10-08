import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const {chromium}=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:2560,height:1200},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(root+'assets/project-overview-v20.html').href);
 await page.evaluate(()=>document.fonts.ready);
 const layout=await page.evaluate(()=>({
  dimensions:{width:document.getElementById('poster').offsetWidth,height:document.getElementById('poster').offsetHeight},
  images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),
  matrixRows:document.querySelectorAll('.matrix .row').length,
  horizontalOverflow:[...document.querySelectorAll('.header,.badge,.steps,.matrix,.row,.effect,.method,.panel,.engineering,.flow,.evidence,.limits,.footer')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({class:e.className,width:e.clientWidth,scrollWidth:e.scrollWidth})),
  typography:getComputedStyle(document.body).fontFamily,
  sections:[...document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent),
 }));
 assert.equal(layout.images.length,3);assert.ok(layout.images.every(i=>i.loaded));assert.equal(layout.matrixRows,9);
 assert.deepEqual(layout.horizontalOverflow,[]);assert.deepEqual(errors,[]);
 await page.locator('#poster').screenshot({path:root+'assets/project-overview-v20.png'});
 await mkdir(root+'.tmp/overview-v20',{recursive:true});
 for(const [name,selector] of [['matrix','.matrix'],['sidebar','.sidebar'],['bottom','.limits']])await page.locator(selector).screenshot({path:root+'.tmp/overview-v20/'+name+'.png'});
 const paths=['assets/project-overview-v20.html','assets/project-overview-v20.png','assets/overview-courtyard-v20.png','assets/original.png','assets/cat-walk-v20.jpg','web/app.js'];
 const hashes={};for(const path of paths)hashes[path]=sha(await readFile(root+path));
 const png=await readFile(root+'assets/project-overview-v20.png');
 const pngDimensions={width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
 await writeFile(root+'notes/overview-render-v20.json',JSON.stringify({date:new Date().toISOString(),method:'Deterministic HTML/CSS infographic, rendered locally by Chromium. Text is source-backed and editable; pictures are existing or newly captured native runtime screenshots, cropped by CSS in presentation. No scene-source modifications, no image generation, no new full runtime acceptance.',layout,pngDimensions,errors,hashes,visualReview:'pending'},null,2)+'\n');
 console.log(JSON.stringify({output:'assets/project-overview-v20.png',layout,bytes:(await readFile(root+'assets/project-overview-v20.png')).byteLength}));
}finally{await browser.close();}
