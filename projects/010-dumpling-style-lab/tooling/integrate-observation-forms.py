from pathlib import Path
import shutil
R=Path(__file__).resolve().parents[1]
changes={}
def read(name):
    if name not in changes:changes[name]=(R/'web'/name).read_text(encoding='utf-8')
    return changes[name]
def replace(name,old,new):
    text=read(name)
    assert old in text,(name,old)
    changes[name]=text.replace(old,new)
replace('showcase.js',"['roll','chain','watch','cue','prism']","['roll','chain','watch','cue','prism','seek','conduit']")
replace('showcase.js',"cue:'createCue',prism:'createPrism'","cue:'createCue',prism:'createPrism',seek:'createSeek',conduit:'createConduit'")
replace('showcase.js',"'roll','chain','watch','cue','prism','putt'","'roll','chain','watch','cue','prism','seek','conduit','putt'")
replace('showcase.js','showcase-catalog.js?v=20261004-5','showcase-catalog.js?v=20261004-6')
replace('forms.js','showcase-catalog.js?v=20261004-5','showcase-catalog.js?v=20261004-6')
replace('forms.js','game-forms-catalog.js?v=20261004-2','game-forms-catalog.js?v=20261004-3')
replace('showcase-catalog.js',"for(const direction of newDirections)if(!['roll','chain','watch','cue','prism'].includes(direction.id))",'''newDirections.push(
 item('seek','海岸藏物阁','可放大场景寻物','故事','完整房间 / 局部放大','场景寻物 / 观察与定位','forms.html?left=hidden-object&right=point-click#compare','assets/game-forms/seek/preview.webp','在夕照下的收藏温室寻找八件真实画在房间中的藏物。放大、拖动和局部提示帮助你在精细场景里辨认它们。','八件实际场景物件、对应缩略图清单、逐件标记、1–2.4 倍缩放与拖动、三次位置提示、完成归档与独立保存。','点击场景物件 · 选择清单目标 · 放大后拖动 / 方向键平移 · 滚轮缩放'),
 item('conduit','铜潮管网','旋转线路接通','策略','固定装置 / 接口网络','管线旋转 / 连通与输送','forms.html?left=pipe-network&right=train-dispatch#compare','assets/game-forms/conduit/preview.webp','转动铜管装置，让接口逐段吻合。启动水泵后观察水流沿实际线路通过，查找断口，恢复港口与灯塔的供水。','两套可解管网、材质铜管零件、接口匹配与连通预览、旋转和撤销、逐段水流、断口定位、键盘选格与独立保存。','点铜管旋转 · 方向键 / 下方按钮选格 · 空格旋转 · 启动水泵 / E · C 撤销')
);
for(const direction of newDirections)if(!['roll','chain','watch','cue','prism','seek','conduit'].includes(direction.id))''')
replace('game-forms-catalog.js','export const gameFormMap=', '''gameForms.push(
 {id:'hidden-object',play:'seek',name:'场景寻物',view:'完整场景 / 放大与平移',action:'观察 · 放大 · 定位 · 标记',rhythm:'辨认清单 → 扫视场景 → 找到真实物件',reference:'场景寻物 / Hidden-object',description:'整个房间都是观察对象；清单里的物件真实存在于画面中，放大和平移帮助辨认细节。',compare:'对比点击冒险的道具组合：这里直接用观察找齐清单，找到后物件留下标记，房间不切换。',next:'可扩展全景滚动、层叠透视、剪影清单、差异对照与多场景寻物。'},
 {id:'pipe-network',play:'conduit',name:'旋转管线接通',view:'固定装置 / 接口网格',action:'选格 · 旋转 · 接通 · 输送',rhythm:'看接口 → 调整方向 → 观察水流到达',reference:'管线旋转 / Connection puzzle',description:'旋转改变每片管道的两端接口，实际接通的线路决定水流能走到哪里；断口也直接显示。',compare:'对比铁路调度的移动列车：这里先修改静态接口网络，再启动水流验证整条连接。',next:'可扩展多色输送、分流阀、压力高差、六角管网与电路信号。'}
);
export const gameFormMap=''')
replace('forms.html','45 种','47 种')
replace('forms.html','045 FORM SAMPLES','047 FORM SAMPLES')
replace('forms.html','<div class="new-form-entry">','<div class="new-form-entry"><a href="forms.html?left=hidden-object&amp;right=pipe-network#compare">本轮新增：场景寻物 × 旋转管线 ↗</a>')
replace('forms.html','本轮新增：台球清台','上一批：台球清台')
replace('forms.html','forms.js?v=15','forms.js?v=16')
replace('showcase.html','四十五个','四十七个')
replace('showcase.html','54 个入口','56 个入口')
replace('showcase.html','<b>45</b>','<b>47</b>')
replace('showcase.html','showcase.js?v=25','showcase.js?v=26')
for name,text in changes.items():(R/'web'/name).write_text(text,encoding='utf-8')
for module,art in [('seek','room'),('conduit','cabinet')]:
    shutil.copy2(R/f'web/assets/game-forms/{module}/{art}.webp',R/f'web/assets/game-forms/{module}/preview.webp')
    (R/f'web/assets/game-forms/{module}/ATTRIBUTION.md').write_text('原创素材由内置 ImageGen 生成，保留原始 PNG 与提示词。来源及哈希见项目 assets/game-forms/observation-generation-20261004.json。runtime 仅编码为 WebP。preview 将由实际浏览器试玩截图生成。\n',encoding='utf-8')
print('Integrated two forms across six intentional shared files')
