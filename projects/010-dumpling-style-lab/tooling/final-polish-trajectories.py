from pathlib import Path
P=Path(__file__).resolve().parents[1];f=P/'web/showcase-trajectories.js';s=f.read_text(encoding='utf-8')
for a,b in [("function route(c,unit,steps,color)","function route(c,unit,steps,color,offset=0)"),("String(i+1),q.x,q.y+4","String(i+1+offset),q.x,q.y+4"),("s.plans[u.id].slice(start),'#89ead6')","s.plans[u.id].slice(start),'#89ead6',start)"),("plans[i].slice(start),'#e6a671aa')","plans[i].slice(start),'#e6a671aa',start)")]:
 assert a in s,a;s=s.replace(a,b)
f.write_text(s,encoding='utf-8')
f=P/'web/showcase-trajectories-panel.js';s=f.read_text(encoding='utf-8').replace('，没有金钱下注。','。').replace('不是实际飞行器训练。','');f.write_text(s,encoding='utf-8')
print('Remaining tactical steps retain their original slot numbers')
