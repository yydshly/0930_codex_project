import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,mkdtemp,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache=path.resolve(project,'../../.cache/avatar-anywhere-qa');
await mkdir(cache,{recursive:true});const run=await mkdtemp(path.join(cache,'run-'));
const extension=path.join(run,'avatar-extension');await cp(path.join(project,'avatar-extension'),extension,{recursive:true});
const production=JSON.parse(await readFile(path.join(extension,'manifest.json'),'utf8'));
// A headless browser has no clickable extension toolbar and does not register
// action accelerators. Only this disposable test copy gets capture permission;
// production retains activeTab+scripting, obtained by the user's toolbar click.
await writeFile(path.join(extension,'manifest.json'),JSON.stringify({...production,host_permissions:['<all_urls>']},null,2));
const assets=path.join(project,'web/avatar-anywhere/assets');await mkdir(assets,{recursive:true});
const context=await chromium.launchPersistentContext(path.join(run,'profile'),{channel:'chromium',headless:true,viewport:{width:1440,height:1020},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],recordVideo:{dir:path.join(run,'video'),size:{width:1440,height:1020}}});
const checks=[],errors=[];let evidence=null;
function check(name,condition,details=''){checks.push({name,passed:Boolean(condition),details});if(!condition)throw new Error(`${name}: ${details}`);}
const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
// Functions cannot be serialized through worker.evaluate's argument; use a
// fixed isolated-world operation switch, always in the real installed extension.
async function isolated(page,op,arg){return worker.evaluate(async({url,op,arg})=>{
  const tab=(await chrome.tabs.query({})).find(t=>t.url===url);if(!tab)throw new Error('QA tab missing');
  const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:async({op,arg})=>{
    if(op==='state')return AvatarAnywhere.getState();
    if(op==='wait')return await globalThis.__AVATAR_EXTENSION_PROMISE__;
    if(op==='positions')return AvatarAnywhere.engine?.tiles.filter(t=>t.detached).map(t=>({id:t.body.id,x:t.body.position.x,y:t.body.position.y,x0:t.cx??t.x+t.width/2,y0:t.cy??t.y+t.height/2,static:t.body.isStatic,mass:t.body.mass}));
    if(op==='restore'){AvatarAnywhere.restore();return AvatarAnywhere.getState();}
    if(op==='visibility')return getComputedStyle(document.querySelector(arg)).visibility;
    throw new Error('Unknown operation');
  },args:[{op,arg}]});return result.result;
},{url:page.url(),op,arg});}
async function mount(page){await page.bringToFront();await worker.evaluate(async url=>{
  const tab=(await chrome.tabs.query({})).find(t=>t.url===url);
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['assets/vendor/matter.min.js','content-loader.js']});
},page.url());return isolated(page,'wait');}
async function pick(page,role,locator){
  await page.locator(`#avatar-anywhere-host #pick-${role}`).click();
  const r=await locator.boundingBox();if(!r)throw new Error('No candidate bounds');
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
}
async function until(page,predicate,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){const state=await isolated(page,'state');if(predicate(state))return state;await page.waitForTimeout(120);}throw new Error(`State did not settle: ${JSON.stringify(await isolated(page,'state'))}`);}
async function kick(page){const count=(await isolated(page,'state')).events.filter(e=>e.type==='kick').length;await page.locator('#avatar-anywhere-host #escape').click();return until(page,s=>s.events.filter(e=>e.type==='kick').length>count&&!s.preparing&&s.engine);}

