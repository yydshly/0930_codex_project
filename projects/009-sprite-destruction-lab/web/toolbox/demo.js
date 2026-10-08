import * as translation from './translation.js';
import * as data from './data.js';
import {catalog} from '../catalog.js';
globalThis.FormaTranslate=translation;globalThis.FormaToolboxData=data;
const script=document.createElement('script');script.src='toolbox.js';document.head.append(script);await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('工具箱脚本加载失败'));});
const cssText=await fetch('toolbox.css').then(r=>r.text());
const root=document.getElementById('reading-source');
const tbody=document.getElementById('catalog-body');
for(const item of catalog){const tr=document.createElement('tr');for(const text of [String(item.id).padStart(3,'0'),item.name,item.status,`projects/${String(item.id).padStart(3,'0')}-${item.slug}/`]){const td=document.createElement('td');td.textContent=text;tr.append(td);}tbody.append(tr);}
document.getElementById('catalog-count').textContent=catalog.length;
const options={root,cssText,mode:'demo',sourceUrl:location.href.split('#')[0],sourceTitle:'From reading a page to keeping useful information · 本仓库研究资料'};
function open(){if(!FormaToolbox.isMounted())FormaToolbox.mount(options);else FormaToolbox.showTab(FormaToolbox.getState().tab);}
function selectParagraph(){open();const p=document.getElementById('first-paragraph'),range=document.createRange();range.selectNodeContents(p);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);FormaToolbox.captureSelection();}
document.getElementById('open-toolbox').onclick=open;
document.getElementById('try-translation').onclick=()=>{selectParagraph();FormaToolbox.showTab('translate');};
document.getElementById('try-note').onclick=()=>{selectParagraph();FormaToolbox.showTab('notes');};
document.getElementById('try-table').onclick=()=>{open();FormaToolbox.selectTable(document.getElementById('catalog-table'));document.getElementById('catalog-table').scrollIntoView({behavior:'smooth',block:'center'});};
open();
function route(){const tab=location.hash.slice(1);if(tab==='tables')document.getElementById('try-table').click();else if(['translate','notes','tools'].includes(tab))FormaToolbox.showTab(tab);}
route();window.addEventListener('hashchange',route);
// Optional evidence is shown only when the actual extension test image exists.
const proof=new Image();proof.onload=()=>{document.getElementById('external-proof').hidden=false;};proof.src='assets/extension-mdn.png';
