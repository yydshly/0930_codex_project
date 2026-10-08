# Avatar Anywhere · 网页角色扩展

独立的 Chrome / Edge Manifest V3 扩展，在你主动点击扩展图标后向当前网页放入可操作角色。网页画面由浏览器当前可见页面截图取得；角色和区域效果在本地运行。此扩展与 Forma 网页工具箱分别安装。

## 安装

1. 下载 `avatar-anywhere.zip` 并解压到一个固定目录，打开其中的 `avatar-extension` 文件夹。
2. Chrome 打开 `chrome://extensions`，Edge 打开 `edge://extensions`。
3. 开启“开发者模式”，选择“加载已解压的扩展程序”，选择包含 `manifest.json` 的 `avatar-extension` 目录。
4. 打开普通 HTTP / HTTPS 网页，例如 GitHub 的公开组织页，点击扩展图标，也可按 `Alt+Shift+A`。若快捷键冲突，可在扩展管理页的“键盘快捷键”中调整。
5. 在面板中依次点击“点选头像”“点选卡片”，到网页上选择两个分开的元素，再点“让他出逃”。角色自动跳出、跑动并踢击；可召回或复原。获取网页画面时保持当前标签页及前台浏览器窗口。
6. 再次点击扩展图标收起或显示角色。页面提供恢复操作；刷新网页也会清除临时角色和效果。

浏览器设置页、扩展商店、内置 PDF 查看器等受保护页面无法注入。当前角色只在顶层网页中运行，不向跨域 iframe 注入。

## 截图与权限

- `activeTab`：用户点击扩展后临时访问当前网页，浏览器截图也使用这项临时授权。
- `scripting`：在隔离环境中加载本地 Matter.js 与角色控制器。

没有全站常驻读取权限，没有自动执行的 content script，没有截图上传、账号、存储或远端处理。截图只作为当前浏览器内存中的本地纹理使用；扩展后台不会写入文件。

截图仅覆盖当前可见视口，不是整页。后台验证消息来自本扩展的顶层网页、其标签为当前活动标签且窗口处于前台；如果截图期间切换标签或窗口，结果会被丢弃。截图不接受外部传入的目标标签或网址，同时限制并发和每秒最多两次调用。

`web_accessible_resources` 的 HTTP / HTTPS 匹配只是允许打包模块加载，不是这些网站的常驻访问权限。扩展在网站之间没有永久保存状态；导航或刷新后需要再次主动打开。

## 原理与许可

扩展在隔离环境中加载 `Matter.js 0.20.0`，角色控制器复用本项目的 `DestructionEngine`、形状/效果模块及角色绘制器。截图中的颜色纹理与页面上的区域坐标对应，呈现真实网页内容的本地交互。

项目代码采用 MIT 许可，见 `LICENSE`。Matter.js 版权所有 Liam Brummitt 及贡献者，采用 MIT 许可，完整上游许可位于 `THIRD_PARTY/LICENSE-MatterJS.txt`；已保留物理库文件中的版权头。没有打包 html2canvas。

## 重打包

仓库根目录执行 `python projects/009-sprite-destruction-lab/tooling/package-avatar.py`。脚本将网页角色所需模块按相同相对路径复制到 `assets/`，生成 `web/avatar-anywhere/downloads/avatar-anywhere.zip`。执行同一命令加 `--check`，可检查包内文件与当前源码是否一致。更新代码后，在扩展管理页点击“重新加载”，再刷新网页。

截图实现依据：[Chrome captureVisibleTab](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab)、[activeTab 权限](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)。
