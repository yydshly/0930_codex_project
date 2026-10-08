# CellMotion 研究记录 · 2026-10-02

## 问题与证据范围

用户要求先展示原库能力与效果，再解释能力、原理与使用场景。研究固定提交 bee7ddfc2b1f487e08aa79a3b91af7628f040eb1，源库 https://github.com/opc8838-hub/font-animation。

展示采用原作者视频与原编辑器；解释区采用原创简化示意。将源库说明、源码核对、本机操作验证和使用建议分开，不把 static poster、pending 条目或教学模型当作完整原库功能。

## 目录与展示

[site/cellmotion-catalog.json](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/cellmotion-catalog.json) 有 69 条 effect，37 条 ready，32 条 pending。ready 中 19 条含 video 路径。展示页使用 web/catalog.js 保存目录快照，未另改效果名称、状态或来源。

[site/cellmotion.html](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/cellmotion.html) 的 stories 包含 case-1、case-2、case-3 三支视频，local video 输入仅在浏览器本机预览。研究页接入这三支原作，视频通过原作者 GitHub Pages 加载。

[编辑器目录](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/cellmotion-editors.html) 明确表示「当前是单动效编辑入口，轻量视频拼接器尚未开放」。

## 字融：从内容到帧

[site/glyphmorph.js](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/glyphmorph.js)：

- rowTokens 把字形与插入图标组织为 token；图标参与字位布局。
- glyphLayout（约 173–221 行）用 Canvas measureText 计算字符宽度、字距和对齐；超过画布可用宽度时适配字号。
- matchGlyphs（约 223–236 行）逐个查找相同 key 的未占用目标字符，用 claimed 集合处理重复字符。
- drawToken（约 245–287 行）绘制文字或素材，使用平移、缩放、透明度；GIF/图标素材可按时间取帧。
- renderFrame（约 289–340 行）先定位时间段，再构建前后布局。已匹配字符进行位置与字号插值；删除项缩小淡出，新增项放大淡入。字符错峰由 characterDelay 控制，实际缓动使用 easeOutQuint。
- animationLoop（靠近文件末尾）更新 elapsedMs 并调用相同 renderFrame 绘制预览。

本地 teaching lab 以「让创意生长 → 创意自由生长」解释上述关系，使用相同字符匹配思想和简化 smoothstep 缓动，将删字、迁移和增字错开以便观察；不复制原库实现，不展示图标、逐行背景或全套样式。

## 字阶：关键帧与阶段时间映射

[site/letterpulse.js](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/letterpulse.js) 开头包含归一化字形边框关键帧 frames，boxesAt 在相邻样本间插值；sourceTime 把用户设定的停留、接力、缩隐、重组与回弹时长映射到参考周期。

这里的运动是字形位置、大小和相对关系的变化。它与字融的字符匹配属于不同算法，不能把一套解释套用于全部效果。

## 导出为什么可以重现同一运动

glyphmorph.js 的 exportPng 在当前 elapsedMs 重新 renderFrame 并调用 toBlob。

exportGif 的循环按 index/fps 渲染输出画布，向 GIF 编码器添加带 delay 的帧。exportMp4 将输出尺寸调整为偶数，读取 24/30/60 fps；每帧 renderFrame(output,index/fps)，再把 getImageData 的 RGBA 数据送入 HME encoder.addFrameRgba，finalize 后保存 MP4。

这不是必须按现实时间等待屏幕录制。时间由帧号决定，预览与导出共用渲染函数。并非全库每个旧编辑器都已核对到相同实现；导出支持以具体编辑器为准。

## AI 与网页组件的当前状态

[cellmotion-ai-menu.js](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/cellmotion-ai-menu.js) 为部分编辑器添加「用于 AI」菜单，包括组件预览、提示词、配置代码、组件 JSON、参数说明。

[cellmotion-ai-manifest.js](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/cellmotion-ai-manifest.js) 将 effect、runtime、parameterDefinitions、composition、assets 和 presentation 整理成 Manifest，包含当前编辑状态。

configuredCode 对 nativeEffectPage 输出 iframe 加配置 JSON，对独立组件输出 cellmotion-player.js 和 cellmotion-player 元素；AI 提示词要求复用既有动画并保留用户配置。配置生成本身不等于已接入 LLM、视频生成 API 或全库通用组件。

[组件库页面](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/site/cellmotion-components.html) 仍标记网页使用「规划中」。native iframe 片段旁边的 JSON 不会仅凭存在就自动恢复编辑器全部状态；落地需核对对应运行时的配置消费与消息桥接。

## 运行、场景与价值

现代浏览器可观看原作视频，支持 Canvas 2D 与 WebGL 的浏览器可运行相关编辑器；本轮验证 Windows / Chrome，未验证全平台导出一致性。

场景建议来源于效果特征：标题重组用于概念变化，图文接力用于卖点展示，原图对比用于作品前后说明，空间翻转用于图片切换。采用价值是复用运动编排和编辑器实现，不是测量过的成本收益承诺。

## 许可与本地保存

[根 LICENSE](https://github.com/opc8838-hub/font-animation/blob/bee7ddfc2b1f487e08aa79a3b91af7628f040eb1/LICENSE) 为 CC BY-NC-SA 4.0，并指出 Space Type Generator 改编来源。README 另列字体 OFL、LTMorphingLabel MIT、可选抠图组件 AGPL 等许可。商业应用需要按具体来源核对。

原作媒体采用作者站点外链，本地不复制源视频。web/ 是原创展示与教学说明，assets/ 保存浏览器截图和实测导出的原创文案图片；notes/ 保存版本、验证和资源状态。

## 本轮验证

26 项浏览器检查通过，补充布局检查 6 项通过，无页面脚本错误。实测原作者三支成片播放，字融的中文修改会使画布内容变化，并导出真实 1080 × 1080 PNG。手机标题、横向溢出与时间轴布局经过截图检查。

具体通过项、媒体时长、原编辑器操作和截图路径见 verification.json 和 layout-verification.json。99 个原作视频、封面、案例与编辑器链接通过 HEAD 访问检查，记录见 resource-checks.json。HEAD 状态只确认资源可访问。GIF/MP4 导出、AI 组件接入、全 37 个编辑器的每一个参数组合不属于本轮全量实测。

## 后续可以独立展开的研究

- 选择三个代表编辑器，测试相同文案与不同画幅、字体、帧率的导出一致性。
- 核验 Manifest 输入如何被 player 或原页面真正消费，而不只检查复制代码按钮。
- 将片段拼接、音轨、字幕与生成素材分成各自的制作环节，再评估工作流价值。
