# 九种可玩方向 · 世界美术与体验升级

[九款试玩入口](http://127.0.0.1:8962/games.html?game=detective#game-view)可切换不同画风与规则。搬家日保留三份委托；本轮继续升级其余八款的场景、成年角色、动态物件、任务、旅程记录和结局展示。它们是可完成的固定短章 / 短关卡，内容范围见下表。研究页 [index.html](http://127.0.0.1:8962/)保留原作在线体验、设计说明，以及前期三个短体验和二十种材质附录。

## 运行

在仓库根目录执行：

```powershell
python -m http.server 8962 --bind 127.0.0.1 --directory projects/010-dumpling-style-lab/web
```

新增游戏不需要安装前端依赖；所有场景与资源从本地加载。Three.js r160 保留在 `vendor/`，附 [MIT 许可证](THREE-LICENSE.txt)。原作 iframe 从原域名加载，需要联网。

## 九款实际游戏

| 入口 | 操作 | 已实现的完成范围 |
| --- | --- | --- |
| [旧城失物局](http://127.0.0.1:8962/games.html?game=detective) | 点击物件、证人走近调查；方向键/WASD移动，E互动；回局里选择两件证据，再选择对象和理由 | K17 胶片归还案件，允许纠正误判，保存调查与判断记录 |
| [山间小驿站](http://127.0.0.1:8962/games.html?game=wuxia) | 点击山路对象调查；用操作按钮分配绳索、补给并完成救援安排 | 有限物资影响路线与救援的一段山路章节 |
| [小小生态岛](http://127.0.0.1:8962/games.html?game=ecology) | 点击地块选栽植处，调整水闸，推进季节；观察后可回退上一季或继续新年 | 三季演替、苗木/劳动收支与不同生态布局结果 |
| [最后一座温室](http://127.0.0.1:8962/games.html?game=wasteland) | 点击设施检查，操作按钮维修和分配；核对收支后推进天气回合 | 三轮情境，成功、代价与失败反馈 |
| [记忆渡船](http://127.0.0.1:8962/games.html?game=dream) | 点击物件或机关走近；方向键/WASD移动，E互动，F放回物件 | 物件改变桥、水位、门；两空间与两种归岸选择 |
| [屋顶快递赛](http://127.0.0.1:8962/games.html?game=arcade) | 左右/A/D移动，空格/上/W跳，F冲刺，E投递；手机有对应按钮 | 三条路线、平台碰撞、检查点、起跳预备、可选自动前进、各路线最好成绩与收件人回信 |
| [七日小旅店](http://127.0.0.1:8962/games.html?game=inn) | 点旅人听需求；选房，点布置架或按钮放家具；安排入住后观察、调整、送别、进入下一日 | 十个游戏日与两章，三位旅人及回访；倾听或计划产生不同来信，重访保留旧信与房间 |
| [浮岛探险社](http://127.0.0.1:8962/games.html?game=islands) | 点岛面行走、点物件调查；WASD / 方向键移动，E 调查身边对象；取得工具再改变通路 | 营地、遗迹、云塔三个区域；两章通路机关、归航灯与归档，可重访探索所得 |
| [搬家日](http://127.0.0.1:8962/games.html?game=movers) | A/D或左右移动，空格跳，E 拿起/轻放，F 投掷；点选货物走近，点车厢辅助送达；手机独立控制按钮 | 三份生活委托各三件货物；重物变慢，易碎包装可补救且保留已交付物件；感谢信、评价和最佳记录 |

旅店有临街窗房和内院静房的固有差异；植物、茶桌、书架每件只有一份，放进另一房会从旧房移走。点击所选房已经放着的家具会收起。可以入住后换房或调整；旅人实际安顿好后再送别。

浮岛缺工具时有真实通路限制：绳索接通断桥，探险灯开启封印。两条线索可按不同顺序调查，返回营地后在航图归档；第二章“云塔归航灯”已开放；风向台接通右岸桥，星环校准后可点亮归航灯，再返回营地归档。

搬家日使用原创生成位图美术和本项目的简化物理规则，不是完整刚体引擎。货物的重量、碰撞、重力和落地冲击影响动作与结果；点击自动搬运是可用的辅助操作，键盘或手机方向控制可以接手。

## 保存与共用控制

`games.js` 负责游戏切换、按钮、键盘、手机控制、声音、暂停、大画面和保存；各游戏模块提供画布、状态、规则与反馈。

- 九款进度分别存于当前浏览器 localStorage，键名为 `dumpling-extension-v1-` 加 `detective`、`wuxia`、`ecology`、`wasteland`、`dream`、`arcade`、`inn`、`islands`、`movers`。共享存档外层格式仍为1；搬家日内部状态升级为3并兼容旧版1，旧版已交付物件保留。
- 约每 1.1 秒检查保存，操作按钮、切换、页面隐藏或离开时也会保存；刷新后恢复各游戏的进度。
- “重新开始”先显示确认；重访、重跑按钮保留旧结果，清空确认只清除当前游戏，其他方向保留；它们与原作及旧演示不共用存档。
- 声音默认关闭，主动开启后播放 Web Audio 合成的音乐与音效；支持暂停和大画面。
- 手机提供方向及互动按钮；跳跃、投掷按具体游戏规则使用，旅店主要通过点击和安排按钮操作。
- 新入口没有云保存、账户或跨浏览器同步；浏览器无法保存时，页面显示本次可继续游玩的提示。

## 模块与验收

`game-catalog.js`注册九种方向，`games/`里的同名模块实现各自的规则与画面。`inn.js`、`islands.js` 本轮升级美术；`movers.js` 本次重做并配合 `moving-contracts.js`、`moving-art.js`、`moving-interface.js` 和 `moving-day.css`；新增 `detective.js`、`wuxia.js`、`ecology.js`、`wasteland.js`、`dream.js`、`arcade.js`。浮岛另有 `islands-world.js` 与 `islands-art.js`。公共模块返回 `tick`、`draw`、`command`、`getUI`、`getState`、`getTargets`、`dispose`；共享页面驱动更新，状态是可序列化 JSON，真实点击目标供浏览器验收使用。

[新游戏验收](../notes/extension-v1-check.json)核对真实输入、规则与前置条件、错误恢复、章节完成和存档恢复；[研究页面检查](../notes/extension-presentation-check.json)核对嵌入入口、切换、布局、截图与静态资源。检查通过仅表示所列工程行为可用，没有测量玩家情绪或留存。

本轮截图在 `assets/extension-` 加六个新方向ID的 WebP 文件中；九款总览为上级 `assets/extension-v2-overview.webp`，六张手机截图为上级 `assets/extension-` 加ID与 `-mobile.webp`。设计与范围见 [第二轮说明](../notes/extensions-v2.md)。原有三款截图与[第一轮说明](../notes/extensions-v1.md)保留。

## 保留的前期附录

前期治愈生活、神秘探索、欢乐卡通位于研究页 `play-lab`；仍可用 `?experience=cozy/wonder/playful#play-lab` 访问。它们是短任务与反馈的阶段原型，当前九款具有各自的完整短章规则。

二十种材质对照位于研究页 `visual-archive` 折叠附录（段落标识 `lab`）：十七种二维绘制方向、三种 WebGL 三维方向。它们展示开盖、挤压、昼夜和参数变化，方法见 [前期研究笔记](../notes/research.md)，旧验收记录只对应旧轮次。

失物局、驿站、生态岛、温室、渡船、快递赛六项在第二轮已实现。详见[第二轮范围](../notes/extensions-v2.md)、[真实操作验收](../notes/extension-v2-check.json)和[研究页验收](../notes/extension-v2-presentation-check.json)。存档格式仍为1，新增方向使用同一前缀加各自ID，原有三款进度保留。

可使用仓库 `scripts/build_site.py` 构建子路径静态站点。没有新公开入口，目录清单的 `demo` 保持为空。

## 搬家日产品样板

详见 [产品升级记录](../notes/moving-day-product.md) 与 [当前实际检查](../notes/moving-day-product-check.json)。14 个运行时 WebP 位图约 2.5 MB（2.38 MiB）；原始 PNG 在上级 `assets/product/sources`，通过 `tooling/prepare-moving-assets.py` 复现切图与压缩。人物保留透明通道并统一脚底基线，场景斜坡与碰撞使用相同坐标。

`?game=movers&qa=1` 使用独立 `dumpling-product-qa-v3-` 存档前缀供实际界面检查，正常入口使用原有前缀；请从不带 `qa` 的地址游玩。

## 八款世界的本轮升级

详见 [世界升级记录](../notes/worlds-product.md)、[规则回归检查](../notes/worlds-rules-check.json)与[实际界面检查](../notes/worlds-ui-check.json)。公共界面在 `worlds-interface.js` / `worlds-product.css`，二维资源按当前游戏在 `games/worlds-art.js` 加载。53 个原创 WebP 约6.4 MB，原始素材在上级 `assets/worlds-product/sources`。`tooling/prepare-world-assets.py` 只切图与压缩，保留生成的透明通道。浮岛继续使用真实 Three.js 立体场景，材质、树木、人物比例、光照和镜头已更新。

`qa=1` 为九款共用的独立检查存档，正常试玩地址不带这个参数。旧检查脚本及记录对应历史轮次，当前真实浏览器检查通过 CUA 完成；规则回归在 Node VM 中运行，并明确模拟绘图 / 3D 渲染器的边界。

本次内容完善增加 `world-progress.js`，从实际存档状态生成阶段目标与提示；温室库存直接显示在游戏画面上方。完整规则与旧存档迁移由 `tooling/check-world-rules.mjs` 检查，实际界面另由 CUA 游玩验证，记录见 `notes/worlds-continuation-ui-check.json`。
