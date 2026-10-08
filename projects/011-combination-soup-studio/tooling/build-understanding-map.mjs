import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

// Typeset a factual poster from existing captures. No generated product pixels.
const require=createRequire(process.env.CAPABILITY_NODE_PACKAGE||'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'web/assets');await mkdir(out,{recursive:true});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sources=[];
async function shot(file,label,crop){
  const meta=await sharp(path.join(root,file)).metadata();
  const [x,y,w,h]=crop||[0,0,meta.width,meta.height];
  assert.ok(x>=0&&y>=0&&x+w<=meta.width&&y+h<=meta.height,'valid screenshot region: '+file);
  sources.push({file,label,sourceSize:[meta.width,meta.height],region:[x,y,w,h]});
  return `<figure><div class="capture" style="aspect-ratio:${w}/${h}"><img src="../${esc(file)}" alt="${esc(label)}" style="left:${-x/w*100}%;top:${-y/h*100}%;width:${meta.width/w*100}%;height:${meta.height/h*100}%"></div><figcaption>${esc(label)}</figcaption></figure>`;
}
const section=(n,title,note,html)=>`<section><header class="section-head"><span>${n}</span><div><h2>${title}</h2>${note?`<p>${note}</p>`:''}</div></header>${html}</section>`;
const grid=(cols,html,extra='')=>`<div class="grid g${cols} ${extra}">${html}</div>`;
const tile=(title,text,tag='')=>`<article class="tile">${tag?`<p class="tag">${tag}</p>`:''}<h3>${title}</h3><p>${text}</p></article>`;
const flow=(items,planned=false)=>`<div class="flow ${planned?'planned':''}">${items.map(([a,b],i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><strong>${a}</strong><small>${b}</small></div>`).join('')}</div>`;
const effects=[
  ['汤碗与蒸汽','动态首屏，建立品牌印象','原站视频接入 + 本地蒸汽层','assets/original-effects-overview.png',[80,341,985,693]],
  ['旋转菜单','滚动切换，探索内容与选项','原站照片 + 转盘与菜单卡','assets/qa/local-menu-desktop.png',[80,280,985,760]],
  ['搅汤引擎','搅动、食材与可见反馈','选定 Canvas 绘制核心适配','assets/qa/refined-broth-1440.png'],
  ['投送地图','区域、投送轨迹与过程展示','50 城市 + 模拟投送与弹簧','assets/qa/refined-delivery-1440.png'],
  ['幸运饼干','开裂与纸条展开，揭晓结果','原站贴图 + 开裂与本地记录','assets/qa/refined-fortune-1440.png']
];
let effectCards='';for(const [name,value,tech,file,crop] of effects)effectCards+=`<article class="effect">${await shot(file,'本地接入效果 · 实际页面静态帧',crop)}<h3>${name}</h3><p>${value}</p><small>${tech}</small></article>`;
const scenes=[
  ['品牌活动','茶款、主题、配色与行动目标','形成活动表达与明确需求单','assets/qa/v8/final-brand-1440.png','真实页面 · 生成茶叶主视觉'],
  ['ARC 桌灯选配','旋转、材质、灯光、部件与室内观察','留下当前配置、画面与需求单','assets/qa/v8/product-interior-stage-1440.png','实时三维模型 · 生成室内环境'],
  ['庭院方案评审','面积、日夜、水面、植物与方案比较','留下概念方案、面积与差值记录','assets/qa/v8/garden-water-stage-1440.png','实时 WebGL 场景 · 概念规划']
];
let sceneCards='';for(const [name,behavior,value,file,label] of scenes)sceneCards+=`<article class="scene">${await shot(file,label)}<h3>${name}</h3><p>${behavior}</p><strong class="result">${value}</strong></article>`;
const toiletHero=await shot('assets/qa/navigation/toilet-desktop.png','FORM 主视觉 · 固定生成系列影像',[0,59,1440,820]);
const toiletLive=await shot('assets/qa/v11/showcase-live-1440.png','马桶选型 · 实际三维模型与控件');
const toiletFit=await shot('assets/qa/toilet-fit-matched-v11.png','现场条件核对 · 示例规则结果');
const headphoneHero=await shot('assets/qa/v16/after/headphone-showroom-desktop.png','AURA 主视觉 · 固定生成系列影像',[0,0,1440,820]);
const headphoneLive=await shot('assets/qa/v16/after/headphone-live.png','耳机 V1.7 · 实时三维模型与选配');
const headphoneDetail=await shot('assets/qa/v16/after/headphone-detail.png','真实渲染器的铝壳近景 · 非实物摄影');
const studioShot=await shot('assets/qa/navigation/studio-desktop.png','当前目标工作台 · 产品入口与目标表单');
const studioLive=await shot('assets/qa/v16/after/studio-expanded.png','既有耳机模块在工作台内实时试用');

const blocks=[];
blocks.push(section('01','这个案例的目标是什么？','先分清原站目标、研究范围与我们的产品目标。',grid(3,
  tile('原网站：展示创意服务','用有辨识度的官网表达建站、电商、品牌、视频动效、3D 互动和搜索内容服务；让访客理解能力、比较套餐并提出需求。','官网公开介绍 / 来源快照 2026-10-02')+
  tile('我们的研究：拆解与迁移','研究效果、构图、素材、动效、交互和状态；按模块接入，再用于品牌、选型、查询与评审任务。','011 / 交互展示与业务价值')+
  tile('产品目标：让目标变成交付','用户提出产品、受众、任务与偏好，系统补齐制作要求，内部完成制作、检查、修正与交付。','完整自动闭环 / 待建设')
)));
blocks.push(section('02','效果是什么？五种机制，五种体验','以下是已接入效果的静态帧；动态、滚动与操作需要进入网页体验。',grid(5,effectCards,'effects')+`<div class="strip">分项接入：原站视频 URL、注明来源的照片与贴图、选定绘制核心 → 独立 mount / dispose 模块。原站整页、统计、留言、优惠与咨询业务没有一起接入。</div>`));
blocks.push(section('03','原理是什么？视觉、交互、状态与输出相连','原站五效果并非全部三维。我们的产品与庭院另有 Three.js / WebGL 实现；PNG、JSON、简报与 ZIP 属于我们的业务模块交付能力。',
  flow([['素材与形体','照片 / 视频 / 纹理 / 几何'],['渲染','HTML / CSS / Canvas / WebGL'],['用户操作','滚动 / 指针 / 键盘 / 控件'],['状态更新','选择、相机、参数和结果'],['画面反馈','可见变化与任务反馈'],['记录输出','PNG / JSON / 简报 / ZIP']])+
  grid(3,tile('二维与网页交互','Canvas 绘制、照片剪裁、CSS 变换、粒子与弹簧、滚动驱动；模拟机制服务于表达，不等同真实流体或物流。')+tile('三维与场景','本地 Three.js r160、参数化几何、贴图、灯光、相机与反射。现代浏览器运行；无 WebGL 时保留二维兼容预览。')+tile('内容与业务事实','语义正文、JSON-LD、robots.txt、llms.txt 有助于读取与检索。可读事实和机器人计数不能证明 AI 推荐、获客或收益。'))
));
blocks.push(section('04','如何成为我们的技能？从视觉机制转成任务流程','技能包 interactive-business-experience 保存在子项目中：规定输入、制作、状态、输出和检查，尚未安装为全局技能。',grid(4,
  tile('品牌叙事与选型','内容与选项同步，帮助访客理解品牌和选择方向。<br><b>输入</b>：内容、受众、目标<br><b>输出</b>：活动表达、明确需求')+
  tile('操作式产品解释','让旋转、近看、配色、材质和部件回应操作。<br><b>输入</b>：产品、选项、资料<br><b>输出</b>：配置、画面与说明')+
  tile('区域服务查询','把地区、规则、覆盖状态与下一步放在一起。<br><b>输入</b>：地区、需求、规则<br><b>输出</b>：查询结果与摘要')+
  tile('内容揭晓与反馈','通过展开、揭晓和确认呈现结果。<br><b>输入</b>：内容、任务与条件<br><b>输出</b>：结果记录和下一步')
)));
blocks.push(section('05','实际使用场景：理解、选择、评审','三类业务场景已经实现；以下采用现有版本的实际运行截图。',grid(3,sceneCards)));
blocks.push(section('06','产品化验证：马桶与耳机分别解决什么任务？','固定系列影像表达风格，选配区实时模型承担交互；影像和模型未按实物或 CAD 标定。',grid(2,
  `<article class="product"><div class="product-title"><span>FORM / 马桶</span><h3>选外观，也核对能否适配现场。</h3></div>${grid(2,toiletHero+toiletLive)}<div class="product-bottom">${toiletFit}<div><h4>目录参数驱动产品与结果</h4><p>型号、尺寸、坑距、盖板、配色、电源、净空间和安装需求进入选型；冲突与缺失条件明确记录。</p><b>带走：选型交接单 / JSON / 当前 PNG / 项目包</b><p class="caution">型号与报价为虚构示例，条件核对不等于安装验收；正式使用需厂商图纸与现场复核。</p></div></div></article>`+
  `<article class="product"><div class="product-title"><span>AURA / 耳机 V1.7</span><h3>感受材质，比较并留下选择。</h3></div>${grid(2,headphoneHero+headphoneLive)}<div class="product-bottom">${headphoneDetail}<div><h4>同一个模型贯穿预览与交付</h4><p>配色、表面、旋转、六视角、近景、折叠、部件与环境可操作；实际状态进入配置和独立包。</p><b>带走：配置 / 实际 PNG / 制作简报 / 项目包</b><p class="caution">皮革褶皱、软垫受力、微表面与光学细节仍有差距，当前不称最终摄影级。</p></div></div></article>`
)));
blocks.push(section('07','当前 Foundry：从目标到可操作原型，再带走结果','已实现 2 类任务模板（产品选配、服务资格查询），3 个产品模块（桌灯、马桶、头戴式耳机）。',
  flow([['输入目标','产品、受众、访客任务'],['要求草案','预置 / 本地 / 可选模型'],['调整方案','文案、要求、操作范围'],['既有模块预览','对应概念产品与规则'],['保存选择','本机记录、JSON 恢复'],['独立交付','页面、资产、定义与结果']])+
  grid(3,`<div class="workbench-shots">${studioShot}${studioLive}</div>`+
  tile('三种要求来源，各有边界','<b>预置示例 demo</b>：开发时模型写好的耳机方案，点击没有新生成。<br><b>本地规则 local-rules</b>：有限分类与规则草案，不保证理解任意语言。<br><b>在线模型 model</b>：可选本机服务，仅生成限定 JSON 要求；真实调用未验收。')+
  tile('交付是继续制作的起点','产品可本机保存、导入恢复；PNG 对应画面，JSON 与简报保留选择和要求，ZIP 带页面、必要模块、资产与许可。<br><br>独立包需要静态 HTTP 服务运行。新要求不会自动生成任意形体；真实支付、订单、库存和咨询尚未接入。'))
));
blocks.push(section('08','我们已经理解的核心：用户给目标，系统补齐要求','模型提供理解、创作与判断；技能组织流程，资料、资产与执行工具把目标落实成结果。',grid(4,
  tile('链接是参考入口','需要拆解效果、建立目标、制作资产与代码，并实际运行。读取网页本身不是交付。')+
  tile('标杆必须可观察','把比例、结构、材质、布光、构图和节奏转成具体要求，再对照实际画面。')+
  tile('一次提交可以多轮工作','目标是减少用户反复催优化。内部检查、修正和复核可以多次执行，不能保证单次输出达标。')+
  tile('功能通过不等于质量通过','视觉、事实、操作和交付分别审查；自评分、测试数量或成功导出都不能代替实际证据。'))+
  `<div class="adapt-heading"><h3>产品是随机的，要求如何扩展？</h3><p>通用交付规则 + 当前品类与任务要求 + 视觉参考 + 事实资料 + 资产 / 模块判断 + 实际验收方法</p></div>`+
  grid(3,tile('耳机：结构、材质与选配','重点：头梁与耳罩比例、连接、耳垫、金属反射、触感和观察；配置需与画面和交付一致。')+tile('马桶：尺度与现场条件','重点：型号、尺寸、坑距、排水、电源、净空间和资料来源；示例规则须替换为真实要求。')+tile('陌生产品：识别缺口','重新制定表达、操作和验收要求。当前只形成制作清单与模块缺口，需要新增对应形体、素材和业务。'))
));
blocks.push(section('09','对我们的意义：把看起来好，变成看得懂、用得上、带得走','价值需要用实际用户任务验证，商业收入与转化提升尚未实测。',grid(4,
  tile('对访客','看清区别、探索产品、确认选择。<br><b>验证</b>：理解正确率、选配耗时、错误率。','理解与选择')+
  tile('对客户','表达品牌与服务，收集更明确的需求。<br><b>验证</b>：有效咨询、资料完整度、任务完成率。','品牌与业务沟通')+
  tile('对团队','复用参考、模块、要求与交付记录，减少重复解释和遗漏。<br><b>验证</b>：返工、耗时、成本。','可复用制作资产')+
  tile('对产品','把单个案例沉淀为可继续制作的流程和能力。<br><b>验证</b>：跨品类成功率、质量稳定性。','扩展与持续交付'))
));
blocks.push(section('10','质量与交付：从人工制作经验，到系统内部闭环','下方是产品建设目标；当前应用尚未自动完成视觉审查、代码修正与再次验收。',
  `<div class="goal-banner">用户一次提出目标 → 系统内部完成制作、审查、修正与交付</div>`+
  flow([['理解目标','用户、任务与资料缺口'],['建立要求','标杆、事实与完成条件'],['完成制作','模型 + 模块 + 资产'],['实际运行','页面、操作与文件证据'],['模型审查','具体缺陷与资产需求'],['修正复核','同视角 / 同操作比较'],['带证据交付','版本、结果与剩余差距']],true)+
  grid(3,tile('用户','提供产品、受众、任务、偏好和资料，判断最终是否符合业务目标。')+tile('模型','补齐要求、选择实现、创作、审视实际结果、定位问题并修正。')+tile('执行系统','运行、截图、操作、测试、保存版本、导出以及记录时间与成本。'))+
  `<div class="quality-row"><b>需要保留的证据</b><span>产品事实与来源</span><span>同视角前后截图</span><span>关键操作与状态</span><span>隔离运行的项目包</span><span>设备、成本与未通过项</span></div>`+
  `<div class="strip caution">修正设次数、时间与成本上限。重要缺口必须明确保留；素材、实物资料或 CAD 不足时识别资产需求。制作完成 ≠ 验收通过 ≠ 商业价值已证明。</div>`
));
blocks.push(section('11','现状、采用条件与后续方向','已有局部能力和真实交付证据；下一步优先证明质量闭环，而非只增加演示数量。',grid(2,
  tile('当前已实现','5 效果 / 4 技能 / 3 场景；目标、方案编辑与已有产品预览；本机状态与 PNG、JSON、简报、独立 ZIP；首页、工作台、马桶和耳机相互关联。','已有实现与记录')+
  tile('当前待建设 / 验证','任意产品的页面、资产与模块生成；自动参考采集、视觉审查与代码修正；真实在线调用、真机性能、完整辅助技术检查，以及商业服务。','规划与明确缺口'))+
  `<div class="roadmap"><span>下一步</span><b>① 固定耳机质量基线</b><i>→</i><b>② 验证一个真实缺陷的内部修正闭环</b><i>→</i><b>③ 马桶、灯具与陌生产品验证</b><i>→</i><b>④ 项目历史、素材、预算与多人平台</b></div>`+
  `<div class="research"><h3>与已有 18 项研究的关系</h3><div>${grid(3,
    tile('工作方法 · 002 / 003','Huashu 的制作规则；Harness 的任务、恢复与验证方法。')+
    tile('材质与空间 · 005 / 007 / 017 / 018','毛绒资产、庭院、WebGPU 流体；大气风景与骑行镜头。')+
    tile('动效与反馈 · 008 / 009','文字动效、可玩入口、角色层与业务反馈。')+
    tile('传播与故事 · 006 / 015 / 016','宣传片路线、多案例产品表达、手绘角色与音画体验。')+
    tile('当前验证与平台 · 011 / 014','Foundry 产品验证；账号、任务与商业底座的研究规划。')+
    tile('相邻方向 · 001 / 004 / 010 / 012 / 013','诊断、视听、游戏、科学讲解、识别与检索。'))}</div><p>这些是独立研究资产与局部实现，尚未整合为自动生产平台。018 是独立视觉原型，原游戏实现未核实；马模型限非商业研究。</p></div>`+
  `<div class="adoption"><b>正式采用前</b><p>按原素材与代码许可核对授权；补齐厂商真实资料、素材与业务规则；实际检查目标设备、交付包和用户任务。原站未确认开源许可证，原型与示例资料不代表商用就绪。</p></div>`
));

const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>011 全景理解图 · 内容源</title><style>
*{box-sizing:border-box}html,body{margin:0;background:#ecebdf;color:#243e35;font-family:"Microsoft YaHei","Segoe UI",sans-serif}body{width:2800px}#poster{width:2800px;padding:78px 90px 50px;background:#f5f2e9;font-size:25px;line-height:1.8}p{margin:0}h1,h2,h3,h4{margin:0;font-weight:650}h1{font-size:89px;line-height:1.15;letter-spacing:-3px}h2{font-size:42px;line-height:1.45;letter-spacing:-.7px}h3{font-size:29px;line-height:1.55;margin-bottom:12px}h4{font-size:27px;line-height:1.5;margin-bottom:12px}b,strong{font-weight:650}small{display:block;font-size:21px;line-height:1.7;color:#62745f}.poster-top{display:flex;justify-content:space-between;gap:50px;align-items:flex-start;border-top:10px solid #2a493a;padding-top:30px}.overline{font:20px/1.5 monospace;letter-spacing:2px;color:#62765d;margin-bottom:20px}.poster-subtitle{font-size:41px;line-height:1.5;margin-top:19px;max-width:2050px}.top-note{text-align:right;font-size:21px;line-height:1.8;white-space:nowrap;color:#67705d;padding-top:5px}.big-conclusion{margin-top:32px;padding:24px 32px;background:#e6edda;border-left:6px solid #8aa061;font-size:30px;line-height:1.6}.count-row{display:flex;gap:0;margin-top:29px}.count-row>div{flex:1;border-left:1px solid #ccd5c0;padding-left:27px;display:flex;gap:15px;align-items:baseline}.count-row>div:first-child{padding-left:0;border:0}.count-row b{font-size:42px;font-weight:500}.count-row span{font-size:23px;color:#5b6f54}section{margin-top:40px;padding-top:34px;border-top:1px solid #cdd5c3}.section-head{display:flex;gap:25px;align-items:flex-start;margin-bottom:24px}.section-head>span{font:25px/1.6 monospace;color:#7c9267;padding-top:8px;min-width:49px}.section-head p{font-size:23px;color:#62735b;margin-top:9px}.grid{display:grid;gap:22px;align-items:stretch}.g2{grid-template-columns:repeat(2,minmax(0,1fr))}.g3{grid-template-columns:repeat(3,minmax(0,1fr))}.g4{grid-template-columns:repeat(4,minmax(0,1fr))}.g5{grid-template-columns:repeat(5,minmax(0,1fr))}.tile{padding:25px 28px;background:#fcfbf5;border:1px solid #d7ddcd;min-width:0}.tile p{font-size:25px;color:#4d634e;line-height:1.8}.tile .tag{font-size:20px;color:#758865;margin-bottom:11px}.tile b{color:#2e4c3b}.effect,.scene{background:#fffdf6;border:1px solid #d3daca;min-width:0;padding:14px}.effect figure{margin:0 0 19px}.effect h3{font-size:28px;margin:0 10px 9px}.effect>p{font-size:24px;margin:0 10px 10px}.effect>small{font-size:20px;margin:0 10px 5px}.effect .capture{height:auto}.effect .capture img{object-fit:fill}.effect:nth-child(1) .capture,.effect:nth-child(2) .capture{height:auto;aspect-ratio:985/693!important;margin-top:0}.effect:nth-child(2) .capture{aspect-ratio:985/760!important}.effect figcaption{font-size:17px}.effect{display:flex;flex-direction:column}.effect figure{min-height:358px;display:flex;flex-direction:column;justify-content:center}.scene{padding:16px}.scene figure{margin-bottom:18px}.scene .capture{height:auto}.scene h3{margin:0 10px 12px;font-size:32px}.scene>p{margin:0 10px 12px;font-size:26px}.result{display:block;margin:0 10px 10px;padding-top:11px;border-top:1px solid #dce2d1;color:#3e6040;font-size:24px}.strip{font-size:24px;color:#4e654d;background:#eaf0df;padding:18px 27px;margin-top:22px;line-height:1.75}.flow{display:flex;gap:22px;margin-bottom:24px}.flow>div{flex:1;min-width:0;background:#eaf0df;padding:20px 23px;position:relative;border-top:3px solid #8b9c70}.flow>div+div:before{content:'→';position:absolute;left:-23px;top:37px;color:#758264;font-size:24px}.flow>div>span{font:18px monospace;color:#81956d;margin-bottom:7px;display:block}.flow strong{font-size:27px;display:block;margin-bottom:5px}.flow small{font-size:22px}.capture{width:100%;overflow:hidden;position:relative;background:#ece6d9;border:1px solid #dddccf}.capture img{position:absolute;display:block;max-width:none}.capture img{image-rendering:auto}figure{margin:0;min-width:0}figcaption{font-size:19px;line-height:1.7;color:#65745b;margin:10px 0 0}.product{border:1px solid #d4dbca;background:#fffdf5;padding:24px}.product-title{margin-bottom:19px}.product-title>span{font:19px/1.5 monospace;color:#738662;letter-spacing:1px}.product-title h3{font-size:35px;margin:10px 0 0}.product .grid{gap:17px;align-items:center}.product .product-bottom{display:grid;grid-template-columns:1fr 1.25fr;gap:23px;border-top:1px solid #dbe1d0;margin-top:21px;padding-top:22px;align-items:center}.product-bottom p{font-size:23px;line-height:1.85;color:#546b4f}.product-bottom b{font-size:22px;color:#385a38;display:block;margin:9px 0}.caution{color:#8a643f!important}.product-bottom .caution{font-size:20px;margin-top:12px}.workbench-shots{display:grid;grid-template-columns:1fr 1fr;gap:15px;align-items:center}.workbench-shots figcaption{font-size:19px}.adapt-heading{margin:25px 0 21px;padding:22px 28px;border-left:5px solid #8aa268;background:#eaf0de}.adapt-heading h3{font-size:31px;margin-bottom:8px}.adapt-heading p{font-size:26px;color:#57704f}.goal-banner{padding:25px 32px;background:#2d4a3b;color:#f5f2df;font-size:35px;margin-bottom:24px;font-weight:500}.planned>div{background:#f2eadc;border-top-color:#ad8a51}.planned>div>span,.planned small{color:#8b704e}.planned strong{font-size:26px;color:#745934}.quality-row{display:flex;gap:15px;flex-wrap:wrap;align-items:center;font-size:23px;margin:24px 0}.quality-row b{margin-right:13px}.quality-row span{padding:8px 15px;background:#e6edd9}.roadmap{display:flex;align-items:center;gap:22px;padding:25px 29px;background:#e5edd8;margin-top:24px;font-size:25px}.roadmap>span{font-size:20px;color:#71865d;white-space:nowrap}.roadmap b{font-weight:600}.roadmap i{font-style:normal;color:#81986a}.research{margin-top:27px}.research>h3{font-size:30px;margin-bottom:15px}.research .grid{gap:12px}.research .tile{padding:17px 22px}.research .tile h3{font-size:25px;margin-bottom:6px}.research .tile p{font-size:22px}.research>p{font-size:22px;color:#76866a;margin-top:12px}.adoption{display:grid;grid-template-columns:180px 1fr;gap:20px;font-size:22px;padding-top:22px;margin-top:24px;border-top:1px solid #d6ddca;color:#6a795e}.poster-footer{margin-top:35px;border-top:2px solid #9eaf86;padding-top:20px;font-size:19px;color:#75836b;display:grid;grid-template-columns:1fr auto;gap:25px}.poster-footer p{line-height:1.8}.poster-footer .source{font-family:monospace;font-size:18px;text-align:right}
</style></head><body><main id="poster">
<div class="poster-top"><div><p class="overline">RESEARCH 011 / THE COMPLETE UNDERSTANDING</p><h1>Combination Soup Studio</h1><p class="poster-subtitle">从交互官网参考，到我们的产品体验与交付方法</p></div><div class="top-note">全景理解 · 2026.10.03<br>原站：官网与视觉案例<br>公开源码库 / 开源许可未确认</div></div>
<div class="big-conclusion">用视觉吸引关注，用操作帮助理解，用结果承接选择；把这些经验沉淀为可复用、可验证、可继续制作的交付能力。</div>
<div class="count-row">${[['5','效果模块'],['4','技能方向'],['3','业务场景'],['2','Foundry 任务模板'],['3','产品运行模块']].map(([n,t])=>`<div><b>${n}</b><span>${t}</span></div>`).join('')}</div>
${blocks.join('\n')}
<footer class="poster-footer"><div><p>画面来自本项目已有实际运行截图。原站效果为静态帧；系列主视觉是固定生成影像；实时模型截图不等于实物摄影。</p><p>依据：README、understanding-summary、effect-correction、耳机 V1.7 / 马桶展示记录。来源快照与运行版本分别保留；本图不重新证明全部功能或商业收益。</p></div><div class="source">combinationsoupstudio.com.au<br>localhost:8951 / projects/011-combination-soup-studio<br>制作：2026-10-03 · 可放大查看</div></footer>
</main></body></html>`;
const source=path.join(root,'notes/understanding-map-source.html');await writeFile(source,html);
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:2800,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(pathToFileURL(source).href);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>img.decode()));});
  const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.querySelector('#poster').getBoundingClientRect().height,sections:document.querySelectorAll('section').length,images:document.images.length,brokenImages:[...document.images].filter(i=>!i.naturalWidth).length,overflow:[...document.querySelectorAll('.tile,.effect,.product,.flow>div')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.innerText.slice(0,80))}));
  assert.equal(layout.width,2800);assert.equal(layout.sections,11);assert.equal(layout.brokenImages,0);assert.equal(layout.overflow.length,0);assert.equal(errors.length,0);
  const output=path.join(out,'understanding-map.png');await page.locator('#poster').screenshot({path:output});
  const meta=await sharp(output).metadata();
  const viewerPath=path.join(root,'web/understanding-map.html');
  const viewerHtml=(await readFile(viewerPath,'utf8'))
    .replace(/width="2800" height="\d+"/,`width="${meta.width}" height="${meta.height}"`)
    .replace('及17项研究关系','及18项研究关系')
    .replace('font:12px/1.5 inherit','font-family:inherit;font-size:12px;line-height:1.5');
  await writeFile(viewerPath,viewerHtml);
  await sharp(output).resize({width:1400}).png().toFile(path.join(root,'notes/understanding-map-preview.png'));
  await mkdir(path.join(root,'assets/qa/map'),{recursive:true});
  for(const [name,selector] of [['top','.poster-top'],['effects','section:nth-of-type(2)'],['products','section:nth-of-type(6)'],['quality','section:nth-of-type(10)'],['boundaries','section:nth-of-type(11)']]){
    await page.locator(selector).screenshot({path:path.join(root,'assets/qa/map/'+name+'.png')});
  }
  await writeFile(path.join(root,'notes/understanding-map-record.json'),JSON.stringify({completed:true,date:'2026-10-03',kind:'Typeset factual infographic with existing browser captures',source:'notes/understanding-map-source.html',output:'web/assets/understanding-map.png',size:[meta.width,meta.height],bytes:(await readFile(output)).length,layout,sources,errors},null,2));
  console.log(JSON.stringify({completed:true,size:[meta.width,meta.height],images:sources.length,sections:layout.sections,errors}));
}finally{await browser.close();}
