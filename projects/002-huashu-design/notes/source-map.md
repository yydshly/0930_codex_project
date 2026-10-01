# 源码导航与证据索引

研究版本：0830494ecb1c117e25b313a8114fe55a6bf2b125。共 191 个文件、33 份专项资料、20 个脚本。目录信息来自 GitHub Git Tree API，保存于 [upstream-inventory.json](upstream-inventory.json)。

## 建议阅读顺序

1. README 理解定位，再读 SKILL 的范围、路由、流程和适配。
2. 按目标选择一份专项资料，不必把所有流程同时执行。
3. 回到对应脚本核对真实输入、依赖、失败行为和输出。
4. 对照 demos 和 showcases，区分能力演示、预制样例与真实业务。
5. 读取 SECURITY 和 LICENSE，确定可选外发与许可边界。

## 模块职责

| 模块 | 责任 | 研究注意点 |
| --- | --- | --- |
| SKILL.md | 路由与流程约束 | 指令不是程序保证，部分条款口径有差异 |
| references/ | 设计与实现配方 | 包含案例经验和作者偏好，需按目标取舍 |
| assets/ | 起手组件、预制样例和媒体 | 不代表完整产品；外部品牌与字体另行核查 |
| scripts/ | 转换、渲染、媒体与验证 | 每条路线的依赖不同 |
| demos/ | 能力与工作流演示 | 不是测试覆盖或稳定效果证明 |
| test-prompts.json | 六条描述性测试提示 | 不是可自动执行的完整测试套件 |

## 20 个工具脚本

| 文件 | 职责 | 阅读范围 |
| --- | --- | --- |
| [scripts/add-music.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/add-music.sh) | 将背景音乐混入视频；需要媒体工具。 | 目录与路由核对 |
| [scripts/cloud/ai-review-video.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/cloud/ai-review-video.py) | 可选云端看片，将视频片段发送到官方服务。 | 已阅读文件/片段 |
| [scripts/cloud/tts-doubao.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/cloud/tts-doubao.mjs) | 可选云端配音，输出音频及可用时间戳。 | 已阅读文件/片段 |
| [scripts/convert-formats.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/convert-formats.sh) | 派生 GIF / 插帧视频；插帧与真逐帧渲染不同。 | 目录与路由核对 |
| [scripts/design-gate-hook.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/design-gate-hook.sh) | 用户选择安装的部分渲染门槛检查；不自动安装。 | 目录与路由核对 |
| [scripts/export_deck_pdf.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/export_deck_pdf.mjs) | 多文件 HTML 页逐个打印再合并 PDF。 | 已阅读文件/片段 |
| [scripts/export_deck_pptx.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/export_deck_pptx.mjs) | 组织 HTML→可编辑 PPTX 的 A 路线。 | 目录与路由核对 |
| [scripts/export_deck_stage_pdf.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/export_deck_stage_pdf.mjs) | 单文件 deck-stage 专用 PDF 输出。 | 目录与路由核对 |
| [scripts/fetch_images.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/fetch_images.py) | 搜索并下载 Wikimedia 素材，需核对许可。 | 目录与路由核对 |
| [scripts/gen_deck_thumbs.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/gen_deck_thumbs.mjs) | 为多文件 deck 概览生成页面缩略图。 | 目录与路由核对 |
| [scripts/html2pptx.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/html2pptx.js) | 浏览器 DOM 测量与原生 PPT 对象映射。 | 已阅读文件/片段 |
| [scripts/mix-voiceover.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/mix-voiceover.sh) | 合并人声、背景音乐和视频。 | 目录与路由核对 |
| [scripts/narrate-pipeline.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/narrate-pipeline.mjs) | 解说稿→分段语音→实测时间轴。 | 已阅读文件/片段 |
| [scripts/pptx_from_rendered.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/pptx_from_rendered.py) | 已有视觉 HTML→PPTX，可使用现成模板母版。 | 已阅读文件/片段 |
| [scripts/render-narration.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/render-narration.sh) | 解说动画渲染及音轨整合。 | 目录与路由核对 |
| [scripts/render-video-seek.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/render-video-seek.js) | 由受控时钟逐帧定位截图再编码。 | 已阅读文件/片段 |
| [scripts/render-video.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/render-video.js) | 浏览器实时录制后裁切、编码。 | 已阅读文件/片段 |
| [scripts/sfx-cues.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/sfx-cues.sh) | 依据时间点清单混入动作音效。 | 目录与路由核对 |
| [scripts/verify-video.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/verify-video.sh) | 媒体参数、音轨、首尾黑帧和响度等检查。 | 目录与路由核对 |
| [scripts/verify.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/verify.py) | 浏览器截图、控制台/PageError 收集。 | 已阅读文件/片段 |

## 专项参考目录

下表为可按需阅读的路由索引；未标记阅读的文件不视为已经完整审计。

