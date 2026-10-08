import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
const checks=[];
function check(name, ok){assert.ok(ok,name);checks.push({name,passed:true});}
async function rect(s){return page.locator(s).boundingBox();}
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const within=(a,b)=>a.x>=b.x-1&&a.y>=b.y-1&&a.x+a.width<=b.x+b.width+1&&a.y+a.height<=b.y+b.height+1;
try{
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:1040});
  await page.goto('http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=menu');
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
  check(width+'px 原站展示字体实际加载',await page.evaluate(()=>document.fonts.check('26px SoupDisplay')));
  for(let n=0;n<3;n++){
    await page.locator('[data-menu="'+n+'"]').click();
    await page.waitForFunction(i=>document.querySelector('[data-menu="'+i+'"]').getAttribute('aria-pressed')==='true',n);
    await page.waitForTimeout(600);
    const stage=await rect('#effect-stage'),card=await rect('.native-service-card'),plate=await rect('.native-susan');
    check(width+'px 套餐 '+(n+1)+' 卡片和转盘在演示内',within(card,stage)&&within(plate,stage));
    check(width+'px 套餐 '+(n+1)+' 卡片和转盘没有重叠',!overlaps(card,plate));
    if(width===390)await page.locator('#effect-stage').screenshot({path:root+'assets/qa/local-menu-mobile-state-'+n+'.png'});
  }
  if(width===768)check('平板转盘拥有可读尺寸',(await rect('.native-susan')).width>300);
  await page.locator('button[data-effect="delivery"]').click();
  const headerText=await page.locator('.native-heading').evaluate(e=>Array.from(e.children).flatMap(el=>{const range=document.createRange();range.selectNodeContents(el);return Array.from(range.getClientRects()).map(r=>({x:r.x,y:r.y,width:r.width,height:r.height}));}));
  const status=await rect('.native-map-status');
  check(width+'px 地图标题和状态卡没有遮挡',headerText.every(r=>!overlaps(r,status)));
  check(width+'px 地图和控制区没有遮挡',!overlaps(await rect('.native-dotmap'),await rect('.native-map-controls')));
  await page.locator('button[data-effect="fortune"]').click();
  await page.locator('[data-cookie-reset]').click();await page.locator('.fortune-cookie').click();await page.waitForTimeout(1400);
  check(width+'px 开裂饼干和纸条位于演示内',within(await rect('.fortune-cookie'),await rect('#effect-stage'))&&within(await rect('.fortune-slip'),await rect('#effect-stage')));
  check(width+'px 纸条没有遮挡底部控件',!overlaps(await rect('.fortune-slip'),await rect('.native-cookie-foot')));
 }
 await page.setViewportSize({width:1280,height:1040});
 await page.goto('http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=delivery');
 await page.locator('[data-auto]').uncheck();await page.locator('[data-city="Hobart"]').click();await page.waitForTimeout(2450);
 await page.locator('#effect-stage').screenshot({path:root+'assets/effect-map-flight.png'});
 await writeFile(root+'notes/layout-verification.json',JSON.stringify({date:'2026-10-02',checks},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length}));
}finally{await browser.close();}
