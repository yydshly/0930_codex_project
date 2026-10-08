# Chippytea Lab Web · 完整理解与原创声画展示

本网页将源库的能力、价值和原理与我们的原创演出放在一个入口中：功能事件提供含义，图像建立角色与世界，动作表达过程与回应，音乐组织节奏与情绪，用户参与后留下世界记忆。首页使用此前已生成的 [引导图](../assets/chippytea-understanding-map-v1.png)。

[线上总览](https://yydshly.github.io/0930_codex_project/projects/016-chippytea-lab/) · [项目理解](../README.md) · [发布范围](../notes/publication-summary.md)

## 全部网页入口

| 路由 | 内容 |
| --- | --- |
| [默认入口 / ?view=overview](./index.html?view=overview) | 五大理解、原有引导图、三个演出入口、产品扩展、来源及证据 |
| [?view=experience&scene=gravity](./index.html?view=experience&scene=gravity&v=10) | 引力花园：选位种植、接力星种、生长、MiniMax 配乐 |
| [?view=experience&scene=moon](./index.html?view=experience&scene=moon&v=10) | 月亮修补铺：拉线、追逐、三针缝补，当前静音 |
| [?view=experience&scene=shadow](./index.html?view=experience&scene=shadow&v=10) | 影子排练场：追光、旋身、共舞、保存姿势、MiniMax 配乐 |
| [?view=source](./index.html?view=source) | 源库对照：虚构清理示例、手绘组件、收集动画、原作完整 Karaoke |
| [?view=research&mode=records](./index.html?view=research&mode=records) | 实际资料状态与研究回执；静态站只读、本机服务可重新核验和保存 |
| [?view=folio](./index.html?view=folio) | 历史研究成册：24 秒四幕静音预演 |
| [?view=research](./index.html?view=research) | 保留旧行为，进入原创小世界；需要资料操作时加 mode=records |
| [来源与许可](./source-notice.html) | 上游署名、原作截图、素材与音乐来源说明 |

这些相对链接适用于本地 HTTP 服务，也保留同样路径的线上直达方式。在线阅读与本机资料服务能力的区别如下。

| 能力 | 静态站 | 本机 research_server.py |
| --- | --- | --- |
| 总览、原作对照、三场演出、历史纸墨 | 可查看 | 可查看 |
| 花园和影子真实 MP3、世界本机存储 | 可使用 | 可使用 |
| 研究资料与已有回执 | 构建时只读快照 | 每次读取当前仓库 |
| 重新核验并保存真实回执 | 不支持，页面禁用保存 | 支持固定项目资料核验与原子保存 |

## 三个原创小世界怎样操作

每场 32 秒四幕，每幕 8 秒，结束后停在终幕。页面提供暂停/继续、重演、章节、进度、强度、专注观看与有限连演。连演依次经过花园、月亮和影子，每场谢幕后至少等待 3.5 秒并等当前互动完成；手动切场、重演、跳转或花园选位会取消连演。

1. **引力花园**：拖动改变风向，点按让星种飞起并触发园丁与风精灵接力。点击“选个位置种下”后演出与配乐暂停，种子预览随选位移动；点按岛面提交，也可方向键选位、Enter/空格种下、Esc 取消。种下后仍暂停，独立收藏动画完成连续生根、抽芽、展叶和站稳，再点继续演出恢复。最近四株实际落点保存在本机；原保存按钮自动选位。
2. **月亮修补铺**：拖动拉线，点按触发月亮打嗝与裁缝追逐。收藏让补丁从裁缝手中飞向月亮，三针逐次拉紧，月亮闭眼满足。当前没有音乐文件。
3. **影子排练场**：拖动灯光，影子即时追光倾身和压低身形；点按切换站立、跃起、旋转与行礼，小光团随后举灯。收藏当时姿势与参数，纸影飞到前排并留下回应。

即兴与收藏有独立时钟，暂停也能完成反馈。舞台聚焦后可用方向键移动、空格触发；专注模式可用退出按钮或 Esc 返回。系统“减少动态”偏好会暂停配乐并保持选定章节静帧，禁用连演，操作保留静态结果。

世界状态仅存于本浏览器 `localStorage`：三个计数位于 `chippytea-original-worlds`，各场上限 30；花园 `chippytea-garden-plots` 保留最近四株归一化落点；影子 `chippytea-shadow-poses` 保留最近三个实际动作、指针、时间与强度。前排最多五位观众，其中最近三份用实际动作，其余为通用行礼剪影。当前不保存实际研究内容，不提交 `/api/research/collect`，不增加真实研究回执。

## 音乐与声画同步

默认无声，花园和影子各自点击配乐开关才播放。两首均为 [MiniMax Music3 官方 Space](https://huggingface.co/spaces/MiniMaxAI/MiniMax-Music3) 实际生成文件：花园原始 WAV 35.027 秒，裁至 32 秒并末秒淡出；影子原曲约 29.94 秒，淡出后补静音至 32 秒。原始文件、提示、Job ID、SHA 与处理回执保留，没有变速或合成替代。月亮唯一请求因配额不足被拒绝，未取得文件；实际回执见 [v10 花园/月亮](../notes/world-music-generation-v10.json)与[v9 影子](../notes/world-music-generation-v9.json)。

开启本地配乐后，`HTMLAudio.currentTime` 提供演出主钟，`AnalyserNode` 读取能量、低频与高频并使角色、植物和灯光作小幅回应。同一个音频元素先停前曲再切换源。暂停、章节、跳转、重演、切场和后台状态同步音频；准备或等待超过 15 秒或播放失败会提示并继续静音。终幕暂停后继续保持谢幕，只有显式重演才从头开始。静音时没有实际音频信号，不能据静音动作认定已检测高低音或节拍。

源库对照页的歌曲 **Save Your Mac with chippytea** 从官网远程播放，需要网络。为避免 CORS 分析节点静音，本地让原曲走 HTMLAudio 原生通道，用原有 0.5 秒稳定节拍回退驱动角色；词级歌词与段落仍跟随实际播放时间。这个适配不属于本地对原曲做实时频谱检测，也不是原创世界的配乐。

历史纸墨实验的 MiniMax 配乐仍未取得；其“重新观看纸墨预演”只重置静音视觉，不保存或增加回执。原作与历史音乐记录都不代替新世界的实际文件和验收。

## 首次构建、更新与本机服务

从仓库根目录执行：

```powershell
npm --prefix projects/016-chippytea-lab/tooling ci
python projects/016-chippytea-lab/tooling/research_snapshot.py
node projects/016-chippytea-lab/tooling/build.mjs
python scripts/build_site.py
python projects/016-chippytea-lab/tooling/research_server.py
```

随后打开 `http://127.0.0.1:8977/projects/016-chippytea-lab/`。依赖为锁定的 React/ReactDOM 18.3.1、esbuild 0.25.10 与 Python 3 标准库；普通静态 HTTP 服务可只读展示，无须服务密钥。资料服务默认只监听 `127.0.0.1:8977`，来自 `_site/`；不扫描任意个人目录、不运行 Mac/Rust 清理引擎。

修改源码、文档或清单后重新执行快照、浏览器打包与共享站构建。快照脚本只读，不新增回执。输出为 `web/app.js`，许可保留于 `app.js.LEGAL.txt` 与 `source-notice.html`。仓库发布说明见 [DEPLOYMENT.md](../../../docs/DEPLOYMENT.md)。

## 资料回执 API 与保存规则

| 入口 / 文件 | 用途 |
| --- | --- |
| `GET /api/research/state` | 当前清单、固定材料、状态、指纹与回执 |
| `POST /api/research/collect` | 只接受 `{"projectId":16}` 形式，服务重新核验后决定保存 |
| `../notes/research-collection.json` | 每项目一份持久回执：ID、序号、首次保存/核验时间、资料指纹和依据 |
| `research-state.json` | 构建时只读快照，不是实时账本 |

核验覆盖目录、总索引、来源登记、README、顶层 Markdown 笔记、登记封面和已有 Web 入口。README 与至少一份笔记去除注释、标题、链接和已知模板后，采用 100 个非空白字符的粗略阈值；来源仅核对格式，不访问上游。这只确认资料结构，不认证语义、结论、审美或页面效果，也不改变清单完成状态。

唯一写入目标是本项目回执账本。首次保存增加数量，重复核验不增加，资料变化更新同一回执；临时文件、同步落盘与原子替换保证失败不返回成功，损坏账本保留并报错。没有账号、跨设备同步、撤销或完整修订历史。本机服务拒绝其他来源页面提交，页面和 API 应来自同一个 8977 服务。

## 验证与许可边界

v10 的 160 张离线帧、133 条探针、32 张联系图、59 项共享渲染检查及 67 项 Host/音频逻辑模拟通过；29 个 PNG 指纹一致。花园和影子实际 MP3 解码均为 32 秒，离线 FFT 与回执 SHA 已核验。离线视频与 mocked 控制不等于真实浏览器验收，当前范围见 [design-qa.md](../design-qa.md)与[发布摘要](../notes/publication-summary.md)。历史真实回执和纸墨舞台曾有浏览器证据，新演出需按当前版本单独检查。

原作清理、旧任务实验采用虚构或内存数据；Mac 原生应用、Rust 引擎、真实删除、空间释放、完整无障碍、全浏览器兼容与商业收益未验证。旧 Windows helper 故障记录保留，是否已取得新的网页证据以本次发布检查为准。

上游代码和绘图路径为 MIT，见 [许可证](../CHIPPYTEA-LICENSE.txt)。原作歌曲权益独立，仅远程播放；MiniMax 音乐不能沿用源代码 MIT 结论。概念图、动作素材、生成提示与实际音乐请求均可在项目资料追溯。
