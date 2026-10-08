# 原作能力对应演示

每例先保留来源中可以确认的具体技术或效果，再用我们的内容演示产品用途。原文、视频观察与我们的实现分别记录，不以数量对应代替参考价值。主站 [对照页](../index.html#demo) 直接显示原视频与逐项核对点。

## 十例操作

| 入口 | 需要操作什么 | 本地技术 |
| --- | --- | --- |
| [01 空间作品集生成器](index.html?id=1) | 选择陈列中的成果，编辑内容与主题，再导出网页。 | CSS perspective / transform 物件陈列、悬停与拖动；同一内容配置驱动详情和独立 HTML。 |
| [02 程序化研究街区 RPG](index.html?id=2) | 移动镜头、寻找地点、判断对话并提交证据。 | 本地 Three.js、程序化几何与材质、Web Audio、共用任务状态。 |
| [03 研究观点叙事片](index.html?id=3) | 编辑观点、播放或拖动镜头时间线，导出视频与脚本。 | 原创 Canvas 镜头编排、统一时间轴、浏览器视频录制。 |
| [04 研究工作台动效发布片](index.html?id=4) | 修改卖点，核对图形转场和功能演绎，导出动态视频。 | 原创 Canvas 动效、时间轴插值与浏览器视频录制。 |
| [05 第一人称机房生存](index.html?id=5) | 移动与转向，瞄准并射击机器人，完成波次。 | 本地 Three.js、第一人称镜头与 Raycaster 射线命中、追击和遮挡逻辑、波次状态循环。 |
| [06 角色钢琴音乐动画](index.html?id=6) | 修改旋律和节奏，核对角色与弹键同步，导出 WAV 和 Python / Blender 脚本。 | 网页用 Three.js + Web Audio 实时预览；Python 标准库写 WAV；bpy 脚本设置三维场景、关键帧和渲染。 |
| [07 三维研究集市](index.html?id=7) | 进入巷道、到达展位、切换光线并导出参观记录。 | 本地 Three.js、程序化建筑与材质、可移动视角和展位交互。 |
| [08 立体吉祥物触碰沙盒](index.html?id=8) | 触碰角色、观察形体反馈；可选择附加挑战。 | Three.js MeshPhysicalMaterial 高光材质、射线命中、局部顶点形变、阻尼回弹与重力积分。 |
| [09 可漫游的热带研究营地](index.html?id=9) | 步行到观察点，改变天气与时刻，导出环境配置和画面。 | 本地 Three.js、程序化环境与材质、第一人称镜头和共享环境状态。 |
| [10 三维车球物理挑战](index.html?id=10) | 控制车辆、切换相机、使用 Boost，将球推入球门。 | 本地 Three.js + 我们的简化运动与碰撞计算。 |

各页面底部“导出本次体验 JSON”保留当前状态、原帖、原作能力、采用的技术与仍有的差距。03/04/06 可按浏览器支持录制 WebM；录制需要保持页面可见，离开或取消不输出不完整影片。WebM 不等于 MP4。06 可下载当前配置的 Python / Blender 脚本；Python WAV 已运行，本机未安装 Blender，bpy 场景与离线渲染未验证。

## 技术与运行

通过 HTTP 服务打开 /labs/?id=1 至 /labs/?id=10；不要直接用文件协议加载 JavaScript 模块。页面用本地 Three.js、CSS / Canvas、Web Audio 和浏览器录制 API；无模型后端、订单或联机系统。WebGL 不可用时，各模块保留明确标注的兼容功能，二维画面不能当作三维验收。

模块通过 mount(container,helpers) 挂载，返回 getState() / setActive(boolean) / dispose()。helpers 提供 css、escape、onStatus、downloadFile；宿主负责来源、范围和体验导出。隐藏视图时暂停，释放时停止帧循环、输入监听、音频和录制。

原作未公开的内部技术保持未知；产品用途由我们推演。与原作的画质、全部玩法和自动生成过程仍有差距，详见 [十例记录](../../notes/ten-demos.md)。新版验收保存在 notes/reference-*.json，上一版 ten-demos-verification.json 仅为旧实现记录。
