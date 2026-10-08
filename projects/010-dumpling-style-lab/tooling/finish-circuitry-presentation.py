from pathlib import Path
p=Path(__file__).resolve().parents[1]
f=p/'web/showcase-circuitry.js';s=f.read_text(encoding='utf-8')
s=s.replace("s.running?'正在守环':s.failed?'外环失守':'等待开始'","s.won?'守环完成':s.running?'正在守环':s.failed?'外环失守':'等待开始'")
s=s.replace("s.battle?`自动交战 ×${s.speed}`:'先布阵，再开始交战'","s.won?'本轮完成 · 可重新开始':s.failed?'保留布阵调整后重试':s.battle?`自动交战 ×${s.speed}`:'先布阵，再开始交战'")
f.write_text(s,encoding='utf-8')
f=p/'web/showcase-circuitry-panel.js';s=f.read_text(encoding='utf-8')
s=s.replace("if(id==='prismcube'){if(['twist'","if(k==='launch'&&s.failed)b.disabled=true;if(id==='prismcube'){if(['twist'")
f.write_text(s,encoding='utf-8')
