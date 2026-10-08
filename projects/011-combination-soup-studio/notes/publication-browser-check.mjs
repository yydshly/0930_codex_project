import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const req=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=req('playwright'),sharp=req('sharp');
const wt='D:/codex/home/worktrees/soup-publication/0930_codex_project',p=wt+'/projects/011-combination-soup-studio',site=wt+'/_site',prefix='/0930_codex_project',origin='https://soup-preview.test',base=origin+prefix+'/projects/011-combination-soup-studio/';
const shots=p+'/assets/qa/publication',downloads=p+'/notes/publication-downloads';
await fs.mkdir(shots,{recursive:true});await fs.mkdir(downloads,{recursive:true});
const checks=[],pages=[],errors=[],missing=[],requests=[],external=[],screenshots=[];
const record=(name,pass,detail)=>{checks.push({name,passed:!!pass,detail});console.log(JSON.stringify({name,passed:!!pass,detail}));};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.txt':'text/plain','.mp4':'video/mp4','.json':'application/json'};
const browser=await chromium.launch({headless:true});
async function contextFor(width){
 const context=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce',acceptDownloads:true});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());requests.push(u.href);
  if(u.hostname!=='soup-preview.test'){external.push(u.href);return route.continue();}
  const rel=decodeURIComponent(u.pathname.slice(prefix.length)),folder=rel.startsWith('/_delivery/')?downloads:site;
  let f=rel.startsWith('/_delivery/')?path.resolve(folder,rel.slice('/_delivery/'.length)):path.resolve(folder,'.'+rel);
  if(!f.startsWith(path.resolve(folder))){return route.fulfill({status:403,body:'Forbidden'});}
  try{if((await fs.stat(f)).isDirectory())f=path.join(f,'index.html');const body=await fs.readFile(f);await route.fulfill({status:200,body,contentType:mime[path.extname(f)]||'application/octet-stream'});}
  catch(e){missing.push({url:u.href,file:f,message:e.message});await route.fulfill({status:404,body:'Missing static file'});}
 });
 context.on('page',pg=>pg.on('pageerror',e=>errors.push({url:pg.url(),message:e.message})));
 return context;
}
async function screenshot(pg,name,selector){const f=shots+'/'+name+'.png';if(selector)await pg.locator(selector).screenshot({path:f});else await pg.screenshot({path:f});screenshots.push(path.relative(p,f).replaceAll('\\','/'));}
async function goto(pg,url){await pg.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(650);}
async function download(pg,selector,name){const [d]=await Promise.all([pg.waitForEvent('download',{timeout:20000}),pg.locator(selector).click()]);const f=downloads+'/'+name;await d.saveAs(f);return {path:f,name:d.suggestedFilename(),body:await fs.readFile(f)};}
async function attempt(name,fn){try{await fn();}catch(e){record(name,false,e.message);}}
async function unpack(zip,folder){const r=spawnSync('D:/software/python310/python.exe',['-X','utf8','-c','import zipfile,sys,json; z=zipfile.ZipFile(sys.argv[1]); z.extractall(sys.argv[2]); print(json.dumps(z.namelist()))',zip,downloads+'/'+folder],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);return JSON.parse(r.stdout);}
try{
 await Promise.all([1440,390].map(async width=>{
  const context=await contextFor(width),pg=await context.newPage();
  for(const [name,route] of [['home',''],['understanding','understanding.html'],['map','understanding-map.html'],['foundry','foundry/'],['studio','foundry/studio.html'],['toilet','foundry/showroom.html?example=toilet'],['headphones','foundry/showroom.html?example=headphones']]){
   await attempt(`${width}/${name}/load`,async()=>{
    await goto(pg,base+route);if(name==='toilet')await pg.locator('#toilet-canvas').waitFor({state:'attached',timeout:15000});if(name==='headphones')await pg.locator('#headphone-canvas').waitFor({state:'attached',timeout:15000});
    const measure=await pg.evaluate(()=>({title:document.title,view:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)}));
    record(`${width}/${name}/layout`,measure.document<=width+1&&measure.body<=width+1,measure);pages.push({width,name,url:pg.url(),...measure});await screenshot(pg,`${name}-${width}`);
    if(name==='home'){
     const guide=await pg.locator('.publication-guide img').boundingBox();record(`${width}/home/guide-in-initial-screen`,guide&&guide.y< (width===390?844:1000),guide);
     record(`${width}/home/full-directory`,await pg.locator('.experience-grid article').count()===6,await pg.locator('#experience-directory a').allTextContents());
     await pg.locator('#experience-directory').scrollIntoViewIfNeeded();await screenshot(pg,`directory-${width}`);
    }
    if(name==='studio')record(`${width}/studio/public-provider-disabled`,await pg.locator('option[value=model]').evaluate(o=>o.disabled)&&(await pg.locator('#model-status').textContent()).includes('公开静态'),await pg.locator('#model-status').textContent());
    if(name==='toilet'||name==='headphones'){
     const kind=JSON.parse(await pg.locator('#prototype-config').textContent()).product.kind;record(`${width}/${name}/correct-product`,kind===name&&await pg.locator(`[data-case=${name}]`).getAttribute('aria-current')==='page',kind);
     await pg.locator(name==='toilet'?'#toilet-canvas':'#headphone-canvas').scrollIntoViewIfNeeded();await pg.waitForTimeout(600);await screenshot(pg,`${name}-live-${width}`);
    }
   });
  }
  for(const [type,values] of [['effect',['hero','menu','broth','delivery','fortune']],['scene',['brand','product','garden']],['skill',['story','explain','territory','reveal']]]){
   for(const v of values)await attempt(`${width}/${type}/${v}`,async()=>{
    const anchor={effect:'original-effects',scene:'scenes',skill:'skills'}[type];await goto(pg,base+`?${type}=${v}#${anchor}`);
    record(`${width}/${type}/${v}/selected`,await pg.locator(`button[data-${type}=${v}]`).getAttribute('aria-selected')==='true');
    if(type==='effect')record(`${width}/effect/${v}/mounted`,await pg.locator('#effect-stage').getAttribute('data-effect')===v&&await pg.locator('#effect-stage').textContent().then(t=>t.length>10));
    await pg.locator('#'+anchor).scrollIntoViewIfNeeded();await screenshot(pg,`${type}-${v}-${width}`);
   });
  }
  await attempt(`${width}/map-controls`,async()=>{
   await goto(pg,base+'understanding-map.html');await pg.locator('#viewer img').evaluate(i=>i.decode());const dim=await pg.locator('#viewer img').evaluate(i=>({naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,width:i.getBoundingClientRect().width}));
   record(`${width}/map/PNG-dimensions`,dim.naturalWidth===2800&&dim.naturalHeight===9581,dim);
   record(`${width}/map/fit`,dim.width<=width);
   await pg.locator('button[data-size=original]').click();record(`${width}/map/original`,await pg.locator('#viewer img').evaluate(i=>i.getBoundingClientRect().width===2800)&&await pg.locator('button[data-size=original]').getAttribute('aria-pressed')==='true');
   await screenshot(pg,`map-original-${width}`);await pg.locator('button[data-size=fit]').click();record(`${width}/map/refit`,await pg.locator('#viewer img').evaluate(i=>i.getBoundingClientRect().width<=innerWidth));
   const d=await download(pg,'a[download]',`map-${width}.png`),meta=await sharp(d.body).metadata();record(`${width}/map/actual-download`,meta.width===2800&&meta.height===9581,{name:d.name,bytes:d.body.length,width:meta.width,height:meta.height});
  });
  await attempt(`${width}/studio-plan-paths`,async()=>{
   await goto(pg,base+'foundry/studio.html?example=headphones');await pg.locator('#plan-content').waitFor({state:'visible',timeout:15000});record(`${width}/studio/demo`,(await pg.locator('#plan-source').textContent()).includes('示例'));await screenshot(pg,`studio-demo-${width}`);
   const d=await download(pg,'#download-plan',`studio-demo-${width}.json`),j=JSON.parse(d.body);record(`${width}/studio/demo-download`,j.provider==='demo'&&j.plan.category==='headphones',j.provider);
   await pg.locator('#brief-product').fill('咖啡机');await pg.locator('#brief-goal').fill('比较外观与容量，导出制作需求');await pg.locator('#plan-provider').selectOption('local-rules');await pg.locator('#generate-plan').click();await pg.waitForFunction(()=>document.querySelector('#plan-source').textContent.includes('本地'));
   const local=JSON.parse((await download(pg,'#download-plan',`studio-local-${width}.json`)).body);record(`${width}/studio/local-other-guard`,local.provider==='local-rules'&&local.plan.category==='other'&&local.plan.missing.some(s=>s.includes('尚未实现')),local.plan.missing);await screenshot(pg,`studio-local-${width}`);
  });
  await attempt(`${width}/coverage-complete`,async()=>{
   await pg.evaluate(()=>localStorage.clear());await goto(pg,base+'foundry/?example=coverage&template=coverage');record(`${width}/coverage/default`,await pg.locator('[data-template=coverage]').getAttribute('aria-pressed')==='true');await pg.locator('#build').click();const frame=pg.frameLocator('#prototype');await frame.locator('#query').waitFor({state:'visible',timeout:15000});
   await frame.locator('#request-note').fill('客厅两盏灯');await frame.locator('#query').click();record(`${width}/coverage/covered`,await frame.locator('#query-result').getAttribute('data-available')==='true');
   await frame.locator('#region').selectOption('region-2');record(`${width}/coverage/change-clears-result`,await frame.locator('#save-request').isDisabled());await frame.locator('#query').click();record(`${width}/coverage/uncovered`,await frame.locator('#query-result').getAttribute('data-available')==='false');
   const [d]=await Promise.all([pg.waitForEvent('download'),frame.locator('#save-request').click()]);const f=downloads+`/service-${width}.json`;await d.saveAs(f);const data=JSON.parse(await fs.readFile(f));record(`${width}/coverage/request-JSON`,data.region==='上海'&&!data.available&&data.note==='客厅两盏灯'&&data.submitted===false,data);await screenshot(pg,`coverage-result-${width}`);
   await pg.locator('#go-delivery').click();const z=await download(pg,'#export-zip',`coverage-${width}.zip`),names=await unpack(z.path,`coverage-${width}`);record(`${width}/coverage/ZIP`,names.includes('index.html')&&names.includes('product-definition.json')&&names.includes('README.md')&&names.includes('preview-result.json'),{name:z.name,bytes:z.body.length,entries:names});await screenshot(pg,`delivery-coverage-${width}`);
   await goto(pg,origin+prefix+`/_delivery/coverage-${width}/`);await pg.locator('#query').waitFor({state:'visible'});await pg.locator('#query').click();record(`${width}/coverage/ZIP-runs`,await pg.locator('#query-result').getAttribute('data-available')==='true');
  });
  await attempt(`${width}/headphone-ZIP`,async()=>{
   await goto(pg,base+'foundry/?example=headphones&step=preview');const frame=pg.frameLocator('#prototype');await frame.locator('#headphone-canvas').waitFor({state:'attached',timeout:15000});await pg.waitForFunction(()=>!document.querySelector('#export-zip').disabled,{},{timeout:20000});await pg.locator('#go-delivery').click();const z=await download(pg,'#export-zip',`headphones-${width}.zip`),names=await unpack(z.path,`headphones-${width}`);record(`${width}/headphones/ZIP-assets`,['vendor/THREE-LICENSE.txt','vendor/three-r160.min.js','foundry/headphone-renderer.js','foundry/assets/headphone-hero-v12.webp','product-definition.json'].every(v=>names.includes(v)),{name:z.name,bytes:z.body.length,entries:names.length});
   await goto(pg,origin+prefix+`/_delivery/headphones-${width}/`);await pg.locator('#headphone-canvas').waitFor({state:'attached'});await pg.locator('#headphone-canvas').scrollIntoViewIfNeeded();await pg.waitForTimeout(800);record(`${width}/headphones/ZIP-runs`,await pg.locator('#aura-top').isVisible()&&await pg.locator('#headphone-canvas').evaluate(c=>c.width>0&&c.height>0));await screenshot(pg,`headphone-ZIP-live-${width}`);
  });
  await attempt(`${width}/delivery-direct-link`,async()=>{await goto(pg,base+'foundry/?example=headphones&step=delivery');record(`${width}/delivery/direct-entry`,await pg.locator('#step-delivery').isVisible(),{status:await pg.locator('#status').textContent(),visibleStep:await pg.locator('[data-step][aria-current=step]').getAttribute('data-step')});});
  await context.close();
 }));
 record('public-host/no-loopback-service',!requests.some(u=>u.includes('127.0.0.1:8952')||u.includes('localhost:8952')),{publicOrigin:origin,requestCount:requests.length});
 record('static-assets/no-missing',missing.length===0,missing);record('browser/no-pageerrors',errors.length===0,errors);
}catch(e){record('fatal',false,e.stack);}
finally{
 await browser.close();const report={createdAt:new Date().toISOString(),siteRoot:site,host:origin+prefix,mode:'virtual HTTPS public hostname, actual _site files, headless Chromium, reduced motion',checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),pages,errors,missing,externalRequests:[...new Set(external)],screenshots,scope:'Publication paths only, not all prior renderer regression checks. Original upstream media is external and its availability is not a local deployment guarantee.'};await fs.writeFile(p+'/notes/publication-browser-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify({completed:true,passed:report.passed,failed:report.failed.length,screenshots:screenshots.length,errors:errors.length,missing:missing.length}));
}
