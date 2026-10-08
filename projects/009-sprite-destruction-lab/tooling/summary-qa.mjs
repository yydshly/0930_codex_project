import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.RESEARCH_URL||'http://127.0.0.1:8949/projects/009-sprite-destruction-lab/';
const renderOnly=process.argv.includes('--render-only');
const browser=await chromium.launch({headless:true});
const errors=[],checks=[];
await mkdir(path.join(root,'assets'),{recursive:true});
function check(name,passed,details=''){
  checks.push({name,passed:Boolean(passed),details});
  if(!passed)throw new Error(`${name}: ${details}`);
}
function observe(page){
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(base))errors.push(`HTTP ${response.status()}: ${response.url()}`);});
}
let page;
try{
  if(renderOnly){
    page=await browser.newPage({viewport:{width:1800,height:1900},deviceScaleFactor:2});observe(page);
    await page.goto(new URL('research/overview.svg',base).href,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    const overflow=await page.locator('text[data-max-width]').evaluateAll(nodes=>nodes.flatMap(node=>{
      const width=node.getBBox().width,limit=Number(node.dataset.maxWidth);
      return width>limit+2?[{text:node.textContent,width,limit}]:[];
    }));
    check('Vector text fits its assigned columns',overflow.length===0,JSON.stringify(overflow));
    const outside=await page.locator('svg text').evaluateAll(nodes=>nodes.flatMap(node=>{
      const r=node.getBBox();return r.x<0||r.y<0||r.x+r.width>1800||r.y+r.height>1900?[node.textContent]:[];
    }));
    check('All diagram text remains within the export canvas',outside.length===0,JSON.stringify(outside));
    await page.screenshot({path:path.join(root,'web/research/overview.png')});
    const png=await readFile(path.join(root,'web/research/overview.png'));
    check('High resolution PNG has 3600 × 3800 actual pixels',png.readUInt32BE(16)===3600&&png.readUInt32BE(20)===3800);
  }else{
    page=await browser.newPage({viewport:{width:1440,height:1020},deviceScaleFactor:1});observe(page);
    await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.researchSummary);
    check('Research ownership, principles, products and roadmap are complete',await page.evaluate(()=>
      document.querySelectorAll('.identity-card').length===3&&document.querySelectorAll('.study-card').length===6&&
      document.querySelectorAll('#pipeline li').length===5&&document.querySelectorAll('#mode-rows tr').length===6&&
      document.querySelectorAll('#product-rows tr').length===6&&document.querySelectorAll('.roadmap-card').length===3&&
      document.querySelectorAll('#source-links a').length===6));
    check('Overview loads without loading a physics engine',!await page.evaluate(()=>[...document.scripts].some(s=>/matter|engine\.js/.test(s.src))));
    check('Complete entry directory exposes six real previews and all product and toolbox routes',await page.evaluate(()=>document.querySelectorAll('.quick-link').length===6&&document.querySelectorAll('.entry-rows a[href^="products/#"]').length===6&&document.querySelectorAll('.entry-rows a[href^="toolbox/#"]').length===4));
    check('Desktop page has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(root,'assets/research-home-desktop.png')});
    for(const [group,count] of [['engine',2],['character',2],['prototype',1],['independent',1],['all',6]]){
      await page.locator(`[data-filter="${group}"]`).click();
      check(`Research filter ${group} exposes ${count} matching entries`,await page.evaluate(()=>researchSummary.getVisible())===count&&await page.locator(`[data-filter="${group}"]`).getAttribute('aria-pressed')==='true');
    }
    await page.locator('#study-grid').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>[...document.querySelectorAll('.study-card img')].every(img=>img.complete&&img.naturalWidth>0));
    check('All six real evidence screenshots load',await page.locator('.study-card img').evaluateAll(images=>images.length===6&&images.every(img=>img.naturalWidth>0)));
    await page.screenshot({path:path.join(root,'assets/research-studies-desktop.png')});
    await page.locator('#open-map').click();
    check('Overview opens as an accessible modal',await page.locator('#map-dialog').evaluate(el=>el.open&&el.matches(':modal')));
    await page.locator('#map-zoom').fill('120');
    check('Vector zoom changes the actual image width',await page.locator('#large-map').evaluate(el=>Math.round(el.getBoundingClientRect().width))===2160&&await page.locator('#zoom-value').textContent()==='120%');
    await page.keyboard.press('Escape');
    check('Escape closes the overview and returns keyboard focus',!await page.locator('#map-dialog').evaluate(el=>el.open)&&await page.locator('#open-map').evaluate(el=>document.activeElement===el));
    const downloadPromise=page.waitForEvent('download');
    await page.locator('a[download][href="research/overview.png"]').first().click();
    const download=await downloadPromise;
    const temp=path.resolve(root,'../../.cache/sprite-destruction-lab/research-download-check.png');
    await mkdir(path.dirname(temp),{recursive:true});await download.saveAs(temp);
    check('PNG download exactly matches the generated overview',(await readFile(temp)).equals(await readFile(path.join(root,'web/research/overview.png'))));
    const localLinks=await page.locator('a[href]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.href).filter(h=>h.startsWith(location.origin))) ]);
    const failedLinks=[],routedLinks=[];
    for(const href of localLinks){
      const url=new URL(href),response=await page.request.get(url.href);
      if(!response.ok()){failedLinks.push({href,status:response.status()});continue;}
      if(url.hash&&response.headers()['content-type']?.includes('text/html')){
        const text=await response.text(),id=decodeURIComponent(url.hash.slice(1));
        if(!text.includes(`id="${id}"`)&&!text.includes(`id='${id}'`)){
          if(url.pathname.endsWith('/products/')||url.pathname.endsWith('/toolbox/'))routedLinks.push(href);
          else failedLinks.push({href,error:'missing anchor'});
        }
      }
    }
    const routePage=await browser.newPage();observe(routePage);
    for(const href of routedLinks){
      const url=new URL(href),id=url.hash.slice(1);
      await routePage.goto(href,{waitUntil:'networkidle'});
      if(url.pathname.endsWith('/products/'))await routePage.waitForFunction(id=>document.querySelector('[data-tool].active')?.dataset.tool===id,id);
      else await routePage.waitForFunction(id=>window.FormaToolbox?.getState().tab===id,id);
    }
    await routePage.close();
    check('Every internal demo, source, download and section link resolves',failedLinks.length===0,JSON.stringify(failedLinks));
    const recordNames=await page.evaluate(()=>researchSummary.data.evidence.map(e=>e.file));
    const expected=await Promise.all(recordNames.map(async file=>JSON.parse(await readFile(path.join(root,'notes',file),'utf8'))));
    check('Displayed evidence counts match saved browser checks',await page.evaluate(expected=>researchSummary.data.evidence.every((e,i)=>e.total===expected[i].checks.length&&e.passed===expected[i].checks.filter(c=>c.passed).length),expected));
    const text=await page.locator('body').innerText();
    check('Recording provenance and independent toolbox attribution remain explicit',text.includes('操作由脚本完成')&&text.includes('人工点击取得授权的步骤没有在录像验证')&&text.includes('工具功能没有使用碎裂引擎'));
    await page.setViewportSize({width:375,height:900});await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(root,'assets/research-home-mobile.png')});
    check('375 px mobile page has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#preview-map').click();
    check('Mobile diagram can scroll to read the full vector image',await page.locator('.map-scroll').evaluate(el=>el.scrollWidth>el.clientWidth&&el.scrollHeight>el.clientHeight));
    check('Mobile diagram toolbar and close button fit the screen',await page.locator('#close-map').evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth;}));
    await page.locator('#close-map').click();
    await page.locator('#research').scrollIntoViewIfNeeded();await page.locator('[data-filter="character"]').click();
    check('Mobile research filter remains usable',await page.evaluate(()=>researchSummary.getVisible())===2);
    await page.screenshot({path:path.join(root,'assets/research-studies-mobile.png')});
  }
  check('No uncaught errors or missing local assets',errors.length===0,JSON.stringify(errors));
}catch(error){checks.push({name:'Research summary browser run',passed:false,details:error.message});process.exitCode=1;if(page)await page.screenshot({path:path.join(root,'assets/research-summary-failure.png'),fullPage:true});}
finally{
  const report={checkedAt:new Date().toISOString(),url:base,browser:browser.version(),checks,errors};
  await writeFile(path.join(root,'notes',process.env.SUMMARY_REPORT||(renderOnly?'summary-image-checks.json':'summary-checks.json')),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),errors},null,2));
  await browser.close();
}
