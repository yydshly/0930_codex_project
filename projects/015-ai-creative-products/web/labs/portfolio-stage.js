import {createPortfolioViewer} from './portfolio-viewer.js';

export function mountPortfolio(container,h,projects){
 h.css('portfolio.css');
 const e=h.escape,controller=new AbortController();
 let state={studio:'研究与创作工作室',subtitle:'把想法做成可以观看、操作和带走的作品。',theme:'editorial',filter:'全部',selected:null,focus:'011',readingPhase:'closed'},viewer,disposed=false;
 const url=p=>new URL(p.image,import.meta.url).href;
 const visible=()=>projects.filter(p=>state.filter==='全部'||p.type===state.filter);
 container.innerHTML=`<div class="portfolio-lab"><div class="portfolio-layout"><aside class="lab-controls portfolio-controls"><h3>空间作品集</h3><p>先聚焦一件档案，再沿书脊翻开封面。内页与成果说明一起留在展厅里。</p><label class="lab-field">工作室名称<input data-field="studio" maxlength="40" value="${e(state.studio)}"></label><label class="lab-field">一句介绍<input data-field="subtitle" maxlength="100" value="${e(state.subtitle)}"></label><label class="lab-field">空间主题<select data-field="theme"><option value="editorial">白盒 · 日光展厅</option><option value="gallery">黑盒 · 琥珀聚光</option><option value="warm">工作室 · 陶土与纸</option></select></label><label class="lab-field">成果类型<select data-field="filter"><option>全部</option><option>交互</option><option>动效</option><option>游戏</option></select></label><div class="portfolio-export"><button class="lab-button primary" type="button" data-export="html">导出独立空间 HTML</button><button class="lab-button" type="button" data-export="json">导出作品集 JSON</button></div><p class="lab-status" data-status role="status">展厅含图片、翻开与键盘浏览，可离线打开。</p><p class="portfolio-scope">参考原作的挂架陈列、物件聚焦与单件浏览。四件研究档案采用不同印刷与外形，沿同一书脊翻开；完整图片与阅读交互可离线导出。</p></aside><div class="portfolio-preview"></div></div></div>`;
 const root=container.querySelector('.portfolio-lab'),preview=root.querySelector('.portfolio-preview');

 function markup(items,images,snapshot){
  return `<section class="portfolio-page" data-theme="${e(snapshot.theme)}" data-count="${items.length}" data-reading="false" data-fold-phase="closed"><header class="portfolio-masthead"><span class="portfolio-monogram">R↗</span><b data-studio>${e(snapshot.studio||'未命名工作室')}</b><span>OBJECTS / 2026</span></header><div class="portfolio-intro"><span>研究成果，作为物件陈列。</span><p data-subtitle>${e(snapshot.subtitle)}</p></div><div class="folio-space" tabindex="0" aria-label="拖动或按左右方向键浏览，按回车翻开当前档案"><div class="folio-room-lines"></div><div class="folio-rail"></div><div class="folio-ground"></div>${items.map((p,i)=>`<button type="button" class="folio-object" data-project="${p.id}" data-material="${e(p.material)}" aria-controls="portfolio-details" aria-expanded="false" style="--art:${['#507b75','#929e53','#799590','#6e85a0'][i]}"><span class="folio-hook"></span><span class="folio-frame"><span class="folio-folder-tab">STUDY ${p.id}</span><span class="folio-inside"><span class="folio-page-number">RESEARCH ARCHIVE / 0${i+1}</span><span class="folio-inside-title">${e(p.cover)}<small>${e(p.tag)}</small></span><img src="${images[i]}" alt="${e(p.title)}的实际项目画面"><span class="folio-inside-caption">${e(p.result)}</span><span class="folio-inside-footer">PROJECT ${p.id}<b>01 — CONTENTS</b></span></span><span class="folio-cover"><span class="folio-front"><span class="folio-cover-top"><small>${({photo:"PHOTO / FORM STUDY",print:"TYPE / EXPERIMENT 008",sleeve:"PLAY / RESEARCH SERIES",folio:"INTERACTION / STUDY 009"})[p.material]}</small><b>0${i+1}</b></span><span class="folio-cover-title">${e(p.printTitle||p.cover)}<small>${e(p.tag)}</small></span><img src="${images[i]}" alt=""><span class="folio-print-note">${e(p.description)}</span><span class="folio-cover-bottom"><b>${e(p.cover)}</b><small>${e(p.series)}</small><span>PROJECT ${p.id} / 2026</span></span><span class="folio-object-stamp">${e(p.type)}</span></span><span class="folio-back"><span>FIELD NOTES<br>RESEARCH / ${p.id}</span><b>${e(p.cover)}</b><span class="folio-back-rule"></span><small>${e(p.description)}</small><span class="folio-back-foot">${e(p.series)}<br>RESEARCH & CREATION STUDIO</span></span><span class="folio-cover-edge"></span></span><span class="folio-spine"></span></span><span class="folio-card-label"><strong>${e(p.title)}</strong><span>${e(p.tag)}</span></span></button>`).join('')}<span class="folio-room-note">拖动陈列 · 聚焦物件 · 翻开阅读</span></div><div class="folio-navigation"><button class="lab-button" type="button" data-step="-1" aria-label="上一件">←</button><div><span></span><b></b></div><button class="lab-button" type="button" data-step="1" aria-label="下一件">→</button><button class="lab-button primary" type="button" data-open>翻开这件作品</button></div><article id="portfolio-details" class="portfolio-detail" hidden aria-hidden="true" inert><span data-detail-id></span><h3 tabindex="-1"></h3><p data-description></p><div class="portfolio-outcomes"><p><b>实际成果</b><span data-result></span></p><p><b>范围</b><span data-boundary></span></p></div><button class="lab-button" data-close type="button">合上档案 · 返回陈列 ↑</button></article><footer class="portfolio-footer"><span>${items.length} 件原创研究成果</span><span>聚焦 → 翻开 → 阅读 · 真实项目画面</span></footer></section>`;
 }
 function render(){
  viewer?.dispose();
  const items=visible();if(!items.some(p=>p.id===state.focus))state.focus=items[0].id;
  state.selected=null;state.readingPhase='closed';
  preview.innerHTML=markup(items,items.map(url),state);
  viewer=createPortfolioViewer(preview.firstElementChild,items,items.findIndex(p=>p.id===state.focus),change=>Object.assign(state,change));
 }
 function status(text){root.querySelector('[data-status]').textContent=text;h.onStatus(text);}
 async function imageData(p){
  const response=await fetch(url(p),{signal:controller.signal});if(!response.ok)throw Error('无法读取作品图片');
  const raw=await response.blob(),blob=new Blob([raw],{type:'image/webp'});
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
 }
 async function exportHTML(button){
  // Freeze both content and selection before asynchronous image reads.
  const snapshot={...state},items=visible().map(p=>({...p}));
  button.disabled=true;status('正在打包档案、作品图像与离线交互…');
  try{
   const images=await Promise.all(items.map(imageData));
   const response=await fetch(new URL('portfolio.css',import.meta.url),{signal:controller.signal});if(!response.ok)throw Error('无法读取展厅样式');
   const css=await response.text(),page=markup(items,images,snapshot);
   const data=JSON.stringify(items).replaceAll('<','\\u003c');
   const script=`(${createPortfolioViewer.toString()})(document.querySelector('.portfolio-page'),${data},${Math.max(0,items.findIndex(p=>p.id===snapshot.focus))});`;
   if(!disposed){
    h.downloadFile('研究空间作品集.html',`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(snapshot.studio)} · 空间作品集</title><style>*{box-sizing:border-box}body{margin:0;background:#eee;font:16px system-ui}.portfolio-page{max-width:1250px;margin:auto}.lab-button{font:inherit;border:1px solid #819b8b;border-radius:7px;background:#fff;padding:12px;cursor:pointer}.lab-button.primary{background:#17483e;color:#fff}${css}</style></head><body>${page}<script>${script}</script></body></html>`,'text/html;charset=utf-8');
    status('已导出：图片、翻开、方向键与返回交互均可离线使用。');
   }
  }catch(error){if(!disposed)status('导出未完成：'+error.message);}finally{if(!disposed)button.disabled=false;}
 }
 root.addEventListener('input',event=>{
  const key=event.target.dataset.field;if(!key)return;state[key]=event.target.value;
  if(key==='filter')render();
  else if(key==='theme')preview.firstElementChild.dataset.theme=state.theme;
  else if(key==='studio')preview.querySelector('[data-studio]').textContent=state.studio||'未命名工作室';
  else if(key==='subtitle')preview.querySelector('[data-subtitle]').textContent=state.subtitle;
 },{signal:controller.signal});
 root.addEventListener('click',event=>{
  const b=event.target.closest('[data-export]');if(!b)return;
  if(b.dataset.export==='html')exportHTML(b);
  else{h.downloadFile('空间作品集.json',JSON.stringify({...state,projects:visible(),reference:'挂架物件陈列、正面聚焦与单件浏览；扩展原创档案翻开交互'},null,2),'application/json');status('空间内容与主题配方已导出。');}
 },{signal:controller.signal});
 render();
 return {getState:()=>JSON.parse(JSON.stringify({...state,paper:viewer.getState().paper,visibleProjects:visible().map(p=>p.id),materials:visible().map(p=>({project:p.id,material:p.material})),surfaceModel:'有限 CSS 表面、六段角度弯曲和固定书脊；未模拟真实布料或柔性碰撞',effect:'不同档案物件聚焦、沿书脊翻开、六段弯曲与贴页阴影、连续阅读'})),setActive(value){viewer.setActive(value);},dispose(){disposed=true;viewer.dispose();controller.abort();root.remove();}};
}


