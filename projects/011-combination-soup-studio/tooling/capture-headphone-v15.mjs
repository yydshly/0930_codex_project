import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),phase=process.argv[2]||'after',dir=root+'assets/qa/v15/'+phase+'/',base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base+'studio.html?example=headphones&revision=20261003-15');await page.waitForFunction(()=>document.querySelector('#studio-live-canvas')?.dataset.materialsReady==='true');
  await page.locator('#studio-live').screenshot({path:dir+'studio-live.png'});
  await page.locator('[data-live-view=detail]').click();await page.locator('#studio-live').screenshot({path:dir+'studio-detail.png'});
  if(await page.locator('#expand-live-stage').count()){await page.locator('#expand-live-stage').click();await page.locator('#studio-live').screenshot({path:dir+'studio-expanded.png'});await page.locator('#expand-live-stage').click();}
  await page.goto(base+'showroom.html?example=headphones&revision=20261003-15');await page.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');
  await page.locator('.h-live').screenshot({path:dir+'headphone-live.png'});await page.locator('[data-headphone-view=detail]').click();await page.locator('.h-stage').screenshot({path:dir+'headphone-detail.png'});
  if(await page.locator('[data-headphone-view=cushion]').count()){await page.locator('[data-headphone-view=cushion]').click();await page.locator('.h-stage').screenshot({path:dir+'headphone-cushion.png'});await page.locator('[data-headphone-view=detail]').click();}
  await page.locator('#headphone-canvas').focus();await page.keyboard.press('ArrowRight');await page.locator('.h-stage').screenshot({path:dir+'headphone-detail-rotated.png'});
  await page.locator('[data-headphone-view=hero]').click();await page.locator('[name=headphone-color]').nth(1).check();await page.locator('[data-headphone-environment=night]').click();await page.locator('.h-live').screenshot({path:dir+'headphone-night.png'});
  await page.locator('#headphone-fold').evaluate(e=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('.h-stage').screenshot({path:dir+'headphone-fold-half.png'});
  await page.locator('#headphone-fold').evaluate(e=>{e.value='100';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('.h-stage').screenshot({path:dir+'headphone-fold.png'});
  await page.setViewportSize({width:390,height:844});await page.goto(base+'studio.html?example=headphones&revision=20261003-15');await page.waitForFunction(()=>document.querySelector('#studio-live-canvas')?.dataset.materialsReady==='true');await page.locator('#studio-live').screenshot({path:dir+'studio-mobile.png'});await page.locator('[data-live-view=detail]').click();await page.locator('#studio-live').screenshot({path:dir+'studio-mobile-detail.png'});
}finally{await writeFile(root+'notes/headphone-capture-v15-'+phase+'.json',JSON.stringify({phase,errors},null,2));await browser.close();}
console.log(JSON.stringify({phase,errors}));
