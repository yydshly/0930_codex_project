import json,re
from pathlib import Path
P=Path(__file__).resolve().parents[1]
details={
 'grappling':('选择挂点 → 摆荡积累速度 → 收绳调整高度 → 松绳落台','可扩展连续山谷、移动挂点、弹性绳与第三人称空间摆荡。'),
 'perspective-illusion':('走到断桥 → 转动视角 → 桥端重合 → 通过错视通路','可扩展双轴转动、转动建筑、镜面世界与多层错视通路。'),
 'object-restoration':('拆开物件 → 清洁与识别部件 → 对正分层安装 → 测试修复结果','可扩展相机、收音机、音乐盒，加入工具、线路与不同拆装方向。'),
 'terrain-digging':('开凿相邻地层 → 留下洞道 → 收集晶矿 → 向深处寻找信标','可扩展支撑与塌落、液体、分支矿层、横向洞窟和工具切换。'),
 'rolling-collection':('吸附小物件 → 球体增大 → 纳入更大物件 → 镜头拉远','可扩展房间到街区的尺度变化、真实三维物件附着与不同形状的滚动体。'),
 'ink-territory':('喷涂地面 → 争夺覆盖 → 回到己方颜色潜行 → 恢复后继续喷涂','可扩展三维曲面涂色、多色对抗、墙面攀行、不同喷头与同屏合作。'),
 'squad-following':('带队与分组 → 队员到达货物 → 合力搬运 → 材料改变通路','可扩展队员能力差异、跨越水流、多条搬运路线与大型协作物件。'),
 'service-workflow':('观察同时订单 → 规划工位路线 → 连续加工 → 及时交付','可扩展不同菜式、传送带、可移动工位、双人分工与食材组合。'),
 'asymmetric-coop':('描述装置 → 另一端解释规则 → 分步操作 → 双方核对结果','可扩展两个设备、可打印说明、多种装置和语音协作；当前是同设备交接。'),
}
p=P/'web/game-forms-catalog.js';text=p.read_text(encoding='utf-8');pattern=r'gameForms.push\(\n(\{"id": "grappling".*?)\n\);';m=re.search(pattern,text,re.S);assert m
rows=json.loads('['+m.group(1)+']')
for row in rows:row['rhythm'],row['next']=details[row['id']]
text=text[:m.start(1)]+',\n'.join(json.dumps(row,ensure_ascii=False) for row in rows)+text[m.end(1):];p.write_text(text,encoding='utf-8')
controls={
 'hook':'← → / A D 摆荡 · 空格挂住/松绳 · E 收绳 · 按钮切换挂点 · P 暂停',
 'fold':'按钮旋转镜头 / E 右转 · 空格或点画面前行 · P 暂停',
 'repair':'拖动零件 / 方向按钮移动 · E 旋转 · 空格安装 · 按钮拆盖、清洁和测试 · P 暂停',
 'delve':'方向键 / WASD 逐格挖掘 · 邻格点按 / 原生方向按钮 · P 暂停',
 'cluster':'方向键 / WASD / 方向按钮滚动 · 点地面选择移动目标 · P 暂停',
 'paint':'方向键 / WASD / 点地面移动 · 空格切换潜行 · 按钮开关喷涂 · P 暂停',
 'swarm':'方向键 / WASD / 点地面带队 · 空格派遣 · E 召回 · 按钮选货物和分队 · P 暂停',
 'kitchen':'按钮选工位并走到台前 · 空格 / E 操作工位 · 方向键 / 点地面移动 · P 暂停',
 'relay':'原生按钮分步操作 · E 切换说明端 · 空格核对 · P 暂停',
}
p=P/'web/showcase-catalog.js';lines=p.read_text(encoding='utf-8').splitlines();old='方向键 / WASD 或原生按钮操作 · 场景点按 / 下方操作区 · P 暂停'
for i,line in enumerate(lines):
 for key,value in controls.items():
  if line.startswith("item('"+key+"',"):
   assert old in line;lines[i]=line.replace(old,value)
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Updated nine distinct rhythms, expansion paths and accurate controls.')
