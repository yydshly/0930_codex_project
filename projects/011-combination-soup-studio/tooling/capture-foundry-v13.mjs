import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),phase=process.argv[2]||'after',dir=root+'assets/qa/v13/'+phase+'/';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  const base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/';
  await page.goto(base+'studio.html?example=headphones&revision=20261003-13');await page.locator('#generate-plan').click();await page.locator('#plan-actions').waitFor({state:'visible'});await page.screenshot({path:dir+'studio-desktop.png',fullPage:true});
  if(await page.locator('[data-plan-tab=assets]').count()){await page.locator('[data-plan-tab=assets]').click();await page.locator('.s-output').screenshot({path:dir+'studio-assets.png'});await page.locator('[data-plan-tab=review]').click();await page.locator('.s-output').screenshot({path:dir+'studio-review.png'});}
  await page.setViewportSize({width:390,height:844});await page.goto(base+'studio.html?example=headphones&revision=20261003-13');await page.locator('#generate-plan').click();await page.locator('#plan-actions').waitFor({state:'visible'});await page.locator('.s-output').screenshot({path:dir+'studio-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'showroom.html?example=headphones&revision=20261003-13');await page.waitForFunction(()=>document.querySelector('#headphone-canvas')?.dataset.materialsReady==='true');await page.locator('.h-live').screenshot({path:dir+'headphone-live.png'});await page.locator('[data-headphone-environment=night]').click();await page.locator('.h-live').screenshot({path:dir+'headphone-night.png'});
  await page.setViewportSize({width:390,height:844});await page.locator('.h-options').screenshot({path:dir+'headphone-controls-mobile.png'});
}finally{await writeFile(root+'notes/foundry-v13-'+phase+'-capture.json',JSON.stringify({phase,errors},null,2));await browser.close();}
console.log(JSON.stringify({phase,errors}));
