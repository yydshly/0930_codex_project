import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),dir=root+'assets/qa/';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const evidence=[];
try{
 if(!process.argv.includes('--local')){
 const source=await browser.newPage({viewport:{width:1440,height:1040}});
 source.on('pageerror',e=>evidence.push({sourceError:e.message}));
 await source.goto('https://combinationsoupstudio.com.au/',{waitUntil:'domcontentloaded',timeout:60000});
 await source.evaluate(()=>document.fonts.ready);
 evidence.push({source:await source.evaluate(()=>['#menu','#stir','#delivery','#order','.engine','.dotmap','.fortune-cookie','.ck-col'].map(s=>{const e=document.querySelector(s);return {s,exists:!!e,rect:e?e.getBoundingClientRect().toJSON():null};}))});
 for(const [key,anchor,part] of [['menu','#menu','.menu-pin'],['broth','#stir','.engine'],['delivery','#delivery','.dotmap'],['fortune','#order','.ck-col']]){
   await source.locator(anchor).scrollIntoViewIfNeeded();await source.waitForTimeout(key==='broth'?8500:1800);
   await source.screenshot({path:dir+'source-'+key+'-desktop.png'});
   const el=source.locator(part);if(await el.count())await el.screenshot({path:dir+'source-'+key+'-component.png'});
 }
 const cookie=source.locator('#cookie');
 evidence.push({sourceCookie:await source.locator('.ck-col').evaluate(e=>e.innerHTML.slice(0,3500))});
 if(await cookie.count()){await cookie.click();await source.waitForTimeout(1400);await source.locator('.ck-col').screenshot({path:dir+'source-fortune-open.png'});}
 await source.setViewportSize({width:390,height:844});
 for(const [key,anchor] of [['menu','#menu'],['broth','#stir'],['delivery','#delivery'],['fortune','#order']]){
   await source.locator(anchor).scrollIntoViewIfNeeded();await source.waitForTimeout(1000);await source.screenshot({path:dir+'source-'+key+'-mobile.png'});
 }
 await source.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1040}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,768,390]){
   await page.setViewportSize({width,height:width===390?844:1040});
   for(const key of ['menu','broth','delivery','fortune']){
     await page.goto('http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect='+key);
     await page.evaluate(()=>document.fonts.ready);
     await page.locator('#effect-stage').scrollIntoViewIfNeeded();
     if(key==='fortune'){await page.locator('[data-cookie-reset]').click();await page.locator('.fortune-cookie').click();}
     await page.waitForTimeout(key==='broth'?1600:1400);
     await page.locator('#effect-stage').screenshot({path:dir+'local-'+key+'-'+width+'.png'});
     if(width===1440)await page.screenshot({path:dir+'local-'+key+'-desktop.png'});
     evidence.push({key,width,geometry:await page.evaluate(()=>{const sels=['#effect-stage','.native-heading','.native-service-card','.native-susan','.native-engine','.native-dotmap','.native-map-status','.fortune-cookie','.fortune-slip','.native-cookie-foot'];return sels.map(s=>{const e=document.querySelector(s);return {s,rect:e?.getBoundingClientRect().toJSON(),text:e?.innerText.slice(0,150)};});})});
     console.log('captured '+key+' '+width);
   }
 }
 evidence.push({localErrors:errors});
 await writeFile(root+'notes/'+(process.argv.includes('--local')?'visual-evidence-final':'visual-evidence')+'.json',JSON.stringify(evidence,null,2)+'\n');
}finally{await browser.close();}
