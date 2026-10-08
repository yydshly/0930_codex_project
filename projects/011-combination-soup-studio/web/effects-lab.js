import * as hero from './effects/hero-atmosphere.js';
import * as menu from './effects/rotating-menu.js';
import * as broth from './effects/broth-engine.js?v=20261002-2';
import * as delivery from './effects/delivery-map.js?v=20261002-2';
import * as fortune from './effects/fortune-cookie.js?v=20261002-2';
const modules={hero,menu,broth,delivery,fortune};
const SOURCE='https://combinationsoupstudio.com.au/';
const details={
hero:{title:'汤碗与蒸汽',kind:'原站视频直连 + 粒子机制重构',anchor:'',principle:'原站预渲染汤碗视频提供主体；Canvas 蒸汽从碗口生成、上升、扩散，并响应指针风力。',tech:'video / Canvas 2D / 指针事件',use:'新品页、餐饮品牌、活动首屏。视频呈现产品，粒子带出温度和氛围。',project:'002 · Huashu Design / 品牌视觉',href:'../002-huashu-design/',file:'effects/hero-atmosphere.js',scene:'brand',tip:'移动指针拨动蒸汽；视频可单独暂停。'},
menu:{title:'旋转服务菜单',kind:'原站图片与转盘 / 拆分适配',anchor:'#menu',principle:'把滚动进度归一化到 0—1，映射为 0—240° 旋转；三个区间同步套餐内容和当前状态。',tech:'CSS transform / scroll / 状态同步',use:'服务套餐、产品系列、展厅导览。每次聚焦一个选项，帮助客户理解差异。',project:'011 · 本项目 / 服务包装',href:'#scenes',file:'effects/rotating-menu.js',scene:'brand',tip:'在整个演示区域滚动；也可以点击菜单卡片的 1 / 2 / 3。'},
broth:{title:'交互搅汤引擎',kind:'原站 Canvas 点云 / 本地控制器',anchor:'#stir',principle:'半球采样成点云，旋转后做透视投影；汤面随倾斜变化，越过碗口时生成落下的粒子。绕圈轨迹累加搅动圈数。',tech:'Canvas 2D / 数学投影 / 指针捕获',use:'材料混合、产品原理、参数演示。让用户操作后看到状态变化；物理值需按真实模型校准。',project:'005 · Plush Lab / 参数互动',href:'../005-plush-lab/',file:'effects/broth-engine.js',scene:'product',tip:'按住绕圈搅动；拖动倾斜滑杆观察溢出。'},
delivery:{title:'外卖投送地图',kind:'原站 Canvas 点阵 / 本地交互',anchor:'#delivery',principle:'经纬度投影成二维坐标，用点在多边形内判断生成点阵。投送按时间插值，叠加弧线、降落伞和落点波纹。',tech:'Canvas 2D / 地理投影 / 时间插值',use:'服务范围、项目分布、物流故事。可以接真实项目坐标；当前计数只记录动画投送。',project:'011 · 本项目 / 地域叙事',href:'#capabilities',file:'effects/delivery-map.js',scene:'brand',tip:'点地图选最近城市；城市按钮支持键盘操作。'},
fortune:{title:'幸运饼干互动',kind:'原站照片贴图 / CSS 开裂',anchor:'#order',principle:'饼干两半切换开裂状态，碎屑沿不同方向飞散；纸条展开后逐字显示。提示洗牌取出，本机记录打开次数。',tech:'原站贴图 / CSS animation / localStorage',use:'品牌提示、活动任务、产品教育。把一次点击变成一个小发现，再引导用户了解产品。',project:'004 · Rhythm Drop / 活动互动',href:'../004-rhythm-drop/',file:'effects/fortune-cookie.js',scene:'brand',tip:'点击饼干揭晓提示；本机记录可以重置。'}
};
const host=document.querySelector('#effect-stage'),tabs=[...document.querySelectorAll('button[data-effect]')],motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const lab=document.querySelector('#original-effects'),viewToggle=document.querySelector('#effect-view-toggle'),motionToggle=document.querySelector('[data-effects-motion]');
let reduced=motionPreference.matches,manualMotion=false,manualFocus=null;
let current=null,instance=null;
function focusPreview(focus){lab.classList.toggle('effect-focus',focus);viewToggle.textContent=focus?'查看原理与接入':'放大效果';viewToggle.setAttribute('aria-expanded',String(!focus));}
function motionUI(){document.documentElement.classList.toggle('effects-motion-enabled',!reduced);document.documentElement.classList.toggle('effects-motion-off',reduced);motionToggle.textContent=reduced?'开启动效':'暂停动态';motionToggle.setAttribute('aria-pressed',String(!reduced));motionToggle.title=reduced?'当前使用静态显示；点击后开启实时动效':'Canvas 和贴图动效正在实时运行';}
function select(key,updateURL=true){
  if(!modules[key]||key===current)return;
  instance?.dispose();host.replaceChildren();current=key;
  const d=details[key];
  focusPreview(manualFocus??['broth','delivery','fortune'].includes(key));
  tabs.forEach(b=>{const active=b.dataset.effect===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  host.setAttribute('aria-labelledby','effect-tab-'+key);host.dataset.effect=key;
  for(const [id,value] of Object.entries({'effect-name':d.title,'effect-kind':d.kind,'effect-principle':d.principle,'effect-tech':d.tech,'effect-use':d.use,'effect-file':d.file,'effect-tip':d.tip}))document.getElementById(id).textContent=value;
  const source=document.querySelector('#effect-source');source.href=SOURCE+d.anchor;
  const project=document.querySelector('#effect-project');project.textContent=d.project;project.href=d.href;
  document.querySelector('#effect-application').dataset.targetSkill=({hero:'story',menu:'story',broth:'explain',delivery:'territory',fortune:'reveal'})[key];
  const telemetry=document.querySelector('#effect-state');telemetry.textContent='';
  instance=modules[key].mount(host,{reduced,onState(state){telemetry.replaceChildren(...Object.entries(state).map(([k,v])=>{const row=document.createElement('div'),label=document.createElement('span'),value=document.createElement('b');label.textContent=k;value.textContent=v;row.append(label,value);return row;}));}});
  if(updateURL){const url=new URL(location.href);url.searchParams.set('effect',key);history.replaceState(null,'',url);}
}
tabs.forEach((b,i)=>{b.addEventListener('click',()=>select(b.dataset.effect));b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%tabs.length;else if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=tabs.length-1;else return;e.preventDefault();select(tabs[n].dataset.effect);tabs[n].focus();});});
document.querySelector('#effect-application').addEventListener('click',e=>{document.querySelector('#skill-tab-'+e.currentTarget.dataset.targetSkill).click();document.querySelector('#skills').scrollIntoView({behavior:reduced?'instant':'smooth'});});
const requested=new URL(location.href).searchParams.get('effect');select(modules[requested]?requested:'hero',false);
viewToggle.addEventListener('click',()=>{manualFocus=!lab.classList.contains('effect-focus');focusPreview(manualFocus);});
motionToggle.addEventListener('click',()=>{manualMotion=true;reduced=!reduced;motionUI();const key=current;current=null;select(key,false);});
motionPreference.addEventListener('change',e=>{if(manualMotion)return;reduced=e.matches;motionUI();const key=current;current=null;select(key,false);});
motionUI();
window.addEventListener('pagehide',()=>{instance?.dispose();instance=null;});
window.addEventListener('pageshow',e=>{if(e.persisted){const key=current;current=null;select(key,false);}});
