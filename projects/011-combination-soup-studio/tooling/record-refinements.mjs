import {createRequire} from 'node:module';
import {rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1040},recordVideo:{dir:root+'assets/recording',size:{width:1440,height:1040}}});
const page=await context.newPage();
try{
 await page.goto('http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=broth&revision=20261002-2#original-effects');await page.evaluate(()=>document.fonts.ready);
 await page.waitForTimeout(3800);
 for(let i=0;i<8;i++){await page.locator('[data-stir]').click();await page.waitForTimeout(85);}await page.waitForTimeout(1000);
 await page.locator('#effect-stage').screenshot({path:root+'assets/refined-broth-live.png'});
 await page.locator('button[data-effect="delivery"]').click();await page.locator('[data-city="Perth"]').click();
 await page.waitForTimeout(4700);await page.locator('#effect-stage').screenshot({path:root+'assets/refined-map-live.png'});await page.waitForTimeout(1800);
 await page.locator('button[data-effect="fortune"]').click();await page.locator('[data-cookie-reset]').click();await page.waitForTimeout(700);
 await page.locator('.fortune-cookie').click();await page.waitForTimeout(1800);
 await page.locator('#effect-stage').screenshot({path:root+'assets/refined-cookie-live.png'});await page.waitForTimeout(1400);
 const video=page.video();await context.close();await rename(await video.path(),root+'assets/effects-refined.webm');
 console.log('recorded current real-time components');
}finally{await browser.close();}
