import { createRequire } from 'node:module';
import { writeFile,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const results=[];
for(const [name,target] of [['research-catalog','https://yydshly.github.io/0930_codex_project/'],['wikipedia','https://en.wikipedia.org/wiki/Stick_figure']]){
  const page=await browser.newPage({viewport:{width:1440,height:900}});const requests=[];const errors=[];
  page.on('response',r=>{if(/\/api\/page|\/p\//.test(r.url()))requests.push({url:r.url(),status:r.status()});});
  page.on('pageerror',error=>errors.push(error.message));
  const url=`https://destroy.spritefusion.com/?url=${encodeURIComponent(target)}`;
  let result={name,target,url,loaded:false,requests,errors};
  try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>{const hud=document.getElementById('hud'),loading=document.getElementById('loading');return hud&&!hud.classList.contains('hidden')&&loading?.classList.contains('hidden');},undefined,{timeout:55000});
    result.loaded=true;result.initialProgress=await page.locator('#hud-pct').innerText();
    await page.waitForTimeout(350); // Let the first game frame present before capturing evidence.
    await page.screenshot({path:path.join(root,'assets',name==='research-catalog'?'source-effect.png':'source-wikipedia.png')});
    const canvas=await page.locator('#game').boundingBox();
    await page.mouse.move(canvas.x+canvas.width*.48,canvas.y+canvas.height*.5);await page.mouse.down();await page.waitForTimeout(2000);await page.mouse.up();
    result.afterShotProgress=await page.locator('#hud-pct').innerText();
    await page.screenshot({path:path.join(root,'assets',`source-${name}-playing.png`)});
  }catch(error){result.failure=error.message;result.visibleText=(await page.locator('body').innerText()).slice(0,2200);await page.screenshot({path:path.join(root,'assets',`source-${name}-unverified.png`)});}
  results.push(result);console.log(JSON.stringify({name,loaded:result.loaded,progress:result.afterShotProgress,failure:result.failure}));await page.close();
}
const source=await readFile(path.resolve(root,'../../.cache/sprite-destroy-script.js'));
await writeFile(path.join(root,'notes','upstream-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),scriptUrl:'https://destroy.spritefusion.com/_app/chunk-y5pn82dx.js',scriptSha256:createHash('sha256').update(source).digest('hex'),clientObserved:['/api/page?url= static HTML path','/p/{protocol}/{host}{path} scripted proxy path','sandbox iframe extraction via postMessage','getBoundingClientRect and getComputedStyle DOM extraction','?url= deep link parameter','WebSocket /mp/{room}/ws and compressed level transfer'],unverified:['server-side implementation','multiplayer behavior','all-site compatibility','upstream open-source license'],results},null,2)+'\n');
await browser.close();
