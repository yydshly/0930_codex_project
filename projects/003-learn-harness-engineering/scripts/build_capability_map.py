"""Draw an editable, exact-text capability infographic and export a high-res PNG.

No model/API call. SVG is the source artifact; Chromium renders the same figure.
"""
import html
import json
import shutil
import unicodedata
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets'
W,H=3000,2670
INK='#173c33';MUTED='#566d62';PAPER='#f7f5ec';LINE='#cfdbcc';ACCENT='#b95531';GREEN='#315f4c'
parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">', '<title id="title">Learn Harness Engineering 能力全景图</title><desc id="desc">课程、资料、Skill、教学应用、循环协作和维护工具六个板块，连接 Agent 工作机制、四个构建目标、个人价值和使用场景。</desc>', '<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9" fill="#6f8774"/></marker></defs>', f'<rect width="{W}" height="{H}" fill="{PAPER}"/>', '<g font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif">']
text_bounds=[]

def rect(x,y,w,h,fill,stroke=None,r=14):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="2"' if stroke else '')+'/>')

def text(x,y,s,size=28,color=INK,weight=400):
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}">{html.escape(s)}</text>')
    text_bounds.append({'x':x,'y':y,'text':s,'size':size})

def width(s,size):
    return sum(1 if unicodedata.east_asian_width(c) in ['W','F'] else (0.3 if c==' ' else 0.57) for c in s)*size

def wrapped(x,y,s,maxwidth,size=28,color=INK,weight=400,leading=42):
    line='';lines=[]
    for c in s:
        if line and width(line+c,size)>maxwidth:
            lines.append(line);line=c
        else:line+=c
    if line:lines.append(line)
    for line in lines:
        text(x,y,line,size,color,weight);y+=leading
    return y

