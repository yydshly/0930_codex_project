// Built-in project notes drawn from README.md and research notes.
// Roadmap entries describe proposed work, not capabilities of this build.
export const JOURNAL_CATEGORIES = [
  {id: 'progress', label: '项目进展'},
  {id: 'changes', label: '修改记录'},
  {id: 'principles', label: '实现原理'},
  {id: 'roadmap', label: '未来方向'},

];

export const PROJECT_JOURNAL_ENTRIES = [
  {
    id:'changes-reference-native-fur-editing',category:'changes',title:'原生原作新增可调高斯绒毛与持久梳毛状态',status:'三页毛长、卷曲、梳理、撤销重做与刷新保持已验',
    body:'本轮为本地蓝绒星仔增加毛长、卷曲与局部梳毛状态。毛长相对原作可调 0.65–1.65 倍，增加卷曲 0–100% 叠加在原卷绒外观上，0% 保留原卷度；梳毛方向连续混入固定 12×14×8 空间场，不以总笔触数量停止继续梳理，一次滑杆调整或整次拖动可一步撤销、重做。三个入口已实际通过 UI 调整毛长 65% / 165%、卷曲 0% / 100%，身体拖动产生可见绒毛变化，整次撤销、重做及刷新保持已验。创作与展示台各自保存独立本机原作样式；小世界 actorFur 随 URL 和草稿保留，第二次拖动可继续，家具布局与姿态保持。三页各有一个画布、零 iframe，未见 GPU 错误；完整 3,493,379 个高斯与 SH3 保留。本轮 442 项回归测试全部通过，旧 123 条项目记录正文保留，当前共 124 条，个人作品与本机补充记录不变。此实现按原始颜色与身体范围选择绒毛，在显示时近似调整原有高斯的位置、朝向与尺度，保留 abstrakt 的 ChatGPT dots - Felipe 本地源资产、作者署名与 CC BY 4.0，没有重建真实毛根、单根毛丝或完整物理毛发动力学。后续继续验证不同视角、配饰边界与设备性能，并研究更细的语义分区及有真实毛根的毛丝资产。',
    links:[{label:'本轮毛发控件核验',url:'../artifacts/reference-fur-controls-validation.json'},{label:'创作控件实图',url:'../artifacts/reference-fur-controls-creation.png'},{label:'创作梳理前',url:'../artifacts/reference-fur-creation-before.png'},{label:'创作梳理后',url:'../artifacts/reference-fur-creation-after.png'},{label:'展示台梳理前',url:'../artifacts/reference-fur-splat-before.png'},{label:'展示台梳理后',url:'../artifacts/reference-fur-splat-after.png'},{label:'小世界中的本地角色',url:'../web/world.html?plushView=reference'},{label:'高斯绒毛与梳毛状态',url:'../src/reference-plush-fur.js'},{label:'存档兼容与分享测试',url:'../tests/world-reference-fur.test.mjs'}],
  },
  {
    id:'progress-reference-native-three-workbenches',category:'progress',title:'完整本地蓝绒星仔接入三个工作台',status:'本机桌面三页原生显示、互动与模式切回已验',
    body:'按用户要求，把 abstrakt 的 ChatGPT dots - Felipe 完整公开高斯资产保存到本地，接入绒毛创作、小世界与展示台的既有 Three.js 场景、相机和画布。三个入口的「蓝绒星仔」模式使用本地角色，不再由独立 iframe 承担这三个舞台的显示；旧 iframe 集成记录保留为历史状态。资产共六个 SOG 分块、3,493,379 个高斯及 SH3 球谐，保留作者、来源与 CC BY 4.0。本项目新增本地加载与互动适配，没有生成、重建或训练这份原作。本机桌面浏览器已实际显示三个入口的完整细卷绒角色，三页各只有一个画布、零 iframe；当前桌面观察到绒毛创作 53–76 FPS、小世界 64–88 FPS，仅代表当前设备的运行时观察，不是标准性能基准。小世界已完成坐沙发和追球、拾球、送回流程，创作与展示台的观察、动作、换色、大小和恢复已验；三页实际导出 PNG 均已检查，小世界照片同时包含本地角色和家具。418 项测试全部通过，其中 411 个顶层测试；本地六块资产的数量、SHA-256、ZIP 内容与 CRC 校验再次通过。新的同画布截图与集成核验记录作为本轮凭证，移动设备、显存峰值与首次加载成本尚未测量。旧作品、草稿、收藏、个人记录和实验工程保留。',
    links:[{label:'绒毛创作中的本地角色',url:'../web/index.html?plushView=reference'},{label:'小世界中的本地角色',url:'../web/world.html?plushView=reference'},{label:'展示台中的本地角色',url:'../web/splat.html?plushView=reference'},{label:'本地完整资产清单',url:'../web/assets/reference-plush/manifest.json'},{label:'作者公开来源',url:'https://superspl.at/scene/ca6a4c9b'},{label:'本轮集成核验',url:'../artifacts/reference-native-integration-validation.json'},{label:'小世界同画布坐沙发实图',url:'../artifacts/reference-native-world-seated.png'}],
  },
  {
    id:'changes-reference-native-actions-preservation',category:'changes',title:'同画布观察、弹跳、换色、缩放和照片，保留旧创作',status:'本机动作与切回已验，三个页面的 PNG 实际文件已检查',
    body:'三个工作台接入原生环绕与缩放、正面复位、转台、整体弹跳、RGB 乘色色调、0.65–1.35 倍大小和当前画布 PNG 照片。小世界将原作加入家具所在场景，已有行走、坐沙发与捡球运动学流程在本机浏览器实际执行；三个入口导出的是当前本地画布 PNG，实际文件均已检查，小世界照片包含原作角色与同场景家具。加载期间停用尚不可执行的角色操作，失败可重试；旧程序角色与控件保留，切回可继续其创作。模式切换保留 #recipe=、#world= 和 #splat= 作品片段；原作样式使用独立或新增兼容字段保存，不覆盖旧配方。创作新增回归检查：原作显示期间载入旧配方时，新建的程序角色保持隐藏，配方背景只保存到切回状态；切回程序模式后角色和背景继续显示。完整原作不使用旧 CPU 高斯排序或低容量恒定颜色 PLY 导出，程序生成与旧 PLY 导入继续独立使用。仅在旧 119 条前新增本轮四类记录，当前共 123 条。',
    links:[{label:'当前接入与能力范围',url:'../README.md'},{label:'展示台同画布操作',url:'../web/splat.html?plushView=reference'},{label:'小世界家具与角色',url:'../web/world.html?plushView=reference'},{label:'创作实际截图',url:'../artifacts/reference-native-creation.png'},{label:'展示台实际截图',url:'../artifacts/reference-native-splat.png'}],
  },
  {
    id:'principles-reference-full-sog-sh3',category:'principles',title:'完整高斯与球谐进入现有场景，烘焙外观与毛丝模拟有不同边界',status:'Spark 原生解码和排序，没有抽点或重新训练',
    body:'reference-plush-asset.js 使用 Spark 2.3.1 顺序解码六块本地 SOG，逐块检查高斯数量与 SH3 球谐数据，六个本地文件共 66,929,437 字节（约 66.9 MB），使用扩展精度数据、GPU 球谐求值和 worker 排序，没有抽点或降为恒定颜色。固定 X 轴 π 旋转完成坐标转换，居中并归一到 2.2 场景单位高度；共享源供实例使用，角色整体变换承接位置、朝向、大小和弹跳。整体色调是 RGB 乘色，不是局部染毛。原作保留烘焙外观和随视角变化的颜色，场景灯光不会重新计算纤维物理散射；整体运动不等于逐根毛丝动力学、骨骼或可变形高斯。暂无原作笔刷、换装、单根毛丝吹风或旧 PLY 模型导出。原作者署名与 CC BY 4.0 继续保留。',
    links:[{label:'本地资产加载器',url:'../src/reference-plush-asset.js'},{label:'完整数据清单',url:'../web/assets/reference-plush/manifest.json'},{label:'本地资产完整性核验',url:'../artifacts/reference-plush-asset-integrity.json'},{label:'方法路线与研究记录',url:'../notes/plush-method-selection.md'},{label:'CC BY 4.0',url:'https://creativecommons.org/licenses/by/4.0/'}],
  },
  {
    id:'roadmap-reference-native-editing-performance',category:'roadmap',title:'后续：场景边界、分区编辑、可变形高斯与设备性能',status:'扩展计划，当前不宣称这些能力已完成',
    body:'三个工作台的当前桌面真实画面、环绕、动作及模式切回已实际核验；继续覆盖家具遮挡边界、照片与存档往返，再测不同桌面 GPU 和移动设备的加载时间、显存与帧率。当前桌面的创作 53–76 FPS、小世界 64–88 FPS 是运行时观察，不代表标准性能基准或其他设备。六个本地数据文件合计 66,929,437 字节（约 66.9 MB），完整 SH3 解码与排序仍有首次加载和 GPU 成本，不能仅凭数量完整宣称流畅。分区染色需建立角色区域或语义遮罩；换装需处理衣服尺寸与遮挡；柔软形变需另选骨骼绑定、可变形高斯或实时毛发方案。AI 陪伴、笔记提醒和 Agent 可视化后续应绑定经过验证的动作状态与受限工具调用；文字状态更新不能代替角色真正执行动作。此前 iframe 入口和 Cycles 毛发实验保留，便于回看方法、原理与尚未解决的问题。',
    links:[{label:'当前完整本地角色',url:'../web/world.html?plushView=reference'},{label:'现有陪伴工作室',url:'../web/studio.html'},{label:'方法选型与研究记录',url:'../notes/plush-method-selection.md'},{label:'既有材质实验历史',url:'../artifacts/cycles-material-study.html'}],
  },
  {
    id:'progress-reference-three-workbenches',category:'progress',title:'原作展示接入绒毛创作、小世界和展示台',status:'三页原作真实显示、切回状态与全屏核验完成',
    body:'用户明确要求在绒毛创作、小世界与展示台内使用原作效果。本轮在 index.html、world.html 和 splat.html 的既有舞台加入「原作展示」模式，可通过 ?plushView=reference 直接进入；此前独立原作展台和陪伴工作室入口继续保留。各页提供作者三维查看器、来源署名、观察说明、全屏与重载入口。本机浏览器已实际显示三个页面内的蓝色卷绒星仔，页内全屏进入与退出已实测；切回后继续使用已有创作和互动。原作模式仍是作者既有场景的在线展示，没有把原作合并进家具场景或变成可以笔刷、换装、捡球的本地角色。本轮三个入口的实际截图与集成核验记录已保存。',
    links:[{label:'绒毛创作中的原作',url:'../web/index.html?plushView=reference'},{label:'小世界中的原作',url:'../web/world.html?plushView=reference'},{label:'展示台中的原作',url:'../web/splat.html?plushView=reference'},{label:'本轮集成核验记录',url:'../artifacts/reference-workbench-integration-validation.json'},{label:'绒毛创作实图',url:'../artifacts/cycles-study/reference-integration-creation.png'},{label:'小世界实图',url:'../artifacts/cycles-study/reference-integration-world.png'},{label:'展示台实图',url:'../artifacts/cycles-study/reference-integration-splat.png'}],
  },
  {
    id:'changes-reference-preserve-native-artwork',category:'changes',title:'共用显示切换器，保留原有画布、作品与配方',status:'178 项相关测试及构建通过，三页窄屏核验完成',
    body:'三个页面共用 plush-reference-view.js 和 plush-reference.css，首次选择原作时才设置官方远程 iframe 地址，默认创作模式不预载约 114 MB 的场景。切换通过隐藏或显示保留原有画布和作者 iframe，并停用当前不可使用的编辑与动作控件；原作显示时暂停自制角色的渲染及运动计算，返回后继续原有状态。模式选择只修改 plushView 查询参数，保留 #recipe=、#world= 和 #splat= 作品片段，不写入创作存储。实际切回后，绒毛创作与小世界的名字、毛色和画布尺寸保持，展示台的 seed、颜色、质量与画布尺寸保持；小世界打招呼、展示台弹一下正常。三页在 390×844 下文档 clientWidth / scrollWidth 均为 375 / 375，没有横向溢出；178 项相关测试及统一构建通过，最终共享组件 11 项检查再次通过。陪伴嵌入页 ?companion=1 不安装切换器，原有受限消息桥保持。本轮只在旧 115 条记录前追加四条，个人创作、收藏、草稿及历史工程继续保留。',
    links:[{label:'三个页面的接入说明',url:'../README.md'},{label:'本轮集成核验记录',url:'../artifacts/reference-workbench-integration-validation.json'},{label:'原作展示入口',url:'../web/splat.html?plushView=reference'},{label:'已有小世界互动',url:'../web/world.html'}],
  },
  {
    id:'principles-reference-display-versus-composition',category:'principles',title:'页面内的真实三维展示，与本地可编辑场景的边界',status:'作者官方查看器展示；未取得可编辑原作源资产',
    body:'原作毛绒质感来自 abstrakt 制作的 ChatGPT dots - Felipe 高斯场景，在线加载与绘制由 SuperSplat 查看器承担；本项目本轮实现页面内的展示入口与切换，不是重新生成、重建或训练作者的资产。保留 CC BY 4.0 与来源署名，没有下载、导入或取得可编辑原作源文件。远程 iframe 独立于我们的 Three.js 画布，不能直接调用本项目的毛绒笔刷、衣橱、行走、捡球、本地 PNG 或模型导出，也没有参与小世界家具遮挡、碰撞和灯光计算。作者原作展示期间停用自制控件，避免把对旧画布的操作误认为已经修改原作；切回原创作模式继续已有功能。官方原页此前已验证环绕、缩放与复位，本轮新嵌入 iframe 的环绕拖动尚未独立实测。',
    links:[{label:'官方公开三维查看器',url:'https://superspl.at/s?id=ca6a4c9b'},{label:'来源与核验记录',url:'../artifacts/reference-source-verification.json'},{label:'CC BY 4.0',url:'https://creativecommons.org/licenses/by/4.0/'}],
  },
  {
    id:'roadmap-reference-local-editing-pipeline',category:'roadmap',title:'下一阶段：可编辑毛绒资产、本地导入与小世界合成',status:'计划中，未取得编辑源文件或实现合成管线',
    body:'若要同质感形象真正进入小世界并接受自由创作，需要先核实资产许可与可访问性，取得适合编辑的源文件，或按原作视觉基准制作自有资产；随后建立本地高斯或实时毛发导入、坐标与尺度转换、遮挡及灯光策略和编辑数据管线。再分别制作动作、换装和毛绒编辑，验证画质、性能、交互与存档往返。官方远程 iframe 不提供这条编辑管线，当前三入口展示接入也不等于这些扩展已经完成；继续保留旧创作、研究方法与实验工程作为可追溯依据。',
    links:[{label:'当前原作展示',url:'../web/world.html?plushView=reference'},{label:'方法选型与研究记录',url:'../notes/plush-method-selection.md'},{label:'已有高斯创作工具',url:'../web/splat.html'}],
  },
  {
    id:'progress-reference-studio-display',category:'progress',title:'工作台新增原作毛绒展示模式',status:'本机真实显示、切换与全屏核验完成',
    body:'陪伴工作室新增「我的伙伴 / 原作毛绒」两种展示模式，也可通过 studio.html#reference 直接打开原作。原作模式显示 abstrakt 公开的 ChatGPT dots - Felipe 高斯场景，并保留作者、CC BY 4.0 和官方来源；笔记、提醒与本地 Agent 任务继续使用工作室已有记录。本机内置浏览器已验证直接 #reference 进入并真实显示原作、全屏进入与退出及全屏作者署名。切换展示后聊天草稿和选中的 Agent 桌面页保留，原作 src 不变；实际工作台截图已保存。我的伙伴仍提供现有换装、挥手、跳跃和捡球；原作观看没有变成可编辑或能执行这些动作的角色。',
    links:[{label:'工作台中的原作毛绒',url:'../web/studio.html#reference'},{label:'作者公开原始场景',url:'https://superspl.at/scene/ca6a4c9b'},{label:'独立原作展台',url:'../web/reference-plush.html'},{label:'本机工作台实际截图',url:'../artifacts/cycles-study/studio-reference-integration.jpg'}],
  },
  {
    id:'changes-reference-studio-lazy-view',category:'changes',title:'双视图切换，按需加载原作查看器',status:'65 项相关测试通过，双视图和窄屏实际核验完成',
    body:'原作 iframe 仅在首次进入原作模式时设置官方公开 Embed 地址，不在默认伙伴模式预先加载约 114 MB 的场景。切换模式通过显示或隐藏面板保留两个 iframe，不主动重载小世界；原作提供全屏观看、重载和独立展台入口。浏览器已验证原作模式下即使小世界稍后握手完成，五个身体动作按钮仍禁用；切回我的伙伴后五个按钮恢复。390×844 的实际布局文档宽 375，没有横向溢出。本轮 65 项相关测试通过，包括新增六项双视图检查。原有创作、收藏、草稿、笔记、提醒和回忆的存储键保持；本轮只在旧 111 条项目记录前追加四条说明。',
    links:[{label:'新增工作台展示入口',url:'../web/studio.html#reference'},{label:'官方公开查看器',url:'https://superspl.at/s?id=ca6a4c9b'},{label:'本轮集成核验记录',url:'../artifacts/studio-reference-integration-validation.json'}],
  },
  {
    id:'principles-reference-studio-view-boundary',category:'principles',title:'同一工作台中的展示与互动能力分别由资产提供',status:'原作只提供三维观看；伙伴动作仍由自制小世界执行',
    body:'把官方查看器嵌入工作台复用了原作者已经制作的毛绒外观，未进行本项目的高斯训练、重建或毛发生成。既有小世界通过同源、固定来源的消息桥接收有限动作；原作远程查看器不接收工作室的身体动作、换装、局部笔刷或 AI 表情指令。右侧本地笔记、提醒与 Agent 的执行状态可继续展示，但不能把状态标签说成原作角色已经产生动作。真实 AI 接入和后台提醒仍是后续能力，未因展示模式新增而启用。',
    links:[{label:'工作台内的能力说明',url:'../web/studio.html#reference'},{label:'原作来源与实际核验',url:'../artifacts/reference-source-verification.json'},{label:'CC BY 4.0 许可',url:'https://creativecommons.org/licenses/by/4.0/'}],
  },
  {
    id:'roadmap-reference-studio-action-asset',category:'roadmap',title:'后续让同质感形象真正支持动作、换装与陪伴',status:'扩展方向，尚未取得或制作对应交互资产',
    body:'下一阶段需要取得适合编辑的源资产，或围绕原作视觉基准制作自己的完整形象与动作资产，再选择实时毛发、图像序列或可变形高斯的网页路线。分别验证外观、动作、换装与性能后，才把工作室受限工具调用和 AI 状态绑定到角色表现。当前公开远程嵌入只解决在工作台内查看原作的问题，不提供本地模型、骨骼、毛发编辑或云同步；已有创作、工程与个人记录继续保留。',
    links:[{label:'目前工作台展示',url:'../web/studio.html#reference'},{label:'已有形象与衣橱',url:'../web/world.html'},{label:'方法路线与研究记录',url:'../notes/plush-method-selection.md'}],
  },
  {
    id:'progress-reference-original-3dgs',category:'progress',title:'原作路线：截图中的真实毛绒场景已在本机显示',status:'本机渲染与全屏已验，环绕缩放在官方原页已验',
    body:'用户指出 V15 仍没有参考的毛绒质感，高拱和较强聚束使表面偏球团、羊羔绒颗粒。V16 改为细密连续短卷绒，已保存完整工程与预览，仅作为实验保留，没有高清成片或外观验收。现在找到作者 abstrakt 公开的 ChatGPT dots - Felipe 场景，蓝色卷绒星仔、黑贝雷帽和亮黑眼睛与用户截图中的角色对应。新独立展台已在本机内置浏览器真实显示原作细卷绒，外层全屏进入与 Escape 退出已验证；环绕拖动、滚轮缩放和 R 复位在官方查看器原页已验证，本机 iframe 拖动未独立实测。来源凭证和本机全屏截图已保存，全部旧创作保留。',
    links:[{label:'原作毛绒展台',url:'../web/reference-plush.html'},{label:'作者公开原始场景',url:'https://superspl.at/scene/ca6a4c9b'},{label:'来源与实际核验',url:'../artifacts/reference-source-verification.json'},{label:'本机真实全屏截图',url:'../artifacts/cycles-study/reference-original-local-fullscreen.jpg'}],
  },
  {
    id:'changes-reference-official-embed',category:'changes',title:'新增独立原作展台，保留旧网页与完整工程',status:'使用公开官方 iframe，未保存本地原作模型文件',
    body:'本轮新增 web/reference-plush.html，使用官方 Embed 地址 https://superspl.at/s?id=ca6a4c9b；标注原作标题、作者、CC BY 4.0 许可及来源。官方场景页面标示 3,493,379 splats（约 3.5M）/ 113.59 MB，下载入口要求登录，因此当前交付采用公开远程查看，未保存可离线加载的本地原作模型文件。原工作室、小世界、陪伴工作室、高斯实验和 Cycles 对照继续保留。V16 另存 26,000 组×32 根，共 832,000 根细卷主毛、240,000 根底绒和 18,000 根短散毛的工程与预览；不替换已有创作数据。项目记录只在旧 107 条前新增四类说明。',
    links:[{label:'新增原作展台',url:'../web/reference-plush.html'},{label:'官方公开嵌入视图',url:'https://superspl.at/s?id=ca6a4c9b'},{label:'V16 完整制作报告',url:'../artifacts/cycles-study/character-reference-continuous-pile-v16.groom.json'}],
  },
  {
    id:'principles-reference-existing-asset',category:'principles',title:'原作显示与重新制作是两件不同的工作',status:'显示作者既有 3DGS；本项目没有生成或训练该资产',
    body:'原作场景已经包含作者制作的毛绒外观，官方播放器负责加载和显示这份既有高斯资产。本项目新增的是嵌入入口，没有重建角色、运行 3DGS 训练或生成作者的毛绒模型。它依赖网络及 SuperSplat 官方服务，也不等于把可编辑的毛发工程导入本项目。此前自制版本使用 Blender 原生毛丝和 Cycles / Chiang 散射；V16 将主要绒高降至 0.025–0.034、卷半径降至 0.004–0.0085，并降低聚拢、补齐正面毛根覆盖和缩小眼周压缩，以修连续质感，仍只是一份未经外观认可的预览实验。',
    links:[{label:'原作来源与嵌入边界',url:'../web/reference-plush.html'},{label:'制作方法与当前路线',url:'../notes/plush-method-selection.md'},{label:'V16 实际预览凭证',url:'../artifacts/cycles-study/character-reference-continuous-pile-v16.preview.render.json'}],
  },
  {
    id:'roadmap-reference-editable-companion',category:'roadmap',title:'后续：围绕原作基准制作可编辑和陪伴形象',status:'后续方向，原作尚未接入换装、创作或陪伴状态',
    body:'先让用户直接查看参考中的真实原作，避免继续用大量参数样片代替外观目标。本机展台已显示原作并验证外层全屏，环绕、缩放和复位在官方原页已实测；本机 iframe 拖动未独立实测。展台尚未接入本项目的局部修剪染色、随机着装或陪伴养成。后续需要取得适合使用的源资产，或围绕这个视觉基准重新制作自己的可编辑完整形象，再分别实现动作、换装、陪伴状态和网页性能控制。当前公开远程嵌入不能当作本地可编辑资产，仍须保留来源与作者说明；旧工程、网页和个人作品继续保留。',
    links:[{label:'直接查看原作',url:'../web/reference-plush.html'},{label:'已有陪伴工作室',url:'../web/studio.html'},{label:'未来路线与方法记录',url:'../notes/plush-method-selection.md'}],
  },
  {
    id:'progress-cycles-v15-full-fleece',category:'progress',title:'V15：重做完整蓝色星仔，交付厚卷绒成片',status:'高清成片与工程完成，待用户外观确认',
    body:'此前完成了渲染管线、毛发节点和大量球形样片，仍未交付目标外观。本轮直接重做完整浅蓝星仔的厚卷绒，保留黑贝雷帽与亮眼睛；先完成 6,400 主卷团首稿，发现颗粒偏粗，再细化到 10,800 主卷团。真实 1536×1536 / 256 样本 Cycles 高清图已完成，GPU 渲染 49.40 秒。第一屏将用户参考与这张实际成片并排，工程收在展开区；原图、首稿、旧版和全部历史作品继续保留。成片可检查卷团与松厚轮廓，没有宣称完全一致或已经验收。',
    links:[{label:'参考与 V15 完整成片',url:'../artifacts/cycles-material-study.html#character-v15-delivery'},{label:'下载真实高清图',url:'../artifacts/cycles-study/character-reference-volumetric-fleece-v15-r2.png'}],
  },
  {
    id:'changes-cycles-v15-native-coat',category:'changes',title:'V15：重新制作三层原生毛丝，保留旧工程',status:'新增完整工程、制作源与实际渲染凭证',
    body:'完整外绒改为 10,800 个主卷团，每团 56 根，共 604,800 根，每根 32 个控制点；另制作 185,000 根短底绒与 28,000 根散毛。短、中、长卷团混合，卷径与整体方向错开，束内保留细卷，中段松聚、末端散开，并压短帽沿和眼窝附近的绒毛。帽子与眼睛使用真实几何，新增独立 Blender 工程、冻结制作源、毛形报告、预览、高清 PNG 与实际渲染凭证；6,400 主卷团首稿也保留。项目记录只追加本轮四类内容，旧 103 条内容及顺序保持。',
    links:[{label:'V15 工程、制作过程与首稿',url:'../artifacts/cycles-material-study.html#character-v15-making'},{label:'实际高清渲染凭证',url:'../artifacts/cycles-study/character-reference-volumetric-fleece-v15-r2.render.json'}],
  },
  {
    id:'principles-cycles-v15-groom-scattering',category:'principles',title:'V15：卷团结构与纤维散射共同形成毛绒质感',status:'完整 groom 已制作，方法与论文作用分别说明',
    body:'卷团的体积、长度差异、束内细卷和散开的末端由完整 groom 造型控制；短底绒填充根部，少量散毛柔化轮廓。真实原生毛丝在 Blender / Cycles 中渲染，Chiang 纤维散射负责光与毛丝的相互作用。成熟毛发制作中的层级毛束、长度差异与沿长松紧提供方法参考，但具体卷团公式是本项目的造型选择，不能称论文复现。Houdini 和新的 Gaussian Splatting 训练没有运行；几何检查也不替代与原图直接看图比较。',
    links:[{label:'V15 制作原理与完整工程',url:'../artifacts/cycles-material-study.html#character-v15-making'},{label:'Chiang：生产用毛发与皮毛散射模型',url:'https://www.disneyanimation.com/publications/a-practical-and-controllable-hair-and-fur-model-for-production-path-tracing/'},{label:'SideFX：泰迪熊毛发制作流程',url:'https://www.sidefx.com/docs/houdini/fur/teddybear.html'}],
  },
  {
    id:'roadmap-cycles-v15-web-asset',category:'roadmap',title:'V15 后续：确认完整形象，再制作网页交互资产',status:'后续方向，实时角色尚未替换',
    body:'本轮已提供完整静态成片和可编辑 Blender 工程，先确认卷团尺度、蓬松感、帽型与原图的差距。后续围绕同一完整形象补侧面、多视图及需要的动作，再选择网页用的图像序列、实时毛发或训练高斯资产路线，并分别验证画质和交互成本。目前网页展示新增静态对照，已有实时角色、创作、装扮和陪伴功能继续使用原资产，没有把高清图说成可交互三维角色，也不先扩展故事、养成或 AI 来替代外观目标。',
    links:[{label:'当前完整成片与参考',url:'../artifacts/cycles-material-study.html#character-v15-delivery'},{label:'方法路线与当前交付范围',url:'../notes/plush-method-selection.md'}],
  },
  {
    id:'progress-cycles-gn14-fine-bundles',category:'progress',title:'GN14：两张完整星仔已出图，直接比较参考与旧版',status:'完整候选完成，参考外观仍未达标',
    body:'新增两张 1536×1536 的真实完整角色渲染，保留浅蓝星形、黑帽、眼睛和旧 v6。第一张细束版减少长丝棉絮，但偏贴体短绒；第二张撑开毛层、放松束尾并增加下前柔光，轮廓稍厚、底部柔和，高清图可见细小开放回卷。仍缺参考的松厚、不规则卷团，不能称一致。页面将参考截图、旧完整角色和新候选并排，两套工程和所有历史作品继续保留。',
    links:[{label:'参考、旧版与新完整角色三图',url:'../artifacts/cycles-material-study.html#character-fine-bundle-study'},{label:'GN11 与两张新增毛料实图',url:'../artifacts/cycles-material-study.html#bundle-scale-study'}],
  },
  {
    id:'changes-cycles-gn14-real-mapping',category:'changes',title:'GN14：真实重分组与两套可编辑工程',status:'新工程及 GPU 实图独立保存',
    body:'毛料实际导向从 2,657 补到 10,628，重新分组，两张实图耗时 8.06 / 7.94 秒，独立检查 140/140 通过。完整角色另以 320,000 根外绒与 40,000 条真实星形导向适配，继承帽檐和眼窝压缩，底绒缩短、飞毛隐藏。新增细束版与撑开版两套完整工程、冻结源、CPU 报告和独立 GPU 凭证；1536×1536 / 256 样本，实际渲染 47.08 / 60.72 秒。撑开版改变法向高度、导向切向尺度、Clump 和柔光，属于复合角色配方。旧 99 条记录内容及顺序保留。',
    links:[{label:'完整候选工程与实际条件',url:'../artifacts/cycles-material-study.html#character-v14-recipe-evidence'},{label:'GN14 毛料工程与实际条件',url:'../artifacts/cycles-material-study.html#bundle-scale-evidence'}],
  },
  {
    id:'principles-cycles-gn14-scale-not-softness',category:'principles',title:'GN14：空间毛束尺度生效，细密仍不等于松软',status:'实际节点与视觉判断分开记录',
    body:'空间束细化减少宽扇片，却没有自动产生松厚卷团；完整细束版也证明小束过密会变成短绒绒面。撑开版按真实星形法线提高毛层，放松聚束并补下前光，几何与光照各自起作用，提亮不能代替卷团结构。实际运行的是 Blender 官方毛发节点与 Cycles 纤维散射。SideFX 的空间毛束尺度、长度差异与多层组织用于方法参考，Houdini 未运行，Accurate Bundling、Fractal 与接触求解未实现。工程检查和几何代理不等于柔软评分，本项目造型公式不是论文复现。',
    links:[{label:'GN14 实测、作用范围与边界',url:'../artifacts/cycles-material-study.html#bundle-scale-evidence'},{label:'SideFX：Hair Clump',url:'https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html'}],
  },
  {
    id:'roadmap-cycles-gn14-full-character',category:'roadmap',title:'GN14 后续：补自然卷团层级，再考虑网页交互资产',status:'完整图已对照，自然卷团仍待制作',
    body:'已有完整候选能直接与参考比较。剩余差距集中在卷团大小与方向过于均匀、绒层仍偏薄；后续应组织主卷团、长度错开的子绒与少量散毛，并以完整形象验证。当前两套完整配方包含多项适配，不能作为单变量证据，也不标为已验收母版。先解决外观，再制作多视图与网页可交互资产；目前交付的是 Blender 工程和 Cycles 静态图，尚未替换实时角色，也没有新 3DGS 训练资产。',
    links:[{label:'完整角色对照及当前差距',url:'../artifacts/cycles-material-study.html#character-fine-bundle-study'}],
  },
  {
    id:'progress-cycles-gn13-guide-azimuth',category:'progress',title:'GN13：整束转向实际渲染完成，主要层纹仍在',status:'真实对照完成，参考毛料仍待验收',
    body:'固定 GN11 的 2,657 条导向、85,000 根外绒、90,000 根底绒和沿长 Clump 0.88，绕各条导向的毛根法线独立旋转整条回卷。相同镜头、灯光与材质，768×768 / 96 样本，真实 GPU 渲染 10.35 秒。与 GN11 等尺寸实图比较，顶部、边缘和下侧局部卷向有变化，正面宽扇簇与横向层纹仍明显，尚未达到参考图的细密、松厚柔软卷绒。转向生效不能代替外观验收；新样片独立保存，全部旧作品保留。',
    links:[{label:'GN11 与 GN13 的真实同条件对照',url:'../artifacts/cycles-material-study.html#coil-orientation-study'}],
  },
  {
    id:'changes-cycles-gn13-saved-evidence',category:'changes',title:'GN13：新增整束转向工程及独立检查记录',status:'119 项独立只读检查通过',
    body:'新增可编辑工程、冻结制作源、CPU 参数与几何报告、预检日志、真实 PNG、GPU 凭证及渲染日志。独立 119/119 项检查通过，75 个输入 SHA 前后保持；全部 85,000 根最终子毛响应，原生根、半径、rest、映射、官方节点及场景固定，最终毛根与根半径逐位保持。移动一条导向的控制点，仅 42/42 根映射子毛响应，组外零变化，恢复及两次磁盘重载一致。中间 Curl 有一个子毛根发生 1.86e−9 场景单位的微小位移；派生沿长半径会真实响应，不能声称所有中间根或半径固定。CPU rendered:false 保留，实际 GPU 凭证另存。原 95 条记录内容与顺序保持。',
    links:[{label:'GN13 工程、来源与实测展开区',url:'../artifacts/cycles-material-study.html#coil-orientation-evidence'},{label:'GN13 独立只读验证报告',url:'../artifacts/cycles-study/hair-guide-azimuth-validation-v13.json'}],
  },
  {
    id:'principles-cycles-gn13-rigid-vs-downstream',category:'principles',title:'GN13：导向长度保持，为什么最终子毛仍会变化',status:'旋转不变量与下游形态分别验证',
    body:'用固定种子 12013 为每条导向取独立方位角，轴为解析椭球毛根处的单位法线，以 Rodrigues 公式旋转整条回卷；没有二次冠高或弧长归一。精确数学中导向长度、控制点间距离和根法向投影保持，保存 float32 后的微小漂移独立测量。曲面冠高与下游子毛不是这些不变量：最终冠高分布中位数约 −0.11%，弧长分布中位数约 −0.033%，但逐根配对弧长比的中位数为 1.000589，部分毛丝变化更大，不能说每根子毛保长。转向公式是项目 groom 制作选择；Blender 官方节点与 Cycles / Chiang 负责实际求值和纤维散射，不称论文复现，几何代理也不是柔软评分。',
    links:[{label:'GN13 公式、实测与判断边界',url:'../artifacts/cycles-material-study.html#coil-orientation-evidence'},{label:'Chiang 等：生产用毛发与皮毛散射模型',url:'https://www.disneyanimation.com/publications/a-practical-and-controllable-hair-and-fur-model-for-production-path-tracing/'}],
  },
  {
    id:'roadmap-cycles-gn13-spatial-bundle-scale',category:'roadmap',title:'GN13 后续：制作更小的空间毛束，再比较长度错开',status:'下一轮方案，尚未制作或渲染',
    body:'整体转向尚未消除粗扇簇，因此下一项改变真实空间毛束尺度：导向数量、子毛最近根映射、每束覆盖范围和回卷横向尺度一起保持一致；增加导向却保留原粗大回卷，不能保证细卷团。先固定毛量、材质、灯光和沿长控制，只比较空间尺度，再单独验证长度差异。当前显式 Guide Index 已固定，Guide Distance 不能代替实际重分组。参考 SideFX Hair Clump 的毛束尺度与长度差异方法；Houdini 未运行，宽度感知结簇、Fractal 和接触约束未实现。仍先验收毛料，再匹配完整浅蓝星仔、黑帽和网页资产；历史创作与个人笔记继续保留。',
    links:[{label:'SideFX：毛束尺度与长度差异',url:'https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html'},{label:'本轮实际结果与下一步',url:'../artifacts/cycles-material-study.html#coil-orientation-study'}],
  },
  {
    id:'progress-cycles-gn12-curl-phase',category:'progress',title:'GN12：两种束内相位对照完成，粗扇簇仍在',status:'真实渲染完成，参考毛料仍待验收',
    body:'固定 GN11 的三维回卷导向、沿长 Clump 控制和 0.88 峰值，比较官方 Curl 的额外 Random Offset：全部曲线为 1，或仅子毛为 1、导向为 0。2,657 条导向、85,000 根外绒与 90,000 根底绒保持，镜头、灯光和材质相同，768×768 / 96 样本，真实 GPU 渲染 9.00 / 8.79 秒。与 GN11 三图目视对照，只有局部丝纹和轮廓小变化，粗扇簇与横向层纹仍明显，尚未达到参考细密柔软卷绒。两组均不标为已验收母版，旧作品继续保留。',
    links:[{label:'GN11 与两种相位的真实三图',url:'../artifacts/cycles-material-study.html#curl-variation-study'}],
  },
  {
    id:'changes-cycles-gn12-scope-evidence',category:'changes',title:'GN12：新增两份相位工程及作用范围证据',status:'138 项独立只读检查通过',
    body:'成功 live2 两组新增工程、冻结源、CPU 报告与预检日志、真实 PNG、GPU 凭证和日志。全部曲线组只将 Input_16 从 0 改为 1；仅子毛组用 1−is_guide 字段，CURVE 域子毛偏移为 1、导向为 0，Curl 后全部导向位置与半径逐位保持 GN11。独立复核 138/138 项通过，64 个输入 SHA 保持。两组 85,000 根最终外绒都响应，原生数据、最终根与根半径、映射、沿长控制及场景保持；中间 Curl 子毛根最大位移约 6.32e−8 场景单位，派生半径可能变化。首次中间根位级断言失败报告保留，r2 分开测量中间阶段和最终输出，不默认归因舍入。CPU 与 GPU 凭证分开，原 91 条记录内容与顺序保留。',
    links:[{label:'GN12 工程、来源与作用范围',url:'../artifacts/cycles-material-study.html#curl-variation-evidence'},{label:'GN12 独立只读验证通过报告',url:'../artifacts/cycles-study/hair-curl-phase-scope-validation-v12-r2.json'}],
  },
  {
    id:'principles-cycles-gn12-phase-vs-structure',category:'principles',title:'GN12：毛束已有随机变化，束内偏移为何仍不够',status:'实际节点机制与真实外观分别核对',
    body:'旧 Random Offset=0 不代表所有毛束没有随机性：本机官方 Curl 内部已有按导向 ID 生成的共享相位，额外项才是按当前曲线 ID 的随机值乘 Random Offset。仅子毛组保留共享项与导向，再添加独立偏移；全部曲线组也改变求值导向。Frequency 内部乘以累计段长参与角度，不把 0.85 解释成每根固定 0.85 圈，也不把 Random Offset 当弧度。实际冠高代理仅提高约 0.23% / 0.30%，束内展开有所改变，但真实粗扇仍在。中心线统计不包含实体宽度、接触或柔软评分，输入生效不能代替外观验收。',
    links:[{label:'本轮字段、形态与判断边界',url:'../artifacts/cycles-material-study.html#curl-variation-evidence'},{label:'Blender：Curl Hair Curves',url:'https://docs.blender.org/manual/en/5.2/modeling/geometry_nodes/hair/guides/curl_hair_curves.html'}],
  },
  {
    id:'roadmap-cycles-gn12-smaller-bundles',category:'roadmap',title:'GN12 后续：先重梳卷团方向，再细化空间毛束',status:'下一轮制作方向，尚未实现与验收',
    body:'两种相位偏移都未解决主要结构。下一轮先固定导向数量和映射，绕各自根法线旋转整条原生回卷，隔离比较卷团整体方位；这种旋转不代表最终子毛冠高或长度不变，也不能保证自然细卷。随后再分别比较更小的空间导向组与错开的长度。当前已指定 Guide Index，单改 Guide Distance 不会重分组；细化毛束需要真实更新导向和子毛映射。参考 SideFX Hair Clump 的尺度、长度差异和多层组织方法，Houdini 未运行，宽度感知结簇与接触约束未实现。继续以真实样片验收毛料，再匹配完整星仔、黑帽与网页资产，保留全部旧创作。',
    links:[{label:'SideFX：毛束尺度与长度差异',url:'https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html'},{label:'本轮实图和下一步判断',url:'../artifacts/cycles-material-study.html#curl-variation-study'}],
  },
  {
    id:'progress-cycles-gn11-clump-profile',category:'progress',title:'GN11：沿长松紧改善轮廓，正面毛束仍偏粗',status:'真实渲染完成，参考毛料仍待验收',
    body:'在保存的 GN10 三维回卷工程上新增沿长 Clump Factor 曲线，2,657 条导向、85,000 根外绒与 90,000 根底绒保持，峰值仍为 0.88。相同镜头、灯光、材质，768×768 / 96 样本，真实 GPU 渲染 12.42 秒。实际三图对照显示新轮廓稍高，顶部比完全放开的粗钩更收敛；与整体聚拢相比正面变化有限，粗扇状毛束仍明显，尚未达到参考图的细密柔软卷绒。新结果独立保存，旧完整 v6、历史工程、网页创作与个人笔记保留。',
    links:[{label:'GN11 与两端控制的真实三图',url:'../artifacts/cycles-material-study.html#clump-profile-study'}],
  },
  {
    id:'changes-cycles-gn11-saved-evidence',category:'changes',title:'GN11：新增沿长控制工程、来源与实际验证',status:'134 项独立只读检查通过',
    body:'唯一成功 live7 资产新增可编辑工程、冻结源、CPU 参数和几何报告、预检日志、真实 PNG、GPU 凭证与渲染日志；CPU rendered:false 保持，由独立 rendered:true 和对应 SHA 证明渲染完成。独立 134/134 项检查通过，43 个输入 SHA 前后保持；原生数据、场景与原官方节点固定，真实字段生效，原 Factor 临时旁路位级重现 GN10，恢复后一致，两次磁盘重载通过。临时移动导向 1,328 的控制点 6，仅 42/42 根映射子毛响应，组外零变化，毛根与根半径保持。失败的 live1–live6 来源与日志原样保留，不算成渲染成果。此次只追加四类 GN11 记录，原 87 条内容与顺序保留。',
    links:[{label:'GN11 工程、来源和测量展开区',url:'../artifacts/cycles-material-study.html#clump-profile-evidence'},{label:'GN11 独立只读验证报告',url:'../artifacts/cycles-study/hair-clump-profile-validation-v11.json'}],
  },
  {
    id:'principles-cycles-gn11-input-vs-spread',category:'principles',title:'GN11：输入中段更松，为什么最终中段并未更宽',status:'实际字段与输出几何分别测量',
    body:'从 Curl 后真实毛丝捕获 POINT 域沿长坐标 s，通过六个 VECTOR 控点的 Float Curve 与 Clamp，再乘实际链接的 0.88 送入 Clump。官方内部 Shape、保长与后置 Profile 仍参与，外部 Factor 不是最终位移权重。实际外绒冠高中位数从 0.0167172 到 0.0202510，提高约 21.1%，控制点 6 横向主轴展开代理却下降约 20.4%，末端下降约 44.0%。统计取 2,644 个同导向子毛组在原生控制点的切向平面协方差，采样不对应相同弧长位置，也没有实体宽度、接触或柔软评分。因此更高不等于更软，降低输入强度也不保证更宽，仍须看真实图片。',
    links:[{label:'GN11 字段、形态和测量边界',url:'../artifacts/cycles-material-study.html#clump-profile-evidence'}],
  },
  {
    id:'roadmap-cycles-gn11-child-distribution',category:'roadmap',title:'GN11 后续：分开验证束内分布、子丝相位与卷团尺度',status:'制作方向，尚未实现与验收',
    body:'沿长控制已经改善轮廓，但没有消除正面粗扇簇，下一项在保留已验证条件下隔离子丝空间分布、卷曲相位和更细尺度卷团。SideFX Hair Clump 的沿长 Profile 与使用纤维 width 保持间距的 Accurate Bundling 是不同能力；本轮只借鉴 Profile 制作方法，Houdini 未运行，宽度感知结簇、Fractal 和接触约束未实现。实际采用 Blender 官方节点与 Cycles / Chiang，散射模型不会自动生成自然毛束形态。先让真实毛料达到参考，再匹配浅蓝星仔、黑帽、光色和网页展示；全部旧创作继续保留。',
    links:[{label:'SideFX 沿长控制与宽度感知结簇',url:'https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html'},{label:'本轮真实对照与局限',url:'../artifacts/cycles-material-study.html#clump-profile-study'}],
  },
  {
    id:'progress-cycles-gn10-compact-coil',category:'progress',title:'GN10：实际三维回卷更圆，仍未达到参考的细密柔软感',status:'两张实际渲染完成，毛料仍待验收',
    body:'从 GN8 关闭飞毛的保存工程制作三维回卷毛束，比较完全相同的 2,657 条导向在末级 Clump 0.88 / 0 下的实际效果，驱动 85,000 根外绒与保留 90,000 根底绒。相同镜头、灯光、材质及 768×768 / 96 样本，实际 GPU 渲染 7.55 / 9.77 秒。开启聚拢时尖簇与边缘锯齿减少、卷团更圆，但毛层也更紧、更平；关闭时毛层升高，边缘露出较粗的开放钩圈，正面仍有扇簇。两幅尚未达到参考图细密、圆润、柔软的小卷绒，不标为已验收母版。真实 PNG、工程和凭证均新增，旧完整 v6、所有历史与个人创作保留。',
    links:[{label:'GN8→GN10 三张真实同条件图',url:'../artifacts/cycles-material-study.html#compact-coil-study'}],
  },
  {
    id:'changes-cycles-gn10-immutable-assets',category:'changes',title:'GN10：新增保存工程与独立验证，旧记录原样保留',status:'174 项独立只读检查通过',
    body:'两份成功 live3 资产分别保存可编辑 .blend、冻结源、CPU 参数、几何报告、预检日志、PNG 与实际 GPU 凭证。CPU rendered:false 保持，由独立 rendered:true 及对应 SHA 证明真实渲染。独立检查 174/174 项通过，32 个输入 SHA 前后相同：重建全部导向公式，验证实际 Socket_6 的 Clump 0.88 / 0、其余图与场景固定、每组两次重载及渲染凭证。临时移动导向 1,328 的控制点 6，42/42 根映射子毛响应，组外零变化，根和根半径保持，恢复后整场景一致。两次制作失败的源、日志和已有文件保留，不算成渲染成果。新增本轮四类记录，原 83 条内容与顺序及个人笔记保留。',
    links:[{label:'GN10 工程与来源展开区',url:'../artifacts/cycles-material-study.html#compact-coil-evidence'},{label:'GN10 独立只读验证报告',url:'../artifacts/cycles-study/hair-compact-coil-validation-v10.json'}],
  },
  {
    id:'principles-cycles-gn10-guide-vs-coat',category:'principles',title:'GN10：保留导向冠高，为何最终绒毛仍被压低',status:'实际求值测量与适用边界',
    body:'新导向在固定根的局部法向和切向坐标中回绕并回收尖端，仅沿法向逐条归一，保留指定采样冠高；最大配对误差约 6.16e-8 场景单位。原生冠高保持不代表最终外绒保持：实际外绒冠高中位数从 GN8 的 0.0210805 到 Clump 0.88 的 0.0167172（约 −20.7%），关闭聚拢则为 0.0278719（约 +32.2%）。导向弧长配对中位增至原来的 1.7288 倍，空间回卷紧凑不等于毛丝更短或历史 rest 保长。冠高为解析椭球上的指定 Catmull–Rom 采样代理，弧长为指定积分，不包含实体宽度、接触、像素遮挡或柔软感。原生半径固定，求值沿长 Profile 半径随形态重算。回卷公式是项目 groom 制作选择；实际使用 Blender 官方节点与 Cycles / Chiang 散射，不能称为论文复现。',
    links:[{label:'GN10 实测、公式和失败边界',url:'../artifacts/cycles-material-study.html#compact-coil-evidence'},{label:'Chiang 等：生产用毛发与皮毛散射模型',url:'https://www.disneyanimation.com/publications/a-practical-and-controllable-hair-and-fur-model-for-production-path-tracing/'}],
  },
  {
    id:'roadmap-cycles-gn10-profile-spacing',category:'roadmap',title:'GN10 后续：沿长松紧与束内空间分布，解决扇簇和粗钩取舍',status:'待制作与实际看图验证',
    body:'下一步在现有三维回卷上，分别控制根段、卷冠和毛尖的聚拢，避免整条毛丝同时扎紧或全部放开；再验证束内宽度与间距、更细尺度和不齐的卷团。单纯扫全局 Clump 强度不足以解决当前取舍。参考 SideFX Hair Clump 的沿长 Profile、宽度感知 Accurate Bundling 与 Fractal 多尺度思路；Houdini 尚未运行，当前也没有这些宽度感知或物理接触求解，不能把制作因子说成已复现成熟求解器。先让真实毛料达到参考的细密卷团和柔软轮廓，再匹配完整浅蓝星仔、黑帽、光色并选择网页资产路线。陪伴、提醒和其他扩展继续后置，旧作品与记录保留。',
    links:[{label:'SideFX：沿长松紧、宽度与层级结簇',url:'https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html'},{label:'本轮真实对照与差距',url:'../artifacts/cycles-material-study.html#compact-coil-study'}],
  },
  {
    id:'progress-cycles-gn8-gn9-layer-hierarchy',category:'progress',title:'GN8 / GN9：分层定位长亮丝，并实际比较层级毛束',status:'六张实际渲染完成，参考外观仍待验收',
    body:'GN8 新增外绒、底绒、飞毛各层独显及关闭飞毛四张实际图，相同灯光、镜头与材质。长轮廓亮丝主要来自飞毛；隐藏后边缘更干净，但表面仍有细尖、扇簇和短钩。GN9 再加入 900 父导向→2,657 fine guide→85,000 子毛的实时层级，以父级强度 0.40 / 0.65 实际渲染两图，分别耗时 8.94 / 8.68 秒。两档相对 GN8 的变化很小，彼此也难明显区分，尚未达到参考中厚实、圆润、松软的短卷绒。六张图、可编辑工程和真实运行凭证均新增保存；旧 v6 主图、全部历史和个人创作保留，没有标作已验收母版。',
    links:[{label:'GN8 毛层实际对照',url:'../artifacts/cycles-material-study.html#layer-source-study'},{label:'GN8→GN9 三张真实样片',url:'../artifacts/cycles-material-study.html#short-bundle-study'}],
  },
  {
    id:'changes-cycles-gn8-gn9-independent-assets',category:'changes',title:'GN8 / GN9：保存工程、独立检查和历史记录一并保留',status:'两轮独立只读工程检查通过',
    body:'GN8 只切换三个毛层对象的渲染可见性，独立检查 132/132 项通过，42 个输入 SHA 前后相同。GN9 独立检查 141/141 项通过，28 个输入 SHA 前后相同：重建 900 父锚点与两级映射、逐位核对 .72 原生导向公式、固定根与锚点、原生半径和 rest、旧外绒链、底绒、隐藏飞毛、场景、保存重载和 GPU 凭证。另选父导向 1780 的探针实际带动 2 条 fine 下的 78 根子毛；集合外、毛根与恢复结果逐位一致。首轮验证器分支错误与额外派生元数据断言已修正，失败报告留存，资产没有为通过检查而修改。CPU rendered:false 原样保留，由独立 rendered:true 凭证证明实际渲染；这些检查不评定画质。新增四类记录，原 79 条内容与顺序以及个人笔记保留。',
    links:[{label:'GN8 独立只读检查',url:'../artifacts/cycles-study/hair-layer-validation-v8.json'},{label:'GN9 独立检查通过报告',url:'../artifacts/cycles-study/hair-hierarchy-validation-v9-r2.json'},{label:'GN9 首轮失败报告留存',url:'../artifacts/cycles-study/hair-hierarchy-validation-v9.json'}],
  },
  {
    id:'principles-cycles-gn8-gn9-crown-shape',category:'principles',title:'GN8 / GN9：缩短毛形为何同时损失蓬松高度',status:'实际几何测量与方法边界',
    body:'GN8 分层显示用于定位来源，各图可见毛数不同，不能按等密度或像素相加比较。GN9 的父→fine 与 fine→child 使用独立映射；900 条父锚点原形固定，其余导向在固定根周围缩至 0.72 倍，再经官方 Clump 预处理。实际 53,758 / 85,000 根子毛改变，导向弧长配对中位约为原来的 0.722；末级 Clump 后近似冠高中位下降 21.2% / 24.2%。整体 XYZ 缩短也压低毛冠，几何更短不等于更柔软。弧长为指定 Catmull–Rom 积分，冠高为解析椭球采样，都不是画面柔软感指标；中心线收拢也不能证明实体束体积消失。Cycles / Chiang 负责纤维散射，具体导向冠形和层级组织仍需制作与真实看图验收。本轮采样与沿长曲线是项目 groom 选择，不能称论文公式。',
    links:[{label:'GN9 实际只读几何诊断',url:'../artifacts/cycles-study/gn-hierarchy-geometry-9.json'},{label:'Chiang 等：生产用毛发与皮毛散射模型',url:'https://www.disneyanimation.com/publications/a-practical-and-controllable-hair-and-fur-model-for-production-path-tracing/'}],
  },
  {
    id:'roadmap-cycles-gn8-gn9-compact-coils',category:'roadmap',title:'GN8 / GN9 后续：保留毛冠的紧凑三维回卷',status:'待制作与看图验证',
    body:'下一主体控制改为根部局部坐标中的紧凑三维回卷，通过回绕路径与端点回收收拢毛形，同时保留冠高和横向厚度；随后隔离末级 Clump，检查它对束内松紧的影响。不继续把整体 XYZ 缩短或增加父级强度视作必然改善。参考 SideFX Hair Clump 的沿长控制、宽度感知束内间距与多尺度结簇；Houdini 求解器未运行，Accurate Bundling、Fractal 和物理接触尚未实现。先让真实毛料达到短卷团、连续毛层与柔软轮廓，再匹配完整浅蓝星仔、哑黑帽和光色，之后才判断多视图高斯或实时网页资产。旧作品及个人记录保留，陪伴、提醒和其他扩展继续后置。',
    links:[{label:'SideFX：Hair Clump 制作方法',url:'https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html'},{label:'最新实际样片与差距',url:'../artifacts/cycles-material-study.html#short-bundle-study'}],
  },
  {
    id:'progress-cycles-gn7-spatial-crowns',category:'progress',title:'GN7：新增上立回弯的三维卷束样片',status:'两张实际渲染完成，参考外观仍待验收',
    body:'从保存 GN5 工程新增两幅可编辑导向造型：小束先立起，再向侧后方回弯，比较第三轴幅度系数 0.08、0.16。相同镜头、灯光、材质和 768×768 / 96 样本，实际 GPU 渲染 15.50、14.89 秒。目视三图对照，小团起伏和边缘立体感增加，薄卷片感减少；两幅彼此差异小，0.16 没有明确额外视觉收益。下半部仍有细长亮丝和密集暗部，尚未达到参考的短、松、厚的小卷绒。样片仅评毛料，与参考星仔形体和视角不同；旧完整 v6 与全部历史保留，没有将新样片标作已验收母版。',
    links:[{label:'GN5→GN7 三张真实图',url:'../artifacts/cycles-material-study.html#structural-groom-study'}],
  },
  {
    id:'changes-cycles-gn7-guide-assets',category:'changes',title:'GN7：只改导向造型，新增可复查工程',status:'独立保存两组制作资产',
    body:'两个候选为 gn-crown-008-live-7、gn-crown-016-live-7，各保存 PNG、可编辑 .blend、冻结源、CPU 参数、几何报告、预检日志和实际 GPU 凭证。只改 2,657 条 guide 的非根 position；毛根、历史 rest_position、全部原生半径、外绒原生数据、最近根映射、底绒、飞毛、官方 GN 链和场景保持。求值后外绒位置与沿长 Profile 半径随造型重算，未称派生数据不变。独立 CPU 只读验证 157/157 项通过，26 个输入 SHA 前后一致；全部导向公式逐位重建、二次重载和真实渲染凭证通过，探针只影响实际映射的 42 根子毛，毛根和恢复逐位一致。CPU rendered:false 原样保留，由另存的 rendered:true 和工程/PNG/源 SHA 证明真实渲染完成；工程检查不替代看图验收。项目记录新增本轮四类说明，原 75 条与个人创作继续保留。',
    links:[{label:'GN7 工程与来源展开区',url:'../artifacts/cycles-material-study.html#structural-groom-evidence'},{label:'GN7 独立只读验证报告',url:'../artifacts/cycles-study/hair-nodes-render-validation-v7.json'}],
  },
  {
    id:'principles-cycles-gn7-authored-groom',category:'principles',title:'GN7：成熟毛发节点与具体造型分别负责什么',status:'制作原理与适用边界',
    body:'已有 Blender 官方 Curl / Clump 将可编辑 guide 的变化传播到子毛，Cycles / Chiang 纤维散射处理光与毛丝的相互作用。先立起再回弯的具体冠形则是本项目作者的 groom 制作选择，不能称为论文公式、官方预设或 Houdini 求解器输出。外绒冠高中位数约 0.01617→0.02108 / 0.02068，采样下陷比例减少；这些只描述几何，不等于可见厚度、柔软感或画质。导向弧长相对旧控制的比值中位数约 1.05414 / 1.15587，实际略增，没有毛丝缩短或原 rest 保长保证。',
    links:[{label:'Blender：Curl 沿长控制',url:'https://docs.blender.org/manual/en/5.2/modeling/geometry_nodes/hair/guides/curl_hair_curves.html'},{label:'Chiang 等：生产用毛发与皮毛散射模型',url:'https://www.disneyanimation.com/publications/a-practical-and-controllable-hair-and-fur-model-for-production-path-tracing/'}],
  },
  {
    id:'roadmap-cycles-gn7-natural-tufts',category:'roadmap',title:'GN7 后续：自然短卷团、光色与完整角色匹配',status:'待制作和看图验收',
    body:'三维导向使小束更立起，但仅增加侧向幅度的收益有限。下一步集中制作不同尺度与松紧的局部短卷团，参考 Hair Clump 的沿长 Profile、纤维宽度与 Fractal 结簇思路，在可编辑导向上逐项验证真实图。Houdini 能力仍是方法参考，尚未运行其求解器。参考毛料的短卷、连续毛层与柔软轮廓成立后，再匹配完整浅蓝星仔、哑黑帽与光色，随后判断网页高斯拟合或实时毛发方案。旧作品和个人笔记保留，AI 陪伴及其他扩展继续后置。',
    links:[{label:'SideFX：Hair Clump',url:'https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html'},{label:'最新实际图与差距',url:'../artifacts/cycles-material-study.html#structural-groom-study'}],
  },
  {
    id:'progress-cycles-gn6-tip-spread',category:'progress',title:'GN6：实际比较两种毛束末端散开幅度',status:'两张实际样片已生成，参考外观仍待验收',
    body:'从保存的 GN5 工程新增两个单变量样片，只将官方 Clump 的 Tip Spread 从 0.003 分别改为 0.006、0.009。768×768、96 样本，实际 GPU 渲染耗时分别为 7.03、14.24 秒，工程、PNG、冻结源、CPU 预检和实际 GPU 凭证独立保存。真实看图：0.006 只有局部小变化；0.009 的束尖稍松、略更散乱，两者整体仍像薄碎的 C 形卷片，未形成参考里的厚实柔软小卷绒。已确认 VIEWPORT 与 RENDER 求值的毛丝位置、半径逐位相同，渲染确实使用了修改后的几何。没有将几何代理改善当成视觉达标，也未应用完整角色、训练高斯或改变原网页作品。',
    links:[{label:'GN5 与 GN6 三张真实样片对照',url:'../artifacts/cycles-material-study.html#bundle-volume-study'}],
  },
  {
    id:'changes-cycles-gn6-saved-assets',category:'changes',title:'GN6：只修改一个节点输入，保留历史与来源',status:'新增可复查资产',
    body:'两个成功候选使用 gn-tip-spread-006-live2-6 与 gn-tip-spread-009-live2-6。原生外绒、2,657 条导向、最近根映射、毛根与原生半径、0.35 倍底绒、飞毛、材质、镜头和灯光保持；外接 Restore 仍为 0，Clump 内部 Preserve Length 仍开启。求值位置及沿长 Profile 派生半径允许变化并单独记录。CPU 预检 rendered:false 保留，实际渲染由另存的 rendered:true 凭证及 PNG/工程/源哈希证明。初次 live-6 的报告脚本在重载后引用失效节点，失败产物保留，使用修正源和新 tag 重新保存；没有把失败产物计作渲染成果。新增独立只读保存文件检查 130/130 项通过，22 个输入 SHA 前后相同；导向探针只影响对应 42 根，组外、毛根和恢复结果逐位保持。这些检查不评定参考外观。旧工程、原 71 条记录和个人笔记继续保留。',
    links:[{label:'GN6 保存工程的独立检查',url:'../artifacts/cycles-study/hair-nodes-render-validation-v6.json'},{label:'实际对照与下载',url:'../artifacts/cycles-material-study.html#bundle-volume-study'}],
  },
  {
    id:'principles-cycles-gn6-volume-proxy',category:'principles',title:'GN6：末端散开与厚实卷束是不同的制作问题',status:'官方节点与实际测量的理解',
    body:'官方 Clump 的 Tip Spread 用于避免毛束末端完全收拢。本机资产内部把按 Curve ID 产生的随机向量乘以该值，再放入导向的法向、副法向、切向坐标系；它是空间位移幅度，不是百分比。GN5 导向本身接近薄平面的开放 C/C/S，增大束尖散开不会重塑其主体。独立测量同一导向成员中心线在法平面上的分布，用标准差小/大轴比描述横截面偏扁程度；它不包括实体纤维体积、遮挡或像素质量，不能叫体积通过。更大的散开同时增加低于表面 0.001 的曲线，阈值为场景单位。原始敏感性探针、保存文件独立验证和实际渲染分别留存，来源与作用不混用。',
    links:[{label:'Blender：Clump Hair Curves',url:'https://docs.blender.org/manual/en/5.2/modeling/geometry_nodes/hair/guides/clump_hair_curves.html'},{label:'实际机制探针来源',url:'../artifacts/cycles-study/gn-tip-spread-mechanism-1.provenance.json'}],
  },
  {
    id:'roadmap-cycles-gn6-structural-groom',category:'roadmap',title:'下一步先制作立体卷束与自然结簇',status:'待制作和看图验收',
    body:'GN6 表明仅扩大末端散开不足以得到舒适毛绒。下一步先在相同小样、相同镜头和灯光下制作有三维回弯的导向，比较束内松紧与不同尺度的结簇，检查靠近曲面的下陷，保留少量候选实际渲染。参考 Blender 官方 Curl 的 Radius/Frequency/Start 参数与 SideFX 泰迪熊 Guide Groom/Hair Generate、Hair Clump 的宽度和层级结簇制作方法；Houdini 流程目前只作方法参考，没有宣称已运行其求解器。通过厚实小卷、连续毛层和柔软轮廓的看图验收后，再调整完整星仔、黑帽、光色与网页方案，扩展仍后置。',
    links:[{label:'Blender：Curl Hair Curves',url:'https://docs.blender.org/manual/id/5.2/modeling/geometry_nodes/hair/guides/curl_hair_curves.html'},{label:'SideFX：泰迪熊毛发制作',url:'https://www.sidefx.com/docs/houdini/fur/teddybear.html'},{label:'SideFX：Hair Clump',url:'https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html'}],
  },
  {
    id:'progress-cycles-native-plush',category:'progress',title:'生成可编辑原生毛丝与 Cycles 实际样片',status:'离线候选已生成，参考外观待验收',
    body:'方法选型后实际运行 Blender 5.2.2 LTS / Cycles，生成四组毛料、浅蓝星仔正面和 25° 侧面。完整 v6 主体 669,000 条毛丝、黑帽 90,000 条，1536×1536、384 样本，实际生成与渲染共 124.65 秒；E/v6 对外绒作整根弧长归一，仍未达到参考。GN1/GN2 官方 Hair 节点小样各有 177,500 根可渲染毛丝，其中 85,000 根外绒由 2,657 根独立导向实时带动，GPU 生成与渲染 15.28 / 18.35 秒。GN2 改用开放 C/C/S 导向并修正 12 个异常法向，画面仍偏均匀短毡。GN3 单独改为最近毛根映射，实际 GPU 17.94 秒，可辨毛束增加但仍细薄。GN4 只将保存底绒围绕固定根缩至 0.35 倍，实际 GPU 渲染 11.68 秒，毛束稍清楚。GN5 逐节点定位到外接长度恢复压低了卷束，仅将其 Factor 1→0，保留 Clump 内部 Preserve Length、全部原生毛层和场景；实际 GPU 渲染 10.19 秒。真实图中小卷束更独立、表面下陷减少，但仍偏薄，参考的厚实松软毛料尚未达标。尚未渲染完整 GN 角色或训练网页高斯资产。工程、PNG、真实运行与测量报告、冻结源均留存，E、v6 与历史版本继续保留。',
    links:[{label:'参考与实际毛料对照',url:'../artifacts/cycles-material-study.html'},{label:'Blender：原生 Curves 数据',url:'https://docs.blender.org/api/5.2/bpy.types.Curves.html'}],
  },
  {
    id:'principles-cycles-fiber-scattering',category:'principles',title:'真实毛丝、纤维散射与柔光分别控制什么',status:'本轮使用的成熟渲染方法',
    body:'连续网格承载底绒、弯曲外绒与飞毛，原生曲线保存控制点和半径。Cycles Principled Hair BSDF 使用 CHIANG / COLOR 与 Disney 2016 纤维散射，路径追踪求毛层光影；散射不会自动生成合适卷束。历史 A/B/C/D/E 与完整 v6 导向是烘焙记录；E/v6 整根缩放是几何弧长归一。GN 分支实际使用官方 Curl → Clump → Restore Curve Segment Length → Set Hair Curve Profile，独立导向可带动外绒；GN3 改为对象空间最近毛根映射，GN4 只缩短底绒。逐节点检查发现，外接 Restore 以原直毛 rest 恢复段长，Clump 内部以卷曲后输入保长，两步参考不同。GN5 关闭外接 Restore，内部 Preserve Length 仍开启；这是项目组合问题，不能说官方节点失效。未改的沿长 Profile 随变形重算，求值半径有 85.2117% 点变化，原生及根半径固定。最终样条弧长相对原 rest 绝对漂移 P95 为 41.61%，不能称原长度保持。CPU rendered:false 与实际 GPU rendered:true 分开记录。椭球梯度距离与曲线采样是几何近似，0.001 是场景单位，不能当毫米或逐像素可见率。目前尚无接触求解、FTL、多视图 3DGS 训练或该离线资产的网页转换。',
    links:[{label:'Disney 2016：毛发散射模型',url:'https://www.disneyanimation.com/publications/a-practical-and-controllable-hair-and-fur-model-for-production-path-tracing/'},{label:'SideFX：Hair Clump 导向与沿长分布',url:'https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html'},{label:'Blender：官方 Hair Nodes',url:'https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/hair/index.html'}],
  },
  {
    id:'changes-cycles-study-review',category:'changes',title:'保留离线候选与导向对照，记录真实差距',status:'已留存修改与差距',
    body:'保留 v1/v2/v3、导向 A/B/C/D/E 与完整 v4/v5/v6，原 589 项只读检查和 58 个输入 SHA 保留。GN1 / GN2 独立 99 / 100 项通过，各 11 个输入 SHA 不变；GN3 最近映射独立 120 项通过，14 个输入 SHA 不变。GN4 只缩底绒，正面外绒高于局部底绒 P95 的平均弧长比例从 6.39% 升到 55.15%，实际毛束稍清楚；独立 147 项通过，15 个输入 SHA 不变。GN5 只关闭外接长度恢复，深于表面 0.001 的曲线比例从 44.5176% 降到 0.3294%，平均弧长比例从 7.3546% 降到 0.00930%；这是几何近似，非像素或画质指标。GN5 独立 132 项通过，17 个输入 SHA 不变；导向 1,328 / 控制点 6 的探针只影响对应 42 根，组外、毛根与恢复逐位一致。求值半径变化与原 rest 弧长漂移明确留存，不把工程通过称保长或视觉验收。实际毛料仍偏薄，下一步比较导向回弯体积与自然结簇。原网页创作、个人笔记和作品存储保留。',
    links:[{label:'实际样片、迭代与下载',url:'../artifacts/cycles-material-study.html'}],
  },
  {
    id:'progress-plush-method-selection',category:'progress',title:'先比较成熟方法，再决定毛绒实现路线',status:'方法核查完成，外观待验证',
    body:'依据用户要求，重新比较论文、成熟毛发工具和高斯产品。首轮选择 Blender/Cycles 制作可编辑形体、导向曲线和密集毛丝，参考 Disney 纤维散射模型；Houdini Guide Groom/Hair Generate 作为成熟替代。先验收局部蓝色毛料，再制作完整星仔与单独的短绒黑帽。静态网页展示随后评估多视图渲染、高斯拟合与 SuperSplat viewer；需要局部创作和换灯时评估实时纤维、毛发卡片或 shells/fins。本轮完成研究与选型，没有新增离线工程、训练资产或效果图，当前 v4 毛料尚未达到参考要求。详细比较与验收步骤记录在 notes/plush-method-selection.md。',
    links:[{label:'Blender：毛发制作节点',url:'https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/hair/index.html'},{label:'SideFX：泰迪熊毛发制作流程',url:'https://www.sidefx.com/docs/houdini/fur/teddybear.html'}],
  },
  {
    id:'principles-plush-pipeline-layers',category:'principles',title:'资产、散射、拟合与网页展示需要分别选型',status:'方法选型依据',
    body:'毛发工具生成和梳理实际纤维，Disney 毛发模型处理反射、透射与能量守恒，路径追踪求解毛层光影；3DGS 根据静态多视图和标定相机优化外观，LichtFeld 负责训练与编辑，SuperSplat 负责资产检查和网页展示。当前手工高斯毛团缺少高质量原始毛料与图像监督，不能靠点数补齐。原版 3DGS 不直接提供任意换灯或逐丝编辑；GaussianHair 面向多视图人发和头皮先验，不是单图毛绒角色方案。Cycles 毛丝及 Hair BSDF 不能原样转成 GLB 并保持同等网页画质。项目已有层壳、FTL 与湿毛现象研究；本轮补齐制作流程选择，并非把研究方法标为已实现。',
    links:[{label:'Disney 2016：毛发散射模型',url:'https://www.disneyanimation.com/publications/a-practical-and-controllable-hair-and-fur-model-for-production-path-tracing/'},{label:'Kerbl 等 2023：3DGS 输入与优化',url:'https://arxiv.org/html/2308.04079'},{label:'GaussianHair：人发重建的输入与限制',url:'https://arxiv.org/html/2402.10483v1'},{label:'LichtFeld：训练、编辑与导出',url:'https://github.com/MrNeRF/LichtFeld-Studio'},{label:'SuperSplat：浏览器编辑与发布',url:'https://github.com/playcanvas/supersplat'}],
  },
  {
    id:'roadmap-plush-offline-baseline',category:'roadmap',title:'下一步交付可编辑毛料样片和渲染对照',status:'待制作与视觉验收',
    body:'固定曲面、镜头、分辨率与柔和大光源，制作细密底绒、导向弯曲毛束和少量飞毛，保存几组可比较参数。检查粗细、连续毛层、根部暗部、软阴影和轮廓；通过后再对齐完整蓝色星仔、黑帽布料和眼睛。保留原始工程，随后按静态环绕或局部创作需求分别比较高斯拟合与实时毛发资产，测量失真、旋转闪烁、内存与帧率。本机查到约 8 GB 显存的 RTX 4070 Laptop，尚未找到可用 Blender；工具运行与容量仍需验证。本轮没有生成样片，未声称画质或性能通过。先完成参考外观，再扩展陪伴与场景。',
    links:[{label:'Blender：Cycles 毛发材质',url:'https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/hair_principled.html'},{label:'SideFX：毛发卡片与纹理',url:'https://www.sidefx.com/docs/houdini/fur/haircards.html'},{label:'Lengyel 等：实时层壳与轮廓 fins',url:'https://hhoppe.com/proj/fur/'}],
  },
  {
    id:'progress-gaussian-reference-flow-v4',category:'progress',title:'继续对齐毛流、帽沿与身体轮廓',status:'已调整并对照',
    body:'继续以用户提供的蓝色卷绒星仔截图为外观目标。将毛团细化为更多、不等长的下垂细绒，缩短末端并降低尖锐边缘；贝雷帽下半壳改为向内收底，减弱原先压平并向前撑开形成的卷边，帽下蓝毛同步压短。侧臂集中成圆瓣，收窄下腹并加入臂下软凹入，使小臂与腹部有清楚分界。更新同画幅的原图与实际三维画布对照，保留前三轮截图。380 项自动测试、软件 GPU 中 23 组页面流程通过，旋转、保存分享、PLY 往返与旧存储保留正常；32,000 档窄屏无横向溢出。当前毛料自然度、帽褶和烘焙光照仍与参考有差异，尚未完全一致，扩展工作仍后置。',
  },
  {
    id:'principles-gaussian-reference-flow-v4',category:'principles',title:'细绒预算与帽底收拢的作用',status:'本轮实现原理',
    body:'主体毛团从上一轮最多 12 个高斯改为最多 8 个：一个有体积的暗芯和两条不等长曲线上的七段细绒。相同预算增加毛团数量，长轴继续沿曲线导数定向；缩小弧段、打散毛流并减弱末端透明度，降低长刺与均匀卷圈感。黑帽下半壳沿横向与深度向内收拢，避免整个下半球叠在同一帽缘高度又向前突出，形成硬卷边；帽缘附近的蓝毛按高度渐变压短。帽绒缩为每团三个更细的高斯，保留哑黑褶面层次。以上是程序几何及常数色调整，没有新增真实毛发受力、碰撞求解、多视角训练或实时重光照；渲染继续使用三维协方差投影和 Mip-Splatting 的二维像素过滤部分。',
    links:[{label:'Kerbl 等 2023：3DGS 表示与训练',url:'https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/'},{label:'Yu 等 2024：Mip-Splatting 原论文',url:'https://www.cvlibs.net/publications/Yu2024CVPR.pdf'}],
  },
  {
    id:'progress-gaussian-reference-match',category:'progress',title:'先对齐图片中的蓝色卷绒星仔',status:'已调整并对照',
    body:'本轮按用户指定顺序优先匹配参考图外观，暂不新增陪伴、着装或场景扩展。重做双肩与中间凹谷、圆侧臂和宽圆腹；黑贝雷帽向左偏、左沿垂坠，帽缘围绕双肩贴合，修复蓝毛穿出帽面。眼睛改为无嘴的双凸眼，调整位置与同侧窗灯亮点。毛团改为带体积的暗芯和多条不规则弯曲细绒，增加下垂毛流，收敛过亮蓝色。保存同画幅的参考截图与实际三维画布并排对照。380 项自动测试及软件 GPU 中 23 组页面流程通过；数值与交互通过不等于画质完全一致。当前仍有程序毛团的重复感与帽褶差异，单帧参考没有提供侧后面资产，未声称一比一还原。',
  },
  {
    id:'changes-gaussian-reference-preset',category:'changes',title:'一键查看参考样式，保留已存作品',status:'兼容记录',
    body:'新增“参考图样式 · 蓝色卷绒星仔”按钮，一键恢复蓝色、星形、黑帽、深灰背景和正面特写，桌面采用 80,000 档，新访问窄屏仍采用 32,000 档。查看参考样式不会自动覆盖已存高斯搭配，原三个入口、收藏、草稿、陪伴笔记与个人项目记录保留。旧保存参数仍优先读取；几何生成算法升级会影响旧参数重新生成的外观，旧 PLY 文件内容不变。保存操作仍由“记住这组搭配”明确触发。',
  },
  {
    id:'principles-gaussian-raised-fleece',category:'principles',title:'用毛团体积与弯曲细绒匹配短卷绒',status:'本轮实现原理',
    body:'每个毛团最多由两个有体积的暗芯高斯和十个沿多条曲线排列的细绒高斯构成，协方差长轴沿曲线导数定向；半径、高度、曲率、根点、毛流角和颜色按种子打散。下垂切向决定整体毛流，暗芯与亮绒色差表现凹凸，帽缘依据周围身体及毛层包络避开穿插。身体、帽子和眼睛均保留三维厚度，可以环绕查看并导出。这里的遮蔽、帽褶明暗与眼睛反光仍是程序烘焙常数色，没有多视角训练或实时重光照；二维像素过滤沿用上一轮 Mip-Splatting 部分方法。',
    links:[{label:'Kerbl 等 2023：3DGS 表示与训练',url:'https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/'},{label:'Yu 等 2024：Mip-Splatting 原论文',url:'https://www.cvlibs.net/publications/Yu2024CVPR.pdf'}],
  },
  {
    id:'progress-gaussian-fur-refinement',category:'progress',title:'高斯展台细化卷绒、眼睛和帽子',status:'已实现并验证',
    body:'根据用户提供的蓝色毛绒星形截图细化现有高斯展台：加厚填充轮廓，用暗毛根和多段卷曲毛簇形成短卷绒起伏，打散毛簇方向、相位、尺度与根点，并加入短碎毛以减少重复孔纹。眼睛增加凸起玻璃感和烘焙反射，帽子增加厚度、褶皱与短绒。新增 80,000 个高斯特写档和“靠近看毛绒”按钮，新访问窄屏采用 32,000 个高斯均衡档。379 项自动测试及 Chromium / SwiftShader 中 22 组页面流程通过，实际截图检查正面、侧面、特写及窄屏布局，保存分享、PLY 往返和旧存储保留仍通过。当前程序资产比上一版更细，但仍有均匀毛簇与烘焙光照的限制，尚未达到参考截图的真实毛绒质感；本次软件 GPU 检查不代表真实手机性能。',
  },
  {
    id:'changes-gaussian-refinement-preservation',category:'changes',title:'高斯外观升级保留作品数据与已有页面',status:'兼容记录',
    body:'原绒毛创作、小世界、陪伴工作室及各自存储继续保留。高斯搭配沿用 plush-gaussian-lab-v1 和分享参数，已有精细度选择继续生效；升级的是程序生成算法，因此同一旧种子重新生成的几何外观会变化。原先导出的 PLY 文件保留其资产，可重新导入查看。新增特写观察会改变相机距离，“回到正面”同时恢复完整取景。',
  },
  {
    id:'principles-gaussian-mip-linear',category:'principles',title:'高斯像素过滤与线性颜色合成',status:'论文理解与数值验证',
    body:'借鉴 Mip-Splatting 的二维过滤：屏幕协方差加 0.1 像素平方的低通项，并乘 sqrt(det(C) / det(C + sI)) 补偿透明度，减少缩放时细毛过亮或过粗；这仅采用论文二维过滤部分，没有其训练阶段三维平滑。高斯颜色在半浮点线性颜色缓冲中混合，最终由 OutputPass 转为 sRGB，硬件不支持半浮点目标时回退 8 位。实际 WebGL 重叠双色高斯及反向深度验证与解析预期像素一致。材质、毛根遮蔽和眼睛反光仍写入常数颜色，不具备高阶球谐或随视角更新的真实反射；增加点数不能代替真实材质与训练资产。',
    links:[{label:'Yu 等 2024：Mip-Splatting 原论文，第 5.2 节公式 10',url:'https://www.cvlibs.net/publications/Yu2024CVPR.pdf'},{label:'Three.js 作者文档：线性颜色工作空间与 OutputPass',url:'https://threejs.org/manual/pages/color-management.html'}],
  },
  {
    id:'progress-gaussian-splat-lab',category:'progress',title:'新增独立的 3D Gaussian Splatting 毛绒实验',status:'已实现并验证',
    body:'新增 splat.html，程序生成三维高斯毛绒，支持三种造型、种子、毛色、蓬松度、帽饰、环绕、整体弹跳、PNG 与 PLY 资产交换。通过协方差投影与有序透明混合绘制。2026-10-02 的 372 项自动测试通过；Chromium / SwiftShader 浏览器验证 21 组流程，检查实际画面变化、保存分享、PLY 往返、错误导入保留、论文入口和旧存储保留，并检查 1440px 与 390px 布局。修复了毛簇遮住眼睛、窄屏取景、旧分享链接覆盖新保存以及论文被个人记录筛选隐藏的问题。当前没有多视角训练、高阶球谐或局部动态绑定，未声称复现原论文性能或参考视频画质；真实手机性能仍需测试。',
    links:[{label:'Kerbl 等 2023：3D Gaussian Splatting 作者项目页',url:'https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/'}],
  },
  {
    id:'changes-gaussian-additive-branch',category:'changes',title:'高斯实验与已有创作并列保留',status:'新增分支',
    body:'高斯实验采用独立入口和配置，不替换原绒毛实验室、world.html 小世界或 studio.html 陪伴工作室。原配方、局部表面场、收藏、笔记与项目补充继续保留。高斯参数描述外观体积，旧局部笔刷描述毛根表面，两种数据没有自动互转；本轮不把旧作品伪装成经过训练的高斯资产，也不改变原有三项论文实验在各页面的启用差异。',
  },
  {
    id:'principles-engine-and-research',category:'principles',title:'Three.js 是底座，论文方法决定表示与计算',status:'理解补充',
    body:'使用 Three.js 不等于没有研究依据：引擎负责相机、场景和 WebGL，毛绒外观还取决于纤维或层壳表示、着色与导向链运动。原实验室已有 Shell 的部分实现、动态 FTL 核心算法的稀疏近似及湿毛聚集的现象启发；小世界使用默认 FurCoat，工作室嵌入小世界，并未自动启用这三项实验。新的高斯分支研究另一种外观表示，不能据此声称所有页面都已升级为论文完整系统。',
  },
  {
    id:'principles-gaussian-covariance',category:'principles',title:'3D 高斯的协方差如何变成屏幕毛簇',status:'本轮方法范围',
    body:'一个三维高斯有中心、三个轴向尺度和旋转，协方差由旋转与尺度平方组成，透明度决定贡献强度。相机变换与透视投影的局部导数把它投成二维椭圆，片元按椭圆距离计算平滑高斯权重，再按深度顺序 alpha 混合。狭长且方向不同的高斯可以构成毛簇，区别于固定大小圆点；它们仍不具有单根毛发的根尖拓扑、段长约束或接触力。',
    links:[{label:'3DGS 原论文：表示、投影与合成公式',url:'https://arxiv.org/html/2308.04079v1'}],
  },
  {
    id:'principles-gaussian-training-boundary',category:'principles',title:'程序生成高斯与照片训练是两个阶段',status:'范围说明',
    body:'Kerbl 等的完整方法从带相机标定的多视角图像与稀疏点云出发，优化高斯位置、协方差、透明度与球谐颜色，并增密、拆分和剪枝。本轮直接按种子构造资产，采用常数颜色和前向绘制，没有训练图像、反向传播、原 CUDA tile 栅格器或高阶球谐方向色。可以称为程序化 3D 高斯表示与绘制实验，不能称为多视角重建或原论文完整复现。',
    links:[{label:'3DGS 作者实现与训练说明',url:'https://github.com/graphdeco-inria/gaussian-splatting'}],
  },
  {
    id:'principles-shell-paper-reading',category:'principles',title:'理解 Shell 论文：用体积切片表示绒毛厚度',status:'部分方法已参考',
    body:'Lengyel 等 2001 年研究用层壳采样毛发体积，并以轮廓 fins 改善侧视、lapped textures 覆盖复杂曲面。它回答“如何较便宜地画出绒毛”，并不自动给出完整毛发动力学。本项目取层壳和剪切思路，使用固定程序截面纹理；未实现 fins 或 lapped 映射，因此星角和侧视轮廓仍需检查。后续应先验证轮廓缺口、过滤与透明排序，再考虑补齐相关部分。',
    links:[{label:'Lengyel 等 2001 原论文',url:'https://www.hhoppe.com/fur.pdf'}],
  },
  {
    id:'principles-ftl-paper-reading',category:'principles',title:'理解动态 FTL：保长投影之后还要修正速度',status:'核心算法的稀疏近似',
    body:'Müller 等 2012 年从固定根部逐段投影，将每个粒子放回距上一粒子为静止段长的球面；动态版本还利用下一粒子的投影修正量更新速度，以缓解直接 FTL 的异常质量效果。本项目只求解 32 根六段导向链，再让绘制纤维插值跟随，另加回弹目标与阻尼。固定根和段长可测，并不意味着已拥有逐根弹性杆、论文密度网格中的毛发互相排斥与摩擦。',
    links:[{label:'Müller 等 2012 原论文：动态 FTL 与速度修正',url:'https://matthias-research.github.io/pages/publications/FTLHairFur.pdf'}],
  },
  {
    id:'principles-wet-paper-reading',category:'principles',title:'理解液毛论文：湿润是液体输运与毛发受力',status:'目前仅外观启发',
    body:'Fei 等 2017 年把毛发离散杆、沿毛流动的薄液层、液桥表面张力与周围液体交换连接起来，解释毛发为何吸水、聚成毛束和滴落。本项目让毛尖靠近固定中心、改变湿润颜色与根部遮蔽，只借鉴聚集现象；没有水量、输运、液桥力或液体与毛发双向耦合。后续若做物理湿毛，应先建立可检验的两束液桥与含水量实验，再扩展完整流体系统。',
    links:[{label:'Fei 等 2017 原论文与作者资料',url:'https://www.cs.columbia.edu/cg/liquidhair/'}],
  },
  {
    id:'principles-gaussian-tools-evidence',category:'principles',title:'论文、工具产品和演示证据分别说明',status:'理解补充',
    body:'Gaussian Splatting 是表示与绘制方法，Kerbl 等 2023 是相关原论文；LichtFeld Studio 提供训练、查看和编辑工具，SuperSplat 提供浏览器资产编辑与发布。帖子提到 Blender MCP，表示作者使用了让 Agent 操作 Blender 的连接能力，未给出具体插件或完整操作日志。用户截图能支持“蓝色毛绒星形角色在编辑器中显示”，不能单独证明训练流程、实时变形、精确毛发模拟或我们已经达到相同画质。',
    links:[{label:'LichtFeld Studio 作者仓库',url:'https://github.com/MrNeRF/LichtFeld-Studio'},{label:'SuperSplat 作者仓库',url:'https://github.com/playcanvas/supersplat'}],
  },
  {
    id:'roadmap-gaussian-verification',category:'roadmap',title:'先验证高斯表示与画面，再讨论画质提升',status:'验证路线',
    body:'验证分开进行：数值检查尺度正值、单位四元数、有限协方差与投影；用重叠不同色高斯确认深度与透明合成；绕角色检查椭圆变化、轮廓、近裁剪和排序跳变；资产导出再导入核对字段与外观。再在相同视角、尺寸、光照下比较原纤维与高斯画面，并记录设备、点数、帧耗时和内存。程序资产没有真实参考照片，不能给它虚构 PSNR、SSIM 或训练指标。',
  },
  {
    id:'roadmap-gaussian-trained-hybrid',category:'roadmap',title:'后续：训练资产、局部编辑与混合角色',status:'计划中',
    body:'先完善本页透明排序、过滤和资产兼容，再用自有 Blender 场景输出多视角图像，建立外部训练与未参与训练视角的比较流程。需要研究高阶球谐方向色、编辑后的光照一致性，以及高斯与角色表面或骨骼的绑定。可保留原纤维用于梳理、修剪、触碰，高斯用于复杂静态外观和场景；陪伴记忆与 Agent 事件仍由工作室管理。这些训练、动态绑定与混合能力尚未实现。',
    links:[{label:'3DGS 原论文与资料入口',url:'https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/'}],
  },
  {
    id:'progress-studio-agent-display',category:'progress',title:'毛绒角色成为 Agent 执行展示入口',status:'已实现',
    body:'工作室新增 Agent 展示面板，提供整理笔记、检查提醒、工作室概览三个真实本地任务。角色卡片显示任务状态，面板展示执行步骤、调用工具和结果；支持逐步继续、自动执行、停止、导出和将结果编辑为新笔记。结果读取本机快照，记录变化时提示重新运行；任务不会自动保存结果。当前是固定流程的本地执行器，尚未接入外部模型与自主规划。本轮 345 项自动测试及页面固定元素与面板关联检查通过。浏览器工具启动失败，实际页面布局与点击流程仍需实机检查。',
  },
  {
    id:'principles-studio-agent-events',category:'principles',title:'用执行事件连接角色、步骤和工具结果',status:'当前实现',
    body:'本地执行器按读取记录、整理计算、生成结果三个步骤发出 started、step、completed、failed 或 cancelled 事件，界面只显示事实状态与工具结果。每次运行拥有独立取消信号，异步回调检查当前运行身份，离开页面取消任务。逐步查看在阶段之间真实等待用户，继续后才执行后续步骤；AI 聊天与任务执行使用独立状态。新增展示不读取旧配方或改变作品，不把固定摘要声称为模型生成。',
  },
  {
    id:'roadmap-studio-agent-visualization',category:'roadmap',title:'从陪伴角色扩展为可视化 Agent 工作台',status:'计划中',
    body:'计划让用户用自然语言描述目标，由模型选择受限工具，毛绒角色展示工作、等待确认、完成和失败；用户可以检查产出，再决定保存或执行写操作。后续可按创作、整理、提醒设置不同角色，展示多个 Agent 的分工和协作。真实模型、工具规划、后台执行、长期记忆与多 Agent 调度仍未实现；先完善可观测执行、取消和可检查产出，再新增外部服务。',
  },
  {
    id:'progress-companion-studio',category:'progress',title:'新增毛绒陪伴工作室',status:'已完成',
    body:'studio.html 将原有绒毛创作、小世界与生活记录连接起来。可写作、编辑和搜索笔记，添加与延期页面提醒，完成提醒后留下回忆；支持 JSON 记录导出与 Markdown 笔记导出。真实 AI 尚未启用，页面明确显示待接入；提醒只在网页打开时检查。本轮全部 320 项自动测试、三个页面构建及静态资源与导航检查通过。浏览器自动化工具启动失败，工作室的实际布局、WebGL 互动和下载落盘仍需人工检查。',
  },
  {
    id:'changes-companion-isolation',category:'changes',title:'保留旧创作，陪伴记录独立保存',status:'已完成',
    body:'陪伴笔记、提醒、对话与回忆使用 plush-companion-studio-v1，原有配方、作品收藏和局部毛绒编辑不进入此存储。小世界作为同源嵌入页面复用；新增草稿竞争保护，避免关闭旧工作室时覆盖另一个页面的新创作。笔记与提醒编辑检查原始字段，拒绝旧表单覆盖另一页的新修改或恢复已删除记录；保留表单输入并允许另存为新记录。修改提醒标题会保留原有到点时间的秒与毫秒，自动到期检查不会导致表单冲突。',
  },
  {
    id:'principles-companion-events',category:'principles',title:'成长依据实际完成的互动与记录',status:'当前实现',
    body:'工作室与小世界通过同源 postMessage 通信，同时校验发送窗口、来源、动作白名单与数据字段。挥手、捡回球、保存笔记和完成提醒之后才创建回忆，重复事件按 eventId 去重。成长依照相遇、笔记、共同活动三个里程碑；未登录或隔天回来不会倒扣进度。',
  },
  {
    id:'principles-companion-ai-contract',category:'principles',title:'AI 接口保留，草稿由用户确认',status:'接口已备，AI 待接入',
    body:'本地服务提供状态查询、32 KiB 请求上限、来源检查、对话和提醒草稿格式校验，但不读取密钥、不向外部 AI 发请求。后续上下文只准备最近对话及逐页勾选的笔记；模型提出的笔记或提醒必须进入可编辑表单，用户确认后保存，时间不明确时保持空白。',
  },
  {
    id:'roadmap-companion-everyday',category:'roadmap',title:'下一步：真实 AI、记忆与日常陪伴',status:'计划中',
    body:'在明确授权提供方与数据传输范围后接入真实 AI，逐步增加语音、表情联动、可查看与删除的长期记忆、个人目标和分支故事。后台推送、跨设备同步、备份恢复、日常照料与创作材质导入仍需开发；优先让用户能控制记录与提醒，再扩展养成内容。',
  },
  {
    id:'progress-world-ball-bounce',category:'progress',title:'修复小球落地后直接静止的问题',status:'已完成',
    body:'上一版在抛物线飞行结束后直接把球放到最终落点，因此看不到触地弹跳。本轮追加“弹跳落地”阶段：球先落到目标前方，再经过三次高度递减的弹跳和末段滚动，角色在首次触地时开始追球，等球停稳且走到球旁才捡起。既有随机投球、自选落点、返回和回应流程继续保留，球停稳后停止旋转。全部 260 项自动测试通过，包括旧版 253 项与新增弹跳检查 7 项；真实浏览器完成自动与自选前方落点各一轮，捡回计数依次为 1/2，两轮均观察到弹跳阶段的小球离地及地面投影。旧作品与家具继续保留。',
  },
  {
    id:'changes-world-ball-ground-feedback',category:'changes',title:'增加弹跳阶段反馈并统一暂停与取消',status:'已完成',
    body:'玩法反馈从五步骤增加为六步骤，加入“弹跳落地”，让抛球、触地、追球、拾取、返回和回应的变化可见。球第一次接触地面后角色开始追赶，拾取等待球停稳；暂停统一冻结飞行、弹跳、滚动、旋转和角色行动，收起玩具、Esc 或切换场景沿用原取消规则。新阶段和运动仍是页面临时状态，不进入作品草稿、收藏或分享代码。浏览器确认弹跳时暂停的截图像素保持一致，恢复后继续完成捡回；弹跳阶段按 Esc 后丢球按钮恢复可用、收起按钮禁用，计数仍为 2。390 × 844 窄屏下内容宽 375，六步骤与控件可见且无横向溢出，控制台没有警告或错误；该检查不代表真实手机持续性能已经验证。',
  },
  {
    id:'principles-world-ball-bounce-animation',category:'principles',title:'球的衰减弹跳、滚动与旋转采用运动学动画',status:'已完成',
    body:'投球先落到出发路径的最后一段、距最终目标最多 0.4 场景单位的位置，随后在约 1.42 秒的弹跳阶段里执行三次衰减弹跳和末段滚动，最终停在原定的可达落点。角色在首次触地时追球，但要同时满足球停稳和角色到达才进入拾取。飞行旋转按时间增量推进，滚动旋转按位移累计，停稳不转；暂停停止时间推进，取消清理临时状态。新增 7 项弹跳检查随全部 260 项测试通过，浏览器确认自动与自选落点、暂停恢复和弹跳期间取消。这里使用确定的曲线与状态机，尚无真实刚体碰撞、摩擦求解或球与家具的物理反弹。',
  },
  {
    id:'progress-world-fetch-play',category:'progress',title:'新增丢球、追球、捡回和回应玩法',status:'已完成',
    body:'在小世界原有布置、走路、沙发、抚摸与吹风互动之上追加完整玩法：丢球 → 角色绕开家具追球 → 拾取 → 返回投球起点 → 给出回应。提供可达随机落点和“自己选落点”两种方式，支持房间、花园和展厅。全部 253 项自动测试通过，包括原有 233 项与新增玩法 20 项；真实浏览器完成自动和自选各一轮，计数依次为 1/2，角色回到投球起点。花园沙发坐姿投球也完成起身、捡回和回应，独立检查计数为 1。旧角色、家具布局、工作室创作、草稿和收藏继续保留。',
  },
  {
    id:'changes-world-fetch-controls',category:'changes',title:'新增投球、选落点与收起玩具入口',status:'已完成',
    body:'新增“丢球给它”“自己选落点”和“收起玩具”控件及五阶段反馈。布局、场景、种子、造型、毛料、作品切换与撤销/重做会取消任务；切换陪伴/布置或开启抚摸也会取消，地面走路、坐下和手动跳跃先取消旧任务再执行新动作。普通换装、毛色与灯光可以继续。小球、游戏进度和本次捡回次数不进入草稿、分享或收藏，最终角色位置仍按原方式保存；旧空布局也能玩球，展厅临时地板在完成后保留至收起或取消时恢复。浏览器确认误点角色保留选择模式、暂停数十秒阶段和计数不变、收起后可再选落点；切换展厅即时清理任务且次数不变，恢复原花园后还能继续玩。起身途中按 Esc 会提示先平稳站到沙发前，到安全入口后不增加计数。390 × 844 窄屏下五步骤和三按钮完整可见，无横向溢出；该检查验证响应式布局，未覆盖真实手机完整触摸操作。',
  },
  {
    id:'principles-world-fetch-state',category:'principles',title:'丢球采用抛物线与分阶段路径动画',status:'已完成',
    body:'投球轨迹使用按时间推进的抛物线动画；角色沿二维路径绕开场景物件和新增家具，任务状态连接投球、追赶、拾取、携带返回与回应。落点与返回点同时检查地面范围、角色尺寸及路径可达性；沙发坐姿先过渡到安全入口，起身期间取消仍需平稳站好。暂停统一停止时间推进，取消清理瞬时球、路线与反馈。新增 20 项玩法测试随全部 253 项检查通过，浏览器确认往返、暂停与坐姿取消边界。球运动、拾取与携带属于运动学动画，尚无刚体碰撞、腿部骨骼、关节拾取、软体或布料求解。',
  },
  {
    id:'roadmap-world-play-expansion',category:'roadmap',title:'丢球之后：照料、自主活动与更多玩具',status:'计划中',
    body:'在丢球闭环稳定后，计划增加投喂、喝水、睡觉与醒来，逐步建立可取消、可暂停且反馈一致的照料流程；再考虑角色自主活动、多角色追逐和不同玩具。产品方向包括把玩耍结果记入陪伴日志、保存偏好和设计轻任务，同时继续探索局部毛绒创作互通、骨骼与布料接触以及真实设备持续性能。这些方向仍未实现，后续以新增模块和兼容字段扩展，保留旧作品与旧玩法。',
  },
  {
    id:'progress-world-editable-room',category:'progress',title:'新增家具布置与走到沙发坐下的流程',status:'已验证',
    body:'在独立小世界里新增小沙发、小圆桌、落地灯、绿植和软垫，打通“设计角色 → 布置房间 → 点击沙发走过去坐下 → 保存小世界”的核心流程。三个场景分别保存最多 8 件新增家具，支持摆放与角色位置、座位记录；本轮全部 233 项自动测试通过，浏览器已验证三场景独立布置、真实圆桌拖动及整次拖动的一步撤销/重做、沙发步行入座和起身及刷新恢复坐姿，控制台无警告或错误。原工作室、所有旧角色材质、局部创作、收藏、草稿和此前小世界继续保留，不删除旧创作；新增家具不替换原有场景布景。',
  },
  {
    id:'changes-world-furniture-editor',category:'changes',title:'家具编辑与小世界保存格式扩展',status:'已验证',
    body:'本轮新增家具编辑模式，提供拖动摆放、箭头微调位置、每次旋转 45°、改色、删除和撤销修改。角色模式点击沙发触发走到接近点、平滑坐下和起身；布局、位置和座位加入草稿、收藏和分享数据，旧版未包含这些字段的世界默认保留原有外观并从空布局、站立位置开始。浏览器已确认场景布局独立和刷新后恢复坐姿；画布上真实拖动圆桌从 (-2.1,-2.1) 到 (1.78,0.52)，一次撤销恢复原位置，一次重做恢复拖动结果，整次拖动没有拆成许多撤销步骤。',
  },
  {
    id:'principles-world-placement-and-seating',category:'principles',title:'布置与坐下采用程序几何、路径和姿态近似',status:'已验证',
    body:'家具由固定程序几何构建，沙发使用连续法线的圆角几何与哑光材质，没有随帧随机纹理。布局以 x/z 地面坐标、Y 轴旋转和颜色保存，物件范围及间距通过旋转矩形检查。角色沿避开家具的二维路径移动，沙发坐位与接近点按物件旋转变换到世界坐标，再通过状态机平滑过渡走路、坐下和起身。浏览器已验证沙发路径移动与入座、起身及坐姿刷新恢复。这里的移动、姿态及软度属于实时近似，尚无腿部骨骼、真实坐姿关节、软体沙发变形或布料求解；此轮验证不代表这些尚未实现的物理能力。',
  },
  {
    id:'roadmap-world-room-to-play',category:'roadmap',title:'房间流程之后：更多物件行为与自由创作',status:'计划中',
    body:'待家具布置与坐下流程验证后，计划增加点击桌子喝茶、靠近植物浇水等物件行为，并研究多角色互动、家具缩放及更多原创家具。后续探索把原工作室局部修剪、染色、卷曲和梳理作品带入小世界，增加动作骨骼、布料与毛绒接触，以及作品缩略图、布局模板和动画导出。这些方向均未实现；先保持旧作品兼容、动作反馈一致和舒适短绒，再验证真实手机的持续性能与更复杂的物理。',
  },
  {
    id:'progress-plush-world-v1',category:'progress',title:'独立小世界第一版已接入',status:'已完成',
    body:'新增独立 world.html 入口，提供 8 种造型、3 种毛料、6 组配色，手动可选 3 种帽饰加无、3 种着装加无、2 种配饰加无，以及 3 场景、3 灯光、3 性格。支持旋转、弹跳、问候、抚摸和吹风，可保存 8 个小世界与生成短分享代码。全部 196 项自动测试通过，其中新增配置 10 项；浏览器已检查形体、毛料、场景、换装、分享、收藏同步与互动，390 × 844 无横向溢出，控制台无警告或错误。PNG 下载入口和中文文件名已确认，实际下载落盘未确认；小世界构建包约 609.2 KB，真实设备持续性能待验证。',
  },
  {
    id:'changes-world-locks-and-history',category:'changes',title:'种子搭配支持六组锁定与独立草稿',status:'已实现',
    body:'小世界按种子生成，造型、毛料、配色、着装、场景与性格六组可锁定；场景同时锁住灯光，着装保留帽饰、衣服和配件，只换衣保留种子并确保至少一个着装项发生变化。配置修改支持最近 20 步撤销/重做，调色一次记一步，中文名字按 Enter 保存。收藏写前重读最新集合，损坏数据阻止覆盖，双页面同步列表并保留未提交名字。浏览器确认有效衣服修改撤销/重做精确恢复 URL、分享导入完整恢复、坏代码保留原状态。本机草稿与 8 件收藏独立于工作室 recipe、局部创作和草稿；锁定与瞬时动作不进入分享。',
  },
  {
    id:'principles-world-procedural-sets',category:'principles',title:'小世界使用确定布局与静态着装几何',status:'当前实现',
    body:'种子哈希驱动确定生成，按场景和性格挑选协调搭配；浏览器已确认同一 URL 重现配置与形体锁定保留。三维场景由哑光几何构成，中央为角色留出空间，轻摆采用固定正弦而非随帧随机。服装根据造型曲面生成静态几何，整体随角色移动，没有真实布料求解或绒毛接触；场景点击采用灯光、角色动作与文字反馈的简化联动，尚无家具物理或自主行为。此次浏览器验证覆盖显示与交互，不代表上述未实现物理能力。',
  },
  {
    id:'roadmap-world-expansion',category:'roadmap',title:'后续：布置、多角色与创作互通',status:'计划中',
    body:'计划增加家具摆放与场景编辑、多角色陪伴、服装运动与接触求解，并研究将原工作室局部修剪、染色、卷曲和梳理作品带入小世界。之后可探索浇花、整理房间等轻任务。上述方向均未实现，需分别设计保存格式、交互反馈和真实性能验证，不能把现有点击动作视为完整任务系统。真实设备持续性能仍需另行测试；桌面窄屏通过不等于手机长期运行已经验证。',
  },
  {
    id:'progress-project-journal',category:'progress',title:'项目记录进入工作室',status:'已完成',
    body:'新增独立的项目记录入口，按进展、修改、原理和未来方向整理工程内容。可以补充标题与正文，编辑已保存的记录，在本机刷新恢复，并导出 Markdown。未保存的输入在本次页面关闭再打开时保留；内置记录由工程维护者持续追加。',
  },
  {
    id:'changes-journal-search-backup',category:'changes',title:'记录支持搜索和备份迁移',status:'已完成',
    body:'增加标题、正文、中文分类和参考名称搜索，多词需同时匹配；可筛选项目内置或我的补充，各分类显示命中数量。JSON 备份只包含已保存的个人补充，导入前先检查，再追加新记录；重复跳过，冲突保留本机版本并说明结果。',
  },
  {
    id:'principles-journal-isolation',category:'principles',title:'记录数据与毛绒作品独立',status:'当前实现',
    body:'记录使用独立的本机存储键，不进入配方、局部笔刷历史或作品草稿。JSON 导入先验证整包，再读取最新本机集合并一次写入；格式错误、容量不足或保存失败不会部分导入。未保存表单不进入备份，源码改动也不会自动生成项目日志，内置内容仍需人工维护。',
  },
  {
    id: 'progress-soft-baseline', category: 'progress', title: '保留舒适的短绒视觉基线', status: '已完成',
    body: '以用户认可的奶油短绒截图为基准，默认毛长 0.09、密度 90k，保留柔和亮度与密实轮廓。降低逐纤维亮点和高光，采样不使用随帧变化的随机噪声；不同设备上的时间混叠仍需实际检查。',
  },
  {
    id: 'progress-eight-by-eight', category: 'progress', title: '八种造型与八种材质可以搭配', status: '已完成',
    body: '角色已扩展为蓝莓、抹茶、奶油、葡萄、蜜桃、兔兔、团熊和星仔。八种材质覆盖短绒、长毛、卷绒与湿润外观；造型和材质分别选择，原有预设继续保留。',
  },
  {
    id: 'progress-local-studio', category: 'progress', title: '局部创作与组合步骤已接入', status: '已完成',
    body: '创作面板支持修剪、染色、卷曲、恢复与持久梳理。默认一次拖动记一步，也可组合多次操作后整组撤销；停止涂画后可以旋转角色，继续编辑另一面。',
  },
  {
    id: 'progress-works-and-export', category: 'progress', title: '作品可以收藏、导入与带走', status: '已完成',
    body: '提供六份灵感配方、本机最多 12 件收藏、配方链接与代码导入，以及透明 PNG 和 1280 × 1600 名字卡片。收藏与最近草稿仅保存在当前浏览器，尚无账号或云同步。',
  },
  {
    id: 'progress-optional-experiments', category: 'progress', title: '研究方法作为可选效果加入', status: '已完成',
    body: '论文实验面板提供层壳短绒、毛束聚集和保长动力学，可以切回原有渲染。纤维模式另有可选毛流随动与简化身体、配饰接触；这些能力没有替换八种造型和八种材质。',
  },
  {
    id: 'changes-flicker-treatment', category: 'changes', title: '修正闪烁感并恢复柔和短绒', status: '已完成',
    body: '针对细毛的采样亮点，长毛改用连续透明混合，关闭 alpha-to-coverage 与毛束深度写入，并减弱高频色差和高光。随后按用户参考图恢复密实短绒；这属于抗锯齿和光照调整，未实现 TAA。',
  },
  {
    id: 'changes-truthful-feedback', category: 'changes', title: '提示依据实际编辑结果更新', status: '已完成',
    body: '修复未命中、重复修剪和写入失败仍报告成功的问题。现在按真实 Float32 变化累计这一笔的结果，显示实际工具与原因；未变化不增加笔触，修剪已到最低 8% 时也不会再建议降低比例。',
  },
  {
    id: 'changes-lossless-checkpoints', category: 'changes', title: '从笔触上限改为持续叠加', status: '已完成',
    body: '近期缓存累计到 512 条实际变化后，将当前表面场保存为无损 Float32 检查点，再继续记录新笔触。合并保留此前毛长、卷度与染色效果；512 是缓存阈值，连续创作不再因总笔触数到达它而停止。',
  },
  {
    id: 'changes-shared-history', category: 'changes', title: '统一撤销历史，支持跨合并与组合', status: '已完成',
    body: '修剪、染色、卷曲、恢复、梳理和两种清除操作共用最近 24 步历史，记录检查点、近期笔触与毛流。组合内多次操作合为一步，空组合保留重做；局部历史不改变整体材质与运动开关。',
  },
  {
    id: 'changes-protected-drafts', category: 'changes', title: '最近草稿与旧作品继续兼容', status: '已完成',
    body: '编辑后约 450 ms 保存最近草稿，松手和离开页面时刷新保存。同一分享链接刷新可找回未收藏的修改，新链接优先；旧版配方和收藏键继续兼容。恢复草稿保留作品效果，但不恢复本次编辑的撤销历史。',
  },
  {
    id: 'principles-fiber-rendering', category: 'principles', title: '短绒与长毛采用不同绘制方式', status: '当前实现',
    body: '云朵绒和短天鹅绒使用实例化细线，长毛等材质使用渐细 ribbon 毛束，共享毛根采样与 GPU 曲线计算。毛发弯曲按归一化方向分段积分；当前光照是实时外观近似，没有完整物理散射或逐根透明排序。',
  },
  {
    id: 'principles-local-surface-field', category: 'principles', title: '局部笔刷写入固定表面场', status: '当前实现',
    body: '128 × 64 表面场保存毛长比例、卷度变化、染色覆盖与线性预乘 RGB。作用范围按静止曲面上的三维距离计算，减轻 UV 接缝与背面串色；检查点保存原 Float32 值，加载时先恢复检查点，再顺序重放近期笔触。',
  },
  {
    id: 'principles-shell-fur', category: 'principles', title: 'Shell：层壳采样与剪切近似', status: '当前实现',
    body: '参考 Lengyel 等的实时毛发方法，用 32 层曲面与固定纤维截面纹理表现短绒厚度，支持风吹剪切和共享按压。仅实现层壳部分，没有轮廓 fins、lapped textures 或完整光照模型；此模式暂不支持局部创作与简化接触。',
    links: [{label: 'Lengyel 等作者项目页', url: 'https://www.hhoppe.com/proj/fur/'}],
  },
  {
    id: 'principles-dynamic-ftl', category: 'principles', title: 'FTL：稀疏导向链的保长运动', status: '当前实现',
    body: '参考动态 Follow-The-Leader，用 32 根六段导向链执行固定毛根、定长投影和速度修正，并加入本项目的回弹与阻尼。渲染纤维插值跟随导向链；尚无逐根真实弹性杆、毛发间碰撞或精确网格接触，参数采用相对或场景单位。',
    links: [{label: 'Fast Simulation of Inextensible Hair and Fur', url: 'https://matthias-research.github.io/pages/publications/FTLHairFur.pdf'}],
  },
  {
    id: 'principles-wet-bundles', category: 'principles', title: '湿毛束：几何聚集与根部遮蔽', status: '当前实现',
    body: '参考湿毛研究中的聚集现象，让邻近毛尖朝固定毛束中心靠拢，并配合湿润颜色与根部遮蔽。当前没有液桥、液体流动、表面张力或液体与毛发耦合求解；根部遮蔽也不等于真实自阴影，因此不是论文的完整复现。',
    links: [{label: 'Fei 等液体与毛发研究', url: 'https://www.cs.columbia.edu/cg/liquidhair/'}],
  },
  {
    id: 'roadmap-batched-refresh', category: 'roadmap', title: '优先：绘制按帧批量刷新', status: '计划中',
    body: '计划把同一帧的多个笔触集中处理，只刷新一次局部纹理和导向链，并缩小表面场的扫描范围。目标是减少快速涂画的重复计算；需要记录实际帧耗时，并在真实手机上验证响应、发热与持续运行。',
  },
  {
    id: 'roadmap-surface-strokes', category: 'roadmap', title: '优先：连续笔触贴合曲面', status: '计划中',
    body: '计划使用更完整的连续输入样本，按路径距离补点并投回角色表面，改善小笔刷快划、兔耳和星角上的间距与断点。目标是让慢画、快画和不同曲面上的修剪、染色轨迹更一致。',
  },
  {
    id: 'roadmap-group-summary', category: 'roadmap', title: '优先：组合摘要与步骤预览', status: '计划中',
    body: '组合编辑目前已经可以整组撤销，后续计划显示组内工具与次数，例如“修剪 × 2 → 染色 × 1 → 梳理 × 1”。完成前预览、撤销时明确回退范围，让多次混合操作更容易判断与检查。',
  },
  {
    id: 'roadmap-work-versions', category: 'roadmap', title: '优先：作品缩略图与版本管理', status: '计划中',
    body: '在现有收藏、草稿和分享基础上，计划增加缩略图、原位更新、作品版本与前后对比。目标是保留重要创作阶段、找回满意的外观；这些作品管理能力尚未实现，当前仍是一个最近草稿与最多 12 件收藏。',
  },
  {
    id: 'roadmap-deeper-physics', category: 'roadmap', title: '后续：增强接触、材质与动画', status: '计划中',
    body: '先改善创作流畅度与作品管理，再研究精确配饰碰撞、毛束之间的作用、真实压力传递、自阴影与散射，并探索层壳轮廓 fins 和动画导出。目标是在保持舒适短绒基线的同时逐步增强物理可信度；这些方向均需另行实现与验证。',
  },
];
