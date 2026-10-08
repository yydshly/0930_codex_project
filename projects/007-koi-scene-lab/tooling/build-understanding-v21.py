"""Build the webpage explanation and one source-backed infographic from shared copy."""
from pathlib import Path
import html
import re
import shutil

root = Path(__file__).resolve().parents[1]
esc = html.escape
modules = [
 ('程序化庭园', '桥亭、池岸、植物与灯笼组成可探索空间。', 'Three.js 场景图；曲线、剖面、噪声与重复构件生成几何，Canvas / 数据数组生成纹理。', '空间拆解、参数组件与自然变化。'),
 ('响应式水波', '点击、雨滴和游鱼留下扰动，风浪持续变化。', '256² 半浮点 GPU 高度 / 速度场；双缓冲差分、阻尼和四组 Gerstner 波。', '为不同水景接入环境反馈。'),
 ('倒影与水下视觉', '水面反射庭园，水下颜色随深度变化；可选潜水。', '镜像相机、折射颜色 / 深度；Fresnel、Beer–Lambert、GGX；Snell 窗口与近似焦散。', '建立水的层次、透明感与光学表现。'),
 ('锦鲤形体与动作', '18 类程序花纹、20 条鱼名册；摆尾、弯曲、张嘴和呼吸。', '连续截面、嘴腔和鳍；GPU 行进波与转弯曲率，解析导数修正法线；身体 / 鳍 / 眼实例化。', '共享模型上的外观变化与状态驱动动作。'),
 ('鱼群与追食', '群体游动、避岸、聚集，投喂后转向食物。', 'Boids 分离 / 对齐 / 聚集；SDF 岸线前视与避障；有界转向、推进 / 滑行和食物目标。', '可解释、可调节的群体行为。'),
 ('手部与互动', '第一人称伸手投喂、抚摸，食物落水并被吃掉。', 'SDF → Surface Nets 手网格 → 自动蒙皮；预设骨骼姿态、状态机、颗粒重力与碰撞修正。', '串联操作、角色反应和环境结果。'),
 ('生态与天气', '青蛙跳跃、乌龟入水、蜻蜓飞停；春景、梅雨、秋景、冬景。', '动物形体与行为状态机；天气参数插值、雨雪粒子、植被变化、湿润 / 积雪 / 结冰着色。', '同一空间随天气、时间与事件变化。'),
 ('镜头、渲染与声音', '自由探索、跟随镜头、光影氛围与合成环境声。', 'HDR、阴影、SSAO、Bloom、景深与 ACES；实例化 / 画质调节；Web Audio 滤波、混响和声像。', '浏览器空间展示与沉浸式讲解。'),
]
values = [
 ('保存老家记忆', '把照片、熟悉物件与家人的补充整理成可探索场景，再发展为纪念摆件。'),
 ('预演自己的改造', '调整布局、院墙、地面和水池，比较原貌与新方案，便于和家人沟通。'),
 ('构造个人化体验', '在自己的空间中加入鱼、水、动物和故事；动物活动需按新场地适配。'),
 ('形成可交付作品', '以同一份确认数据生成数字展示与制造模型，向家人或客户交付可检查的结果。'),
]
directions = [
 ('照片到参数化老家', '一张照片先做近似初版，补已知尺寸和少量标注；多视角素材可提供更多几何依据。需新增照片识别、建筑组件库和用户修正。'),
 ('数字老家与纪念摆件', '网页确认外观与布局，再制作微缩模型。需封闭实体、加厚细节、分件、切片、上色和实物打样。'),
 ('可拼装套件与真实改造', '套件需接头、公差、零件表与装配验证；真实庭院需实测、施工图、材料预算、结构与排水设计及专业校核。'),
 ('差异化与一致性交付', '差异化可验证在乡村建筑组件、家人参与修正和数字 / 实物对应。照片、确认方案、实物分别验收；需要用户与样品验证。'),
]
statuses = [
 ('原作体验', '已实现', '固定 MIT 快照在本地运行，保留原作效果与代码。'),
 ('按图构造与解释', '已实现', '独立庭院、部分比例参数、9 类说明、A/B、投喂、惊散与动物。'),
 ('真实模型接入', '已实现', '单文件 GLB 展示、两点长度校准、水域标记及鱼水绑定。'),
 ('任意照片自动转参数', '扩展设想', '尚无自动识别或通用建筑编辑器；当前按图人工拆解建模。'),
 ('图片 / 方案 / 实物验收', '扩展设想', '已有参考图叠加；完整照片匹配、制造输出和实体打样未接入。'),
]

