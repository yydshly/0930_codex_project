// Project-wide synthesis. Historical evidence remains in project-journal-data.js.
// Current capabilities use the latest README section; earlier stages retain their scope.
// 2026-10-08 is a documentation review date, not a new feature or visual acceptance date.
import {PROJECT_JOURNAL_ENTRIES} from './project-journal-data.js';

export const PROJECT_OVERVIEW = {
  title: '毛绒工作室 · 项目全程总览',
  updatedAt: '2026-10-08',
  reviewScope: '完整理解与公开入口的文档复核；不表示当日新增功能或重新验收全部历史效果。',
  publicUrl: 'https://yydshly.github.io/0930_codex_project/projects/005-plush-lab/web/project.html',
  summary: '从“怎样做出舒适的毛绒”出发，汇总自由创作、随机搭配、小世界互动、陪伴笔记与提醒、固定 Agent 任务展示，以及论文和 Blender 毛发实验。程序毛丝负责可控创作，作者原作高斯负责目标质感展示；真实 AI 仍待接入。',
  goal: '让舒适毛绒从好看的角色走向可创作、可互动、能记录生活和表达任务过程的工作台。先保留目标质感与真实可用的控制，再扩展陪伴价值。原有作品、页面、配方、研究工程和全部记录继续保留。',
  current: '目标蓝绒星仔的完整本地高斯资产已接入三个既有画布，支持整体互动与毛长、增加卷曲、局部梳理。它由原作者制作；本项目完成加载、场景适配与近似编辑，没有独立重建或训练这份资产。',
  historyCount: PROJECT_JOURNAL_ENTRIES.length,
  evidencePolicy: '2026-10-08 只表示本次文档复核。历史测试、截图与渲染只证明对应轮次的结果，当前汇总没有重新验收所有旧功能，工程测试通过也不等于自制毛料已获视觉认可。公网与 localhost 是不同浏览器来源，本机作品和笔记不会自动迁移。',
  reference: {
    title: 'ChatGPT dots - Felipe',
    author: 'abstrakt',
    label: '蓝绒星仔 · 目标毛绒原作',
    license: 'CC BY 4.0',
    sourceUrl: 'https://superspl.at/scene/ca6a4c9b',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    manifestUrl: './assets/reference-plush/manifest.json',
    body: '保留六个本地 SOG 分块、3,493,379 个高斯与 SH3。当前绒毛创作、小世界、展示台使用本地角色；独立原作页和陪伴工作室中的历史官方查看器仍依赖网络。',
  },
};

