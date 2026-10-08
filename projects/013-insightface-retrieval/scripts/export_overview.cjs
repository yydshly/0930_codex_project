const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const project = path.resolve(__dirname, '..');
const bundle = process.argv[2];
const load = bundle ? createRequire(path.join(path.resolve(bundle), '__overview__.cjs')) : require;
const { chromium } = load('playwright');
const sharp = load('sharp');
(async () => {
  let browser;
  try { browser = await chromium.launch({headless:true}); }
  catch (firstError) {
    const candidates = [process.env.CHROME_PATH, path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'), path.join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe')].filter(Boolean);
    const executablePath = candidates.find(p => fs.existsSync(p));
    if (!executablePath) throw firstError;
    browser = await chromium.launch({headless:true, executablePath});
  }
  try {
    const page = await browser.newPage({viewport:{width:2400,height:3620},deviceScaleFactor:1});
    await page.goto(pathToFileURL(path.join(project,'assets','understanding-map.svg')).href);
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => {
      const failures=[];
      const svg=document.querySelector('svg');
      const w=svg.viewBox.baseVal.width, h=svg.viewBox.baseVal.height;
      for (const el of document.querySelectorAll('text')) {
        const b=el.getBBox();
        if(b.x < -1 || b.y < -1 || b.x+b.width>w+1 || b.y+b.height>h+1) failures.push({type:'canvas-overflow',text:el.textContent,box:{x:b.x,y:b.y,width:b.width,height:b.height}});
      }
      for(const group of document.querySelectorAll('g[data-panel]')) {
        const x=+group.dataset.x,y=+group.dataset.y,w=+group.dataset.width,h=+group.dataset.height;
        for(const el of group.querySelectorAll('text')) {
          const b=el.getBBox();
          if(b.x<x+15 || b.x+b.width>x+w-15 || b.y<y+10 || b.y+b.height>y+h-10) failures.push({type:'panel-overflow',panel:group.dataset.panel,text:el.textContent,box:{x:b.x,y:b.y,width:b.width,height:b.height}});
        }
      }
      return {width:w,height:h,panels:document.querySelectorAll('g[data-panel]').length,textElements:document.querySelectorAll('text').length,failures};
    });
    await page.screenshot({path:path.join(project,'assets','understanding-map.png')});
    const previews=path.join(project,'build');fs.mkdirSync(previews,{recursive:true});
    await sharp(path.join(project,'assets','understanding-map.png')).resize({width:1200}).png().toFile(path.join(previews,'overview-preview.png'));
    for(const [name,top,height] of [['top',0,1300],['middle',1300,1400],['bottom',2700,920]]) {
      await sharp(path.join(project,'assets','understanding-map.png')).extract({left:0,top,width:2400,height}).resize({width:1500}).png().toFile(path.join(previews,`qa-${name}.png`));
    }
    const pageErrors=[]; page.on('pageerror',e=>pageErrors.push(e.message));
    const viewerChecks=[];
    for(const width of [1280,360]) {
      await page.setViewportSize({width,height:900});
      const site = path.join(project,'..','..','_site','projects','013-insightface-retrieval','map.html');
      if (!fs.existsSync(site)) throw new Error('Run the root scripts/build_site.py before checking the public map reader.');
      await page.goto(pathToFileURL(site).href);
      await page.locator('#overview').waitFor({state:'visible'});
      await page.evaluate(() => document.fonts.ready);
      const before=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth, imageLoaded:document.querySelector('#overview').naturalWidth>0, imageWidth:document.querySelector('#overview').getBoundingClientRect().width,paneWidth:document.querySelector('#pane').clientWidth}));
      await page.locator('#actual').click();
      const actual=await page.evaluate(()=>document.querySelector('#overview').getBoundingClientRect().width);
      await page.locator('#fit').click();
      const fitted=await page.evaluate(()=>document.querySelector('#overview').getBoundingClientRect().width);
      viewerChecks.push({viewport:width,...before,actual,fitted,pass:!before.overflow&&before.imageLoaded&&actual>2000&&fitted<=before.paneWidth+1});
      await page.screenshot({path:path.join(previews,`viewer-${width}.png`)});
    }
    const result={...geometry,viewerChecks,pageErrors,realRecognitionTest:false,validation:'SVG geometry, Chinese rendering, image exports and viewer interactions only'};
    fs.writeFileSync(path.join(project,'notes','visual-qa.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
    if(geometry.failures.length || viewerChecks.some(x=>!x.pass) || pageErrors.length) process.exitCode=1;
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
