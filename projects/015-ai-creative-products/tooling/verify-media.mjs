import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true});
const results=[];
const requested=process.env.CREATIVE_MEDIA_CASES?process.env.CREATIVE_MEDIA_CASES.split(',').map(Number):Array.from({length:10},(_,i)=>i+1);
for(let first=0;first<requested.length;first+=3){
  const batch=await Promise.all(requested.slice(first,first+3).map(async id=>{
    const page=await browser.newPage();const statuses=[];
    page.on('response',response=>{if(response.url().includes('video.twimg'))statuses.push(response.status());});
    await page.goto(`http://127.0.0.1:8975/#case-${String(id).padStart(2,'0')}`);
    await page.locator('#play-original').click();let result;
    try{await page.waitForFunction(()=>document.querySelector('video')?.currentTime>.15,{},{timeout:30000});result=await page.locator('video').evaluate(v=>({played:true,time:v.currentTime,width:v.videoWidth,duration:v.duration}));}
    catch{result={played:false,state:await page.locator('#case-media').innerText()};}
    await page.close();return {id,...result,statuses};
  }));results.push(...batch);console.log(JSON.stringify(batch));
}
await browser.close();
let prior={results:[],retryHistory:[]};
if(process.env.CREATIVE_MEDIA_CASES){try{prior=JSON.parse(await readFile(root+'notes/media-verification.json','utf8'));}catch{}}
const priorRetried=prior.results.filter(result=>requested.includes(result.id));
const merged=[...prior.results.filter(result=>!requested.includes(result.id)),...results].sort((a,b)=>a.id-b.id);
await writeFile(root+'notes/media-verification.json',JSON.stringify({checkedAt:'2026-10-02',results:merged,retryHistory:[...(prior.retryHistory||[]),...priorRetried],scope:'Playback startup only; not complete viewing or game validation.'},null,2)+'\n');
