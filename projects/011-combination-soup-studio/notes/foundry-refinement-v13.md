# 制作方案与选配流程改进 · V1.4

日期：2026-10-03。revision：20261003-13。

[新版工作台](http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/studio.html?example=headphones&revision=20261003-13) · [耳机产品页](http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/showroom.html?example=headphones&revision=20261003-13)

此前方案把视觉、素材、要求与验收堆在一个长面板中，文字细小且偏浅；生成后的内容只能查看。实际截图保存在 `assets/qa/v13/before/`，本次改进依据当前运行页面，不把历史截图当作本轮证据。

## 修改与实际效果

1. 输入先呈现产品与用户任务，受众、偏好与资料通过可选区域展开。保留既有字段、方案来源与模型服务边界。
2. 输出拆为方案、素材与缺口、调整与验收三个标签。制作要求可逐项展开；加大文字、提高对比，区分已有概念模块与待提供资料。
3. 可修改标题、引导文案、每项要求及其验证方法，选择是否包含表面比较和部件展开。编辑未应用时停用旧交付，应用后保留调整次数与来源，刷新可恢复。关闭的操作实际从消费者页面移除，方案与交付任务文案同步更新。
4. 增加可阅读的 Markdown 制作简报，保留目标、来源、要求、素材、缺失项与验收任务。原有结构化 JSON 继续可下载；简报不等同验收完成证明。
5. 耳机选配加入当前选择、保留配置、重置以及手机返回画面入口。控件字号与目标面积增加；头梁端面封闭、包覆厚度增加、地面材质收敛。消费者的操作、模型和导出继续使用同一状态。

逻辑拆在 `studio-presentation.js`，原工作台保留输入、来源、取消和预览路由。编辑制作要求不会自动重写形体或影像，新增业务仍需实现。素材沿用 V1.3，无新增 ImageGen 请求；概念几何不是厂商实物模型，未测试声学表现。

## 验证与证据

[26 项新增验证](foundry-verification-v13.json)通过，覆盖标签键盘、未应用调整的失效、真实 JSON/Markdown、保存恢复、消费者文案与范围、即时摘要、重置、ZIP 完整性、隔离来源运行，以及三种尺寸下三个标签的布局。

[43 项耳机回归](headphone-regression-v13.json)通过，覆盖实际像素变化、折叠和材质、真实 PNG 与画布一致、自定义相机恢复、在线传输模拟成功/失败/取消、未知类别与 WebGL 降级。在线服务仍没有真实调用验收；模拟传输不作为生成质量证据。静态站 6 项检查通过，本地构建包含 17 个项目。

实际下载的 [调整案例包](foundry-downloads-v13/idea-foundry-reviewed-headphones-v13.zip)包含修改后的文案、要求与关闭的操作范围。在阻断包外请求的来源运行，标题和操作仍与调整一致。完整耳机操作的 [回归交付包](headphone-downloads-v13/idea-foundry-headphones.zip)保留另一套实际选择与相机状态。

最终实际截图在 `assets/qa/v13/after/`：[工作台](../assets/qa/v13/after/studio-desktop.png)、[调整与验收](../assets/qa/v13/after/studio-review.png)、[手机方案](../assets/qa/v13/after/studio-mobile.png)、[实时耳机](../assets/qa/v13/after/headphone-live.png)、[手机控件](../assets/qa/v13/after/headphone-controls-mobile.png)。本轮捕获与流程报告均无未处理页面错误。截图证明本轮布局和状态，未证明完整无障碍合规、真机性能或商业收益。

本轮 in-app 浏览器控制连接因本地执行环境无法启动而不可用；已沿用此前授权的独立本地 Playwright 验证，并提供新版入口。没有发布网站或修改真实业务数据。
