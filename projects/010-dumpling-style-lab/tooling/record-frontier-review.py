from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];report=json.loads((P/'notes/frontier-package-check-20261004.json').read_text(encoding='utf-8'))
quality={'implementation_complete':True,'presentation_acceptance_complete':False,'new_forms':9,'forms':69,'entrances':78,'original_assets':10,'new_checks':report['new_checks'],'regressions_passed':report['passed'],'protected_files':report['preservation']['protected'],'protected_files_unchanged':not report['preservation']['changed'] and not report['preservation']['missing'],'production_frames':27,'reviewed':['production initial / progress / complete contact sheets','coil initial and progress individual frames','expose progress individual frame'],'visual_repairs':['Material scan direction fixed per row to avoid missed cells','Software sea layer excluded to avoid invalid large-triangle occlusion','Slab depth layer and UV material projection repaired in compatibility renderer','Continuous serpent body and elevated head display added','Material opening enriched with a small water and sand reservoir','Camera capture shows the actual rendered view when canvas extraction is supported','Room movement interpolation now runs in active tick rather than draw, so pause holds pixels'],'pause_state_and_pixels':True,'multiplayer_service':'Hidden 127.0.0.1:8963 companion running; isolated HTTP contract test with three clients','browser_qa':report['browser_qa'],'limitations':['No real browser CSS, input, focus, fullscreen or refresh-storage validation this turn','No actual WebGL shader / shadow or headphone HRTF listening validation','3D preview is the production software compatibility projection, whose shadows and local occlusion differ from WebGL','Material and articulated-body rules are simplified first-version models','Photo-world uses two limited building templates','Multiplayer is loopback-only and requires its companion service; no cloud or cross-computer room server deployed']}
(P/'notes/frontier-quality-review-20261004.json').write_text(json.dumps(quality,ensure_ascii=False,indent=2),encoding='utf-8')
f=P/'README.md';old=f.read_text(encoding='utf-8');old=old[old.index('2026-10-04 上一批新增 **抓钩'):] if old.startswith('2026-10-04 本轮新增 **时间操控') else old;old=old.replace('2026-10-04 本轮新增 **抓钩','2026-10-04 上一批新增 **抓钩',1).replace('当前共 **69 个游戏入口、60 种可玩形态**','该批完成时共 **69 个游戏入口、60 种可玩形态**',1)
header='''2026-10-04 本轮新增 **时间操控、材料模拟、异形身体、规则改写、绘本画框、摄影造景、指令编排、空间声音、社交推理** 九个方向。当前共 **78 个入口、69 种可玩形态**。原有游戏、美术版本和存档路由继续保留。

[时间 × 材料](http://127.0.0.1:8962/forms.html?left=time-manipulation&right=material-simulation#compare) · [身体 × 照片](http://127.0.0.1:8962/forms.html?left=body-control&right=photo-world#compare) · [规则 × 画框](http://127.0.0.1:8962/forms.html?left=rule-rewriting&right=panel-puzzle#compare) · [程序 × 声音](http://127.0.0.1:8962/forms.html?left=programming-puzzle&right=audio-exploration#compare) · [多人推理](http://127.0.0.1:8962/showcase.html?play=assembly#play)。每种的操作、参考案例与首版边界见 [本批说明](notes/frontier-forms-20261004.md)。

十份原创场景、画框、透明图集和鳞片材质通过内置 ImageGen 制作，[原始 PNG、提示词与哈希保留](assets/game-forms/frontier-generation-20261004.json)。三维模式优先 WebGL，无法创建时使用同场景的软件投影；卡片取自生产工厂离屏绘制，三维为兼容渲染预览，[来源可核对](notes/frontier-preview-provenance-20261004.json)，不是浏览器截图。

118 项新增规则、控件生命周期、声音 API 和多人 HTTP 检查通过，已有回归、站点测试与 19 个静态演示构建通过。2327 个旧受保护文件无改动或丢失；33 个打包目标哈希一致。八个单人方向可完成，多人房间检查覆盖任务、投票、危机与修复。27 张开始、中途、结局画面及暂停状态/像素经过检查。**实机展示验收尚未完成**：浏览器工具在内核启动时崩溃，真实 WebGL、窄屏全屏、焦点输入、刷新存档和耳机 HRTF 听感仍待验证；当前不宣称质量全部达标。见 [质量范围](notes/frontier-quality-review-20261004.json) 与 [完整检查](notes/frontier-package-check-20261004.json)。

多人伴随服务当前在本机 8963 端口后台运行，需 3–6 位真实玩家。重启命令：`python tooling/start-frontier-room.py`；原静态页面保持 8962。每窗口分别保存会话，房间在服务内存中，不含机器人或云端联机。

'''
f.write_text(header.replace('118',str(report['new_checks']))+old,encoding='utf-8')
f=P/'notes/game-form-coverage-next.md';old=f.read_text(encoding='utf-8');old=old.split('以下保留上一批补全记录。\n\n',1)[-1] if '以下保留上一批补全记录。' in old else old;f.write_text('''# 游戏形态的后续补全

2026-10-04 最新：69 种形态、78 个入口。时间操控、材料模拟、异形身体、规则改写、画框解谜、照片造路、指令编排、空间声音和社交推理已接入。类型、镜头、信息组织、参与方式还可以继续组合，因此不以数量宣称穷举了全部游戏。

各方向实际能力和首版边界见 [九种形态扩展](frontier-forms-20261004.md)。优先补齐真实浏览器的 WebGL、声音、输入、全屏和刷新存档验收，再扩展以下差异。

| 方向 | 可继续扩展的呈现或操作 |
| --- | --- |
| 材料模拟 | 不同材质舱、爆炸与气压、连续地下空间 |
| 异形身体 | 柔性触手、四足或多足协调、可弯曲身体与悬挂通行 |
| 摄影造景 | 多种建筑模板、照片裁切与旋转、实体放置预览 |
| 画框解谜 | 画框叠放、图像局部套接、纵向卷轴与同场景尺度转换 |
| 声音探索 | 环绕声环境变化、音色线索、语音叙事与辅助阅读 |
| 社交推理 | 跨设备房间、更多私人线索、任务现场见证、观战与重连 |
| 新操作形式 | 拼图旋转吸附、拼贴造物、光线反射摄影、音乐作曲互动、动作录制回放协作 |

本轮浏览器工具在启动时崩溃，123 项新增逻辑/控件/API 检查及生产绘制不能替代实机体验验收。质量记录独立保留，见 frontier-quality-review-20261004.json。

以下保留上一批补全记录。

'''+old,encoding='utf-8')
print('Recorded current scope and quality boundaries without altering earlier test reports.')
