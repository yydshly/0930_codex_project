"""Create a source-grounded, single-image library overview from actual captures."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import base64, hashlib, html, json, io, re

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'library-overview'
OUT.mkdir(parents=True,exist_ok=True)
W,H,M=3600,6640,144
BG='#f3f1e9'; INK='#20373a'; MUTED='#607174'; LINE='#ced5cf'; GREEN='#315f55'; ORANGE='#c87446'; BLUE='#37637b'
image=Image.new('RGB',(W,H),BG); draw=ImageDraw.Draw(image)
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="{W}" height="{H}" fill="{BG}"/>']
fonts={}; text_records=[]
def font(size,bold=False):
 k=(size,bold)
 if k not in fonts:fonts[k]=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',size)
 return fonts[k]
def rect(x,y,w,h,fill,r=0,stroke=None):
 draw.rounded_rectangle((x,y,x+w,y+h),r,fill=fill,outline=stroke,width=2)
 svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="2"' if stroke else '')+'/>')
def line(x1,y1,x2,y2,color=LINE,width=2):
 draw.line((x1,y1,x2,y2),fill=color,width=width);svg.append(f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{color}" stroke-width="{width}"/>')
def text(t,x,y,size=34,color=INK,bold=False):
 # Coordinates denote the top of the font's ascender box, consistently in PNG/SVG.
 draw.text((x,y),t,font=font(size,bold),fill=color,anchor='lt')
 svg.append(f'<text x="{x}" y="{y+size*.91}" fill="{color}" font-family="Microsoft YaHei,Noto Sans CJK SC,sans-serif" font-size="{size}" font-weight="{700 if bold else 400}">{html.escape(t)}</text>')
 text_records.append({'text':t,'x':x,'y':y,'size':size,'width':font(size,bold).getlength(t)})
def wrap(t,width,size,bold=False):
 result=[]
 for para in t.split('\n'):
  buf=[]
  for ch in re.findall(r'[A-Za-z0-9_@]+(?:[.\-/_][A-Za-z0-9_@]+)*|[^\n]',para):
   if buf and font(size,bold).getlength(''.join(buf)+ch)>width:
    if ch in '，。；：、）】' and len(buf)>1:
     last=buf.pop();result.append(''.join(buf));buf=[last,ch]
    else:result.append(''.join(buf));buf=[ch]
   else:buf.append(ch)
  result.append(''.join(buf))
 return result
def paragraph(t,x,y,width,size=34,color=INK,bold=False,leading=None,max_height=None):
 leading=leading or int(size*1.44);rows=wrap(t,width,size,bold)
 if max_height is not None:assert len(rows)*leading<=max_height,(t,len(rows)*leading,max_height)
 for i,row in enumerate(rows):text(row,x,y+i*leading,size,color,bold)
 return len(rows)*leading
def picture(p,x,y,w,h,bg='#e2e5df'):
 src=Image.open(p).convert('RGB');fitted=ImageOps.contain(src,(int(w),int(h)),Image.Resampling.LANCZOS)
 rect(x,y,w,h,bg);image.paste(fitted,(int(x+(w-fitted.width)/2),int(y+(h-fitted.height)/2)))
 b=io.BytesIO();src.save(b,'JPEG',quality=93)
 svg.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet" href="data:image/jpeg;base64,{base64.b64encode(b.getvalue()).decode()}"/>')
def section(n,title,subtitle,y):
 text(n,M,y,30,ORANGE,True);text(title,M+84,y-9,58,INK,True)
 if subtitle:text(subtitle,M,y+76,32,MUTED)

cases=[
 {'id':1,'short':'空间作品集','effect':'挂轨档案、单件聚焦与薄纸翻开','interaction':'内容 / 主题 / 阅读 / 离线网页','author':'cambreedesigns','source':'作品集；作者称 3 次提示','principle':'CSS 透视和变换形成物件陈列；分段纸面绕同一书脊翻开。项目数据同时驱动封面、详情和导出。','delivery':'编辑项目与主题；聚焦 / 翻开 / 过滤。输出独立 HTML、配置与体验 JSON。','boundary':'有限 CSS 弯曲；没有原作服装褶皱、完整布料物理、模型生成或自动发布。','product':'成果 / 作品展厅','expand':'多主题、内容后台、资产导入','value':'让已有研究成果成为可阅读、可交付的个人或产品展厅。'},
 {'id':2,'short':'三维任务街区','effect':'自由探索、证据核对与人物回应','interaction':'移动 / 对话 / 任务状态','author':'chrisfirst','source':'Fallout 风格；代码生成素材自述','principle':'Three.js 程序化街区与人物，任务状态机连接对话、证据与归档；目光、眉眼和手势读取真实任务结果。','delivery':'移动、寻找三份证据、回答与提交。输出任务 / 对话 / 位置体验 JSON。','boundary':'固定原创关卡与有限风格化人物；没有完整 RPG、语音口型、V.A.T.S. 或联机。','product':'任务学习 / 剧情训练','expand':'任务编辑器、分支剧情、复盘','value':'把知识核验改为用户亲自完成的任务，观察理解与决策。'},
 {'id':3,'short':'观点叙事片','effect':'纸页、砖墙、光束球与曲线镜头','interaction':'观点 / 镜头 / 时间线 / 视频','author':'sevdeawesome','source':'Opus 观点视频；工具链未披露','principle':'Canvas 镜头编排用同一时间轴驱动纸页、文字、墙、球体与曲线；标题和观点数据进入固定六镜骨架。','delivery':'编辑命题、解释、主题和时长。输出无声 WebM、PNG、脚本 JSON；SVG 内嵌帧。','boundary':'固定论证骨架与示意曲线；没有全长旁白，SVG 不等于原生矢量动画；原作工具链未知。','product':'观点 / 课程叙事','expand':'多镜头模板、旁白、素材替换','value':'把研究结论做成能讲清论证顺序的视频、课件与分享材料。'},
 {'id':4,'short':'文字发布动效','effect':'大字、橙点、环字与径向点阵','interaction':'卖点 / 配色 / 转场 / 视频','author':'uxmiles','source':'发布宣传片；作者称 3 次提示','principle':'Canvas 排版、时间插值与图形投影组织镜头。真实研究卡整理结果进入首尾开关，形成可检查的语义闭环。','delivery':'编辑字标、卖点、来源、主题与镜头。输出无声 WebM、画面与项目 / 体验 JSON。','boundary':'本地有限规则和环字投影；不自动核实来源，未接入提示自动生成；原作完整工具链未知。','product':'产品 / 品牌发布片','expand':'品牌模板、截图插槽、多画幅','value':'把工作台功能和产品事实持续变成可替换内容的发布物料。'},
 {'id':5,'short':'第一人称生存','effect':'机房、机械护甲、枪械与命中反馈','interaction':'观察 / 射击 / 躲避 / 波次','author':'p_e_cooper','source':'浏览器生存；Opus + Astra','principle':'Three.js 第一人称相机、射线命中、追击与三波状态循环。实际枪口、后坐、火花和挥击预警连接战斗状态。','delivery':'移动瞄准、开火充能、观察并躲避。输出实际画面 PNG、演练与体验 JSON。','boundary':'原创房间 / 机器人与简化近战；没有 COD 源码 / 人物资产、完整动画库或多人战斗。','product':'情境 / 流程演练','expand':'任务规则、场景包、复盘评分','value':'用实际行动练观察与处置；迁移到培训需专家先核对规则。'},
 {'id':6,'short':'角色钢琴动画','effect':'机器人、黑猫、钢琴与同步音乐','interaction':'旋律 / 速度 / 音画 / 配方','author':'kevin_t_ngo','source':'明确披露 Python + Blender','principle':'同一音符事件表驱动 Web Audio 声音与 Three.js 琴键、角色动作；网页逐帧编码配乐 WebM，Python 配方写 WAV / bpy。','delivery':'调整情绪、旋律、BPM 和播放位置。输出 WAV、配乐 WebM、PNG、Python / Blender 配方。','boundary':'新网页造型未同步到离线 Blender 配方；本机离线渲染未验证；不是通用歌曲 / 人物生成服务。','product':'音乐 / 角色编排','expand':'音轨导入、角色包、离线渲染','value':'让旋律、角色演奏与影片可以按同一配方修改和重新输出。'},
 {'id':7,'short':'三维研究集市','effect':'木石巷道、树冠、光照与成果展位','interaction':'漫游 / 参观 / 环境 / 记录','author':'DODOREACH','source':'可见集市效果；引擎未披露','principle':'Three.js 原创建筑、轴向木纹与分层枝叶建立近景。位置、遮挡、发现、到达与查看记录共同控制三个真实成果展位。','delivery':'切晨昏 / 密度、步行或明确导览。输出场景 PNG、参观记录与体验 JSON。','boundary':'固定三展位、静态门窗与简化远景；没有布局编辑、实时内容后台或多人展会；原作工具链未知。','product':'三维虚拟展会','expand':'展位编辑、项目接入、访问分析','value':'把多个研究和产品放进可探索的空间，用真实参观记录组织回顾。'},
 {'id':8,'short':'软胶角色触碰','effect':'兔、橙团、猫的连续外皮与回弹','interaction':'部位拖揉 / 柔软度 / 恢复','author':'AugustCastilIo','source':'作者第四款游戏；引擎未知','principle':'Three.js 射线定位触点；连续外皮和贴面表情沿同一局部形变场移动，弹簧阻尼与有界体积补偿控制恢复。','delivery':'选角色、揉不同部位、松手恢复、调柔软度。输出触碰 / 形变 / 体验 JSON。','boundary':'没有压力求解、自碰撞、材料混合或严格守恒；造型和软件渲染仍有局限，未声称真机帧率。','product':'品牌角色反馈组件','expand':'自有角色、状态映射、嵌入 SDK','value':'给工作台的欢迎、提示与反馈建立可辨识、可触碰的品牌角色。'},
 {'id':9,'short':'营地与折射水体','effect':'海床、扫描岸石、林缘、船与天气','interaction':'步行 / 登船 / 日夜 / 密度','author':'maxt3chno','source':'Opus / Sonnet / Meshy；Three.js','principle':'Three.js 世界共用环境状态；实际海床离屏颜色 / 深度经波纹扰动与深度吸收进入水面。扫描岸石、植被实例与船舱遮罩分层组织。','delivery':'步行 / 航行、独立环顾、切天气 / 时刻 / 密度。输出世界 PNG、环境与体验 JSON。','boundary':'单次屏幕空间折射，焦散近似；简化航行 / 浮力、指标未校准；未调用 Meshy 或复现全套原作模型。','product':'导览 / 环境实验','expand':'地图与资产接入、变量实验、地标','value':'展示空间和环境变化，支撑虚拟考察、场地导览与可解释的演示。'},
 {'id':10,'short':'车球物理挑战','effect':'赛车、弧形场馆、球与悬挂反馈','interaction':'驾驶 / BOOST / 跳跃 / 进球','author':'BlendiByl','source':'浏览器汽车足球；引擎未知','principle':'Three.js 简化速度 / 重力 / 碰撞驱动车球；接触冲量、落地和刹车进入视觉悬挂，相机可在追车与跟球之间切换。','delivery':'调摩擦 / 弹性，驾驶 / 转向 / 跳跃 / 撞球。输出 PNG、物理体验与状态 JSON。','boundary':'单人简化物理，碰撞边界仍为矩形；观众为静态图谱，没有完整车辆刚体、空中翻滚或联机。','product':'操控 / 物理活动','expand':'参数实验、玩法包、轨迹回放','value':'用可操作反馈比较手感，制作教学实验或具有明确目标的品牌小游戏。'},
]
provenance=json.loads((ROOT/'notes/v16-current-cover-provenance.json').read_text(encoding='utf-8'))
frames={r['caseId']:r for r in provenance['records']}
source_text=(ROOT/'web/source-data.js').read_text(encoding='utf-8')
source_data=json.loads(source_text[source_text.index('{'):source_text.rindex('}')+1])
for c in cases:c['sourceUrl']=next(item['url'] for item in source_data['cases'] if item['id']==c['id'])

# Header.
rect(0,0,W,300,INK)
text('CREATIVE PRODUCTS  /  015',M,52,31,'#bed2c4',True)
text('十项创意效果库',M,115,100,'#ffffff',True)
text('效果、内部原理、产品方向与对你的价值',M,232,38,'#e2e9df')
text('10',2730,82,94,'#ffffff',True);text('独立效果',2888,121,34,'#e2e9df')
text('3 种执行方式  ·  本地可运行',2730,216,31,'#bed2c4')
text('以十个 Opus 创作案例为参考，逐项制作可运行原型',M,340,44,INK,True)
text('当前库：v16（05 / 07 / 09 / 10 精修，其余六项保留 v15）  |  2026.10.03',M,402,31,MUTED)

# 10 actual effect frames, before explanation.
section('01','先看这个库包含哪些效果','以下均为当前原型的真实运行截图；点击 / 时间线 / 音乐 / 物理状态会改变实际效果。',472)
card_w=(W-2*M-4*24)//5; card_h=564; top=610
for i,c in enumerate(cases):
 x=M+(i%5)*(card_w+24);y=top+(i//5)*(card_h+24)
 rect(x,y,card_w,card_h,'#fffef9',14,LINE)
 text(f'{c["id"]:02d}',x+24,y+19,38,GREEN,True)
 text(c['short'],x+92,y+24,34,INK,True)
 picture(ROOT/frames[c['id']]['source'],x+20,y+86,card_w-40,316)
 paragraph(c['effect'],x+24,y+424,card_w-48,30,INK,max_height=86)
 paragraph(c['interaction'],x+24,y+515,card_w-48,24,MUTED,max_height=36)

# Opus provenance and relationship to this original implementation.
section('02','这个库与十个 Opus 案例是什么关系','原帖披露、画面观察和我们独立实现的技术分别记录；不从画面推定未公开的工具链。',1820)
boxes=[
 ('原作来源','Min Choi 的十项合集，原作者均提及 Opus（归档原文称 5.5）。提示次数、耗时与模型版本按作者自述保留，未据此推算普遍效率。',GREEN),
 ('多工具合作的两项','05：Opus + Astra。\n09：Opus 做机制 / 环境 / 集成；Sonnet 做汽车 / 营火；Meshy 提供部分模型；Three.js 运行。',BLUE),
 ('我们的库是什么','逐项参考效果，使用原创内容建立 10 个浏览器原型。它们有独立规则、任务和交付范围；当前页面没有 Opus 调用或自动生成后台。',ORANGE)
]
bw=(W-2*M-48)//3
for i,(title,body,color) in enumerate(boxes):
 x=M+i*(bw+24);rect(x,1960,bw,300,'#e7ebe2',12);rect(x,1960,8,300,color)
 text(title,x+30,1989,37,color,True);paragraph(body,x+30,2055,bw-60,32,max_height=183)

# Runtime architecture, then per-case internal principles and actual scope.
section('03','内部原理：共同接口，逐项独立实现','1 个 CSS 物件展厅 + 2 个 Canvas 叙事 / 动效编辑器 + 7 个 Three.js 三维交互。',2330)
nodes=[('内容 / 参数','项目、文字、主题\n旋律、任务、环境'),('原创资产 / 场景','几何、字体、摄影材质\nCC0 资源与模型'),('时间 / 状态 / 规则','镜头与音符时间表\n任务、命中、运动状态'),('浏览器执行','CSS / Canvas / WebGL\nWeb Audio 音频'),('输出 / 复盘','按本例能力导出\n保存真实状态与画面')]
nw=(W-2*M-4*44)//5
for i,(title,body) in enumerate(nodes):
 x=M+i*(nw+44);rect(x,2473,nw,178,'#ffffff',12,LINE)
 text(title,x+24,2501,34,GREEN,True);paragraph(body,x+24,2559,nw-48,28,MUTED,max_height=84)
 if i<4:text('→',x+nw+10,2536,32,ORANGE,True)
text('宿主接口：mount / getState / setActive / dispose；全 10 项可导出体验 JSON。各例规则仍独立，并非一个通用生成引擎。',M,2690,30,MUTED)
cols=[M,M+370,M+1420,M+2250,W-M]
table_y=2758
rect(M,table_y,W-2*M,76,GREEN,10)
for x,title in zip(cols[:-1],['项目 / 原作者','本例内部原理','可控输入与当前交付','本例已实现的范围与限制']):text(title,x+24,table_y+22,32,'#ffffff',True)
row_h=224
for i,c in enumerate(cases):
 y=table_y+76+i*row_h;rect(M,y,W-2*M,row_h,'#ffffff' if i%2==0 else '#eaece4')
 text(f'{c["id"]:02d}',cols[0]+24,y+21,43,ORANGE,True)
 text(c['short'],cols[0]+24,y+86,33,INK,True)
 paragraph('@'+c['author'],cols[0]+24,y+141,322,23,MUTED,max_height=68)
 paragraph(c['principle'],cols[1]+24,y+26,cols[2]-cols[1]-48,32,INK,max_height=row_h-40)
 paragraph(c['delivery'],cols[2]+24,y+26,cols[3]-cols[2]-48,32,INK,max_height=row_h-40)
 paragraph(c['boundary'],cols[3]+24,y+26,cols[4]-cols[3]-48,32,MUTED,max_height=row_h-40)
 line(M,y+row_h,W-M,y+row_h,LINE)

# Ten concrete product directions, explicitly proposed rather than current services.
section('04','参考这些能力，我们可以做哪些产品','每一项单独映射产品方向与使用价值；下列新增能力是扩展候选，尚未作为完整服务交付。',5140)
ptop=5278; ph=302
for i,c in enumerate(cases):
 x=M+(i%5)*(card_w+24);y=ptop+(i//5)*(ph+24)
 rect(x,y,card_w,ph,'#fffef9',12,LINE)
 text(f'{c["id"]:02d}  '+c['product'],x+24,y+23,31,BLUE,True)
 paragraph('扩展：'+c['expand'],x+24,y+81,card_w-48,27,MUTED,max_height=80)
 line(x+24,y+161,x+card_w-24,y+161,LINE)
 paragraph(c['value'],x+24,y+184,card_w-48,29,INK,max_height=99)

# Personal value and honest capability envelope.
section('05','对你的价值：从研究成果走到可检查的交付','用真实内容替换模板，先完成一次明确任务，再决定哪些能力值得持续产品化。',5942)
value_y=6080; vw=(W-2*M-3*24)//4
values=[('展示已有研究','01 / 07 把多个成果变为可阅读、可探索的展厅，帮助对外说明项目价值。'),('制作发布内容','03 / 04 / 06 把观点、功能或旋律转成可修改的影片与音画输出。'),('验证产品想法','02 / 05 / 08 / 09 / 10 用实际任务、触碰和规则反馈检查体验，不只看概念。'),('沉淀下一次复用','内容配置、主题、时间表、场景模块与体验记录可成为下一产品的起点。')]
for i,(title,body) in enumerate(values):
 x=M+i*(vw+24);rect(x,value_y,vw,207,'#e0e7dc',12);text(title,x+24,value_y+22,32,GREEN,True);paragraph(body,x+24,value_y+79,vw-48,28,max_height=124)
text('当前范围',M,6336,33,GREEN,True)
paragraph('本地交互原型、分例参数编辑与导出已实现；画质仍不齐、物理与叙事均有限。统一项目导入恢复、账号 / 云保存、多人交互、自动生成 / 云渲染 / 发布与收费运营尚未建立。',M+188,6336,W-2*M-188,29,MUTED,max_height=88)
line(M,6450,W-M,6450,LINE)
text('参考合集：x.com/minchoi/status/2105685231298630009  |  原作媒体归各作者；我们的运行截图与来源记录逐项对应。',M,6482,25,MUTED)
text('记录：notes/case-XX-optimization.json · v16-in-app-verification.json · v16-current-cover-provenance.json  |  CC0 材质 / 扫描资产：Poly Haven。',M,6528,24,MUTED)
text('读取方法：绿色 = 当前运行与机制；蓝色 = 候选扩展；灰色 = 范围与来源。可运行原型不等于原作全量复刻、已验证市场或已上线商业产品。',M,6574,25,MUTED)

assert all(r['x']+r['width']<W-50 for r in text_records),[r for r in text_records if r['x']+r['width']>=W-50]
assert all(r['y']+r['size']<H for r in text_records)
png=OUT/'creative-products-capability-overview-v16.png';svg_path=OUT/'creative-products-capability-overview-v16.svg'
image.save(png,dpi=(300,300),optimize=True)
svg.append('</svg>');svg_path.write_text('\n'.join(svg),encoding='utf-8')
manifest={'title':'十项创意效果库：效果、内部原理、产品方向与对你的价值','revision':16,'date':'2026-10-03','dimensions':{'width':W,'height':H},'method':'Deterministic native text/vector composition and the 10 actual captured runtime frames; no generated replacement screenshots.','files':{'png':str(png),'editableSvg':str(svg_path)},'cases':cases,'frameProvenance':provenance['records'],'sourceClaims':'Original authors mention Opus. 05 also Astra; 09 also Sonnet/Meshy with Three.js. Original internal pipelines remain unknown unless disclosed. Our runtime is an independent implementation, not an Opus service.','textBoxes':len(text_records),'sha256':hashlib.sha256(png.read_bytes()).hexdigest()}
(ROOT/'notes/effect-capability-overview-v16.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'png':str(png),'svg':str(svg_path),'size':[W,H],'textBoxes':len(text_records)},ensure_ascii=False))
