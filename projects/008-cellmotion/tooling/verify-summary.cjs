const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const root=path.resolve(__dirname,'..'),downloads=path.join(root,'build/summary-qa');
fs.mkdirSync(downloads,{recursive:true});
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),checks=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw new Error(name);};
  try{
    const diagram=await browser.newPage({viewport:{width:1600,height:1760}});
    await diagram.goto(pathToFileURL(path.join(root,'web/assets/understanding-map.svg')).href);
    check('Vector overview is a valid accessible SVG',await diagram.locator('svg[role="img"]').count()===1&&await diagram.locator('title').textContent()!==null);
    const outside=await diagram.locator('svg').evaluate(svg=>Array.from(svg.querySelectorAll('text')).filter(t=>{const b=t.getBBox();return b.x<0||b.y<0||b.x+b.width>1600||b.y+b.height>1760;}).map(t=>t.textContent));
    check('All diagram text fits the exported canvas',outside.length===0);
    await diagram.locator('svg').screenshot({path:path.join(root,'web/assets/understanding-map.png')});
    fs.copyFileSync(path.join(root,'web/assets/understanding-map.png'),path.join(root,'assets/understanding-map.png'));
    await diagram.close();
    const response=await page.goto('http://127.0.0.1:8958/summary.html',{waitUntil:'networkidle'});
    check('Summary page loads with all six requested topics',response.ok()&&await page.locator('#library,#principle,#comparison,#website,#value,#daily').count()===6);
    check('Overview image loads at its complete dimensions',await page.locator('#understanding-map').evaluate(i=>i.complete&&i.naturalWidth===1600&&i.naturalHeight===1760));
    const downloadEvent=page.waitForEvent('download');await page.locator('.map-downloads a').first().click();const download=await downloadEvent,pngPath=path.join(downloads,'overview.png');await download.saveAs(pngPath);
    check('PNG download returns the actual full-resolution diagram',fs.readFileSync(pngPath).equals(fs.readFileSync(path.join(root,'web/assets/understanding-map.png'))));
    const svgEvent=page.waitForEvent('download');await page.locator('.map-downloads a').last().click();const svg=await svgEvent,svgPath=path.join(downloads,'overview.svg');await svg.saveAs(svgPath);
    check('SVG download preserves the editable vector source',fs.readFileSync(svgPath).equals(fs.readFileSync(path.join(root,'web/assets/understanding-map.svg'))));
    await page.locator('.summary-jumps a[href="#comparison"]').click();await page.waitForFunction(()=>{const b=document.querySelector('#comparison').getBoundingClientRect();return location.hash==='#comparison'&&b.top<innerHeight&&b.bottom>0;});
    check('Topic navigation reaches the comparison section',await page.locator('#comparison').evaluate(e=>{const b=e.getBoundingClientRect();return b.top<innerHeight&&b.bottom>0;}));
    check('Comparison includes three schemes and clearly marks the daily workflow as a proposal',await page.locator('.comparison-table thead th').allTextContents().then(items=>['CellMotion','Remotion','HeyGen'].every(s=>items.includes(s)))&&(await page.locator('#daily .section-top p').last().textContent()).includes('没有已经接通'));
    await page.locator('#comparison').screenshot({path:path.join(root,'assets/summary-comparison.png')});
    await page.locator('#website').screenshot({path:path.join(root,'assets/summary-website.png')});
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(root,'assets/summary-desktop.png')});
    for(const width of [768,390]){
      await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));
      check(`${width}px summary has no horizontal page overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(width===390){
        check('Mobile diagram scrolls inside its frame',await page.locator('.map-scroll').evaluate(e=>e.scrollWidth>e.clientWidth));
        await page.locator('.map-scroll').evaluate(e=>e.scrollLeft=e.scrollWidth);
        check('Mobile can reach the diagram right side without expanding the page',await page.locator('.map-scroll').evaluate(e=>e.scrollLeft>100)&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await page.locator('.map-scroll').evaluate(e=>e.scrollLeft=0);await page.screenshot({path:path.join(root,'assets/summary-mobile.png')});
        await page.locator('#comparison').scrollIntoViewIfNeeded();check('Mobile comparison has its own horizontal scroll',await page.locator('.comparison-scroll').evaluate(e=>e.scrollWidth>e.clientWidth));
      }
    }
    await page.goto('http://127.0.0.1:8958/workshop.html',{waitUntil:'networkidle'});await page.locator('.workshop-header a[href="summary.html"]').click();
    check('Existing workshop links to the new summary',page.url().endsWith('/summary.html'));
    await page.goto('http://127.0.0.1:8958/',{waitUntil:'domcontentloaded'});check('Existing exhibit links to the new summary',await page.locator('.site-header a[href="summary.html"]').count()===1);
    check('No browser script errors during summary navigation and downloads',errors.length===0);
  }finally{
    fs.writeFileSync(path.join(root,'notes/summary-verification.json'),JSON.stringify({date:'2026-10-02',checks,errors},null,2)+'\n');console.log(JSON.stringify({checks,errors},null,2));await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
