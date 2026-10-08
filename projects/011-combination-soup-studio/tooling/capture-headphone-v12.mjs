import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),folder=root+'assets/qa/v12/';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:820},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto('http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/showroom.html?example=headphones&revision=20261003-12');
  await page.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');await page.evaluate(()=>document.fonts.ready);
  await page.locator('.h-hero').screenshot({path:folder+'headphone-hero-desktop.png'});
  await page.locator('.h-details').screenshot({path:folder+'headphone-details.png'});
  await page.locator('.h-live').screenshot({path:folder+'headphone-live.png'});
  for(const v of ['front','side','structure']){await page.locator(`[data-headphone-view=${v}]`).click();await page.locator('.h-live').screenshot({path:folder+`headphone-${v}.png`});}
  await page.locator('[data-headphone-view=hero]').click();
  for(const fold of [50,100]){await page.locator('#headphone-fold').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},fold);await page.locator('.h-live').screenshot({path:folder+`headphone-fold-${fold}.png`});}
  await page.locator('#headphone-fold').evaluate(el=>{el.value=0;el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('[data-headphone-environment=night]').click();await page.locator('[name=headphone-color]').nth(1).check();await page.locator('.h-live').screenshot({path:folder+'headphone-night.png'});
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/showroom.html?example=headphones&revision=20261003-12');await page.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');await page.locator('.h-hero-image').evaluate(el=>el.decode());await page.locator('.h-hero').screenshot({path:folder+'headphone-hero-mobile.png'});await page.locator('.h-stage').screenshot({path:folder+'headphone-live-mobile.png'});
  await page.setViewportSize({width:1440,height:1100});await page.goto('http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/studio.html?example=headphones&revision=20261003-12');await page.locator('#generate-plan').click();await page.locator('#plan-actions').waitFor({state:'visible'});await page.screenshot({path:folder+'studio-desktop.png',fullPage:true});
}finally{await writeFile(root+'notes/headphone-capture-v12.json',JSON.stringify({errors},null,2));await browser.close();}
console.log(JSON.stringify({errors}));
