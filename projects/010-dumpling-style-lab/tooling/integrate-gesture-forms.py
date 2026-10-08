from pathlib import Path
import shutil
P=Path(__file__).resolve().parents[1];W=P/'web'
def edit(name,old,new):
    file=W/name;text=file.read_text(encoding='utf-8');assert old in text,(name,old);file.write_text(text.replace(old,new),encoding='utf-8')
forms="""gameForms.push(
 {id:'territory-capture',play:'trace',name:'划线围地',view:'固定玻璃舞台 / 路径与区域',action:'沿边 · 划线 · 闭合 · 拓界',rhythm:'找安全出发点 → 穿过暗区 → 连回边线修复区域',reference:'划线围地 / Territory capture',description:'玩家移动的路径成为分界线，闭合后保留游光所在的区域，其余区域显露完整壁画。',compare:'对比迷宫追逐：玩家能用自己画出的线改变活动区域，未闭合的线也会被移动的游光碰到。',next:'可扩展自由曲线、多人围地、区域争夺、移动边界与三维表面拓界。'},
 {id:'rope-cutting',play:'swing',name:'切绳摆荡',view:'固定侧面 / 挂点与重力',action:'切绳 · 观摆 · 定格 · 释放',rhythm:'观察支撑 → 切断约束 → 利用惯性让物件落入目标',reference:'切绳机关 / Rope-cutting puzzle',description:'切断绳索改变物件的支撑方式；灯球保留摆动速度，按重力落到实际位置。',compare:'对比自由搭建的物理机关：这里操作的是悬挂约束和释放时机，物件的摆动直接决定落点。',next:'可扩展移动挂点、多物件、弹性绳、气流、连续接绳与空间摆荡。'}
);
"""
edit('game-forms-catalog.js','export const gameFormMap=',forms+'export const gameFormMap=')
catalog="""newDirections.push(
 item('trace','霓境拓界','划线围地与壁画修复','动作','固定单屏 / 路径与区域','划线围地 / 安全边线与区域分割','forms.html?left=territory-capture&right=maze-chase#compare','assets/game-forms/trace/preview.webp','沿青色安全边线移动，在暗色玻璃上画出分界。闭合路径，让隐藏的月湖壁画逐步重见光亮。','完整原创玻璃壁画、网格路径移动、敌方区域连通判定、实际游光碰线、三枚光芯、68% 修复目标、舒缓/标准节奏与独立保存。','方向键 / WASD 移动 · 空格开启划线 · 点同排或同列目标格走直线 · 下方按钮转向或收回线'),
 item('swing','风铃工坊','切绳摆荡与重力释放','空间','固定侧面 / 挂点与落点','切绳机关 / 摆动与约束','forms.html?left=rope-cutting&right=physics-puzzle#compare','assets/game-forms/swing/preview.webp','在清晨玻璃工坊安放悬挂灯球。切绳改变支撑，让实际摆动与释放惯性把灯送到软垫托座。','两幕原创工坊、灯球与托座素材、单绳和双绳约束、点按与划线切绳、连续重力和摆动、落点预览、慢放/定格/步进、重试与独立保存。','点 / 划过绳索切断 · 切绳按钮或数字键 1 / 2 · E 定格 · 右方向键步进 · 预览与慢放')
);
"""
edit('showcase-catalog.js','for(const direction of newDirections)if(',catalog+'for(const direction of newDirections)if(')
edit('showcase-catalog.js',"'prism','seek','conduit']","'prism','seek','conduit','trace','swing']")
edit('showcase.js',"'prism','seek','conduit']","'prism','seek','conduit','trace','swing']")
edit('showcase.js',"'prism','seek','conduit','putt'","'prism','seek','conduit','trace','swing','putt'")
edit('showcase.js',"(['seek','conduit'].includes(id)?'20261004-observation-2':'20261004-precision-1')","(['trace','swing'].includes(id)?'20261004-gesture-1':['seek','conduit'].includes(id)?'20261004-observation-2':'20261004-precision-1')")
edit('showcase.js',"conduit:'createConduit'}","conduit:'createConduit',trace:'createTrace',swing:'createSwing'}")
for name in ['forms.js','showcase.js']:edit(name,'showcase-catalog.js?v=20261004-6','showcase-catalog.js?v=20261004-7')
edit('forms.js','game-forms-catalog.js?v=20261004-3','game-forms-catalog.js?v=20261004-4')
edit('forms.html','47 种','49 种');edit('forms.html','047 FORM','049 FORM');edit('forms.html','forms.js?v=16','forms.js?v=17')
edit('forms.html','<div class="new-form-entry"><a','<div class="new-form-entry"><a href="forms.html?left=territory-capture&amp;right=rope-cutting#compare">本轮新增：划线围地 × 切绳摆荡 ↗</a><a')
edit('forms.html','本轮新增：场景寻物','上一批：场景寻物')
edit('showcase.html','四十七','四十九');edit('showcase.html','56 个入口','58 个入口');edit('showcase.html','<b>47</b>','<b>49</b>');edit('showcase.html','showcase.js?v=27','showcase.js?v=28')
for module,source in [('trace','mural'),('swing','atelier')]:shutil.copy2(W/f'assets/game-forms/{module}/{source}.webp',W/f'assets/game-forms/{module}/preview.webp')
print('Integrated 49 forms, 58 entrances; temporary covers will be replaced with actual CUA runtime screenshots.')
