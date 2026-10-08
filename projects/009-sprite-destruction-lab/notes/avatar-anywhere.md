# 头像出逃 Anywhere · 跨站浏览器扩展

实现目标：网站没有预埋效果代码，也没有 `data-destructible` 等标记时，用户仍能点选头像和内容区域，让角色从选中位置离开，踢出带真实网页内容的物理碎片，再恢复网页。

入口：[产品与实际录像](http://127.0.0.1:8949/projects/009-sprite-destruction-lab/avatar-anywhere/#proof)。下载 `web/avatar-anywhere/downloads/avatar-anywhere.zip`，解压后在 Chrome / Edge 扩展管理中开启开发者模式，加载 `avatar-extension` 文件夹。在普通 HTTP / HTTPS 页面点击扩展图标，再点选头像和卡片。可在扩展快捷键设置中设置 Alt+Shift+A。

## 本次实现

- 独立 MV3 扩展，生产包只请求 `activeTab`、`scripting`，无常驻 content script、无全站 host permission。
- 相同 controller 在自有入口页和浏览器扩展中运行，头像与卡片由实际鼠标命中选择；可扩大到父元素。
- 头像支持普通图片、SVG、canvas 或可见 DOM 区域。截图裁出的像素成为圆形头部，身体与跳跃、奔跑、踢击动作使用已有角色绘制层。
- 扩展调用真实 `chrome.tabs.captureVisibleTab`；内容纹理由当前视口画面生成，能保留浏览器已经显示的跨域图片。生产扩展不依赖 html2canvas。
- 玻璃、纸片、方块三种实际碎片模式复用 DestructionEngine 与 Matter.js。
- 只暂时隐藏选中子树的 visibility；页面仍可滚动，其他按钮仍可使用。召回恢复原头像；复原、关闭、滚动、视口变化或切走标签清理碎片，并恢复原 visibility 值及优先级，保留其他网页样式改动。
- 用户取消异步准备后，旧任务不再请求或使用截图。截图后台核验发送扩展、顶层框架、活动标签与前台窗口，限制并发和 500 ms 调用间隔。

这不是原作公开 SDK：Destroy Any Website 的公开库未确认，本地引擎与扩展均为独立实现。角色行动是预设编排，只有碎片参与刚体物理；没有用照片自动生成全身人物或骨骼。

## 接口与扩展方向

```js
const engine = new DestructionEngine({
  canvas,
  interactive: false,
  showPlayer: false,
  showAim: false,
  onFrame: ({ elapsed }) => updateActor(elapsed),
});
await engine.prepareSnapshot({
  texture: loadedImageOrCanvas,
  width: viewportCSSWidth,
  height: viewportCSSHeight,
  regions: [{ x, y, width, height, tag: 'selected-card' }],
  dpr: Math.min(devicePixelRatio, 2),
  transparent: true,
});
engine.start();
engine.impactAt(footPosition, { radius: 110, strength: 1.5 });
```

`prepareSnapshot` 接收已加载 Image 或非空 canvas。矩形和冲击点均用 CSS 像素，原截图可有不同像素倍率；引擎统一分辨率后取纹理。透明模式不覆盖整页背景。API 检查尺寸、像素数量、区域数量和碎片估算上限；越界区域裁剪到舞台。

`mountAvatarAnywhere({ capture })` 把平台截图能力与角色玩法解耦。capture 返回 PNG/JPEG data URL 或 canvas。控制器返回 `show()`、`toggle()`、`restore()`、`destroy()`、`escape()`、`recall()`、`getState()` 以及 `engine` getter。本页演示提供 html2canvas；安装扩展提供浏览器截图；自有 App 的 WebView 可以由宿主提供截图及 CSS 坐标转换，原生 App 仍需单独建立宿主渲染与交互适配，本次没有交付 App 版本。

后续可以沿同一接口加入不同角色素材、动作序列、命中触发业务事件、更多截图源和多个目标。第三方原生 App 没有网页 DOM，不能据此宣称通用注入能力。

## 实际证据与测试限制

浏览器测试使用完整 Chromium、一次性用户目录和真实 MV3 service worker。在不导入引擎的独立网页与实时 `https://github.com/microsoft` 页面上运行同一扩展，头像和内容由页面实际元素取得。GitHub 图卡采用真实可见的内容图片，不改其网站脚本。

录像与截图在 `web/avatar-anywhere/assets/`，运行记录在 `notes/anywhere-checks.json`，自动化脚本为 `tooling/anywhere-qa.mjs`。录像记录实际浏览器操作，没有替换网页画面或合成角色。入口本页的 html2canvas 演示与扩展的 captureVisibleTab 证据分开标注。

**测试权限差异：无界面自动测试无法点击浏览器扩展工具栏，也未注册动作快捷键。只在 `.cache` 中的一次性测试副本加入 `<all_urls>` 以调用浏览器截图；下载包仍只有 activeTab+scripting。** 因此自动测试验证了真实注入、截图、选取、碎片与复原，但没有模拟生产包的用户工具栏授权手势。用户点击图标取得当前页面临时权限的行为依据 [Chrome activeTab 官方说明](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)；截图 API 依据 [Chrome tabs 官方说明](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab)。

当前边界：仅当前视口；布局变化即结束效果，不持续跨滚动追踪；不能点入网页自身的 Shadow DOM 或 iframe 内部；网页文字/图片在原位置更新不一定触发布局检测；卡片包含视频、输入或特殊渲染时可能不合适；屏幕截图只是当前显示结果，不会读取离屏图片或网页源数据。浏览器设置页和扩展商店等受保护页面不能注入。

## 构建与验证

本次实际结果：跨站扩展浏览器 21 / 21，截图后台 6 / 6，项目 Node 34 / 34；旧头像 18 / 18、旧游戏 21 / 21 回归通过。入口页在 1440 px 和 375 px、DPR 2 下实际点选、截图、踢碎及关闭均成功，无横向溢出或浏览器错误。

```sh
python projects/009-sprite-destruction-lab/tooling/package-avatar.py
python projects/009-sprite-destruction-lab/tooling/package-avatar.py --check
python scripts/build_site.py
node projects/009-sprite-destruction-lab/tooling/anywhere-qa.mjs
node projects/009-sprite-destruction-lab/tooling/avatar-worker-tests.mjs
node --test projects/009-sprite-destruction-lab/tests/*.test.mjs
```

扩展附 Matter.js 0.20.0 完整 MIT 许可。本次只提供本地安装与预览，没有提交扩展商店或修改任何外部网站。
