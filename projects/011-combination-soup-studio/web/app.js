import {gardenAreas} from './renderers.js';
import {createGardenRenderer} from './garden-renderer.js?v=20261002-8';
import {createProductRenderer} from './product-renderer.js?v=20261002-8';
import {sceneDecision} from './scene-decision.js?v=20261002-8';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const initial={brand:{name:'山野茶社',headline:'把春天，泡进今天。',goal:'预约试饮',tea:'spring',theme:'forest',motion:!reduced},product:{color:'#356873',finish:'matte',explode:0,light:70,spin:!reduced,room:'studio',setting:'interior',reflections:true,view:'hero'},garden:{width:12,depth:8,pond:18,green:32,priority:'water',time:'day'}};
const teaOptions={spring:{name:'春芽绿茶',flavour:'清爽'},oolong:{name:'焙香乌龙',flavour:'烘焙香'},black:{name:'蜜香红茶',flavour:'柔和'}};
const state=structuredClone(initial);let scene='brand',savedGarden=null,viewingSaved=false,gardenRenderer,gardenView='perspective',gardenMotion=!reduced,gardenStateTimer=0;
const meta={
  brand:{label:'品牌活动 / 山野茶社',title:'一场新品试饮活动',problem:'小店有新产品，却缺少让客户快速看懂、记住并预约的页面。',preview:'活动页 / 即时预览',delivery:'原创概念摄影、可编辑品牌活动页、茶款选择与主题、行动入口、配置记录和需求单。',value:'快速理解活动并知道下一步；减少反复询问，便于活动传播。',evidence:'本项目运行原创生成摄影、内容编辑、茶款选择、主题切换与图文动效；更完整的视觉与素材制作经验见 002 / Huashu Design。',boundary:'活动时间、地点、产品照片与预约服务。当前示例没有发送预约，未测量转化效果。',acceptance:'核对文案、活动时间与地址；验证手机布局和行动入口；接入真实预约后单独测试送达。'},
  product:{label:'产品解释 / ARC 模块桌灯',title:'把产品差异展示出来',problem:'客户无法从几张照片理解结构和配色；沟通时经常混淆所选方案。',preview:'产品配置 / 实时 3D 展示',delivery:'可旋转三维产品概念、室内全景与简洁棚拍、日光与夜景、配色与材质和环境反射、零件拆解、配置记录和 PNG 画面。',value:'客户在室内与棚拍场景下检查配色、表面和结构，需求单保留选择，讨论更具体。',evidence:'本项目运行原创三维几何、WebGL 材质与灯光、软阴影、可见全景背景、环境反射、零件拆解与配置输出；005 / Plush Lab 提供进一步参数互动研究。',boundary:'真实产品照片、尺寸或标准模型。当前为原创产品概念，材质与光照用于视觉展示，没有接入商品库存、支付或生产数据。',acceptance:'旋转、缩放、视角与展开可控制；室内与棚拍、反射开关、配色、材质和光线对应实际画面；需求单准确记录选择；量产尺寸和材质需另行核对。'},
  garden:{label:'空间方案 / 庭院评审',title:'先看清空间的取舍',problem:'讨论“水景大一点、活动区多一点”时，缺少可比较的具体方案。',preview:'庭院方案 / 实时 3D 空间',delivery:'可操作三维庭院、水景与植物近景、总览平面、尺度与面积比例、日光与夜色、方案 A 对比、需求单和 PNG。',value:'把水景、绿化和活动空间的取舍放到一张图上，便于评审和记录。',evidence:'本项目运行原创参数化三维庭院、下凹水池与波纹、木石材质、枝干叶簇与方案比较；选择性复用 007 / Koi Scene Lab 的自有生成贴图。',boundary:'现场测量、参考照片或扫描模型，以及施工与养护要求。当前为概念布局，没有预算、施工精度或造价承诺。',acceptance:'总面积和分区计算一致；方案 A 比较不覆盖当前配置；实景复现需用已知长度校准。'}
};
function activeGarden(){return viewingSaved&&savedGarden?savedGarden:state.garden;}
function decision(){return sceneDecision(scene,scene==='garden'?activeGarden():state[scene],{saved:savedGarden,current:state.garden,viewingSaved});}
function facts(){
  const s=scene==='garden'?activeGarden():state[scene];
  return{研究对象:'Combination Soup Studio',场景:meta[scene].title,性质:'本项目原创场景原型，虚构业务示例',当前参数:{...s},选择结果:decision(),可交付:meta[scene].delivery,客户价值:meta[scene].value,采用条件:meta[scene].boundary,验收方法:meta[scene].acceptance,...(scene==='product'?{观察状态:productRenderer?.getViewState()}:{}),...(scene==='garden'?{观察状态:gardenRenderer?.getViewState(),面积计算_m2:gardenAreas(s),当前查看:viewingSaved?'已保存的方案 A':'当前方案'}:{})};
}
function updateFacts(){const snapshot=facts(),d=snapshot.选择结果;$('#decision-title').textContent=d.title;$('#decision-summary').textContent=d.summary;$('#decision-note').textContent=d.note;$('#decision-metrics').replaceChildren(...d.metrics.map(([label,value])=>{const el=document.createElement('div'),dt=document.createElement('span'),dd=document.createElement('strong');dt.textContent=label;dd.textContent=value;el.append(dt,dd);return el;}));$('#brief-open').textContent=scene==='product'?'带走这套配置':scene==='garden'?(viewingSaved?'带走方案 A':'带走当前方案'):'带走活动需求';$('#facts-preview').textContent=JSON.stringify(snapshot,null,2);window.dispatchEvent(new CustomEvent('business-scene-change',{detail:snapshot}));}
function renderBrand(){
  const b=state.brand,name=b.name.trim()||'品牌名称',headline=b.headline.trim()||'填写你的活动标题';
  $('#preview-brand').textContent=name;$('#preview-headline').textContent=headline.replace(/([，,])/,'$1\n');$('#brand-cta').textContent=b.goal;
  $('.tin-logo').textContent=[...name].slice(0,2).join('\n');$('.tin-logo').style.whiteSpace='pre-line';
  const tea=teaOptions[b.tea];$('.tin-type').textContent=tea.name+'\n虚构风味 · '+tea.flavour;$('.tin-type').style.whiteSpace='pre-line';$('.brand-footer>span').textContent='当前试饮选择：'+tea.name+' · '+tea.flavour;
  $('#brand-preview').className=`brand-preview ${b.theme}${b.motion?' motion-on':''}`;$('#brand-preview').style.setProperty('--headline-scale',headline.length>22?'.70':headline.length>16?'.85':'1');$('#brand-preview').style.setProperty('--brand-name-scale',name.length>12?'.65':'1');
  updateFacts();
}
function renderGarden(){
  const s=activeGarden(),a=gardenAreas(s);gardenRenderer?.draw();gardenUI(s);
  $('#width-out').textContent=state.garden.width+' m';$('#depth-out').textContent=state.garden.depth+' m';$('#pond-out').textContent=state.garden.pond+'%';$('#green-out').textContent=state.garden.green+'%';
  $('#area-total').textContent=a.total.toFixed(1)+' m²';$('#area-landscape').textContent=a.pond.toFixed(1)+' / '+a.green.toFixed(1)+' m²';$('#area-other').textContent=a.deck.toFixed(1)+' / '+a.other.toFixed(1)+' m²';
  $('#garden-view-label').textContent=(viewingSaved?'方案 A':'当前方案')+' / '+(gardenRenderer?.rendererType==='canvas'?'兼容平面图':({plan:'总览平面',water:'水景近景',plant:'植物近景'})[gardenView]||'三维庭院');
  $('#garden-compare').textContent=viewingSaved?'返回当前方案':'比较方案 A';$('#garden-compare').setAttribute('aria-pressed',String(viewingSaved));
  updateFacts();
}
let productRenderer;
const productParts={shade:{number:'01',title:'圆润灯罩',description:'连续曲面的灯罩外壳，配色与涂层随选择变化。结构展开时可观察内侧与装配关系。'},diffuser:{number:'02',title:'光源与扩散板',description:'扩散板与光源模组分层展示，亮度变化对应发光状态。当前为视觉原理示意。'},stem:{number:'03',title:'金属支柱',description:'连接灯罩和底座的支柱，包含装配接缝与细节。结构解析可单独聚焦这一部分。'},base:{number:'04',title:'稳固底座',description:'低重心的底座与防滑底部，支撑完整形态。概念展示不代表实测稳定性参数。'}};
let selectedPart=null,lastProductAnchors=null,productStateTimer=0;
function productAvailability(renderer,zoom){
  const compatible=renderer==='canvas';
  $('#product-renderer-label').dataset.renderer=renderer;
  $('#product-renderer-label').textContent=compatible?'当前使用兼容画面 · 保留选配与导出':'实时 3D · 本地模型与材质';
  document.querySelector('.product-help p').innerHTML=compatible?'选择配色、灯光与结构查看效果<br>当前设备使用二维兼容预览':'拖动旋转 · 滚轮或双指缩放<br>聚焦画布后，方向键改变视角';
  document.querySelector('.product-hint').textContent=compatible?'兼容二维预览':'拖动旋转 · 滚轮缩放';
  $('#product-spin').disabled=compatible;
  $('#product-setting').disabled=compatible;$('#product-reflections').disabled=compatible;
  $$('[data-product-setting]').forEach(b=>b.disabled=compatible);
  if(compatible){state.product.spin=false;state.product.setting='studio';state.product.reflections=false;$('#product-spin').checked=false;$('#product-setting').value='studio';$('#product-reflections').checked=false;}
  $$('[data-product-zoom]').forEach(b=>b.disabled=compatible||(typeof zoom==='number'&&(b.dataset.productZoom==='in'?zoom>=1.65:zoom<=.7)));
  $('[data-product-view=front]').disabled=compatible;
  $('#product-canvas').setAttribute('aria-label',compatible?'ARC 模块桌灯二维兼容预览，可调整配色、灯光与结构':'ARC 模块桌灯三维预览，可拖动旋转、滚轮缩放或用方向键调整视角');
}
function productUI(){
  const p=state.product;$('#product-preview').dataset.room=p.room;$('#product-preview').dataset.setting=p.setting;
  $('#product-setting').value=p.setting;$('#product-reflections').checked=p.reflections;
  $$('[data-product-setting]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.productSetting===p.setting)));
  $('#product-config-label').textContent=({ '#356873':'海湾蓝','#bb633f':'日落橙','#4d6b58':'松石绿'})[p.color]+' · '+(p.finish==='gloss'?'亮面涂层':'细腻哑光');
  $('#product-state-label').textContent='灯光 '+p.light+'% · '+(p.explode?'结构展开 '+p.explode+'%':'结构完整');
  $$('[data-product-room]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.productRoom===p.room)));
  $$('[data-product-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.productView===p.view)));
  $$('[data-product-light]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.productLight)===p.light)));
  positionProductAnchors(lastProductAnchors);
}
function positionProductAnchors(anchors){
  if(!anchors)return;const box=$('#product-canvas').getBoundingClientRect();
  $$('[data-product-part]').forEach(b=>{const a=anchors[b.dataset.productPart],show=state.product.view==='structure'||state.product.explode>18;b.hidden=!show||!a?.visible;if(b.hidden)return;
    const right=['shade','stem'].includes(b.dataset.productPart),bw=b.offsetWidth||110,x=Math.max(8,Math.min(box.width-bw-8,a.x+(right?30:-bw-30))),y=Math.max(155,Math.min(box.height-110,a.y));b.style.left=x+'px';b.style.top=y+'px';b.setAttribute('aria-pressed',String(b.dataset.productPart===selectedPart));
  });
}
$('#product-canvas').addEventListener('product-anchors',e=>{lastProductAnchors=e.detail;positionProductAnchors(e.detail);});
$('#product-canvas').addEventListener('product-render-state',e=>{const d=e.detail;$('#product-model-loading').hidden=true;productAvailability(d.renderer||productRenderer?.rendererType,d.zoom);$('#product-setting-status').textContent=d.renderer==='canvas'?'二维兼容画面':d.setting==='interior'?(d.environmentReady?'室内全景环境':d.environmentFailed?'全景不可用 · 棚拍展示':'全景加载中 · 暂用棚拍'):'简洁棚拍背景';if(d.view&&d.view!==state.product.view){state.product.view=d.view;productUI();if(scene==='product')updateFacts();}clearTimeout(productStateTimer);productStateTimer=setTimeout(()=>{if(scene==='product')updateFacts();},220);});
productRenderer=createProductRenderer($('#product-canvas'),()=>state.product);
$('#product-model-loading').hidden=true;productAvailability(productRenderer.rendererType);

function renderProduct(){
  if(productRenderer.rendererType==='canvas'){state.product.spin=false;$('#product-spin').checked=false;}
  $('#explode-out').textContent=state.product.explode+'%';$('#light-out').textContent=state.product.light+'%';productRenderer.draw();productUI();updateFacts();
}
function gardenUI(s=activeGarden()){
  $('#garden-preview').dataset.time=s.time;$('#garden-preview').dataset.view=gardenView;
  $('.garden-editorial h3').innerHTML=gardenView==='water'?'水面与石材。':gardenView==='plant'?'叶片、枝干与光线。':'在日常里，<br>留一片自然。';
  $('#garden-view-label').textContent=(viewingSaved?'方案 A':'当前方案')+' / '+(gardenRenderer?.rendererType==='canvas'?'兼容平面图':({plan:'总览平面',water:'水景近景',plant:'植物近景'})[gardenView]||'三维庭院');
  $('#garden-dimension-label').textContent=s.width+' × '+s.depth+' m';
  $$('[data-garden-time]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gardenTime===s.time)));
  $$('[data-garden-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gardenView===gardenView)));
}
$('#garden-canvas').addEventListener('garden-render-state',e=>{const d=e.detail;gardenView=d.view;const compatible=d.renderer==='canvas';$('#garden-renderer-label').dataset.renderer=d.renderer;$('#garden-renderer-label').textContent=compatible?'二维兼容预览':gardenView==='plan'?'滚轮缩放 · 总览平面':'拖动旋转 · 滚轮缩放';$$('[data-garden-view]').filter(b=>b.dataset.gardenView!=='plan').forEach(b=>b.disabled=compatible);$('#garden-view-reset').disabled=compatible;$('#garden-motion').disabled=compatible;$('#garden-canvas').setAttribute('aria-label',compatible?'根据当前尺度和比例绘制的二维兼容庭院平面图':'根据当前尺度和比例生成的三维庭院概念，可拖动旋转和滚轮缩放');if(compatible){gardenMotion=false;$('#garden-motion').checked=false;}gardenUI();clearTimeout(gardenStateTimer);gardenStateTimer=setTimeout(()=>{if(scene==='garden')updateFacts();},220);});
gardenRenderer=createGardenRenderer($('#garden-canvas'),()=>({...activeGarden(),motion:gardenMotion}));
$('#garden-motion').checked=gardenMotion;$('#garden-motion').addEventListener('change',e=>{gardenMotion=e.target.checked;renderGarden();});
$$('[data-garden-view]').forEach(b=>b.addEventListener('click',()=>{gardenView=b.dataset.gardenView;gardenRenderer.setView(gardenView);renderGarden();}));
$('#garden-view-reset').addEventListener('click',()=>{gardenView='perspective';gardenRenderer.reset();renderGarden();});
$$('[data-garden-time]').forEach(b=>b.addEventListener('click',()=>{state.garden.time=b.dataset.gardenTime;$('#garden-time').value=state.garden.time;viewingSaved=false;$('#garden-compare-note').textContent=savedGarden?'当前光线已更新；可查看保存的方案 A。':'先记下一个方案，再调整参数比较。';renderGarden();}));
$('#brand-preview').addEventListener('pointermove',e=>{if(!state.brand.motion||reduced)return;const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--photo-x',((e.clientX-r.left)/r.width-.5)*-8+'px');e.currentTarget.style.setProperty('--photo-y',((e.clientY-r.top)/r.height-.5)*-6+'px');});
$('#brand-preview').addEventListener('pointerleave',e=>{e.currentTarget.style.setProperty('--photo-x','0px');e.currentTarget.style.setProperty('--photo-y','0px');});
function selectScene(next,updateURL=true){
  if(scene==='product'&&next!=='product')updateFacts();scene=next;const m=meta[scene];if(scene!=='product')$('#product-part-panel').hidden=true;$('#scene-workspace').dataset.scene=scene;
  $$('.scene-tabs button').forEach(b=>{const selected=b.dataset.scene===scene;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
  $('#scene-workspace').setAttribute('aria-labelledby','tab-'+scene);
  for(const key of ['brand','product','garden']){$('#'+key+'-fields').hidden=key!==scene;$('#'+key+'-preview').hidden=key!==scene;}
  for(const [id,text] of Object.entries({'scene-label':m.label,'scene-title':m.title,'scene-problem':m.problem,'preview-label':m.preview,'scene-delivery':m.delivery,'scene-value':m.value,'scene-evidence':m.evidence,'scene-boundary':m.boundary}))$('#'+id).textContent=text;
  $('#image-download').hidden=scene==='brand';
  $('#scene-related').href=({brand:'../002-huashu-design/',product:'../005-plush-lab/',garden:'../007-koi-scene-lab/'})[scene];
  if(scene==='brand')renderBrand();else if(scene==='product')renderProduct();else renderGarden();
  if(updateURL){const url=new URL(location.href);url.searchParams.set('scene',scene);if(['#product-preview','#brand-preview','#garden-preview','#scene-workspace'].includes(url.hash))url.hash='scenes';history.replaceState(null,'',url);}
}
$$('.scene-tabs button').forEach((button,i)=>{
  button.addEventListener('click',()=>selectScene(button.dataset.scene));
  button.addEventListener('keydown',e=>{const buttons=$$('.scene-tabs button');let n;
    if(e.key==='ArrowRight')n=(i+1)%buttons.length;else if(e.key==='ArrowLeft')n=(i+buttons.length-1)%buttons.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=buttons.length-1;else return;
    e.preventDefault();selectScene(buttons[n].dataset.scene);buttons[n].focus();
  });
});
for(const [id,key] of [['brand-name','name'],['brand-headline','headline'],['brand-goal','goal'],['brand-tea','tea']])$('#'+id).addEventListener('input',e=>{state.brand[key]=e.target.value;renderBrand();});
$$('input[name="brand-theme"]').forEach(el=>el.addEventListener('change',()=>{state.brand.theme=el.value;renderBrand();}));
$('#brand-motion').checked=state.brand.motion;$('#brand-motion').addEventListener('change',e=>{state.brand.motion=e.target.checked;renderBrand();});
$$('input[name="product-color"]').forEach(el=>el.addEventListener('change',()=>{state.product.color=el.value;renderProduct();}));
for(const [id,key] of [['product-explode','explode'],['product-light','light']])$('#'+id).addEventListener('input',e=>{state.product[key]=Number(e.target.value);renderProduct();});
$('#product-setting').addEventListener('change',e=>{state.product.setting=e.target.value;renderProduct();});
$('#product-reflections').addEventListener('change',e=>{state.product.reflections=e.target.checked;renderProduct();});
$$('[data-product-setting]').forEach(b=>b.addEventListener('click',()=>{state.product.setting=b.dataset.productSetting;renderProduct();}));
$('#product-finish').addEventListener('change',e=>{state.product.finish=e.target.value;renderProduct();});
$('#product-spin').checked=state.product.spin;$('#product-spin').addEventListener('change',e=>{state.product.spin=e.target.checked;renderProduct();});
$('#product-reset').addEventListener('click',()=>{state.product=structuredClone(initial.product);$('#product-explode').value=0;$('#product-light').value=70;$('#product-finish').value='matte';$('#product-spin').checked=state.product.spin;$$('input[name="product-color"]').forEach(el=>el.checked=el.value===state.product.color);selectedPart=null;$('#product-part-panel').hidden=true;productRenderer.reset();renderProduct();});
$$('[data-product-room]').forEach(b=>b.addEventListener('click',()=>{state.product.room=b.dataset.productRoom;renderProduct();}));
$$('[data-product-view]').forEach(b=>b.addEventListener('click',()=>{const view=b.dataset.productView;state.product.view=view;selectedPart=null;$('#product-part-panel').hidden=true;state.product.spin=false;$('#product-spin').checked=false;if(view==='structure'){state.product.explode=78;}else if(state.product.explode){state.product.explode=0;}$('#product-explode').value=state.product.explode;productRenderer.setView(view);renderProduct();}));
$$('[data-product-zoom]').forEach(b=>b.addEventListener('click',()=>{$('#product-canvas').dispatchEvent(new WheelEvent('wheel',{deltaY:b.dataset.productZoom==='in'?-160:160,cancelable:true}));}));
$$('[data-product-light]').forEach(b=>b.addEventListener('click',()=>{state.product.light=Number(b.dataset.productLight);$('#product-light').value=state.product.light;renderProduct();}));
$$('[data-product-part]').forEach(b=>b.addEventListener('click',()=>{selectedPart=b.dataset.productPart;state.product.spin=false;$('#product-spin').checked=false;const p=productParts[selectedPart];$('#product-part-number').textContent='PART / '+p.number;$('#product-part-title').textContent=p.title;$('#product-part-description').textContent=p.description;$('#product-part-panel').hidden=false;productRenderer.focus(selectedPart);renderProduct();}));
$('#product-part-close').addEventListener('click',()=>{selectedPart=null;$('#product-part-panel').hidden=true;productUI();});
window.addEventListener('pagehide',()=>{clearTimeout(productStateTimer);clearTimeout(gardenStateTimer);productRenderer.dispose?.();gardenRenderer?.dispose();});
window.addEventListener('pageshow',e=>{if(e.persisted){productRenderer=createProductRenderer($('#product-canvas'),()=>state.product);gardenRenderer=createGardenRenderer($('#garden-canvas'),()=>({...activeGarden(),motion:gardenMotion}));gardenRenderer.setView(gardenView);if(scene==='garden')renderGarden();else renderProduct();}});
for(const [id,key] of [['garden-width','width'],['garden-depth','depth'],['garden-pond','pond'],['garden-green','green'],['garden-priority','priority'],['garden-time','time']]){
  $('#'+id).addEventListener('input',e=>{
    state.garden[key]=e.target.type==='range'?Number(e.target.value):e.target.value;viewingSaved=false;
    const maxGreen=Math.min(45,95-state.garden.pond-(state.garden.priority==='gather'?30:18));
    $('#garden-green').max=maxGreen;
    let message=savedGarden?'当前参数已更新；可随时查看保存的方案 A。':'先记下一个方案，再调整参数比较。';
    if(state.garden.green>maxGreen){state.garden.green=maxGreen;$('#garden-green').value=maxGreen;message=`绿化已调整为 ${maxGreen}%，为通行等其他空间预留至少 5%。`;}
    $('#garden-compare-note').textContent=message;renderGarden();
  });
}
$('#garden-save').addEventListener('click',()=>{savedGarden={...state.garden};viewingSaved=false;$('#garden-compare').disabled=false;$('#garden-compare-note').textContent=`方案 A 已保存：${savedGarden.width} × ${savedGarden.depth} m，水景 ${savedGarden.pond}%，绿化 ${savedGarden.green}%。`;renderGarden();});
$('#garden-compare').addEventListener('click',()=>{if(!savedGarden)return;viewingSaved=!viewingSaved;$('#garden-compare-note').textContent=viewingSaved?'正在查看方案 A；控制区保留你的当前参数，返回后继续编辑。':'已返回当前方案，编辑参数完整保留。';renderGarden();});
addEventListener('resize',()=>{if(scene==='garden')renderGarden();});
function download(content,name,type){
  const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function makeBrief(){
  const f=facts(),parameters=Object.entries(f.当前参数).map(([k,v])=>`- ${parameterName(k)}：${parameterValue(k,v)}`).join('\n');
  let area='';if(scene==='garden'){const a=gardenAreas(activeGarden());area=`\n\n## 空间分配\n\n总面积 ${a.total.toFixed(2)} m²；水景 ${a.pond.toFixed(2)} m²；绿化 ${a.green.toFixed(2)} m²；活动平台 ${a.deck.toFixed(2)} m²；其他空间 ${a.other.toFixed(2)} m²。\n查看对象：${viewingSaved?'方案 A':'当前方案'}。`;}
  const d=f.选择结果,comparison=d.comparison?`\n\n## 与方案 A 的比较\n\n${d.note}\n\n方案 A：${d.comparison.方案A.参数.width} × ${d.comparison.方案A.参数.depth} m；水景 ${d.comparison.方案A.参数.pond}%；绿化 ${d.comparison.方案A.参数.green}%；${parameterValue('priority',d.comparison.方案A.参数.priority)}。\n当前方案：${d.comparison.当前方案.参数.width} × ${d.comparison.当前方案.参数.depth} m；水景 ${d.comparison.当前方案.参数.pond}%；绿化 ${d.comparison.当前方案.参数.green}%；${parameterValue('priority',d.comparison.当前方案.参数.priority)}。`:'';
  return`# ${meta[scene].title} · 场景需求单\n\n研究项目：011 / Combination Soup Studio\n研究快照：2026-10-02\n性质：原创场景原型，虚构业务示例。仅本地生成，未发送预约或订单。\n\n## 客户问题\n\n${meta[scene].problem}\n\n## 当前选择\n\n${parameters}${area}\n\n## 选择结果\n\n${d.summary}\n\n${d.metrics.map(([k,v])=>`- ${k}：${v}`).join('\n')}${comparison}\n\n## 我们能交付什么\n\n${meta[scene].delivery}\n\n## 对客户的价值\n\n${meta[scene].value}\n\n## 采用前需要补齐\n\n${meta[scene].boundary}\n\n## 如何验收\n\n${meta[scene].acceptance}\n\n## 商业效果如何验证\n\n记录真实用户能否完成任务、有效咨询与评审往返；本项目没有实测转化率或收入。AI 爬虫访问不等于引用或推荐。\n\n## 研究来源\n\nhttps://combinationsoupstudio.com.au/\nhttps://developers.google.com/search/docs/appearance/ai-features?hl=zh-CN\n`;
}
function parameterName(k){return({name:'品牌名称',headline:'活动标题',goal:'活动目标',tea:'试饮茶款',theme:'品牌配色',motion:'标题动效',color:'灯体颜色',finish:'表面效果',explode:'结构展开比例',light:'灯光亮度',spin:'自动旋转',room:'展示环境',setting:'展示场景',reflections:'环境反射',view:'观察视角',width:'庭院宽度',depth:'庭院深度',pond:'水景占比',green:'绿化占比',priority:'方案重点',time:'查看时段'})[k]||k;}
function parameterValue(k,v){if(typeof v==='boolean')return v?'开启':'关闭';if(['width','depth'].includes(k))return v+' m';if(['pond','green','explode','light'].includes(k))return v+'%';if(k==='tea')return teaOptions[v]?.name||String(v);if(k==='room')return v==='night'?'夜景':'日光';if(k==='setting')return v==='interior'?'室内全景':'简洁棚拍';return({forest:'山林绿',cobalt:'电光蓝',orange:'日光橙',matte:'细腻哑光',gloss:'亮面涂层',studio:'棚拍',night:'夜景',hero:'产品视角',front:'正面',detail:'细节',structure:'结构解析',custom:'自定义视角',water:'围绕水景',gather:'更多聚会空间',day:'白天',night:'夜间'})[v]||String(v);}
function openBrief(){$('#brief-text').textContent=makeBrief();$('#brief-status').textContent='';$('#brief-dialog').showModal();}
$('#brief-open').addEventListener('click',openBrief);$('#brand-cta').addEventListener('click',openBrief);$('#brief-close').addEventListener('click',()=>$('#brief-dialog').close());
$('#brief-dialog').addEventListener('click',e=>{if(e.target===$('#brief-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#brief-download').addEventListener('click',()=>{download($('#brief-text').textContent,`capability-${scene}-brief.md`,'text/markdown;charset=utf-8');$('#brief-status').textContent='已生成下载文件；请在浏览器下载列表查看。';});
$('#brief-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#brief-text').textContent);$('#brief-status').textContent='需求单已复制。';}catch{const range=document.createRange();range.selectNodeContents($('#brief-text'));getSelection().removeAllRanges();getSelection().addRange(range);$('#brief-status').textContent='复制不可用，已选中文本，可手动复制。';}});
$('#facts-download').addEventListener('click',()=>download(JSON.stringify(facts(),null,2),`capability-${scene}-facts.json`,'application/json;charset=utf-8'));
$('#image-download').addEventListener('click',()=>{const canvas=$('#'+scene+'-canvas');if(scene==='garden')renderGarden();else renderProduct();canvas.toBlob(blob=>{if(blob)download(blob,`capability-${scene}-scene.png`,'image/png');},'image/png');});
$('#preview-headline').style.whiteSpace='pre-line';const requestedScene=new URL(location.href).searchParams.get('scene');selectScene(meta[requestedScene]?requestedScene:'brand',false);if(meta[requestedScene]&&['#product-preview','#garden-preview','#brand-preview','#scene-workspace','#scenes'].includes(location.hash))requestAnimationFrame(()=>(location.hash==='#scenes'?$('#scenes'):$('#scene-workspace')).scrollIntoView({behavior:'instant',block:'start'}));
