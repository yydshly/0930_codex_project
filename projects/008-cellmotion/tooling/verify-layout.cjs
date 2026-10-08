const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=[];
  const check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);};
  try{
    await page.goto('http://127.0.0.1:8958/',{waitUntil:'domcontentloaded'});
    await page.locator('.verified-output').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>{const i=document.querySelector('.verified-output img');return i.complete&&i.naturalWidth>0;});
    check('Actual PNG output appears in capability section',await page.locator('.verified-output img').evaluate(i=>i.naturalWidth===1080&&i.naturalHeight===1080));
    check('Actual PNG can be downloaded',await page.locator('.verified-output a[download]').getAttribute('href')==='assets/edited-export.png');
    await page.locator('#principles').scrollIntoViewIfNeeded();
    await page.locator('#lab-scrubber').fill('500');
    check('Middle frame shows matched characters and hides departed character',await page.locator('#glyph-layer g').first().getAttribute('opacity')==='0');
    await page.locator('#principles').screenshot({path:path.join(root,'assets/principles.png')});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>scrollTo(0,0));
    check('Mobile headline stays on one line',(await page.locator('h1').boundingBox()).height<60);
    check('Updated mobile page has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.waitForFunction(()=>document.querySelector('#main-video').readyState>=2);
    await page.locator('#main-video').evaluate(v=>{v.pause();});
    await page.screenshot({path:path.join(root,'assets/mobile.png')});
    await page.locator('.verified-output').scrollIntoViewIfNeeded();
    check('Mobile PNG panel fits viewport',await page.locator('.verified-output').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));
    await page.screenshot({path:path.join(root,'assets/mobile-capabilities.png')});
  }finally{
    fs.writeFileSync(path.join(root,'notes/layout-verification.json'),JSON.stringify({date:'2026-10-02',checks},null,2)+'\n');
    console.log(JSON.stringify({checks},null,2));await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1);});
