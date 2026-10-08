from pathlib import Path
P=Path(__file__).resolve().parents[1];f=P/'web/showcase-trajectories.js';s=f.read_text(encoding='utf-8')
changes=[
 ("s.rolls?1:.5","s.rolls||s.won?1:.5"),
 ("s.held[i]?'已锁定 · '+(i+1):'可重掷 · '+(i+1)","s.won?'结果骰 · '+(i+1):!s.rolls?'待掷骰 · '+(i+1):s.held[i]?'已锁定 · '+(i+1):'可重掷 · '+(i+1)"),
 ("text(c,s.animation?'骰子正在落定", "text(c,s.won?'三轮结果已记录，可换一组骰序继续比较。':s.animation?'骰子正在落定"),
 ("record?'已记录':selected?'已选择 · 下方记录':'点击选择'","record?'已记录':s.won?'本局未使用':!s.rolls?'先掷骰':selected?'已选择 · 下方记录':'点击选择'"),
 ("s.chosen?'选中 '","s.won?'三轮记录完成 · 可换骰序':s.chosen?'选中 '"),
 ("if(s.phase==='planning'){s.units.slice(0,2)","if(s.phase==='planning'||s.phase==='executing'){const start=s.phase==='executing'?s.slot:0;s.units.slice(0,2)"),
 ("route(c,u,s.plans[u.id],'#89ead6')","route(c,u,s.plans[u.id].slice(start),'#89ead6')"),
 ("route(c,u,plans[i],'#e6a671aa')","route(c,u,plans[i].slice(start),'#e6a671aa')"),
 ("本轮槽位 ${s.slot+1}/4","本轮已执行 ${s.phase==='executing'?s.slot:s.phase==='ended'?s.slot:0}/4"),
 ("text(c,'交会站',target.x,target.y-35,11,'#e8dda7','center');text(c,'你的飞船',ship.x,ship.y+37,11,'#a9e7e0','center');", "text(c,'交会站',target.x-30,Math.min(555,Math.max(110,target.y-28)),11,'#e8dda7','right');text(c,'你的飞船',ship.x+29,Math.min(555,Math.max(110,ship.y-17)),11,'#a9e7e0');")]
for a,b in changes:
 assert a in s,a;s=s.replace(a,b)
f.write_text(s,encoding='utf-8')
f=P/'tooling/trajectories-playthroughs.mjs';s=f.read_text(encoding='utf-8');a="run('commit');advance(s,2.05);snapshots.progress=structuredClone(s);";b="run('commit');advance(s,1.35);snapshots.progress=structuredClone(s);advance(s,.7);";assert a in s;s=s.replace(a,b);f.write_text(s,encoding='utf-8')
print('Clear completion labels, actual mid-execution preview, unclipped orbital object labels')
