import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
const {chromium}=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:2560,height:1200},deviceScaleFactor:1});
 await page.goto(pathToFileURL(root+'web/assets/library-value-map-v21.html').href);
 await page.evaluate(()=>document.fonts.ready);
 const layout=await page.evaluate(()=>({images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),rows:document.querySelectorAll('.map-row').length,overflow:[...document.querySelectorAll('.top,.state,.map-row,.panel,.callout,.strip,.scope-grid article,.future,.footer')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className)}));
 assert.equal(layout.rows,8);assert.ok(layout.images.every(i=>i.loaded));assert.deepEqual(layout.overflow,[]);
 await page.locator('#poster').screenshot({path:root+'web/assets/library-value-map-v21.png'});
 await mkdir(root+'.tmp/understanding-v21',{recursive:true});
 for(const [name,selector] of [['matrix','.matrix'],['sidebar','.sidebar'],['bottom','.future']])await page.locator(selector).screenshot({path:root+'.tmp/understanding-v21/'+name+'.png'});
 const png=await readFile(root+'web/assets/library-value-map-v21.png'),width=png.readUInt32BE(16),height=png.readUInt32BE(20);
 let index=await readFile(root+'web/index.html','utf8');index=index.replace('loading="lazy" width="2560" height="3800"','loading="lazy" width="'+width+'" height="'+height+'"');await writeFile(root+'web/index.html',index);
 const hashes={};for(const p of ['web/index.html','web/understanding-v21.css','web/assets/library-value-map-v21.html','web/assets/library-value-map-v21.png','web/assets/original-experience-v21.png','web/assets/courtyard-current-v21.png','web/app.js'])hashes[p]=sha(await readFile(root+p));
 await writeFile(root+'notes/understanding-render-v21.json',JSON.stringify({date:new Date().toISOString(),version:21,scope:'Static explanation and deterministic infographic. No new scene behaviour, reconstruction, manufacturing, or consistency acceptance workflow.',layout,image:{path:'web/assets/library-value-map-v21.png',width,height,bytes:png.length},hashes,visualReview:'pending',method:'Local HTML/CSS rendering. Embedded pictures are original runtime and current v20 canvas screenshots; CSS crops their presentation. No generated substitute for runtime evidence.'},null,2)+'\n');
 console.log(JSON.stringify({image:{width,height,bytes:png.length},layout}));
}finally{await browser.close();}
