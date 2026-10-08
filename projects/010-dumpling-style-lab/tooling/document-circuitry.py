from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report=json.loads((P/'notes/circuitry-package-check-20261004.json').read_text(encoding='utf-8'));assert report['passed']
frames=json.loads((P/'notes/circuitry-production-frames-20261004.json').read_text(encoding='utf-8'))['frames']
observations={'prismcube':'八个实际三维角块与珐琅面片可辨，过程角块朝向改变，完成时显示六面同色；当前图为真实网格兼容投影。','orbiter':'外环飞船、航道、实际探机、弹丸、双点耐久与护盾可辨，过程有三个真实探机，不用空场景作为封面。','automata':'部署区、六单位和血条可辨，职业缩写减少交战标签拥挤；完成时对方单位实际清除。','receiver':'生成的仪表留白容纳实际模型频谱与稳定条，透明旋钮与参数一致；过程清晰波形、完成三信标记录不同于初始噪声。'}
review={'production_visual_review':True,'browser_acceptance_complete':False,'review_method':'Viewed 12 production frames in initial/progress/complete contact sheets; reviewed final complete sheet after status wording correction. Canvas2D and actual THREE geometry depth projection via Skia, not browser screenshots.','frames':[dict(v,sha256=sha(P/v['file']),review_observation=observations[v['id']]) for v in frames],'fixes':['外环半径减至 220，避免飞船与底部状态栏相互遮挡。','飞船从 46 加大到 58，航道编号向内移，保持轮廓与数字可读。','环轨封面取正常试玩时仍有实际敌机的状态。','战棋职业标签改为守、弩、修，减少交战时标签重叠。','珐琅生成材质在运行时着成六色，WebGL 和兼容投影使用相同贴图。','完成与失利提示匹配真实状态，失利后开始按钮禁用并保留重试入口。'],'verified':['四段正常命令通关，不注入胜利。','67 项规则、60 项生产控件/几何/音频生命周期检查。','12 张生产绘图，暂停绘制不改变规则状态。','原有 91 形态、100 入口逐项一致，2448 个受保护旧文件保持原样。','26 个打包目标和 32 个 HTTP 资源内容一致。'],'not_verified':['真实浏览器窄屏、全屏、触摸和无障碍树','浏览器刷新存档与实际输入焦点体验','浏览器 WebGL 材质、GPU 阴影、性能与帧率','真实声音输出、设备音量与延迟'],'browser_blocker':'cua.getState initialization failed: windows sandbox helper_unknown_error; setup refresh had errors; kernel exited code 1. No alternate browser automation used.','scope':'四段原创可玩形式演示；二阶固定打乱、二维环轨、单轮三对三、本地合成调谐模型，不等于完整商业游戏。'}
(P/'notes/circuitry-quality-review-20261004.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
head='''2026-10-04 本轮新增 **立体扭转复原、径向环轨射击、自动战棋布阵、无线电调谐**。当前共 **104 个入口、95 种可玩形态**，旧游戏、画风版本与存档标识继续保留。

[立体复原 × 环轨射击](http://127.0.0.1:8962/forms.html?left=twisty-puzzle&right=radial-shooter#compare) · [自动战棋 × 调谐](http://127.0.0.1:8962/forms.html?left=auto-battler&right=radio-tuning#compare)。九份原创场景、材质与透明素材使用内置 ImageGen 制作，[完整提示词、源 PNG 与哈希](assets/game-forms/circuitry-generation.json) 已保存。[能力与边界](notes/circuitry-forms-20261004.md) 说明真实三维小块、二维环轨、单轮自动战斗与本地合成调谐。

127 项新增规则与交互检查、旧游戏回归、6 项站点测试与 19 个演示构建通过。2448 个受保护旧文件没有修改或丢失，原有 91 种形态、100 个入口逐项一致。26 个打包目标和 32 个 HTTP 地址的内容一致；十二张开始、过程与完成画面已保存并查看。

**真实浏览器、GPU 和音频设备验收仍未完成**：CUA 初始化退出，窄屏、全屏、触摸、真实声音与刷新存档仍待确认。当前不宣称产品质量全部验收。[质量记录](notes/circuitry-quality-review-20261004.json) · [完整检查](notes/circuitry-package-check-20261004.json)。以下历史数量按记录时计。

'''
f=P/'README.md';s=f.read_text(encoding='utf-8')
if not s.startswith(head):f.write_text(head+s,encoding='utf-8')
f=P/'notes/game-form-coverage-next.md';s=f.read_text(encoding='utf-8');first,rest=s.split('\n',1)
addition='''

2026-10-04 当前：**95 种形态、104 个入口**。立体扭转复原、径向环轨射击、自动战棋布阵与无线电调谐已接入。[能力边界与参考](circuitry-forms-20261004.md) · [质量记录](circuitry-quality-review-20261004.json)。原有 91 种形态、100 个入口逐项一致，旧模块和资产保持原样。

本轮增加的主要差异是表层扭转、环周瞄准、战前决策和连续仪器调节。九份原创 ImageGen 资产、十二帧生产绘图、127 项新增检查均已保存。二阶使用真实三维网格，兼容投影明确标注；无线电使用本地合成信号。真实浏览器、GPU、音频设备、触摸、全屏和刷新存档验收尚未完成。

仍可探索真人影像片段编排、全景节点调查、实体证据卷宗、非对称潜入指挥、跨玩家异步传递、自由三维轨道飞行与现实空间 AR。这些需要分别定义内容组织、信息流或设备输入，不计入已完成数量。现有本轮形式也可扩展机械锁、曲面航道、职业连携与原创广播剧情。

以下历史记录按各批记录时计，不覆盖旧结论与保存内容。
'''
if addition not in s:f.write_text(first+addition+rest,encoding='utf-8')
print('Documented four forms, generated assets, visual review and acceptance limits')