try{
  check('Production uses only activeTab+scripting and has no persistent host grants',JSON.stringify(production.permissions)==='["activeTab","scripting"]'&&!production.host_permissions&&!production.content_scripts);
  const page=context.pages()[0]||await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8949/projects/009-sprite-destruction-lab/avatar-anywhere/sample.html');
  check('Independent sample page loads no engine or avatar module',await page.evaluate(()=>!globalThis.Matter&&![...document.scripts].some(s=>s.src.includes('controller')||s.src.includes('engine'))));
  check('Extension remains absent before invocation',await page.locator('#avatar-anywhere-host').count()===0);
  const mounted=await mount(page);check('Real installed MV3 loader mounts the controller in an isolated world',mounted.open&&await page.evaluate(()=>!globalThis.AvatarAnywhere));
  const avatar=page.locator('.avatar').first(),card=page.locator('article').first();
  await pick(page,'avatar',avatar);await pick(page,'target',card);
  let selected=await isolated(page,'state');check('Pointer selection records host-page elements without predefined data attributes',selected.avatar&&selected.target&&!await card.getAttribute('data-destructible'));
  // A descendant explicitly sets visible: important; restore must preserve it.
  await card.locator('h2,h3').first().evaluate(el=>el.style.setProperty('visibility','visible','important'));
  const before=await page.evaluate(()=>({avatar:document.querySelector('.avatar').outerHTML,card:document.querySelector('article').outerHTML}));
  let state=await kick(page);const event=state.events.findLast(e=>e.type==='kick');
  check('Actual captureVisibleTab PNG feeds the same engine and releases real fragments',state.snapshot?.provider==='viewport-pixels'&&state.engine.dynamic>0&&event.hit&&event.released>0,JSON.stringify(event));
  check('Only the selected subtree is hidden, including explicit visible descendants',await card.evaluate(el=>[el,...el.querySelectorAll('*')].every(n=>getComputedStyle(n).visibility==='hidden')));
  let bodies=await isolated(page,'positions');check('Released fragments are finite dynamic Matter bodies',bodies.length>0&&bodies.every(b=>!b.static&&Number.isFinite(b.mass)&&b.mass>0));
  await page.waitForTimeout(350);const afterBodies=await isolated(page,'positions');check('Snapshot fragments move away from their original page positions',afterBodies.some(b=>Math.hypot(b.x-b.x0,b.y-b.y0)>3));
  await page.screenshot({path:path.join(assets,'sample-kick.png')});
  const normalButton=page.locator('button').filter({hasText:'关注'}).first();await normalButton.click();check('Unselected website controls remain usable while the effect runs',(await normalButton.textContent()).includes('已关注'));
  await page.locator('#avatar-anywhere-host #recall').click();await until(page,s=>s.phase==='home');
  check('Recall restores the original avatar DOM while retaining card fragments',await avatar.locator('svg').evaluate(el=>[el,...el.querySelectorAll('*')].every(n=>getComputedStyle(n).visibility==='visible'))&&(await isolated(page,'state')).engine.dynamic>0);
  await page.locator('#avatar-anywhere-host #restore').click();
  check('Restoration preserves original markup and inline visibility priorities',await page.evaluate(before=>document.querySelector('.avatar').outerHTML===before.avatar&&document.querySelector('article').outerHTML===before.card,before));
  await kick(page);await page.evaluate(()=>scrollBy(0,60));await until(page,s=>!s.engine&&!s.preparing);
  check('Scrolling automatically disposes physics and restores selected content',await card.evaluate(el=>getComputedStyle(el).visibility==='visible'));
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);await page.locator('#avatar-anywhere-host #effect').selectOption('paper');await kick(page);
  check('Paper style uses the same viewport input with a different fragment mode',(await isolated(page,'state')).engine.effect==='paper');
  await page.setViewportSize({width:1280,height:900});await until(page,s=>!s.engine);
  check('Viewport resize restores the page instead of using stale pixel coordinates',await card.evaluate(el=>getComputedStyle(el).visibility==='visible'));
  await page.locator('#avatar-anywhere-host #close').click();check('Close hides the panel and clears effect canvases',!(await isolated(page,'state')).open&&await page.locator('#avatar-anywhere-host .panel').isHidden());
  await mount(page);check('Extension action can reopen the same singleton',(await isolated(page,'state')).open&&await page.locator('#avatar-anywhere-host').count()===1);

  const github=await context.newPage();github.on('pageerror',e=>errors.push(e.message));await github.setViewportSize({width:1440,height:1020});
  await github.goto('https://github.com/microsoft',{waitUntil:'domcontentloaded',timeout:60000});await github.bringToFront();
  await github.waitForFunction(()=>[...document.images].some(el=>{const r=el.getBoundingClientRect();return el.complete&&el.naturalWidth>0&&r.width>=500&&r.height>=100&&r.height<=400&&r.bottom<innerHeight&&r.top>0;}),{timeout:30000});
  // Resolve live visible elements from the public site's actual structure.
  const avatarSelector=await github.evaluate(()=>[...document.querySelectorAll('img')].filter(el=>{const r=el.getBoundingClientRect();return r.width>=70&&r.width<=360&&r.height>=70&&r.bottom<innerHeight&&r.top>0;}).map(el=>({src:el.src,alt:el.alt,cls:el.className,width:el.width}))[0]);
  if(!avatarSelector)throw new Error('Live GitHub avatar not found');
  const githubAvatar=github.locator(`img[src="${avatarSelector.src}"]`).first();
  const banner=await github.evaluate(()=>[...document.querySelectorAll('img')].filter(el=>{const r=el.getBoundingClientRect();return r.width>=500&&r.height>=100&&r.height<=400&&r.bottom<innerHeight&&r.top>0;}).map(el=>({src:el.src,alt:el.alt}))[0]);
  if(!banner)throw new Error('Live GitHub content card not found');
  const githubCard=github.locator(`img[src="${banner.src}"]`).first();
  await githubCard.waitFor();
  await github.screenshot({path:path.join(assets,'github-before.png')});
  await mount(github);await pick(github,'avatar',githubAvatar);await pick(github,'target',githubCard);
  selected=await isolated(github,'state');check('The extension selects a real GitHub avatar and visible content card',Boolean(selected.avatar&&selected.target),JSON.stringify(selected));
  await github.locator('#avatar-anywhere-host #escape').click();await until(github,s=>s.phase==='leaping');await github.waitForTimeout(220);await github.screenshot({path:path.join(assets,'github-escape.png')});
  state=await until(github,s=>s.events.some(e=>e.type==='kick')&&s.engine);await github.waitForTimeout(180);await github.screenshot({path:path.join(assets,'github-kick.png')});
  evidence={url:github.url(),title:await github.title(),avatar:avatarSelector,selected,run:state};
  check('Live GitHub pixels become a moving character head and real textured shards',state.snapshot?.width>0&&state.engine.dynamic>0&&state.events.some(e=>e.type==='kick'&&e.hit&&e.released>0));
  await github.waitForTimeout(750);await github.locator('#avatar-anywhere-host #recall').click();await until(github,s=>s.phase==='home');await github.locator('#avatar-anywhere-host #restore').click();
  check('The live GitHub avatar and card are visible again after restoration',await githubAvatar.isVisible()&&await githubCard.isVisible()&&!(await isolated(github,'state')).engine);
  await github.screenshot({path:path.join(assets,'github-restored.png')});
  const video=github.video();await github.close();await video.saveAs(path.join(assets,'github-run.webm'));
  check('The tested controller produces no uncaught page errors',errors.length===0,errors.join('; '));
}catch(error){checks.push({name:'Real cross-site QA completed',passed:false,details:error.message});console.error(error.stack);process.exitCode=1;}
finally{await writeFile(path.join(project,'notes/anywhere-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),environment:'Full Chromium headless, disposable extension profile; test copy only grants <all_urls> because browser toolbar user gestures cannot be automated here',productionPermissions:production.permissions,productionHostPermissions:production.host_permissions||[],checks,errors,evidence},null,2));await context.close();console.log(JSON.stringify({passed:checks.filter(c=>c.passed).length,total:checks.length,errors}));}
