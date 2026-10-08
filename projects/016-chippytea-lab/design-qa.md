## 2026-10-08 完整发布检查

本次以真实 Chromium 检查公开静态路径（本机使用 publication.test 模拟公网主机）。60 项检查通过，72 个运行资源大小与 SHA-256 核对通过；包含原图下载、三支 v10 离线预览实际视频解码、三场实际 Canvas 画面和互动、两首 MiniMax MP3 实际解码及播放与 AnalyserNode、暂停、世界收藏保存和刷新重载、桌面与 390 px 手机视口、资料只读快照、纸墨及原作入口、全文档案和锚点。公网 API 请求为零，未出现脚本异常或自身资源失败。

证据：[本机完整检查](notes/publication-local-checks.json)。软件浏览器和手机视口模拟不代表实机设备、人工听感、全浏览器兼容、完整无障碍、业务接入或商业收益。下方及此前 2026-10-03 的 blocked 为当时研发条件，仍保留历史范围。

---

# 三个原创小世界 · v10 自选种植与更可靠的声画互动

2026-10-03。v10 源码、离线渲染和模拟控制核验通过；正式浏览器设计 QA blocked。此次 CUA getState 仍返回 `node_repl kernel exited unexpectedly` 和 `windows sandbox failed: helper_unknown_error: setup refresh had errors`，无法取得新版网页截图、真实触摸或可听播放证据。

## 已修复的发现

- P1 持续拖动锁住动作：pointerMove 曾每次把 age 重设 .7，接力/旋身无法走完。现只更新坐标，动作独立推进，拖动风、线与灯仍持续影响场景。4秒持续拖动模拟和 age>3.5 输入探针通过。
- P1 终幕暂停后继续重播：真实 ended 媒体再 play 会回到零，旧 mock 未模拟。WorldAudio 现在保持 ended，只有显式 seek/replay 可重播；新 mock 复现真实 ended 语义并验证修复。
- P1 音乐准备冻结：加载/播放不决或waiting/stalled会接管时钟却无超时。现首个15秒无进展期限后回退静音并提示重试，连续 stalled 不延长期限，playing 恢复清除计时；迟到 Promise 不覆盖新场景或重启旧音源。控制器模拟通过。
- P2 收藏结果仍偏小：v10幼苗宽度约108–116，根部移回安全岛面并放到角色后层；补丁收集宽度由36至74并逐针压紧回正。相同输入的v9/v10完整图比较显示种植和补丁更清楚，未以结束帧代替过程证据。

未解决的验收条件是实际网页字体与控件布局、手机DOM对白避让、物理输入、焦点/专注退出、浏览器保存重载、自动播放策略、真实媒体切换和听感。未据构建/模拟标通过。

## 新互动及真实音乐

花园“选个位置种下”暂停演出与配乐并取消连演，使用真实seed预览。点击松开或Enter/Space种下，方向键选位，Esc取消；指针进行镜头逆映射。最近四株归一化落点写入 chippytea-garden-plots，旧计数恢复默认位置，保存按钮仍自动选位。最新株依次种子、发芽、展开与安定，旧株保持完整；种下后维持暂停，独立收藏时钟仍完成成长。影子拖灯即时倾身与压身追光。

花园新 MiniMax Music3 配乐已实际生成，原始35.027秒WAV保留，播放版裁至32秒且末1秒淡出，没有变速或合成替代。影子沿用v9约29.94秒生成音频补尾部静音为32秒。月亮唯一请求因需96秒配额、只余4秒被官方免费Space拒绝，未重复提交/规避，没有配乐文件。生成总记录为 notes/world-music-generation-v10.json，影子原记录保留。

花园与影子默认无声，点击配乐开关后由真实HTMLAudio.currentTime驱动；一个媒体元素和一个音频图切换可用源，FFT能量/高低频作小幅回应，暂停/结束/减少动态归零。月亮继续视觉时钟与静音提示。

## 比较与证据

来源视觉方向：assets/concepts/gravity.png、moon.png、shadow.png。继承生产基线：assets/worlds-v9-qa/。这是既有原创方向的演进，参考Chippytea的角色关系与声画编排气质。

