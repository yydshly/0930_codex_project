# Forma 网页辅助工具箱

本次把“在当前网页处理资料”做成了可操作的工具箱：实际读取选中文字、请求翻译服务、保存带来源的摘录、读取 HTML 表格并导出，另提供本地文本处理和单位换算。网页版用于直接体验，同一套实现也已封装成可加载的 Manifest V3 浏览器扩展。

这些能力由本项目独立开发，**不是 Destroy Any Website 游戏自带的插件能力，也不是把破碎特效换个名称**。工具箱不依赖游戏、Matter.js 或 DOM 截图：它直接处理当前网页的文字、选区和表格。

## 已实现的能力与实际用途

| 能力 | 当前可以完成的操作 | 实际使用场景与价值 |
|---|---|---|
| 选区翻译 | 选中文字或手工输入，选择语言，获得真实在线译文；复制、保存原文与译文，或把译文放到网页原文下方 | 阅读外文产品资料和技术文档时，就地理解某一段，保留上下文 |
| 带来源摘录 | 保存原文、可选译文、个人备注、页面标题、来源 URL 和时间；复制、删除，导出 Markdown / JSON | 调研多个网站时，保留可回访的证据，减少“复制后找不到原出处” |
| 网页表格提取 | 列出网页实际 HTML 表格，点击目标表格，查看行列和预览；复制 CSV，下载 CSV / 带来源的 JSON | 从参数表、清单或公开文档提取结构化资料，减少手动逐格复制 |
| 文本小工具 | 字符、词 / 汉字、行数统计；按行去重、清理空白、大小写转换、格式化 JSON；复制或下载 TXT | 整理资料、检查 JSON、处理重复名单，无需转到另一款工具 |
| 单位换算 | 长度、质量、摄氏度与华氏度换算；拒绝不同量纲之间的转换 | 阅读英制尺寸和重量时，直接得到熟悉的单位 |

本地小工具处理的是实际输入数据。无效 JSON 会显示错误；单位换算也不会把长度和质量强行换算成一个数字。

## 如何看到真实效果

