from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
frames=json.loads((P/'notes/kinetics-production-frames-20261004.json').read_text(encoding='utf-8'))['frames']
observations={
 'ribbon':'风峡谷有清楚左右岸；玻璃信使沿有光晕的实际路径前进，风印与过程、结果状态可读。没有把背景图当作运动规则。',
 'rescue':'开局显示待放行队伍；行进中能看到队员、逐步施工的木梯、选中环和可开凿石墙；完成结果在中央下方，没有遮挡通路。',
 'rewind':'横向桥面与人物脚底已校准；下沉桥和配重在下层，晶石状态及回溯时间可读；锁桥后人物到达右岸，完成卡避开人物。',
 'nested':'同几何深度缓冲消除地面遮挡和材质黑块；小模型显示当前两桥和棋子，大庭院显示相同布置；水道缺口、木桥、石台和两端拱门可辨识。'}
review={'production_visual_review':True,'browser_acceptance_complete':False,'review_method':'Reviewed production Skia initial/progress/complete contact sheets and separate nested images. Nested is actual THREE geometry via explicit depth-buffered compatibility rasterization, not GPU screenshots.','frames':[dict(v,sha256=sha(P/v['file']),review_observation=observations[v['id']]) for v in frames],'fixes':['从静态矿井图移除石墙、从钟楼图移除桥，互动对象由真实状态单独绘制。','透明素材按 alpha>=16 的元数据定位，保持原 PNG/WebP 像素不变；姿势使用统一比例。','断线末端停止重复吸附，能实际脱轨坠落。','救援开局显示待入场队伍。','三维兼容投影使用逐像素深度缓冲与透视校正 UV，模型视图只显示小模型。','验证适配器同步原生离屏画布尺寸，完整读取石木纹理；避免把适配器尺寸问题误当成浏览器渲染。','钟楼只展示有作用的左右移动按钮。'],'verified':['四种玩法通过正常操作完成，不注入胜利状态。','50 项规则与 60 项生命周期/控件/模型检查。','生产初始、过程、完成共十二帧；暂停绘制不改变保存状态。','真实 Three.js 网格的八倍尺度与射线拖动。'],'not_verified':['真实浏览器窄屏和全屏布局','真实键鼠、触摸和无障碍树','浏览器 localStorage 刷新保存','真实 WebGL 光照、材质、抗锯齿、性能','实际声音输出'],'browser_blocker':'cua.getState 初始化失败：trusted Node process exited unexpectedly; kernel reset, rerun your request。没有使用其他浏览器自动化绕过。','scope':'四种原创参与形式短场景；不等于完整商业游戏，也不宣称产品质量全部验收。'}
(P/'notes/kinetics-quality-review-20261004.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
print('Recorded current production visual review: 12 frames')
