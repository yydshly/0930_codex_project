import { createRequire } from 'node:module';
import { mkdir,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'assets/effects'),{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1150},deviceScaleFactor:1});const checks=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1'))errors.push(`${r.status()} ${r.url()}`);});
const url=process.env.LAB_URL||'http://127.0.0.1:8949/projects/009-sprite-destruction-lab/lab.html';
function check(name,pass,details=''){checks.push({name,passed:Boolean(pass),details});if(!pass)throw Error(`${name}: ${details}`);}
async function state(){return page.evaluate(()=>window.destructionLab.getState());}
try{
  await page.goto(url,{waitUntil:'networkidle'});check('Six mode buttons and glass default are available',await page.locator('button[data-effect]').count()===6&&await page.locator('button[data-effect="glass"]').getAttribute('aria-pressed')==='true');
  for(const effect of ['glass','paper','pixels','neon','ripple','classic']){
    await page.locator('#reset').click();await page.locator('[data-scene="catalog"]').click();await page.locator(`button[data-effect="${effect}"]`).click();await page.locator('#start').click();
    await page.waitForFunction(e=>window.destructionLab.getState().state==='running'&&window.destructionLab.getState().effect===e,effect,{timeout:10000});
    const point=await page.evaluate(()=>({...window.destructionLab.engine.tiles[0].body.position})),box=await page.locator('#game-canvas').boundingBox();
    await page.mouse.click(box.x+point.x,box.y+point.y);await page.waitForTimeout(120);let current=await state();
    check(`${effect}: direct manual interaction changes real area`,current.ratio>0&&current.hits>0,JSON.stringify(current));
    if(effect==='glass')check('Glass uses triangle geometry',await page.evaluate(()=>window.destructionLab.engine.tiles.every(t=>t.vertices?.length===3)));
    if(effect==='paper')check('Paper uses thin-strip geometry',await page.evaluate(()=>window.destructionLab.engine.tiles.every(t=>t.height<=48*.38+.01)));
    if(['pixels','neon'].includes(effect))check(`${effect}: content becomes real texture particles`,current.visuals>0,JSON.stringify(current));
    if(effect==='ripple'){
      const ratio=current.ratio;await page.mouse.click(box.x+point.x,box.y+point.y);await page.waitForTimeout(130);
      check('Repeated reveal does not double count the same area',Math.abs((await state()).ratio-ratio)<.0001);
      check('Ripple keeps partial coverage instead of rectangular destruction',await page.evaluate(()=>window.destructionLab.engine.tiles.some(t=>t.progress>0&&t.progress<1)));
    }
    await page.locator('#auto').click();await page.waitForTimeout(850);await page.locator('#pause').click();
    const paused=await page.evaluate(()=>window.destructionLab.engine.effects.time);await page.waitForTimeout(100);check(`${effect}: pause stops effect animation`,await page.evaluate(()=>window.destructionLab.engine.effects.time)===paused);
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(root,'assets/effects',`${effect}.png`),fullPage:false});
    check(`${effect}: active bodies and particles stay finite`,await page.evaluate(()=>{const e=window.destructionLab.engine;return e.tiles.every(t=>Number.isFinite(t.body.position.x)&&Number.isFinite(t.body.position.y))&&e.effects.particles.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));}));
    await page.locator('#pause').click();await page.waitForFunction(()=>window.destructionLab.getState().complete,undefined,{timeout:20000});
    check(`${effect}: catalog completion unlocks the existing workflow`,await page.locator('#result a').count()===3);
    if(effect==='neon'){await page.waitForTimeout(2300);check('Neon particles reach the collection ring',((await state()).collected)>0);}
    for(const scene of ['campaign','classroom']){
      await page.locator(`[data-scene="${scene}"]`).click();await page.locator('#auto').click();
      await page.waitForFunction(()=>window.destructionLab.getState().complete,undefined,{timeout:20000});current=await state();
      check(`${effect} / ${scene}: same real task still completes`,current.effect===effect&&current.complete&&await page.locator('#result').isVisible(),JSON.stringify(current));
    }
    console.log(`${effect} complete`);
  }
  // Switching a running effect disposes its loop/world and continues on fresh content.
  const switched=await page.evaluate(()=>{window.previousEffectEngine=window.destructionLab.engine;return true;});
  await page.locator('button[data-effect="glass"]').click();await page.waitForFunction(()=>window.destructionLab.getState().effect==='glass'&&window.destructionLab.getState().state==='running');
  check('Mode switching disposes the old physics world',switched&&await page.evaluate(()=>window.previousEffectEngine.disposed&&window.previousEffectEngine.physics.world.bodies.length===0));
  check('Mode switching resets progress and task result',((await state()).ratio)===0&&await page.locator('#result').isHidden());
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(root,'assets/effects','mobile-modes.png'),fullPage:false});
  check('All six modes fit the mobile viewport without horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('button[data-effect="neon"]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.destructionLab.getState().state==='running');
  const mobilePoint=await page.evaluate(()=>({...window.destructionLab.engine.tiles[0].body.position})),mobileBox=await page.locator('#game-canvas').boundingBox();await page.mouse.click(mobileBox.x+mobilePoint.x,mobileBox.y+mobilePoint.y);
  check('Mobile direct interaction creates neon particles',((await state()).visuals)>0);
  check('No uncaught errors or missing assets across six modes',errors.length===0,JSON.stringify(errors));
}catch(error){checks.push({name:'Effects browser run',passed:false,details:error.message});await page.screenshot({path:path.join(root,'assets/effects','failure.png'),fullPage:true});process.exitCode=1;}
finally{await writeFile(path.join(root,'notes','effects-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),url,browser:browser.version(),checks,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),errors},null,2));await browser.close();}
