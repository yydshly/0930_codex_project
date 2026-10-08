import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),url='http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/studio.html?example=headphones&revision=20261003-15',checks=[],errors=[];
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};let completed=false,failure=null;
try{
  await page.goto(url);await page.waitForFunction(()=>document.querySelector('#studio-live-canvas')?.dataset.materialsReady==='true');
  const lost=await page.locator('#studio-live-canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const ext=gl?.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;});assert.ok(lost,'真实 WebGL 失效扩展可用');
  await page.waitForFunction(()=>document.querySelector('#live-render-status').textContent.includes('已失效'));
  check('实际 WebGL 上下文失效后停用模型操作并保留说明',await page.locator('#live-fold').isDisabled()&&await page.locator('[data-live-view=front]').isDisabled());
  await page.setViewportSize({width:390,height:844});check('失效后改变窗口尺寸不会误报恢复',await page.locator('#live-render-status').textContent().then(v=>v.includes('已失效')));
  const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return ['webgl','webgl2','experimental-webgl'].includes(type)?null:original.call(this,type,...args);};});
  const compatible=await fallback.newPage();compatible.on('pageerror',e=>errors.push(e.message));await compatible.goto(url);await compatible.waitForFunction(()=>document.querySelector('#live-render-status')?.textContent.includes('三维不可用'));
  check('无 WebGL 时保留明确兼容提示且停用三维控制',await compatible.locator('#live-fold').isDisabled()&&await compatible.locator('[data-live-view=front]').isDisabled());
  await compatible.locator('[name=live-color]').nth(1).check();await compatible.waitForFunction(()=>JSON.parse(localStorage.getItem('011.foundry.plan.v1')).previewSelection?.selection?.color==='#424b52');
  const r=await compatible.evaluate(()=>JSON.parse(localStorage.getItem('011.foundry.plan.v1')).previewSelection);
  check('兼容状态允许记录配置但不伪造三维观察',r.observation.renderer==='canvas'&&r.selection.foldPercent===0&&r.selection.colorName==='石墨');await fallback.close();
  check('兼容检查无未处理浏览器错误',errors.length===0);completed=true;
}catch(e){failure=e.message;throw e;}finally{await writeFile(root+'notes/studio-compatibility-v15.json',JSON.stringify({completed,failure,checks,errors},null,2));await browser.close();console.log(JSON.stringify({completed,failure,checks:checks.length,errors}));}
