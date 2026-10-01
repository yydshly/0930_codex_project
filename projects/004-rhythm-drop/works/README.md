# 可迁移的创作示例

这四个 JSON 与创作台内置示例一致。展开“把故事改写成你的作品”，直接选择内置示例，或点击“导入作品”选择文件。导入成功会在本机另存新版本；旧版本保留。

| 文件 | 作品 |
| --- | --- |
| [night-letter.json](night-letter.json) | 给凌晨还醒着的你 |
| [graduation-letter.json](graduation-letter.json) | 写给一起长大的你 |
| [rain-letter.json](rain-letter.json) | 今天先照顾好自己 |
| [brand-letter.json](brand-letter.json) | 此刻，向前 |

另存验证产生的 [graduation-reunion.json](graduation-reunion.json) 保留「写给一起长大的你 · 重逢版」，使用不同结尾，可导入与原毕业作品对比。

格式是 `rhythm-drop-work`，`version: 1`。`storyId` 选择 night / graduation / brand / rain / identity / team；`bpm` 是 60–180 的整数；`chapters` 恰好四项，分别提供 `title` 和 `line`。其他字段为 `title`、`occasion`、`ending`、`brand`，长度限制在表单中显示与校验。文字按文本呈现，不作为 HTML 执行；文件限制 64 KB。

“导出作品”会生成 JSON 下载链接和只读文本。浏览器若阻止下载，可点击“复制作品文本”，按照提示按 Ctrl+C / ⌘C，再粘贴到 UTF-8 文本文件并保存为 `.json`。原始音乐、场景和动作仍由故事模板提供；导入的试听音乐不会随 JSON 导出。

`src/examples.mjs` 是内置示例来源。改写它后，也应更新这里的 JSON，保持可迁移文件和内置版本一致。本目录属于研究材料；静态网页内置了示例内容，不依赖这些文件的下载路径。

[identity-first.json](identity-first.json) 是品牌试验 B「先听见自己」的可改写作品。仅新版支持 identity；完整保留的 v0.5 页面不支持导入此故事。它保存四章文案，原试验中的更多细分字幕仍可通过原试验入口观看。

[team-welcome.json](team-welcome.json) 是 v0.7 新成员欢迎片的可改写作品。冻结的 v0.5/v0.6 页面不支持 team。JSON 保留四章改写文案，完整原片含更多细分对白；姓名、会议白板与声部仍由 team 模板固定提供。

[garden-first.json](garden-first.json) 是 v0.8 声音花园体验中实际种植、导出与重导入验证的四株声音。格式为 `sound-garden` / version 1，包含水边、草地、风铃及键盘种植的短乐句，只能在花园页面导入；与故事作品格式独立。文件保存音序与位置，重听节奏按各声音模板提供，不包含录音。

[ecosystem-first.json](ecosystem-first.json) 是 v0.9 声音生态页面实际导出、重导入的五株声音，包含莲与花各 50% 的第一代混合声、成长状态及八拍编排。格式为 `sound-garden-ecosystem` / version 1，只能在生态页面导入；旧种植文件也可以迁移到生态页面，旧档案保留。文件不含录音或撤回历史。
