# 本地研究阅读页

这是本研究整理的静态能力手册，不是上游软件的运行界面。内容由 notes/ 研究笔记、38 项能力数据、课程地图与固定版本文件索引生成。

## 内容

- index.html：十个章节，新增“一图总览”；能力搜索/类别/交付程度筛选、可展开详情、打印样式。
- images/harness-capability-map.png：中文能力全景图，支持原尺寸查看与下载。
- sources.html：2,478 个固定版本文件及路径搜索、大小和 Git blob SHA。
- records.html：本研究的原始能力、结构与验证 JSON 记录。
- styles.css、app.js、sources.js：原创样式与交互，无第三方浏览器运行依赖。

## 阅读

直接打开 index.html，或在研究集根目录运行：

~~~powershell
python -m http.server 8767 --bind 127.0.0.1 --directory projects/003-learn-harness-engineering/web
~~~

访问 http://127.0.0.1:8767/。页面不发送模型请求、不扫描本机业务项目、不安装上游 Skill。

## 生成与验证

~~~powershell
python projects/003-learn-harness-engineering/scripts/build_research.py
python projects/003-learn-harness-engineering/scripts/check_research.py
python projects/003-learn-harness-engineering/scripts/build_research.py
~~~

首次生成需要 Python markdown；浏览器检查需要 Python Playwright 和可启动的 Chromium/Chrome/Edge。HARNESS_RESEARCH_BROWSER 可指定本机浏览器路径。最后一次生成将刚产生的网页检查记录同步到 records.html。

上游脚本实验使用独立的 verify_upstream.py，不能把网页检查结果当成上游业务功能检查结果。

## 部署状态

通过研究集现有 GitHub Pages 流程发布，公开地址验证后登记到 projects.json。网页使用相对静态路径，由统一打包流程收集；源码和文档维护在本子项目中，完整上游源代码只位于忽略缓存。
