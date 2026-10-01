import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve('projects/002-huashu-design');
const {FileBlob,PresentationFile}=await import(pathToFileURL(root+'/build/case/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs').href);
const file=root+'/web/cases/research-desk/downloads/research-desk.pptx';
const p=await PresentationFile.importPptx(await FileBlob.load(file));
console.log((await p.inspect({kind:'slide',maxChars:4000})).ndjson);
for(let i=0;i<p.slides.items.length;i++){
 const preview=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(root+`/build/case/pptx-${i+1}.png`,new Uint8Array(await preview.arrayBuffer()));
}
console.log('Rendered imported PPTX');
