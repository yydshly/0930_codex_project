from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();report=json.loads((P/'notes/trajectories-package-check-20261004.json').read_text(encoding='utf-8'));assert report['passed']
frames=json.loads((P/'notes/trajectories-production-frames-20261004.json').read_text(encoding='utf-8'))['frames'];observations={
 'dicework':'五枚象牙骰面的实际点数清晰，锁定骰有状态框，六类分值和选择可辨，完成保留最后结果与实际三轮记录，不再暗示尚未开始。',
 'synchro':'四个箱体与真实遮挡格吻合，侦察机与探机有颜色、编号及耐久，过程中双方实际沿剩余第三、第四步同步移动，完成两探机耐久归零并抵达信标。',
 'perigee':'可见行星轮廓对应碰撞半径，真实轨迹与预测线可区分，飞船与交会站标签不被底部裁切；完成距离与相对速度实际达标。'}
review={
 'production_visual_review':True,'browser_acceptance_complete':False,
 'review_method':'Viewed all nine initial/progress/complete production frames via contact sheets and full-size progress images; reviewed final corrected tactical progress, orbital progress and completion sheet, then final original step numbering. Canvas2D via Skia, not browser screenshots.',
 'frames':[dict(v,sha256=sha(P/v['file']),review_observation=observations[v['id']]) for v in frames],
 'fixes':['同时争格的单位共同等待，避免处理顺序偏差。','执行过的路线不再在恢复时当作未来路线检查。','轨道模拟时钟随实际加速积分前进，行星显示轮廓对应碰撞半径。','骰局完成后显示清晰结果与完成提示。','战术封面使用真实同步执行中途，剩余路线保留原来的第三、第四步编号。','战术完成槽位显示实际 4/4，轨道标签移到可见范围。','原生推力按住控件在取消、暂停和失去焦点时释放指针捕获。'],
 'verified':['三段通过正常命令完成，完成状态没有注入。','54 项规则、46 项生产控件与生命周期检查。','九帧生产绘图，绘制及暂停不修改状态，实际生产工厂恢复结果逐项一致。','原有 98 种形式、107 个入口逐项一致，2483 个受保护旧文件保持原样。','21 个打包目标和 26 个 HTTP 地址与工作区内容一致，旧回归、六项站点测试和十九个演示构建通过。'],
 'not_verified':['真实浏览器窄屏、全屏、触摸与无障碍树','输入焦点、真实按键体验与设备帧率','浏览器刷新存档和真实声音输出'],
 'browser_blocker':'cua.getState failed during initialization: trusted Node process exited unexpectedly; kernel reset, rerun your request. No browser state returned, no alternate browser automation used.',
 'scope':'三段原创形式演示：六类三轮锁骰、公开意图两对两同步规划、无量纲二维单中心引力交会。尚未完成产品设备验收。'}
(P/'notes/trajectories-quality-review-20261004.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
head='''2026-10-04 本轮新增 **掷骰锁定组合、同步规划战术、轨道引力航行**。当前共 **110 个入口、101 种可玩形式**，旧游戏、画风版本与存档标识继续保留。

[锁骰 × 同步战术](http://127.0.0.1:8962/forms.html?left=dice-combination&right=simultaneous-tactics#compare) · [轨道航行 × 既有飞行驾驶](http://127.0.0.1:8962/forms.html?left=orbital-navigation&right=flight-sim#compare)。七份原创场景与透明素材使用内置 ImageGen 制作，[完整提示词、原始 PNG 与哈希](assets/game-forms/trajectories-generation.json) 已保存。[能力范围与参考](notes/trajectories-forms-20261004.md) 说明真实点数取舍、双方同步执行与二维引力积分。

100 项新增规则与控件检查、旧游戏回归、六项站点测试与十九个演示构建通过。2483 个受保护旧文件保持原样，原有 98 种形式、107 个入口逐项一致。21 个打包目标与 26 个本地 HTTP 地址内容一致；九张开始、过程与完成画面已保存并查看。

**真实浏览器验收尚未完成**：CUA 初始化报告 trusted Node process exited unexpectedly，未返回浏览器状态。窄屏、全屏、触摸、输入焦点与刷新存档仍待确认。[画面质量记录](notes/trajectories-quality-review-20261004.json) · [完整检查](notes/trajectories-package-check-20261004.json)。以下历史数量按记录时计。

'''
f=P/'README.md';s=f.read_text(encoding='utf-8')
if not s.startswith(head):f.write_text(head+s,encoding='utf-8')
f=P/'notes/game-form-coverage-next.md';s=f.read_text(encoding='utf-8');first,rest=s.split('\n',1);addition='''

2026-10-04 当前：**101 种形式、110 个入口**。掷骰锁定组合、同步规划战术、轨道引力航行已追加。[能力与参考](trajectories-forms-20261004.md) · [画面复查](trajectories-quality-review-20261004.json)。原有 98 种形式、107 个入口逐项一致，旧模块、资产与存档标识继续保留。

本批补充已知随机结果的部分重掷、预先规划后共同执行、推力与引力共同决定轨迹。七份原创 ImageGen 素材、九帧生产绘图、100 项新增检查已保存。骰子采用六类三轮短局，战术为公开意图两对两，轨道为二维单中心引力练习；真实浏览器窄屏、全屏、触摸、焦点与刷新存档尚未验收。

还可扩展隐藏信息同步计划、完整骰子类别、机动节点与三维轨道任务。真人影像片段编排、自由镜头三维探索、多人持久世界和现实空间 AR 需要相应内容或设备验证，未计入当前完成数量。以下历史记录按各批记录时计，继续保留。

'''
if addition not in s:f.write_text(first+addition+rest,encoding='utf-8')
f=P/'notes/trajectories-forms-20261004.md';s=f.read_text(encoding='utf-8').replace('点数计分、牌面种类以外的本批状态结构、规划路径','点数与计分记录、规划路径');f.write_text(s,encoding='utf-8')
print('Documented three playable forms, saved prompts, production visuals and acceptance limits')
