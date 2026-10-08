import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const sharp=require('sharp'),destination=fileURLToPath(new URL('../web/foundry/assets/',import.meta.url));
await mkdir(destination,{recursive:true});
const jobs=[
['D:/codex/home/generated_images/01a0f823-f312-7c12-a852-2166150da1b2/exec-88220937-1a04-4471-bcba-05f4210a7cf5.png','toilet-travertine-v11.webp',1254],
['D:/codex/home/generated_images/01a0f823-f312-7c12-a852-2166150da1b2/exec-d0744bec-12f6-43ea-9169-d0891658e54b.png','toilet-green-stone-v11.webp',1254],
['D:/codex/home/generated_images/01a0f823-f312-7c12-a852-2166150da1b2/exec-b0e7de26-5ee8-471e-8eea-4a9bffd4bae7.png','toilet-hero-mobile-v11.webp',1080],
['D:/codex/home/generated_images/01a0f823-f312-7c12-a852-2166150da1b2/exec-9126a84f-8322-459c-b00f-7893af80e724.png','toilet-hero-v11.webp',1920],
['D:/codex/home/generated_images/01a0f823-f312-7c12-a852-2166150da1b2/exec-726cb37b-6144-43e6-ad38-03005f42e05d.png','toilet-detail-v11.webp',1200]
];
for(const [source,name,width] of jobs){const info=await sharp(source).resize({width,withoutEnlargement:true}).webp({quality:90,effort:6}).toFile(destination+name);console.log(JSON.stringify({name,width:info.width,height:info.height,bytes:info.size}));}
