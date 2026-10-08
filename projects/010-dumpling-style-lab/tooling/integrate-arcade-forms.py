from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
def edit(name,pairs):
    path=WEB/name
    text=path.read_text(encoding='utf-8')
    for old,new in pairs:
        assert text.count(old)==1,(name,old[:80],text.count(old))
        text=text.replace(old,new)
    path.write_text(text,encoding='utf-8')

catalog=""" item('brawler','夜港清场','街道清版格斗','动作','横版','Final Fight / 快打旋风','https://us-store.captown.capcom.com/products/1340551-us','assets/game-forms/brawler/street.webp','在带纵深的街道上走位，用直拳、勾拳、踢击与抓取击退围来的对手。','三段街道、七名对手、三段连击、跳击、闪避、抓取投掷与重拳预兆。','WASD / 方向键走位 · J 连击 · 空格跳跃 · C 闪避 · E 抓取'),
 item('skyline','群岛航线','纵向飞行射击','动作','纵向','1942','https://news.capcomusa.com/2021/05/25/capcom-arcade-stadium-is-available-now-for-playstation-4-xbox-one-nintendo-switch-and-steam/','assets/game-forms/skyline/ocean.webp','穿过群岛航路，躲开敌机编队与扇形弹道，取得补给并击退大型守关机。','竖向滚动航路、八轮编队、倾斜驾驶、双路/三路火力、冲击波、补给与守关机。','WASD / 方向键或拖动驾驶 · 默认自动射击 · 空格 / C 冲击波'),
 item('coast','海岸疾驰','真实三维竞速','空间','车后 / 车头','Out Run','https://segaages.sega.com/project/out-run/index.htm','assets/game-forms/coast/raceCarOrange.glb','沿海岸弯道驾驶，借助加速能量超越其他车辆，在车后与车头镜头间切换。','1.80公里弯道、真实三维模型、四辆同行车、超车、碰撞、离路减速、赛段记录与双镜头。','W / ↑ 加速 · S / ↓ 刹车 · A/D 转向 · 空格加速推进 · E 切换镜头'),
"""
edit('showcase-catalog.js',[(" item('range'",catalog+" item('range'")])
forms=""" {id:'beat-em-up',play:'brawler',name:'清版格斗',view:'侧面街道 / 前后纵深',action:'走位 · 连击 · 跳击 · 抓取',rhythm:'靠近对齐 → 连击击退 → 清场推进',reference:'快打旋风 / Final Fight',description:'街道有前后纵深，近身距离、攻击姿态和敌人围攻组织场面。',compare:'看前后走位、近身连击与击退，和远距离射击如何不同。',next:'可继续扩展双人协作、武器拾取、交互场景与更多动作。'},
 {id:'vertical-shooter',play:'skyline',name:'纵向飞行射击',view:'竖向航路 / 俯视飞机',action:'驾驶 · 闪避 · 射击 · 冲击波',rhythm:'看编队 → 穿过弹道 → 击退守关机',reference:'1942',description:'飞机在持续向前滚动的航路里穿过编队，弹道、火力和移动轨迹构成画面。',compare:'看竖向场面推进、飞机倾斜、弹道间隙与全屏冲击波。',next:'可继续扩展横向飞行、弹幕模式、双机协作与不同航路。'},
 {id:'racing',play:'coast',name:'三维竞速',view:'车后追踪 / 车头镜头',action:'加速 · 刹车 · 转向 · 超越',rhythm:'看弯道 → 调整方向 → 加速超车',reference:'Out Run',description:'道路不断向远处展开，车辆速度与镜头位移直接对应。',compare:'看真实三维弯道、远处车辆、超越与车头镜头带来的速度感。',next:'可继续扩展俯视赛车、驾驶舱、漂移赛道与多车比赛。'},
"""
edit('game-forms-catalog.js',[(" {id:'top-action'",forms+" {id:'top-action'")])
engine="if(kind==='engine'||kind==='engineBoost'){const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain(),f=audio.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(48+Math.max(0,pitch)*1.3,t);f.type='lowpass';f.frequency.value=kind==='engineBoost'?650:350;g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.014,t+.045);g.gain.linearRampToValueAtTime(.001,t+.3);o.connect(f);f.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.31);return}"
edit('showcase.js',[
 ("function sfx(kind){if(!sound||!audio)return;","function sfx(kind,pitch=0){if(!sound||!audio)return;"+engine),
 ("if(id==='breach'){", "if(['brawler','skyline','coast'].includes(id)){const module={brawler:'./showcase-brawler.js',skyline:'./showcase-flight.js',coast:'./showcase-racing.js'}[id];factoryModules[id]??=await import(module);return factoryModules[id][{brawler:'createBrawler',skyline:'createFlight',coast:'createRacing'}[id]](options)}if(id==='breach'){"),
 ("['afterdark','hunter','wonder','breach','expedition','builder','order'].includes(id)","['afterdark','hunter','wonder','breach','brawler','skyline','coast','expedition','builder','order'].includes(id)"),
 ("id==='hunter'?'闪避':id==='order'?'落底':'跳跃'","id==='hunter'?'闪避':id==='order'?'落底':id==='skyline'?'冲击波':id==='coast'?'加速':'跳跃'"),
 ("['afterdark','station','expedition','builder'].includes(id);$('#touch-attack')","['afterdark','station','expedition','builder','brawler','coast'].includes(id);$('#touch-interact').textContent=id==='brawler'?'抓取':id==='coast'?'镜头':'互动';$('#touch-attack')"),
 ("['hunter','range','breach'].includes(id)","['hunter','range','breach','brawler','skyline'].includes(id)"),
 ("['range','breach'].includes(id)?'开火'","['range','breach','skyline'].includes(id)?'开火'")
])
edit('showcase-racing.js',[
 ("sfx(boosting?'engineBoost':'engine');engineTick=.28", "sfx(boosting?'engineBoost':'engine',s.speed);engineTick=.22"),
 ("draw:()=>{syncWorld();renderer.render(scene,camera)}", "draw:()=>{if(!viewReady)syncWorld();renderer.render(scene,camera)}")
])
edit('showcase.html',[
 ('再从十三个扩展试玩里','再从十六个扩展试玩里'),('浏览全部 22 个入口','浏览全部 25 个入口'),('<b>13</b>扩展方向','<b>16</b>扩展方向'),('<b>7</b>视角与界面','<b>9</b>视角与界面'),('id="collection-count">22 个入口','id="collection-count">25 个入口'),
 ('href="showcase-presentation.css?v=1"></head>','href="showcase-presentation.css?v=1"><link rel="stylesheet" href="showcase-arcade.css?v=1"></head>'),('src="showcase.js?v=5"','src="showcase.js?v=6"')
])
entry='<div class="new-form-entry"><a href="forms.html?left=beat-em-up&amp;right=vertical-shooter#compare">新增：格斗 × 飞行，并列试玩 ↗</a><a href="forms.html?left=racing&amp;right=beat-em-up#compare">新增：3D 竞速 × 格斗 ↗</a></div>'
edit('forms.html',[
 ('href="forms.css?v=1"></head>','href="forms.css?v=1"><link rel="stylesheet" href="showcase-arcade.css?v=1"></head>'),
 ('<span>13 种已接入形态</span>','<span>16 种已接入形态</span>'),('</div></section>\n<section class="comparison"','</div>'+entry+'</section>\n<section class="comparison"'),
 ('<article><h3>清版格斗</h3><p>侧面场景里前后走位、连击、抓取与清场。</p></article>',''),
 ('<article><h3>纵向飞行射击</h3><p>向前滚动的航路、飞机移动与密集弹道。</p></article>',''),
 ('<article><h3>竞速</h3><p>第三人称或俯视赛道、转向、速度与超越。</p></article>',''),
 ('013 FORM SAMPLES','016 FORM SAMPLES'),('src="forms.js?v=1"','src="forms.js?v=2"')
])
print('Integrated three real games, 16 playable forms and 25 gallery entries.')