web_rows = ''.join(f'<tr><th scope="row">{esc(a)}<small>{esc(b)}</small></th><td data-label="底层技术">{esc(c)}</td><td data-label="可扩展能力">{esc(d)}</td></tr>' for a,b,c,d in modules)
value_cards = ''.join(f'<article><span class="understanding-number">0{i}</span><h3>{esc(a)}</h3><p>{esc(b)}</p></article>' for i,(a,b) in enumerate(values,1))
direction_cards = ''.join(f'<article><span class="understanding-state planned">扩展设想</span><h3>{esc(a)}</h3><p>{esc(b)}</p></article>' for a,b in directions)
status_rows = ''.join(f'<tr><th scope="row">{esc(a)}</th><td data-label="状态"><span class="understanding-state {"ready" if b=="已实现" else "planned"}">{esc(b)}</span></td><td data-label="具体范围">{esc(c)}</td></tr>' for a,b,c in statuses)
section = f'''<!-- PROJECT_UNDERSTANDING_V21_START -->
<section class="project-understanding" aria-labelledby="understanding-title">
 <div class="understanding-heading"><div><p class="eyebrow">ORIGINAL → PRINCIPLES → PERSONAL VALUE</p><h2 id="understanding-title">从锦鲤庭院，理解自己的数字空间</h2><p>先看原作效果，再理解计算方法；当前能力与扩展设想分别说明。</p></div><a class="button subtle" href="assets/library-value-map-v21.png" download>下载一图总览</a></div>
 <div class="understanding-showcase"><figure><img src="assets/original-experience-v21.png" width="960" height="640" alt="原作固定版本的桥亭、池塘、植被与锦鲤运行截图"><figcaption>原作运行截图 · 固定版本；完整效果可在“原作体验”中操作。</figcaption></figure><div><span class="understanding-state ready">原作效果</span><h3>一个能响应操作的实时庭园</h3><p>水波、倒影、鱼群、手部、生态动物、天气、镜头和声音共同组成体验。庭园由程序几何与纹理构造，JavaScript 更新行为，GPU 绘制形变与光影；运行时不调用语言模型。</p><p>原作提供春景、梅雨、秋景、冬景四种环境预设，以及默认关闭的可选潜水；18 类花纹对应20条原始鱼名册。</p><div class="understanding-actions"><button class="button" data-go="original">体验原作效果</button><button class="button subtle" data-go="scene">观察当前扩展</button></div><p class="understanding-caption">来源：Sourany Phomhome · MIT · commit 18213ec5…；运行副本仅将两条依赖地址替换为本地文件。</p></div></div>
 <div class="understanding-compute" aria-label="原作计算链"><span>交互 / 天气输入</span><b aria-hidden="true">→</b><span>CPU 行为与状态</span><b aria-hidden="true">→</b><span>GPU 几何 / 波场</span><b aria-hidden="true">→</b><span>反射折射 / HDR</span><b aria-hidden="true">→</b><span>画面与环境声</span></div>
 <h3 class="understanding-subtitle">原作效果与底层实现</h3><div class="understanding-table-wrap"><table class="understanding-table"><caption class="sr-only">固定版原作的八类效果、底层技术与扩展能力</caption><thead><tr><th scope="col">原作里看到什么</th><th scope="col">底层技术</th><th scope="col">可扩展能力</th></tr></thead><tbody>{web_rows}</tbody></table></div>
 <p class="understanding-boundary"><strong>原作与当前庭院有区别：</strong>原作波场256²、鱼用实例化、手由SDF生成；当前庭院波场128²、鱼独立绘制，手用WebXR派生26骨骼网格与指腹CCD。当前轻触表现为警觉、惊散和恢复；原作抚摸会引导温顺鱼配合。</p>
 <div class="understanding-heading"><div><p class="eyebrow">VALUE FOR YOU</p><h2>对你的意义：把熟悉的地方变成可使用的空间</h2><p>以下是用户价值与后续方向；照片重建和实物交付本轮暂不实施。</p></div></div><div class="understanding-value-grid">{value_cards}</div>
 <div class="understanding-model-layers"><h3>模型为什么可以扩展</h3><p>形体、材质、动作、行为、环境约束与互动入口可以分层适配。例如换鱼花纹可以保留游动规则；换庭院可复用已绑定的鱼水；换四足动物需要适配骨骼比例和步态。GLB导入不会自动给任意动物装骨骼或导航。</p></div>
 <h3 class="understanding-subtitle">可扩展方向与需要补齐的环节</h3><div class="understanding-direction-grid">{direction_cards}</div>
 <div class="understanding-photo-note"><h3>一张自己的老家照片，能做什么？</h3><p>它可以作为可参数调整的近似初版依据：拆解房屋、屋顶、门窗、院墙与地面，再让用户修正。单图看不到的背面、遮挡和真实进深需要补充或推测，并明确标记；多图重建所得网格也不会自动变成可编辑的墙、窗和屋顶。</p><p class="understanding-caption">拟定路径：照片与已知尺寸 → 人工 / 辅助结构拆解 → 参数组件 → 用户修改确认 → 数字体验 / 制造模型 → 实物打样。</p></div>
 <h3 class="understanding-subtitle">现在已经有什么，哪些仍是设想</h3><div class="understanding-table-wrap"><table class="understanding-table understanding-status-table"><caption class="sr-only">当前能力与尚未实施的扩展方向</caption><thead><tr><th scope="col">能力</th><th scope="col">状态</th><th scope="col">具体范围</th></tr></thead><tbody>{status_rows}</tbody></table></div>
 <details class="understanding-consistency"><summary>扩展时的一致性标准：参考、确认方案与实物</summary><p>照片与三维场景核对轮廓、门窗、比例和主要物件位置；用户修改后固定确认版本；实体按该版本检查尺寸、零件、颜色与简化细节。已有参考图叠加不是完整一致性验收，也不能承诺单图未知部分或实体材质与照片像素完全相同。</p><p>展示模型进入制造前，需要检查封闭体、壁厚、分件、公差与切片，动画和透明水面要另作实体设计。当前网页没有STL / 3MF / CAD制造输出；真实庭院施工需要另行专业设计。</p></details>
 <p class="understanding-market"><strong>差异化仍需验证。</strong>可编辑三维设计与房屋纪念模型已有现有服务。可围绕家人参与还原、乡村构件、数字与实物对应验证用户需求、修改工时、相似度和交付成本。参考：<a href="https://pro.houzz.com/for-pros/visualization-tool" target="_blank" rel="noreferrer">Houzz三维设计</a> · <a href="https://clearcutcustomlab.com/" target="_blank" rel="noreferrer">房屋纪念模型服务</a> · <a href="https://formlabs.com/blog/3d-printing-architectural-models/" target="_blank" rel="noreferrer">建筑模型制造流程</a> · <a href="https://colmap.github.io/tutorial" target="_blank" rel="noreferrer">多视角重建</a>。</p>
 <details class="understanding-poster"><summary>查看高清总览图：原作、技术与用户价值</summary><a href="assets/library-value-map-v21.png" target="_blank" rel="noreferrer"><img src="assets/library-value-map-v21.png" alt="原作庭园效果、八类底层技术、当前扩展、用户价值、老家参数化与实物方向总览" loading="lazy" width="2560" height="3800"></a><a class="button subtle" href="assets/library-value-map-v21.png" download>下载高清图片</a></details>
</section>
<!-- PROJECT_UNDERSTANDING_V21_END -->'''
section=section.replace('GPU 几何 / 波场','GPU 形变 / 波场')
section=section.replace('<span>画面与环境声</span></div>','<span>显示画面</span></div><p class="understanding-caption">环境声由共享状态独立驱动，经Web Audio合成。</p>')
section=section.replace('换庭院可复用已绑定的鱼水','换庭院后重新校准与标记水域，可复用鱼水动态')
path=root/'web/index.html'
text=path.read_text(encoding='utf-8')
if '<!-- PROJECT_UNDERSTANDING_V21_START -->' in text:
 text=re.sub(r'<!-- PROJECT_UNDERSTANDING_V21_START -->.*?<!-- PROJECT_UNDERSTANDING_V21_END -->',lambda _:section,text,flags=re.S)
