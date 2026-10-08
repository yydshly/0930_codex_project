import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const source=await sharp(root+'assets/qa/v11/source-current-hero.png').resize(1008,574).toBuffer();
const current=await sharp(root+'assets/qa/v12/headphone-hero-desktop.png').resize(1008,574).toBuffer();
await sharp({create:{width:2036,height:574,channels:3,background:'#e8e4d9'}}).composite([{input:source,left:0,top:0},{input:current,left:1028,top:0}]).png().toFile(root+'assets/qa/v12/source-headphone-comparison.png');
console.log('Equal-scale comparison: source snapshot 2026-10-02 / current headphone page 2026-10-03.');
