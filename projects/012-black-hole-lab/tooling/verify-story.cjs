const fs=require('node:fs'),{chromium}=require(process.env.BLACK_HOLE_PLAYWRIGHT||'playwright');
const path=require('node:path'),root=path.resolve(__dirname,'..')+path.sep;
const args=process.argv.slice(2),i=args.indexOf('--url'),base=(i>=0?args[i+1]:'http://127.0.0.1:62116/projects/012-black-hole-lab/web/').replace(/\/?$/,'/');
(async()=>{
const b=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const p=await b.newPage({viewport:{width:1280,height:900}}),checks=[],errors=[];
p.on('pageerror',e=>errors.push(e.message));
await p.goto(base+'?v=guided-story-validation');await p.waitForFunction(()=>window.blackHoleLab?.getState().renderCount>0);
await p.locator('#voice-enabled').uncheck();await p.locator('#build-auto').click();
await p.waitForTimeout(500);
await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(300);
if(await p.evaluate(()=>blackHoleLab.getState().paused))throw Error('Scrolling cut off the narrator');
checks.push('Scrolling to explanatory text preserves the complete narration');
await p.locator('#viewer').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.locator('#pause').click();
if(!await p.evaluate(()=>blackHoleLab.getState().paused))throw Error('Explicit pause failed');await p.locator('#pause').click();
await p.waitForTimeout(300);if(await p.evaluate(()=>blackHoleLab.getState().paused))throw Error('Narration resume failed');
checks.push('Returning to scene can resume the same cue');
await p.locator('[data-stage="3"]').click();await p.locator('.controls').evaluate(e=>e.scrollTop=e.scrollHeight);await p.locator('[data-stage="4"]').click();
if(await p.locator('.controls').evaluate(e=>e.scrollTop)!==0)throw Error('Chapter scroll not reset');checks.push('Selecting a new chapter restores the explanation heading');
await p.locator('[data-stage="9"]').click();await p.locator('#build-next').click();await p.locator('#quality').selectOption('high');
await p.evaluate(()=>{blackHoleLab.render();const a=document.querySelector('#black-hole').toDataURL();window.resultPNG=a;});

const h=fs.readFileSync(root+'web/index.html','utf8').replace('<script defer src="app.js"></script>','').replace('<head>','<head><base href="'+base+'">');
const q=await b.newPage({viewport:{width:1280,height:900}});await q.setContent(h,{waitUntil:'load'});await q.waitForFunction(()=>window.BlackHoleCourse);
const courseResult=await q.evaluate(()=>{
document.querySelector('#voice-enabled').checked=false;
const state={mass:10,rateLog:-9,yaw:.35,inclination:10,distance:23,paused:true,disk:true,lensing:true,doppler:true};
const course=BlackHoleCourse.create(state,{sync(){},resize(){},render(){},reset(){}},false);
document.querySelector('#build-auto').click();
const transitions=[],seen=new Set(),history=[];let second=0,lastStage=-1,backwards=false,oldProgress=0;
while(course.getState().autoExplaining&&second<6000){
const s=course.getState();if(s.stage!==lastStage){transitions.push(s.stage);lastStage=s.stage;oldProgress=0;}
if(s.stage===3){if(s.progress+1e-9<oldProgress)backwards=true;oldProgress=s.progress;}
const key=s.stage+'/'+s.cue;if(!seen.has(key)){seen.add(key);history.push({stage:s.stage,cue:s.cue,title:document.querySelector('#subtitle-title').textContent});}
course.tick(1);second++;
}
return{transitions,cues:seen.size,second,backwards,final:course.getState(),paused:state.paused,history};
});
if(courseResult.cues!==30||courseResult.transitions.join(',')!=='0,1,2,3,4,5,6,7,8,9'||!courseResult.paused||courseResult.backwards||courseResult.final.autoExplaining)throw Error(JSON.stringify(courseResult));
checks.push('Full deterministic guided controller visits all 30 cues and all 10 chapters');checks.push('Calculated contraction progress remains monotonic across cue boundaries');checks.push('Finished tour pauses at the final result');
if(errors.length)throw Error(errors.join('\n'));
fs.writeFileSync(root+'notes/story-validation.json',JSON.stringify({date:new Date().toISOString(),status:'passed',checks,courseResult,errors},null,2)+'\n');console.log(JSON.stringify({status:'passed',checks:checks.length,seconds:courseResult.second,cues:courseResult.cues}));
}finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});