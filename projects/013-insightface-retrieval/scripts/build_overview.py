"""Build the original, editable overview SVG with Python standard library only."""
from pathlib import Path
from html import escape
import json
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
W, H = 2400, 3620
C = dict(bg='#f3f1eb', ink='#182b43', muted='#536379', line='#dbe2e9', white='#ffffff', blue='#2464a0', blue_bg='#edf4fb', green='#287465', green_bg='#edf6f1', amber='#9b6426', amber_bg='#fbf3e7', purple='#7358a2')
out = []
panel_count = 0
text_count = 0

def add(s): out.append(s)
def rect(x,y,w,h,fill,stroke='none',r=20,extra=''):
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" {extra}/>')
def text(x,y,s,size=26,weight=400,fill=None,extra=''):
    global text_count
    text_count += 1
    add(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill or C["ink"]}" {extra}>{escape(s)}</text>')
def width_units(s):
    return sum(1.0 if unicodedata.east_asian_width(c) in ('W','F') else (0.34 if c==' ' else 0.59) for c in s)
def wrap(s,max_width,size):
    # Basic Chinese line breaking: keep closing punctuation off a new line.
    closing = '，。；：！？、）》」』】…,.!?;:)'
    opening = '（《「『【('
    result, line = [], ''
    for char in s:
        if line and width_units(line+char)*size > max_width:
            if char in closing or line[-1] in opening:
                carry = line[-1]
                line = line[:-1]
                if line: result.append(line)
                line = carry + char
            else:
                result.append(line); line=char
        else: line += char
    if line: result.append(line)
    # Avoid an isolated short sentence ending in the final line.
    if len(result)>1:
        while width_units(result[-1])<3 and width_units(result[-2])>6:
            result[-1] = result[-2][-1] + result[-1]
            result[-2] = result[-2][:-1]
    return result

def lines(x,y,items,max_width,size=26,leading=39,fill=None):
    for item in items:
        if not item:
            y+=leading*0.4; continue
        for line in wrap(item,max_width,size):
            text(x,y,line,size,fill=fill); y+=leading
    return y

def panel(x,y,w,h,title,tag='',accent='blue'):
    global panel_count
    panel_count+=1
    add(f'<g data-panel="{panel_count}" data-x="{x}" data-y="{y}" data-width="{w}" data-height="{h}" aria-label="{escape(title)}">')
    rect(x,y,w,h,C['white'],C['line'])
    rect(x+28,y+28,6,36,C[accent],r=3)
    text(x+50,y+57,title,33,600)
    if tag: text(x+w-28,y+54,tag,18,500,C['muted'],'text-anchor="end"')

def end(): add('</g>')
def section(y,number,title):
    text(80,y,f'{number}  {title}',30,600)
def arrow(x1,y,x2,color=None):
    color=color or C['blue']
    add(f'<path d="M{x1} {y} H{x2}" fill="none" stroke="{color}" stroke-width="3" marker-end="url(#arrow)"/>')
def block(x,y,w,title,subtitle,accent='blue'):
    rect(x,y,w,104,C[accent+'_bg'],r=13)
    text(x+w/2,y+39,title,28,600,extra='text-anchor="middle"')
    text(x+w/2,y+77,subtitle,23,400,C['muted'],'text-anchor="middle"')

add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">')
add('<title id="title">图片如何找到人，截图如何找到视频：InsightFace 与视觉检索全景理解</title>')
add('<desc id="desc">区分身份检索、同源画面检索与语义检索；说明离线建库、在线查询、InsightFace 的检测与识别网络、ArcFace 训练、模型与向量库的分工、可参考产品、实际价值、成熟程度、验收与授权。</desc>')
add('<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC","PingFang SC",Arial,sans-serif}</style>')
add('<defs><marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M2 2 L10 6 L2 10" fill="none" stroke="#2464a0" stroke-width="2"/></marker></defs>')
rect(0,0,W,H,C['bg'],r=0)
text(80,72,'013 / INSIGHTFACE & VISUAL RETRIEVAL',22,600,C['muted'])
text(80,156,'图片如何找到人，截图如何找到视频',66,700)
text(80,210,'从 AVScan 到 InsightFace：我们的完整理解与采用判断',31,400,C['muted'])
rect(80,252,2240,88,C['ink'],r=16)
text(120,307,'模型提特征  →  目标库建索引  →  搜索返回候选  →  元数据回答来源',34,600,C['white'])

