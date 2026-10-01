"""Generate the capability catalog, source navigation and offline reading report."""
import html
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import quote

import markdown

ROOT = Path(__file__).resolve().parents[1]
NOTES = ROOT / 'notes'
WEB = ROOT / 'web'
SHA = '77e7a3e21469dcbece2558086c8d91657abeaa40'
BASE = f'https://github.com/walkinglabs/learn-harness-engineering/blob/{SHA}/'
TREE = BASE.replace('/blob/', '/tree/')
inventory = json.loads((NOTES/'upstream-inventory.json').read_text(encoding='utf-8'))
caps = json.loads((NOTES/'capabilities.json').read_text(encoding='utf-8'))
paths = [x['path'] for x in inventory['files']]

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.rstrip()+'\n', encoding='utf-8')

def link(path, label=None):
    return f'[{label or path}]({BASE}{quote(path, safe="/")})'

def prefix(pattern):
    return next(p for p in paths if re.fullmatch(pattern, p))

lecture_topics = [
    ('强模型为什么仍会失败','区分能力与执行可靠性；观察漏步骤、范围漂移、错误完成'),
    ('Harness 到底是什么','识别工作环境、状态与反馈；理解模型之外的执行条件'),
    ('仓库作为事实记录','把需求、决策和约束写进可读文件；减少会话外隐含知识'),
    ('指令拆分与按需读取','短入口指向专题文档，避免把所有内容塞进一个文件'),
    ('跨会话连续性','保存进度、未完成项和下一步，下一轮主动恢复'),
    ('独立初始化阶段','修改前确认环境和基线健康，明确启动与验证入口'),
    ('控制任务范围','一个明确任务、完成定义、影响范围与后续任务'),
    ('功能清单与完成证据','把验收要求结构化，避免只凭叙述修改完成状态'),
    ('避免过早宣布完成','核对可运行证据与清理状态，不以自信代替结果'),
    ('完整链路与架构边界','贯穿真实用户路径验证，避免只测局部成功'),
    ('可观测性与评审反馈','结构化日志、可重放场景、评审标准和任务契约'),
    ('干净状态与持续维护','结束检查、可恢复交接、清理和对照评估'),
    ('目标循环、定时循环和独立检查','把驱动步骤显式化，加入状态、停止条件和预算'),
    ('从循环到图编排','节点、边、共享状态、条件路由、并行与恢复设计'),
]
project_topics = [
    ('提示驱动与最小规则对照','对同一任务比较纯提示和规则环境','starter / solution 完整目录'),
    ('Agent 可读工作区','整理入口、架构/产品文档与状态文件','starter / solution 完整目录'),
    ('多会话接续','通过进度和交接恢复未完成任务','starter / solution 完整目录'),
    ('增量索引与范围反馈','实现增量索引并检查架构边界','starter / solution 完整目录'),
    ('评审角色对照','同一 ConversationHistory 功能的单角色、生成+评审、规划+生成+评审对照','starter + 三个独立 solution 变体'),
    ('完整 Harness 综合练习','已有产品上对比弱/完整规则，观察日志和维护能力','starter / solution 完整目录'),
    ('自动循环练习','目标循环、定时检查、实现者与检查者分离','只有课程说明；projects/project-07 不存在'),
    ('工作流程图练习','显式图、并行汇合、回退与人工节点','只有课程说明与 L14 骨架；projects/project-08 不存在'),
]