else:
 assert text.count('<div class="tech-intro">')==1
 text=text.replace('<div class="tech-intro">',section+'\n<div class="tech-intro">',1)
if 'understanding-v21.css' not in text:
 text=text.replace('<link rel="stylesheet" href="style.css">','<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="understanding-v21.css">',1)
text=text.replace('>技术与实践</button></nav>','>原理与价值</button></nav>',1)
text=text.replace('展开技术解析 →','展开原理与扩展价值 →',1)
text=text.replace('原作实现、当前扩展、验证方法与应用价值，逐项对应。','原作效果与底层计算、当前实现、个人价值与扩展设想，逐项对应。',1)
path.write_text(text,encoding='utf-8')
shutil.copyfile(root/'assets/original.png',root/'web/assets/original-experience-v21.png')
shutil.copyfile(root/'assets/overview-courtyard-v20.png',root/'web/assets/courtyard-current-v21.png')

poster_rows=''.join(f'<div class="map-row"><div><b>{i:02d}</b><h3>{esc(a)}</h3><p>{esc(b)}</p></div><div><strong>{esc(c)}</strong><p class="reuse">可迁移：{esc(d)}</p></div></div>' for i,(a,b,c,d) in enumerate(modules,1))
poster_values=''.join(f'<div class="item"><h3>{i}. {esc(a)}</h3><p>{esc(b)}</p></div>' for i,(a,b) in enumerate(values,1))
poster_directions=''.join(f'<div class="item"><h3>{i}. {esc(a)}</h3><p>{esc(b)}</p></div>' for i,(a,b) in enumerate(directions,1))
poster=f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>原作技术与数字老家扩展总览</title><style>
*{{box-sizing:border-box}}body{{margin:0;width:2560px;color:#233e37;background:#f5f4ed;font-family:'Microsoft YaHei','Noto Sans SC',sans-serif}}#poster{{padding:64px;width:2560px}}h1,h2,h3,p,figure{{margin:0}}.eyebrow{{font-size:23px;letter-spacing:3px;color:#688975;font-weight:700}}h1{{font-size:71px;line-height:1.3;margin:16px 0}}.intro{{font-size:29px;line-height:1.6;color:#597063}}.top{{display:flex;justify-content:space-between;gap:70px}}.state{{border:1px solid #b9ccb9;background:#e7eee1;border-radius:16px;padding:25px;font-size:25px;line-height:1.65;min-width:475px}}.state b{{display:block;font-size:30px}}.gallery{{display:grid;grid-template-columns:1.5fr 1fr;gap:27px;margin:32px 0 20px}}figure{{border:1px solid #c6d1c1;border-radius:18px;overflow:hidden;background:#fffefa}}.shot{{height:470px;overflow:hidden;position:relative;background:#163b32}}.shot img{{width:100%;height:100%;object-fit:cover}}.shot.original img{{transform:scale(1.2)}}figcaption{{font-size:28px;font-weight:700;padding:19px 24px}}figcaption small{{display:block;font-size:22px;font-weight:400;color:#6e7f6e;margin-top:9px}}.compute{{display:flex;gap:30px;justify-content:center;padding:23px;border-radius:14px;background:#dfe8d9;font-size:28px;font-weight:700;margin-bottom:31px}}.compute b{{color:#8ca38b}}.main{{display:grid;grid-template-columns:1646px 759px;gap:27px}}h2{{font-size:37px;line-height:1.5;margin-bottom:22px}}.matrix{{border:1px solid #c4d2c2;border-radius:18px;overflow:hidden;background:#fffefa}}.map-head,.map-row{{display:grid;grid-template-columns:630px 1fr;gap:30px;padding:24px 28px}}.map-head{{background:#1f5145;color:white;font-size:27px;font-weight:700}}.map-row{{border-bottom:1px solid #dde5d6;min-height:165px;align-items:center}}.map-row:last-child{{border-bottom:0}}.map-row>div:first-child{{position:relative;padding-left:57px}}.map-row b{{position:absolute;left:0;font:27px Arial;color:#8ba486}}h3{{font-size:28px;line-height:1.5;margin-bottom:10px}}.map-row p{{font-size:24px;line-height:1.65;color:#60745f}}.map-row strong{{font-size:25px;line-height:1.7;font-weight:500;color:#34576a}}.map-row .reuse{{font-size:22px;color:#6d8a67;margin-top:10px}}.callout{{padding:26px 30px;border:1px solid #bfcfba;background:#e6eddf;border-radius:16px;margin-top:24px;font-size:24px;line-height:1.7}}.sidebar{{display:flex;flex-direction:column;gap:26px}}.panel{{border:1px solid #c3d2bd;border-radius:18px;padding:29px;background:#e9efe3}}.panel.plan{{background:#fbefdf;border-color:#d6c1a7}}.panel h2{{font-size:35px}}.panel p{{font-size:24px;line-height:1.65;color:#5b7063}}.item+.item{{margin-top:21px;padding-top:21px;border-top:1px solid #cfd9c6}}.plan .item+.item{{border-color:#e3d4c2}}.plan .eyebrow{{color:#987552}}.strip{{margin-top:32px;background:#214c41;color:#f6f5e9;padding:30px 34px;border-radius:18px}}.strip h2{{font-size:34px}}.strip p{{font-size:26px;line-height:1.7;color:#d1e2cc}}.scope-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:28px}}.scope-grid article{{background:#fffefa;border:1px solid #cad6c4;border-radius:16px;padding:27px}}.scope-grid h3{{font-size:27px}}.scope-grid p{{font-size:23px;line-height:1.7;color:#60735f}}.future{{margin-top:28px;padding:28px 31px;border:1px solid #d8c8b3;border-radius:17px;background:#f6ecde}}.future h2{{font-size:31px}}.future p{{font-size:24px;line-height:1.75;color:#6d725f}}.footer{{font-size:21px;line-height:1.8;color:#6d7f6c;margin-top:24px;display:flex;justify-content:space-between;gap:35px}}.footer div:last-child{{text-align:right}}
</style></head><body><main id="poster"><div class="top"><div><div class="eyebrow">007 / ORIGINAL EFFECT · UNDERLYING TECH · PERSONAL VALUE</div><h1>从锦鲤庭院，到自己的数字老家</h1><p class="intro">先理解原作怎样计算，再看当前实现与可扩展方向。<br>把熟悉的地方做成可探索、可修改，并可发展为实物的个人空间。</p></div><div class="state"><b>本轮：整理理解与网页说明</b>互动场景沿用 v20 · fbd61419…<br>照片重建、制造与一致性流程<br>属于扩展设想，本轮暂不实施。</div></div>
<div class="gallery"><figure><div class="shot original"><img src="original-experience-v21.png" alt="固定版原作运行效果"></div><figcaption>原作：可交互的锦鲤庭园<small>桥亭、植物、水面、锦鲤、手部与生态 · 实际运行截图</small></figcaption></figure><figure><div class="shot"><img src="courtyard-current-v21.png" alt="当前独立庭院"></div><figcaption>当前扩展：按图构造的独立庭院<small>v20 实际画布 · 参数、算法实验、GLB校准与鱼水绑定</small></figcaption></figure></div>
<div class="compute"><span>输入与共享状态</span><b>→</b><span>CPU 行为 / 运动</span><b>→</b><span>GPU 几何 / 波场</span><b>→</b><span>光学 / 后处理</span><b>→</b><span>画面与声音</span></div>
<div class="main"><section><h2>原作效果背后的八项计算能力</h2><div class="matrix"><div class="map-head"><span>原作里看到什么</span><span>算法 / 技术实现与可迁移能力</span></div>{poster_rows}</div><div class="callout"><strong>当前扩展已接入：</strong>独立参数庭院、128²共享波场、Boids与三球碰撞、WebXR 26骨骼手 / 指腹CCD、六粒投喂、轻触惊散、青蛙 / 乌龟 / 蜻蜓 / 猫、9类解释与A/B、GLB尺度校准和动态绑定。<br><strong>区别：</strong>原作256²波场、鱼实例化、SDF手；当前鱼独立绘制，轻触表现为警觉→惊散→恢复。</div></section><aside class="sidebar"><section class="panel"><div class="eyebrow">VALUE / 对你的意义</div><h2>用户可以获得什么</h2>{poster_values}</section><section class="panel plan"><div class="eyebrow">EXTENSION / 以下尚未实施</div><h2>可扩展方向与缺失环节</h2>{poster_directions}</section></aside></div>
<section class="strip"><h2>模型的扩展价值：六层可以分别适配</h2><p>形体 · 材质 · 动作 · 行为 · 环境约束 · 用户互动<br>换花纹可保留鱼群规则；换庭院可复用鱼水动态；换动物需适配骨骼、步态与导航。导入GLB不会自动赋予任意模型动作与智能。</p></section>
<div class="scope-grid"><article><h3>已有能力</h3><p>原作本地体验；按设计图人工拆解建模；有限比例参数；模型展示、两点长度校准和水域绑定。设计图与贴图由AI生成，场景运行靠规则和GPU。</p></article><article><h3>一张老家照片的边界</h3><p>可作为近似参数初版的参考，补充标注与已知尺寸。背面、遮挡和进深需补依据或推测；多图扫描网格也需拆成语义组件才能局部编辑。</p></article><article><h3>从数字模型到实物</h3><p>纪念摆件需实体化、壁厚、分件与打样；套件需接头、公差与装配；真实庭院需测量、施工图、预算与专业校核。网页网格不能直接视作制造模型。</p></article></div>
<section class="future"><h2>拟定交付路线与一致性标准</h2><p>照片 + 已知尺寸 → 结构拆解 / 参数组件 → 用户修正确认 → 数字体验 / 制造模型 → 实物打样。<br>照片对照轮廓、门窗、比例与位置；修改后固定确认版本；实物按版本核对尺寸、颜色与简化细节。已有参考叠加不是完整一致性验收，不能承诺单图未知部分或实体材质像素完全相同。<br>差异化仍需验证：乡村构件、家人参与还原、数字与实物对应；已有三维设计和房屋纪念模型服务，需要用真实用户与样品检验需求、相似度、修改工时和成本。</p></section>
<footer class="footer"><div>原作：Sourany Phomhome / souranyp-stack/koi-pond-garden · MIT · 固定18213ec5…<br>技术栈：Three.js r160 / WebGL / GLSL / JavaScript / Web Audio<br>原作是程序化庭园作品；规则与光学均有实时近似，未求解完整流体。</div><div>整理于2026-10-03 · 网页内容v21，场景JS沿用v20<br>照片级、真实测绘与硬件性能未完成验收；尚未提交或发布<br>依据：固定源码、当前实现与验收；COLMAP / Formlabs / Houzz / Clear Cut官网</div></footer></main></body></html>'''
poster=poster.replace('GPU 几何 / 波场','GPU 形变 / 波场')
poster=poster.replace('<span>画面与声音</span></div>','<span>显示画面</span></div><p class="intro" style="font-size:22px;margin-top:-18px;margin-bottom:28px">环境声由共享状态独立驱动，经Web Audio合成。</p>')
poster=poster.replace('换庭院可复用鱼水动态','换庭院需重新校准和标记水域，再复用鱼水动态')
(root/'web/assets/library-value-map-v21.html').write_text(poster,encoding='utf-8')
print('Updated webpage explanation and editable infographic source; scene JS and upstream snapshots untouched.')
