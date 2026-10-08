# 耳机造型与展示 · Idea Foundry V1.7

日期：2026-10-03。revision：20261003-16。

[完整产品页](http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/showroom.html?example=headphones&revision=20261003-16) · [目标工作台](http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/studio.html?example=headphones&revision=20261003-16)

用户认为上一版仍不够精致。本轮以项目已有的 `web/foundry/assets/headphone-hero-v12.webp` 系列影像为视觉目标，先捕获实际 V1.6 页面，再修改形体与呈现。没有将功能检查数量作为视觉质量证明。

## 实际页面审视

1. **首屏与材质叙事**：摄影主视觉、标题和近景素材已有一致的暖色设计语言，继续保留。固定影像只展示系列设计概念，选配仍由下方真实模型承担。
2. **产品身份**：上一版实时模型的头梁过大、耳罩偏小，三角叉架与参考中的短单杆不同；银壳反射偏棕。用户从摄影图进入模型时，会看到另一种形态。这是首要修改项。
3. **选配任务**：上一版颜色、表面、折叠、部件、环境与交付在高侧栏中排列，模型区被撑到 860–900 像素。页面更接近工具面板，主要选择不够突出。
4. **近看与手机**：首轮新模型的另一只耳罩遮挡耳垫近景；手机上的右耳罩下缘被视角工具条遮住。两个问题都在最终修正前被实际截图发现。

[本轮开始的完整模型与选配](../assets/qa/v16/before/headphone-live.png) · [本轮开始的首屏](../assets/qa/v16/before/headphone-showroom-desktop.png) · [before 捕获报告](headphone-capture-v16-before.json)

## 实装变化

- 收紧头梁跨度并放大耳罩，重建圆润包覆、端帽、短伸缩杆、耳罩转轴与柔软宽耳垫。壳体增加窄轮廓、面板分界、旋钮、圆角插槽和细接缝。
- 以中性柔光校准银色，降低棕色环境影响，调整皮革、织物和接触阴影；降低落地间隙，减弱远端地平线。
- 耳罩近景隔离真实目标组件，暂时隐藏另一侧及头梁，回整机视角恢复全部。保留独立焦点、旋转与保存逻辑；近景移除地面大阴影，并补充织物照明。
- 选配改为宽幅产品画面，下方突出配色、表面和留下选择；折叠、部件与换光线收进默认折起的“近看材质，探索结构”。实际操作仍完整可用。
- 画布给视角工具条预留 74 像素底部空间，避免手机产品下缘遮挡。文字层级、间距与颜色按实际桌面和手机截图调整。
- 工作台复用同一个模型；配置、简报、PNG 与独立交付继续使用当前实际选择。现有模块缓存入口更新到版本 16。

## 最终画面

[产品与主要选配](../assets/qa/v16/after/headphone-live.png) · [铝壳](../assets/qa/v16/after/headphone-detail.png) · [耳垫](../assets/qa/v16/after/headphone-cushion.png) · [折叠](../assets/qa/v16/after/headphone-fold.png) · [手机](../assets/qa/v16/after/headphone-live-mobile.png) · [首屏](../assets/qa/v16/after/headphone-showroom-desktop.png) · [完整页面](../assets/qa/v16/after/headphone-showroom-full.png)

截图分别在 1440×1000、390×844 视口捕获，包含六个真实视角、夜色、半/全折叠、工作台放大与手机。首轮和最终修正使用相同视口；`after/` 最终保存最新实现，最终捕获报告检查实际 renderer 版本。

## 验证与边界

最终 [21 项近景与交付](headphone-focus-v16.json)、[43 项耳机回归](headphone-regression-v16.json)通过，均无未处理错误；最终 [38 张捕获报告](headphone-capture-v16-after.json)确认 renderer 版本为 16。另有本轮 [5 项兼容检查](studio-compatibility-v16.json)，包括真实 WebGL 上下文失效和无 WebGL 回退。静态站 6 项检查通过，本地构建包含 17 个演示项目。

最终 43 项在捕获和近景验证结束后单独运行，记录在 [日志](headphone-regression-v16-run.log)。检查包括当前像素变化、折起区域的真实展开操作、配置保存、刷新、当前 PNG、隔离包运行、在线成功/失败/取消的模拟及已实现操作。在线验证使用模拟传输，未发起真实模型调用。

实际 [近景交付包](focus-downloads-v16/idea-foundry-near-headphones-v16.zip)与 [完整耳机交付包](headphone-downloads-v16/idea-foundry-headphones.zip)均可隔离运行。近景包解压后的 renderer、当前 source 和实际服务文件 SHA-256 一致：`BC06E9A7633C067E66E50EBFC579C84BB59BBBE55FA32679A9F5878A5FF57082`。这验证代码交付一致性，不代表摄影质感已经达标。

本轮更接近已有系列影像的比例与展示语言，仍不能称为摄影等价的最终精致版本。复杂皮革褶皱、软垫受力、自然微表面和光学反射仍有差距；模型未按实物或 CAD 标定。页面未加入未提供的产品性能、订单或商业收益。手机仅用视口模拟，未作真机性能或完整无障碍合规验证；截图中的字级、标签和按钮可见情况不能代替完整辅助技术测试。

本轮内置浏览器连接启动失败，继续使用此前用户授权的本地 Playwright 捕获。没有新增生成影像、付费模型调用或网站发布。
