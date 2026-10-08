from pathlib import Path
P=Path(__file__).resolve().parents[1];p=P/'web/showcase-horizons-panel.js';s=p.read_text(encoding='utf-8')
changes=[
 ('橙绳、林舟','橙色绳、林舟'),
 ("const button=(key,label)","const writeText=(el,value)=>{if(el.textContent!==value)el.textContent=value};\nconst button=(key,label)"),
 ("readout.textContent=stats.join(' · ')","writeText(readout,stats.join(' · '))"),
 ("el.style.zIndex=String(w.z)","el.style.zIndex=String(w.z);el.style.maxHeight='calc('+(100-w.y/630*100)+'% - 10px)'"),
 ("root.querySelector('.h-document-title').textContent=DESKTOP_FILES[s.selected].title","writeText(root.querySelector('.h-document-title'),DESKTOP_FILES[s.selected].title)"),
 ("root.querySelector('.h-document-body').textContent=DESKTOP_FILES[s.selected].text","writeText(root.querySelector('.h-document-body'),DESKTOP_FILES[s.selected].text)"),
 ("root.querySelector('.h-case-status').textContent=s.message","writeText(root.querySelector('.h-case-status'),s.message)")
]
for a,b in changes:assert a in s,a;s=s.replace(a,b)
p.write_text(s,encoding='utf-8')
p=P/'web/showcase-horizons-rules.js';s=p.read_text(encoding='utf-8')
for old in [r'/(用|使用)铜钥匙(打开|开|于|对)?(木箱|箱子)/',r'/(用|使用)铜钥匙(打开|开|于|对)?(铁门|门)/',r'/(用|使用)灯油(于|对|点亮|点燃)?提灯/',r'/(用|使用|安装)镜片(于|对|装到)?(灯座|灯塔|灯室|信标)/',r'/(用|使用|倒入)灯油(于|对|加入)?(灯座|灯塔|灯室|信标)/']:
 assert old in s,old;s=s.replace(old,'/^'+old[1:-1]+'$/')
p.write_text(s,encoding='utf-8')
print('Refined native reading stability, reachable windows, and exact command grammar')
