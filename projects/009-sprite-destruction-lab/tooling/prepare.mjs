import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, '../web');
await mkdir(path.join(web, 'vendor'), { recursive: true });
for (const [from, to] of [['matter-js/build/matter.min.js','matter.min.js'], ['html2canvas/dist/html2canvas.min.js','html2canvas.min.js']]) {
  await copyFile(path.join(here,'node_modules',from), path.join(web,'vendor',to));
}
const catalog = JSON.parse(await readFile(path.resolve(here,'../../../projects.json'),'utf8'));
await writeFile(path.join(web,'catalog.js'), `// Generated from the real workspace catalog; run npm run prepare to refresh.\nexport const catalog = ${JSON.stringify(catalog.map(({id,slug,name,summary,status})=>({id,slug,name,summary,status})),null,2)};\n`);
const escape = (s)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const licenses = await Promise.all(['matter-js/LICENSE','html2canvas/LICENSE'].map(async name=>`<h2>${name}</h2><pre>${escape(await readFile(path.join(here,'node_modules',name),'utf8'))}</pre>`));
await writeFile(path.join(web,'licenses.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>第三方许可</title><style>body{font:16px/1.7 system-ui;max-width:900px;margin:40px auto;padding:20px}pre{white-space:pre-wrap}a{color:#00695c}</style><h1>第三方许可</h1><p>Matter.js 0.20.0 与 html2canvas 1.4.1，均遵循 MIT。原作游戏未复制或打包。</p>${licenses.join('')}<p><a href="./">返回演示</a></p></html>`);
console.log('Prepared pinned browser vendors, licenses, and real project catalog.');
