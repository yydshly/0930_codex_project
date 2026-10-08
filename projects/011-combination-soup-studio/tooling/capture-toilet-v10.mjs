import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));await mkdir(root+'assets/qa',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto('http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/?example=toilet&step=preview&revision=20261002-10');
  await page.waitForFunction(()=>document.querySelector('#prototype-mode').textContent.includes('本地 WebGL'));
  const f=await (await page.locator('#prototype').elementHandle()).contentFrame();
  await f.locator('.t-main').screenshot({path:root+'assets/qa/toilet-smart-hero-v10.png'});
  await f.locator('#toilet-lid').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await f.locator('.t-main').screenshot({path:root+'assets/qa/toilet-smart-open-v10.png'});
  await f.locator('[data-model=compact]').click();await f.locator('.t-main').screenshot({path:root+'assets/qa/toilet-compact-open-v10.png'});
  await f.locator('[data-toilet-view=side]').click();await f.locator('.t-main').screenshot({path:root+'assets/qa/toilet-side-dimensions-v10.png'});
  await f.locator('#use-site-example').click();await page.screenshot({path:root+'assets/qa/toilet-workbench-desktop-v10.png',fullPage:true});
  console.log(JSON.stringify({errors,fit:await f.locator('#fit-title').textContent(),height:await page.locator('#prototype').getAttribute('style')}));
}finally{await writeFile(root+'notes/toilet-capture-v10.json',JSON.stringify({errors},null,2));await browser.close();}