浏览器implementation screenshot path：unavailable。Native Canvas帧是共享WorldScenes.ts的输出，没有网页控件或DOM文案，不是网页截图。桌面1536×1024、手机舞台390×260；CSS viewport和browser deviceScaleFactor未取得。v9/v10终幕双方t29,count1,strength50,pointer(.64,.5),age100；同状态幼苗双方t5,count4，补丁双方t5,count1,captureAge2.12。各归一到768×512，放在同一1536×544比较输入，顶部32像素仅标注。

![同输入幼苗离线比较](assets/worlds-v10-qa/gravity-detail-v9-v10-offline-comparison.jpg)

![同输入补丁离线比较](assets/worlds-v10-qa/moon-detail-v9-v10-offline-comparison.jpg)

已打开两幅同状态比较，并检查手机发芽、选位、月亮三针近景与追灯联系图。近景裁切让针脚和拉紧变化可读；全景用于核对比例、图层与角色遮挡。终幕布局延续，不能用它证明新追光或种植过程。

## 验证结果及边界

- 160原生帧、133行为探针、32联系图、59检查通过；可见角色透明框未越界，29原始PNG指纹一致，无新增人物素材。
- 生产renderer SHA：96fbebe9c74f87b61d92bdb65be9c502d826429a74072f885bb4ea80cada2181；Host、Audio、模拟脚本、音乐配置和渲染工具各有最终指纹记录。
- 67项主组件/音频/计时器模拟通过：包括持续拖动、ended防重播、首个超时、metadata延迟、stale Promise、音源切换、位置持久化/恢复、安全区、镜头逆变换、选位暂停/取消连演，以及普通/reduced/后台/错误路径。
- 花园/影子实际MP3均解码32秒，SHA与生成回执相符；384样本的12Hz FFT1024/Hann频谱0..1核验通过。它近似音频频谱，不能作为browser AnalyserNode捕获证据。
- 三段静音离线视频和两段音乐版均640×426、384帧、12fps、32秒。动作预设3.5/10.5/18.5/26.5秒，收藏5/13/21/29秒；花园以脚本落点依次种下四株。镜头没有页面控件，影片不是真实UI录屏，影子追光主要由额外held-light联系图证明。
- 本机HTTP/hash与构建检查另写 notes/worlds-visual-verification.json。没有研究入册POST，真实回执数仅GET读取。

## 五项验收表面

- 字体与文字：沿用KaiTi/STKaiti和中文衬线fallback。新开关、选位与失败提示源码可读；实际字体命中、字重、大小、换行、抗锯齿与DOM层级 blocked。
- 间距与布局：3:2舞台及角色比例保持，幼苗根部与角色后层关系经同状态图核对。移动按钮换行、专注模式、对白遮挡和真实视口尺寸 blocked。
- 色彩与token：奶油纸/苔绿、靛蓝/琥珀与炭黑/薰衣草延续；花园音乐/种植按钮使用苔绿，选位反馈使用真实星种。实际UI对比度和交互状态 blocked。
- 图片与素材：29个真实raster素材沿用，透明框/文件SHA通过；连续变换仍合成原PNG，没有以SVG/CSS/div或程序绘制人物代替。成长与补丁大小已在全图和近景检查。
- 文案与内容：选位说明暂停、种下/取消和本机记忆；花园/影子明确配乐可开、月亮待生成，失败提示保留于专注模式。没有声称月亮已生成、业务成果已接入或完整声画验收已通过。实际DOM密度、包装与朗读 blocked。

## 比较历史与验收要求

v9 QA与验证JSON已归档 notes/worlds-v9-design-qa.md、notes/worlds-v9-visual-verification.json；更早证据保持。v10首轮发现幼苗遮挡风险和补丁过程太小，已把树移到角色后层、放大补丁并加强回正，最终同状态图与联系图重新打开核对。源码冻结后导出影片，文件指纹通过。

规则来源：[Design QA SKILL.md](D:/codex/home/plugins/cache/openai-curated-remote/product-design/0.1.56/skills/design-qa/SKILL.md)：“If browser-rendered evidence is missing, final result is blocked.” 缺少当前网页实施截图，所以正式设计验收保持 blocked。

final result: blocked