def line(x1,y1,x2,y2,color=LINE,arrow=False,dash=False):
    parts.append(f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{color}" stroke-width="3"'+(' marker-end="url(#arrow)"' if arrow else '')+(' stroke-dasharray="8 7"' if dash else '')+'/>')

def panel(x,y,w,h,n,title,badge,rows,foot):
    rect(x,y,w,h,'#fffef9',LINE)
    rect(x+26,y+27,52,52,GREEN,r=11)
    text(x+35,y+63,n,28,'#fffef9',700)
    text(x+96,y+61,title,34,INK,700)
    bw=max(132,width(badge,22)+34)
    rect(x+w-bw-28,y+33,bw,38,'#e8eee0',r=19)
    text(x+w-bw-11,y+60,badge,22,GREEN,500)
    line(x+30,y+101,x+w-30,y+101)
    current=y+145
    for row in rows:
        if isinstance(row,tuple):
            label,content=row
            text(x+31,current,label,27,ACCENT,600)
            current=wrapped(x+159,current,content,w-195,27,INK,leading=39)+12
        else:
            current=wrapped(x+32,current,row,w-66,27,INK,leading=40)+13
    foot_y=y+h-69
    if current>foot_y-10:raise ValueError(f'Panel {n} overflow {current} > {foot_y-10}')
    line(x+30,foot_y-23,x+w-30,foot_y-23)
    wrapped(x+32,foot_y+12,foot,w-64,24,MUTED,leading=34)

text(96,75,'OPEN SOURCE FIELD NOTES / 003',24,ACCENT,600)
text(96,174,'一张图看懂：这个库能帮你做什么',76,INK,700)
text(2110,88,'LEARN HARNESS ENGINEERING',30,GREEN,650)
text(2110,136,'课程与实践资料 + 1 个 Skill + 辅助工具',29,MUTED)
text(98,236,'目标：理解 Agent 的工作条件，建立有规则、有状态、有验证、可接续的执行流程。',34,MUTED)

M,GAP=96,36
PW=(W-2*M-2*GAP)/3
X=[M,M+PW+GAP,M+2*(PW+GAP)]
panel(X[0],290,PW,612,'01','课程：理解工作原理','学习资料',[
    ('L01–02','模型为何失败 · Harness 是什么'),
    ('L03–04','仓库保存知识 · 指令按需读取'),
    ('L05–06','跨会话接续 · 启动与环境检查'),
    ('L07–08','控制任务范围 · 功能清单与验收'),
    ('L09–10','防止假完成 · 完整链路验证'),
    ('L11–12','日志与反馈 · 清理与交接'),
    ('L13–14','自动循环 · 图式流程编排'),
], '14 讲、8 项练习说明；实际工程目录为 P01–P06。')
panel(X[1],290,PW,612,'02','资料：沉淀项目约定','学习资料',[
    '基础模板：规则、任务、进度、初始化、交接',
    '质量资料：验收清单、评审量表、质量记录',
    '进阶模板：架构、产品、计划、可靠性与安全',
    '7 份参考：记忆、上下文、Skill、权限、协作、生命周期与常见陷阱',
    '4 份 SOP：架构、知识沉淀、可观测性、浏览器验证',
    '4 篇产品拆解；另有 10 条描述型评估用例',
], '提供设计与操作参考；不会自动安装这些系统。')
panel(X[2],290,PW,612,'03','Skill：辅助你的项目','可用工具',[
    'harness-creator 指导宿主 AI 检查项目、选择模板、生成规则、解释审计结果。',
    '4 个 Node 工具：文件生成 / 结构评分 / HTML 报告 / 结构 Benchmark',
    '另有 1 个独立 Bash 仓库审计工具',
    '生成规则、任务、进度、交接和 init.sh 五类文件',
    '基础技术栈与包管理器识别；验证命令可自定义',
], '结构评分满分 ≠ 业务功能通过；不会替你实现产品。')
panel(X[0],940,PW,566,'04','应用：观察实践过程','教学实现',[
    'Electron 本地知识库，作为教学实验对象',
    '文档导入与管理 → 段落分块与索引 → 问答与引用',
    '历史记录、用户反馈、本地保存、结构化日志',
    '辅助示例：架构检查、数据扫描、性能模拟',
    '对比单角色、生成＋评审、规划＋生成＋评审',
], '问答为关键词匹配与预设答案，没有真实 LLM。')
panel(X[1],940,PW,566,'05','循环：组织复杂执行','需外部接入',[
    '目标循环：执行 → 验证 → 修正 → 达成或停止',
    '定时循环：周期检查 → 处理异常 → 必要时叫人',
    'Maker–Checker：实现者与检查者分工',
    '图式编排：节点、分支、共享状态、回退与人工节点',
    '运行器、权限、预算、持久化和恢复需自行接入',
], '图代码含占位；P07/P08 没有完整工程目录。')
panel(X[2],940,PW,566,'06','维护：课程发布与导出','维护工具',[
    'VitePress 课程网站 · 15 种语言资料',
    '课程 PDF 导出与合并：当前支持 en / zh',
    'README 截图 · 课程路径与产物检查',
    'GitHub Pages / Release 发布工作流',
    '翻译文本修正 · 素材辅助脚本',
], '服务于课程内容维护，不是业务应用生成器。')

text(96,1580,'如何配合 Agent：模型负责理解，工具负责执行，项目负责提供规则与反馈',38,INK,700)
text(96,1629,'你定义目标与验收；本库帮助组织工作条件；模型、宿主工具和真实业务测试来自你的工作环境。',28,MUTED)
box_y=1680
bx=[96,646,1210,1770,2330];bw=[482,496,492,492,574]
stages=[('你','目标与验收条件','你要什么、怎样算完成'),('项目上下文','规则 + 任务 + 进度','读取约束与当前状态'),('Agent / 模型','理解 + 决策 + 生成','选择下一步行动'),('宿主工具','读取 + 修改 + 运行','对项目执行实际操作'),('验证与记录','真实检查 + 交接','确认结果、保存证据')]
for i,(small,title,sub) in enumerate(stages):
    fill='#e9eee0' if i in [0,1,4] else GREEN
    color=INK if i in [0,1,4] else '#fffef9'
    rect(bx[i],box_y,bw[i],145,fill,LINE if i in [0,1,4] else None)
    text(bx[i]+25,box_y+36,small,23,MUTED if i in [0,1,4] else '#ccdccb')
    text(bx[i]+25,box_y+80,title,31,color,650)
    text(bx[i]+25,box_y+117,sub,23,color)
    if i<4:line(bx[i]+bw[i]+9,box_y+73,bx[i+1]-15,box_y+73,'#6f8774',True)
parts.append('<path d="M 2610 1838 V 1875 H 1456 V 1838" fill="none" stroke="#b95531" stroke-width="3" marker-end="url(#arrow)"/>')
text(1750,1861,'失败反馈 → 修正；通过后更新状态并交接',25,ACCENT,550)

text(96,1955,'逐步构建什么目标',36,INK,700)
goals=[('01','Agent 可读的项目'),('02','有证据的单任务执行'),('03','可跨会话接续的长任务'),('04','有边界的自动循环与多 Agent')]
gw=(W-192-3*26)/4
for i,(n,title) in enumerate(goals):
    x=96+i*(gw+26)
    rect(x,1984,gw,89,'#e5ecdc',r=9)
    text(x+22,2039,n,29,ACCENT,700)
    text(x+83,2039,title,28,INK,600)
text(96,2119,'先做好验收与状态，再增加自动化和并行。第四阶段需要接入执行环境，不能靠安装 Skill 自动获得。',28,MUTED)

line(96,2167,2904,2167)
text(96,2225,'对你的意义',38,INK,700)
text(1590,2225,'适合的使用场景',38,INK,700)
left=[('少重复解释','项目背景与决策留在文件中'),('少返工','把“完成”绑定到实际验证'),('能接着做','新会话知道做到哪里、下一步是什么'),('可复用','把成功做法沉淀成项目流程')]
y=2278
for title,sub in left:
    text(98,y,title,28,ACCENT,650);text(294,y,sub,28,INK);y+=44
rect(96,2447,1408,67,'#e9eee0',r=8)
text(119,2490,'你的研究集：统一版本、能力、证据、边界和交付检查。',28,GREEN,550)
right=['多天持续开发 · 修复与重构 · 批量迁移','补测试与规范化 · 多角色评审 · 项目研究','简单问答或一次性小任务，可只取轻量模板。','Windows：Node 工具可用，Bash 入口需对应环境。']
y=2280
for s in right:text(1590,y,s,28,INK);y+=52
text(1590,2490,'采用价值看返工、人工介入和真实结果，不看结构分高低。',25,ACCENT,550)

rect(96,2550,2808,48,GREEN,r=6)
text(121,2583,'能力边界：不是独立 Agent 平台  |  不训练模型  |  不自带完整自动调度  |  结构评分不等于真实成功率',27,'#fffef9',500)
text(96,2638,'38 项能力归纳为六层 · 固定版本 77e7a3e · 2026-09-30 · 独立研究整理',22,MUTED)
text(1800,2638,'来源：github.com/walkinglabs/learn-harness-engineering',22,MUTED)
parts.append('</g></svg>')
svg='\n'.join(parts)
ASSETS.mkdir(exist_ok=True)
source=ASSETS/'harness-capability-map.svg'
source.write_text(svg,encoding='utf-8')
with sync_playwright() as p:
    exe=next((str(x) for x in [Path('C:/Program Files/Google/Chrome/Application/chrome.exe'),Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')] if x.exists()),None)
    browser=p.chromium.launch(headless=True,**({'executable_path':exe} if exe else {}))
    page=browser.new_page(viewport={'width':W,'height':H},device_scale_factor=1)
    page.goto(source.as_uri(),wait_until='load')
    bad=page.locator('text').evaluate_all('(nodes)=>nodes.map(n=>{const b=n.getBBox();return {text:n.textContent,x:b.x,y:b.y,width:b.width,height:b.height}}).filter(b=>b.x<0||b.y<0||b.x+b.width>3000||b.y+b.height>2670)')
    if bad:raise ValueError('Text outside canvas: '+json.dumps(bad,ensure_ascii=False))
    page.screenshot(path=str(ASSETS/'harness-capability-map.png'))
    browser.close()
images=ROOT/'web/images'
images.mkdir(exist_ok=True)
for ext in ['png','svg']:shutil.copy2(ASSETS/f'harness-capability-map.{ext}',images/f'harness-capability-map.{ext}')
(ROOT/'notes/capability-map-render.json').write_text(json.dumps({'method':'Editable SVG + local Chromium render','imagegen_attempt':'Built-in image_gen failed with network error; no image was returned or edited.','width':W,'height':H,'text_elements':len(text_bounds),'out_of_canvas_text':bad,'source':'assets/harness-capability-map.svg','png':'assets/harness-capability-map.png'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Created one {W}x{H} capability infographic, editable SVG and PNG.')
