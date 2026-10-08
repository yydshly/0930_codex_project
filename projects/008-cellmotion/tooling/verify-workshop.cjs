const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'build/workshop-qa');
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1050},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage(),checks=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);};
  const frame=()=>page.locator('#motion-canvas').evaluate(c=>c.toDataURL());
  const seek=time=>page.evaluate(t=>window.MotionWorkshop.seek(t),time);
  try{
    const response=await page.goto('http://127.0.0.1:8958/workshop.html',{waitUntil:'networkidle'});
    check('Workshop loads successfully',response.ok()&&await page.locator('#recipe-name').textContent()==='文字匹配');
    check('Initial preview contains readable foreground pixels',await page.locator('#motion-canvas').evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<p.length;i+=4)if(p[i]>100&&p[i+1]>100)count++;return count>1000;}));
    await page.locator('#text-from').fill('你好创意');await page.locator('#text-to').fill('创意你好');
    check('User text drives saved configuration and generated request',await page.evaluate(()=>{const c=MotionWorkshop.getConfig(),r=document.querySelector('#request-text').value;return c.from==='你好创意'&&c.to==='创意你好'&&r.includes('第一句：「你好创意」')&&r.includes('第二句：「创意你好」');}));
    await page.locator('#show-guides').uncheck();
    const middles=[],ends=[];
    for(const effect of ['match','type','pulse','particles']){
      await page.locator(`[data-recipe="${effect}"]`).click();await seek(2.15);const middle=await frame();middles.push(middle);
      await seek(1.5);await seek(2.15);check(`${effect}: seeking to the same time reproduces the same frame`,middle===await frame());
      await seek(4);ends.push(await frame());
      check(`${effect}: reaches the stable complete ending`,await page.locator('#phase-name').textContent()==='完整停留');
    }
    check('Four algorithms produce four different middle frames',new Set(middles).size===4);
    check('All algorithms end with the same complete text layout',new Set(ends).size===1);
    await seek(2.2);check('Visible formula ties current time to phase progress',await page.locator('#frame-math').textContent()==='时间 2.20 秒 → 阶段进度 (2.20 − 1.32) ÷ 1.88 = 47% → 计算元素状态并重画。');
    await page.locator('#motion-time').fill('150');check('Scrubber displays the correct time and phase',await page.locator('#play-time').textContent()==='0.60 / 4.00 s'&&await page.locator('#phase-name').textContent()==='进入');
    await page.locator('[data-phase="finish"]').click();check('Clicking a phase seeks to the complete ending',await page.locator('[data-phase="finish"]').getAttribute('aria-current')==='step');
    await page.locator('#restart-motion').click();await page.waitForTimeout(250);await page.locator('#play-motion').click();const paused=await page.locator('#play-time').textContent();await page.waitForTimeout(100);
    check('Playback advances and pauses without further changes',Number(paused.split(' / ')[0])>0&&paused===await page.locator('#play-time').textContent());
    await page.locator('#duration').fill('2');await page.locator('#first-hold').fill('2');await page.locator('#last-hold').fill('2');
    check('Insufficient time shortens holds and keeps the motion ordered',await page.evaluate(()=>{const c=MotionWorkshop.getConfig(),p=MotionWorkshopEngine.phases(c);return c.hold+c.endHold<=1.24001&&p.every(v=>v.seconds>0)&&Math.abs(p.reduce((s,v)=>s+v.seconds,0)-c.duration)<.0001;}));
    await page.locator('#duration').fill('4');
    for(const [ratio,width,height] of [['16:9',960,540],['9:16',540,960],['1:1',720,720]]){
      await page.locator('#ratio').selectOption(ratio);check(`Aspect ${ratio} changes actual canvas resolution`,await page.locator('#motion-canvas').evaluate((c,d)=>c.width===d.width&&c.height===d.height,{width,height}));
    }
    await page.locator('#text-to').fill('作品图像');await page.locator('.image-control summary').click();
    await page.locator('#image-file').setInputFiles(path.join(root,'web/assets/edited-export.png'));
    await page.waitForFunction(()=>MotionWorkshop.getConfig().image!==null);await seek(4);
    const withImage=await frame();
    check('Local image is embedded in the recipe and request',await page.evaluate(()=>{const c=MotionWorkshop.getConfig();return c.image.dataURL.startsWith('data:image/png;base64,')&&document.querySelector('#request-text').value.includes('edited-export.png');}));
    await page.locator('#image-slot').fill('40');check('Image replacement stays within the existing target text',await page.evaluate(()=>MotionWorkshop.getConfig().image.slot===4));
    await page.locator('#image-slot').fill('2');await seek(4);
    const pngEvent=page.waitForEvent('download');await page.locator('#download-frame').click();const png=await pngEvent,pngPath=path.join(output,'frame.png');await png.saveAs(pngPath);const bytes=fs.readFileSync(pngPath);
    check('PNG export contains a valid image at the selected square size',bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.readUInt32BE(16)===720&&bytes.readUInt32BE(20)===720);
    const jsonEvent=page.waitForEvent('download');await page.locator('#download-recipe').click();const json=await jsonEvent,jsonPath=path.join(output,'recipe.json');await json.saveAs(jsonPath);const saved=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
    check('Recipe export retains user text, timing, dimensions and the image',saved.schema==='motion-workshop-v1'&&saved.config.to==='作品图像'&&saved.config.ratio==='1:1'&&saved.config.image.slot===2&&saved.config.image.dataURL.length>100);
    await page.locator('#remove-image').click();await seek(4);check('Image replacement visibly changes the target frame',withImage!==await frame());
    await page.locator('#text-to').fill('临时修改');await page.locator('#recipe-file').setInputFiles(jsonPath);
    await page.waitForFunction(()=>MotionWorkshop.getConfig().to==='作品图像'&&MotionWorkshop.getConfig().image!==null);await seek(4);
    check('Import restores the saved content and image frame',withImage===await frame());
    await page.locator('#show-guides').check();await seek(4);
    const cleanExport=page.waitForEvent('download');await page.locator('#download-frame').click();const png2=await cleanExport,cleanPath=path.join(output,'without-guides.png');await png2.saveAs(cleanPath);
    check('PNG export omits guides even when preview guides are enabled',fs.readFileSync(cleanPath).equals(bytes));
    await page.locator('#purpose').fill('新品发布会开场');await page.locator('#delivery').selectOption('video');
    const request=await page.locator('#request-text').inputValue();check('Generated brief includes user purpose and an explicit MP4 implementation boundary',request.includes('新品发布会开场')&&request.includes('30 fps')&&request.includes('需要另外实现')&&request.includes('验收'));
    await page.locator('#copy-request').click();await page.waitForFunction(()=>document.querySelector('#copy-request').textContent.includes('已复制'));
    const clipboard=await page.evaluate(()=>navigator.clipboard.readText());
    check('Copy action places the exact editable brief on the clipboard',clipboard.replace(/\r\n/g,'\n')===request.replace(/\r\n/g,'\n'));
    await page.locator('#recipe-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"config":{}}')});
    await page.waitForFunction(()=>document.querySelector('#workshop-status').textContent.includes('载入失败'));
    check('Invalid recipe reports an error while preserving the existing work',await page.evaluate(()=>MotionWorkshop.getConfig().to==='作品图像'&&MotionWorkshop.getConfig().image!==null));
    await page.locator('#remove-image').click();await page.locator('#text-from').fill('');await page.locator('#text-to').fill('');
    for(const effect of ['match','type','pulse','particles']){await page.locator(`[data-recipe="${effect}"]`).click();await seek(2);await seek(4);}
    check('Empty inputs do not crash any renderer',errors.length===0);
    await page.locator('#text-from').fill('哈哈哈哈你好👨‍👩‍👧‍👦');await page.locator('#text-to').fill('你好哈哈哈哈👨‍👩‍👧‍👦');await page.locator('[data-recipe="match"]').click();await seek(4);
    check('Repeated characters and a multi-codepoint emoji keep the complete target',await page.evaluate(()=>MotionWorkshopEngine.split(MotionWorkshop.getConfig().to).length===7));
    await page.locator('[data-example="sequence"]').click();await seek(2.6);
    check('Combination example applies entrance and transition together',await page.evaluate(()=>{const c=MotionWorkshop.getConfig();return c.effect==='type'&&c.entrance==='bounce'&&c.easing==='elastic';}));
    await page.evaluate(()=>MotionWorkshop.setConfig(MotionWorkshopEngine.defaults));await seek(2.2);await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(root,'assets/workshop.png')});
    await page.locator('#ask').screenshot({path:path.join(root,'assets/workshop-request.png')});
    await page.locator('#extend').screenshot({path:path.join(root,'assets/workshop-extensions.png')});
    for(const width of [768,390]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));check(`${width}px viewport has no horizontal page overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390)await page.screenshot({path:path.join(root,'assets/mobile-workshop.png')});}
    check('No browser script errors across the interaction suite',errors.length===0);
  }finally{
    fs.writeFileSync(path.join(root,'notes/workshop-verification.json'),JSON.stringify({date:'2026-10-02',checks,errors},null,2)+'\n');console.log(JSON.stringify({checks,errors},null,2));await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