section(393,'01','先区分目标：找人、找原画面、找相似内容')
xs=[80,836,1592]; cw=728
panel(xs[0],420,cw,330,'找同一个人','身份检索','green')
lines(xs[0]+32,518,['输入：目标人物的一张或多张参考照。','关注：稳定身份特征，减少表情、光线、背景变化的干扰。','输出：疑似同人的照片或人物出现候选。','姓名需要另有登记映射。'],cw-64,26,38)
end()
panel(xs[1],420,cw,330,'找同一画面的出处','同源匹配')
lines(xs[1]+32,518,['输入：视频某一帧的截图或修改版本。','关注：姿态、纹理、光影、构图和局部对应关系。','输出：已收录视频 + 对应位置。','认出演员仍不能确定作品和时间。'],cw-64,26,38)
end()
panel(xs[2],420,cw,330,'找内容相似的素材','语义检索','purple')
lines(xs[2]+32,518,['输入：参考场景、物体或动作的图片。','关注：画面内容是否相似或相关。','输出：类似素材与视频片段。','相关片段不等于原始截图出处。'],cw-64,26,38)
end()

section(805,'02','共同架构：提前处理素材，再在目标索引中搜索')
panel(80,835,2240,440,'目标库决定能搜什么，模型决定能区分什么','通用架构理解')
text(114,925,'离线建库',23,600,C['blue'])
a=[('目标素材','图库 / 视频库'),('检测 / 抽帧','按任务提取脸或帧'),('提取向量','选择合适的特征模型'),('建立索引','存储与相似度检索'),('保存来源映射','图片路径 / 视频 + 时间')]
for i,(t,s) in enumerate(a):
    bx=114+i*435
    block(bx,949,406,t,s)
    if i<4: arrow(bx+412,1001,bx+429)
text(114,1094,'在线查询',23,600,C['green'])
b=[('参考图 / 截图','裁切与质量处理'),('同样的预处理','人脸对齐或画面处理'),('调用相同模型','形成可比较的向量'),('检索目标索引','相似度排序 + 阈值'),('候选 + 来源','允许没有可靠匹配')]
for i,(t,s) in enumerate(b):
    bx=114+i*435
    block(bx,1118,406,t,s,'green')
    if i<4: arrow(bx+412,1170,bx+429,C['green'])
text(114,1251,'向量 + 原图/视频 ID + 时间戳 + 模型版本；不同模型向量不直接混用，更换模型通常需重建特征。',25,400,C['muted'])
end()

section(1335,'03','InsightFace 源库做什么，身份特征怎样学出来')
panel(80,1365,1440,600,'InsightFace：把检测、对齐、识别与运行接起来','S2 · S3 · S5')
rows=[('检测：SCRFD / RetinaFace','找到脸框和关键点；检测到人脸不等于识别出身份。'),('对齐：关键点 + 几何变换','裁切并规范人脸，让输入更容易比较。'),('识别：ResNet 等网络 + 训练权重','把人脸像素转换成身份特征；依模型可输出几百维向量。'),('执行：ONNX Runtime','本地 CPU / GPU 推理，具体运行条件依模型与环境而异。'),('比较：归一化向量 + 余弦相似度','返回匹配候选；特征本身不包含姓名、影片编号或时间。')]
for i,(t,s) in enumerate(rows):
    yy=1470+i*84
    text(114,yy,t,29,600)
    text(114,yy+38,s,25,400,C['muted'])
