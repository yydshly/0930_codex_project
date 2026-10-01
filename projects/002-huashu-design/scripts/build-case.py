"""Author a coherent scenario, constrained slides, and upstream component hosts."""
from pathlib import Path
import json, html

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web/cases/research-desk'
BASE='https://github.com/alchaincyf/huashu-design/blob/0830494ecb1c117e25b313a8114fe55a6bf2b125/'
CSS='''*{box-sizing:border-box}html,body{margin:0;padding:0}body{width:1280px;height:720px;position:relative;overflow:hidden;background:#f6f7f0;color:#182e25;font-family:"Microsoft YaHei",sans-serif}p,h1,h2{position:absolute;margin:0;padding:0;font-weight:400;line-height:1.4}h1,h2{font-weight:700}img{position:absolute;object-fit:contain}'''
def text(txt,x,y,w,size=30,color='#182e25',tag='p',weight=None):
    return f'<{tag} style="left:{x}px;top:{y}px;width:{w}px;font-size:{size}px;color:{color};'+(f'font-weight:{weight};' if weight else '')+'">'+html.escape(txt).replace('\n','<br>')+f'</{tag}>'
def picture(name,x,y,w,h):
    return f'<img src="../assets/{name}.png" alt="研选交互原型真实截图" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px">'
def rule(x,y,w):return f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:1px;background:#cbd5c5"></div>'
slides=[]
slides.append(('#163c34',text('研选',76,93,1020,92,'#e9f5df','h1')+text('开源项目研究与选型工作台',80,236,1100,44,'#e9f5df')+text('一份概念方案 · 用真实项目检验研究流程',82,327,1080,25,'#b8d0ba')+text('RESEARCH DESK',82,550,700,18,'#c3ee87')+text('方案评审 / 2026.09',82,586,700,19,'#c3d4c8'), '介绍一个面向个人开源项目研究的工作台概念。内容以本地研究集中的两个真实仓库为样本。此产品尚未接入真实后端，不代表现有商业产品。'))
slides.append(('#f6f7f0',text('研究过程中，最容易丢失的是采用理由',70,64,1130,44,tag='h1')+text('场景假设：研究者收集了多个仓库，希望判断下一步先试哪一个。',73,145,1120,25,'#61705e')+rule(73,224,1134)+text('资料散落',73,264,300,32,tag='h2')+text('看过 README，\n却没有留下版本与来源。',73,330,340,26)+text('边界混淆',482,264,310,32,tag='h2')+text('样例看起来可用，\n实际任务还缺哪些环节？',482,330,330,26)+text('结论缺位',892,264,300,32,tag='h2')+text('收藏了项目，\n没有具体试用任务。',892,330,300,26)+text('工作台的设计目标：让每份结论都能找到证据和下一步。',73,538,1110,30,'#28583e'),'本页是场景假设，不是用户调研统计或效率提升实测。用于解释为什么设计项目库、证据页及采用判断。'))
slides.append(('#f6f7f0',text('项目库',70,62,1100,48,tag='h1')+text('先按用途找项目',73,206,380,34,tag='h2')+text('搜索“设计”，\n定位视觉交付工具。',73,278,350,27)+text('Huashu Design 与 witr\n解决不同问题，\n不做跨用途的总分排名。',73,401,370,25,'#61705e')+picture('prototype-library',485,180,733,458),'演示时打开交互原型，搜索设计，并进入 Huashu Design。截图来自本次制作的原型。两个项目的定位来自本研究集固定版本报告。Huashu Design 源码：'+BASE+'README.md\nwitr：https://github.com/pranshuparmar/witr/tree/dc4fa1da82d3e266fcbd928641b4f30b3077c64f'))
slides.append(('#f6f7f0',text('证据页',70,62,1100,48,tag='h1')+text('把能力与边界一起看',73,205,380,34,tag='h2')+text('每项关键判断\n都有固定版本的来源。',73,277,350,27)+text('原型、导出与云服务\n分别记录验证状态。',73,408,370,26,'#61705e')+picture('prototype-detail',485,180,733,458),'演示时切换采用摘要、源码证据和使用边界三个页签。组件与导出脚本来源：'+BASE+'assets/ios_frame.jsx\n'+BASE+'assets/deck_stage.js\n'+BASE+'scripts/html2pptx.js'))
slides.append(('#f6f7f0',text('采用判断',70,62,1100,48,tag='h1')+text('研究结束后，留下行动',73,205,380,34,tag='h2')+text('写下一个试用任务，\n说明为什么值得继续。',73,278,350,27)+text('本地保存便于回看，\nMarkdown 便于归档。',73,408,370,26,'#61705e')+picture('prototype-decision',485,180,733,458),'演示时输入一份判断，保存后刷新，下载 Markdown。这里只验证浏览器端本地记录，不代表服务器存储、多用户同步或者权限功能。'))
slides.append(('#e8eedc',text('首轮试用范围',70,64,1100,48,tag='h1')+text('先完成一个真实项目的研究闭环',73,151,1120,31,'#3d5b37')+rule(73,227,1134)+text('本轮可体验',73,265,500,31,tag='h2')+text('项目筛选与详情查看\n固定版本的证据链接\n收藏、本地判断与下载',73,334,510,28)+text('产品化阶段再建设',707,265,500,31,tag='h2')+text('用户账户与访问权限\n数据库、协作与同步\n自动更新与部署维护',707,334,500,28)+text('试用判断：内容是否清楚？结论是否可追溯？下一步是否具体？',73,563,1120,26,'#3d5b37'),'本页提出试用范围和验收问题，不宣称产品已经部署。展示的视觉与文件成果可以继续交付，但业务产品仍需要相应工程实现。'))
for i,(bg,content,notes) in enumerate(slides,1):
    foot=text(f'研选 / 概念方案                         {i:02d} / 06',73,675,1130,12,'#819079' if i>1 else '#b8cbbb')
    body=content+foot
    (WEB/'slides'/f'{i:02d}.html').write_text(f'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>研选 · {i:02d}</title><style>{CSS}body{{background:{bg}}}</style></head><body>{body}</body></html>',encoding='utf-8')
    (WEB/'slides'/f'{i:02d}.notes.txt').write_text(notes,encoding='utf-8')
