import {createProductRenderer} from './runtime/product-renderer.js';

const $=selector=>document.querySelector(selector);
const colors={'#356873':'海湾蓝','#e7d9be':'纸沙色','#b66e50':'陶土色'};
const labels={finish:{matte:'哑光',gloss:'亮面'},room:{studio:'日光',night:'夜景'},setting:{interior:'室内',studio:'简洁背景'}};
const defaults={color:'#356873',finish:'matte',light:70,explode:0,room:'studio',setting:'interior',spin:false,reflections:true};
const presets={desk:{...defaults},night:{...defaults,color:'#e7d9be',room:'night',light:52},photo:{...defaults,color:'#b66e50',finish:'gloss',setting:'studio',light:35}};
const views=['hero','front','detail','structure'];
const key='creative-products:arc-workspace:v1';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const limit=(value,fallback)=>Number.isFinite(Number(value))?Math.min(100,Math.max(0,Number(value))):fallback;
const normalize=value=>({
  color:Object.hasOwn(colors,value?.color)?value.color:defaults.color,
  finish:value?.finish==='gloss'?'gloss':'matte',
  light:limit(value?.light,defaults.light),explode:limit(value?.explode,0),
  room:value?.room==='night'?'night':'studio',setting:value?.setting==='studio'?'studio':'interior',
  spin:value?.spin===true,reflections:true
});
const cleanText=(value,fallback,max)=>typeof value==='string'?value.slice(0,max):fallback;
let config={...defaults},projectName='研究工作台照明方案',notes='用于日常研究、原型评审与桌面创作，比较日间和夜间的展示效果。';
let savedA=null,standardView='hero',viewState={},renderer,storageAvailable=true,tourActive=false,tourTimers=[];
const progress={explored:false,exported:false};
const partInfo={
  shade:{title:'灯罩',text:'曲面灯罩包住光源；配色与哑光、亮面会改变表面观感。先旋转观察轮廓，再比较材质。'},
  diffuser:{title:'扩散板',text:'浅色扩散板把光源与外壳分开。展开结构可观察两者的位置关系；这里的发光是视觉预览。'},
  stem:{title:'支柱',text:'金属支柱连接灯罩与底座，形成轻薄的竖向结构。近看连接与比例，再返回整体视角。'},
  base:{title:'底座',text:'底座包含触控位置与供电线。可查看部件布局；这个原创概念尚未对应真实生产规格。'}
};

function validReference(value){
  if(!value||typeof value!=='object'||!value.configuration)return null;
  return {projectName:cleanText(value.projectName,projectName,80),notes:cleanText(value.notes,notes,800),configuration:normalize(value.configuration),standardView:views.includes(value.standardView)?value.standardView:'hero',createdAt:typeof value.createdAt==='string'?value.createdAt:null};
}
try{
  const stored=JSON.parse(localStorage.getItem(key));
  if(stored?.schemaVersion===1){config=normalize(stored.configuration);config.spin=false;projectName=cleanText(stored.projectName,projectName,80);notes=cleanText(stored.notes,notes,800);standardView=views.includes(stored.standardView)?stored.standardView:'hero';savedA=validReference(stored.savedA);}
}catch{storageAvailable=false;}
if(new URLSearchParams(location.search).get('embedded')==='1')document.body.classList.add('is-embedded');

