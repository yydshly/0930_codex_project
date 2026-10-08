# CellMotion 展厅

先播放原作，再读能力、原理和场景。纯静态页面，无构建依赖。

从仓库根运行：

```powershell
python -m http.server 8958 --bind 127.0.0.1 --directory projects/008-cellmotion/web
```

打开 http://127.0.0.1:8958/ 。原作视频、封面、原编辑器从作者站点加载，需要联网。原理示意为本地原创代码。目录使用上游提交 bee7ddfc2b1f487e08aa79a3b91af7628f040eb1 的快照。

入口为 index.html；catalog.js 是原库目录数据；app.js 处理播放、筛选、编辑器嵌入和教学时间轴；style.css 提供桌面与移动布局。没有在本页重新实现原库编辑器或视频编码。

workshop.html 是新增原创实验室：motion-engine.js 提供四种由配置和时间驱动的 Canvas 2D 演示；workshop.js 提供参数控制、图片替换、PNG/JSON 导出和导入、制作需求生成；workshop.css 提供响应式布局。访问 http://127.0.0.1:8958/workshop.html 。素材只在本地使用，JSON 配方可保留图片；生成需求没有调用 AI。视频编码、音轨、批量任务和 3D 未在实验室实现。

操作与提问示例见 ../notes/workshop.md。tooling/verify-workshop.cjs 从仓库根执行，可验证时间轴、各算法、导出、素材恢复与手机布局。

summary.html 为理解汇总页，summary.css 提供响应式排版。assets/understanding-map.svg 与 .png 是一张总览图的矢量与位图版本，页面可查看和下载。汇总包括源库能力效果、技术原理、Remotion/HeyGen 对比、网页功能、个人价值和 AI 日报方案；详细来源见 ../notes/understanding-summary.md。tooling/verify-summary.cjs 可重新渲染 PNG 并验证下载、入口与手机浏览。

按仓库现有 scripts/build_site.py 打包到 _site/projects/008-cellmotion/，通过 GitHub Pages 发布。正式地址和验证结果在项目 README 与 notes/deployment-checks.json 登记。publication.css 提供展厅的三个主要入口和相关链接；研究集首页也展示原有总览图及实验室、总览、成片案例等入口。

tooling/publication.py prepare 生成全部静态资源清单并确认原图未改变；verify --url <公开地址> --commit <提交> 逐文件核对线上内容。tooling/verify-publication.cjs 对本机打包站或公开站点执行实际播放、导航、配方、导出与移动布局检查。原作媒体与编辑器需要联网，本站没有接入 AI 服务、音轨或视频编码。