def build_curriculum():
    out = ['# 课程、练习与资源地图', '', '所有链接固定到研究版本。15 种语言主要是同一课程的翻译，不把翻译副本计算成新能力。', '', '## 14 讲课程', '', '| 编号 | 主题 | 学到什么 | 固定版本原文 |', '| --- | --- | --- | --- |']
    lectures = []
    for i,(title,purpose) in enumerate(lecture_topics,1):
        path = prefix(rf'docs/en/lectures/lecture-{i:02d}-[^/]+/index.md')
        zh = path.replace('docs/en/','docs/zh/')
        out.append(f'| L{i:02d} | {title} | {purpose} | {link(zh,"中文")} · {link(path,"英文")} |')
        lectures.append({'number':i,'title':title,'purpose':purpose,'path':path,'zh_path':zh})
    out += ['', '## 8 项练习说明，6 个实际工程目录', '', '| 编号 | 练习 | 任务 | 交付形态 | 原文 |', '| --- | --- | --- | --- | --- |']
    projects=[]
    for i,(title,purpose,delivery) in enumerate(project_topics,1):
        path=prefix(rf'docs/en/projects/project-{i:02d}-[^/]+/index.md')
        out.append(f'| P{i:02d} | {title} | {purpose} | {delivery} | {link(path,"说明")} |')
        projects.append({'number':i,'title':title,'purpose':purpose,'delivery':delivery,'path':path})
    out += ['', 'P05 三个解法是同一功能的角色配置对照，不是先后升级版本。文档中的质量分是上游预填材料，本轮没有复跑模型来证实这些分数。P06 starter 已含多数业务功能，主要弱化了周边规则与交接。', '', '## 16 个课程代码文件', '', '以下包含 TypeScript、Bash 和 Python。它们的存在不表示都已运行；大部分用于演示原理。', '', '| 文件 | 性质 / 使用边界 |', '| --- | --- |']
    descriptions={
        'failure-pattern-demo.ts':'预设失败轨迹的教学模拟，不调用真实模型',
        'harness-vs-no-harness.ts':'预设任务和两种执行方式的对照模拟',
        'minimal-harness-loop.ts':'固定 read_file 行为与伪造工具输出；最小形状示例',
        'repo-reader.ts':'读取目录并按规则评价可读性；未在本轮运行',
        'split-vs-monolithic.ts':'检索成本的模拟比较，不是模型实测',
        'session-simulator.ts':'两次会话有/无交接的模拟',
        'init-check.ts':'目录检查与初始化对比模拟；未在本轮运行',
        'init.sh':'初始化命令示例，需针对项目配置',
        'scope-tracker.ts':'范围记录与分类的教学程序',
        'feature-list-validator.ts':'课程特定 schema/证据规则示例，不是 Skill 主评分器',
        'victory-detector.ts':'任务/证据的教学判定，不是通用结果判定器',
        'e2e-runner.ts':'预设链路结果的模拟，不是完整应用 E2E 测试',
        'runtime-logger.ts':'结构化日志与故障定位的示例管线',
        'benchmark-runner.ts':'预设任务结果的教学 benchmark',
        'cleanup-scanner.ts':'文件模式扫描；部分检查是启发式/占位，不等同静态分析器',
        'maker_checker_graph.py':'LangGraph 骨架；模型、测试和合并有占位，详见限制说明',
    }
    demos=[p for p in paths if p.startswith('docs/en/lectures/') and Path(p).suffix in ['.ts','.sh','.py']]
    for p in demos:out.append(f'| {link(p,Path(p).name)} | {descriptions[Path(p).name]} |')
    out += ['', '## 基础资源模板', '', '| 文件 | 用途 |', '| --- | --- |']
    uses={'AGENTS.md':'宿主可读的启动/工作规则','CLAUDE.md':'另一入口形式','claude-progress.md':'历史命名的会话进度文件，不自动保存','feature_list.json':'课程版功能与验收记录','init.sh':'安装/验证/可选启动入口','session-handoff.md':'接续说明','clean-state-checklist.md':'结束前的状态检查','evaluator-rubric.md':'评审量表','quality-document.md':'质量记录'}
    for p in paths:
        if p.startswith('docs/en/resources/templates/') and Path(p).name!='index.md':out.append(f'| {link(p,Path(p).name)} | {uses.get(Path(p).name,"资源文件")} |')
    out += ['', '## 7 份 Skill 参考模式', '', '| 文档 | 作用 |', '| --- | --- |']
    reference_uses={'memory-persistence-pattern.md':'分层记忆、索引与主题文件、会话保存','context-engineering-pattern.md':'选择/写入/压缩/隔离与预算','skill-runtime-pattern.md':'可复用 Skill 的组织规则','tool-registry-pattern.md':'工具注册、权限、并发和审计设计','multi-agent-pattern.md':'协调者、分工、继承、交接','lifecycle-bootstrap-pattern.md':'启动阶段、Hook、长任务状态','gotchas.md':'易忽略的限制与工程陷阱'}
    for p in paths:
        if p.startswith('skills/harness-creator/references/'):out.append(f'| {link(p,Path(p).name)} | {reference_uses.get(Path(p).name,"参考")} |')
    out += ['', '这些是设计材料，不会自动提供记忆数据库、权限沙箱、调度器或多 Agent 运行器。', '', '## 进阶资源与产品拆解', '', '- OpenAI Advanced Pack：作者根据外部文章整理的仓库目录模板，包括架构、设计、产品、可靠性、安全、计划、质量记录和参考资料。它不是官方产品功能开关。', '- 4 份 SOP：分层架构、仓库知识沉淀、可观测性反馈、浏览器验证；是操作流程，不是已部署的工具服务。', '- 4 篇产品拆解：Pi、Claude Code、Codex、DeepSeek；阅读时把作者分析与产品当前官方事实区分开。', '- 参考库：方法映射、初始化者职责、编程 Agent 启动流程、提示校准和外部文章链接。', '', '## 建议阅读顺序', '', '只想马上用：先看 Skill 和最小模板，再读 L03/L05/L08/L09。需要理解原理：读 L01–L12 并选择 P01/P03/P06 对照。确实需要自动化：完成真实验收后再读 L13/L14。仅学习管理 AI 工作，不需要先运行整个 Electron 教学项目。']
    write(NOTES/'course-map.md','\n'.join(out))
    return lectures,projects,demos

