import {createRequire} from 'node:module';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const {chromium}=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const expected=sha(await readFile(root+'web/app.js'));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:1120},deviceScaleFactor:1});
const errors=[],external=[];
page.setDefaultTimeout(60000);
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.route('**/*',r=>{const url=new URL(r.request().url());if(url.origin==='http://127.0.0.1:8947'||['data:','blob:'].includes(url.protocol))return r.continue();external.push(url.href);return r.abort();});
let served;
page.on('response',r=>{if(new URL(r.url()).pathname==='/app.js')r.body().then(b=>served=sha(b));});
try{
 await page.goto('http://127.0.0.1:8947/?v='+expected.slice(0,8)+'#scene',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__courtyard?.animals.cat&&document.getElementById('scene-loader').hidden);
 await page.locator('#scene-canvas').focus();
 await page.keyboard.press('Space');
 assert.equal(await page.locator('#pause-toggle').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(served,expected);
 await page.locator('#scene-canvas').screenshot({path:root+'assets/overview-courtyard-v20.png'});
 const evidence=await page.evaluate(()=>({time:window.__courtyard.time,paused:window.__courtyard.settings.paused,view:document.getElementById('view-select').value,fishCount:window.__courtyard.settings.fishCount}));
 assert.equal(errors.length,0);assert.equal(external.length,0);
 await writeFile(root+'notes/overview-capture-v20.json',JSON.stringify({date:new Date().toISOString(),bundleSha256:expected,servedBundleSha256:served,capture:'assets/overview-courtyard-v20.png',captureSha256:sha(await readFile(root+'assets/overview-courtyard-v20.png')),evidence,errors,external,method:'User-authorized isolated localhost Chromium. Default courtyard view; native Space pause; raw canvas screenshot. Presentation capture, not a new full functional or hardware-performance acceptance.'},null,2)+'\n');
 console.log(JSON.stringify({capture:'assets/overview-courtyard-v20.png',bundle:expected,evidence,errors,external}));
}finally{await browser.close();}