本地站点运行时，打开 [工具箱演示](http://127.0.0.1:8949/projects/009-sprite-destruction-lab/toolbox/)。对应源码为 [演示入口](../web/toolbox/index.html) 和 [演示加载器](../web/toolbox/demo.js)。

1. 点“选一段翻译”，或亲自划选英文段落，再点侧栏中的“翻译这段文字”。界面会发出真实请求并显示服务名称、译文和耗时；也可输入自己的句子。
2. 点“放到原文下方”，观察双语对照确实插入到所选段落下方。原文仍可阅读。
3. 保存原文与译文，添加自己的备注，然后下载 Markdown 或 JSON，检查其中的真实原文和来源链接。
4. 点“提取下方表格”，下载 CSV。演示表格由本仓库 `projects.json` 清单生成，导出的数据来自当时页面的实际单元格，不是另外预置的演示下载文件。
5. 切换“小工具”，输入重复行或 JSON，操作后复制或下载结果；尝试 `12 in → cm`，实际结果为 `30.48 cm`。

更接近日常使用的流程是：安装扩展，打开 [MDN 的 HTML table 文档](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/table)，划选一句英文 → 翻译 → 保存摘录 → 切换表格页签 → 导出该网页实际表格。扩展已经在该公开网页上运行并记录了选区、翻译、跨网站摘录和表格提取的结果，详见验证记录。

## 网页版与扩展的工作原理

### 选区与面板

[toolbox.js](../web/toolbox/toolbox.js) 使用浏览器 `Selection` / `Range` API 读取真实选区。工具箱面板放在 Shadow DOM 内，降低页面 CSS 与面板样式相互影响的机会。选区快捷条提供翻译、摘录和复制操作。

“放到原文下方”根据选区所在的段落、列表项或表格单元格定位原文，在其后创建译文节点。关闭工具箱会移除面板、临时标记、插入译文和监听器，并取消仍在进行的翻译；已保存的摘录仍留在本地。

### 真实翻译

[translation.js](../web/toolbox/translation.js) 提供两个适配器：

- 在线模式仅通过 `GET https://api.mymemory.translated.net/get` 发送本次选择或输入的文字和语言对，校验实际 HTTP 状态、服务返回状态、额度和译文。没有调用 `/set`，没有向翻译记忆库贡献内容，也没有硬编码译文作为失败回退。
- 本地模式检查浏览器 `Translator` API 和语言对可用性，再尝试创建本地模型；不存在或模型不可用时明确报错。当前验证环境的模型不可用，不能把该模式描述为已成功运行的离线翻译。

依据 [MyMemory 官方接口说明](https://mymemory.translated.net/doc/spec.php)，每个 `q` 最多 500 UTF-8 字节。因此长文字按完整 Unicode 字符分段，并优先保留句子或单词边界。本工具一次最多接收 3,000 字符，单段请求超时为 18 秒，总超时为 55 秒；内存缓存最多保留 80 条已经收到的译文。

[MyMemory 官方用量说明](https://mymemory.translated.net/doc/usagelimits.php) 列出的匿名免费额度为每天 5,000 字符。本项目没有配置邮件、密钥或付费额度。免费服务存在限额和可用性限制，实际测试出现过 HTTP 429，界面会显示真实错误。用户主动点击“在 Google 翻译网页中打开”可以进入独立翻译页面，这不代表工具箱已经获得译文。

浏览器本地翻译的要求与模型下载机制见 [Chrome Translator API 官方文档](https://developer.chrome.com/docs/ai/translator-api)。API 存在并不等于当前语言模型可用。

### 摘录保存

网页演示使用当前来源的 `localStorage`；扩展使用 `chrome.storage.local`，因此在同一浏览器配置中从不同网站打开扩展，可以继续读取同一份摘录。保存结构包含原文、可选译文、来源 URL、标题、备注和时间，最多 200 条。手工输入的内容以当前页面为上下文，不能据此认定该文字已经出现在网页原文中。

保存按记录 ID 增补和删除。面板内部将保存操作排队；扩展后台也用串行队列读取最新存储，再合并本次变更，避免多个页面把一份旧列表整体覆盖回去。网页侧在支持时使用 Web Locks 协调同一来源的更新。这是本地资料保存，不包含账号、云同步或跨设备同步。

### 表格与本地工具

[data.js](../web/toolbox/data.js) 把实际 `table` / `tr` / `td` / `th` 结构展开成二维字符串矩阵。合并单元格的文字会重复到覆盖位置；嵌套表格的内容不会混入父表格单元格。处理上限为 500 行、60 列，界面最多列出 40 个可见 HTML 表格。读取依据是 DOM 文本，因此可见表格内部的隐藏行或隐藏单元格也可能出现在导出结果中。

预览最多显示 9 行、8 列，下载包含实际读取的全部单元格。导出时会重新读取原表格，原表格已移除时要求重新选择。CSV 处理引号、逗号、换行，并默认对疑似电子表格公式的文本添加文本前缀；JSON 额外记录来源标题、URL 和提取时间。

文本整理、字词统计、单位换算和表格文件生成均在本地执行。字符统计按 Unicode 码点计算；“词 / 汉字”按中文汉字与其他语言的字母数字词统计，不等同于所有语言的专业分词。

### Manifest V3 扩展

[manifest.json](../extension/manifest.json) 声明 `activeTab`、`scripting`、`storage`、`contextMenus` 和固定的 MyMemory API 主机权限。正式包没有全站常驻内容脚本：用户点击图标或右键菜单后，后台用 `chrome.scripting.executeScript` 注入加载器，随后在隔离环境中挂载同一套工具代码。

[content-loader.js](../extension/content-loader.js) 将当前页面的选区、来源、存储适配器和翻译传输适配器接到网页工具箱。在线翻译优先直接请求 MyMemory 的公开 CORS 接口；仅遇到 CORS / 网络异常时才尝试扩展后台转发，HTTP 配额错误不会重复请求。

[service-worker.js](../extension/service-worker.js) 只接收本扩展已打开的普通网页请求，校验文字字节数和允许的语言对，把请求限制到固定翻译端点；摘录更新也在后台进行格式校验和串行合并。`web_accessible_resources` 的网页匹配用于允许加载打包模块和样式，不等于授予全站读取权限。

实现依据：[Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)、[Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)、[扩展跨域请求](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)。

## 安装与更新

1. 在演示页面下载 [扩展 ZIP](../web/toolbox/downloads/forma-web-toolbox.zip)，解压到固定目录。也可直接使用仓库中的 [extension](../extension/) 目录。
2. Chrome 输入 `chrome://extensions`，Edge 输入 `edge://extensions`，打开“开发者模式”。
3. 选择“加载已解压的扩展程序”，选择包含 `manifest.json` 的目录。
4. 打开普通 HTTP / HTTPS 网页，点击 Forma 图标，或右键选择“Forma：打开网页工具箱”。再次点击图标可关闭面板。
5. 更新源码后，在扩展管理页点击“重新加载”，再刷新要使用的网页。

详细安装与权限说明见 [扩展 README](../extension/README.md) 和 [网页安装说明](../web/toolbox/install.html)。这是已打包的开发版扩展，当前通过加载解压目录使用，未发布到扩展商店。

在仓库根目录执行 `python projects/009-sprite-destruction-lab/tooling/package-toolbox.py` 会把共用代码复制到扩展资源目录，并生成下载 ZIP；加 `--check` 可检查包与源码是否一致。

## 可扩展的接口

当前代码把界面、数据处理、翻译和存储分开，便于增加能力，而无需借助原游戏：

| 接口 | 当前用途 | 可继续扩展的方向 |
|---|---|---|
| `FormaToolbox.mount({root, cssText, sourceUrl, sourceTitle, transport, storage})` | 在指定网页内容范围挂载面板，传入页面来源和适配器 | 为企业文档或产品页面限定可处理范围、配置主题 |
| `captureSelection()`、`selectTable(element)`、`showTab(key)`、`getState()`、`unmount()` | 捕获实际选区、选择表格、切换工具、检查状态与卸载 | 给宿主产品接入按钮和流程，继续增加工具页签 |
| `translateText(text, {source, target, provider, signal, onProgress, transport})` | 翻译、取消、进度与真实服务结果 | 新增其他翻译供应商或企业网关；当前在线响应校验针对 MyMemory，切换供应商还需改适配器与权限 |
| `transport(text, source, target, signal)` | 普通页面直接请求，扩展在必要时通过后台请求 | 接入经过授权的自建服务；返回真实 MyMemory JSON 或 `Response`，不能把预置文本当服务结果 |
| `storage.load()` / `storage.update({upsert, deleteIds})` | 本地摘录恢复、按 ID 更新；兼容 `save(notes)` | 增加检索、标签或经授权的同步层，同时保留来源字段与增量合并 |
| `tableToMatrix()`、`toCSV()`、`textStats()`、`transformText()`、`convertUnits()` | 可单独使用的纯数据处理 | 增加表格字段清理、更多文本变换或同量纲单位 |

`translateText` 返回 `{text, provider, segments, elapsedMs, cacheHit}`，其中 `provider` 标识真实服务；`segments` 保留每段原文、译文和缓存状态。实际挂载示例可直接参考 [demo.js](../web/toolbox/demo.js) 与 [扩展加载器](../extension/content-loader.js)。

OCR、自动文章摘要、术语库、语音朗读、表单填写和云同步都可以继续开发，但当前没有实现，不能从已有特效或工具面板推断它们已经可用。

## 已验证的效果与边界

2026-10-02 的验证包含真实浏览器跨域翻译与实际加载的 MV3 扩展。网页翻译曾从 HTTP 200 响应得到：

> 原文：The battery lasts for eight hours. You can save the selected paragraph with its source link.
>
> 译文：电池续航时间为8小时。您可以将所选段落与其源链接一起保存。

扩展记录中的真实请求 `HTML tables organize information into rows and columns.` 返回 `HTML表将信息组织成行和列。`；公开 MDN 页面的短句也通过实际翻译按钮得到中文结果。测试同时保留失败情况：HTTP 429 明确报错；当前 Chromium 的本地 Translator 语言模型不可用。

验证证据以最新记录为准，此处不固定最终检查数量：

- [网页工具箱检查](toolbox-checks.json)：30 项本地功能检查通过；双语插入与翻译取消使用隔离的测试传输验证界面，不视为真实 API 成功。真实在线结果见下列扩展记录。
- [最近一次网页服务状态](toolbox-live-service.json)：实际 HTTP 429，未生成译文。
- [真实 MV3 扩展检查](extension-checks.json)
- [扩展真实翻译响应](extension-live-translation.json)
- [MDN 实际翻译截图](../web/toolbox/assets/extension-mdn-translation.png)
- [MDN 实际表格工具截图](../web/toolbox/assets/extension-mdn.png)

扩展自动化测试使用独立的临时 Chromium 配置和仅用于测试的 localhost / MDN 主机授权。正式下载包保留用户主动点击后的 `activeTab` 流程，不能将自动化测试授权理解为正式包已常驻访问所有网页。

当前只处理顶层页面可访问的文字与 HTML 表格。浏览器设置页、扩展商店和内置 PDF 查看器等受保护页面无法注入；跨域 iframe、闭合 Shadow DOM、图片文字、Canvas 文字和图片表格没有 OCR 支持。表格提取不构成全网站抓取，也不会自动把分页或虚拟列表中尚未加载的内容下载下来。

在线翻译的内容会发送给第三方服务，译文质量和可用性由服务与文本决定；本地摘录没有云端备份。网页演示按来源保存，扩展按浏览器配置保存，二者是不同的存储范围，也不是多个已打开面板之间的实时同步。
