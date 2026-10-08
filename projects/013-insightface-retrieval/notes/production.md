# 总览图制作与验证记录

日期：2026-10-02，Asia/Shanghai。

## 交付

- `assets/understanding-map.svg`：2400 × 3620，保留原生文字、箭头与图形，可编辑或无损缩放。
- `assets/understanding-map.png`：同尺寸 PNG，适合直接阅读、分享和嵌入 Markdown。
- `web/index.html`：同一张 SVG 的本地阅读页，提供适应宽度、原尺寸阅读与下载。
- `notes/diagram-manifest.json`：尺寸、面板数量、文字数量与示意性质。
- `notes/visual-qa.json`：图像边界、阅读页交互与运行错误的检查结果。

内容布局包括三种任务、离线建库与在线查询、InsightFace 源库与特征学习、四个概念分工、产品与开源参考、实际价值、成熟程度与个人可行性。共 16 个内容面板、152 个文字元素。A/B/C 团簇是教学示意，不是真实人物数据或模型输出。

## 重新生成

在本子项目目录执行：

```powershell
python scripts/build_overview.py
node scripts/export_overview.cjs
```

SVG 生成只需要 Python 标准库。PNG 导出需要 Node.js、Playwright、Sharp 和可启动的 Chromium；脚本也会尝试本机 Chrome / Edge。默认从普通 Node 模块路径加载依赖；若依赖集中安装，可通过位置参数传入其 `node_modules` 目录：

```powershell
node scripts/export_overview.cjs '依赖所在的node_modules完整路径'
```

本次使用工作区提供的 Python / Node 运行时与依赖。字体优先 Microsoft YaHei，随后尝试 Noto Sans CJK SC、PingFang SC 与 Arial；在其他系统重建时需要可用的中文字体，导出后应重新检查布局。

## 验证结果

- SVG 文本均在画布和对应面板内，自动检测到 0 处边界溢出。
- 1280px 桌面与 360px 手机视口，图像正常加载、页面无横向溢出，原尺寸 / 适应宽度切换通过。
- 阅读页没有 JavaScript 运行错误。
- 已人工查看整图预览、上中下局部与手机阅读截图，核对中文显示、层级、箭头比例和文字排版。
- 检查过程中修正了孤立标点换行及 SVG 缩小时箭头比例，修正后重新导出并复核。

导出脚本的预览截图位于被 Git 忽略的 `build/` 目录；正式 PNG、SVG、说明和检查记录保留在项目内。

## 验证边界

这里验证的是原创图的排版、图像导出与本地阅读功能。没有运行 InsightFace 模型、建立真实人物图库、上传 AVScan 查询或测量识别精度；公开指标和产品宣称的适用范围见 [来源记录](sources.md)。