| 文件 | 本轮范围 |
| --- | --- |
| [references/ai-video-review.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/ai-video-review.md) | 目录索引 |
| [references/animation-best-practices.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/animation-best-practices.md) | 目录索引 |
| [references/animation-pitfalls.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/animation-pitfalls.md) | 目录索引 |
| [references/animations.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/animations.md) | 目录索引 |
| [references/app-prototype.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/app-prototype.md) | 目录索引 |
| [references/apple-gallery-showcase.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/apple-gallery-showcase.md) | 目录索引 |
| [references/audio-design-rules.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/audio-design-rules.md) | 目录索引 |
| [references/brand-asset-protocol.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/brand-asset-protocol.md) | 目录索引 |
| [references/camera-language.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/camera-language.md) | 目录索引 |
| [references/cinematic-patterns.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/cinematic-patterns.md) | 目录索引 |
| [references/content-guidelines.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/content-guidelines.md) | 目录索引 |
| [references/critique-guide.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/critique-guide.md) | 已阅读文件/片段 |
| [references/design-context.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/design-context.md) | 目录索引 |
| [references/design-styles.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/design-styles.md) | 已阅读文件/片段 |
| [references/editable-pptx.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/editable-pptx.md) | 已阅读文件/片段 |
| [references/gsap-recipes.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/gsap-recipes.md) | 目录索引 |
| [references/hero-animation-case-study.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/hero-animation-case-study.md) | 目录索引 |
| [references/hyperframes-backend.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/hyperframes-backend.md) | 已阅读文件/片段 |
| [references/launch-film-director-notes.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/launch-film-director-notes.md) | 目录索引 |
| [references/multi-perspective-parallel-case-study.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/multi-perspective-parallel-case-study.md) | 目录索引 |
| [references/pptx-from-rendered-html.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/pptx-from-rendered-html.md) | 已阅读文件/片段 |
| [references/react-setup.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/react-setup.md) | 目录索引 |
| [references/scene-templates.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/scene-templates.md) | 目录索引 |
| [references/sfx-library.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/sfx-library.md) | 目录索引 |
| [references/slide-decks.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/slide-decks.md) | 目录索引 |
| [references/storyboard-basics.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/storyboard-basics.md) | 目录索引 |
| [references/tweaks-system.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/tweaks-system.md) | 已阅读文件/片段 |
| [references/typography.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/typography.md) | 目录索引 |
| [references/ui-demo-animation.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/ui-demo-animation.md) | 目录索引 |
| [references/verification.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/verification.md) | 已阅读文件/片段 |
| [references/video-export.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/video-export.md) | 目录索引 |
| [references/voiceover-pipeline.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/voiceover-pipeline.md) | 已阅读文件/片段 |
| [references/workflow.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/workflow.md) | 目录索引 |

## 完整文件目录

“已阅读”包括阅读与当前研究相关的片段，不保证每行代码均已审计。“索引”仅代表文件存在于固定版本。Git blob SHA 与大小可用于比对后续版本。

