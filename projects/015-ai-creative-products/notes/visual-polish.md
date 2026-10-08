# 十例视觉优化 v7

这是 v7 视觉基底的历史记录。当前 v8 的问题定位、改动与验收以各自 case-XX-optimization.md / .json 为准；此处旧的检查数量不代表本轮逐例优化已通过。共用的 reference-*.json 会更新到最新运行结果。

用户指出上一版虽然有能力对应，画面仍粗糙。此次按原作关键帧与上一版实际画面核对，改进视觉设计与可操作场景。

| 案例 | 本轮改进 |
| --- | --- |
| 01 空间作品集 | 真实成果封面、纸页厚度、金属挂架、居中陈列与投影；独立 HTML 保留图片与交互。 |
| 02 研究街区 | 摄影砖石与环境光、细化建筑、站员和街景层次；保留第一人称任务系统。 |
| 03 观点叙事 | 受光纸面档案、星空光晕、裂缝墙体、前后线框球与分镜层级。 |
| 04 发布动效 | 巨型字体、透视环字、径向点阵、连贯缓动与品牌回收。 |
| 05 机房生存 | 圆角机柜与武器、金属反射、地面纹理、灯带和室内光照层次。 |
| 06 角色钢琴 | 胡桃木琴体、金属框线与踏板、真实乐谱贴图、灯罩、机器人和猫的细节；近景与暖侧光；手机自适应取景。 |
| 07 研究集市 | 摄影石路、木构与瓦片、独立叶簇、日光阴影与近地视点。 |
| 08 软体角色 | 亮泽软胶、角色表情与肢体细节、HDR 反射、接触影；保留局部形变。 |
| 09 热带营地 | 摄影沙石、棕榈叶、HDR 天空、双尺度水面法线与反射、浅水层次、岸岩和船。 |
| 10 车球挑战 | 车窗、轮毂、尾翼、尾灯、尾焰、草皮标线、球网、看台与灯阵。 |

## 画面证据

优化前十张实际画面保存在 `assets/qa/visual-polish/before/`。原作关键帧在 `assets/qa/reference/` 与 `assets/qa/reference-motion-source/`。新版桌面、手机与三列比较图在 `assets/qa/visual-polish/`、`assets/qa/visual-polish-games/`、`assets/qa/visual-polish-worlds/`。它们用于检查具体造型、材质、光照和构图，测试通过数量不能证明与原作等质。

## 运行验证

01/03/04 的 55 项检查见 `visual-polish-editorial.json`，包含真实编辑、拖动、离线 HTML、完整 WebM 解码和寻址。06 的播放、暂停、配置、WAV、Python、音画 WebM、手机与兼容降级见 `reference-music-verification.json`；实际视频 seek 与音视频解码见 `reference-music-seek-verification.json`。实时视频允许最多半秒的编码收尾，不把实际文件时长写成精确的乐谱时长。

游戏验收汇总 38 项见 `visual-polish-games.json`，包含最终场景与射击命中 4 项、关闭 WebGL 的降级 4 项，原始报告分别为 `visual-polish-games-final.json` 与 `visual-polish-games-fallback.json`。世界验收 24 项见 `visual-polish-worlds.json`；环字与球体针对性验收 12 项见 `visual-polish-ring-depth.json`。全部十项主站集成 64 项见 `reference-integration-verification.json`，包含新资源 HTTP 响应检查，errors 与 assetFailures 均为空。26 项材质文件的校验见 `visual-material-verification.json`，完整打包匹配见 `reference-bundle-verification.json`。所有运行材质在本地加载；原作视频仍只在点击播放后请求作者媒体服务器。

## 素材与仍有的差距

PBR 材质与两张 HDR 来自 Poly Haven 的 CC0 资源。原始下载的 MD5 已核对，WebP 转换后的 SHA256 与体积记录在 `visual-material-sources.json`。场景与交互代码为本项目实现；官方 Three.js r160 loader 与倒角几何遵循 MIT。

01 仍是刚性纸面对象，不能等同原作服装的自然形态。03/04 仍有粒子、实体光感与排版密度差距。人物与建筑仍采用程序化模型，09 未引入原作使用的 Meshy 模型。06 的网页视觉改造尚未移植至独立 bpy 配方；本机未安装 Blender，离线渲染未验证。十项均是能力原型，完整游戏、商业流程与自动生成后端仍不在本次实现中。
