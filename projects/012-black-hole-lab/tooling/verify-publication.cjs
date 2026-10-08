/* Verify the deployed subpath, every public file, native controls and entry links. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.env.BLACK_HOLE_PLAYWRIGHT||'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const at=process.argv.indexOf('--url'),base=at<0?'http://127.0.0.1:62117/projects/012-black-hole-lab/':process.argv[at+1];
const project=path.resolve(__dirname,'..'),online=new URL(base).protocol==='https:';
const report={date:'2026-10-08',timezone:'Asia/Shanghai',url:base,environment:'Chromium/SwiftShader; mobile viewport simulation',checks:[],files:[],errors:[]};
function check(name,ok,details){report.checks.push({name,passed:!!ok,details});console.log((ok?'PASS ':'FAIL ')+name);if(!ok)throw Error(name+': '+JSON.stringify(details));}
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const response=await fetch(new URL('publication-manifest.json',base));check('Public manifest available',response.status===200,{status:response.status});
 const manifest=await response.json();check('Complete public runtime and all narration registered',manifest.files.length===44&&manifest.files.filter(f=>f.path.endsWith('.mp3')).length===31&&manifest.audio.segments===30,{count:manifest.files.length});
 for(let i=0;i<manifest.files.length;i+=4)await Promise.all(manifest.files.slice(i,i+4).map(async f=>{
  const r=await fetch(new URL(f.path,base)),data=Buffer.from(await r.arrayBuffer());
  const record={path:f.path,status:r.status,bytes:data.length,sha256:digest(data),passed:r.status===200&&data.length===f.bytes&&digest(data)===f.sha256};
  report.files.push(record);if(!record.passed)throw Error('Public file mismatch: '+f.path);
  const local=fs.readFileSync(path.join(project,'web',f.path));
  const text=/\.(html|css|js|svg)$/.test(f.path);
  if(text?data.toString('utf8').replace(/\r\n/g,'\n')!==local.toString('utf8').replace(/\r\n/g,'\n'):digest(local)!==digest(data))throw Error('Source differs from deployed file: '+f.path);
 }));
 check('Every public file matches bytes, SHA-256 and reviewed source',report.files.every(f=>f.passed),{files:report.files.length});
 check('Original guide retained byte for byte',manifest.files.find(f=>f.path==='assets/understanding-map.png').sha256==='73a859b1ad6a710c4aa19706ba1828849b49169a368a57ff65cf6d4779908c54'&&manifest.files.find(f=>f.path==='assets/understanding-map.svg').sha256==='c2e6527c19e4bee2e24560ddf22d751e99f043b008a3c8d13f2ff754d33006e7');
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const output=path.resolve(project,'../../.tmp/black-hole-publication-review');fs.mkdirSync(output,{recursive:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(base,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.blackHoleLab);
  const opening=await p.evaluate(()=>({state:blackHoleLab.getState().journey,paused:document.querySelector('audio').paused,cards:document.querySelectorAll('#entries .entry-card').length}));
  check('Entry opens quietly with six prominent routes',opening.state.stage===0&&opening.paused&&opening.cards===6,opening);
  for(const width of [1280,390,320]){
   await p.setViewportSize({width,height:900});await p.goto(base,{waitUntil:'networkidle'});
   const layout=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,guide:document.querySelector('.overview-guide img').naturalWidth,nav:[...document.querySelectorAll('.site-header nav a')].every(a=>a.getBoundingClientRect().width>0)}));
   check('Main entrance readable at '+width+'px',layout.scroll<=width+1&&layout.guide===1800&&layout.nav,layout);
   if(width!==320)await p.screenshot({path:path.join(output,'entry-'+width+'.png')});
  }
  await p.setViewportSize({width:1280,height:900});
  await p.locator('[data-view-effect]').first().click();await p.waitForFunction(()=>blackHoleLab.getState().journey.mode==='free'&&blackHoleLab.getState().renderCount>0);
  const effect=await p.evaluate(()=>{const s=blackHoleLab.getState(),v=blackHoleLab.readPixels();let bright=0;for(let i=0;i<v.length;i+=4)if(v[i]+v[i+1]+v[i+2]>180)bright++;return{mode:s.journey.mode,falseColor:s.falseColor,bright,pixels:v.length/4,audioPaused:document.querySelector('audio').paused};});
  check('Complete-effect entry produces actual rendered pixels and free controls',effect.mode==='free'&&effect.falseColor&&effect.bright>100&&effect.audioPaused,effect);
  const saved=p.waitForEvent('download');await p.locator('#capture').click();const capture=await saved,capPath=path.join(output,'render.png');await capture.saveAs(capPath);
  check('Native effect export is a real PNG',fs.readFileSync(capPath).subarray(1,4).toString()==='PNG');
  await p.goto(new URL('?view=effect#experiment',base).href,{waitUntil:'networkidle'});
  check('Published full-effect deep link opens free experiment',await p.evaluate(()=>blackHoleLab.getState().journey.mode==='free'));
  await p.locator('[data-start-course]').first().click();await p.waitForFunction(()=>{const a=document.querySelector('audio');return !a.paused&&a.currentTime>0;},null,{timeout:30000});
  check('Course entry really starts generated Chinese audio from chapter zero',await p.evaluate(()=>blackHoleLab.getState().journey.stage===0&&document.querySelector('audio').getAttribute('src').includes('00-00.mp3')));
  await p.locator('#pause').click();const before=await p.locator('audio').evaluate(a=>a.currentTime);await p.waitForTimeout(200);
  check('Narration pause holds playback position',await p.locator('audio').evaluate((a,t)=>a.paused&&Math.abs(a.currentTime-t)<.1,before));
  await p.locator('[data-stage="9"]').click();await p.locator('#cue-next').click();await p.locator('#cue-next').click();await p.locator('#chapter-narration').click();
  await p.waitForFunction(()=>{const a=document.querySelector('audio');return !a.paused&&a.currentTime>0;},null,{timeout:30000});
  check('Final chapter audio is available and playable',await p.locator('audio').evaluate(a=>a.getAttribute('src').includes('09-00.mp3')&&a.duration>10));await p.locator('#pause').click();
  const fullDuration=await p.evaluate(async()=>{const a=new Audio('audio/narration/full-course.mp3');a.preload='metadata';return new Promise((resolve,reject)=>{a.onloadedmetadata=()=>resolve(a.duration);a.onerror=()=>reject(Error('Full narration decode failed'));});});
  check('Complete-course MP3 decodes to about 13 minutes',fullDuration>780&&fullDuration<790,{duration:fullDuration});
  for(const name of ['index.html','research.html','time-and-light.html']){
   await p.goto(new URL(name,base).href,{waitUntil:'networkidle'});
   const anchors=await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id),missing=[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href').slice(1)).filter(id=>id&&!document.getElementById(id));return{duplicates:ids.filter((id,n)=>ids.indexOf(id)!==n),missing};});
   check('All local fragments exist in '+name,!anchors.duplicates.length&&!anchors.missing.length,anchors);
  }
  for(const width of [1280,390,320]){
   await p.setViewportSize({width,height:900});await p.goto(new URL('research.html#science',base).href,{waitUntil:'networkidle'});
   const layout=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,sections:['understanding','science','narration','records'].every(id=>document.getElementById(id))}));
   check('Complete archive readable at '+width+'px',layout.scroll<=width+1&&layout.sections,layout);
  }
  for(const width of [1280,390,320]){
   await p.setViewportSize({width,height:900});await p.goto(new URL('time-and-light.html',base).href,{waitUntil:'networkidle'});
   await p.locator('#spacetime-basics-v1 [data-next]').click();await p.locator('#spacetime-basics-v1 [data-action]').click();
   const clocks=await p.locator('#spacetime-basics-v1').innerText();
   check('Interactive static clocks accumulate 60.0s and 52.2s at '+width+'px',clocks.includes('60.0')&&clocks.includes('52.2'),{width});
   await p.locator('#spacetime-basics-v1 [data-next]').click();for(let n=0;n<4;n++)await p.locator('#spacetime-basics-v1 [data-action]').click();
   check('Horizon light diagram advances to its final state at '+width+'px',await p.locator('#spacetime-basics-v1 [data-heading]').innerText()==='黑洞边界：向外发出的光');
   await p.locator('#light-clock-aging-v1 [data-play]').click();
   await p.waitForFunction(()=>document.querySelector('#light-clock-aging-v1 [data-play]').textContent.includes('再播放一次'));
   const counts=await p.locator('#light-clock-aging-v1').evaluate(el=>({still:el.querySelector('[data-still-count]').textContent,moving:el.querySelector('[data-moving-count]').textContent}));
   check('Motion light clock completes with 1.67 versus 1.00 ticks at '+width+'px',counts.still.includes('1.67')&&counts.moving.includes('1.00'),counts);
   const layout=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('svg text')].filter(t=>{const b=t.getBBox(),v=t.ownerSVGElement.viewBox.baseVal;return b.x<-.5||b.x+b.width>v.width+.5;}).length}));
   check('All discussion experiments fit page and SVG at '+width+'px',layout.scroll<=width+1&&layout.overflow===0,layout);
  }
  await p.goto(base,{waitUntil:'networkidle'});const mapSaved=p.waitForEvent('download');await p.locator('.overview-links a[download]').first().click();const map=await mapSaved,mapPath=path.join(output,'understanding-map.png');await map.saveAs(mapPath);
  check('Native guide download preserves original PNG',digest(fs.readFileSync(mapPath))==='73a859b1ad6a710c4aa19706ba1828849b49169a368a57ff65cf6d4779908c54');
  await p.goto(new URL('../../',base).href,{waitUntil:'networkidle'});
  const card=p.locator('article').filter({has:p.locator('h2',{hasText:'Black Hole Lab'})});
  check('Catalog prominently links effect, summary, archive and original guide',await card.locator('a[href*="?view=effect#experiment"]').count()===1&&await card.locator('a[href$="research.html"]').count()===1&&await card.locator('img').getAttribute('src')==='./projects/012-black-hole-lab/assets/understanding-map.png');
  for(const id of ['001-witr','005-plush-lab','008-cellmotion','009-sprite-destruction-lab','010-dumpling-style-lab','011-combination-soup-studio','013-insightface-retrieval']){const r=await fetch(new URL('../'+id+'/',base));check('Existing public entrance preserved: '+id,r.status===200,{status:r.status});}
  check('No page runtime errors',report.errors.length===0,report.errors);
 }finally{await browser.close();}
 report.result='passed';
}
main().catch(e=>{report.result='failed';report.errors.push(e.stack||String(e));process.exitCode=1;console.error(e.message);}).finally(()=>{report.checksPassed=report.checks.filter(c=>c.passed).length;fs.writeFileSync(path.join(project,'notes','publication-'+(online?'online':'local')+'-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,checks:report.checksPassed,files:report.files.length}));});
