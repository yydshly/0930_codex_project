# witr 实验室 · Web 演示

静态 HTML / CSS / JavaScript，无第三方运行依赖。所有资源相对引用，可放在任意静态子路径。

在线地址：[witr 研究与交互演示](https://yydshly.github.io/0930_codex_project/projects/001-witr/)。首页先展示全景引导图与采用判断，再进入模拟实验台。

## 启动

在仓库根目录执行：

```powershell
python -m http.server 8937 --bind 127.0.0.1 --directory projects/001-witr/web
```

访问 http://127.0.0.1:8937/ 。如已被占用，更换端口；Ctrl+C 停止。不能把本地地址当作公开部署地址。

## 功能与数据

- `index.html`：页面结构、能力和边界说明。
- `styles.css`：响应式布局、键盘焦点与减少动画偏好。
- `data.js`：四个平台、十六个场景组合、能力矩阵和固定版本引用。
- `app.js`：查询模拟、输出切换、复制、分析步骤与可选 WebMCP 增强。

支持单个名称 / PID / 端口 / 文件 / 容器目标和单个输出选项。不实现上游所有语法：混合目标、重复参数、复杂 shell 引号与全部选项组合都不在范围内。输入仅被解析和匹配，不执行系统命令；渲染使用文本或 HTML 转义。

`--json` 返回本页教学结构，带 `demo: true`，不保证上游 JSON 字段兼容。Windows / macOS 容器不伪造虚拟机内进程的宿主机祖先关系。资源均为静态例值。

支持 WebMCP 的浏览器可使用 `configure_witr_demo` 切换平台和场景；该工具只改变本页示例，与 UI 共用处理逻辑。不支持该接口的浏览器不影响正常使用。

## 检查和构建

```powershell
node --check projects/001-witr/web/app.js
node --check projects/001-witr/web/data.js
python scripts/projects.py check
python scripts/build_site.py
```

最后一条生成忽略追踪的 `_site/`，包含总入口和 `/projects/001-witr/`。推送 main 后由统一 Pages 工作流发布。部署说明见 [docs/DEPLOYMENT.md](../../../docs/DEPLOYMENT.md)。