def build_capabilities():
    out=['# 38 项能力矩阵','','“已实测”仅表示列出的限定行为被运行验证；“教学实现/模拟/骨架”不是成品承诺。分类依据上游实际文件和本轮观察。','','| ID | 能力 | 类型 | 交付程度 |','| --- | --- | --- | --- |']
    for c in caps:out.append(f'| {c["id"]} | [{c["name"]}](#{c["id"].lower()}) | {c["category"]} | {c["status"]} |')
    for c in caps:
        out += ['',f'<a id="{c["id"].lower()}"></a>',f'## {c["id"]} · {c["name"]}','','| 项目 | 内容 |','| --- | --- |',f'| 类型 / 形态 | {c["category"]} / {c["status"]} |',f'| 输入或适用问题 | {c["input"]} |',f'| 输出 | {c["output"]} |',f'| 实现机制 | {c["mechanism"]} |',f'| 边界 | {c["boundary"]} |',f'| 本轮核查 | {c["verification"]} |',f'| 固定来源 | {link(c["source"])} |']
    write(NOTES/'capability-matrix.md','\n'.join(out))

def build_sources(lectures,projects,demos):
    top=Counter(p.split('/')[0] for p in paths)
    locales=sorted({p.split('/')[1] for p in paths if p.startswith('docs/') and not p.split('/')[1].startswith('.') and p.split('/')[1]!='public' and len(p.split('/'))>2})
    metadata={'revision':SHA,'file_count':len(paths),'bytes':sum(x['bytes'] for x in inventory['files']),'top_level':dict(top),'locales':locales,'lectures':lectures,'projects':projects,'lecture_code':demos,'capability_count':len(caps),'reading_scope':'全部路径/字节/Git blob SHA 核对；独立功能分类、核心代码和中英文内容核对；非所有翻译逐句审校。'}
    write(NOTES/'source-structure.json',json.dumps(metadata,ensure_ascii=False,indent=2))
    out=['# 源码导航与全量覆盖','','研究固定版本：'+SHA+'。原始树未截断，共 **'+str(len(paths))+' 个文件**，合计 '+str(metadata['bytes'])+' 字节。全部文件的 Git blob SHA 已实测校验。','','完整逐文件信息：[upstream-inventory.json](upstream-inventory.json)；可搜索网页：[文件索引](../web/sources.html)。','','## 顶层目录','','| 目录 | 文件数 | 内容 / 阅读口径 |','| --- | --- | --- |']
    roles={'docs':'15 种语言课程、代码例子、资源与站点配置；以英文结构和核心中英文正文核对，未逐句审校翻译','docs-readme':'各语言 README 与说明','projects':'P01–P06 starter/solution 与 shared 应用；核对各项目任务契约和核心服务/辅助工具','skills':'1 个 Skill、4 个 CLI + 1 个共享库、6 个模板/schema、7 份参考与 eval；重点阅读并实测 CLI','tools':'独立 Bash 审计，源码核对并运行','scripts':'6 个课程发布/维护脚本，源码结构核对','.github':'2 个构建发布工作流，配置核对'}
    for k,n in sorted(top.items()):out.append(f'| {k} | {n} | {roles.get(k,"根配置、入口或许可，已登记并核对用途")} |')
    out += ['', '## 语言覆盖', '', ', '.join(locales), '', '英文章节与资源 128 个文件。翻译副本不计作独立功能；课程正文数量、PDF 可导出语言数量与 Skill 元数据中的语言声明不是同一指标。', '', '## 可执行和维护入口', '', '| 固定来源 | 用途 / 层级 |', '| --- | --- |']
    entries={
        'skills/harness-creator/scripts/create-harness.mjs':'生成器 CLI，实测',
        'skills/harness-creator/scripts/validate-harness.mjs':'结构评分 CLI，实测',
        'skills/harness-creator/scripts/render-assessment-html.mjs':'HTML 报告 CLI，实测',
        'skills/harness-creator/scripts/run-benchmark.mjs':'结构 benchmark CLI，实测',
        'skills/harness-creator/scripts/lib/harness-utils.mjs':'共享实现：解析、探测、模板、评分、HTML',
        'tools/audit-harness.sh':'独立 Bash 仓库审计，实测',
        'scripts/build-course-pdfs.ts':'课程 PDF 导出与合并，未运行',
        'scripts/capture-readme-screenshots.ts':'课程预览截图，未运行',
        'scripts/export-site-utils.ts':'静态预览服务、页面发现、语言/路径共享逻辑',
        'scripts/validate-project-docs.ts':'课程项目路径与预期文件检查，未运行',
        'scripts/uz-orthography-cleanup.py':'乌兹别克语文本修正，会改文件，未运行',
        'scripts/uz-orthography-fix.py':'乌兹别克语文本修正，会改文件，未运行',
        'get_anthropic_logo.js':'抓取外部 SVG 文本，非 Harness 能力，未运行',
        'projects/project-06/solution/scripts/check-architecture.sh':'教学应用架构检查，正反样例实测',
        'projects/project-06/solution/scripts/cleanup-scanner.sh':'教学数据一致性扫描，坏样例实测',
        'projects/project-06/solution/scripts/benchmark.sh':'模拟性能脚本，仅源码核对',
        'projects/project-06/solution/scripts/dev.js':'构建主进程与 renderer 后启动 Electron，未运行 GUI',
        'projects/project-06/solution/init.sh':'依赖/类型/构建与产物检查，未执行依赖安装',
        '.github/workflows/deploy-pages.yml':'课程网站发布',
        '.github/workflows/release-course-pdfs.yml':'课程 PDF 构建及 Release 资产发布',
    }
    for p,role in entries.items():out.append(f'| {link(p)} | {role} |')
    out += ['', 'P01–P06 的开发脚本与服务代码存在大量阶段副本，全量文件索引全部保留；以各阶段任务契约解释差异，不把重复文件重复计为能力。课程代码文件逐项见 [课程地图](course-map.md)。', '', '## Skill 的其他文件', '', '| 类别 | 文件与含义 |', '| --- | --- |', '| 入口 | SKILL.md 是主工作流；SKILL.md.en / SKILL.md.uk 是变体，内容不保证同步 |', '| 元数据 | metadata.json 记录版本、触发和兼容声明；agents/openai.yaml 是宿主展示配置 |', '| 模板 | agents.md、feature-list.json、feature-list.schema.json、init.sh、progress.md、session-handoff.md |', '| 评估 | evals/evals.json 含 10 条描述型案例；主 benchmark 只查结构覆盖 |', '| 参考 | 7 份 reference 见课程地图；不会自动成为已安装运行服务 |', '', '## 可复查的证据链', '', '能力项 → 固定提交源码路径 → 本研究源码观察或实验 → 机器可读验证记录。', '', '- 逐文件路径、大小、blob SHA：[upstream-inventory.json](upstream-inventory.json)。', '- 38 项机器可读能力：[capabilities.json](capabilities.json)。', '- 目录与课程统计：[source-structure.json](source-structure.json)。', '- 实验结果与退出码：[verification-results.json](verification-results.json)。', '- 已发现差异与缺口：[limitations.md](limitations.md)。', '', '正文阅读、目录核对和运行实验分开标注；哈希校验能证明版本一致，不能证明每个文件都完成了语义审计。']
    write(NOTES/'source-map.md','\n'.join(out))

