from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
p=root/'games.js';s=p.read_text(encoding='utf-8')
versions={'worlds-interface.js':4,'detective.js':5,'wuxia.js':6,'ecology.js':5,'wasteland.js':4,'dream.js':6,'arcade.js':5,'inn.js':5,'islands.js':4,'movers.js':9,'game-catalog.js':5}
import re
for name,v in versions.items():s=re.sub(re.escape(name)+r'\?v=\d+',name+'?v='+str(v),s)
p.write_text(s,encoding='utf-8')
for name,old,new in [('games/islands.js','islands-art.js?v=2','islands-art.js?v=3'),('games/movers.js','moving-interface.js?v=8','moving-interface.js?v=9')]:
 p=root/name;s=p.read_text(encoding='utf-8').replace(old,new);p.write_text(s,encoding='utf-8')
p=root/'games.html';s=p.read_text(encoding='utf-8').replace('games.js?v=20','games.js?v=21').replace('worlds-product.css?v=6','worlds-product.css?v=7');p.write_text(s,encoding='utf-8')
p=root/'worlds-interface.js';s=p.read_text(encoding='utf-8').replace('再挑战第二条高架路线。','再接高架急件与清晨回信，三条路线各自留有成绩。').replace('他们需要的房间会变，留在回访簿里的记忆会延续。','他们需要的房间会变，留在回访簿里的记忆会延续。七日之后，“留下的信”让熟悉的来客带着新的心事回来。').replace('把发现带回等你的营地。','把发现带回等你的营地。航图随后会开放云塔岛；在那里校准风向、对齐星环，重新点亮归航灯。');p.write_text(s,encoding='utf-8')
p=root/'worlds-product.css';s=p.read_text(encoding='utf-8');s+='\n.worlds-overlay{z-index:80}body[data-game=movers] .worlds-overlay{--line:#d6bfa3;--card:#f6ead8;--paper:#eddbc1;--ink:#6b513d;--muted:#967b60;--accent:#926644;--selected:#7c583e;--selected-text:#fff0da}\n';p.write_text(s,encoding='utf-8')
# The shared catalogue is also imported on the research home page.
for name in ['app.js','direction-reading.js']:
 p=root/name
 if p.exists():s=p.read_text(encoding='utf-8').replace('game-catalog.js?v=4','game-catalog.js?v=5');p.write_text(s,encoding='utf-8')
print('Updated runtime URLs and chapter introductions.')
