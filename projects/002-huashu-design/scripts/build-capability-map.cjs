// A single vector infographic; all labels remain selectable in the SVG.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'web/images');fs.mkdirSync(out,{recursive:true});
const W=2400,H=3700,C={paper:'#f5f7ef',ink:'#173b30',muted:'#506b56',line:'#ccdac5',green:'#1d6246',soft:'#e7eedc',blue:'#285b94',pale:'#edf3fa',amber:'#8d6122',sand:'#f8f0df',white:'#ffffff'};
const svg=[];const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function rect(x,y,w,h,fill=C.white,r=12,stroke='none'){svg.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`)}
function line(x1,y1,x2,y2,color=C.line,width=2){svg.push(`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}"/>`)}
function text(str,x,y,size=28,fill=C.ink,weight=400,width=2300){svg.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" data-width="${width}">${esc(str)}</text>`)}
function block(lines,x,y,{size=27,fill=C.muted,leading=39,weight=400,width=500}={}){lines.forEach((s,i)=>text(s,x,y+i*leading,size,fill,weight,width));}
function arrow(x1,y1,x2,y2){svg.push(`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${C.green}" stroke-width="3" marker-end="url(#arrow)"/>`)}
function section(n,title,subtitle,y){text(n,70,y,27,C.green,700,70);text(title,138,y,39,C.ink,700,1400);if(subtitle)text(subtitle,138,y+43,25,C.muted,400,2130);}
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="map-title map-desc"><title id="map-title">Huashu Design 能力、原理、场景与扩展全景图</title><desc id="map-desc">基于固定提交 0830494。归纳十六项能力、六类实测交付、实现原理、六类未来场景、七层扩展与验证边界。实测与文档核对分开标记。</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.green}"/></marker></defs><g font-family="Microsoft YaHei,Segoe UI,sans-serif">`);
rect(0,0,W,H,C.paper,0);rect(0,0,W,238,C.ink,0);
text('HUASHU DESIGN',70,70,28,'#c5e5ac',600,1000);
text('一张图，看清能力、原理与使用方向',70,145,62,'#f6faee',700,2230);
text('Skill 作为入口，规范与参考指导 Agent，组件与脚本支撑视觉成果的制作、交付和检查。',74,200,28,'#c6d8c2',400,2220);

section('01','它怎样工作','Skill 指导步骤；模型完成理解与代码生成；浏览器和外部工具执行。库本身没有训练新模型。',302);
const flow=[['真实资料','需求 / 受众 / 数据','品牌素材 / 交付要求'],['Skill + 参考','任务路由 / 设计规范','风格配方 / 评审方法'],['宿主 Agent','理解材料 / 提出方向','编写与修改页面代码'],['浏览器画布','HTML / CSS / JavaScript','界面状态 / 排版 / 时间'],['组件与导出工具','设备框 / 幻灯片 / 时间轴','打印 / 对象转换 / 编码']];
flow.forEach((v,i)=>{let x=70+i*463;rect(x,381,410,154,i===2?C.green:C.white,12,C.line);text(v[0],x+24,426,30,i===2?'#fff':C.ink,700,360);block(v.slice(1),x+24,468,{size:24,leading:35,fill:i===2?'#dbe9d2':C.muted,width:364});if(i<4)arrow(x+419,458,x+453,458)});
line(2140,548,2140,585,C.green);line(2140,585,1100,585,C.green);arrow(1100,585,1100,548);text('截图 / 文件 / 媒体检查 → 修改 → 重新生成；流程规则不等于每次都能自动遵守',1200,625,24,C.muted,400,1110);
text('交付目标先确定：交互、可编辑排版、确定性动画有不同实现约束。',72,595,27,C.green,600,1060);

