/* Browser acceptance for synchronized explanation and the restricted physical model.
 * BLACK_HOLE_PLAYWRIGHT may point to the bundled Playwright installation.
 * Screenshots/downloads are diagnostic files under .tmp, not project assets.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const playwright=require(process.env.BLACK_HOLE_PLAYWRIGHT||'playwright');
const project=path.resolve(__dirname,'..'),at=process.argv.indexOf('--url');
const url=at<0?'http://127.0.0.1:62116/projects/012-black-hole-lab/web/':process.argv[at+1];
const output=path.resolve(project,'../../.tmp/black-hole-science-review');fs.mkdirSync(output,{recursive:true});
const checks=[],errors=[],responses=[];
const report={date:'2026-10-02',timezone:'Asia/Shanghai',url,environment:{browser:'Chromium',renderer:'SwiftShader software',mobile:'390px viewport simulation; not physical device',voice:'Audible Chinese speech cannot be verified in headless Chromium; fallback and synchronized subtitles are checked.'},checks};
function check(name,condition,details){checks.push({name,passed:Boolean(condition),details});console.log((condition?'PASS ':'FAIL ')+name+(condition?'':': '+JSON.stringify(details)));}
const state=page=>page.evaluate(()=>blackHoleLab.getState());
async function input(page,id,value){await page.locator('#'+id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function stage(page,id){await page.locator('[data-stage="'+id+'"]').click();await page.waitForFunction(i=>blackHoleLab.getState().journey.stage===i,id);await page.evaluate(()=>blackHoleLab.render());}
function difference(a,b){return a.reduce((sum,x,i)=>sum+Math.abs(x-b[i]),0)/a.length;}
async function pixels(page){return page.evaluate(()=>{
 const p=blackHoleLab.readPixels(),s=blackHoleLab.getState(),w=s.width,h=s.height;
 let count=0,total=0,lit=0,upper=0,lower=0,left=0,right=0,blue=0,blueYs=[];
 for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){const i=(y*w+x)*4,r=p[i],g=p[i+1],b=p[i+2],l=(r+g+b)/3;count++;total+=l;
  if(l>80&&r>40){lit++;if(y>h*.65)upper++;if(y<h*.38)lower++;if(x<w/2)left+=l;else right+=l;}
  if(b>100&&b>r*1.15){blue++;blueYs.push(y/h);}
 }
 const thumb=[];for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(Math.floor((y+.5)*h/32)*w+Math.floor((x+.5)*w/32))*4;thumb.push(p[i],p[i+1],p[i+2]);}
 const center=(Math.floor(h*.5)*w+Math.floor(w*.5))*4,ym=blueYs.reduce((a,b)=>a+b,0)/(blueYs.length||1),spread=Math.sqrt(blueYs.reduce((a,b)=>a+(b-ym)**2,0)/(blueYs.length||1));
 return{w,h,mean:total/count,lit,upper,lower,left,right,blue,spread,thumbnail:thumb,center:[p[center],p[center+1],p[center+2]]};
});}
async function screenshot(page,name){await page.locator('#viewer').scrollIntoViewIfNeeded();await page.evaluate(()=>blackHoleLab.render());await page.screenshot({path:path.join(output,name),fullPage:false});}
async function hold(page,callback){const button=page.locator('#build-compare');await button.focus();await page.keyboard.down('Enter');try{return await callback();}finally{await page.keyboard.up('Enter');}}
async function main(){
 const browser=await playwright.chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1,reducedMotion:'reduce',acceptDownloads:true});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.url().startsWith(url.split('?')[0]))responses.push({url:r.url(),status:r.status()});});
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.blackHoleLab?.getState().renderCount>0,{},{timeout:60000});
  const initial=await state(page),start=await pixels(page);
  check('Shaders compile and first observer image renders',!initial.failure&&initial.renderCount>0&&start.lit>100&&start.mean>5,{failure:initial.failure,mean:start.mean,lit:start.lit});
  check('Opening shows the actual result and remains paused',initial.journey.stage===0&&initial.paused&&await page.locator('#black-hole').isVisible()&&!(await page.locator('#physics-canvas').isVisible()),{stage:initial.journey.stage,paused:initial.paused});
  check('Opening explains the shadow, external emission and bent image',(await page.locator('#build-why').innerText()).includes('事件视界')&&(await page.locator('#subtitle-text').innerText()).length>20,true);
  check('Advanced parameters are hidden during explanation',!(await page.locator('#free-controls').isVisible()),true);
  const firstSubtitle=await page.locator('#subtitle-text').innerText();await page.locator('#cue-next').click();const secondSubtitle=await page.locator('#subtitle-text').innerText();await page.locator('#cue-next').click();
  check('Three distinct subtitle cues match the opening explanation',firstSubtitle!==secondSubtitle&&(await state(page)).journey.cue===2&&(await page.locator('#subtitle-text').innerText()).includes('盘'),{first:firstSubtitle,second:secondSubtitle,third:await page.locator('#subtitle-text').innerText()});
  await page.locator('#cue-prev').click();check('Subtitle previous button seeks backward',(await state(page)).journey.cue===1,true);
  await screenshot(page,'opening.png');
  await page.locator('#voice-enabled').uncheck();await page.locator('#build-auto').click();
  check('Play explanation restarts at cue zero with active timeline',!(await state(page)).paused&&(await state(page)).journey.autoExplaining&&(await state(page)).journey.stage===0&&(await state(page)).journey.cue===0,true);
  await page.locator('#pause').click();const frozen=await state(page);await page.waitForTimeout(250);const still=await state(page);
  check('Pause freezes narration time and picture time',still.paused&&still.journey.cueTime===frozen.journey.cueTime&&still.flowClock===frozen.flowClock,{cueTime:still.journey.cueTime,flowClock:still.flowClock});
  await page.locator('#cue-next').click();check('Manual cue seek works while paused',(await state(page)).paused&&(await state(page)).journey.cue===1,true);
  await page.locator('#cue-next').click();await page.locator('#pause').click();await page.waitForFunction(()=>blackHoleLab.getState().journey.stage===1,{},{timeout:45000});
  check('Narration advances to the next scientific chapter',(await state(page)).journey.autoExplaining&&(await state(page)).journey.stage===1,true);
  await stage(page,2);check('Manual chapter choice seeks the active full lecture to the selected chapter',(await state(page)).journey.autoExplaining&&!(await state(page)).paused&&(await state(page)).journey.stage===2&&(await state(page)).journey.cue===0,true);
  await stage(page,1);check('Equilibrium chapter uses a labelled mechanism diagram',await page.locator('#physics-canvas').isVisible()&&(await page.locator('#build-why').innerText()).includes('压力梯度'),true);
  await stage(page,2);await input(page,'build-input',1);const pressure=await pixels(page);await input(page,'build-input',0);const noPressure=await pixels(page);
  check('Support control changes the actual equilibrium diagram',difference(pressure.thumbnail,noPressure.thumbnail)>.1,{pixelDifference:difference(pressure.thumbnail,noPressure.thumbnail)});
  await stage(page,3);await input(page,'build-input',0);const extended=await pixels(page);await input(page,'build-input',1);const contracted=await pixels(page);
  check('Free-fall seek changes the displayed boundary and signal',difference(extended.thumbnail,contracted.thumbnail)>.5&&(await state(page)).journey.progress===1,{pixelDifference:difference(extended.thumbnail,contracted.thumbnail)});
  await page.locator('.build-implementation summary').click();check('Free-fall scope distinguishes a fixed exterior from full stellar collapse',(await page.locator('#build-why').innerText()).includes('固定 Schwarzschild')&&(await page.locator('#build-code').innerText()).includes('未解动态内部'),true);
  await screenshot(page,'free-fall.png');await page.locator('#physics-play').click();await page.waitForFunction(()=>blackHoleLab.getState().journey.progress>.005);await page.locator('#pause').click();const stopped=(await state(page)).journey.progress;await page.waitForTimeout(180);
  check('Chapter replay advances and global pause freezes physical progress',(await state(page)).journey.progress===stopped&&stopped<1,{progress:stopped});
  await stage(page,4);const causal=await pixels(page);check('Causal light diagram is calculated in horizon-crossing coordinates',await page.locator('#physics-canvas').isVisible()&&causal.blue>20&&(await page.locator('#build-code').innerText()).includes('Eddington'),{bluePixels:causal.blue});await screenshot(page,'causal-light.png');
  await stage(page,5);await input(page,'build-input',0);const diffuse=await pixels(page);await input(page,'build-input',1);const settled=await pixels(page);
  check('Gas settlement slider changes the particle distribution',difference(diffuse.thumbnail,settled.thumbnail)>.5,{pixelDifference:difference(diffuse.thumbnail,settled.thumbnail),initialBlueSpread:diffuse.spread,settledBlueSpread:settled.spread});
  const radial=await hold(page,()=>pixels(page));check('Zero-angular-momentum comparison changes the gas trajectories',difference(radial.thumbnail,settled.thumbnail)>.1,{pixelDifference:difference(radial.thumbnail,settled.thumbnail)});await screenshot(page,'gas-settlement.png');
  await stage(page,6);await input(page,'build-input',-11);const cool=await pixels(page);await input(page,'build-input',-7);const hot=await pixels(page);
  const temperatures=await page.evaluate(()=>{const m=blackHoleLab.getState().mass;return{cool:BlackHoleModel.units(m,1e-11).peakTemperature,hot:BlackHoleModel.units(m,1e-7).peakTemperature};});
  check('Supply-rate slider changes the plotted temperature and physical temperature',difference(cool.thumbnail,hot.thumbnail)>.1&&Math.abs(temperatures.hot/temperatures.cool-10)<1e-8&&(await state(page)).rateLog===-7,{pixelDifference:difference(cool.thumbnail,hot.thumbnail),...temperatures});
  await screenshot(page,'temperature.png');
  await stage(page,7);const lensed=await pixels(page);check('Lensing chapter connects observer image to a calculated ray inset',await page.locator('#black-hole').isVisible()&&await page.locator('#ray-inset-wrap').isVisible()&&lensed.lit>100,{lit:lensed.lit});
  const inset=await page.locator('#ray-inset-wrap canvas').evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>150)n++;return{width:c.width,height:c.height,nonempty:n};});
  check('Ray inset has rendered lines rather than an empty canvas',inset.width>100&&inset.height>50&&inset.nonempty>100,inset);
  const straight=await hold(page,()=>pixels(page));check('Nonphysical straight-ray comparison visibly removes lensing',difference(straight.thumbnail,lensed.thumbnail)>1,{difference:difference(straight.thumbnail,lensed.thumbnail),curvedUpper:lensed.upper,straightUpper:straight.upper});
  check('Releasing the comparison restores the physical model',(await state(page)).journey.layers.lensing===1,true);await screenshot(page,'lensing.png');
  await input(page,'build-input',0);check('Discrete light-path toggle selects explicit straight comparison',(await state(page)).journey.layers.lensing===0,true);await input(page,'build-input',1);
  await stage(page,8);const shifted=await pixels(page),unshifted=await hold(page,()=>pixels(page));
  check('Frequency comparison changes rendered intensity while preserving lensing',difference(shifted.thumbnail,unshifted.thumbnail)>.1&&(await state(page)).journey.layers.lensing===1,{difference:difference(shifted.thumbnail,unshifted.thumbnail)});
  check('Frequency explanation uses combined g and spectrum rather than a D-cubed shortcut',(await page.locator('#build-code').innerText()).includes('Tobs=gT')&&(await page.locator('#build-code').innerText()).includes('g⁴'),true);
  await stage(page,9);check('Final chapter connects causes and distinguishes their simultaneity',(await page.locator('#build-why').innerText()).includes('同时')||(await page.locator('#build-why').innerText()).includes('不是宇宙中先后'),true);await page.locator('#build-next').click();
  check('Free exploration becomes an explicit mode with controls',await page.locator('#free-controls').isVisible()&&(await state(page)).journey.mode==='free',true);
  await input(page,'model-mass',10);await input(page,'model-rate',-9);await page.locator('#false-color').uncheck();const standard=await state(page),physicalBefore=await page.locator('#physical-info').innerText();
  await input(page,'model-mass',20);const massive=await state(page),physicalAfter=await page.locator('#physical-info').innerText();
  check('Mass input recalculates physical radius and time scales',massive.mass===20&&Math.abs(massive.units.rs/standard.units.rs-2)<1e-8&&Math.abs(massive.units.timeUnit/standard.units.timeUnit-2)<1e-8&&physicalBefore!==physicalAfter,{before:standard.units,after:massive.units});
  check('Fixed supply rate gives the correct mass-temperature scaling',Math.abs(massive.units.peakTemperature/standard.units.peakTemperature-1/Math.sqrt(2))<1e-8,{before:standard.units.peakTemperature,after:massive.units.peakTemperature});
  await input(page,'model-mass',10);await input(page,'model-rate',-9);const normalRate=await state(page),normalPixels=await pixels(page);await input(page,'model-rate',-8);const higherRate=await state(page),higherPixels=await pixels(page);
  check('Supply input recalculates physical temperature and rendered radiation',higherRate.rateLog===-8&&Math.abs(higherRate.units.peakTemperature/normalRate.units.peakTemperature-10**.25)<1e-8&&difference(normalPixels.thumbnail,higherPixels.thumbnail)>.1,{temperatureRatio:higherRate.units.peakTemperature/normalRate.units.peakTemperature,pixelDifference:difference(normalPixels.thumbnail,higherPixels.thumbnail)});
  await input(page,'model-rate',-9);const visible=await pixels(page);await page.locator('#false-color').check();const falseColor=await pixels(page);
  check('Visible spectrum and false-color map produce explicitly different images',difference(visible.thumbnail,falseColor.thumbnail)>1&&(await page.locator('#band-info').innerText()).includes('假色'),{pixelDifference:difference(visible.thumbnail,falseColor.thumbnail)});
  await page.locator('#false-color').uncheck();check('Returning to visible band changes the interpretation label',(await page.locator('#band-info').innerText()).includes('可见'),true);
  await page.locator('#quality').selectOption('low');const low=await state(page),lowPixels=await pixels(page);await page.locator('#quality').selectOption('high');const high=await state(page),highPixels=await pixels(page);
  check('Quality changes resolution while retaining a sufficient ray budget',low.width<high.width&&low.height<high.height&&low.raySteps>=720&&high.raySteps>=900,{low:[low.width,low.height,low.raySteps],high:[high.width,high.height,high.raySteps]});
  check('Both quality modes preserve illuminated disk and background',lowPixels.lit>100&&highPixels.lit>100&&lowPixels.mean>5&&highPixels.mean>5,{lowMean:lowPixels.mean,highMean:highPixels.mean,lowLit:lowPixels.lit,highLit:highPixels.lit});await page.locator('#quality').selectOption('low');
  await page.locator('#disk').uncheck();const bare=await pixels(page);check('Removing external gas removes its luminous emission',bare.lit<lowPixels.lit*.2&&(await state(page)).disk===false,{withDisk:lowPixels.lit,withoutDisk:bare.lit});await page.locator('#disk').check();
  const preDrag=await state(page),box=await page.locator('#black-hole').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.45);await page.mouse.down();await page.mouse.move(box.x+box.width*.58,box.y+box.height*.49,{steps:3});await page.mouse.up();
  const dragged=await state(page);check('Observer camera can be rotated directly',dragged.yaw!==preDrag.yaw&&dragged.inclination!==preDrag.inclination,{before:preDrag.inclination,after:dragged.inclination});
  await page.locator('#black-hole').focus();await page.keyboard.press('ArrowUp');check('Keyboard camera controls remain usable',(await state(page)).inclination>dragged.inclination,true);
  await page.locator('[data-preset="cinematic"]').click();if(!(await state(page)).paused)await page.locator('#pause').click();const exportedSize=await state(page);
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:90000}),page.locator('#capture').click()]);const pngPath=path.join(output,'observer-export.png');await download.saveAs(pngPath);const png=fs.readFileSync(pngPath);
  check('Observer export is a nonempty PNG at current rendering dimensions',png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&png.length>10000&&png.readUInt32BE(16)===exportedSize.width&&png.readUInt32BE(20)===exportedSize.height,{bytes:png.length,width:png.readUInt32BE(16),height:png.readUInt32BE(20)});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(100);const mobile=await pixels(page);
  check('Mobile observer image remains visible',mobile.lit>50&&mobile.w<800,{size:[mobile.w,mobile.h],lit:mobile.lit});
  check('Mobile page has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth})));
  await screenshot(page,'mobile-result.png');await stage(page,3);await input(page,'build-input',.95);const mobileDiagram=await pixels(page);
  check('Mobile calculation chapter and slider remain functional',mobileDiagram.mean>5&&(await state(page)).journey.progress===.95&&await page.locator('#physics-canvas').isVisible(),{mean:mobileDiagram.mean,progress:(await state(page)).journey.progress});await screenshot(page,'mobile-calculation.png');
  await page.locator('#build-restart').click();check('Restart returns to paused overview without leaving narration running',(await state(page)).journey.stage===0&&(await state(page)).paused&&!(await state(page)).journey.autoExplaining,true);
  check('All loaded local assets return successful HTTP responses including audio ranges',responses.length>=5&&responses.every(r=>r.status===200||(r.status===206&&/\.(mp3|wav)(?:[?]|$)/i.test(r.url))),responses);
  check('No unexpected browser or shader errors',errors.length===0,errors);
  const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};if(window.speechSynthesis)window.speechSynthesis.getVoices=()=>[];});
  await fallback.goto(url,{waitUntil:'networkidle'});await fallback.waitForFunction(()=>Boolean(window.blackHoleLab));
  check('Missing WebGL produces an explicit observer-image error',await fallback.locator('#render-error').isVisible()&&await fallback.locator('#capture').isDisabled(),true);
  await fallback.locator('#voice-enabled').check();await fallback.locator('#build-auto').click();await fallback.waitForFunction(()=>{const a=document.querySelector('#narration-audio');return a&&a.readyState>=2&&!a.paused;},{},{timeout:60000});check('Recorded MiniMax narration works without browser Chinese speech voices',(await fallback.locator('#subtitle-text').innerText()).length>20&&(await fallback.evaluate(()=>Boolean(document.querySelector('#narration-audio').currentSrc))),{status:await fallback.locator('#voice-status').innerText()});
  await stage(fallback,3);await input(fallback,'build-input',.5);check('Missing WebGL preserves the calculated formation diagrams',await fallback.locator('#physics-canvas').isVisible()&&!(await fallback.locator('#render-error').isVisible())&&(await pixels(fallback)).mean>5,true);
  const [diagramDownload]=await Promise.all([fallback.waitForEvent('download'),fallback.locator('#capture').click()]);await diagramDownload.saveAs(path.join(output,'diagram-export.png'));check('Calculated diagram remains exportable without WebGL',!(await fallback.locator('#capture').isDisabled()),true);
  report.finalState=await state(page);report.failed=checks.filter(c=>!c.passed).length;report.status=report.failed?'failed':'passed';report.screenshots=output;if(report.failed)throw new Error(report.failed+' acceptance checks failed.');
 }catch(error){report.status='failed';report.failure=String(error.stack||error);throw error;}
 finally{report.count=checks.length;report.errors=errors;fs.writeFileSync(path.join(project,'notes/validation.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
 console.log(JSON.stringify({status:report.status,count:checks.length,screenshots:output},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