# Same slide contents hosted by the real upstream deck-stage component.
sections=''.join(f'<section style="position:relative;width:1280px;height:720px;background:{bg}">{content.replace("../assets/","assets/")+text(f"{i:02d} / 06",73,675,1100,12,"#83927b")}</section>' for i,(bg,content,notes) in enumerate(slides,1))
deck=f'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>研选 · 方案演讲稿</title><style>{CSS}html,body{{width:100%;height:100%;background:#111}}section{{font-family:"Microsoft YaHei",sans-serif}}deck-stage{{display:block}}</style><script type="application/json" id="speaker-notes">{json.dumps([s[2] for s in slides],ensure_ascii=False)}</script><deck-stage width="1280" height="720">{sections}</deck-stage><script src="vendor/deck_stage.js"></script></html>'
(WEB/'deck.html').write_text(deck,encoding='utf-8')
mobile='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>研选 · 移动端原型</title><style>body{margin:0;background:#e5eadc;font:14px "Microsoft YaHei",sans-serif;color:#234331}header{text-align:center;padding:22px}header a{color:inherit;margin:0 12px}#phone{display:flex;justify-content:center;padding:0 0 25px}iframe{width:100%;height:100%;border:0}#phone>div{transform-origin:top center}@media(max-width:440px){#phone>div{zoom:.85}}</style><header>真实上游 IosFrame 组件<a href="index.html">返回展厅</a><a href="prototype.html">查看响应式原型</a></header><div id="phone"></div><script src="vendor/react.production.min.js"></script><script src="vendor/react-dom.production.min.js"></script><script src="vendor/ios_frame.js"></script><script>ReactDOM.createRoot(document.getElementById('phone')).render(React.createElement(IosFrame,{height:760,width:360},React.createElement('iframe',{src:'prototype.html',title:'研选移动端交互原型'})));</script></html>'''
(WEB/'mobile.html').write_text(mobile,encoding='utf-8')
print('Authored 6 slides, speaker notes, deck-stage host and IosFrame host.')
