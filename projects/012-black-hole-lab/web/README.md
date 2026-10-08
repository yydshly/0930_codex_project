# 运行与验证

运行时无第三方依赖。可直接双击 `index.html`，推荐静态服务器：

```powershell
python -m http.server 8972 --bind 127.0.0.1 --directory projects/012-black-hole-lab/web
```

从研究集根目录运行，打开 <http://127.0.0.1:8972/>。如果端口已占用，调整数字。网页中的所有资源均采用相对路径，支持静态子路径托管。

本地验收需要 Node.js / Playwright / Chromium。执行：

```powershell
$env:BLACK_HOLE_PLAYWRIGHT = 'C:/path/to/node_modules/playwright'
node projects/012-black-hole-lab/tooling/verify.cjs --url http://127.0.0.1:8972/
node projects/012-black-hole-lab/tooling/verify-story.cjs --url http://127.0.0.1:8972/
node projects/012-black-hole-lab/tooling/verify-audio.cjs --url http://127.0.0.1:8972/
```

如果 Playwright 已在 Node 模块搜索路径上，可省略环境变量。测试会更新本子项目的验证记录；截图存入仓库 .tmp/black-hole-science-review。仓库打包后也应对 `/projects/012-black-hole-lab/` 路径运行一次检查。

总体打包和清单校验：

```powershell
python scripts/projects.py check
python scripts/build_site.py
```

恒星和成盘机制示意、落体/径向光/温度计算图使用 Canvas；观察成像使用 WebGL 2。自动验收使用 SwiftShader 软件渲染；手机尺寸检查是浏览器视口模拟，手机 GPU 性能需实机验证。


点击「播放完整讲解」：10 章、30 段的 MiniMax 中文旁白与演示同步，总时长约 13 分 3 秒。音频保存在 audio/narration/，运行网页无需 API 密钥或现场合成。每段播完后切换，暂停保留进度；可听当前章节、倍速、拖动本段进度或下载 full-course.mp3。旁白原稿、来源与重新生成方法见 [NARRATION.md](../notes/NARRATION.md)。

数值模型另用以下命令验证：

```powershell
node projects/012-black-hole-lab/tooling/verify-model.cjs
```

科学范围见 [SCIENCE.md](../notes/SCIENCE.md)。

## 理解总结与总览图

页面的 `#understanding` 入口包含讨论整理、完整文字版、年龄对照和科学边界。可下载图保存在 `assets/understanding-map.svg` 与 `assets/understanding-map.png`，其中黑洞画面直接从当前成像器的温度伪彩模式导出。SVG 内嵌画面，可以独立打开，不引用其他本地图片。

在预览服务器启动后，使用既有 Playwright 安装重新导出：

```powershell
node projects/012-black-hole-lab/tooling/build-understanding.cjs --url http://127.0.0.1:8972/
```

该脚本会导出成像画面、生成 SVG、检查标签是否越界并生成 PNG。整理依据与示例限制见 [UNDERSTANDING.md](../notes/UNDERSTANDING.md)。
