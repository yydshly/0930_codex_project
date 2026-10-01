/* 本研究的原创摘要；证据链接由 inventory.js 固定到上游 commit。 */
window.HUASHU_DATA = {
  capabilities: [
    {id:'prototype',group:'视觉产出',name:'交互原型',tag:'HTML / React',summary:'把产品想法变成可点击的多屏界面，验证信息结构和操作流程。',input:'目标用户、核心流程、真实内容、品牌素材、屏幕清单。',output:'HTML 原型，移动设备外框，页面切换、弹窗、标签页等前端状态。',mechanism:'由 Agent 编写 HTML / React 状态机，复用 ios_frame 等组件；浏览器处理布局与事件。',boundary:'按钮能点击不代表存在真实后台；登录、支付、数据库、权限与服务可靠性不由此自动实现。',acceptance:'逐个点击关键路径；核对返回、关闭、切换；检查窄屏和控制台；标注模拟数据。',sources:['SKILL.md','references/app-prototype.md','assets/ios_frame.jsx'],lab:'prototype'},
    {id:'slides',group:'视觉产出',name:'浏览器幻灯片',tag:'HTML deck',summary:'将内容组织为可演讲的多页作品，支持概览与键盘翻页。',input:'受众、讲述目标、页数、逐页内容、比例、品牌规范。',output:'多文件 HTML deck 与概览墙；简单共享状态场景可用单文件 deck-stage。',mechanism:'deck_index.html 用清单组织页面；deck_stage.js 提供缩放、导航和演讲辅助。',boundary:'浏览器交互不会自动变成 PowerPoint 动画；多文件需要随附件一同交付。主文档对单文件页数阈值有不同表述。',acceptance:'逐页检查内容、字号、裁切；测试首尾翻页、概览选择及目标投屏尺寸。',sources:['assets/deck_index.html','assets/deck_stage.js','references/slide-decks.md'],lab:'slides'},
    {id:'pdf',group:'导出与交付',name:'PDF 文档导出',tag:'Playwright / pdf-lib',summary:'将浏览器页面打印并合并为便于分享的 PDF。',input:'已完成 HTML 页面、画布尺寸、页序、可用字体和图片。',output:'多页 PDF；文本通常可搜索，实际效果取决于页面内容。',mechanism:'export_deck_pdf.mjs 遍历 HTML，调用 page.pdf()，使用 pdf-lib 合并；单文件 deck 另有脚本。',boundary:'固定尺寸、图片分辨率、字体加载仍影响结果；矢量 PDF 不等于所有元素都是矢量，也不是排版软件工程文件。',acceptance:'检查页数、文字可选取性、图像、页序与实际打印效果。',sources:['scripts/export_deck_pdf.mjs','scripts/export_deck_stage_pdf.mjs'],lab:'slides'},
    {id:'pptx',group:'导出与交付',name:'可编辑 PPTX',tag:'两条转换路线',summary:'把 HTML 中的文字和形状转换成可编辑幻灯片对象。',input:'HTML 与输出尺寸；需要保留企业母版时提供 .pptx 模板。',output:'PowerPoint 文本框、形状、图片；路线 B 可以继承模板母版。',mechanism:'路线 A：Playwright 测量 DOM → html2pptx.js → pptxgenjs。路线 B：渲染后元素清单 → pptx_from_rendered.py → python-pptx。',boundary:'两条路线都有对象映射限制。路线 B 的 SVG / canvas 会截图为图片；CSS 效果和网页动画不保证保留。',acceptance:'在目标 PowerPoint / WPS 中打开；核对文字、行距、图形和母版修改；不能只验缩略图。',sources:['scripts/html2pptx.js','scripts/pptx_from_rendered.py','references/editable-pptx.md','references/pptx-from-rendered-html.md']},
    {id:'motion',group:'视觉产出',name:'时间轴动画',tag:'Stage / Sprite',summary:'通过时间函数控制元素出现、移动、缩放和透明度。',input:'叙事、分镜、关键帧、时长、文字与素材。',output:'可在浏览器播放、暂停和定位的 HTML 动画。',mechanism:'Stage 提供全局秒数；Sprite 提供片段局部进度；interpolate 与 Easing 将时间映射为视觉属性。',boundary:'自研轻量引擎不提供完整三维、物理或视频剪辑环境；不是扩散式视频生成模型。',acceptance:'检查首帧、关键帧、字幕阅读时间、结尾和重复播放行为。',sources:['assets/animations.jsx','references/animations.md','references/storyboard-basics.md'],lab:'motion'},
    {id:'video',group:'导出与交付',name:'MP4 / GIF 与透明素材',tag:'渲染后端',summary:'把 HTML 动画转成可分发的视频，按场景选择渲染路线。',input:'动画页面、时长、帧率、音轨及所需后端环境。',output:'MP4、GIF；HyperFrames 文档还提供带 alpha 的 MOV、WebM 和 PNG 序列。',mechanism:'旧路线实时录制 WebM 后编码；seek 路线冻结 Stage 时钟逐帧截图；新项目默认 HyperFrames + GSAP 时间轴。',boundary:'逐帧 seek 要求动画受同一时钟驱动；独立 CSS 动画不会自动同步。透明输出、3D 和 shader 能力来自外部后端，本站未实测。',acceptance:'校验时长、帧率、分辨率、音轨、首尾黑帧；对透明素材叠色底检查。',sources:['scripts/render-video.js','scripts/render-video-seek.js','scripts/convert-formats.sh','references/hyperframes-backend.md','scripts/verify-video.sh'],lab:'motion'},
    {id:'narration',group:'导出与交付',name:'配音、字幕与长解说',tag:'可选云能力',summary:'先生成解说音频，再根据测得的时长驱动画面与字幕。',input:'带 scene 和 cue 标记的 Markdown 解说稿、音色、配音服务配置。',output:'分段音频、voiceover.mp3、timeline.json，以及带字幕的动画和成片。',mechanism:'narrate-pipeline.mjs 分段调用 TTS，用音频时长定位 cue；NarrationStage 使用统一时间轴。',boundary:'TTS 将文本发往服务商，需用户凭据与显式同意；字级时间戳不可用时会降级，不能保证卡拉 OK 字幕。',acceptance:'逐句听音、核对数字专名、检查字幕断行、cue 对齐和人声响度。',sources:['scripts/narrate-pipeline.mjs','scripts/cloud/tts-doubao.mjs','assets/narration_stage.jsx','references/voiceover-pipeline.md']},
    {id:'audio',group:'导出与交付',name:'背景音乐与动作音效',tag:'FFmpeg 混音',summary:'使用音乐建立节奏，用音效对应点击、转场、落位和反馈。',input:'画面成片、音乐、音效清单与时间点、目标音量。',output:'含背景音乐、动作音效或解说的音视频文件。',mechanism:'add-music.sh、sfx-cues.sh、mix-voiceover.sh 调用媒体工具进行裁切、混合与音量处理。',boundary:'仓库音频素材不等于任意外部商业音乐的授权；音乐、旁白与音效可能互相遮盖，需试听。',acceptance:'检查对白清晰、音效时点、过载、静音及整体响度。',sources:['scripts/add-music.sh','scripts/sfx-cues.sh','scripts/mix-voiceover.sh','references/audio-design-rules.md','references/sfx-library.md']},
    {id:'infographic',group:'视觉产出',name:'信息图与数据可视化',tag:'HTML / CSS / SVG',summary:'用图形、层级和排版将数据与复杂概念组织为易读内容。',input:'真实数据、单位、时间范围、来源、对比目的。',output:'信息图网页、截图或 PDF；单独 SVG 需图形本身具有对应结构。',mechanism:'浏览器 Grid 与排版能力组织内容，SVG 或绘图库表达图表；数据可由 Agent 写入或由应用读取。',boundary:'不会自动保证数据准确、统计方法正确或地图可信；PNG 的像素数与印刷尺寸需单独计算。',acceptance:'检查来源、单位、轴线、比例、标签、小屏可读性和色觉可辨性。',sources:['references/design-styles.md','demos/c5-infographic.html'],lab:'infographic'},
    {id:'directions',group:'设计流程',name:'多方向设计探索',tag:'先看再选',summary:'为同一内容做差异化初稿，让选择建立在真实视觉上。',input:'目标、受众、素材、约束、尺寸与参考。',output:'多个可见初稿、选择记录与后续深化方向。',mechanism:'三套探索逻辑：打破惯性的风格抽样、真实优秀案例参照、设计师方法推演。宿主支持时可由子代理分别执行。',boundary:'设计师名字是方法参照，不代表本人参与或质量背书；三版并行会增加模型消耗。新版默认所有新视觉任务先过此流程，文档存在部分例外表述冲突。',acceptance:'同内容、同尺寸比较；布局骨架有实质差异；记录用户选定内容。',sources:['SKILL.md','references/multi-perspective-parallel-case-study.md','assets/design_canvas.jsx'],lab:'tweaks'},
    {id:'brand',group:'设计流程',name:'品牌资产与事实协议',tag:'上下文固化',summary:'从真实 logo、产品截图和规范开始，减少凭记忆设计。',input:'品牌资料、产品事实、官方资源与禁区。',output:'brand-spec.md、素材路径、CSS 变量及必要事实记录。',mechanism:'收集需求、查官方渠道、取得资产、校验真实性、写入规范，再让后续设计引用。',boundary:'自动提取的高频颜色不一定是品牌主色；公开可下载不自动等于任意用途授权。',acceptance:'核对 logo 版本、素材出处、字体可用性、色彩和内容事实。',sources:['SKILL.md','references/brand-asset-protocol.md','scripts/fetch_images.py']},
    {id:'tweaks',group:'设计流程',name:'Tweaks 实时调参',tag:'localStorage',summary:'不用修改代码即可对比颜色、字号、密度和其他参数。',input:'提前定义的参数、默认值和可调范围。',output:'页面内调节面板；当前浏览器可保存参数。',mechanism:'前端状态驱动 CSS 变量或组件属性，localStorage 保存偏好。',boundary:'只影响被参数化的部分；浏览器保存不是源码回写，也不是跨设备同步或多人协作。',acceptance:'刷新后仍保留合法值；可以重置；存储受限时仍能使用。',sources:['references/tweaks-system.md','demos/c4-tweaks.html'],lab:'tweaks'},
    {id:'critique',group:'检查与评审',name:'设计评审',tag:'概念 + 五个维度',summary:'按设计目标分析优点、问题和优先修改项。',input:'可见设计、目标受众、使用场景与选择的设计方向。',output:'概念判断、分项评分、Keep / Fix / Quick Wins。',mechanism:'评审指南在五项执行指标之前新增概念/立意维度；概念不足时限制整体评价。',boundary:'模型评分不是独立专家共识，也不是客观审美测量；需真实用户反馈和一致的评价口径。',acceptance:'每项问题关联可见证据；改进建议具体；复评使用同一标准。',sources:['references/critique-guide.md','demos/c6-expert-review.html'],lab:'review'},
    {id:'verify',group:'检查与评审',name:'HTML 与视频验证',tag:'可执行检查',summary:'检查页面能否正常运行，并对导出的媒体做技术校验。',input:'HTML 或视频、目标尺寸、页数、期望时长。',output:'截图、控制台记录、媒体参数检查结果。',mechanism:'verify.py 使用 Playwright；verify-video.sh 检查视频参数、音频、黑帧及响度。',boundary:'verify.py 本身不执行完整业务路径；它主要截图和收集错误，console error/warning 不一定使进程失败。不能把退出码为零当作视觉合格。',acceptance:'补充真实点击断言、视觉检查及多尺寸测试；输出清晰的通过/失败范围。',sources:['scripts/verify.py','scripts/verify-video.sh','references/verification.md']},
    {id:'ai-review',group:'检查与评审',name:'AI 看片评审',tag:'可选云能力',summary:'让视频理解模型辅助发现死段、黑帧、叙事与音效问题。',input:'已渲染视频、上下文说明、用户自己的 API 配置。',output:'模型生成的结构化看片报告。',mechanism:'脚本压缩分段后将视频发往火山方舟官方接口；有 --yes / 环境变量同意门。',boundary:'会传输视频内容且产生服务费用；模型可能漏检或误判。未配置 key 不能产出真实评审。',acceptance:'报告对照实际片段复核；调用失败需明确失败；保留人工看片。',sources:['scripts/cloud/ai-review-video.py','references/ai-video-review.md','SECURITY.md']},
    {id:'library',group:'设计流程',name:'风格、组件与案例复用',tag:'60 种风格 / 24 份样例',summary:'用可阅读的配方与现成基础组件减少重复设计。',input:'媒介、内容、品牌、表达气质和允许的实现方式。',output:'适配任务的参考方案、设备框、幻灯片壳和动画部件。',mechanism:'references 按任务加载；assets 存起手组件与 8 场景 × 3 风格的预制 HTML/PNG；demos 展示能力。',boundary:'风格库里的还原度百分比是作者估计，不是本站测评；预制样例不是为本次需求新生成的成果。',acceptance:'先核对内容和品牌适配性；必要时重做布局；记录来源与许可。',sources:['references/design-styles.md','assets/showcases/INDEX.md','SKILL.md']}
  ],
  workflow:[
    ['01','明确任务','确定受众、用途、格式、尺寸和内容事实。','目标说明 / product-facts.md'],
    ['02','准备素材','收集 logo、截图、产品图、字体和数据，形成共同上下文。','brand-spec.md / 素材清单'],
    ['03','探索方向','同一份内容做差异化可见初稿，再选择深化方向。','初稿 / direction-approved.md'],
    ['04','组织内容','按媒介确定页面结构或分镜、阅读距离和信息容量。','页面清单 / 分镜卡'],
    ['05','生成实现','组合 HTML、CSS、交互状态和时间轴；可加入参数面板。','HTML / JS / 素材'],
    ['06','检查与修正','截图、点击路径、控制台和关键帧检查，修改后复核。','截图 / 问题记录'],
    ['07','导出与验收','选择 PDF、PPTX 或视频路线，在最终使用环境检查。','交付文件 / 验收记录']
  ],
  layers:[
    ['需求与素材','你的目标、品牌、图片和数据','决定内容是否准确、作品是否具有辨识度。'],
    ['Agent 与规则','模型 + SKILL.md + references','决定任务路由、设计判断、代码生成与迭代；质量不由规则单独保证。'],
    ['源文件与组件','HTML / CSS / JS + assets','把视觉、交互和时间函数变成可保存、可修改的源文件。'],
    ['浏览器与渲染','Chromium / Playwright / HyperFrames','执行代码、测量元素、截图或逐帧取样；需要字体与素材加载完成。'],
    ['格式转换与媒体','pptxgenjs / python-pptx / pdf-lib / FFmpeg','生成目标文件；每种格式都有能力损失和兼容边界。'],
    ['最终验收','目标软件、真实用户与人工复核','文件成功生成只是第一步，还需确认可读、可用、可编辑和内容正确。']
  ],
  exports:[
    ['HTML','网页 / 原型 / 浏览器幻灯片','可以保留已实现的交互','修改源代码；Tweaks 仅覆盖预设参数','页面及相关素材、浏览器','不自动具有业务后端'],
    ['PDF','阅读 / 分发 / 打印','通常不保留网页交互','适合定稿；修改主要回到源文件','Chromium；多文件合并需 pdf-lib','字体、分页、图像质量需检查'],
    ['PPTX · A','从零规划的可编辑演示稿','不保留网页运行逻辑','文本与支持的形状可编辑','Playwright + pptxgenjs；受约束的 HTML','复杂 CSS 不能无损映射'],
    ['PPTX · B','已有视觉稿 / 企业母版','不保留网页运行逻辑','文字/形状可编辑，SVG/canvas 作为图片','Playwright + python-pptx + Pillow','需在 PowerPoint/WPS 检查字体度量'],
    ['MP4 / GIF','产品演示 / 动画传播','播放控制，不是原型交互','修改源动画后重渲','渲染后端 + FFmpeg 等工具','GIF 无音频，真 60fps 与插帧不同'],
    ['MOV / WebM / PNG 序列','透明字幕条 / 剪辑贴片','无业务交互','供剪辑软件二次使用','HyperFrames 外部后端','取决于编码和 alpha 支持；本站未实测'],
    ['PNG / SVG','静态配图 / 图表资产','通常不保留页面行为','PNG 是像素图；SVG 仅保留其内部矢量结构','浏览器截图或图形专用导出','整页 HTML 不自动成为可编辑 SVG']
  ],
  extensions:[
    ['品牌层','加入自己的 logo、字体、色板、产品图和禁用规则。','brand-spec.md / 资产索引','用两项不同任务检查品牌是否一致。','入门'],
    ['内容模板层','沉淀周报、课程、提案、产品发布等内容结构。','references / 任务模板','换一份真实内容仍能清晰表达。','入门'],
    ['组件层','加入通用图表、封面、设备框、场景和交互控件。','assets / HTML / JSX','独立预览，再验证组合后的布局和状态。','进阶'],
    ['数据层','将表格或业务接口转换成明确的数据结构，再驱动页面。','JSON / CSV 转换 / 数据适配器','保留来源、更新时间、单位和异常数据处理。','进阶'],
    ['导出层','接企业 PPT 母版或增加符合交付要求的输出格式。','scripts / 格式转换器','验证可编辑性与目标软件兼容，避免只检查文件存在。','进阶'],
    ['质量层','为常用场景添加内容核对、点击路径和截图对照。','测试用例 / 验收清单','使用已知正确样例验证测试工具，区分技术和审美。','进阶'],
    ['平台层','封装为团队内部服务，统一入口、资产和任务队列。','额外的服务端与工程系统','需要另行设计身份、权限、隔离、计费和版本管理。','额外工程'],
    ['媒体层','连接其他 TTS、图像服务或批量视频后端。','云适配器 / 时间轴协议','明确数据外发、费用、重试和时间戳兼容性。','额外工程']
  ],
  limitations:[
    ['视觉原型 ≠ 完整产品','数据库、权限、交易、上线和运维需要独立实现。'],
    ['提示规范 ≠ 自动保证','大部分约束依赖 Agent 遵守；可选 hook 只覆盖部分门槛。'],
    ['本地导出 ≠ 全程离线','宿主模型、素材、字体、依赖下载及可选云服务各自有数据流。'],
    ['多方案 ≠ 免费','模型调用、图片/语音服务、渲染时间和人工修改都应计入成本。'],
    ['展示案例 ≠ 稳定基准','精选作品、完成时间、还原度和主观评分不能代替重复实验。'],
    ['可编辑 ≠ 无损转换','浏览器与 PowerPoint 的布局、字体和图形语义不同。'],
    ['风格规范 ≠ 普遍审美','禁止某些颜色或字体是该工作流的偏好；具体品牌与可读性优先。'],
    ['有脚本 ≠ 跨平台即用','仓库混合 Node、Python、Bash 和部分 macOS 示例；Windows 要逐路线适配。']
  ],
  discrepancies:[
    ['动画后端','README 突出 Stage，且把 3D/粒子列为边界。','新主流程默认 HyperFrames；Stage 限制不能直接套给外部后端。','references/hyperframes-backend.md'],
    ['方向探索','README 把三方向描述为模糊需求 fallback。','新版 SKILL 默认所有新视觉任务都先出三方向，另有用户明示等例外。','SKILL.md'],
    ['评审维度','标题常写“五维评审”。','专项指南实际新增“概念/立意”作为前置指标。','references/critique-guide.md'],
    ['PPT 转换机制','路线 B 文档称 html2pptx 只读源码。','当前 html2pptx.js 也启动浏览器读取坐标和 computedStyle；区别在结构约束、映射和模板能力。','scripts/html2pptx.js'],
    ['测试覆盖','test-prompts.json 列出了期望行为。','它是六条描述性提示案例，不是端到端自动测试；部分期望仍使用旧路线。','test-prompts.json'],
    ['页面验证','“自动验证”容易被理解为全面验收。','verify.py 不自带业务点击断言，且 console 错误/警告本身不一定返回失败。','scripts/verify.py'],
    ['版本内部冲突','主流程、组件表、异常处理并非完全同步。','单文件 deck 的 ≤5/≤10 页描述以及紧急单方案与三方向门之间存在不同口径；需按目标明确取舍。','SKILL.md']
  ],
  prompts:[
    ['产品原型','做一个读书笔记工具的可交互原型。用户是每天阅读的上班族，覆盖书架、笔记详情、搜索和新增笔记四个页面。使用我提供的书目和品牌资料。先展示三个有实质布局差异的方向，选定后深化。所有模拟数据明确标注，交付 HTML 和关键路径检查记录。'],
    ['汇报幻灯片','把这份项目总结整理成 8 页汇报，听众是非技术管理者，目标是决定下一阶段投入。每页只讲一个核心结论，数据仅使用附件。先做两页代表页确定表达方式。交付 HTML deck 和 PDF；还需要可编辑 PPTX，并使用附件企业母版，请从开始就选择兼容的导出路线。'],
    ['产品动画','用真实产品截图制作 20 秒功能演示。核心信息依次为问题、操作、结果。先给方向板和分镜卡，再制作动画。需要 1080p MP4、背景音乐和动作音效；说明使用的渲染路线，检查首尾帧、字幕停留和音轨。不要添加推广水印。'],
    ['信息图','根据附件数据制作一张竖版信息图，面向第一次接触主题的人。保留数据来源、单位和时间范围，禁止补造数字。图形比例必须与数据一致，交付 HTML 和适合打印的 PDF，并说明输出尺寸。'],
    ['评审','请按目标受众与使用场景评审这份设计。先判断概念和内容是否匹配，再看层级、细节、功能和创新。每个问题指出所在页面/区域与证据，给出三个优先修复项；不要只给一个总分。']
  ]
};