export const PROJECT_STAGES = [
  {
    id: 'baseline', title: '01 · 舒适短绒与自由搭配', status: '已实现 · 原有创作保留',
    body: '从线段与渐细毛束的实时绘制开始，修正闪烁并回到用户认可的柔和短绒基线。扩展为八种造型、八种材质，加入配饰、参数、风吹、触碰、弹跳、收藏、配方与照片。',
    journalIds: ['progress-soft-baseline', 'progress-eight-by-eight', 'changes-flicker-treatment', 'progress-works-and-export'],
    links: [{label: '进入原有绒毛创作', url: './index.html'}, {label: '初期方法与修正', url: '../notes/research.md'}],
  },
  {
    id: 'creative-editing', title: '02 · 从笔触上限到持续局部创作', status: '已实现 · 按步骤撤销',
    body: '局部修剪、染色、卷曲、恢复与梳理从采样笔触发展为固定表面场。无损检查点合并近期缓存，让旧效果持续保留；组合步骤可把多次、多工具操作共同记为一步，最近 24 步可撤销。',
    journalIds: ['progress-local-studio', 'changes-lossless-checkpoints', 'changes-shared-history', 'changes-protected-drafts'],
    links: [{label: '连续创作说明', url: '../notes/research.md#连续创作与组合步骤'}, {label: '历史创作实图', url: '../assets/continuous-editing.png'}],
  },
  {
    id: 'journal', title: '03 · 项目进展、修改、原理与方向记录', status: '已实现 · 独立于作品保存',
    body: '按用户要求增加项目记录入口，保存四类内置历史与个人补充。已加入搜索、来源筛选、Markdown 导出、JSON 备份和合并导入；此次总览组织全程内容，旧条目仍按原文保留。',
    journalIds: ['progress-project-journal', 'changes-journal-search-backup', 'principles-journal-isolation'],
    links: [{label: '完整项目文档', url: '../README.md'}, {label: '全部内置历史来源', url: '../src/project-journal-data.js'}],
  },
  {
    id: 'world', title: '04 · 随机搭配与可布置小世界', status: '已实现 · 程序角色与原作分别适配',
    body: '新增独立小世界，用种子生成形状、材质、色彩、着装和场景，可锁定搭配组。逐步加入家具摆放、地面行走、坐沙发、丢球、衰减弹跳、追球、拾回与回应，世界草稿和布局独立保存。',
    journalIds: ['progress-plush-world-v1', 'changes-world-locks-and-history', 'progress-world-editable-room', 'progress-world-fetch-play', 'progress-world-ball-bounce'],
    links: [{label: '进入小世界', url: './world.html'}, {label: '世界实现与历史', url: '../README.md'}],
  },
  {
    id: 'companion-agent', title: '05 · 陪伴笔记、提醒、成长与 Agent 展示', status: '本地能力已实现 · 真实 AI 待接入',
    body: '工作室加入本机笔记、页面内提醒、共同回忆与基于实际事件的成长里程碑。Agent 面板可以运行三个固定本地任务，展示步骤、工具事件和结果；外部模型、后台推送与云同步仍未启用。',
    journalIds: ['progress-companion-studio', 'principles-companion-events', 'progress-studio-agent-display', 'principles-companion-ai-contract'],
    links: [{label: '进入陪伴工作室', url: './studio.html'}, {label: 'AI 接口与待接入范围', url: '../server/README.md'}],
  },
  {
    id: 'research-and-splat', title: '06 · 论文理解与程序化高斯实验', status: '部分算法已运行 · 不等于完整论文复现',
    body: '原创作加入层壳、保长导向链和湿毛聚束实验；另建程序化高斯展台，研究协方差投影、透明合成、像素过滤与 PLY 交换。Three.js 是底座，表示、模拟、资产制作与陪伴逻辑各自选型。',
    journalIds: ['progress-optional-experiments', 'principles-shell-paper-reading', 'principles-ftl-paper-reading', 'principles-wet-paper-reading', 'progress-gaussian-splat-lab', 'principles-engine-and-research'],
    links: [{label: '程序高斯展台', url: './splat.html'}, {label: 'Gaussian Splatting 理解', url: '../notes/gaussian-splatting.md'}],
  },
  {
    id: 'cycles', title: '07 · 成熟毛发流程、Cycles 与 GN / V15–V16 实验', status: '工程与真实渲染保留 · 自制外观未获认可',
    body: '比较论文和成熟产品后，实际运行 Blender 原生毛丝、官方毛发节点及 Cycles / Chiang 散射。经历导向、保长、毛层、层级、卷团、沿长松紧与空间束尺度实验，交付完整候选；测试和实图可复查，但仍未达到用户参考质感。54 个大型 .blend 工程约 3.6 GB 在本机完整保留，公网提供参数、脚本、样片与日志。',
    journalIds: ['progress-plush-method-selection', 'progress-cycles-native-plush', 'progress-cycles-gn8-gn9-layer-hierarchy', 'progress-cycles-gn14-fine-bundles', 'progress-cycles-v15-full-fleece'],
    links: [{label: '完整候选与全部样片', url: '../artifacts/cycles-material-study.html'}, {label: '工程保留与公开范围', url: './engineering.html'}, {label: '制作、诊断与验证', url: '../notes/cycles-material-study.md'}, {label: '方法选型', url: '../notes/plush-method-selection.md'}],
  },
  {
    id: 'reference-viewer', title: '08 · 找到目标原作，先建立直接可见的基准', status: '历史在线展示阶段 · 入口继续保留',
    body: '找到 abstrakt 公开的 ChatGPT dots - Felipe，与用户截图中的蓝色卷绒、黑贝雷帽和亮眼睛对应。先加入独立与工作室官方查看器，再加入三个工作台的历史在线展示；这一步只提供观察，未拥有本地可编辑角色。',
    journalIds: ['progress-reference-original-3dgs', 'changes-reference-official-embed', 'principles-reference-existing-asset', 'progress-reference-three-workbenches'],
    links: [{label: '独立官方原作展示', url: './reference-plush.html'}, {label: '原作来源核验', url: '../artifacts/reference-source-verification.json'}, {label: '作者公开场景', url: 'https://superspl.at/scene/ca6a4c9b'}],
  },
  {
    id: 'native-reference', title: '09 · 目标毛绒成为工作台中的本地角色', status: '当前路线 · 三页同画布接入',
    body: '保存作者公开许可的完整高斯数据，用 Spark 解码和显示，完成坐标、尺度、场景与整体互动适配。三个工作台后来增加毛长、增加卷曲、局部梳理及保存撤销；它们是在原资产上近似编辑，没有重建毛根或训练新高斯。',
    journalIds: ['progress-reference-native-three-workbenches', 'changes-reference-native-actions-preservation', 'principles-reference-full-sog-sh3', 'changes-reference-native-fur-editing'],
    links: [{label: '绒毛创作中的蓝绒星仔', url: './index.html?plushView=reference'}, {label: '小世界中的蓝绒星仔', url: './world.html?plushView=reference'}, {label: '展示台中的蓝绒星仔', url: './splat.html?plushView=reference'}, {label: '最近毛发控件历史核验', url: '../artifacts/reference-fur-controls-validation.json'}],
  },
  {
    id: 'page-audit', title: '10 · 当前页面体验与边界审查', status: '发现问题 · 尚未修复',
    body: '最新审查发现双面板状态不一致、笔刷缺少命中反馈、窄屏预览离开视野、梳理与布置模式冲突，以及导入框容量低于有效作品代码。它补充当前优化任务，不替代上述全程记录。',
    journalIds: [],
    links: [{label: '页面审查与九张截图', url: '../artifacts/world-page-audit-20261003/report.html'}, {label: '本次审查证据与范围', url: '../artifacts/world-page-audit-20261003/evidence.json'}],
  },
];

