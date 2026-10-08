from pathlib import Path
import json
P=Path(__file__).resolve().parents[1]
report=json.loads((P/'notes/studio-package-check-20261004.json').read_text(encoding='utf-8'))
review={'date':'2026-10-04','forms':75,'entrances':84,'new_forms':6,'reviewed_assets':['mosaic','span','lumen','sonata','afterimage','weave','painting','props'],'original_assets':8,'render_review':{'method':'Production Canvas2D through Skia and DOM lifecycle double. Contact sheets visually reviewed for scene composition, art matching, gameplay readability and completion results. Not browser screenshots.','phases':['initial','progress','complete'],'frames':18,'refinements':['Tight alpha-bound atlas sampling and aspect-preserved actors','Image textured truss beams and readable moving postal vehicle','Named musical notes instead of numeric semitone offsets','Multi-run nonogram clues with deterministic no-guess solution','Root scene focus supports Q rotation','Cached line candidates avoid repeated exhaustive work each frame','Final optical completion message no longer prompts a nonexistent next stage']},'checks':report['new_checks'],'preservation':report['preservation'],'packaged':report['packaged'],'browser_qa':{**report['browser_qa'],'attempts':['rewriteDocumentation failed before connection','js_reset succeeded; getState failed with the same sandbox launch error']},'acceptance_complete':False,'limitations':['One twelve-piece jigsaw painting','One bridge canyon with eleven fixed construction nodes and simplified linear truss loading','Two three-mirror optical layouts','Four synth tracks and a sixteen-step phrase, no sample recording or song sections','Two-dimensional position replay, no world-state rollback','One eight-by-eight numeric pattern'],'references_note':'Reference game links describe participation directions. All playable art and mechanisms here are original short-scene implementations.'}
(P/'notes/studio-quality-review-20261004.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
readme=P/'README.md';old=readme.read_text(encoding='utf-8');old=old.replace('2026-10-04 本轮新增 **时间操控','2026-10-04 上一批新增 **时间操控',1)
head='''2026-10-04 本轮新增 **拼图旋转吸附、物理造桥、光线反射、音乐作曲、动作录制回放协作、图案交叉推理** 六个方向。当前共 **84 个入口、75 种可玩形态**。旧游戏、美术版本与存档标识继续保留。

[拼图 × 造桥](http://127.0.0.1:8962/forms.html?left=jigsaw-puzzle&right=bridge-building#compare) · [光线 × 作曲](http://127.0.0.1:8962/forms.html?left=light-reflection&right=music-composition#compare) · [回放 × 图案](http://127.0.0.1:8962/forms.html?left=action-replay&right=nonogram#compare)。六种都可实际参与并完成；操作、参考来源和首版边界见 [本批说明](notes/studio-forms-20261004.md)。

八份原创背景、海港画作与透明图集通过内置 ImageGen 制作，[提示词、原始 PNG 与哈希](assets/game-forms/studio-generation-20261004.json) 均保留。拼图按真实榫口裁取画作，桥梁进行受力求解，镜面按几何反射光线，乐句可实际试听和导出 WAV，动作分身重复玩家录制的路线，行列提示从合法排布推导。

99 项新增规则及生命周期检查、旧游戏回归、6 项站点测试和 19 个演示构建通过。2353 个受保护旧文件无改动或丢失，26 个打包目标哈希一致。已查看六种开始、进度、结果共 18 张生产绘制输出；预览 [来源可核对](notes/studio-preview-provenance-20261004.json)。**浏览器实机验收尚未完成**：连接及重置重试均因 Windows 沙箱启动失败退出，窄屏、全屏、浏览器输入、刷新存档与实际听感仍待检查。当前不宣称质量全部达标；见 [质量范围](notes/studio-quality-review-20261004.json) 与 [完整检查](notes/studio-package-check-20261004.json)。

'''
if not old.startswith('2026-10-04 本轮新增 **拼图'):readme.write_text(head+old,encoding='utf-8')
coverage=P/'notes/game-form-coverage-next.md';old=coverage.read_text(encoding='utf-8')
head='''# 游戏形态的后续补全

2026-10-04 最新：**75 种形态、84 个入口**。本批新增拼图旋转吸附、物理造桥、光线反射、音乐作曲、动作录制回放协作和图案交叉推理；均保留旧入口。实现能力与边界见 [六种形态说明](studio-forms-20261004.md)，质量验证范围见 [记录](studio-quality-review-20261004.json)。

后续先补齐真实浏览器窄屏、全屏、声音、输入和存档验收。按镜头、操作对象、时间组织、信息组织与参与方式寻找差异，数量仍不代表已经穷举游戏类型。

| 组合维度 | 尚可探索的方向 |
| --- | --- |
| 身体与输入 | 柔性多肢控制、语音指令、摄像头动作参与 |
| 信息与界面 | 仿桌面界面探索、自由输入文字冒险、地图勘察与旅行组织 |
| 空间与操作 | 自由节点造桥、体素雕塑、折射透镜、立体图案推理 |
| 时间与创作 | 世界状态回滚、声音采样、完整曲段编排、多人同步录制 |
| 参与关系 | 观众指挥、多工位载具操作、共享创作与异步合作 |

当前工具限制下的生产绘制检查不能代替真人实机体验。原有每批质量说明继续保留。

以下保留此前覆盖记录。

'''
if '**75 种形态、84 个入口**' not in old:coverage.write_text(head+old.removeprefix('# 游戏形态的后续补全\n\n'),encoding='utf-8')
print('Saved six-form scope and quality review')