section('02','能力全景：4 组、16 项','编号是本研究的归纳。● 本次相关组件或产物实测   ○ 源码 / 文档核对，未跑完整流程   ↗ 需要额外扩展',710);
const columns=[
 {title:'A / 设计准备与迭代',subtitle:'确定内容、方向和可调参数',fill:C.soft,items:[
  ['01','多方向设计探索','○ 流程核对',['同一材料生成不同视觉初稿','选定方向后继续深化','原理：任务规范 + 模型执行']],
  ['02','品牌资产与事实','○ 规范核对',['整理 Logo、色彩、字体和截图','保存品牌规范与事实来源','原理：素材协议 + 上下文复用']],
  ['03','风格、组件与案例','○ 资料 / 样例',['60 种风格配方、24 份预制样例','提供起手布局和展示组件','原理：按任务加载参考与代码']],
  ['04','Tweaks 实时调参','○ 文档 / 教学演示',['调整预设颜色、字号、密度','浏览器可保存参数偏好','原理：前端状态 + localStorage']]
 ]},
 {title:'B / 视觉内容制作',subtitle:'把材料组织成可见、可操作的内容',fill:C.soft,items:[
  ['05','交互原型','● 场景 / 手机框',['多屏界面、点击流程与状态','本次业务前端由任务编写','原理：HTML/React + 设备外框']],
  ['06','浏览器幻灯片','● deck-stage',['多页讲解、键盘翻页与缩放','本次已有 6 页方案演讲稿','原理：页面内容 + 演讲外壳']],
  ['07','信息图与数据可视化','○ 文档 / 样例',['图表、关系、概念与数据排版','可交付网页、静态图或 PDF','原理：HTML/CSS/SVG 或绘图库']],
  ['08','时间轴动画','● Stage / Sprite',['按镜头组织进入、移动与转场','播放、暂停、任意时间定位','原理：画面 = 时间函数 render(t)']]
 ]},
 {title:'C / 导出、声音与媒体',subtitle:'按交付要求转换、配音和混音',fill:C.pale,items:[
  ['09','PDF 定稿','● 六页文件',['浏览器打印并合并页面','主体文字通常可提取','原理：Playwright + pdf-lib']],
  ['10','可编辑 PPTX','● 路线 A；B 未测',['A：DOM 测量后转原生对象','B：渲染元素接企业模板','原理：pptxgenjs / python-pptx']],
  ['11','视频与其他格式','● MP4；其他未测',['MP4 / GIF；外部后端透明输出','本次逐帧渲染 600 帧成片','原理：seek 截图 / 录制 + 编码']],
  ['12','配音、字幕与长解说','○ 未调用云服务',['解说稿分段配音、测量时长','以音频时长安排画面与字幕','原理：TTS + cue + 统一时间轴']],
  ['13','背景音乐与动作音效','○ 脚本核对',['加入配乐、点击及转场音效','混合旁白、配乐与音效','原理：FFmpeg 裁切 / 音量 / 混音']]
 ]},
 {title:'D / 评审与质量检查',subtitle:'发现问题，给出修改依据',fill:C.sand,items:[
  ['14','设计评审','○ 方法核对',['判断概念与多维执行质量','输出保留项、问题和修改建议','原理：评审准则 + 模型判断']],
  ['15','HTML 与媒体验证','○ 上游脚本核对',['截图、运行错误与媒体参数','检查尺寸、时长、黑帧与音轨','原理：浏览器自动化 + 媒体工具']],
  ['16','AI 看片评审','○ 未调用云服务',['视频模型辅助看叙事与异常','报告仍需对照片段人工复核','原理：压缩 / 分段 + 外部模型']]
 ]}
];
columns.forEach((col,i)=>{const x=70+i*572;rect(x,792,544,1025,C.white,12,C.line);rect(x,792,544,109,col.fill,12);text(col.title,x+23,836,31,C.ink,700,500);text(col.subtitle,x+23,876,23,C.muted,400,500);col.items.forEach((r,j)=>{const yy=929+j*174;text(r[0]+'  '+r[1],x+23,yy,28,C.ink,700,500);text(r[2],x+23,yy+35,22,r[2].startsWith('●')?C.green:C.amber,600,500);block(r[3],x+23,yy+70,{size:23,leading:30,width:500});if(j<col.items.length-1)line(x+23,yy+144,x+521,yy+144)});
 if(i===0){rect(x+20,1636,504,152,col.fill,7);block(['规则需要模型执行，效果会波动。','多方向探索增加调用与修改成本。','预设参数调整不等于自动改回源码。'],x+38,1680,{size:23,leading:36,width:468});}
 if(i===1){rect(x+20,1636,504,152,col.fill,7);block(['软件界面可以成为可用的原型；','信息图、演讲内容可成为最终物料。','数据与统计正确性仍要单独核对。'],x+38,1680,{size:23,leading:36,width:468});}
 if(i===3){rect(x+20,1487,504,302,col.fill,7);text('检查成功 ≠ 全面质量保证',x+38,1534,26,C.ink,700,466);block(['模型评分不等于客观审美。','脚本退出成功不代表内容完整。','本次另做了独立文件与交互检查，','不能据此声称上游检查器已实测。','云服务需配置、授权和费用评估。','3D / shader 属外部后端适配。'],x+38,1580,{size:23,leading:34,width:466});}
});

section('03','六类交付，来自不同路线','六种是本轮成果，不是六个独立模型，也不是全部输出范围；交互与可编辑能力不会自动随转换保留。',1890);
const routes=[['原型路线','页面 + 事件 + 状态','① 桌面 / 手机交互原型','关键流程真实可点；业务后端另建'],['汇报路线','受约束的幻灯片页面','② HTML 演讲稿 → ③ PDF / ④ PPTX','PDF 固定版式；PPT 文字可改，截图仍是图片'],['动画路线','统一时间轴 + 镜头逻辑','⑤ 时间轴动画 → ⑥ MP4 成片','动画可定位；成片便于播放，不保留交互']];
routes.forEach((r,i)=>{const y=1968+i*86;rect(70,y,2260,74,i===1?C.pale:C.soft,8);text(r[0],91,y+46,27,C.ink,700,220);text(r[1],325,y+46,25,C.muted,400,425);arrow(730,y+36,780,y+36);text(r[2],812,y+46,28,C.ink,600,710);text(r[3],1550,y+46,23,C.muted,400,744);});

