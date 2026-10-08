import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url)),current=root+'assets/qa/v7/',previous=root+'assets/qa/v6/';
const label=(width,height,title)=>Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#f4f1e8"/><text x="24" y="35" font-family="Arial" font-size="22" fill="#344731">${title}</text></svg>`);
const product=await sharp(current+'product-interior-stage-1440.png').resize({width:890}).png().toBuffer();
const plant=await sharp(current+'garden-plant-stage-1440.png').resize({height:344}).png().toBuffer();
const water=await sharp(current+'garden-water-stage-1440.png').resize({height:344}).png().toBuffer();
await sharp({create:{width:1510,height:770,channels:4,background:'#f4f1e8'}}).composite([
  {input:label(1510,70,'011 / Actual browser capture · revision 7'),left:0,top:0},{input:product,left:12,top:70},{input:water,left:913,top:70},{input:plant,left:913,top:421}
]).png().toFile(root+'assets/scene-polish-v7-gallery.png');
const rows=[['product-interior-stage.png','product-interior-stage-1440.png'],['garden-plant-stage.png','garden-plant-stage-1440.png'],['garden-water-stage.png','garden-water-stage-1440.png']],layers=[];
for(let i=0;i<rows.length;i++){
  for(let col=0;col<2;col++){
    const source=col?current+rows[i][1]:previous+rows[i][0],input=await sharp(source).resize({width:640,height:490,fit:'contain',background:'#f4f1e8'}).png().toBuffer();
    layers.push({input,left:12+col*658,top:60+i*504});
  }
}
layers.push({input:label(658,60,'REVISION 6'),left:0,top:0},{input:label(670,60,'REVISION 7 · same scene and controls'),left:658,top:0});
await sharp({create:{width:1328,height:1580,channels:4,background:'#f4f1e8'}}).composite(layers).png().toFile(root+'assets/scene-polish-v7-comparison.png');
console.log('Composed actual browser screenshots for gallery and revision comparison.');
