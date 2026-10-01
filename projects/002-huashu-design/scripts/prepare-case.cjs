// Keep original upstream files intact; prepare explicit Windows/runtime adaptations.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const runtime = process.env.HUASHU_NODE_MODULES || 'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const build = path.join(root, 'build/case');
const web = path.join(root, 'web/cases/research-desk');
for (const dir of [build, web+'/assets', web+'/downloads', web+'/slides',web+'/vendor']) fs.mkdirSync(dir,{recursive:true});
if (!fs.existsSync(build+'/node_modules')) fs.symlinkSync(runtime,build+'/node_modules','junction');
const patches=[];
function patch(name,changes){
 let code=fs.readFileSync(root+'/vendor/huashu-design/'+name,'utf8');
 for(const [from,to,reason] of changes){if(!code.includes(from))throw Error('Patch anchor missing: '+name+' '+from);code=code.replace(from,to);patches.push({file:name,from,to,reason});}
 fs.writeFileSync(build+'/'+path.basename(name),code);
}
const launch = "{ executablePath: process.env.HUASHU_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' }";
patch('scripts/export_deck_pdf.mjs',[
 ["import path from 'path';","import path from 'path';\nimport { pathToFileURL } from 'url';",'Use Windows-safe file URLs'],
 ['chromium.launch()','chromium.launch('+launch+')','Use installed Chromium'],
 ["'file://' + path.join(slidesDir, f)",'pathToFileURL(path.join(slidesDir, f)).href','Encode paths correctly']
]);
patch('scripts/html2pptx.js',[
 ["const path = require('path');","const path = require('path');\nconst { pathToFileURL, fileURLToPath } = require('url');",'Windows file URL helpers'],
 ['chromium.launch(launchOptions)','chromium.launch({...launchOptions, ...'+launch+'})','Use installed Chromium'],
 ["return p.replace(/^file:\\/\\//, '');","return p.startsWith('file:') ? fileURLToPath(p) : p;",'Decode Windows image URLs without leaving a leading slash'],
 ["'file://' + absHtmlPath",'pathToFileURL(absHtmlPath).href','Encode paths correctly']
]);
patch('scripts/export_deck_pptx.mjs',[
 ['await html2pptx(fullPath, pres);',"const { slide } = await html2pptx(fullPath, pres);\n      const notesFile=fullPath.replace(/\\.html$/,'.notes.txt');\n      try { slide.addNotes(await fs.readFile(notesFile,'utf8')); } catch(e) { if(e.code!=='ENOENT')throw e; }",'Attach authored speaker notes and source citations'],
 ['if (errors.length === files.length) {','if (errors.length > 0) {','Fail if any slide is missing instead of delivering an incomplete deck']
]);
patch('scripts/render-video-seek.js',[
 ["const path = require('path');","const path = require('path');\nconst { pathToFileURL } = require('url');",'Windows file URL helpers'],
 ['chromium.launch()','chromium.launch('+launch+')','Use installed Chromium'],
 ["'file://' + HTML_ABS",'pathToFileURL(HTML_ABS).href','Encode paths correctly'],
 ['const MP4_OUT  =',"if (path.dirname(path.resolve(TMP_DIR)) !== path.resolve(DIR) || !path.basename(TMP_DIR).startsWith('.seek-tmp-')) throw Error('Unsafe temporary directory');\nconst MP4_OUT  =",'Verify recursive cleanup remains in its intended directory']
]);
fs.copyFileSync(root+'/vendor/huashu-design/assets/deck_stage.js',web+'/vendor/deck_stage.js');
fs.copyFileSync(root+'/vendor/huashu-design/LICENSE',web+'/vendor/HUASHU-LICENSE.txt');
fs.writeFileSync(build+'/patches.json',JSON.stringify(patches,null,2));
console.log('Prepared export scripts. Originals retained in vendor/huashu-design.');
