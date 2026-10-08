import {VERSION,templates,presets,clone,normalize,definition,markdown,prototypeHTML,productAssets,toiletAssets,headphoneAssets,escapeHTML as esc} from './core.js?v=20261003-16';
import {zip} from './zip.js';
import {createToiletEditor} from './toilet-editor.js';

const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
const storageKey='011.idea-foundry.v1', params=new URLSearchParams(location.search);
let draft=clone(presets[params.get('example')==='headphones'?'headphones':params.get('example')==='toilet'?'toilet':params.get('template')==='coverage'?'coverage':'product']);
let saved=[],built=null,dirty=false,latestResult=null,instanceId='',ready=false,currentId=null,saveTimer;
const drafts={};
const toiletEditor=createToiletEditor($('#toilet-options'),()=>draft,changed);
function status(message,error=false){$('#status').textContent=message;$('#status').dataset.error=String(error);}
function persist(){
  try{localStorage.setItem(storageKey,JSON.stringify({version:VERSION,draft,saved,currentId}));$('#storage-status').textContent='草稿已保存在当前浏览器';return true;}
  catch{$('#storage-status').textContent='浏览器存储不可用，请导出 JSON 保留产品';return false;}
}
try{
  const data=JSON.parse(localStorage.getItem(storageKey)||'null');
  if(data?.version===VERSION){
    saved=(Array.isArray(data.saved)?data.saved:[]).slice(0,12).flatMap(p=>{try{return [{id:String(p.id),date:String(p.date),config:normalize(p.config)}];}catch{return [];}});
    if(!params.has('example'))try{draft=normalize(data.draft);currentId=saved.some(p=>p.id===data.currentId)?data.currentId:null;}catch{status('上次草稿不完整，已载入可继续编辑的示例。');}
  }
}catch{status('未能读取之前的草稿，可以从当前示例重新开始。');}

