import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const source=root+'assets/qa/v6/';
const product=await sharp(source+'product-interior-stage.png').resize({width:890}).png().toBuffer();
const plant=await sharp(source+'garden-plant-stage.png').resize({height:344}).png().toBuffer();
const water=await sharp(source+'garden-water-stage.png').resize({height:344}).png().toBuffer();
const labels=Buffer.from('<svg width="1510" height="70"><rect width="1510" height="70" fill="#f4f1e8"/><text x="28" y="42" font-family="Arial" font-size="22" fill="#344731">011 / Actual browser capture · revision 6</text></svg>');
await sharp({create:{width:1510,height:770,channels:4,background:'#f4f1e8'}}).composite([
  {input:labels,left:0,top:0},{input:product,left:12,top:70},{input:water,left:913,top:70},{input:plant,left:913,top:421}
]).png().toFile(root+'assets/scene-refinements-v6-gallery.png');
console.log('Composed actual stage screenshots; no generated interface imagery.');
