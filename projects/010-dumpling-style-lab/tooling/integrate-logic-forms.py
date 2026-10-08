from pathlib import Path
P=Path(__file__).resolve().parents[1];W=P/'web'
def edit(name,old,new):
    f=W/name;s=f.read_text(encoding='utf-8');assert old in s,(name,old);f.write_text(s.replace(old,new),encoding='utf-8')
catalog="""gameForms.push(
 {id:'bubble-shooter',play:'bubble',name:'泡泡发射消除',view:'固定穹顶 / 六角邻接',action:'瞄准 · 反弹 · 连消 · 掉落',rhythm:'观察连通颜色 → 安排发射角度 → 切断顶部支撑',reference:'泡泡发射 / Bubble shooter',description:'发射球按侧壁反弹和碰撞进入六角邻格；三颗同色连通后消除，失去顶部支撑的球整串掉落。',compare:'对比轨道珠链：目标不沿轨道移动，而是悬在顶部的二维球阵，发射同时改变颜色连接和支撑。',next:'可扩展升降球阵、旋转穹顶、特殊弹珠、多发射器与双人对侧发射。'},
 {id:'mine-deduction',play:'sonar',name:'数字线索排雷',view:'固定棋盘 / 隐藏信息',action:'探测 · 读数 · 标记 · 快开',rhythm:'揭开安全格 → 对照邻格数字 → 推断隐藏危险',reference:'数字排雷 / Mine deduction',description:'玩家通过已经揭开的数字推理周围八格中的危险位置，标记与邻格快开把推理转化为行动。',compare:'对比场景寻物：关键物件并未直接画在可见场景里，数字和相邻关系提供间接证据。',next:'可扩展六角排雷、三维表面、无猜测布局、多层线索、协作探测与地图探索。'}
);
"""
edit('game-forms-catalog.js','export const gameFormMap=',catalog+'export const gameFormMap=')
directions="""newDirections.push(
 item('bubble','琉璃穹顶','泡泡发射与悬空掉落','动作','固定穹顶 / 六角连接','泡泡发射 / 反弹与连通','forms.html?left=bubble-shooter&right=marble-chain#compare','assets/game-forms/bubble/preview.webp','在暮色玻璃工坊把琉璃送进球阵。利用反弹连接同色，切断顶部支撑，释放整串悬挂的光。','原创工坊与四色符号玻璃球、连续发射碰撞、侧壁反弹、六角邻接、三颗连消、悬空掉落、真实落点预览、40 发布阵、换球与独立保存。','点场地瞄准发射 · 左右键 / 滑条调角 · 空格发射 · E 交换待发球'),
 item('sonar','深海测绘','数字线索与隐藏危险','策略','固定棋盘 / 数字证据','数字排雷 / 八邻格推理','forms.html?left=mine-deduction&right=hidden-object#compare','assets/game-forms/sonar/preview.webp','在沉没遗迹绘制一张安全地图。用八邻格数字逐步揭开海床，标记暗雷，以看得见的证据作出判断。','原创海底与陶瓷棋格、8×8 棋盘、10 枚暗雷、首击九格安全、零格展开、标记、数字邻格快开、可见线索解释、键盘与窄屏选格、重开与独立保存；布局可能需要进一步推理或猜测。','点格探测 / 切换标记模式 · 右键标记 · 方向键选格 · 空格探测 · E 标记 · C 邻格快开')
);
"""
edit('showcase-catalog.js','for(const direction of newDirections)if(',directions+'for(const direction of newDirections)if(')
edit('showcase-catalog.js',"'conduit','trace','swing'].includes", "'conduit','trace','swing','bubble','sonar'].includes")
edit('showcase.js',"'conduit','trace','swing'", "'conduit','trace','swing','bubble','sonar'")
edit('showcase.js',"(['trace','swing'].includes(id)?", "(['bubble','sonar'].includes(id)?'20261004-logic-1':['trace','swing'].includes(id)?")
edit('showcase.js',"swing:'createSwing'", "swing:'createSwing',bubble:'createBubble',sonar:'createSonar'")
for name in ['showcase.js','forms.js']:edit(name,'showcase-catalog.js?v=20261004-7','showcase-catalog.js?v=20261004-8')
edit('forms.js','game-forms-catalog.js?v=20261004-4','game-forms-catalog.js?v=20261004-5')
edit('forms.html','49 种','51 种');edit('forms.html','049 FORM','051 FORM');edit('forms.html','forms.js?v=17','forms.js?v=18')
edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry"><a href="forms.html?left=bubble-shooter&amp;right=mine-deduction#compare">本轮新增：泡泡发射消除 × 数字线索排雷 ↗</a>')
edit('forms.html','本轮新增：划线围地','上一批：划线围地')
edit('showcase.html','四十九','五十一');edit('showcase.html','58 个','60 个');edit('showcase.html','<b>49</b>','<b>51</b>');edit('showcase.html','showcase.js?v=31','showcase.js?v=32')
print('Integrated 51 forms / 60 entrances; old routes and saves retained.')
