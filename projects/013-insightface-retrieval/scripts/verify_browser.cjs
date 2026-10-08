const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const project = path.resolve(__dirname,'..');
const base = new URL(process.argv[2] || 'http://127.0.0.1:8939/projects/013-insightface-retrieval/');
const phase = base.hostname === '127.0.0.1' ? 'local' : 'online';
const modules = process.argv[3];
const load = modules ? createRequire(path.join(path.resolve(modules),'__research__.cjs')) : require;
const {chromium} = load('playwright');
const checks=[];
const errors=[];
const failedResponses=[];
const unexpectedLocalRequests=[];
function check(name,pass,details={}) { checks.push({name,pass:Boolean(pass),...details}); }
function sha(bytes) {return crypto.createHash('sha256').update(bytes).digest('hex');}
(async () => {
  let browser;
  try {browser=await chromium.launch({headless:true});}
  catch (error) {
    const choices=[process.env.CHROME_PATH,path.join(process.env.PROGRAMFILES || 'C:/Program Files','Google/Chrome/Application/chrome.exe'),path.join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe')].filter(Boolean);
    const executablePath=choices.find(file=>fs.existsSync(file));
    if (!executablePath) throw error;
    browser=await chromium.launch({headless:true,executablePath});
  }
  const output=path.join(project,'build');fs.mkdirSync(output,{recursive:true});
  try {
    const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.url().startsWith(base.href)&&response.status()>=400) failedResponses.push({url:response.url(),status:response.status()});});
    page.on('request',request=>{
      const u=new URL(request.url());
      if (['localhost','127.0.0.1','[::1]'].includes(u.hostname) && u.origin !== base.origin) unexpectedLocalRequests.push(request.url());
    });
    const internalLinks=[];
    for (const name of ['index.html','understanding.html','map.html','mechanisms.html','sources.html']) {
      await page.setViewportSize({width:1440,height:1000});
      const response=await page.goto(new URL(name,base).href,{waitUntil:'networkidle'});
      check(`desktop ${name}: loads`,response.status()===200);
      await page.evaluate(()=>document.fonts.ready);
      const desktop=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,missingImages:[...document.images].filter(image=>!image.complete||!image.naturalWidth).length}));
      check(`desktop ${name}: layout and images`,!desktop.overflow&&!desktop.missingImages,desktop);
      const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(node=>node.href));
      internalLinks.push(...links.filter(url=>url.startsWith(base.href)));
      if (name==='index.html') {
        check('homepage: original guide and four entry cards',await page.locator('.hero-map img').isVisible()&&await page.locator('#entries .card').count()===4);
        check('homepage: six reference products and libraries',await page.locator('#references .card').count()===6);
        await page.screenshot({path:path.join(output,`publication-${phase}-desktop.png`)});
        await page.screenshot({path:path.join(output,`publication-${phase}-homepage.png`),fullPage:true});
      }
      await page.setViewportSize({width:360,height:900});
      const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,missingImages:[...document.images].filter(image=>!image.complete||!image.naturalWidth).length}));
      check(`mobile ${name}: layout and images`,!mobile.overflow&&!mobile.missingImages,mobile);
      if (name==='index.html') await page.screenshot({path:path.join(output,`publication-${phase}-mobile.png`)});
    }
    for (const url of [...new Set(internalLinks)]) {
      const response=await context.request.get(url);
      let found=response.status()===200;
      const fragment=new URL(url).hash.slice(1);
      if (found && fragment) {
        const html=await response.text();
        const id=decodeURIComponent(fragment).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        found=new RegExp(`id=["']${id}["']`).test(html);
      }
      check(`internal link ${new URL(url).pathname.split('/').pop()}${new URL(url).hash}`,found,{status:response.status()});
    }
    await page.setViewportSize({width:1280,height:900});
    await page.goto(new URL('map.html',base).href);
    await page.locator('#actual').click();
    const actual=await page.locator('#overview').evaluate(el=>el.getBoundingClientRect().width);
    check('map: original size mode',actual===2400,{width:actual});
    await page.locator('#zoom').focus();await page.keyboard.press('End');
    check('map: keyboard zoom to 200%',await page.locator('#overview').evaluate(el=>el.getBoundingClientRect().width)===4800);
    await page.locator('#fit').click();
    check('map: fit mode',await page.locator('#overview').evaluate(el=>el.getBoundingClientRect().width)<=await page.locator('#pane').evaluate(el=>el.clientWidth));
    for (const ext of ['png','svg']) {
      const event=page.waitForEvent('download');
      await page.locator(`a[download$=".${ext}"]`).click();
      const download=await event;
      const target=path.join(output,`${phase}-${download.suggestedFilename()}`);
      await download.saveAs(target);
      const expected=fs.readFileSync(path.join(project,'assets',`understanding-map.${ext}`));
      const actual=fs.readFileSync(target);
      check(`download ${ext}: identical original`,sha(actual)===sha(expected),{bytes:actual.length,sha256:sha(actual)});
    }
    await page.goto(new URL('mechanisms.html',base).href);
    for(const [task,expected] of [['frame','原视频'],['semantic','相关'],['identity','其他照片']]) {
      await page.locator(`[data-task="${task}"]`).click();
      check(`task switch ${task}`,await page.locator('#task-target').innerText().then(text=>text.includes(expected)));
    }
    check('vectors: two candidates at teaching threshold 0.90',await page.locator('.score-pass').count()===2);
    await page.locator('#remove-target').check();
    check('vectors: reject when target samples absent',await page.locator('#vector-status').innerText().then(text=>text.includes('没有可靠匹配')));
    await page.locator('#threshold').focus();await page.keyboard.press('Home');
    check('vectors: lowering threshold shows wrong association',await page.locator('#vector-status').innerText().then(text=>text.includes('错误关联')));
    await page.keyboard.press('End');
    check('vectors: strict threshold restores no match',await page.locator('#vector-status').innerText().then(text=>text.includes('没有可靠匹配')));
    await page.locator('#remove-target').uncheck();
    await page.locator('#threshold').evaluate(el=>{el.value='0.90';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.screenshot({path:path.join(output,`publication-${phase}-mechanisms.png`),fullPage:true});
    check('page JavaScript errors',errors.length===0,{errors});
    check('public asset HTTP errors',failedResponses.length===0,{failedResponses});
    check('no visitor-local model requests',unexpectedLocalRequests.length===0,{unexpectedLocalRequests});
    const result={date:'2026-10-08',base:base.href,phase,realRecognitionTest:false,checks,passed:checks.filter(item=>item.pass).length,total:checks.length};
    const report=process.argv[4] ? path.resolve(process.argv[4]) : path.join(project,'notes',`publication-browser-${phase}.json`);
    fs.mkdirSync(path.dirname(report),{recursive:true});
    fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({phase,passed:result.passed,total:result.total,failures:checks.filter(item=>!item.pass)},null,2));
    if(result.passed!==result.total) process.exitCode=1;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