function persist(){
  try{localStorage.setItem(key,JSON.stringify({schemaVersion:1,configuration:config,projectName,notes,standardView,savedA}));storageAvailable=true;}
  catch{storageAvailable=false;}
}
function announce(message){$('#demo-status').textContent=message;}
function rows(value){return [
  ['color','配色',colors[value.color]],['finish','表面',labels.finish[value.finish]],
  ['room','使用氛围',labels.room[value.room]],['setting','展示环境',labels.setting[value.setting]],
  ['light','视觉亮度',`${value.light}%`]
];}
function differences(){return savedA?rows(config).filter(([field])=>config[field]!==savedA.configuration[field]):[];}
function updateComparison(){
  if(!savedA){$('#comparison').innerHTML='<div class="comparison-empty"><p>先把喜欢的一套配置保存为方案 A。</p><p>再调整配色、材质或灯光，这里会对照 A 与当前方案。</p></div>';$('#restore-a').disabled=true;$('#saved-status').textContent='方案 A 尚未保存';return;}
  $('#restore-a').disabled=false;
  const changed=differences();
  const earlier=new Map(rows(savedA.configuration).map(([field,label,value])=>[field,value]));
  $('#comparison').innerHTML=`<p class="comparison-caption">${changed.length?`当前方案与 A 有 ${changed.length} 项不同。`:'当前方案与 A 相同，可调整右侧选项形成对照。'}</p><div class="comparison-scroll"><table class="comparison-table"><thead><tr><th>比较内容</th><th>方案 A</th><th>当前方案</th></tr></thead><tbody>${rows(config).map(([field,label,value])=>`<tr data-changed="${config[field]!==savedA.configuration[field]}"><th>${label}</th><td>${escape(earlier.get(field))}</td><td>${escape(value)}</td></tr>`).join('')}</tbody></table></div>`;
  $('#saved-status').textContent=storageAvailable?`方案 A 已保存在此浏览器 · ${colors[savedA.configuration.color]} / ${labels.room[savedA.configuration.room]}`:'方案 A 已保留在本页，浏览器暂未允许本地保存。';
}
function updateProgress(){
  const steps=[['查看结构',progress.explored],['保存方案 A',Boolean(savedA)],['形成方案对照',differences().length>0],['生成交付文件',progress.exported]];
  $('#task-progress').innerHTML=steps.map(([label,done],i)=>`<span class="task-step" data-complete="${done}"><b>${done?'✓':String(i+1).padStart(2,'0')}</b>${label}</span>`).join('');
}
function updateRenderStatus(){
  const type=renderer?.rendererType||viewState.renderer;
  $('#renderer-status').textContent=type==='canvas'?'二维兼容预览':'实时三维 · 拖动旋转 / 滚轮缩放';
  $('#product-canvas').dataset.renderer=type||'loading';
  $('#environment-status').textContent=type==='canvas'?'当前设备保留选配与导出':config.setting==='studio'?'棚拍环境':viewState.environmentFailed?'室内素材未加载，显示兼容环境':viewState.environmentReady?'室内环境已就绪':'正在准备室内环境…';
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===(viewState.view||standardView))));
  const selectedPart=Object.hasOwn(partInfo,viewState.part)?viewState.part:'';
  document.querySelectorAll('[data-part]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.part===selectedPart)));
  if($('#part-description').dataset.focusedPart!==selectedPart){
    $('#part-description').dataset.focusedPart=selectedPart;
    const part=partInfo[selectedPart];
    $('#part-description').innerHTML=part?`<h3>${part.title}</h3><p>${part.text}</p>`:'选择一个部件，了解它在整体形态中的作用。';
  }
  if(type==='canvas'){$('#setting').disabled=true;$('#spin').disabled=true;$('#spin').checked=false;config.spin=false;config.setting='studio';document.querySelector('[data-view="front"]').disabled=true;$('.canvas-hint').textContent='二维兼容预览：可调整配色、光感和结构。';$('#product-canvas').setAttribute('aria-label','ARC 桌灯二维兼容预览，可通过表单调整选项并导出画面。');}
}
function refresh(draw=true){
  if(renderer?.rendererType==='canvas'){config.setting='studio';config.spin=false;config.reflections=false;}
  for(const field of ['finish','room','setting','light','explode'])$('#'+field).value=String(config[field]);
  $('#spin').checked=config.spin;$('#project-name').value=projectName;$('#notes').value=notes;
  $('#light-value').textContent=config.light+'%';$('#explode-value').textContent=config.explode+'%';
  document.querySelectorAll('[data-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color===config.color)));
  document.querySelectorAll('[data-preset]').forEach(button=>{const p=presets[button.dataset.preset];button.setAttribute('aria-pressed',String(['color','finish','light','room','setting'].every(field=>p[field]===config[field])));});
  $('#current-summary').textContent=`${colors[config.color]} · ${labels.finish[config.finish]} · ${labels.room[config.room]} · 视觉亮度 ${config.light}%`;
  updateComparison();updateProgress();updateRenderStatus();persist();
  if(draw)renderer?.draw();
}
function stopTour(message){tourTimers.forEach(clearTimeout);tourTimers=[];tourActive=false;$('#tour').textContent='自动体验';$('#tour').setAttribute('aria-pressed','false');if(message)announce(message);}
function applyPreset(name){config={...presets[name]};standardView='hero';renderer?.reset();renderer?.setView('hero');refresh();}
function snapshot(includeReference=true){
  return {schemaVersion:1,demo:'arc-workspace-showroom',createdAt:new Date().toISOString(),task:'为研究工作台选择灯具配置，比较方案并交给团队评审',project:{name:projectName,notes},configuration:{...config},observation:{...renderer.getViewState(),restorablePreset:standardView,note:'保存配置与标准视角；自由拖动的精确相机角度不属于恢复内容。'},referenceA:includeReference?savedA:null,differences:includeReference?differences().map(([field,label,value])=>({field,label,before:rows(savedA.configuration).find(row=>row[0]===field)[2],after:value})):[],sources:[{project:'011',role:'原创 ARC 概念模型与本地场景素材'},{case:1,role:'作品的展示顺序与选择入口'},{case:4,role:'分步演示与表达节奏'},{case:9,role:'三维场景与参数化交互'}],scope:'原创概念选型原型；未校准实物尺寸和照度，未接入订单或采购。'};
}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);progress.exported=true;updateProgress();announce('交付文件已准备，浏览器开始下载。');}
async function exportImage(){
  const button=$('#export-png'),canvas=$('#product-canvas');
  button.disabled=true;announce('正在刷新当前画面，准备 PNG…');
  canvas.scrollIntoView({behavior:'instant',block:'center'});
  // The renderer pauses outside the viewport. Bring it back and let the
  // configured structure and camera settle before capturing its pixels.
  await new Promise(resolve=>setTimeout(resolve,700));
  renderer.draw();
  canvas.toBlob(blob=>{
    button.disabled=false;
    if(!blob){announce('画面暂未就绪，请稍候再导出。');return;}
    download('ARC-工作台预览.png',blob,'image/png');
  },'image/png');
}
function markdown(data){return `# ${data.project.name}\n\n用途：${data.project.notes}\n\n## 当前选择\n\n${rows(data.configuration).map(([,label,value])=>`- ${label}：${value}`).join('\n')}\n- 结构展开：${data.configuration.explode}%\n- 标准视角：${data.observation.restorablePreset}\n\n## 与方案 A 对照\n\n${data.referenceA?(data.differences.length?data.differences.map(row=>`- ${row.label}：${row.before} → ${row.after}`).join('\n'):'当前选择与方案 A 相同。'):'尚未保存方案 A。'}\n\n## 评审与交付\n\n- 先核对结构理解、材质选择与屏幕配置是否一致。\n- 本文件和 JSON 为本地交付；画面可单独导出 PNG。\n- 后续接入真实产品尺寸、照片、照明测试数据和采购规则。\n\n## 来源与范围\n\n复用项目 011 的原创 ARC 模型；参考案例 1 的展示叙事、4 的演示节奏、9 的三维交互。模型为原创概念，未按实物尺寸和照度校准。\n\n配置保存标准视角，不恢复任意手动相机角度。没有发送订单或采购请求。\n\n生成时间（UTC）：${data.createdAt}\n`;}

