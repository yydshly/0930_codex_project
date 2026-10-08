'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.env.CHIPPYTEA_PLAYWRIGHT||'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const project=path.resolve(__dirname,'..'),base=process.argv[2]||'http://127.0.0.1:8996/projects/016-chippytea-lab/';
const online=base.startsWith('https:'),browserBase=online?base:base.replace('127.0.0.1','publication.test');
const output=path.join(project,'notes','publication-review');fs.mkdirSync(output,{recursive:true});
const report={date:'2026-10-08',timezone:'Asia/Shanghai',url:base,browserURL:browserBase,environment:'Actual Chromium; desktop and emulated mobile viewport; no human listening review',checks:[],files:[],pageErrors:[],failedResponses:[],apiRequests:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function check(name,ok,details){report.checks.push({name,passed:!!ok,details});console.log((ok?'PASS ':'FAIL ')+name);if(!ok)throw Error(name+': '+JSON.stringify(details));}
async function main(){
 const mr=await fetch(new URL('publication-manifest.json',base));check('Public runtime manifest available',mr.ok,{status:mr.status});
 const manifest=await mr.json();
 check('All art, scores, three previews and unchanged guide registered',manifest.files.filter(f=>f.path.startsWith('worlds/')&&f.path.endsWith('.png')).length===29&&manifest.files.filter(f=>f.path.endsWith('.mp3')).length===2&&manifest.files.filter(f=>f.path.endsWith('.mp4')).length===3&&manifest.guide_sha256==='b3420ebbed9fef286436c1adbfe731ef2673e8e3ec095d3175b13380dd81bf2e',{count:manifest.files.length});
 for(let i=0;i<manifest.files.length;i+=5)await Promise.all(manifest.files.slice(i,i+5).map(async f=>{
  const r=await fetch(new URL(f.path,base)),data=Buffer.from(await r.arrayBuffer());
  const entry={path:f.path,status:r.status,bytes:data.length,sha256:hash(data),passed:r.ok&&data.length===f.bytes&&hash(data)===f.sha256};
  report.files.push(entry);if(!entry.passed)throw Error('File mismatch '+f.path);
 }));
 check('Every public file is complete and matches manifest SHA-256',report.files.every(f=>f.passed),{count:report.files.length});
 const browser=await chromium.launch({headless:true,args:['--no-proxy-server','--host-resolver-rules=MAP publication.test 127.0.0.1']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  await context.addInitScript(()=>{
   const NativeAudio=window.Audio;window.__labMedia=[];
   window.Audio=class extends NativeAudio{constructor(...args){super(...args);window.__labMedia.push(this)}};
   window.__labAnalysers=[];const original=AudioContext.prototype.createAnalyser;
   AudioContext.prototype.createAnalyser=function(...args){const a=original.apply(this,args);window.__labAnalysers.push(a);return a};
  });
  const p=await context.newPage();
  p.on('pageerror',e=>report.pageErrors.push(e.message));
  p.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/research'))report.apiRequests.push(r.url())});
  p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(browserBase))report.failedResponses.push({url:r.url(),status:r.status()})});
  async function layout(name){const d=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)}));check(name,d.scroll<=d.width+1&&d.broken.length===0,d)}
  await p.goto(browserBase,{waitUntil:'networkidle'});
  await p.getByRole('heading',{level:1}).waitFor();
  check('Overview, unchanged map, six products and all effect routes visible',await p.locator('#map img').count()===1&&await p.locator('.overview-scenes article').count()===3&&await p.locator('.overview-products article').count()===6);
  await layout('Desktop overview fits and every image loads');
  await p.screenshot({path:path.join(output,(online?'online':'local')+'-overview-desktop.png'),fullPage:true});
  const links=await p.locator('a[href]').evaluateAll(es=>es.map(e=>e.href));
  for(const href of [...new Set(links)].filter(x=>x.startsWith(browserBase)&&!x.includes('?'))){const u=new URL(href);if(u.hash&&u.pathname===new URL(browserBase).pathname){check('Overview anchor '+u.hash,await p.locator('[id="'+decodeURIComponent(u.hash.slice(1))+'"]').count()>0);continue}const r=await fetch(href.replace(browserBase,base));check('Overview linked resource '+u.pathname.split('/').pop(),r.ok,{status:r.status})}
  const dl=p.waitForEvent('download');await p.getByRole('link',{name:'下载 PNG ↓'}).click();const download=await dl;const saved=path.join(output,'downloaded-guide.png');await download.saveAs(saved);check('PNG download preserves original generated image',hash(fs.readFileSync(saved))===manifest.guide_sha256);
  for(let i=0;i<3;i++){await p.locator('video').nth(i).evaluate(v=>v.play());await p.waitForTimeout(700);const s=await p.locator('video').nth(i).evaluate(v=>({time:v.currentTime,width:v.videoWidth,paused:v.paused}));check('Actual preview video decode '+i,s.time>0&&s.width>0&&!s.paused,s);await p.locator('video').nth(i).evaluate(v=>v.pause())}
  await p.setViewportSize({width:390,height:844});await layout('Mobile overview fits and images load');await p.screenshot({path:path.join(output,(online?'online':'local')+'-overview-mobile.png'),fullPage:true});
  await p.setViewportSize({width:1440,height:1000});
  for(const scene of ['gravity','moon','shadow']){
   await p.goto(browserBase+'?view=experience&scene='+scene+'&v=10',{waitUntil:'networkidle'});
   await p.waitForFunction(()=>document.querySelector('.world-stage canvas')?.dataset.time!==undefined,{},{timeout:20000}).catch(async()=>{await p.waitForFunction(()=>document.querySelector('canvas')?.dataset.time!==undefined,{},{timeout:20000})});
   check('Actual world renders '+scene,await p.locator('.world-loading').count()===0);
   await layout('Desktop world layout '+scene);
   const c=p.locator('#world-stage canvas');const pixel=await c.evaluate(node=>{const d=node.getContext('2d').getImageData(0,0,node.width,node.height).data;let n=0;for(let i=3;i<d.length;i+=400)if(d[i])n++;return n});check('Nonempty Canvas imagery '+scene,pixel>500,{samples:pixel});
   await p.locator('.world-primary').click();await p.waitForTimeout(500);check('Real pointer/button event triggers independent action '+scene,Number(await c.getAttribute('data-interactions'))>0);
   if(scene!=='moon'){
    await p.locator('.world-music-toggle').click();
    await p.waitForFunction(()=>window.__labMedia.some(m=>m.currentTime>1&&!m.paused),{},{timeout:20000});
    const a=await p.evaluate(()=>{const m=window.__labMedia.find(m=>!m.paused),bands=window.__labAnalysers.map(a=>{const data=new Uint8Array(a.frequencyBinCount);a.getByteFrequencyData(data);return [...data].reduce((s,x)=>s+x,0)});return {time:m.currentTime,ready:m.readyState,duration:m.duration,bands}});
    check('Actual MiniMax media decode, playback and real analyser '+scene,a.time>1&&a.ready>=2&&a.bands.some(x=>x>0),a);
    await p.getByRole('button',{name:'暂停演出',exact:true}).click();await p.waitForTimeout(250);
    const pause=await p.evaluate(()=>window.__labMedia.every(m=>m.paused));check('Pause also pauses actual music '+scene,pause);
   }else check('Moon stays explicitly silent',await p.locator('.world-music-toggle').count()===0&&await p.getByText('这一场静音观看 · 配乐待生成').count()>0);
   await p.locator('.world-collect').click();await p.waitForTimeout(2200);
   const stored=await p.evaluate(()=>JSON.parse(localStorage.getItem('chippytea-original-worlds')||'{}'));
   check('World memory saves to actual browser storage '+scene,stored[scene]===1,stored);
   await p.screenshot({path:path.join(output,(online?'online':'local')+'-'+scene+'-desktop.png')});
   await p.reload({waitUntil:'networkidle'});await p.locator('.world-primary:not([disabled])').waitFor();
   check('World memory survives real reload '+scene,(await p.locator('.world-collect small').innerText()).startsWith('1 份'));
   await p.setViewportSize({width:390,height:844});await layout('Mobile world layout '+scene);await p.screenshot({path:path.join(output,(online?'online':'local')+'-'+scene+'-mobile.png'),fullPage:true});await p.setViewportSize({width:1440,height:1000});
  }
  await p.goto(browserBase+'?view=research&mode=records',{waitUntil:'networkidle'});await p.getByText('只读工作区快照',{exact:true}).waitFor();check('Public receipts are read-only with saving disabled',await p.locator('.collect-button').isDisabled());await layout('Public receipt snapshot has no broken covers');
  await p.goto(browserBase+'?view=folio',{waitUntil:'networkidle'});check('Historical folio remains reachable',await p.locator('.experience').count()===1);
  await p.goto(browserBase+'?view=source',{waitUntil:'networkidle'});check('Original comparison and interactive components preserved',await p.locator('#capabilities').count()===1&&await p.locator('.karaoke-launch').count()===1);await layout('Source comparison layout');
  await p.goto(browserBase+'research.html',{waitUntil:'networkidle'});check('Complete reader preserves source/world/music/QA sections',await p.locator('#source').count()===1&&await p.locator('#worlds').count()===1&&await p.locator('#music').count()===1&&await p.locator('#qa').count()===1);await layout('Complete reader desktop layout');
  await p.setViewportSize({width:390,height:844});await layout('Complete reader mobile layout');
  const ids=await p.locator('[id]').evaluateAll(es=>es.map(e=>e.id));const anchors=await p.locator('a[href^="#"]').evaluateAll(es=>es.map(e=>decodeURIComponent(e.getAttribute('href').slice(1))));check('Reader internal anchors all resolve',anchors.every(a=>!a||ids.includes(a)),{count:anchors.length});
  check('Public routes never call local research APIs',report.apiRequests.length===0,report.apiRequests);
  check('No browser exceptions or failed own resources',report.pageErrors.length===0&&report.failedResponses.length===0,{errors:report.pageErrors,failed:report.failedResponses});
 }finally{await browser.close()}
}
main().then(()=>{report.passed=true}).catch(e=>{report.passed=false;report.error=e.stack;console.error(e);process.exitCode=1}).finally(()=>{fs.writeFileSync(path.join(project,'notes',online?'publication-online-checks.json':'publication-local-checks.json'),JSON.stringify(report,null,2)+'\n');console.log('REPORT '+report.checks.length+' checks; '+report.files.length+' resources')});

