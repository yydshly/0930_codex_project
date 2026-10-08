import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
const {chromium}=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1,acceptDownloads:true});
const checks=[],errors=[],consoleErrors=[],external=[],captures=[];let complete=false;
page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===new URL(process.env.KOI_QA_URL || 'http://127.0.0.1:8997').origin||['data:','blob:'].includes(u.protocol))return r.continue();external.push(u.href);return r.abort();});
function check(name,value,evidence){checks.push({name,passed:!!value,evidence});assert.ok(value,name);console.log('PASS '+name);}
async function layout(){return page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,overflow:[...document.querySelectorAll('.project-understanding table,.project-understanding article,.understanding-showcase,.understanding-heading,.understanding-compute')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className),buttons:[...document.querySelectorAll('.project-understanding .button')].filter(e=>e.getBoundingClientRect().height>0).map(e=>({text:e.textContent.trim(),h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width}))}));}
async function capture(name){if(process.env.KOI_QA_URL)name=name.replace('.jpg','-live.jpg');await page.screenshot({path:root+'assets/'+name,type:'jpeg',quality:90});captures.push('assets/'+name);}
try{
 const response=await page.goto((process.env.KOI_QA_URL || 'http://127.0.0.1:8997/projects/007-koi-scene-lab/?v=publication-20261008#tech'),{waitUntil:'networkidle'});
 check('tech page and static explanation open without initializing the 3D scene',response.ok()&&await page.locator('#tech').isVisible()&&await page.locator('#tab-tech').getAttribute('aria-selected')==='true'&&await page.evaluate(()=>!window.__courtyard),{tab:await page.locator('#tab-tech').textContent()});
 await page.locator('#tab-tech').click();
 const text=await page.locator('.project-understanding').innerText();
 check('public sharing metadata uses the selected infographic',await page.locator('meta[property="og:image"]').getAttribute('content')==='https://yydshly.github.io/0930_codex_project/projects/007-koi-scene-lab/assets/library-value-map-v21.png'&&await page.locator('link[rel="canonical"]').count()===1,{image:'assets/library-value-map-v21.png'});
 check('eight original technology mappings and original/current distinctions are present',await page.locator('.understanding-table:not(.understanding-status-table) tbody tr').count()===8&&text.includes('256²')&&text.includes('128²')&&text.includes('18 类花纹')&&text.includes('20条')&&text.includes('WebXR'),{rows:8});
 check('user values, four expansion ideas and five capability states are present',await page.locator('.understanding-value-grid article').count()===4&&await page.locator('.understanding-direction-grid article').count()===4&&await page.locator('.understanding-status-table tbody tr').count()===5&&text.includes('本轮暂不实施')&&text.includes('扩展设想'),{values:4,directions:4,statuses:5});
 const originalImage=page.locator('.understanding-showcase img');await originalImage.scrollIntoViewIfNeeded();await originalImage.evaluate(img=>img.decode());
 check('original runtime capture is visibly loaded and buttons point to existing tabs',await originalImage.evaluate(i=>i.complete&&i.naturalWidth===960)&&await page.locator('.understanding-actions [data-go="original"]').count()===1&&await page.locator('.understanding-actions [data-go="scene"]').count()===1,{image:await originalImage.getAttribute('src'),scope:'DOM routing targets; original and scene runtime are not rerun.'});
 const desktop=await layout();check('desktop reading layout has no horizontal overflow and 44px actions',desktop.width<=desktop.viewport&&!desktop.overflow.length&&desktop.buttons.every(b=>b.h>=44&&b.w>=44),desktop);
 await page.locator('.understanding-heading').first().scrollIntoViewIfNeeded();await capture('understanding-desktop-publication-20261008.jpg');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.understanding-heading a[download]').click()]);
 await mkdir(root+'.tmp/understanding-v21',{recursive:true});const downloadPath=root+'.tmp/understanding-v21/downloaded-overview.png';await download.saveAs(downloadPath);
 check('native overview download exactly matches the published PNG',sha(await readFile(downloadPath))===sha(await readFile(root+'web/assets/library-value-map-v21.png')),{suggestedFilename:download.suggestedFilename(),bytes:(await readFile(downloadPath)).length});
 const details=page.locator('.understanding-consistency');await details.locator('summary').focus();await page.keyboard.press('Enter');
 check('keyboard opens the proposed consistency notes with current limitations',await details.getAttribute('open')!==null&&(await details.innerText()).includes('当前网页没有STL'),{open:true});
 const poster=page.locator('.understanding-poster');await poster.locator('summary').click();await poster.locator('img').scrollIntoViewIfNeeded();await poster.locator('img').evaluate(i=>i.decode());
 check('inline infographic expands and loads its actual 2560px image',await poster.getAttribute('open')!==null&&await poster.locator('img').evaluate(i=>i.complete&&i.naturalWidth===2560&&i.naturalHeight>3000),{image:await poster.locator('img').getAttribute('src')});
 await poster.locator('summary').click();await details.locator('summary').click();await page.setViewportSize({width:390,height:844});
 const mobile=await layout();check('390px mobile has no overflow, readable stacked tables and 44px actions',mobile.width<=mobile.viewport&&!mobile.overflow.length&&mobile.buttons.every(b=>b.h>=44&&b.w>=44)&&await page.locator('.understanding-table tbody tr').first().evaluate(e=>getComputedStyle(e).display==='block'),mobile);
 await page.locator('.understanding-heading').first().scrollIntoViewIfNeeded();await capture('understanding-mobile-publication-20261008.jpg');
 await page.locator('.understanding-value-grid').scrollIntoViewIfNeeded();await capture('understanding-value-mobile-publication-20261008.jpg');
 await page.locator('footer a').first().click();
 check('return link reaches the hosted research catalog',await page.title()==='GitHub 项目研究集'&&(await page.locator('body').innerText()).includes('Koi Scene Lab'),{url:page.url()});
 check('no page, console or automatic external-request errors',!errors.length&&!consoleErrors.length&&!external.length,{errors,consoleErrors,external});complete=true;
}finally{
 const paths=['web/index.html','web/style.css','web/understanding-v21.css','web/app.js','web/assets/library-value-map-v21.png'];const hashes={};for(const p of paths)hashes[p]=sha(await readFile(root+p));
 await writeFile(root+'notes/understanding-native-publication-20261008'+(process.env.KOI_QA_URL?'-live':'')+'.json',JSON.stringify({date:new Date().toISOString(),status:complete?'completed':'failed',passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,checks,captures,errors,consoleErrors,external,hashes,scope:'Native localhost content navigation, keyboard details, exact PNG download and desktop/mobile reading layout. Original/scene gameplay, GPU rendering and manufacturing are not retested.',scriptSha256:sha(await readFile(fileURLToPath(import.meta.url)))},null,2)+'\n');
 await browser.close();
}