$('#product-canvas').addEventListener('product-render-state',event=>{viewState=event.detail;updateRenderStatus();});
renderer=createProductRenderer($('#product-canvas'),()=>config);renderer.setView(standardView);
window.ArcDemo=Object.freeze({getSnapshot:()=>snapshot(),getRendererType:()=>renderer.rendererType});
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.color){stopTour();config.color=button.dataset.color;refresh();return;}
  if(button.dataset.preset){stopTour();applyPreset(button.dataset.preset);announce('已切换使用情境，可继续修改配置。');return;}
  if(button.dataset.view){stopTour();standardView=button.dataset.view;if(standardView==='structure'){config.explode=82;progress.explored=true;}renderer.setView(standardView);refresh();return;}
  if(button.dataset.part){stopTour();progress.explored=true;standardView='detail';renderer.focus(button.dataset.part);refresh();return;}
  if(button.id==='save-a'){stopTour();savedA={projectName,notes,configuration:{...config},standardView,createdAt:new Date().toISOString()};persist();refresh(false);announce('方案 A 已保存。现在调整另一套配置，再比较差异。');return;}
  if(button.id==='restore-a'&&savedA){stopTour();config={...savedA.configuration};config.spin=false;projectName=savedA.projectName;notes=savedA.notes;standardView=savedA.standardView;renderer.reset();renderer.setView(standardView);refresh();announce('已恢复方案 A 的配置与标准视角。');return;}
  if(button.id==='reset'){stopTour();config={...defaults};standardView='hero';renderer.reset();refresh();announce('当前配置已恢复默认，已保存的 A 保留。');return;}
  if(button.id==='export-json'){stopTour();download('ARC-工作台配置.json',JSON.stringify(snapshot(),null,2)+'\n','application/json;charset=utf-8');return;}
  if(button.id==='export-md'){stopTour();download('ARC-工作台需求单.md','\uFEFF'+markdown(snapshot()),'text/markdown;charset=utf-8');return;}
  if(button.id==='export-png'){stopTour();exportImage();return;}
  if(button.id==='tour'){
    if(tourActive){stopTour('自动体验已停止，可继续调整当前方案。');return;}
    tourActive=true;button.textContent='停止体验';button.setAttribute('aria-pressed','true');
    const steps=[()=>{applyPreset('desk');announce('01 / 先看工作台中的整体外观，可拖动旋转。');},()=>{applyPreset('photo');standardView='front';renderer.setView('front');refresh();announce('02 / 换配色和表面，比较产品展示效果。');},()=>{config.explode=82;standardView='structure';renderer.setView('structure');progress.explored=true;refresh();announce('03 / 展开结构，理解灯罩、扩散板、支柱和底座。');},()=>{applyPreset('night');announce('04 / 切到夜间使用氛围。保存 A 后可继续比较并导出。');}];
    steps[0]();steps.slice(1).forEach((step,i)=>tourTimers.push(setTimeout(()=>{if(tourActive)step();},(i+1)*5000)));tourTimers.push(setTimeout(()=>stopTour('体验结束：选定配置、保存方案并导出交付文件。'),20000));
  }
});
for(const field of ['finish','room','setting','light','explode','spin'])$('#'+field).addEventListener('input',event=>{stopTour();config[field]=event.target.type==='checkbox'?event.target.checked:event.target.type==='range'?Number(event.target.value):event.target.value;if(field==='explode'&&config.explode>30)progress.explored=true;refresh();});
$('#project-name').addEventListener('input',event=>{projectName=event.target.value.slice(0,80);refresh(false);});
$('#notes').addEventListener('input',event=>{notes=event.target.value.slice(0,800);refresh(false);});
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='demo-visibility')return;if(!event.data.visible){stopTour();config.spin=false;refresh(false);}});
window.addEventListener('pagehide',event=>{stopTour();if(!event.persisted)renderer.dispose();});
window.addEventListener('pageshow',()=>renderer.draw());
refresh();
