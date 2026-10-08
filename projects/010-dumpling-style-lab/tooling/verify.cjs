const fs=require('fs');const path=require('path');const assert=require('assert');
const {chromium}=require('./browser.cjs');
const project=path.resolve(__dirname,'..');const assets=path.join(project,'web/assets');const notes=path.join(project,'notes');
(async()=>{const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--mute-audio']});try{
 const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});await context.route('**/api/hb',r=>r.abort());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8962/',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>window.styleLab?.styles.length===20);
 const report={date:'2026-10-02',environment:'Windows / bundled Chromium / software WebGL',checks:[],screenshots:[],styles:[]};
 function checked(name,value){assert(value,name);report.checks.push({name,passed:true})}
 checked('原作 iframe 指向真实原站',await page.locator('#original-frame').getAttribute('src')==='https://dumpling-dell.pages.dev/');
 const original=page.frames().find(f=>f.parentFrame()===page.mainFrame());if(original){await original.waitForURL('https://dumpling-dell.pages.dev/**',{timeout:25000});await original.waitForFunction(()=>typeof BUNS!=='undefined',{timeout:25000});report.originalRuntime=await original.evaluate(()=>({title:document.title,buns:BUNS.length,areas:Object.keys(AREAS).length}));checked('嵌入的原作程序实际加载',report.originalRuntime.buns===168);await original.evaluate(()=>{window.requestAnimationFrame=()=>0});report.qaNote='原作程序加载核实后，仅在隔离的 QA 会话中暂停其动画，单独检验新增场景；产品页面不暂停原作。'}else throw new Error('原作 frame 未加载');
 await page.locator('#lab').scrollIntoViewIfNeeded();
 for(const id of await page.evaluate(()=>styleLab.styles)){
  await page.locator('#style-tab-'+id).click();await page.waitForTimeout(450);
  checked(id+' 正确选中',await page.locator('#style-tab-'+id).getAttribute('aria-selected')==='true');
  checked(id+' 渲染可用',await page.evaluate(()=>styleLab.rendererType!=='failed'));
  const before=await page.evaluate(()=>styleLab.state.collected);await page.locator('#open-bun').click();await page.waitForTimeout(1300);
  checked(id+' 开盖真实增加收藏',await page.evaluate(()=>styleLab.state.opened&&styleLab.state.collected)===before+1);
  const button=await page.locator('#squish-bun').boundingBox();await page.mouse.move(button.x+button.width/2,button.y+button.height/2);await page.mouse.down();await page.waitForFunction(()=>styleLab.state.held&&styleLab.state.squash>.4,null,{timeout:8000});checked(id+' 挤压改变形变',await page.evaluate(()=>styleLab.state.squash>.4));await page.mouse.up();await page.waitForFunction(()=>!styleLab.state.held&&Math.abs(styleLab.state.squash)<.15,null,{timeout:5000});checked(id+' 释放后回弹',await page.evaluate(()=>Math.abs(styleLab.state.squash)<.15));
  await page.locator('#toggle-night').click();checked(id+' 昼夜状态改变',await page.evaluate(()=>styleLab.state.night));await page.locator('#toggle-night').click();await page.waitForTimeout(150);
  const renderType=await page.evaluate(()=>styleLab.rendererType);const file='style-'+id+'.png';await page.locator('#stage').screenshot({path:path.join(assets,file)});report.screenshots.push('web/assets/style-'+id+'.webp');report.styles.push({id,renderer:renderType,opened:true,squish:true,night:true});
  if(renderType==='WebGL'){const rotationBefore=await page.evaluate(()=>styleLab.rotation);const box=await page.locator('#stage').boundingBox();await page.mouse.move(box.x+box.width*.75,box.y+box.height*.55);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.60,{steps:8});await page.mouse.up();checked(id+' 拖动实际改变视角',await page.evaluate(previous=>Math.abs(styleLab.rotation-previous)>.05,rotationBefore));checked(id+' 场景拖动没有运行错误',errors.length===0)}
  console.log('PASS',id,renderType);
 }
 await page.locator('#style-tab-pixel').click();await page.locator('[data-action=plant]').click();await page.locator('[data-action=plant]').click();checked('种植示例推进到花苞',await page.evaluate(()=>styleLab.state.plantStage===2));await page.locator('[data-action=care]').click();checked('喂食增加好感',await page.evaluate(()=>styleLab.state.care===1));await page.locator('[data-action=furniture]').click();checked('装修改变房间',await page.evaluate(()=>styleLab.state.furniture));await page.locator('[data-action=paint]').click();checked('绘画改变花纹',await page.evaluate(()=>styleLab.state.painted));const c=await page.evaluate(()=>styleLab.state.collected);await page.locator('[data-action=fish]').click();checked('钓鱼获得收藏',await page.evaluate(previous=>styleLab.state.collected===previous+1,c));
 await page.locator('#reset-scene').click();checked('重置清空本实验状态',await page.evaluate(()=>!styleLab.state.opened&&styleLab.state.collected===0&&styleLab.state.care===0));
 await page.locator('#style-tab-clay').click();await page.locator('#open-bun').click();await page.waitForTimeout(1300);await page.locator('#lab').screenshot({path:path.join(project,'assets/style-lab-overview.png')});report.screenshots.push('assets/style-lab-overview.webp');
 await page.setViewportSize({width:390,height:844});await page.locator('#lab').scrollIntoViewIfNeeded();await page.waitForTimeout(400);checked('390px 手机布局无横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(project,'assets/mobile-lab.png')});report.screenshots.push('assets/mobile-lab.webp');
 await page.locator('#style-tab-flat').click();await page.locator('#style-tab-flat').focus();await page.keyboard.press('ArrowRight');checked('风格支持键盘切换',await page.evaluate(()=>styleLab.state.style==='storybook'));
 await page.locator('#original').scrollIntoViewIfNeeded();await page.locator('[data-shot=world]').click();checked('实测截图可打开',await page.locator('#shot-dialog').evaluate(e=>e.open));await page.locator('#shot-close').click();checked('截图可关闭',await page.locator('#shot-dialog').evaluate(e=>!e.open));
 await page.setViewportSize({width:1440,height:960});await page.goto('http://127.0.0.1:8962/?style=clay#lab',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.styleLab?.state.style==='clay');checked('URL 可直达指定风格',await page.evaluate(()=>styleLab.state.style==='clay'));checked('收藏计数可以恢复',await page.evaluate(()=>styleLab.state.collected===1));
 checked('无 JavaScript 运行错误',errors.length===0);report.errors=errors;fs.writeFileSync(path.join(notes,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log('COMPLETE',report.checks.length,'checks');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});