section('04','后期使用场景：从你的工作出发','以下为建议用途，不代表这些业务系统或全部制作路线已经实现。',2308);
const scenes=[['开源项目研究与选型','仓库资料 → 能力图 / 原型 / 汇报','用于讲解能力、比较用途、记录采用理由'],['产品需求与方案评审','需求、截图 → 点击原型 / 流程视频','先讨论操作与信息结构，再进入工程开发'],['业务汇报与数据说明','真实数据 → 信息图 / PPT / PDF','用于阶段汇报、复盘和可编辑说明材料'],['课程、培训与知识讲解','讲稿 → 演讲稿 / 解说与字幕视频','配音、字幕路线需额外配置和实际验证'],['产品发布与品牌传播','品牌素材 → 介绍页面 / 视觉图 / 短片','按渠道调整版式、镜头、音乐与字幕'],['团队重复内容生产','模板、资料、验收 → 同类成果复用','批量队列、协作、版本与权限需另外建设']];
scenes.forEach((r,i)=>{const x=70+(i%3)*765,y=2383+Math.floor(i/3)*151;rect(x,y,730,129,C.white,9,C.line);text(r[0],x+23,y+39,28,C.ink,700,680);text(r[1],x+23,y+78,25,C.green,500,680);text(r[2],x+23,y+111,23,C.muted,400,680);});

section('05','可扩展方向：先沉淀复用资产，再接工具和系统','扩展是继续开发与验证的方向，不应当作仓库已提供的完整平台功能。',2750);
const extensions=[['内容与任务','研究报告 / 周报 / 课件','改任务路由、章节模板与 references'],['品牌与资产','Logo / 色板 / 字体 / 素材','建立 brand-spec 与事实来源约束'],['页面与镜头组件','封面 / 图表 / 设备框 / 动画','在 assets 中复用并测试组合行为'],['真实数据接入','CSV / JSON / 业务 API','增加数据适配、单位与空值校验'],['导出与服务适配','企业母版 / 新格式 / TTS 后端','约定对象、时间轴、返回值与降级'],['验收与质量基准','文本 / 点击 / 图像 / 视频','加入失败样例、回归检查与人工复核']];
extensions.forEach((r,i)=>{const x=70+(i%3)*765,y=2825+Math.floor(i/3)*130;rect(x,y,730,112,C.soft,8);text('↗ '+r[0],x+21,y+35,28,C.ink,700,687);text(r[1],x+21,y+69,24,C.green,500,687);text(r[2],x+21,y+98,22,C.muted,400,687);});
rect(70,3095,2260,74,C.ink,9);text('第 7 层：业务平台另建',94,3141,28,'#eff7e4',700,520);text('账户 / 权限 / 数据库 / 素材存储 / 任务队列 / 费用管理 / 协作与版本 / 部署运维',641,3141,26,'#d2e3c8',400,1645);

section('06','我们现在能确认什么','只对固定版本与具体任务下结论，区分已有成果、未验证路线和未来工程。',3245);
const evidence=[['已实测的组件与产物',C.soft,['IosFrame、deck-stage、Stage/Sprite；','经明确适配的 PDF / PPTX / MP4 导出。','6 页汇报，39 个 PPT 文字对象，20 秒 MP4。','研选业务页面由本次任务编写。']],['尚未实际运行的路线',C.sand,['完整 Skill 自动设计 / 评审闭环；','企业模板、TTS、字幕、混音、AI 看片；','HyperFrames、GIF、透明视频、3D/shader。','存在源码或文档，不等于本次已跑通。']],['采用时重点判断',C.pale,['材料是否真实，内容是否准确；','是否便于修改，目标软件是否正常；','返工、接入和维护成本是否值得；','本轮未证明普遍的质量 / 效率提升。']]];
evidence.forEach((r,i)=>{const x=70+i*765;rect(x,3320,730,225,r[1],10);text(r[0],x+23,3365,29,C.ink,700,684);block(r[2],x+23,3407,{size:24,leading:36,width:684});});
line(70,3577,2330,3577);text('价值：把设计经验、内容结构和交付步骤积累下来；是否长期采用，要由真实任务与验收结果决定。',70,3622,28,C.ink,600,2260);
text('来源：alchaincyf/huashu-design · 固定提交 0830494 · 本项目研究与实测记录 · 整理 2026-09-30',70,3667,22,C.muted,400,1900);text('放大阅读 / SVG 可选取文字',1960,3667,21,C.muted,400,370);
svg.push('</g></svg>');fs.writeFileSync(path.join(out,'huashu-capability-map.svg'),svg.join('\n'),'utf8');console.log('Created 2400×3700 vector capability map.');