function renderSaved(){
  $('#saved-projects').innerHTML=saved.length?saved.map(p=>`<button type="button" data-project="${esc(p.id)}"><span>${esc(p.config.name)}</span><small>${esc(templates[p.config.template].name)} · ${esc(p.date)}</small></button>`).join(''):'<p>保存一个想法，之后可以接着做。</p>';
}
function colorRows(){
  $('#colors-editor').innerHTML=draft.product.colors.map((c,i)=>`<div class="color-row" data-color-row="${i}"><input type="color" data-color="value" value="${esc(c.value)}" aria-label="配色 ${i+1} 的颜色"><input type="text" data-color="label" value="${esc(c.label)}" maxlength="40" aria-label="配色 ${i+1} 的名称"><button type="button" class="remove" data-remove-color="${i}" aria-label="移除配色 ${i+1}" ${draft.product.colors.length===1?'disabled':''}>×</button></div>`).join('');
  $('#add-color').disabled=draft.product.colors.length>=6;
}
function regionRows(){
  $('#regions-editor').innerHTML=draft.coverage.regions.map((r,i)=>`<div class="region-row" data-region-row="${i}"><div class="region-row-top"><input type="text" data-region="name" value="${esc(r.name)}" maxlength="40" aria-label="地区 ${i+1} 名称"><label class="checkbox"><input type="checkbox" data-region="available" ${r.available?'checked':''}>提供服务</label><button type="button" class="remove" data-remove-region="${i}" aria-label="移除地区 ${i+1}" ${draft.coverage.regions.length===1?'disabled':''}>×</button></div><input type="text" data-region="detail" value="${esc(r.detail)}" maxlength="240" aria-label="地区 ${i+1} 的服务规则说明" placeholder="说明服务条件与下一步"></div>`).join('');
  $('#add-region').disabled=draft.coverage.regions.length>=30;
}
function renderScope(){
  try{const d=definition(draft);$('#mvp-summary').textContent=d.userFlow.join(' → ');$('#pending-summary').textContent=d.pending.join('；');}
  catch(e){$('#mvp-summary').textContent='补齐产品定义后即可构建';$('#pending-summary').textContent=e.message;}
}
function renderForm(){
  for(const key of ['name','idea','audience','problem','input','outcome'])$('#'+key).value=draft[key];
  $('#use-ai').checked=draft.useAI;
  $('#headline').value=draft.branding.title;$('#tagline').value=draft.branding.tagline;$('#accent').value=draft.branding.accent;
  $('#item-name').value=draft.product.name;$('#service-name').value=draft.coverage.serviceName;
  $('#product-kind').value=draft.product.kind||'lamp';const toilet=draft.product.kind==='toilet';$('#lamp-features').hidden=toilet;$('#feature-light').closest('label').hidden=draft.product.kind==='headphones';$('#toilet-options').hidden=!toilet;$('#product-shape-note').textContent=toilet?'马桶模型由型号尺寸和水箱类型驱动。真实产品采用前需要厂家图纸与 SKU。':'使用已有桌灯概念模型；其他形体需要对应的运行模块。';if(toilet)toiletEditor.render();if(draft.product.kind==='headphones')$('#product-shape-note').textContent='耳机为原创头戴式概念，支持折叠、材质与部件观察。真实参数待厂商提供。';
  for(const k of ['finish','light','structure'])$('#feature-'+k).checked=draft.product.features[k];
  all('[data-template]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.template===draft.template)));
  $('#product-options').hidden=draft.template!=='product';$('#coverage-options').hidden=draft.template!=='coverage';
  colorRows();regionRows();renderScope();
}
function step(name){
  if(name!=='define'&&!built)return;
  for(const key of ['define','preview','delivery'])$('#step-'+key).hidden=key!==name;
  all('[data-step]').forEach(b=>{if(b.dataset.step===name)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  const url=new URL(location);url.searchParams.delete('example');url.searchParams.set('step',name);url.searchParams.set('template',draft.template);url.searchParams.set('revision','20261003-16');history.replaceState(null,'',url);
  if(name==='delivery')renderDelivery();
}
function changed(){
  dirty=!!built;$('#dirty-note').hidden=!dirty;$('#export-zip').disabled=dirty||!ready;
  if(dirty)status('产品定义已修改，点击“构建首版原型”更新预览与交付。');
  renderScope();clearTimeout(saveTimer);saveTimer=setTimeout(persist,500);
}
function resetBuild(){
  built=null;ready=false;dirty=false;latestResult=null;instanceId='';$('#prototype').srcdoc='';
  all('[data-step]').forEach(b=>b.disabled=b.dataset.step!=='define');$('#dirty-note').hidden=true;step('define');
}
function load(config,id=null){draft=normalize(config);currentId=id;resetBuild();renderForm();persist();status('已载入产品定义，构建后可继续试用。');}
function exportConfig(){
  if(!built||dirty)throw new Error('请先构建当前产品定义，再导出交付。');
  const c=clone(built),s=latestResult?.selection;
  if(c.template==='product'&&s){
    if(c.product.kind==='toilet'){
      if(latestResult.validation?.valid===false)throw new Error('请修正原型中的现场数值后再导出。');
      c.product.initial.color=s.color;c.toilet.initial={modelId:s.modelId,roughIn:s.roughIn,lid:s.lidPercent,explode:s.structurePercent,view:s.view,setting:s.setting,dimensions:s.dimensions,includeInstallation:s.includeInstallation,site:clone(latestResult.site)};
    }else {c.product.initial={color:s.color,finish:s.finish,light:s.lightPercent,explode:s.structurePercent};if(c.product.kind==='headphones')c.headphones.initial={fold:s.foldPercent,view:s.view,environment:s.environment,camera:latestResult.observation?{yaw:latestResult.observation.yaw,pitch:latestResult.observation.pitch,zoom:latestResult.observation.zoom,focus:latestResult.observation.focus}:null};}
  }
  return normalize(c);
}
function renderDelivery(){
  const d=definition(built);$('#delivery-name').textContent=built.name;$('#delivery-description').textContent=built.outcome;
  $('#implemented-list').innerHTML=d.implemented.map(v=>`<li>${esc(v)}</li>`).join('');
  $('#pending-list').innerHTML=d.pending.map(v=>`<li>${esc(v)}</li>`).join('');
  $('#metrics-list').innerHTML=d.valueMeasures.map((v,i)=>`<article><span>0${i+1} / 待验证</span><p>${esc(v)}</p></article>`).join('');
  $('#export-zip').disabled=dirty||!ready;$('#export-json').disabled=dirty;$('#export-md').disabled=dirty;
}
function build(){
  try{
    built=normalize(draft);draft=clone(built);dirty=false;ready=false;latestResult=null;instanceId=crypto.randomUUID();
    $('#prototype-title').textContent=built.name;$('#prototype-mode').textContent='正在加载本地模块';$('#task-status').textContent='试用一次流程，再把结果带走。';
    $('#dirty-note').hidden=true;all('[data-step]').forEach(b=>b.disabled=false);$('#export-zip').disabled=true;
    $('#prototype').srcdoc=prototypeHTML(built,new URL('./prototype.js?v=20261003-16',import.meta.url).href,instanceId);
    step('preview');persist();status('已按产品定义构建原型，正在准备交互画面。');
  }catch(e){status(e.message,true);step('define');}
}
function download(data,name,type='application/json'){
  const blob=data instanceof Blob?data:new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function fetchFile(name){const response=await fetch(new URL('../'+name,import.meta.url));if(!response.ok)throw new Error('未能读取项目文件：'+name);return {name,data:await response.arrayBuffer()};}
async function exportPackage(){
  const button=$('#export-zip');button.disabled=true;button.textContent='正在打包本地文件…';
  try{
    const c=exportConfig();if(!ready)throw new Error('原型尚未成功加载，请先完成预览。');
    const files=[{name:'index.html',data:prototypeHTML(c)},{name:'product-definition.json',data:JSON.stringify(definition(c),null,2)},{name:'README.md',data:markdown(c)},
      {name:'ASSET-NOTICE.md',data:c.template==='product'?c.product.kind==='headphones'?'# 素材与规格说明\n\n系列影像由本项目 ImageGen 制作，耳机为原创参数化三维概念。固定影像不是实时配置截图。重量、续航与连接规格待厂商提供，未作实物标定；没有音频试听或订单服务。Three.js 遵循 MIT 许可，许可位于 vendor/THREE-LICENSE.txt。\n':c.product.kind==='toilet'?'# 素材与目录说明\n\n产品故事影像为本项目 ImageGen 生成素材；可操作马桶与卫浴场景为原创参数化几何、材质和程序纹理。故事影像不是厂商实拍或当前配置的三维截图。型号、尺寸、规划值与报价为可编辑示例，未作实物标定。Three.js 遵循 MIT 许可，原许可位于 vendor/THREE-LICENSE.txt。包内不包含厂商或参考网站的模型、页面和资产。\n':'# 素材说明\n\n桌灯几何由本项目代码构建，是概念模型。木、石与室内环境为项目自有生成素材，未作实物标定。Three.js 遵循 MIT 许可，原许可位于 vendor/THREE-LICENSE.txt。此包不含参考网站的页面、视频或素材。\n':'# 数据说明\n\n地区规则由产品定义提供，默认规则为示例，采用前需要业务方确认。此包不含参考网站素材。\n'}];
    if(c.experiencePlan)files.push({name:'experience-plan.json',data:JSON.stringify({source:c.experiencePlanSource,plan:c.experiencePlan},null,2)});
    if(latestResult)files.push({name:'preview-result.json',data:JSON.stringify(latestResult,null,2)});
    if(c.useAI)files.push({name:'AI-INTEGRATION.md',data:'# 模型服务接入任务\n\n交付的产品运行页不调用模型；若制作要求使用在线模型，来源另记于 experience-plan.json。产品内业务 AI 需先确定输入、输出与业务用途；在服务端保存密钥，定义结构化输出、失败反馈、超时、费用上限与验收样本，再将结果接入当前任务。自由文本产品想法已保存在 product-definition.json。\n'});
    const paths=['foundry/core.js','foundry/toilet-domain.js','foundry/headphone-domain.js','foundry/planning-contract.js','foundry/prototype.js','foundry/prototype.css',...(c.template==='product'?c.product.kind==='toilet'?toiletAssets:c.product.kind==='headphones'?headphoneAssets:productAssets:[])];
    files.push(...await Promise.all(paths.map(fetchFile)));
    download(zip(files),'idea-foundry-'+(c.template==='product'&&['toilet','headphones'].includes(c.product.kind)?c.product.kind:c.template)+'.zip');status('已下载独立项目包，README 中包含启动方法与后续接入项。');
  }catch(e){status(e.message,true);}
  finally{button.textContent='下载可运行项目包 .zip';button.disabled=dirty||!ready;}
}

for(const key of ['name','idea','audience','problem','input','outcome'])$('#'+key).addEventListener('input',e=>{draft[key]=e.target.value;changed();});
$('#open-showcase').addEventListener('click',e=>{try{if(dirty||!ready)throw new Error('先构建当前定义，完整产品页将使用当前配置。');localStorage.setItem('011.foundry.showcase.v1',JSON.stringify(exportConfig()));}catch(error){e.preventDefault();status(error.message,true);}});
$('#brief-form').addEventListener('submit',e=>{e.preventDefault();build();});
$('#use-ai').addEventListener('change',e=>{draft.useAI=e.target.checked;changed();});
for(const [id,key] of [['headline','title'],['tagline','tagline'],['accent','accent']])$('#'+id).addEventListener('input',e=>{draft.branding[key]=e.target.value;changed();});
$('#item-name').addEventListener('input',e=>{draft.product.name=e.target.value;changed();});
$('#product-kind').addEventListener('change',e=>load(presets[e.target.value==='toilet'?'toilet':e.target.value==='headphones'?'headphones':'product']));
all('[data-example]').forEach(b=>b.addEventListener('click',()=>load(presets[b.dataset.example])));
$('#service-name').addEventListener('input',e=>{draft.coverage.serviceName=e.target.value;changed();});
for(const k of ['finish','light','structure'])$('#feature-'+k).addEventListener('change',e=>{draft.product.features[k]=e.target.checked;changed();});
$('#colors-editor').addEventListener('input',e=>{const key=e.target.dataset.color,row=e.target.closest('[data-color-row]');if(key&&row){draft.product.colors[Number(row.dataset.colorRow)][key]=e.target.value;changed();}});
$('#colors-editor').addEventListener('click',e=>{const button=e.target.closest('[data-remove-color]');if(button&&draft.product.colors.length>1){draft.product.colors.splice(Number(button.dataset.removeColor),1);colorRows();changed();}});
$('#add-color').addEventListener('click',()=>{if(draft.product.colors.length<6){const choices=['#c6b291','#40503b','#ac8886','#786e9b','#6b8496','#ddb466'];draft.product.colors.push({label:'新配色',value:choices.find(v=>!draft.product.colors.some(c=>c.value===v))||'#ffffff'});colorRows();changed();}});
$('#regions-editor').addEventListener('input',e=>{const key=e.target.dataset.region,row=e.target.closest('[data-region-row]');if(key&&row){draft.coverage.regions[Number(row.dataset.regionRow)][key]=key==='available'?e.target.checked:e.target.value;changed();}});
$('#regions-editor').addEventListener('click',e=>{const button=e.target.closest('[data-remove-region]');if(button&&draft.coverage.regions.length>1){draft.coverage.regions.splice(Number(button.dataset.removeRegion),1);regionRows();changed();}});
$('#add-region').addEventListener('click',()=>{if(draft.coverage.regions.length<30){draft.coverage.regions.push({name:'新地区',available:false,detail:''});regionRows();changed();}});
all('[data-template]').forEach(b=>b.addEventListener('click',()=>{if(draft.template===b.dataset.template)return;drafts[draft.template]=clone(draft);draft=clone(drafts[b.dataset.template]||presets[b.dataset.template]);currentId=null;resetBuild();renderForm();persist();status('已切换任务模板。每类任务保留本次编辑，可继续定义新产品。');}));
all('[data-step]').forEach(b=>b.addEventListener('click',()=>step(b.dataset.step)));
$('#build').addEventListener('click',build);$('#back-edit').addEventListener('click',()=>step('define'));$('#go-delivery').addEventListener('click',()=>step('delivery'));$('#try-again').addEventListener('click',()=>step('preview'));
$('#new-project').addEventListener('click',()=>{draft=clone(presets[draft.template==='product'&&draft.product.kind==='headphones'?'headphones':draft.template==='product'&&draft.product.kind==='toilet'?'toilet':draft.template]);currentId=null;resetBuild();renderForm();persist();status('已新建产品草稿。填写新想法后保存，原有产品仍可从左侧继续。');});
$('#save-project').addEventListener('click',()=>{
  try{const config=built&&!dirty?exportConfig():normalize(draft),id=currentId||crypto.randomUUID(),entry={id,date:new Date().toLocaleDateString('zh-CN'),config};
    if(!currentId&&saved.length>=12)throw new Error('当前浏览器已保存 12 个产品，请导出 JSON 保留新的产品。');
    saved=[entry,...saved.filter(p=>p.id!==id)];currentId=id;draft=clone(config);const stored=persist();renderSaved();status(stored?'已保存“'+config.name+'”，可从左侧继续。':'已保留在当前页面；浏览器存储不可用，请导出 JSON 备份。');
  }catch(e){status(e.message,true);}
});
$('#saved-projects').addEventListener('click',e=>{const b=e.target.closest('[data-project]'),p=b&&saved.find(v=>v.id===b.dataset.project);if(p)load(p.config,p.id);});
$('#export-zip').addEventListener('click',exportPackage);
$('#export-json').addEventListener('click',()=>{try{download(definition(exportConfig()),'product-definition.json');status('已导出可重新导入的产品定义。');}catch(e){status(e.message,true);}});
$('#export-md').addEventListener('click',()=>{try{download(markdown(exportConfig()),'product-handoff.md','text/markdown');status('已导出交付说明。');}catch(e){status(e.message,true);}});
for(const input of all('[data-import],#import-file'))input.addEventListener('change',async()=>{
  try{const file=input.files[0];if(!file)return;if(file.size>200000)throw new Error('产品定义文件过大，请选择工作台导出的 JSON。');const data=JSON.parse(await file.text());load(data.product||data);status('产品定义已导入，构建后即可验证。');}
  catch(e){status(e instanceof SyntaxError?'JSON 格式无效，请选择工作台导出的产品定义。':e.message,true);}finally{input.value='';}
});
addEventListener('message',e=>{
  if(e.source!==$('#prototype').contentWindow||e.data?.instanceId!==instanceId||!built)return;
  if(e.data.type==='foundry-ready'){
    ready=true;$('#prototype-mode').textContent=e.data.result.renderer==='webgl'?'本地 WebGL 产品预览':e.data.result.renderer==='canvas'?'二维兼容产品预览':'本地服务规则查询';
    $('#export-zip').disabled=dirty;status('原型已可操作。完成一次任务后，交付包会保留当前选择。');
  }else if(e.data.type==='foundry-resize'){
    const height=Number(e.data.result?.height);if(Number.isFinite(height))$('#prototype').style.height=Math.max(400,Math.min(4000,height))+'px';
  }else if(e.data.type==='foundry-result'){
    latestResult=e.data.result;
    $('#task-status').textContent=latestResult?built.template==='product'?built.product.kind==='toilet'?'选型、现场条件与核对结果已同步，将随项目包带走。':'当前配置已同步，将随项目包带走。':'已记录当前地区与需求，可导出完整查询摘要。':'地区已改变，重新查询后才能带走结果。';
  }else if(e.data.type==='foundry-error'){ready=false;$('#export-zip').disabled=true;status('原型加载失败：'+e.data.result.message,true);}
});
if(params.get('from')==='studio'){try{draft=normalize(JSON.parse(localStorage.getItem('011.foundry.studio-product.v1')));currentId=null;}catch{status('制作方案未找到，请返回目标工作台重新载入。',true);}}
renderForm();renderSaved();
const initialStep=params.get('step');
if(['preview','delivery'].includes(initialStep)&&(params.has('example')||params.get('from')==='studio')){
  build();if(initialStep==='delivery')step('delivery');
}
