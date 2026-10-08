import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url)),folder=root+'assets/qa/v11/';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:820},reducedMotion:'reduce'});
  await page.goto('https://combinationsoupstudio.com.au/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>{const v=document.querySelector('#heroVid');return v&&(v.tagName!=='VIDEO'||v.readyState>=2);},{},{timeout:30000});
  await page.screenshot({path:folder+'source-current-hero.png'});
  const original=await sharp(folder+'source-current-hero.png').resize(1008,574).toBuffer();
  const current=await sharp(folder+'toilet-campaign-desktop.png').resize(1008,574).toBuffer();
  await sharp({create:{width:2036,height:574,channels:3,background:'#e8e4d9'}}).composite([{input:original,left:0,top:0},{input:current,left:1028,top:0}]).png().toFile(folder+'source-campaign-comparison.png');
  const old=await sharp(root+'assets/qa/toilet-smart-hero-v10.png').resize({width:1008,height:706,fit:'contain',background:'#e8e4d9'}).toBuffer();
  const live=await sharp(folder+'toilet-live-smart.png').resize({width:1008,height:706,fit:'contain',background:'#e8e4d9'}).toBuffer();
  await sharp({create:{width:2036,height:706,channels:3,background:'#e8e4d9'}}).composite([{input:old,left:0,top:0},{input:live,left:1028,top:0}]).png().toFile(folder+'toilet-live-before-after.png');
  console.log('Saved equal-scale campaign comparison and live before/after.');
}finally{await browser.close();}
