from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report=json.loads((P/'notes/parlor-package-check-20261004.json').read_text(encoding='utf-8'));assert report['passed']
frames=json.loads((P/'notes/parlor-production-frames-20261004.json').read_text(encoding='utf-8'))['frames']
observations={
 'cascade':'原创海窗装置与竖井边界吻合，实际贴图方块、幽影、下三块与暂存可辨；过程保留一个待消横排，完成通过正常落点清掉两行。',
 'patience':'原创正背牌面、红黑花色、点数、遮盖牌与空列可辨；归位计数移至标题后，不再和第三、四列标题挤在一起；完成实际归位二十张。',
 'lexicon':'纸面容纳完整五列六行，右侧线索与字母状态清晰；CRANE 的 R 错位、E 正位，BLOOM 只给一个 O 匹配，SHORE 实际逐格全对。'}
review={
 'production_visual_review':True,'browser_acceptance_complete':False,
 'review_method':'Viewed nine initial/progress/complete production frames in contact sheets, then three full-size progress frames and the final corrected solitaire progress frame. Production Canvas2D via Skia, not browser screenshots.',
 'frames':[dict(v,sha256=sha(P/v['file']),review_observation=observations[v['id']]) for v in frames],
 'fixes':['归位计数并入同花归位区标题，避免与接龙列标题相互拥挤。','落块完成状态显示消行完成，不再显示准备开始。','接龙无效放牌说明同花顺序或红黑递减规则，牌张不改变。','Q 和 Shift 由原生键盘事件处理，避免与按键采样重复执行。','拖动起点与当前坐标独立保存，滑动实际作用于棋盘。','字母 P / F 阻止宿主暂停与全屏快捷键。'],
 'verified':['三段通过正常命令完成，没有注入胜利状态。','67 项规则与 48 项生产控件生命周期检查。','九张生产绘图，暂停绘制不改变状态。','原有 95 种形式、104 个入口逐项一致，2468 个受保护旧文件没有修改或丢失。','21 个打包目标、26 个 HTTP 地址内容一致，旧回归与六项站点检查通过。'],
 'not_verified':['真实浏览器窄屏、全屏、触摸和无障碍树','输入焦点与真实浏览器按键体验','浏览器刷新存档、真实声音、设备性能与帧率'],
 'browser_blocker':'cua.getState failed twice: trusted Node process exited unexpectedly; kernel reset, rerun your request. No browser state returned and no alternative browser automation used.',
 'scope':'三段原创形式演示。10×18 固定队列落块、四列二十张 A–5 接龙、24 词本地字词推理；不等于完整商业游戏。'}
(P/'notes/parlor-quality-review-20261004.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
head='''2026-10-04 本轮新增 **落块消行、纸牌接龙、字词位置推理**。当前共 **107 个入口、98 种可玩形式**，旧游戏、画风版本与存档标识继续保留。

[落块 × 接龙](http://127.0.0.1:8962/forms.html?left=falling-blocks&right=solitaire#compare) · [字词推理 × 既有逻辑填图](http://127.0.0.1:8962/forms.html?left=word-deduction&right=nonogram#compare)。七份原创场景与透明素材使用内置 ImageGen 制作，[完整提示词、源 PNG 与哈希](assets/game-forms/parlor-generation.json) 已保存。[能力与范围](notes/parlor-forms-20261004.md) 说明实际消行、A–5 短牌局与本地五字母线索。

115 项新增规则与交互检查、旧游戏回归、六项站点测试与十九个演示构建通过。2468 个受保护旧文件保持原样，原有 95 种形式、104 个入口逐项一致。21 个打包目标、26 个 HTTP 地址内容一致；九张开始、过程与完成生产画面已保存并查看。

**真实浏览器验收仍未完成**：CUA 两次初始化报告 trusted Node process exited unexpectedly，未返回浏览器状态。窄屏、全屏、触摸、输入焦点与刷新存档仍待确认。当前不宣称产品质量全部验收。[质量记录](notes/parlor-quality-review-20261004.json) · [完整检查](notes/parlor-package-check-20261004.json)。以下历史数量按记录时计。

'''
f=P/'README.md';s=f.read_text(encoding='utf-8')
if not s.startswith(head):f.write_text(head+s,encoding='utf-8')
f=P/'notes/game-form-coverage-next.md';s=f.read_text(encoding='utf-8');first,rest=s.split('\n',1)
addition='''

2026-10-04 当前：**98 种形式、107 个入口**。落块消行、纸牌接龙、字词位置推理已追加。[能力与范围](parlor-forms-20261004.md) · [画面复查](parlor-quality-review-20261004.json)。原有 95 种形式、104 个入口逐项一致，旧模块和素材保持原样。

本批补充持续下落中的空间整理、遮盖揭牌的顺序整理、逐次输入后的信息推理。七份原创 ImageGen 素材、九帧生产绘图、115 项新增检查已保存；接龙采用二十张 A–5 短牌局，字词采用 24 词本地词库。真实浏览器、触摸、全屏、焦点与刷新存档尚未验收，不能据此称为完整产品质量。

仍可探索完整接龙规则、随机落块队列、主题词库、非对称潜入指挥、真人影像片段编排、自由三维轨道飞行和跨玩家异步传递。需要先确定相应内容、空间或信息流差异，避免只增加相近名称。以下历史记录按各批记录时计，保留旧结论。

'''
if addition not in s:f.write_text(first+addition+rest,encoding='utf-8')
print('Documented three new forms, original assets, actual checks and browser acceptance limits')