| 文件 | 字节 | 阅读范围 | Git blob SHA |
| --- | ---: | --- | --- |
| [.env.example](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/.env.example) | 463 | 索引 | 7208e80bb0ff6131eaa96bf0c00c67877ba57114 |
| [.gitignore](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/.gitignore) | 844 | 索引 | 0aabc32f42f162dbec312c778ddfaf424b5960bc |
| [LICENSE](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/LICENSE) | 1086 | 已阅读/片段 | ed67368a2a79ed7be97b2a4852330cdac5b8b12a |
| [README.en.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/README.en.md) | 18758 | 索引 | f88df6255c679147b6873b1275ea13601ecb1b57 |
| [README.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/README.md) | 19726 | 已阅读/片段 | 4b79e8757052ea617c15f14c2991e78f719d013c |
| [SECURITY.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/SECURITY.md) | 5226 | 已阅读/片段 | 90b8286cf0d76bdd2614f2e36e987ce327df623b |
| [SKILL.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/SKILL.md) | 65262 | 已阅读/片段 | 10629bb3f44ea0c45588c2329bb12d28073e18c9 |
| [assets/android_frame.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/android_frame.jsx) | 4506 | 索引 | 86071b3ccc8f19bf0d2e8683cd2fedea6b186955 |
| [assets/animations.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/animations.jsx) | 10528 | 已阅读/片段 | e48a3becbf22f5fd484a8bdf8447c3c9402e25d6 |
| [assets/banner.svg](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/banner.svg) | 9502 | 索引 | 65f68dee7f5326ab71ae3099352f063f97e9b4ad |
| [assets/bgm-ad.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/bgm-ad.mp3) | 4950071 | 索引 | 8bb7a9b17aa468e294f5a9b6b91429278e24fbe8 |
| [assets/bgm-educational-alt.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/bgm-educational-alt.mp3) | 4468765 | 索引 | 86f51e73896b3fcf858d64b34244ab8f63770611 |
| [assets/bgm-educational.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/bgm-educational.mp3) | 4047162 | 索引 | 1ec9434058121ecc3752d9a1a4302d159f77c71d |
| [assets/bgm-tech.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/bgm-tech.mp3) | 4818429 | 索引 | 3747c14099d4e1cb341015995b9e3da9ad4221d8 |
| [assets/bgm-tutorial-alt.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/bgm-tutorial-alt.mp3) | 3937926 | 索引 | bfba196abc7339181c9cf99a47b7dba08d30c2dd |
| [assets/bgm-tutorial.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/bgm-tutorial.mp3) | 5542744 | 索引 | d251dd24556e3052a90d627911db5b884fa81957 |
| [assets/browser_window.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/browser_window.jsx) | 3975 | 索引 | 19c1034666ef2a33e732ec1146b0e063a692d16b |
| [assets/cursor.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/cursor.jsx) | 14408 | 索引 | 768df32cdb5af95aabb2bf6eb3282cf59b9d02d8 |
| [assets/deck_index.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/deck_index.html) | 21320 | 索引 | 62e4773738ff16393a2a50f55b5e0da844b38ca9 |
| [assets/deck_stage.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/deck_stage.js) | 11678 | 索引 | 916790dc566eafb473791ac4f9facb42c2c00a20 |
| [assets/design_canvas.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/design_canvas.jsx) | 5195 | 索引 | 9b9140e304367eb52939b6ac420114698ffdc5d2 |
| [assets/director-notes-samples/launch-film-30s-sample.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/director-notes-samples/launch-film-30s-sample.md) | 80207 | 索引 | f45b546a56453d8c35ac6b27ac94725722b885f2 |
| [assets/ios_frame.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/ios_frame.jsx) | 4753 | 索引 | eb0160e489e2a5112a35b716af710c11f9200485 |
| [assets/macos_window.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/macos_window.jsx) | 2536 | 索引 | 7155b98254780b2336cb90ab0db9dd3fc6e10882 |
| [assets/narration_stage.jsx](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/narration_stage.jsx) | 20715 | 索引 | ac5e56d8e60a8236d22150b389e4c5b908923d2a |
| [assets/personal-asset-index.example.json](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/personal-asset-index.example.json) | 1826 | 索引 | dd4b0d6e64e1fdea2213e1f75804637e3885d4fc |
| [assets/sfx/container/card-flip.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/container/card-flip.mp3) | 12164 | 索引 | ebfb492352f785852357ddf2794966bb9c3caa18 |
| [assets/sfx/container/card-snap.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/container/card-snap.mp3) | 8821 | 索引 | 16b99d40d18ed5f4ab2703b022dd91505a608bd9 |
| [assets/sfx/container/modal-open.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/container/modal-open.mp3) | 10493 | 索引 | a7f96f744cca08fe438e43516f3df1f8897a5511 |
| [assets/sfx/container/stack-collapse.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/container/stack-collapse.mp3) | 13836 | 索引 | 3bac6f730492f021932493526bf37828dba1ffa9 |
| [assets/sfx/feedback/achievement.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/feedback/achievement.mp3) | 24703 | 索引 | 21536ea3226987fffcef0905f6323ca040ea9196 |
| [assets/sfx/feedback/error-tone.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/feedback/error-tone.mp3) | 12164 | 索引 | 1e3079c92b972cb152aedb06c6d3392e6780e8a3 |
| [assets/sfx/feedback/notification-pop.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/feedback/notification-pop.mp3) | 10493 | 索引 | 3f181b87dec8498a7b9ba2b9a0769df59a246da4 |
| [assets/sfx/feedback/success-chime.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/feedback/success-chime.mp3) | 17180 | 索引 | ffebf28f206facf953cc9bead2d1d0400c1d3d02 |
| [assets/sfx/impact/brand-stamp.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/impact/brand-stamp.mp3) | 17180 | 索引 | e5320c04f5cb2d51e51383a25838d877e50f47fe |
| [assets/sfx/impact/drop-thud.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/impact/drop-thud.mp3) | 12164 | 索引 | 7857e3744fd2ab7d01fb6c50356c32cccc9c08e9 |
| [assets/sfx/impact/logo-reveal-v2.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/impact/logo-reveal-v2.mp3) | 24703 | 索引 | bf596ee2ce1247e550e37bf10382140294144400 |
| [assets/sfx/impact/logo-reveal.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/impact/logo-reveal.mp3) | 24703 | 索引 | bf596ee2ce1247e550e37bf10382140294144400 |
| [assets/sfx/keyboard/delete-key.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/keyboard/delete-key.mp3) | 8821 | 索引 | b4f80589c4a378f5ab8d16bb73a84cad49ae3d04 |
| [assets/sfx/keyboard/enter.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/keyboard/enter.mp3) | 8821 | 索引 | 3262addb0e159f0376cd3edd00f7ec1228f75be2 |
| [assets/sfx/keyboard/space-tap.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/keyboard/space-tap.mp3) | 8821 | 索引 | f3cce57f90009e5c021c8f0ef6216b1de6ba597f |
| [assets/sfx/keyboard/type-fast.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/keyboard/type-fast.mp3) | 24703 | 索引 | a40d64dd5def3d0c38ed3598defd673f31517edb |
| [assets/sfx/keyboard/type.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/keyboard/type.mp3) | 13836 | 索引 | 94fb8fc4f6465d0c8b68883fb2390b3ecfd15c42 |
| [assets/sfx/magic/ai-process.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/magic/ai-process.mp3) | 20106 | 索引 | 1b28d7efbd8d16d20dad2ee75dfb1a4ef9e43ab1 |
| [assets/sfx/magic/sparkle.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/magic/sparkle.mp3) | 13836 | 索引 | 51400dc211a252238f1b8c64cb50d4d857ecf936 |
| [assets/sfx/magic/transform.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/magic/transform.mp3) | 17180 | 索引 | c7094374e8e538dfb39e6414417723e896c1b254 |
| [assets/sfx/progress/complete-done.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/progress/complete-done.mp3) | 13836 | 索引 | fb0a856b47bea510b637fcc1b42f95fcb37de133 |
| [assets/sfx/progress/generate-start.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/progress/generate-start.mp3) | 13836 | 索引 | ff9bc7361ef65b6f03aed6817357d90223c654da |
| [assets/sfx/progress/loading-tick.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/progress/loading-tick.mp3) | 8821 | 索引 | 4bc31af565bf323f14ca376a9e9cd18aa4f13701 |
| [assets/sfx/terminal/command-execute.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/terminal/command-execute.mp3) | 8821 | 索引 | 17be9e304727545ee6dfbaddc13f6645e29e55af |
| [assets/sfx/terminal/cursor-blink.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/terminal/cursor-blink.mp3) | 8821 | 索引 | 6685098e2e2c9dfcddf6144e14f71e1a19611178 |
| [assets/sfx/terminal/output-appear.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/terminal/output-appear.mp3) | 10493 | 索引 | 71be2b1c0071470d49bf1239b754be04ba7142dd |
| [assets/sfx/transition/dissolve.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/transition/dissolve.mp3) | 13836 | 索引 | a0abc5ab7aec25aece953b6e90cc21e8daa6873d |
| [assets/sfx/transition/slide-in.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/transition/slide-in.mp3) | 10493 | 索引 | c84811f4356ea60f92aaf80ae25ea6a0ca106cc3 |
| [assets/sfx/transition/swipe-horizontal.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/transition/swipe-horizontal.mp3) | 12164 | 索引 | 22beaf728832ad84d7fec4f7a01ff31c7c17c759 |
| [assets/sfx/transition/whoosh-fast.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/transition/whoosh-fast.mp3) | 8821 | 索引 | 6b05a2362189684411d5d4a1b65e136d127cce3f |
| [assets/sfx/transition/whoosh.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/transition/whoosh.mp3) | 10493 | 索引 | a85fd428a4642ef0ddfd18d82118e47b9de41e2f |
| [assets/sfx/ui/click-soft.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/ui/click-soft.mp3) | 8821 | 索引 | 6729756298e7d6a0350cb37fffc0d8abe85f86a7 |
| [assets/sfx/ui/click.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/ui/click.mp3) | 8821 | 索引 | b0770670ac20985b66a3cd1fff55e09e5c7e21c5 |
| [assets/sfx/ui/focus.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/ui/focus.mp3) | 8821 | 索引 | 2b2ef15ff8d65dc204e81a8c5231d30ff60ed076 |
| [assets/sfx/ui/hover-subtle.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/ui/hover-subtle.mp3) | 8821 | 索引 | fb919e298dab89641056e72b1c6cff152f76f73b |
| [assets/sfx/ui/tap-finger.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/ui/tap-finger.mp3) | 8821 | 索引 | bb688e795c3d63e1a4304b0e24a248d33491a4e6 |
| [assets/sfx/ui/toggle-on.mp3](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/sfx/ui/toggle-on.mp3) | 8821 | 索引 | 7b2203ec2d47cdb0128550ff71a984f8fa81f679 |
| [assets/showcases/INDEX.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/INDEX.md) | 5538 | 已阅读/片段 | 5a89e42ccf9379b1a98db40a0439eeadc8e6f192 |
| [assets/showcases/cover/cover-build.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/cover/cover-build.html) | 5664 | 索引 | 25380833bdcabc776aa1efc278f1bb606c7fdb13 |
| [assets/showcases/cover/cover-build.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/cover/cover-build.png) | 116336 | 索引 | 27a5667ea12674739cc423931a429e82c2d035ec |
| [assets/showcases/cover/cover-pentagram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/cover/cover-pentagram.html) | 4914 | 索引 | fb54bda2e777205c50a78beb875c597e99e70aed |
| [assets/showcases/cover/cover-pentagram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/cover/cover-pentagram.png) | 36047 | 索引 | 251eaddf75f6b5288551e72dd8b375b766656b92 |
| [assets/showcases/cover/cover-takram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/cover/cover-takram.html) | 11823 | 索引 | 20b7a18992078b92baffc71b58dcdd1c140e392a |
| [assets/showcases/cover/cover-takram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/cover/cover-takram.png) | 155362 | 索引 | 751973ffc4d11509135184f3a11c77af3fe6efb5 |
| [assets/showcases/infographic/infographic-build.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/infographic/infographic-build.html) | 11696 | 索引 | 325c2fa5edcfb841c2796980d28ef8904986ce90 |
| [assets/showcases/infographic/infographic-build.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/infographic/infographic-build.png) | 108710 | 索引 | e947be8f6f6a21638cab5d6036a56b1d2a0d335a |
| [assets/showcases/infographic/infographic-pentagram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/infographic/infographic-pentagram.html) | 13911 | 索引 | 8e9fdb889b48ffc92ad28a7bbaa4d4568924fc3d |
| [assets/showcases/infographic/infographic-pentagram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/infographic/infographic-pentagram.png) | 159021 | 索引 | 994840c4c7ad0e5c04dc34e9cd7923260f0b6dd0 |
| [assets/showcases/infographic/infographic-takram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/infographic/infographic-takram.html) | 22396 | 索引 | e55520204bdc95f48a2680f4696c4227beb161dd |
| [assets/showcases/infographic/infographic-takram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/infographic/infographic-takram.png) | 162976 | 索引 | 1ea03e40bb064294dcf771eba5988bcdbc67cb09 |
| [assets/showcases/ppt/ppt-build.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/ppt/ppt-build.html) | 9083 | 索引 | be2cbb711f897e767d344a557476c89909782a69 |
| [assets/showcases/ppt/ppt-build.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/ppt/ppt-build.png) | 84423 | 索引 | fa414414976150edb6c129b7eba5efb8df8c4e20 |
| [assets/showcases/ppt/ppt-pentagram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/ppt/ppt-pentagram.html) | 11955 | 索引 | cd10597135acdea9795e3e2e5efce439555a19fa |
| [assets/showcases/ppt/ppt-pentagram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/ppt/ppt-pentagram.png) | 101335 | 索引 | 823fdac4d8bf375728616f2db848c18dcff9f10a |
| [assets/showcases/ppt/ppt-takram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/ppt/ppt-takram.html) | 15656 | 索引 | d859cbd5a9c3344ccabdc1cbf179b2f17366356a |
| [assets/showcases/ppt/ppt-takram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/ppt/ppt-takram.png) | 467187 | 索引 | 7fc4ba632a554a65d75e44cdde16edd28712987d |
| [assets/showcases/website-ai-nav/ainav-build.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-nav/ainav-build.html) | 9621 | 索引 | 2d9060e6954ba4a0f081be39bb75b26c1f6d2555 |
| [assets/showcases/website-ai-nav/ainav-build.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-nav/ainav-build.png) | 85064 | 索引 | bd9cf08aff601df7dc3e6c205868a8daaeda2d03 |
| [assets/showcases/website-ai-nav/ainav-pentagram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-nav/ainav-pentagram.html) | 10553 | 索引 | 1bec4d244d7ac71e4c96aa5a5cab408645197208 |
| [assets/showcases/website-ai-nav/ainav-pentagram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-nav/ainav-pentagram.png) | 105575 | 索引 | 57a4bf6d7fca9cfadfaf0f4cfd1b303f9b9ca6f8 |
| [assets/showcases/website-ai-nav/ainav-takram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-nav/ainav-takram.html) | 12747 | 索引 | 1f7581d4734b8f4ce84d068d41cb6f579d26267b |
| [assets/showcases/website-ai-nav/ainav-takram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-nav/ainav-takram.png) | 121675 | 索引 | f19ef9e8d486c749164215050e7cfd359e48e845 |
| [assets/showcases/website-ai-writing/aiwriting-build.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-writing/aiwriting-build.html) | 14066 | 索引 | 908967bdc56d60104058647bb58a0a36528c1a88 |
| [assets/showcases/website-ai-writing/aiwriting-build.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-writing/aiwriting-build.png) | 130604 | 索引 | 5a04d55c854197c37cb6ee485bb661a480d1c7d8 |
| [assets/showcases/website-ai-writing/aiwriting-pentagram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-writing/aiwriting-pentagram.html) | 14226 | 索引 | 38f702df3b70c9babfa652d7c3b68eaacb435f38 |
| [assets/showcases/website-ai-writing/aiwriting-pentagram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-writing/aiwriting-pentagram.png) | 150195 | 索引 | cda81e9c25b0c61240eb3102ed53a32e0442662c |
| [assets/showcases/website-ai-writing/aiwriting-takram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-writing/aiwriting-takram.html) | 18003 | 索引 | c3fc6b3a687118ded5f918be8fd3aab4080f310f |
| [assets/showcases/website-ai-writing/aiwriting-takram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-ai-writing/aiwriting-takram.png) | 157158 | 索引 | 31d740566e529057aadd929a6ed53b4e1e121628 |
| [assets/showcases/website-devdocs/devdocs-build.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-devdocs/devdocs-build.html) | 9928 | 索引 | 2c37afda67b91a269ed8bcec3eb914ff342bc2d1 |
| [assets/showcases/website-devdocs/devdocs-build.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-devdocs/devdocs-build.png) | 68230 | 索引 | bbca28e8b3b005a1980dab0752866150c35aa1fb |
| [assets/showcases/website-devdocs/devdocs-pentagram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-devdocs/devdocs-pentagram.html) | 12801 | 索引 | f05ec3a7890fa64fe5d71e5ab8ff83c702d9268b |
| [assets/showcases/website-devdocs/devdocs-pentagram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-devdocs/devdocs-pentagram.png) | 117051 | 索引 | 345c3169054364f80d70aaced43cec707975188b |
| [assets/showcases/website-devdocs/devdocs-takram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-devdocs/devdocs-takram.html) | 13106 | 索引 | 206f3b754820ab0332248d8c411b0c8fcf0ef486 |
| [assets/showcases/website-devdocs/devdocs-takram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-devdocs/devdocs-takram.png) | 111854 | 索引 | 7f147267b5753e10d8c39c1d202b27aec86ab4a8 |
| [assets/showcases/website-homepage/homepage-build.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-homepage/homepage-build.html) | 8314 | 索引 | 2bfef3a43f33521201732ba71fc1f7ee1dc950fd |
| [assets/showcases/website-homepage/homepage-build.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-homepage/homepage-build.png) | 61708 | 索引 | ef37605b5581c9c748a5cfb18be6f256769b0e01 |
| [assets/showcases/website-homepage/homepage-pentagram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-homepage/homepage-pentagram.html) | 8491 | 索引 | 2f7580f12258b87101a463cd7006fae7650f5a3f |
| [assets/showcases/website-homepage/homepage-pentagram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-homepage/homepage-pentagram.png) | 57093 | 索引 | 1af6f7936a2d2fd8081348b6e034fd23300a06e2 |
| [assets/showcases/website-homepage/homepage-takram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-homepage/homepage-takram.html) | 10543 | 索引 | 7ae174a50a1d7134c3aa4c03b7759e27d5e96c4c |
| [assets/showcases/website-homepage/homepage-takram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-homepage/homepage-takram.png) | 127610 | 索引 | 3fb8de921a02ae6e8118a4317c0ec14673d2e898 |
| [assets/showcases/website-saas/saas-build.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-saas/saas-build.html) | 12901 | 索引 | f5d56036587933b6d797a8781687d6012b14fad6 |
| [assets/showcases/website-saas/saas-build.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-saas/saas-build.png) | 99745 | 索引 | f7510932718e1d9ef2217b2017bfdfb0223479ce |
| [assets/showcases/website-saas/saas-pentagram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-saas/saas-pentagram.html) | 15050 | 索引 | ccf397b9b4e0a1557ef4565c1b6d43e77370a543 |
| [assets/showcases/website-saas/saas-pentagram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-saas/saas-pentagram.png) | 96559 | 索引 | 07e2ca18f1dcc146fe83a6e4732793738aeb8caf |
| [assets/showcases/website-saas/saas-takram.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-saas/saas-takram.html) | 18209 | 索引 | d35c6a622f7ac7fa6c740b528aeb856e961ca1a8 |
| [assets/showcases/website-saas/saas-takram.png](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/assets/showcases/website-saas/saas-takram.png) | 123532 | 索引 | 6122fda9fe5b2e1ece10f9ff82c5a0b63153858c |
| [demos/c1-ios-prototype-en.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c1-ios-prototype-en.html) | 35163 | 索引 | df3a605ac96cf881f016e821e0f67b4fd07486f2 |
| [demos/c1-ios-prototype.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c1-ios-prototype.html) | 35149 | 索引 | fecc506f0039785b668dcf006534a722d99d1e89 |
| [demos/c2-slides-pptx-en.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c2-slides-pptx-en.html) | 32906 | 索引 | b4035749422fc01a7fe72969dc7239f29f45df8c |
| [demos/c2-slides-pptx.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c2-slides-pptx.html) | 32975 | 索引 | 05e7b4ffd416d2df2a9786eacaa8dff417290104 |
| [demos/c3-motion-design-en.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c3-motion-design-en.html) | 37031 | 索引 | ef44882fd45d0f737ec1afdf0c2f38b70424bca1 |
| [demos/c3-motion-design.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c3-motion-design.html) | 37048 | 索引 | 79f106e448de4d358746d397932c05e735c9c03c |
| [demos/c4-tweaks-en.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c4-tweaks-en.html) | 31102 | 索引 | 284e47d3b86d53998326b93236b076438c873a4d |
| [demos/c4-tweaks.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c4-tweaks.html) | 31150 | 索引 | 640c41a623217cc35c6465fb89ea21dd050b1021 |
| [demos/c5-infographic-en.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c5-infographic-en.html) | 24941 | 索引 | c01667909f031ae829e5df8d97617fded7a4da27 |
| [demos/c5-infographic.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c5-infographic.html) | 24823 | 索引 | 619e4198552aaa263515152b9d860409cd99f74e |
| [demos/c6-expert-review-en.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c6-expert-review-en.html) | 26382 | 索引 | 6471b2f5b6409c1813485ebb0475665eb951339e |
| [demos/c6-expert-review.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/c6-expert-review.html) | 26822 | 索引 | ab3489dc84266b2394ea2c7ea858ddeb005fdd51 |
| [demos/hero-animation-v10-en.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/hero-animation-v10-en.html) | 48712 | 索引 | be8b9254db51c8000448c5c38241a970fa14f2b2 |
| [demos/md-html-narration/md-html-demo.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/md-html-narration/md-html-demo.html) | 37926 | 索引 | 6e6c6832b86891e02456dc4f48548300554949a3 |
| [demos/md-html-narration/script.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/md-html-narration/script.md) | 3452 | 索引 | 0286852edb9396de67c205cfb35aec7db348b07d |
| [demos/voiceover-demo/script.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/voiceover-demo/script.md) | 589 | 索引 | defb9d67074cb64059391b1ca537a4c1a2c7053a |
| [demos/voiceover-demo/什么是token.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/voiceover-demo/什么是token.html) | 11988 | 索引 | ae8785fadc6c15e0a069d54e7b8c0a4b3c31aaaa |
| [demos/w1-brand-protocol-en.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/w1-brand-protocol-en.html) | 20572 | 索引 | 2eb967bbcddcf6be322a5cf4ecb9bc01a3da3873 |
| [demos/w1-brand-protocol.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/w1-brand-protocol.html) | 20905 | 索引 | dc38e4d540a716cf0c73e870699de51d55c445f6 |
| [demos/w2-junior-designer-en.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/w2-junior-designer-en.html) | 31305 | 索引 | 88438f8d50742b640696b216d5ba96c898f163ab |
| [demos/w2-junior-designer.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/w2-junior-designer.html) | 31764 | 索引 | 097bbb75cf68d40443adc684605f7316bf84af07 |
| [demos/w3-fallback-advisor-en.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/w3-fallback-advisor-en.html) | 23901 | 索引 | b3363c2569002cb2b997e550df2d15b898e11c30 |
| [demos/w3-fallback-advisor.html](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/demos/w3-fallback-advisor.html) | 26413 | 索引 | 43ce90bdb820fd93358f3571c84287e032dea007 |
| [package-lock.json](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/package-lock.json) | 28566 | 索引 | f72209ec95bc5ed12900d891eaf5dba7f497c35c |
| [package.json](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/package.json) | 133 | 已阅读/片段 | baadd4585c57c4aab62be54b0b37bdd7c4746a6b |
| [references/ai-video-review.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/ai-video-review.md) | 4037 | 索引 | a4f80a1f9f45e04cf0f20736b4176a4c89ac716e |
| [references/animation-best-practices.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/animation-best-practices.md) | 22446 | 索引 | b7ae16e34ba3fd11e23a433e6d9e0dd74179fdf2 |
| [references/animation-pitfalls.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/animation-pitfalls.md) | 30805 | 索引 | f73307540bdfc936339edd4c1da7768251b05da0 |
| [references/animations.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/animations.md) | 7749 | 索引 | 7309ad963587eba34d3d887bffac75fdb204e06f |
| [references/app-prototype.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/app-prototype.md) | 9893 | 索引 | 994cb5099731f292b15b448324fe8bba4d49915c |
| [references/apple-gallery-showcase.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/apple-gallery-showcase.md) | 11311 | 索引 | 3d8e4c8462029e548d835e069581b88a6591b7f7 |
| [references/audio-design-rules.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/audio-design-rules.md) | 9613 | 索引 | 0144248e4f828a17649ed68a790ba3b0b310ceb0 |
| [references/brand-asset-protocol.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/brand-asset-protocol.md) | 15418 | 索引 | 0a39f7ad8bb7f9d966a621d9e42039d87e51e161 |
| [references/camera-language.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/camera-language.md) | 23221 | 索引 | 04e1769e6355975e87784062c59c6b554b875825 |
| [references/cinematic-patterns.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/cinematic-patterns.md) | 11086 | 索引 | b8b1dc9e6a43a53545895385edf8876887eacf7b |
| [references/content-guidelines.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/content-guidelines.md) | 8389 | 索引 | 140cf818c8232492e530cd01b883d46980b8f43a |
| [references/critique-guide.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/critique-guide.md) | 9022 | 已阅读/片段 | 8eb55ce9eea9bcf089c828ff5b9d021cd850da50 |
| [references/design-context.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/design-context.md) | 6704 | 索引 | 12adeb06d8834e0c9ba934a62b95330c39d33cd2 |
| [references/design-styles.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/design-styles.md) | 62833 | 已阅读/片段 | ccd44280f884d069cda22b027aaf3cb990c0e039 |
| [references/editable-pptx.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/editable-pptx.md) | 18570 | 已阅读/片段 | 7c3dfbfb73c575d7d52c3206b2b619380056874d |
| [references/gsap-recipes.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/gsap-recipes.md) | 35591 | 索引 | 67749c62de86b425dd9d813a260d0442b3377e61 |
| [references/hero-animation-case-study.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/hero-animation-case-study.md) | 11348 | 索引 | 7fc9626f6773dee5f9d3bb7c1fc1daed394f3dc2 |
| [references/hyperframes-backend.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/hyperframes-backend.md) | 7491 | 已阅读/片段 | 8c87a2fd9ad159bc23d1dcfe242278228be0c6d8 |
| [references/launch-film-director-notes.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/launch-film-director-notes.md) | 14886 | 索引 | 8813b3a411312c49a2bbe904da5c3d812a531ddb |
| [references/multi-perspective-parallel-case-study.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/multi-perspective-parallel-case-study.md) | 11093 | 索引 | 2271954c38b9f8935da76c4af753d32e178b0f2a |
| [references/pptx-from-rendered-html.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/pptx-from-rendered-html.md) | 9571 | 已阅读/片段 | 1731b215dca2786ed80690e81dfd16ab1d982758 |
| [references/react-setup.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/react-setup.md) | 9682 | 索引 | e2f56a9eb5638b612cd91dcc5d4a46b29025701e |
| [references/scene-templates.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/scene-templates.md) | 7144 | 索引 | d6fe18d60989a839a9d1b9953a870017bc2e27a5 |
| [references/sfx-library.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/sfx-library.md) | 9762 | 索引 | 50b23696160b98bf051d5986e83a0cbb7a3e8a28 |
| [references/slide-decks.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/slide-decks.md) | 36181 | 索引 | c0c5d9b993e3cdd2dbb294f054619f293e4e98af |
| [references/storyboard-basics.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/storyboard-basics.md) | 23987 | 索引 | 56a5f03b13e46f233605c7c16de7f5a06d633edf |
| [references/tweaks-system.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/tweaks-system.md) | 9015 | 已阅读/片段 | a1890b67c9b4098fd9a0de35805642d2bedd19c9 |
| [references/typography.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/typography.md) | 18348 | 索引 | 7965d1714953edf254eccac0a49f73e71737d3b8 |
| [references/ui-demo-animation.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/ui-demo-animation.md) | 29109 | 索引 | 30c0d8061f205a6f98400b9db343ce106e965a25 |
| [references/verification.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/verification.md) | 6998 | 已阅读/片段 | 377e0eadcfdf2e57a02b79825f47ef80c57ef4dc |
| [references/video-export.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/video-export.md) | 11527 | 索引 | 5e2717dbb214a6c153fcb91c7861f28538dc363a |
| [references/voiceover-pipeline.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/voiceover-pipeline.md) | 20121 | 已阅读/片段 | c11c9978199428f8dc96d87ec2c7f784c908ab56 |
| [references/workflow.md](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/references/workflow.md) | 7090 | 索引 | be2fd32ef0879d05b5ed0314687b3b5cd4505e14 |
| [scripts/add-music.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/add-music.sh) | 4150 | 索引 | 1a267f125c0fdd210c2edcd5fef5f46e1fab6563 |
| [scripts/cloud/ai-review-video.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/cloud/ai-review-video.py) | 20433 | 已阅读/片段 | 333752d0306961d7f586991e97dfe68ce6e7c40c |
| [scripts/cloud/tts-doubao.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/cloud/tts-doubao.mjs) | 10071 | 已阅读/片段 | ce898309c6edbd0b1436e5e823282a30764fc2f6 |
| [scripts/convert-formats.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/convert-formats.sh) | 3000 | 索引 | 7a8ed71a4741fab34518c5a7b17659a4d3b322c0 |
| [scripts/design-gate-hook.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/design-gate-hook.sh) | 3459 | 索引 | 0925cfdde06dc1cca13a86d4b9ff4673f2ee5b78 |
| [scripts/export_deck_pdf.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/export_deck_pdf.mjs) | 3209 | 已阅读/片段 | af4fbb2e94b6727172f805e59ee09ad331ef65dc |
| [scripts/export_deck_pptx.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/export_deck_pptx.mjs) | 3800 | 索引 | 2754768d34187af590b2935156afde96b9f83a6b |
| [scripts/export_deck_stage_pdf.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/export_deck_stage_pdf.mjs) | 4781 | 索引 | a5526b8080e5634540bc5a9b99a171a0706dece6 |
| [scripts/fetch_images.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/fetch_images.py) | 4442 | 索引 | e913b82ea65e1d1d8b0449f9a86ad260cb5b1ae2 |
| [scripts/gen_deck_thumbs.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/gen_deck_thumbs.mjs) | 3037 | 索引 | 4ef73d0387704118eb9bdbe154598e7474bda3e2 |
| [scripts/html2pptx.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/html2pptx.js) | 34510 | 已阅读/片段 | f794cf17c2eab52eaa63d2fc526588ab12e1d00a |
| [scripts/mix-voiceover.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/mix-voiceover.sh) | 4461 | 索引 | ab1da5de64d2e78adf45821147f6eb8c02e7b37b |
| [scripts/narrate-pipeline.mjs](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/narrate-pipeline.mjs) | 12530 | 已阅读/片段 | f7b92c1950a51b4a9de1c706e2e42fbf71c5374c |
| [scripts/pptx_from_rendered.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/pptx_from_rendered.py) | 25341 | 已阅读/片段 | 6c379293b89ce090c02a9ccfa7f02565244d1700 |
| [scripts/render-narration.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/render-narration.sh) | 5425 | 索引 | 9c44d8a1b164ce52864d681f377f4d69b08de1c1 |
| [scripts/render-video-seek.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/render-video-seek.js) | 9778 | 已阅读/片段 | 94b18369806ed5930ce0f5c814a1d434c91fc847 |
| [scripts/render-video.js](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/render-video.js) | 12293 | 已阅读/片段 | 36ea3819a0bb882345dfb49811d440511450e72c |
| [scripts/sfx-cues.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/sfx-cues.sh) | 1628 | 索引 | 7fc71d58cfced9e5832330bd1525d10c5f209c94 |
| [scripts/verify-video.sh](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/verify-video.sh) | 4996 | 索引 | e3541df119634f30754acc8e06d210c7d983e603 |
| [scripts/verify.py](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/scripts/verify.py) | 5451 | 已阅读/片段 | 6becf2b8e1e121f4b14e1784aa6d9b8b8c8ff25a |
| [test-prompts.json](https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/test-prompts.json) | 2760 | 已阅读/片段 | b2daacd4454212745d09ccff21bc66ba36e0c446 |


[返回研究入口](../README.md)

