# 本地网页

从仓库根目录启动：

```powershell
python -m http.server 8947 --bind 127.0.0.1 --directory projects/007-koi-scene-lab/web
```

index.html#original：原作；#scene：按生成图构造；#tech：原理与价值。

app.js 为 src/main.js 的本地打包产物；修改源模块后进入 ../tooling 运行 npm ci 与 npm run build。Three.js、dat.gui、图片和原作均在本目录，无自动外部请求。

upstream/koi-pond.original.html 是上游精确快照，运行页面 koi-pond.html 只替换两条脚本地址。它的所有交互仍属于原作者实现，MIT 声明随文件保留。

当前扩展是按生成图的设计重建，不是现场测绘；参数单位为设计估计米。真实扫描 GLB 可通过场景右侧入口导入。

v19 新增“庭院猫巡游”和“观察庭院猫”视角；点击“轻触锦鲤”或聚焦画布后按 G，鱼群会经历警觉、惊散和恢复。空格暂停/继续。对应原理可在“效果与技术原理”的“警觉、惊散与恢复”“动物形体与场景构造”查看。技术范围见 [动物行为记录](../notes/wildlife-v19.md)。

v20 收尾猫的虎斑、坐姿、距离驱动步态与庭院背景镜头；技术及限定验收见 [v20记录](../notes/cat-refinement-v20.md)。

v21 在“原理与价值”中先展示原作实图，再整理底层计算、当前能力、模型复用方向与个人价值。页面提供 2560×3885 的一图总览下载。照片参数化、实物制造与一致性验收均标注为未来设想；互动场景仍使用 v20 的 app.js。内容、来源与本轮验证见 [v21记录](../notes/understanding-v21.md)。
