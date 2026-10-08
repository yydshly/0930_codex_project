import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url)),phase=process.argv[2]||'after',dir=root+'assets/qa/v16/'+phase+'/',base='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/',revision='20261003-16';
assert.ok(['before','after'].includes(phase),'capture phase must be before or after');await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],captures=[],rendererRevisions=new Set();
await context.addInitScript(()=>{window.captureRendererState=null;document.addEventListener('headphone-render-state',e=>{if(e.detail?.materialsReady)window.captureRendererState=e.detail;},true);});
page.on('pageerror',e=>errors.push(e.message));let completed=false,failure=null;
const views=['hero','front','side','detail','cushion','structure'];
async function settle(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function ready(canvas,images=[]){
  await page.waitForFunction(id=>document.querySelector(id)?.dataset.materialsReady==='true',canvas,{timeout:45000});
  for(const selector of images)await page.locator(selector).evaluate(async img=>{if(!img.complete)await new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true});});await img.decode();});
  await settle();
  const renderState=await page.evaluate(()=>window.captureRendererState);assert.ok(renderState?.visualRevision,'actual renderer state supplies its revision');rendererRevisions.add(renderState.visualRevision);if(phase==='after')assert.equal(renderState.visualRevision,revision,'after capture uses the current renderer source');
  const raw=Buffer.from((await page.locator(canvas).evaluate(c=>c.toDataURL())).split(',')[1],'base64'),stats=await sharp(raw).stats();
  assert.ok(raw.length>10000&&stats.channels.slice(0,3).some(c=>c.stdev>6),'actual material-ready canvas must have visible product pixels');
}
async function shot(name,selector=null,options={}){const image=selector?await page.locator(selector).screenshot({path:dir+name+'.png',...options}):await page.screenshot({path:dir+name+'.png',...options});const metadata=await sharp(image).metadata();assert.ok(metadata.width>100&&metadata.height>100,name+' has a usable image size');captures.push({name,width:metadata.width,height:metadata.height});}
async function reveal(id){const summary=page.locator(id).locator('xpath=ancestor::details[not(@open)][1]/summary');if(await summary.count())await summary.click();}
async function slider(id,value){await reveal(id);await page.locator(id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);await settle();}
try{
  await page.goto(base+'studio.html?example=headphones&revision='+revision);await ready('#studio-live-canvas');await shot('studio-live','#studio-live');
  for(const view of views){await page.locator('[data-live-view='+view+']').click();await settle();await shot('studio-stage-'+view,'.sl-stage');}
  await page.locator('[data-live-view=detail]').click();await shot('studio-detail','#studio-live');await page.locator('#expand-live-stage').click();await shot('studio-expanded','#studio-live');await page.locator('#expand-live-stage').click();
  await page.goto(base+'showroom.html?example=headphones&revision='+revision);await ready('#headphone-canvas',['.h-hero-image','.h-detail-image img']);
  await page.evaluate(()=>scrollTo(0,0));await settle();await shot('headphone-showroom-desktop');await shot('headphone-showroom-full',null,{fullPage:true});await shot('headphone-hero','.h-hero');await shot('headphone-editorial-details','.h-details');
  await page.locator('#reset-headphone').click();await shot('headphone-live','.h-live');
  for(const view of views){await page.locator('[data-headphone-view='+view+']').click();await settle();await shot('headphone-live-'+view,'.h-live');await shot('headphone-'+view,'.h-stage');}
  await page.locator('[data-headphone-view=detail]').click();await page.locator('#headphone-canvas').focus();await page.keyboard.press('ArrowRight');await settle();await shot('headphone-detail-rotated','.h-stage');
  await page.locator('#reset-headphone').click();await reveal('[data-headphone-environment=warm]');await page.locator('[data-headphone-environment=warm]').click();await settle();await shot('headphone-warm','.h-live');
  await page.locator('[name=headphone-color]').nth(1).check();await page.locator('[data-headphone-environment=night]').click();await settle();await shot('headphone-night','.h-live');
  await slider('#headphone-fold',50);await shot('headphone-fold-half','.h-stage');await slider('#headphone-fold',100);await shot('headphone-fold','.h-stage');
  await page.setViewportSize({width:390,height:844});await page.goto(base+'showroom.html?example=headphones&revision='+revision);await ready('#headphone-canvas',['.h-hero-image','.h-detail-image img']);await page.evaluate(()=>scrollTo(0,0));await settle();await shot('headphone-showroom-mobile');await shot('headphone-hero-mobile','.h-hero');await shot('headphone-live-mobile','.h-live');await page.locator('[data-headphone-view=cushion]').click();await settle();await shot('headphone-cushion-mobile','.h-stage');
  await page.goto(base+'studio.html?example=headphones&revision='+revision);await ready('#studio-live-canvas');await shot('studio-mobile','#studio-live');await page.locator('[data-live-view=detail]').click();await settle();await shot('studio-mobile-detail','#studio-live');await page.locator('#expand-live-stage').click();await shot('studio-mobile-expanded','#studio-live');
  assert.equal(errors.length,0,'capture has no unhandled browser errors');completed=true;
}catch(e){failure=e.message;throw e;}finally{await writeFile(root+'notes/headphone-capture-v16-'+phase+'.json',JSON.stringify({phase,requestedRevision:revision,actualRendererRevisions:[...rendererRevisions],completed,failure,captures,errors},null,2));await browser.close();console.log(JSON.stringify({phase,completed,failure,captures:captures.length,actualRendererRevisions:[...rendererRevisions],errors}));}