text(114,1907,'模型包示例：buffalo_l = SCRFD-10GF + ResNet50@WebFace600K',25,500,C['blue'])
text(114,1945,'ArcFace 是训练方法；例示 112×112 输入与 512 维输出不是所有模型的固定规定。',24,400,C['muted'])
end()
panel(1550,1365,770,600,'特征来自训练反馈','S4 · S5','green')
lines(1582,1471,['像素 → 多层计算 → 特征向量','身份标签 → 计算损失 → 反向传播更新参数','目标：同人特征趋近，异人更易分开。'],706,25,38)
for cx,cy,rx,ry,fill in [(1690,1685,92,66,C['blue_bg']),(1926,1670,86,63,C['green_bg']),(2160,1720,87,64,'#f3eef8')]:
    add(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"/>')
for dx,dy in [(-36,-17),(-5,22),(34,-11),(9,-35)]:
    add(f'<circle cx="{1690+dx}" cy="{1685+dy}" r="9" fill="{C["blue"]}"/>')
for dx,dy in [(-32,-15),(2,23),(30,-7),(8,-32)]:
    add(f'<rect x="{1926+dx-8}" y="{1670+dy-8}" width="16" height="16" rx="3" fill="{C["green"]}"/>')
for dx,dy in [(-31,-10),(4,25),(31,-8),(1,-31)]:
    cx,cy=2160+dx,1720+dy
    add(f'<path d="M{cx} {cy-10} L{cx+10} {cy+8} L{cx-10} {cy+8}Z" fill="{C["purple"]}"/>')
text(1635,1784,'人物 A',23,500)
text(1870,1770,'人物 B',23,500)
text(2104,1820,'人物 C',23,500)
text(1582,1858,'二维教学示意，非真实模型输出或测试成绩。',22,400,C['muted'])
lines(1582,1898,['ArcFace 在训练损失中加入角度间隔。','向量各维不固定对应某个五官；团簇不保证完全分开。'],706,23,34)
end()

section(2019,'04','四个概念分工：工具库、算法、模型、特征库')
roles=[('软件工具库',['InsightFace 组织检测、对齐、推理和评测流程。','它是调用入口；能力依所选模型与版本而异。'],'blue'),('训练算法',['ArcFace 等方法规定训练损失与优化目标。','训练让网络学会保留身份差异，减少拍摄条件干扰。'],'green'),('模型 / 权重',['网络结构 + 训练学到的参数。','运行模型生成特征；建库通常不需要重新训练每个人。'],'purple'),('特征数据库',['向量 + 图片路径 / 视频 ID + 时间戳等映射。','保存目标素材；索引提升检索效率，不自动提升辨别力。'],'amber')]
for i,(t,body,accent) in enumerate(roles):
    xx=80+i*566
    panel(xx,2049,542,300,t,accent=accent)
    lines(xx+30,2148,body,482,25,37)
    end()

section(2406,'05','产品与开源参考：现成技术怎样变成用户价值')
panel(80,2436,728,370,'AVScan：具体需求的产品化','S1')
lines(112,2536,['提供入口：上传、粘贴、裁切截图。','宣称能力：查作品番号与对应时间。','卖点：免费、免注册、低操作门槛。','价值：减少拿着截图手工寻找出处。','可能壁垒：覆盖、质量、速度与成本。','ViT / 精度 / 速度为网站宣称；后台与收入没有验证。'],664,25,37)
end()
panel(836,2436,728,370,'其他方案各有分工','S7—S10','purple')
lines(868,2536,['trace.moe：动画截图查集数与时间。','TwelveLabs：图片查询指定视频索引。','SSCD：同源图片及修改版本的特征。','Faiss：大量向量的相似度搜索。','身份检索与画面检索已有技术基础；范围依目标库。','未确认 AVScan 使用上述任何组合。'],664,25,37)
end()
panel(1592,2436,728,370,'实际识别的可用价值','用途判断','green')
lines(1624,2536,['相册 / 活动照片：减少人工翻找。','素材库：同人归组与候选检索。','视频素材：人物出现位置的线索。','截图反查：找到收录作品与位置。','需要参考照或登记目标；没有目标可聚类，但不能知道想找谁。','人物身份只能辅助，不能独立确定具体镜头出处。'],664,25,37)
end()

section(2864,'06','成熟程度、效果验收与个人可行性')
panel(80,2894,728,420,'技术可用，实际效果需验收','S3 · S6 · S11')
lines(112,2994,['已有论文、源码、预训练模型与持续评测。','清晰人脸图库可工程使用；侧脸、遮挡、低清仍需代表性样本验证。','官方 LFW 99.83% 是特定协议成绩，不等于自己的 1:N 检索准确率。','NIST 的误认 / 漏认评测，不是对本项目或默认模型包的认证。'],664,25,37)
end()
panel(836,2894,728,420,'用什么判断“靠谱”','实际验收','green')
lines(868,2994,['看误认、漏认和正确候选的排名。','测试目标不在库时能否拒绝匹配。','分开记录人脸漏检与特征匹配失败。','在实际规模下测耗时、存储与维护。','相似度不是身份概率；阈值要校准。','视频还受抽帧间隔、重复片段、编辑版本和覆盖范围影响。'],664,25,37)
end()
panel(1592,2894,728,420,'个人可以复用，先做小图库','采用判断','amber')
lines(1624,2994,['原型：现成模型 + 参考照 + 本地图库 + 向量匹配。','优化：质量过滤、阈值验证、候选复核与索引更新。','大工作量：从零训练领先模型，或维护海量视频与并发服务。','许可分开：库代码 MIT；官方预训练权重限定非商业研究用途。'],664,25,37)
end()

rect(80,3354,2240,134,C['ink'],r=17)
text(114,3402,'始终保留这些边界',25,500,'#b9cadd')
text(114,3450,'识人 ≠ 找原画面    ｜    相似 ≠ 同一人    ｜    向量 ≠ 姓名    ｜    库外目标可无匹配',31,600,C['white'])
text(80,3533,'资料核对：2026-10-02 · 原创理解汇总 · 未运行识别模型 / 未实测 AVScan · 特征空间为教学示意',22,400,C['muted'])
text(80,3574,'来源 S1—S14 的完整链接与事实边界见 notes/sources.md；本图不确认 AVScan 使用 InsightFace。',22,400,C['muted'])
add('</svg>')
svg='\n'.join(out)+'\n'
assets=ROOT/'assets'; assets.mkdir(exist_ok=True)
(assets/'understanding-map.svg').write_text(svg,encoding='utf-8',newline='\n')
(ROOT/'notes'/'diagram-manifest.json').write_text(json.dumps({'width':W,'height':H,'panels':panel_count,'text_elements':text_count,'date':'2026-10-02','kind':'original-concept-map','real_model_output':False},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Created SVG: {W} x {H}; {panel_count} panels; {text_count} text elements')