export const PROJECT_CAPABILITIES = [
  {
    id: 'creation', title: '绒毛创作', status: '已实现 · 程序角色',
    body: '八种形状与八种材质可组合；支持参数、配饰、局部五种笔刷、组合步骤、检查点、撤销重做、自动草稿、收藏、分享和 PNG。层壳实验与原作高斯各有独立限制，不能共用全部纤维工具。',
    links: [{label: '绒毛创作', url: './index.html'}],
  },
  {
    id: 'reference', title: '目标毛绒效果', status: '已接入 · 作者资产与项目适配分别署名',
    body: '蓝绒星仔保留完整 3DGS 与 SH3，在创作、小世界、展示台的同一画布中显示。支持观察、整体运动、色调、大小、照片和高斯绒毛近似编辑；烘焙外观不会随场景灯光重新计算物理散射，暂不支持换装和局部剪染。',
    links: [{label: '原作进入小世界', url: './world.html?plushView=reference'}, {label: '资产与来源清单', url: './assets/reference-plush/manifest.json'}, {label: '原生接入历史核验', url: '../artifacts/reference-native-integration-validation.json'}],
  },
  {
    id: 'world', title: '搭配与场景互动', status: '已实现 · 运动学与代理几何',
    body: '可随机搭配、锁定选项、切换场景与灯光、布置家具、行走坐下，以及丢球、三次衰减弹跳、追球和拾回。整体动作与家具交互使用现有状态机和运动学；球轨迹是确定性动画，尚无完整刚体、骨骼、衣服模拟或多角色自主社交。',
    links: [{label: '小世界', url: './world.html'}],
  },
  {
    id: 'companion', title: '陪伴记录与成长', status: '本地已实现 · 页面运行期间提醒',
    body: '笔记、页面内提醒、共同回忆和成长事件可以独立使用，支持笔记与提醒的 JSON / Markdown 导出，数据留在当前浏览器来源。尚无陪伴数据导入恢复、真正外部 AI 回复、关页后后台提醒、跨设备同步或自主长期记忆。',
    links: [{label: '陪伴工作室', url: './studio.html'}, {label: '接口现状', url: '../server/README.md'}],
  },
  {
    id: 'agent', title: 'Agent 可视化', status: '已实现 · 固定本地任务',
    body: '三个固定任务展示计划步骤、执行事件、工具结果与角色状态，并支持逐步继续、停止及编辑成笔记。它目前是可检查的本地执行流程，不是模型自主规划的通用 Agent。',
    links: [{label: 'Agent 工作台', url: './studio.html'}, {label: '执行器源码', url: '../src/studio-agent.js'}],
  },
  {
    id: 'experiments', title: '研究实验与资产交换', status: '已实现与研究候选并列',
    body: '实时研究入口包含层壳、稀疏 FTL、外观聚束和程序高斯；离线区保存 Blender 工程、真实渲染与诊断。程序展台的受限 PLY 交换与完整原作 SOG 管线分别保留，没有训练器或任意资产兼容承诺。',
    links: [{label: '高斯展台', url: './splat.html'}, {label: '离线毛料与角色', url: '../artifacts/cycles-material-study.html'}],
  },
  {
    id: 'records-and-data', title: '作品保存与项目记录', status: '已实现 · 当前浏览器本机数据',
    body: '草稿、收藏、配方分享和 PNG 保存作品；项目记录独立保存进展、修改、原理与扩展，支持完整历史搜索、个人补充、Markdown 导出及 JSON 备份。记录不会覆盖创作，尚无账号和跨设备云同步。',
    links: [{label: '查看全部项目记录', url: '#records'}, {label: '作品与记录实现说明', url: '../README.md'}],
  },
];