SECTIONS=[('map','一图总览',None),('overview','它是什么','research.md'),('capabilities','38 项能力',None),('learning','课程与资源','course-map.md'),('mechanism','底层原理','architecture.md'),('usage','如何使用','usage-guide.md'),('limits','边界与缺口','limitations.md'),('extensions','扩展与价值','extension-guide.md'),('verification','实测与复现','reproduction.md'),('sources','源码与版本','source-map.md')]
file_routes={f:s for s,_,f in SECTIONS if f}

def render_md(filename):
    text=(NOTES/filename).read_text(encoding='utf-8')
    body=markdown.markdown(text,extensions=['tables','fenced_code','toc'],output_format='html5')
    def rewrite(m):
        target=m.group(1)
        simple=target.split('#')[0]
        if simple in file_routes:return f'href="#{file_routes[simple]}"'
        if simple=='capability-matrix.md':return 'href="#capabilities"'
        if simple=='upstream-inventory.json':return 'href="sources.html"'
        if simple=='../web/sources.html':return 'href="sources.html"'
        if simple.endswith('.json') and not simple.startswith('http'):return f'href="records.html#{Path(simple).stem}"'
        return m.group(0)
    body=re.sub(r'href="([^"]+)"',rewrite,body)
    return re.sub(r'(<table>.*?</table>)',r'<div class="table-wrap">\1</div>',body,flags=re.S)

