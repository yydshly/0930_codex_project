import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),dir=root+'assets/qa/v14/',base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:width===1440?1000:844});await page.goto(base+'studio.html?example=headphones&revision=20261003-14');await page.waitForFunction(()=>document.querySelector('#studio-live-canvas')?.dataset.materialsReady==='true');
    const overlap=await page.evaluate(()=>{const c=document.querySelector('#studio-live-canvas').getBoundingClientRect(),b=document.querySelector('.sl-views').getBoundingClientRect();return c.bottom>b.top;});assert.equal(overlap,false);checks.push({width,modelAndControlsSeparated:true,noOverflow:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)});
    if(width===1440){await page.screenshot({path:dir+'studio-desktop.png',fullPage:true});await page.screenshot({path:dir+'studio-first-screen.png'});await page.locator('#studio-live').screenshot({path:dir+'live-default.png'});await page.locator('[name=live-color]').nth(1).check();await page.locator('[data-live-environment=night]').click();await page.locator('#live-fold').evaluate(e=>{e.value='60';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#studio-live').screenshot({path:dir+'live-night-fold.png'});}
    else await page.locator('#studio-live').screenshot({path:dir+(width===768?'live-tablet':'live-mobile')+'.png'});
  }
  assert.equal(errors.length,0);assert.ok(checks.every(v=>v.noOverflow));
}finally{await writeFile(root+'notes/foundry-capture-v14.json',JSON.stringify({checks,errors},null,2));await browser.close();}
console.log(JSON.stringify({checks,errors}));
