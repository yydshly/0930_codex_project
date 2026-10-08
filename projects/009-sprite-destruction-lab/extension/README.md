# Forma 网页工具箱 · Chrome / Edge 扩展

这是可加载的 Manifest V3 扩展。点击扩展图标后，它会在当前网页的侧边打开工具箱，读取你实际选中的文字和页面中的 HTML 表格。翻译会请求真实服务；摘录、表格导出和文本处理在本地完成。

## 安装与使用

1. 下载并解压 `forma-web-toolbox.zip`，保留解压目录。
2. Chrome 打开 `chrome://extensions`，Edge 打开 `edge://extensions`。
3. 打开“开发者模式”，选择“加载已解压的扩展程序”，选择包含 `manifest.json` 的目录。
4. 打开一个普通网页，例如 [MDN 的 HTML table 文档](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/table)，点击工具箱扩展图标。也可以在网页空白处或选中文字后右键，选择“Forma：打开网页工具箱”。
5. 在文章中划选一句英文，点击工具箱的翻译或摘录操作；切换到表格页签，选择网页中的真实表格并导出 CSV。
6. 再次点击扩展图标关闭工具箱。关闭工具箱侧栏后可重新打开。

浏览器设置页、扩展商店、内置 PDF 查看器等受保护页面无法注入。当前只处理顶层网页中的文字和 HTML 表格，不处理图片 OCR 或跨域 iframe。

## 权限与数据

| 权限 | 用途 |
|---|---|
| `activeTab` | 只有点击图标或右键菜单后，临时访问当前网页 |
| `scripting` | 向当前网页加载工具箱，工具箱在隔离环境运行 |
| `storage` | 通过 `chrome.storage.local` 保存摘录，在不同网站中打开同一份笔记 |
| `contextMenus` | 添加用户主动调用的右键菜单 |
| `https://api.mymemory.translated.net/*` | 页面直连发生 CORS / 网络异常时，由扩展后台向 MyMemory 固定端点发送选中的文本及语言组合 |

没有全站常驻读取权限，没有自动运行的 content script，没有向网页收集整篇文章。在线翻译优先在当前网页来源下请求 MyMemory 的公开 CORS 接口；仅发生 CORS / 网络异常时尝试后台转发，HTTP 配额错误不会重复请求。在线翻译前应阅读工具箱中的发送说明；服务器会收到你送出的文本，免费服务可能遇到配额或网络限制。单次请求限制 500 UTF-8 字节，长文字由翻译模块分段处理。

`web_accessible_resources` 的 HTTP / HTTPS 匹配仅允许已打包的模块和样式被加载，不授予扩展读取这些网站的权限。

## 源码与重打包

扩展复用同一个网页工具箱实现：

- `../web/toolbox/toolbox.js`：Shadow DOM 面板、划词操作、表格和本地工具。
- `../web/toolbox/translation.js`：真实在线翻译请求、分段及结果处理。
- `../web/toolbox/data.js`：表格序列化和文本计算。
- `../web/toolbox/toolbox.css`：侧栏样式。

在仓库根目录执行 `python projects/009-sprite-destruction-lab/tooling/package-toolbox.py` 会更新 `extension/assets/` 并生成 `web/toolbox/downloads/forma-web-toolbox.zip`。`--check` 校验封装是否对应当前源码。修改代码后，在扩展管理页面点“重新加载”，再刷新测试网页。

## 已完成的真实验证

2026-10-02，使用独立的临时 Chromium 配置目录加载此 Manifest V3 扩展，通过 19 项浏览器检查及 6 项后台边界检查。测试读取真实选区、导出真实 CSV、关闭及重新打开面板，并验证摘录在本地网页与 MDN 之间共享。后台并发检查验证跨站摘录按 ID 合并、显式删除与手动输入来源标记保留。在线翻译从真实服务获得中文结果；公开 MDN 页面中的实际短句也通过工具箱按钮翻译成功。

- 真实扩展结果：`../notes/extension-checks.json`
- 实际 API 响应：`../notes/extension-live-translation.json`
- 公开网页截图：`../web/toolbox/assets/extension-mdn-translation.png` 与 `extension-mdn.png`

测试曾遇到 HTTP 429，界面显示真实错误，未生成替代译文。免费服务的可用性和额度不由工具箱保证。浏览器自动化使用一次性的测试副本，临时授予 localhost 与 MDN 权限；可下载正式包保留用户主动点击后的 `activeTab` 权限，没有额外全站权限。

后台边界检查：`node --test projects/009-sprite-destruction-lab/tooling/extension-worker-tests.mjs`。真实扩展检查：`node projects/009-sprite-destruction-lab/tooling/extension-qa.mjs`，需要机器上已配置的 Playwright Chromium；不会安装或修改用户浏览器。

实现依据：[Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)、[Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)、[跨域请求](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)。