def build_web():
    nav=''.join(f'<a href="#{sid}" data-nav="{sid}"><span>{i+1:02d}</span>{html.escape(label)}</a>' for i,(sid,label,_) in enumerate(SECTIONS))
    cards=[]
    for c in caps:
        fields=''.join(f'<dt>{label}</dt><dd>{html.escape(c[key])}</dd>' for label,key in [('输入 / 问题','input'),('输出','output'),('机制','mechanism'),('边界','boundary'),('本轮核查','verification')])
        search=html.escape(' '.join(c.values()).lower(),quote=True)
        cards.append(f'<details class="cap-card" data-search="{search}" data-category="{html.escape(c["category"])}" data-status="{html.escape(c["status"])}"><summary><span class="cap-id">{c["id"]}</span><span class="cap-title">{html.escape(c["name"])}</span><span class="badge">{html.escape(c["status"])}</span></summary><div class="cap-body"><dl>{fields}</dl><a class="source" href="{BASE}{c["source"]}" target="_blank" rel="noreferrer">查看固定版本源码 ↗</a></div></details>')
    options=''.join(f'<option>{html.escape(x)}</option>' for x in sorted({c['category'] for c in caps}))
    statopts=''.join(f'<option>{html.escape(x)}</option>' for x in sorted({c['status'] for c in caps}))
    capability_page=f'<p class="eyebrow">CAPABILITY CATALOG</p><h1>按能力查，不被术语绕晕。</h1><p class="lead">每一项都给出输入、产物、实现机制和边界。展开即可查看；“已实测”仅对应列出的限定行为。</p><div class="filters"><label>搜索能力<input id="cap-search" type="search" placeholder="例如：评分、记忆、Windows、模型"></label><label>内容类别<select id="cap-category"><option value="">全部类别</option>{options}</select></label><label>交付程度<select id="cap-status"><option value="">全部程度</option>{statopts}</select></label><button id="reset-filters" type="button">重置</button></div><p id="cap-count" role="status" aria-live="polite">38 / 38 项</p><div id="cap-list">'+''.join(cards)+'</div><p id="empty-state" hidden>没有匹配项。试试其他关键词，或重置筛选。</p>'
    hero='<div class="hero"><p class="eyebrow">OPEN SOURCE FIELD NOTES · 003</p><h1>它是一套课程与实践资料，<br>教你理解和组织 Agent 工作。</h1><p class="lead">主要学习目标：理解 AI Agent 为什么会跑偏、忘记进度或误判完成，并学会设置项目规则、任务状态与验收反馈。资料包含 14 讲课程、模板和练习，附 1 个 Skill 及生成文件、检查结构、输出报告的辅助工具。</p><div class="hero-grid"><div><span class="hero-number">14</span><span>讲课程 / 学习方法</span></div><div><span class="hero-number">1</span><span>个 Skill / 指导宿主</span></div><div><span class="hero-number">4 + 1</span><span>个核心 CLI / Node + Bash</span></div><div><span class="hero-number">38</span><span>项能力 / 逐项核查</span></div></div><div class="callout"><strong>先记住这一点</strong><p>把它当作教材与项目工作手册来用：先学方法，再选模板。它聚焦 Agent 工作流程，不是所有 AI 知识的百科，也不是装好就能自动完成业务的 Agent 平台。</p></div><div class="hero-actions"><a class="button" href="#capabilities">查看课程与工具能力 →</a><a class="text-link" href="#verification">看本轮验证证据</a></div></div>'
    sections=[]
    for sid,label,f in SECTIONS:
        if sid=='map':
            content='<p class="eyebrow">ONE-PAGE CAPABILITY MAP</p><h1>一张图，建立对这个库的整体理解。</h1><p class="lead">从课程、资料、Skill 和工具，到 Agent 工作方式、构建目标、使用场景和对你的价值。六个板块归纳 38 项能力。</p><div class="map-actions"><a class="button" href="images/harness-capability-map.png" target="_blank" rel="noreferrer">打开原尺寸图片 ↗</a><a href="images/harness-capability-map.png" download="learn-harness-engineering-能力全景图.png">下载 PNG</a><a href="images/harness-capability-map.svg" download="learn-harness-engineering-能力全景图.svg">下载可编辑 SVG</a><a href="#capabilities">逐项查看能力证据</a></div><figure class="capability-map"><a href="images/harness-capability-map.png" target="_blank" rel="noreferrer"><img src="images/harness-capability-map.png" alt="Learn Harness Engineering 能力全景图：课程14讲，资料与模板，harness-creator Skill及生成/评分/报告工具，教学知识库，循环与图编排，课程维护；说明Agent执行与验证闭环、四个构建目标、个人价值和使用场景。" loading="eager"></a><figcaption>点击图片打开原尺寸。图中区分学习资料、可用工具、教学实现和需外部接入的能力；结构评分不等于真实业务成功率。</figcaption></figure><div class="callout"><strong>最值得带走的一句话</strong><p>它帮助你建立 Agent 的工作规则、任务状态和验证流程；模型、执行工具与真实业务验收仍由你的工作环境提供。</p></div>'
        elif sid=='capabilities':
            content=capability_page
        else:
            content=render_md(f)
        if sid=='overview': content=hero+'<figure class="capability-map"><a href="images/harness-capability-map.png" target="_blank" rel="noreferrer"><img src="images/harness-capability-map.png" alt="课程、资料、Skill与工具，以及学习目标、使用场景和个人价值的能力引导图"></a><figcaption>先看引导图建立整体理解；点击可查看高清原图。<a href="#map">查看与下载 PNG / SVG</a></figcaption></figure>'+'<div class="article intro-article">'+content+'</div>'
        else:content='<div class="article">'+content+'</div>'
        sections.append(f'<section id="{sid}" class="page" aria-label="{html.escape(label)}" tabindex="-1">{content}</section>')
    markup='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Learn Harness Engineering · 全量能力研究</title><link rel="stylesheet" href="styles.css"></head><body><a class="skip" href="#main">跳到正文</a><aside class="sidebar"><a class="brand" href="#overview"><span class="brand-mark">H</span><span>开源项目研究集<small>RESEARCH / 003</small></span></a><p class="side-caption">LEARN HARNESS ENGINEERING</p><nav aria-label="研究章节">'+nav+'</nav><div class="side-bottom"><span class="version-dot"></span>固定版本 77e7a3e<br><small>研究日期 2026.09.30<br>独立研究资料 · 未安装上游 Skill</small><a href="https://github.com/walkinglabs/learn-harness-engineering" target="_blank" rel="noreferrer">上游仓库 ↗</a></div></aside><div class="content"><header class="topbar"><span>能力、原理、使用与边界</span><button id="print-report" type="button">打印 / 保存为 PDF</button></header><main id="main">'+''.join(sections)+'</main><footer>2,478 个文件完整索引与哈希校验 · 核心工具 34 项观察确认 · 翻译未逐句审校<br>本页是独立研究阅读页，不是上游 Agent 运行界面。<a href="sources.html">完整文件索引</a> · <a href="records.html">原始研究记录</a></footer></div><script src="app.js"></script></body></html>'
    write(WEB/'index.html',markup)
    rows=''.join(f'<tr data-path="{html.escape(x["path"].lower(),quote=True)}"><td><a href="{BASE}{quote(x["path"],safe="/")}" target="_blank" rel="noreferrer">{html.escape(x["path"])}</a></td><td>{x["bytes"]:,}</td><td><code>{x["git_blob_sha"]}</code></td></tr>' for x in inventory['files'])
    write(WEB/'sources.html','<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>全部 2,478 个文件 · 固定源码索引</title><link rel="stylesheet" href="styles.css"></head><body class="standalone"><a href="index.html#sources">← 返回研究手册</a><h1>全部 2,478 个文件</h1><p>固定版本 '+SHA+'。全部文件已校验 Git blob SHA；目录索引不表示逐文件完成语义审计。</p><label>筛选路径<input type="search" id="source-search" placeholder="例如 skills/ 或 projects/project-06"></label><p id="source-count" role="status">2,478 个文件</p><div class="table-wrap"><table><thead><tr><th>路径 / 固定来源</th><th>字节</th><th>Git blob SHA</th></tr></thead><tbody>'+rows+'</tbody></table></div><script src="sources.js"></script></body></html>')
    blocks=[]
    for file in ['capabilities.json','source-structure.json','verification-results.json','reading-page-checks.json']:
        if (NOTES/file).exists():
            blocks.append(f'<section id="{Path(file).stem}"><h2>{file}</h2><pre>{html.escape((NOTES/file).read_text(encoding="utf-8"))}</pre></section>')
    write(WEB/'records.html','<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>研究原始记录</title><link rel="stylesheet" href="styles.css"></head><body class="standalone"><a href="index.html#verification">← 返回研究手册</a><h1>研究原始记录</h1><p>此页按原样展示本研究 JSON 记录。观察确认包含已发现的限制，不代表所有上游能力测试通过。</p>'+''.join(blocks)+'</body></html>')

if __name__=='__main__':
    build_capabilities()
    lectures,projects,demos=build_curriculum()
    build_sources(lectures,projects,demos)
    build_web()
    print(f'Built {len(caps)} capabilities, {len(lectures)} lectures, {len(projects)} project guides and {len(paths)} source entries.')
