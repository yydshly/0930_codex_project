# 多个 Web 演示的部署方案

当前仅完成研究仓库初始化，尚未创建或发布站点，也未配置 Pages 发布工作流。

## GitHub Pages 的组织方式

GitHub Pages 提供静态 HTML、CSS 和 JavaScript 托管，一个仓库对应一个 Pages 站点。因此，本仓库未来将多个静态演示汇总到同一站点的不同路径。

预期路径（尚未上线）：

```text
https://yydshly.github.io/0930_codex_project/
https://yydshly.github.io/0930_codex_project/projects/001-example-repo/
https://yydshly.github.io/0930_codex_project/projects/002-another-repo/
```

构建汇总目录建议如下，`_site/` 为生成目录，已加入忽略规则：

```text
_site/
  index.html
  projects/
    001-example-repo/
      index.html
      assets/
    002-another-repo/
      index.html
      assets/
```

## 添加第一个演示时

1. 在子项目 `web/` 内选择技术栈，记录版本并提交依赖锁文件。
2. 将构建资源基路径设为 `/0930_codex_project/projects/001-example-repo/` 等实际子路径；直接编写的静态页面优先采用相对资源路径。
3. 如果使用客户端路由，选择适合静态托管的 hash 路由或静态页面导出，并验证刷新与直接访问。
4. 创建统一发布工作流，逐个构建需要发布的演示，将产物汇总到 `_site/`，添加首页入口和 `.nojekyll`。
5. 在仓库的 Settings → Pages 中选择 GitHub Actions，统一上传站点产物并部署；不要让多个子项目的工作流分别覆盖同一个 Pages 站点。
6. 检查每个演示页面、资源与路由后，把实际可用地址写入 `projects.json` 的 `demo`，重新生成索引。

具体构建命令待第一个真实子项目确定后添加，避免提前绑定技术栈。

## 需要后端的项目

GitHub Pages 不运行 Python、Node.js 等服务端应用。需要数据库、持久化、服务端密钥或实时接口的演示，应部署到支持相应运行环境的平台；索引中的 `demo` 可以指向外部 HTTPS 地址。

前端构建变量通常会暴露在浏览器中，不能用来保存服务端密钥。

## 官方参考

- [GitHub Pages 概述与站点限制](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [配置 Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
