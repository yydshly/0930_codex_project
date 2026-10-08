# 完整研究网页

2026-10-08 整理为五个页面：总览与全部入口、完整理解、原有全景图阅读、特征学习与检索教学示意、14 组来源与讨论 / 制作记录。各页提供相互导航与研究集入口。

引导图沿用 `../assets/understanding-map.png` 与 `.svg`，保持原有内容和字节。原理页使用人工设定的三维向量，不运行模型或上传素材；所有展示都标明性质。

在仓库根目录运行：

```powershell
python projects/013-insightface-retrieval/scripts/build_web.py
python scripts/build_site.py
python -m http.server 8939 --bind 127.0.0.1 --directory _site
```

打开 `http://127.0.0.1:8939/projects/013-insightface-retrieval/`。网页生成和打包只依赖 Python 标准库，阅读不需要外部运行服务。不要仅独立复制 `web/`，因为原图由发布器从项目 `assets/` 一起打包。

共享 GitHub Pages 工作流发布后，核对全部公开文件、原图哈希、链接锚点、桌面 / 手机阅读、PNG / SVG 下载与教学交互，再更新项目清单中的公开地址。验证材料存于项目 `notes/`。