export const RESEARCH_METHODS = [
  {
    id: 'threejs-fibers', title: 'Three.js + 程序纤维', status: '当前原创创作底座',
    body: '以线段和渐细 ribbon 表示绒毛，稀疏导向驱动弯曲，固定表面场表达局部创作。价值在明确的毛根、笔刷语义和实时控制；当前照明和受力仍是网页近似。',
    input: '程序形体、毛根采样、材质与编辑参数',
    scope: '线段 / ribbon、导向插值、局部场与稳定性修正已运行；不是完整物理毛发系统。',
    links: [{label: '已有纤维实现与边界', url: '../notes/research.md'}, {label: 'PBRT 毛发模型综述', url: 'https://www.pbr-book.org/4ed/Reflection_Models/Further_Reading'}],
  },
  {
    id: 'shells', title: 'Lengyel 等 · Shells / Fins（2001）', status: '采用层壳部分',
    body: '将毛层采样为多层半透明曲面，以较少几何表现短绒体积。项目使用 32 层与程序截面纹理，支持剪切式风吹和共享按压；没有论文的轮廓 fins 或 lapped textures，长毛与侧视仍有局限。',
    input: '曲面与毛层体纹理',
    scope: '实时厚度表示；不提供逐根毛丝几何或完整动力学。',
    links: [{label: '作者项目与论文', url: 'https://www.hhoppe.com/proj/fur/'}, {label: '本项目理解', url: '../notes/gaussian-splatting.md'}],
  },
  {
    id: 'ftl', title: 'Müller 等 · 动态 FTL（2012）', status: '核心算法的稀疏实现',
    body: '从固定毛根逐段保长投影，并用后继修正更新速度。项目运行 32 根六段导向链，加入回弹、阻尼和梳理目标；没有论文的逐根 CUDA 系统、密度网格或毛发间排斥。',
    input: '固定根、粒子链、段长与时间步',
    scope: '主要处理运动保长，不能自动生成目标毛料。',
    links: [{label: '原论文', url: 'https://matthias-research.github.io/pages/publications/FTLHairFur.pdf'}, {label: '本项目导向链实现', url: '../notes/research.md'}],
  },
  {
    id: 'liquid-hair', title: 'Fei 等 · 液体与毛发（2017）', status: '外观启发 · 未复现液体耦合',
    body: '论文联合毛发受力、薄液层流动与液桥表面张力。项目只采用湿润配色、毛尖聚拢和根部遮蔽，能创作聚束外观，不能预测水量、滴落、干燥或真实润湿运动。',
    input: '论文需要毛发杆、液体状态与周围流体',
    scope: '当前没有液桥、流体输运或守恒求解。',
    links: [{label: '作者研究页', url: 'https://www.cs.columbia.edu/cg/liquidhair/'}, {label: '研究边界', url: '../notes/gaussian-splatting.md'}],
  },
  {
    id: 'chiang-cycles', title: 'Chiang 等 · 纤维散射 + Cycles（2016）', status: '成熟渲染器已实际运行',
    body: '散射模型负责光在纤维中的反射、透射与内部传播；Blender 原生毛丝与官方节点负责形状和 groom。项目已生成真实 Cycles 样片与完整角色，但几何结构、卷团尺度和观看条件仍决定能否接近参考。',
    input: '已有毛丝几何、材质参数、灯光与相机',
    scope: '离线质量候选；不会自动生成自然毛束，也不能原样导出到网页获得同等画质。',
    links: [{label: 'Disney 原论文', url: 'https://www.disneyanimation.com/publications/a-practical-and-controllable-hair-and-fur-model-for-production-path-tracing/'}, {label: '实际制作与证据', url: '../notes/cycles-material-study.md'}],
  },
  {
    id: 'gaussians', title: 'Kerbl 等 · 3D Gaussian Splatting（2023）', status: '前向实验与既有训练资产已使用 · 未运行训练',
    body: ['原方法从标定多视图优化高斯位置、形状、透明度与 SH 颜色，快速合成新视角。项目一条分支程序生成高斯并绘制，另一条分支完整加载作者既有 3DGS；两者都不等于本项目做了照片重建。', '程序高斯展示台另采用 Yu 等 Mip-Splatting（2024）的二维像素过滤与透明度补偿部分，改善缩放时细绒过亮、过粗的问题；未实现论文训练阶段的三维平滑。'],
    input: '训练需要合格多视图与相机；显示需要已有高斯资产',
    scope: '复杂静态外观适合展示；高斯没有天然毛根、根尖连接和逐根受力语义。Mip-Splatting 的二维过滤来自程序展示台，原作资产的当前显示由 Spark 完成。',
    links: [{label: '作者项目页', url: 'https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/'}, {label: 'Mip-Splatting 原论文', url: 'https://www.cvlibs.net/publications/Yu2024CVPR.pdf'}, {label: '本项目公式与管线区别', url: '../notes/gaussian-splatting.md'}],
  },
  {
    id: 'mature-groom', title: 'Blender Hair Nodes / Houdini Groom', status: 'Blender 已运行 · Houdini 为方法参考',
    body: '导向、插值、卷曲、结簇、沿长松紧、毛束尺度与底绒共同控制造型。项目实际运行 Blender 官方节点；Houdini 泰迪熊和 Hair Clump 文档用于流程参考，未运行 Houdini 的分束或接触求解器。',
    input: '表面、导向毛、分组映射与毛层',
    scope: '成熟工具仍需正确的输入、约束和视觉验收，工具名称不能保证柔软质感。',
    links: [{label: 'Blender Hair Nodes', url: 'https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/hair/index.html'}, {label: 'SideFX 泰迪熊流程', url: 'https://www.sidefx.com/docs/houdini/fur/teddybear.html'}, {label: '方法比较', url: '../notes/plush-method-selection.md'}],
  },
  {
    id: 'gaussian-tools', title: 'LichtFeld Studio / SuperSplat / Spark', status: '工具、训练与显示职责分别记录',
    body: 'LichtFeld 是训练与资产管理工具，SuperSplat 提供编辑发布及官方查看器，Spark 承担当前本地高斯解码和绘制。帖子中的工具声明不证明我们的制作过程；当前项目没有运行 LichtFeld 训练。',
    input: '工具各需训练素材或受支持的既有资产',
    scope: '当前原作使用 Spark 2.3.1、本地六块 SOG、GPU SH 求值与 worker 排序；历史在线查看器保留。',
    links: [{label: 'LichtFeld 官方仓库', url: 'https://github.com/MrNeRF/LichtFeld-Studio'}, {label: 'SuperSplat 官方仓库', url: 'https://github.com/playcanvas/supersplat'}, {label: '本地加载实现', url: '../src/reference-plush-asset.js'}],
  },
  {
    id: 'research-candidates', title: 'GaussianHair / Volumetric Sheen', status: '已整理理解 · 未集成',
    body: 'GaussianHair 研究连接的高斯发丝、人类发型重建与编辑；Volumetric Sheen 研究短纤维表面的柔和光泽。它们是后续候选，不能把人发所需的环绕素材或光泽模型直接当作单图毛绒生成方案。',
    input: 'GaussianHair 需要多帧、方向图、遮罩与发丝先验；Sheen 需要材质及方向参数',
    scope: '研究候选，没有实现重建、重光照或动态原作毛丝。',
    links: [{label: 'GaussianHair 原论文', url: 'https://arxiv.org/html/2402.10483v1'}, {label: 'Disney Volumetric Sheen', url: 'https://www.disneyanimation.com/publications/practical-volumetric-sheen/'}, {label: '选型依据', url: '../notes/plush-method-selection.md'}],
  },
];

