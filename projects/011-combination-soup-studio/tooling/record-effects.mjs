import {createRequire} from 'node:module';
import {mkdir,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(root+'assets/recording',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:1040},recordVideo:{dir:root+'assets/recording',size:{width:1280,height:1040}}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=menu');
 await page.evaluate(()=>document.fonts.ready);
 const frame=async()=>page.evaluate(()=>window.scrollTo({top:document.querySelector('.effect-tabs').getBoundingClientRect().top+scrollY-86,behavior:'instant'}));
 await frame();await page.waitForTimeout(700);
 await page.locator('[data-menu="1"]').click();await page.waitForTimeout(1700);
 await page.locator('[data-menu="2"]').click();await page.waitForTimeout(1700);
 await page.locator('[data-menu="0"]').click();await page.waitForTimeout(1000);
 await page.locator('button[data-effect="broth"]').click();await frame();await page.waitForTimeout(1000);
 const box=await page.locator('.broth-canvas-native').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2,r=box.width*.31;
 await page.mouse.move(cx+r,cy);await page.mouse.down();
 for(let i=0;i<=54;i++){const a=i/27*Math.PI*2;await page.mouse.move(cx+Math.cos(a)*r,cy+Math.sin(a)*r);await page.waitForTimeout(16);}
 await page.mouse.up();await page.mouse.move(1100,500);
 await page.locator('[data-tilt]').evaluate(el=>{el.value=85;el.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(2200);
 await page.locator('#effect-stage').screenshot({path:root+'assets/effect-broth-spill.png'});
 await page.locator('[data-refill]').click();await page.waitForTimeout(1300);
 await page.locator('button[data-effect="delivery"]').click();await frame();
 await page.locator('[data-city="Hobart"]').click();await page.waitForTimeout(1700);
 await page.locator('#effect-stage').screenshot({path:root+'assets/effect-map-flight.png'});
 await page.waitForTimeout(1800);await page.locator('[data-city="Perth"]').click();await page.waitForTimeout(2000);
 await page.locator('button[data-effect="fortune"]').click();await frame();
 await page.locator('[data-cookie-reset]').click();await page.waitForTimeout(600);
 await page.locator('.fortune-cookie').click();await page.waitForTimeout(1800);
 await page.locator('#effect-stage').screenshot({path:root+'assets/effect-cookie-open.png'});
 await page.waitForTimeout(600);
 const video=page.video();await context.close();await rename(await video.path(),root+'assets/effects-walkthrough.webm');
 console.log(JSON.stringify({video:'assets/effects-walkthrough.webm',errors}));
}finally{await browser.close();}
