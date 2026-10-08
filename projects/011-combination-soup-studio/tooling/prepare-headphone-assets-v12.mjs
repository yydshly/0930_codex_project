import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {planSchema} from '../web/foundry/planning-contract.js';
import {headphoneDemo,briefExample} from '../web/foundry/planner.js';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),sharp=require('sharp');
const source='D:/codex/home/generated_images/01a0f823-f312-7c12-a852-2166150da1b2/';
const jobs=[['exec-70c7d9d2-4f74-4cba-a9c5-9631f02e46a6.png','headphone-hero-v12.webp','横版品牌影像'],['exec-4e1d3145-8128-4ab8-b84b-69fd3a3a10d3.png','headphone-mobile-v12.webp','手机独立竖版'],['exec-6b7a181c-f257-4bba-ad1c-9ca165574c50.png','headphone-detail-v12.webp','同系列材质特写']];
let prior={};try{prior=JSON.parse(await readFile(new URL('../notes/headphone-assets-v12.json',import.meta.url),'utf8'));}catch{}
const manifest=[];
for(const [src,dest,role] of jobs){const image=sharp(source+src),meta=await image.metadata();await image.webp({quality:91}).toFile(fileURLToPath(new URL('../web/foundry/assets/'+dest,import.meta.url)));manifest.push({source:source+src,file:'web/foundry/assets/'+dest,role,width:meta.width,height:meta.height,method:'built-in ImageGen',reference:src===jobs[0][0]?null:source+jobs[0][0]});}
await writeFile(new URL('./planning-schema.json',import.meta.url),JSON.stringify(planSchema,null,2));
await writeFile(new URL('../notes/headphone-assets-v12.json',import.meta.url),JSON.stringify({generatedAt:'2026-10-03',assets:manifest,design:'原创银色椭圆铝壳、深色皮革耳垫、连续头梁、金属旋钮与 USB-C 形体；暖色摄影空间。横版留左侧文字空间，竖版留上方文字空间，近景保持同一设计。',rights:'项目生成概念；非厂商实拍。原图保留在生成目录。',promptSetSummary:prior.promptSetSummary||[],promptRecordNote:prior.promptRecordNote||'制作要点见 design 字段；不保留逐字工具日志。'},null,2));
await writeFile(new URL('../notes/headphone-demo-plan-v12.json',import.meta.url),JSON.stringify({brief:briefExample,provider:'demo',plan:headphoneDemo},null,2));
console.log(manifest.map(x=>({file:x.file,width:x.width,height:x.height})));