export const PROJECT_ROADMAP = [
  {
    id: 'editor-unification', title: '先把当前目标角色的编辑流程接顺', status: '优先 · 尚未完成',
    body: '修复梳理与布置互斥、导入容量和隐藏配置状态；增加近景、笔刷范围与命中反馈，并让窄屏调节时保留预览。让角色、绒毛、场景和作品状态对应，先保证已有能力可信可用。',
    links: [{label: '最近审查', url: '../artifacts/world-page-audit-20261003/report.html'}],
  },
  {
    id: 'appearance-control', title: '目标质感与自由创作逐步统一', status: '后续 · 需要编辑资产与分区',
    body: '建立身体、眼睛、帽子与衣物的语义区域，研究更可信的局部剪染、换装和柔软形变。分别验证原作质感、控制含义和动作边界；若需要真实毛根与逐根运动，应制作相应毛丝或绑定资产。',
    links: [{label: '目标角色', url: './world.html?plushView=reference'}, {label: '方法与资产路线', url: '../notes/plush-method-selection.md'}],
  },
  {
    id: 'ai-companionship', title: '真实 AI、陪伴笔记与提醒', status: '后续 · 外部 AI 尚未启用',
    body: '接入选定模型，让对话生成可编辑笔记或提醒草稿，用户选择分享哪些记忆，并将经过验证的动作结果连接到角色。长期记忆、故事、养成和后台提醒各自定义保存、确认与执行规则。',
    links: [{label: '现有陪伴工作室', url: './studio.html'}, {label: '接口契约与接入工作', url: '../server/README.md'}],
  },
  {
    id: 'agent-visualization', title: '从固定任务走向可检查的 Agent 工作台', status: '后续 · 当前仅固定本地任务',
    body: '在现有事件流上加入受限规划、工具执行、结果核验、失败与停止状态，将执行进度映射到角色表现。角色动画表达真实执行状态，文本变化不能代替动作或工具已经完成。',
    links: [{label: 'Agent 现有流程', url: './studio.html'}, {label: '事件执行器', url: '../src/studio-agent.js'}],
  },
  {
    id: 'world-stories', title: '随机创意、故事成长与更多世界玩法', status: '后续 · 不替代外观目标',
    body: '扩展有约束的主题搭配、用户自定义场景、物件行为、多角色及共同故事。成长以实际互动、记录与任务为依据，优先让故事和生活用途连接，避免只增加随机参数和数值。',
    links: [{label: '现有小世界', url: './world.html'}, {label: '现有成长记录', url: './studio.html'}],
  },
  {
    id: 'asset-performance', title: '加载、性能、作品版本与跨设备', status: '后续 · 当前桌面观察不代表全平台',
    body: '测首次加载、显存、不同 GPU 与真实手机表现，再选择分级质量、资产优化和按需加载。补充作品缩略图、更新与另存版本、文件交换及跨设备方案，保留旧作品与完整原作母版。',
    links: [{label: '当前资产清单', url: './assets/reference-plush/manifest.json'}, {label: '原生接入历史观察', url: '../artifacts/reference-native-integration-validation.json'}],
  },
];

