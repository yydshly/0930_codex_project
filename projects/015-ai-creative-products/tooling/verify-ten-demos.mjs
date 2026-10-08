import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url)),base='http://127.0.0.1:8975/',checks=[],errors=[],requests=[];
await mkdir(root+'assets/qa/ten-demos',{recursive:true});await mkdir(root+'notes/ten-demo-downloads',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true,reducedMotion:'reduce'});
page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};
const state=()=>page.evaluate(()=>ProductLab.getState());
const number=id=>String(id).padStart(2,'0');
async function download(selector,name){const [item]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);const path=root+'notes/ten-demo-downloads/'+name;await item.saveAs(path);return readFile(path);}
async function input(selector,value){await page.locator(selector).evaluate((element,value)=>{element.value=String(value);element.dispatchEvent(new Event('input',{bubbles:true}));},value);}
try{
 for(let id=1;id<=10;id++){
  await page.goto(base+'labs/?id='+id,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.ProductLab?.getState());
  check(`${number(id)}独立模块与对应产品加载`,await page.evaluate(id=>ProductLab.id===id&&Boolean(ProductLab.getMeta().product),id));
  const scene=page.locator(id===1?'.portfolio-preview':'#lab-root canvas').first();
  const cover=await scene.screenshot();await sharp(cover).resize(520,325,{fit:'cover'}).webp({quality:86}).toFile(root+`web/media/demo-${number(id)}.webp`);
  const sceneStats=await sharp(cover).stats();check(`${number(id)}实际效果有渲染内容`,sceneStats.channels.slice(0,3).some(channel=>channel.stdev>15));
  await page.screenshot({path:root+`assets/qa/ten-demos/demo-${number(id)}-desktop.png`,fullPage:true});
  if(id===1){
   await page.locator('[data-field="studio"]').fill('我们的十案例工作室');await page.locator('[data-field="theme"]').selectOption('gallery');await page.locator('[data-field="filter"]').selectOption('动效');
   check('01编辑主题与筛选进入真实页面',(await state()).theme==='gallery'&&await page.locator('.portfolio-card').count()===1&&(await page.locator('.portfolio-hero h2').innerText()).includes('十案例'));
   const html=(await download('[data-export="html"]','01-研究作品集.html')).toString();check('01导出离线HTML包含所选内容与图片',html.includes('我们的十案例工作室')&&html.includes('data:image/')&&html.includes('CellMotion'));
  }else if(id===2){
   await page.locator('[data-quest-start]').click();
   for(const site of ['archive','sensor','tower']){await page.locator(`[data-quest-travel="${site}"]`).click();await page.locator(`[data-quest-choice="good"][data-site="${site}"]`).waitFor({timeout:15000});if(site==='archive'){await page.locator('[data-quest-choice="bad"]').click();check('02错误分支保留失败反馈',(await state()).evidence.length===0&&(await page.locator('[data-quest-feedback]').innerText()).length>0);}await page.locator('[data-quest-choice="good"]').click();}
   await page.locator('[data-quest-travel="hub"]').click();await page.locator('[data-quest-submit]').waitFor({timeout:15000});await page.locator('[data-quest-submit]').click();check('02通过真实地图与对话完成委托',(await state()).status==='won'&&(await state()).evidence.length===3);
  }else if(id===3){
   await page.locator('[data-title="0"]').fill('研究要留下证据');await page.locator('[data-text="0"]').fill('把一个想法变成可以检查的结果。');await page.locator('[data-chapter="1"]').click();
   const before=(await state()).time;await page.locator('[data-play]').click();await page.waitForFunction(before=>ProductLab.getState().time>before+.1,before);await page.locator('[data-play]').click();
   check('03真实时间线播放与暂停',(await state()).playing===false&&(await state()).currentScene===2);
   const script=JSON.parse((await download('[data-export="script"]','03-三幕脚本.json')).toString());check('03脚本导出包含改写的观点',script.scenes[0].title==='研究要留下证据');
  }else if(id===4){
   await page.locator('[data-product]').fill('十案例研究工作台');await page.locator('[data-theme]').selectOption('midnight');await page.locator('[data-scene="2"]').click();
   check('04信息与分镜同步',(await state()).product==='十案例研究工作台'&&(await state()).theme==='midnight'&&(await state()).currentScene===3);
   const storyboard=(await download('[data-export="storyboard"]','04-发布片分镜.md')).toString();check('04分镜是真实编辑结果',storyboard.includes('十案例研究工作台')&&storyboard.includes('行动'));
  }else if(id===5){
   await page.locator('[data-defense-start]').click();await page.waitForFunction(()=>ProductLab.getState().enemies.length>0);
   await page.locator('[data-defense-deploy]').click();await page.locator('[data-defense-intercept]').click();
   check('05防线与资源参与实时演练',(await state()).wave===1&&(await state()).guards[0]===1&&(await state()).kills>=1&&(await state()).energy<80);
   await page.locator('[data-defense-reset]').click();check('05重置恢复初始资源',(await state()).status==='ready'&&(await state()).energy===80);
  }else if(id===6){
   await page.locator('[data-action="play"]').click();await page.waitForFunction(()=>ProductLab.getState().playedNotes>=2);check('06同一时间表驱动声音与三维',(await state()).progress>0&&(await state()).audioState==='running'&&(await state()).renderer==='webgl');await page.locator('[data-action="play"]').click();await page.locator('[data-field="mood"]').selectOption('night');
   const wav=await download('[data-action="wav"]','06-原创旋律.wav');check('06输出真实WAV音频',wav.subarray(0,4).toString()==='RIFF'&&wav.subarray(8,12).toString()==='WAVE'&&wav.length>100000);
  }else if(id===7){
   const before=await scene.evaluate(canvas=>canvas.toDataURL());await page.locator('[data-time="night"]').click();check('07日夜切换改变实际三维画面',await scene.evaluate(canvas=>canvas.toDataURL())!==before&&(await state()).renderer==='webgl');
   for(const booth of ['visual-systems','product-lab','research-notes'])await page.locator(`[data-booth="${booth}"]`).click();check('07三展位参观有真实访问记录',(await state()).visits.length===3);
  }else if(id===8){
   await page.locator('[data-mascot-start]').click();for(let n=0;n<12;n++){await page.locator('[data-mascot-poke]').click();await page.waitForTimeout(160);}check('08原创软萌角色完成实际连击挑战',(await state()).status==='won'&&(await state()).hits===12&&(await state()).score>0);
  }else if(id===9){
   const before=await state();await page.locator('[data-field="weather"]').selectOption('rain');const after=await state();check('09天气同时改变发电与蓄水规则',after.solar<before.solar&&after.water>before.water&&after.renderer==='webgl');for(const site of ['solar','water','forest'])await page.locator(`[data-site="${site}"]`).click();check('09三维观察点形成完整记录',(await state()).visited.length===3);
  }else if(id===10){
   await page.locator('[data-soccer-start]').click();await page.keyboard.down('ArrowRight');try{await page.waitForFunction(()=>ProductLab.getState().score>=1,{},{timeout:20000});}finally{await page.keyboard.up('ArrowRight');}check('10实际运动碰撞把球推进球门',(await state()).score>=1&&(await state()).collisions>0);
   await input('[data-soccer-friction]',93);check('10摩擦参数进入真实物理状态',(await state()).friction===93);
  }
  const record=JSON.parse((await download('#export-state',`case-${number(id)}-体验记录.json`)).toString());check(`${number(id)}导出包含对应编号产品和当前状态`,record.caseId===id&&record.product&&record.state);
  for(const width of [390,768]){await page.setViewportSize({width,height:1050});check(`${number(id)}在${width}px没有页面横向溢出`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===390)await page.screenshot({path:root+`assets/qa/ten-demos/demo-${number(id)}-mobile.png`,fullPage:true});}
  await page.setViewportSize({width:1440,height:1050});
 }
 await page.goto(base+'?v=5#demo-06',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#lab-frame')?.contentWindow.ProductLab?.id===6);
 check('主站提供十个编号而非台灯替代',await page.locator('.demo-option').count()===10&&await page.locator('#view-demo').isVisible()&&await page.locator('#demo-stage-header h3').innerText()==='研究专注音乐动画');
 const frame=page.frameLocator('#lab-frame');await frame.locator('[data-action="play"]').click();await page.waitForFunction(()=>document.querySelector('#lab-frame').contentWindow.ProductLab.getState().playing);
 await page.locator('a[data-view="effects"]').click();await page.waitForFunction(()=>!document.querySelector('#lab-frame').contentWindow.ProductLab.getState().playing);check('离开原型时停止音乐和动画',!await frame.locator('[data-action="play"]').evaluate(button=>button.textContent.includes('暂停')));
 await page.locator('#effect-gallery [data-demo-id="8"]').click();await page.waitForFunction(()=>document.querySelector('#lab-frame').contentWindow.ProductLab?.id===8);check('每个原作可直达对应产品演示',page.url().endsWith('#demo-08'));
 await page.locator('#demo-stage [data-case-link="8"]').click();await page.locator('#case-detail [data-demo-id="8"]').click();check('案例拆解与演示一对一往返',page.url().endsWith('#demo-08'));
 await page.locator('a[data-view="products"]').click();check('产品页明确列出十个对应产品',await page.locator('#prototype-product-rows tr').count()===10);
 await page.locator('#prototype-product-rows [data-demo-id="7"]').click();await page.waitForFunction(()=>document.querySelector('#lab-frame').contentWindow.ProductLab?.id===7);
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1050});await page.waitForFunction(()=>{const f=document.querySelector('#lab-frame');return Math.abs(f.getBoundingClientRect().height-f.contentDocument.body.scrollHeight)<3;});check(`主站内嵌在${width}px无横向溢出`,await page.evaluate(()=>{const f=document.querySelector('#lab-frame');return document.documentElement.scrollWidth<=innerWidth+1&&f.contentDocument.documentElement.scrollWidth<=f.clientWidth+1;}));if(width===390){await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:root+'assets/qa/ten-demos/gallery-mobile.png',fullPage:true});}}
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:root+'assets/qa/ten-demos/gallery-desktop.png',fullPage:true});
 check('本轮产品演示仅请求本地资源',requests.every(url=>url.startsWith(base)||url.startsWith('blob:')));
 check('无JavaScript运行错误',errors.length===0);
 await writeFile(root+'notes/ten-demos-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,errors,scope:'Ten independent local product prototypes, actual rendering, task interaction, downloads and responsive checks. Not full replicas, user or commercial validation.'},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,errors}));
}finally{await browser.close();}
