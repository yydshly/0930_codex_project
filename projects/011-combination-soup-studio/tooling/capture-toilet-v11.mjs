import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));await mkdir(root+'assets/qa/v11',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto('http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/showroom.html?example=toilet&revision=20261002-11');
  await page.waitForFunction(()=>document.querySelector('#toilet-render-status')?.textContent.includes('拖动'));
  await page.waitForFunction(()=>document.querySelector('#toilet-canvas')?.dataset.materialsReady==='true');
  await page.locator('.t-hero-image').evaluate(el=>el.decode());
  await page.locator('.t-hero').screenshot({path:root+'assets/qa/v11/toilet-campaign-desktop.png'});
  await page.locator('.t-main').screenshot({path:root+'assets/qa/v11/toilet-live-smart.png'});
  await page.locator('#toilet-lid').evaluate(el=>{el.value=100;el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('.t-main').screenshot({path:root+'assets/qa/v11/toilet-live-open.png'});
  await page.locator('[data-model=compact]').click();await page.locator('.t-main').screenshot({path:root+'assets/qa/v11/toilet-live-compact.png'});
  await page.locator('[data-toilet-view=side]').click();await page.locator('.t-main').screenshot({path:root+'assets/qa/v11/toilet-live-dimensions.png'});
  await page.screenshot({path:root+'assets/qa/v11/toilet-page-desktop.png',fullPage:true});
  await page.locator('[data-toilet-setting=studio]').click();await page.locator('.t-main').screenshot({path:root+'assets/qa/v11/toilet-live-studio.png'});
  console.log(JSON.stringify({errors}));
}finally{await writeFile(root+'notes/toilet-capture-v11.json',JSON.stringify({errors},null,2));await browser.close();}