export const PROJECT_RESOURCES = [
  {id: 'overview', title: '完整理解与全程总览', status: '2026-10-08 文档复核', body: '先从既有总图理解能力、原理与用途，再查看全部十个阶段和完整记录；复核日期不表示新增功能。', links: [{label: '项目总览', url: './project.html'}, {label: '公开理解摘要', url: '../notes/public-understanding.md'}, {label: '能力与原理引导图', url: '../artifacts/project-overview-20261003/capabilities-principles-summary.png'}]},
  {id: 'creation', title: '绒毛创作', status: '可用入口', body: '原有程序角色、局部创作和作品保存。', links: [{label: '打开创作', url: './index.html'}, {label: '打开目标蓝绒星仔', url: './index.html?plushView=reference'}]},
  {id: 'world', title: '小世界', status: '可用入口', body: '随机搭配、家具、行走坐下和丢球。', links: [{label: '打开小世界', url: './world.html'}, {label: '原作进入场景', url: './world.html?plushView=reference'}]},
  {id: 'studio', title: '陪伴工作室', status: '可用入口', body: '本机笔记、提醒、回忆、成长与固定 Agent 任务。', links: [{label: '打开陪伴工作室', url: './studio.html'}]},
  {id: 'splat', title: '高斯展示台', status: '可用入口', body: '程序高斯实验与完整本地原作并列使用。', links: [{label: '打开程序展台', url: './splat.html'}, {label: '打开本地目标原作', url: './splat.html?plushView=reference'}]},
  {id: 'reference-viewer', title: '独立原作观察页', status: '历史官方在线查看器保留', body: '保留原作的独立观察入口。它依赖网络，既有工作台中的本地原作角色另由 Spark 显示。', links: [{label: '打开独立原作页', url: './reference-plush.html'}, {label: '来源与许可说明', url: '../artifacts/source-viewer-public.html'}]},
  {id: 'offline', title: '毛料与完整角色实验', status: '历史成果保留', body: 'Cycles 实际图、GN 对照、V15 成片、V16 预览可复查。54 个大型 .blend 约 3.6 GB 在本机完整保留；公网提供参数、脚本、样片和日志，不提供这些真实工程下载。', links: [{label: '查看所有样片', url: '../artifacts/cycles-material-study.html'}, {label: '早期参考对照', url: '../artifacts/reference-comparison.html'}, {label: '工程保留与公开范围', url: './engineering.html'}]},
  {id: 'understanding', title: '方法与研究理解', status: '完整本地文献', body: '原理、选型、运行范围和各次实验结论。', links: [{label: '项目总文档', url: '../README.md'}, {label: '初期研究与持续创作', url: '../notes/research.md'}, {label: '高斯理解', url: '../notes/gaussian-splatting.md'}, {label: '方法选型', url: '../notes/plush-method-selection.md'}, {label: 'Cycles 制作记录', url: '../notes/cycles-material-study.md'}]},
  {id: 'page-audit', title: '小世界页面体验审查', status: '历史问题与证据保留', body: '九张截图、模式冲突、窄屏布局和导入容量核验；这轮审查没有重新测试全部功能。', links: [{label: '打开审查报告', url: '../artifacts/world-page-audit-20261003/report.html'}, {label: '审查证据', url: '../artifacts/world-page-audit-20261003/evidence.json'}]},
  {id: 'provenance', title: '目标原作来源', status: '署名与许可保留', body: 'ChatGPT dots - Felipe，由 abstrakt 制作；本项目接入与适配，不把原作署为自制。', links: [{label: '来源与许可说明', url: '../artifacts/source-viewer-public.html'}, {label: '作者公开场景', url: 'https://superspl.at/scene/ca6a4c9b'}, {label: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/'}, {label: '本地来源清单', url: './assets/reference-plush/manifest.json'}]},
];

export const LATEST_AUDIT = {
  id: 'world-audit-20261003',
  title: '最近一项：小世界页面审查',
  status: '审查已完成 · 修复待做',
  body: '这是全程项目记录中的近期体验检查。已实际查看当前页面与窄屏布局，并用源码和纯函数往返核实模式冲突与导入边界；没有重新测试真实手机、读屏或 AI 流程，也没有在该轮修改创作数据。',
  findings: ['面板重复与角色 / 着装状态不一致', '高斯梳理缺少范围、命中与近景反馈', '窄屏滚到绒毛控制时角色预览离开屏幕', '梳理与家具布置可同时开启，拖动事件冲突', '导入框 22,000 字符小于合法复杂作品的 49,298 字符', '收藏摘要、可读性与键盘操作仍需优化'],
  links: [{label: '完整审查（九张截图）', url: '../artifacts/world-page-audit-20261003/report.html'}, {label: '审查证据 JSON', url: '../artifacts/world-page-audit-20261003/evidence.json'}],
};
