export const research = {
  "date": "2026-10-02",
  "conclusion": "可复用的核心，是让现有内容变成可交互的视觉对象，并把动作接到场景流程。",
  "identity": [
    {
      "label": "原作 / 研究对象",
      "title": "Destroy Any Website",
      "text": "输入网址，把文字和页面块变成射击关卡。官方提供武器、飞行、多人和嵌入入口；本次未确认公开网页破坏 SDK。",
      "tone": "source"
    },
    {
      "label": "本地 / 独立实现",
      "title": "DestructionEngine",
      "text": "我们独立实现纹理切片、视觉表现、物理运动、区域冲击和事件接口。Matter.js 负责二维刚体；html2canvas 或浏览器截图提供画面。",
      "tone": "core"
    },
    {
      "label": "扩展 / 另建能力",
      "title": "角色、产品与工具",
      "text": "角色编排和浏览器适配扩展了引擎用途；对比、说明书、数据故事等采用独立交互。翻译、摘录、表格工具另外开发。",
      "tone": "adjacent"
    }
  ],
  "effects": [
    {
      "key": "glass",
      "name": "玻璃裂解",
      "method": "三角刚体",
      "use": "新品揭晓、冲击反馈"
    },
    {
      "key": "paper",
      "name": "纸片飘散",
      "method": "条带刚体 + 风力近似",
      "use": "邀请函、编辑内容"
    },
    {
      "key": "pixels",
      "name": "像素消融",
      "method": "纹理采样 + 粒子寿命",
      "use": "数字内容、退场转场"
    },
    {
      "key": "neon",
      "name": "霓虹聚合",
      "method": "曲线粒子 + 回收计数",
      "use": "数据汇流、收集反馈"
    },
    {
      "key": "ripple",
      "name": "涟漪揭幕",
      "method": "遮罩 + 面积采样",
      "use": "导览、轻量揭晓"
    },
    {
      "key": "classic",
      "name": "方块破坏",
      "method": "矩形刚体 + 射线命中",
      "use": "射击游戏、碰撞教学"
    }
  ],
  "pipeline": [
    {
      "title": "取得内容",
      "text": "自有 DOM 重建；扩展取当前视口截图。",
      "api": "prepare / prepareSnapshot"
    },
    {
      "title": "定位区域",
      "text": "读取 CSS 像素矩形，按目标选取纹理。",
      "api": "标记区域 / 鼠标点选"
    },
    {
      "title": "生成表现",
      "text": "几何切片、颜色粒子或渐进擦除遮罩。",
      "api": "model + EffectLayer"
    },
    {
      "title": "驱动动作",
      "text": "刚体求解、粒子插值；角色动作独立编排。",
      "api": "impactAt + onFrame"
    },
    {
      "title": "连接流程",
      "text": "命中、完成、导出与恢复，由产品处理。",
      "api": "onEvent + dispose"
    }
  ],
  "studies": [
    {
      "key": "effects",
      "group": "engine",
      "type": "直接复用引擎",
      "title": "六种表现 × 三个场景",
      "text": "同一内容切换刚体、粒子和遮罩。研究集首页、旧价揭晓和碰撞课堂提供实际任务、参数与事件。",
      "href": "lab.html#demo",
      "link": "进入效果实验",
      "image": "research/effects.png",
      "evidence": "49 项模式验证；21 项场景验证",
      "limit": "活动码是示例；没有核销或增长数据。"
    },
    {
      "key": "avatar",
      "group": "character",
      "type": "引擎 + 角色编排",
      "title": "头像角色跳出、捣乱、召回",
      "text": "角色从头像位置离开并踢击卡片，脚部冲击接入相同碎片引擎；可上传静态照片替换头部。",
      "href": "avatar/",
      "link": "体验头像出逃",
      "image": "research/avatar.png",
      "evidence": "18 项头像流程验证",
      "limit": "身体和动作预设；照片没有自动生成全身动画。"
    },
    {
      "key": "anywhere",
      "group": "character",
      "type": "引擎 + 浏览器适配",
      "title": "带到未接入的第三方网页",
      "text": "点选真实头像和图卡，浏览器截图提供纹理；只隐藏选中区域，其余网页可用，滚动或布局变化即复原。",
      "href": "avatar-anywhere/#proof",
      "link": "看 GitHub 实录与扩展",
      "image": "research/anywhere.png",
      "evidence": "21 项跨站验证；15.48 秒实际录制",
      "limit": "测试副本临时放开截图权限；下载版人工授权手势未在录像验证。"
    },
    {
      "key": "motion",
      "group": "engine",
      "type": "直接复用引擎",
      "title": "内容动效制作工具",
      "text": "上传图片、编辑文字，调节效果、粒度与片长；同一引擎实际生成可下载素材。",
      "href": "products/#motion",
      "link": "制作并导出动效",
      "image": "research/motion.png",
      "evidence": "PNG 与 3–10 秒 WebM 实际导出",
      "limit": "不是自动视频剪辑；未提供 MP4、GIF 或透明视频。"
    },
    {
      "key": "products",
      "group": "prototype",
      "type": "独立交互原型",
      "title": "五类独立交互产品探索",
      "text": "方案对比、交互说明书、数据故事、品牌展览、嵌入组件，与内容动效一起构成六工具工作台。",
      "href": "products/#compare",
      "link": "打开产品工作台",
      "image": "research/products.png",
      "evidence": "50 项产品流程验证",
      "limit": "这五类采用遮罩、SVG、数据布局或组件实现，不能归为原引擎自带能力。"
    },
    {
      "key": "toolbox",
      "group": "independent",
      "type": "独立网页工具",
      "title": "翻译、摘录、表格与小工具",
      "text": "划词翻译、双语插入、带来源摘录、CSV / JSON 表格提取、文本整理和单位换算；另有 MV3 工具箱扩展。",
      "href": "toolbox/#tables",
      "link": "打开网页工具箱",
      "image": "research/toolbox.png",
      "evidence": "30 项工具验证；19 项扩展验证",
      "limit": "翻译来自外部服务，真实遇到 HTTP 429；工具功能没有使用碎裂引擎。"
    }
  ],
  "products": [
    {
      "name": "内容动效 / 互动组件",
      "path": "动效复用；揭幕组件独立",
      "task": "运营制作新品素材；开发者接入互动反馈。",
      "current": "动效工具实际导出 PNG / WebM；另有揭幕 Web Component。",
      "next": "时间线、画幅模板、框架适配与可访问性。"
    },
    {
      "name": "品牌角色 / 创作者主页",
      "path": "直接复用 + 角色层",
      "task": "角色与页面内容互动，形成可操控体验。",
      "current": "自有主页头像出逃，跨站选取与真实 GitHub 实录。",
      "next": "角色素材包、多目标动作、命中后的业务触发。"
    },
    {
      "name": "互动教育 / 操作指南",
      "path": "物理演示 + 独立引导",
      "task": "理解冲量与碰撞，完成设备维护步骤。",
      "current": "碰撞课堂；SVG 部件说明和 Markdown 维护记录。",
      "next": "真实型号资料、热点图片、维护历史与工单。"
    },
    {
      "name": "营销活动 / 品牌展示",
      "path": "互动 + 业务服务",
      "task": "揭晓新品、展示故事、完成领取或预约。",
      "current": "示例活动码复制；三幕展览及离线 HTML 作品册。",
      "next": "资格、发放、核销、预约与真实转化衡量。"
    },
    {
      "name": "提案对比 / 数据故事",
      "path": "独立交互原型",
      "task": "对比两方案、确认选择，讲清真实数据。",
      "current": "图片滑动对比与 HTML 报告；CSV 分析、图表与摘要。",
      "next": "版本、批注、多人协作、数据接口与权限。"
    },
    {
      "name": "网页效率插件",
      "path": "另外开发",
      "task": "翻译阅读、保存来源、提取表格和处理文字。",
      "current": "工具箱及浏览器扩展，实际输出文本、笔记和表格。",
      "next": "稳定翻译服务、批量采集、同步与页面适配。"
    }
  ],
  "roadmap": [
    {
      "phase": "P1 · 先稳定现有能力",
      "title": "形成可复用的互动组件",
      "items": [
        "角色与动作素材包、多个目标、更多反馈",
        "时间线、性能预算、减少动画与键盘访问",
        "兼容矩阵；人工验证正式扩展授权流程"
      ],
      "dependency": "沿现有截图、冲击、帧回调与事件接口扩展。"
    },
    {
      "phase": "P2 · 再扩展宿主和业务",
      "title": "自己的 App 与业务接入",
      "items": [
        "WebView 由宿主提供截图、矩形和开始 / 结束",
        "原生界面增加独立渲染与坐标适配",
        "素材服务、预约、核销、数据源与协作"
      ],
      "dependency": "需要宿主合作和真实业务服务；本次没有 App 版本。"
    },
    {
      "phase": "P3 · 按价值验证决定投入",
      "title": "采集服务与多人平台",
      "items": [
        "受控 URL 采集、缓存、字体和布局兼容",
        "房间、输入校验、权威状态与重连",
        "批量制作、账号、云保存和团队工作流"
      ],
      "dependency": "需要后端与持续维护；第三方原生 App 不能通用注入。"
    }
  ],
  "sources": [
    {
      "title": "Destroy Any Website 原作",
      "url": "https://destroy.spritefusion.com/"
    },
    {
      "title": "Sprite Fusion 官方游戏说明",
      "url": "https://www.spritefusion.com/games/destroy-any-website"
    },
    {
      "title": "Matter.js 二维物理文档",
      "url": "https://brm.io/matter-js/docs/"
    },
    {
      "title": "html2canvas 原理与限制",
      "url": "https://html2canvas.hertzen.com/documentation"
    },
    {
      "title": "Chrome activeTab 权限",
      "url": "https://developer.chrome.com/docs/extensions/develop/concepts/activeTab"
    },
    {
      "title": "Chrome captureVisibleTab",
      "url": "https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab"
    }
  ],
  "evidence": [
    {
      "name": "效果模式",
      "passed": 49,
      "total": 49,
      "checkedAt": "2026-10-01T18:09:45.937Z",
      "file": "effects-checks.json"
    },
    {
      "name": "产品原型",
      "passed": 50,
      "total": 50,
      "checkedAt": "2026-10-02T02:57:52.754Z",
      "file": "products-checks.json"
    },
    {
      "name": "头像角色",
      "passed": 18,
      "total": 18,
      "checkedAt": "2026-10-02T05:14:19.942Z",
      "file": "avatar-checks.json"
    },
    {
      "name": "跨站扩展",
      "passed": 21,
      "total": 21,
      "checkedAt": "2026-10-02T05:29:37.051Z",
      "file": "anywhere-checks.json"
    },
    {
      "name": "网页工具",
      "passed": 30,
      "total": 30,
      "checkedAt": "2026-10-02T04:06:14.552Z",
      "file": "toolbox-checks.json"
    },
    {
      "name": "工具箱扩展",
      "passed": 19,
      "total": 19,
      "checkedAt": "2026-10-02T03:52:37.825Z",
      "file": "extension-checks.json"
    }
  ]
};
