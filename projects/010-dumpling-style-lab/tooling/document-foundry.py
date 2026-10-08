from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parents[1]
header='''2026-10-04 本轮新增 **机械装配与驾驶、六自由度三维航行、关卡创作与即时试玩**。当前共 **113 个入口、104 种可玩形式**，旧游戏、美术版本与存档标识继续保留。

[机械装配 × 六自由度](http://127.0.0.1:8962/forms.html?left=machine-construction&right=six-dof#compare) · [关卡创作 × 平台跳跃](http://127.0.0.1:8962/forms.html?left=level-authoring&right=platform#compare)。四份原创位图由内置 ImageGen 生成，11 个作者模型用于真实三维场景；[素材与完整提示词](assets/game-forms/foundry-generation.json) 已保存。[能力范围与参考](notes/foundry-forms-20261004.md) 区分约束装配、真正三维运动与编辑地图驱动的碰撞。

76 项新增检查、三个普通通关流程、两套可玩模板、六个生产三维场景检查已通过。原有 101 种形式、110 个入口逐项一致；2498 个受保护旧资源保持原样。构建、旧玩法回归与本地链接检查见 [交付报告](notes/foundry-package-check-20261004.json)。

九张开始、过程、完成画面已复查。关卡帧来自生产 Canvas2D；三维帧为相同生产模型与摄像机的独立诊断投影，光照近似，**不是浏览器截图**。浏览器控制工具初始化失败，真实 WebGL、窄屏、全屏、触摸、焦点与刷新存档仍待验收。[质量记录](notes/foundry-quality-review-20261004.json) · [预览来源](notes/foundry-preview-provenance-20261004.json)。以下历史数量按记录时计。

'''
readme=P/'README.md'
text=readme.read_text(encoding='utf-8')
if not text.startswith(header.splitlines()[0]):readme.write_text(header+text,encoding='utf-8')
coverage=P/'notes/game-form-coverage-next.md'
text=coverage.read_text(encoding='utf-8');title='# 游戏形态的后续补全\n\n'
entry='''2026-10-04 当前：**104 种形式、113 个入口**。机械装配、六自由度三维航行、关卡创作已追加。[能力与边界](foundry-forms-20261004.md) · [画面复查](foundry-quality-review-20261004.json)。原有 101 种形式、110 个入口逐项一致，旧模块、资源和存档标识继续保留。

本轮补充的是设计方案影响操控、任意三维姿态影响运动、玩家创作直接改变可玩的地图。四份原创 ImageGen 位图、11 个作者模型、九帧生产或同几何诊断图、76 项新增检查已保存；机械目前是约束底盘配置与简化运动，航廊是指定障碍区碰撞，关卡编辑是固定网格与本地保存。真实浏览器 WebGL、窄屏、全屏、触摸、焦点与刷新存档还未验收。

优先完成这些实机验证，再扩展自由零件连接、真正可碰撞的三维设施和关卡导出分享。更不同的参与形式仍包括真人影像片段编排、非对称协作、跨玩家异步传递、持久多人世界、现实空间 AR；需要相应内容、信息流或设备，未计入已完成数量。以下历史记录继续保留。

'''
assert text.startswith(title)
if entry.splitlines()[0] not in text:coverage.write_text(title+entry+text[len(title):],encoding='utf-8')
notes={
 'rigworks':'作者模型原始配色与车轮轮廓可辨；装配、载货、交付状态由真实流程产生。金属纹理只映射新增表面，避免覆写原有模型颜色图。',
 'drift':'三维航廊、飞船、不同高度的信标可辨；摄像机位置与姿态来自实际六自由度状态。诊断投影的光照和 HUD 不代表实际 WebGL 效果。',
 'levelsmith':'原创风谷背景与透明图集组成实际编辑地图；过程收集当前布局晶石，完成显示版本 2 及四颗晶石，验证编辑结果。'
}
frames=[]
for id in ['rigworks','drift','levelsmith']:
 for phase in ['initial','progress','complete']:
  f=P/f'assets/game-forms/foundry-qa/{id}-{phase}.png'
  frames.append({'id':id,'phase':phase,'file':f.relative_to(P).as_posix(),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'method':'Production Canvas2D via Skia' if id=='levelsmith' else 'Production scene geometry/camera via diagnostic projection; lighting and HUD approximated','browser_screenshot':False,'review_observation':notes[id]})
report={'production_canvas_and_scene_review':True,'browser_acceptance_complete':False,'frames':frames,'review_method':'All nine initial/progress/complete images viewed via image tools; final original-palette 3D revision checked. Not browser screenshots.','fixes':['Preserved original model palette maps; generated alloy map limited to added primitives.','Improved wheel/rim/tread details and load bed/cargo placement.','Removed unsupported Three backgroundRotation reference.','Descent key no longer triggers shell fullscreen; pause key still bubbles.','Both editor templates and edited map complete through ordinary movement.','Included copied CC0 licenses in static packaging; restored loopback services.'],'remaining':['Actual browser WebGL rendering and performance','Responsive CSS and real touch/keyboard focus','Fullscreen and context-loss recovery in real browser','Refresh/save restoration in browser storage'],'scope_limits':['Constrained chassis choices and simplified vehicle motion, not full jointed rigid-body simulation','Specified spherical obstacle collision, not all decorative meshes','Fixed-grid local editor, no online sharing']}
(P/'notes/foundry-quality-review-20261004.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Saved batch brief, quality scope and current coverage documentation.')
