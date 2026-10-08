from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
web=ROOT/'web'
def update(name,old,new):
    path=web/name;text=path.read_text(encoding='utf-8');assert old in text,(name,old);path.write_text(text.replace(old,new),encoding='utf-8')
update('showcase.js','const options={host:ownMount,input,saved,notify,sfx};','const options={host:ownMount,input,saved,notify,sfx,getSound:()=>sound};if([\'duel\',\'maze\',\'rhythm\'].includes(id)){const file={duel:\'./showcase-duel.js\',maze:\'./showcase-maze.js\',rhythm:\'./showcase-rhythm.js\'}[id];factoryModules[id]??=await import(file);return factoryModules[id][{duel:\'createDuel\',maze:\'createMaze\',rhythm:\'createRhythm\'}[id]](options)}')
update('showcase.js',"['ledger','checkpoint','factory','garden'].includes(id)","['ledger','checkpoint','factory','garden','rhythm'].includes(id)")
update('showcase.js',"'coast','expedition','builder','order'","'coast','duel','expedition','builder','order'")
update('showcase.js',"'builder','brawler','coast'].includes(id)","'builder','brawler','coast','duel'].includes(id)")
update('showcase.js',"id==='brawler'?'抓取'","id==='duel'?'踢击':id==='brawler'?'抓取'")
update('showcase.js',"'brawler','skyline'].includes(id)","'brawler','skyline','duel','maze'].includes(id)")
update('showcase.js',"$('#touch-attack').textContent=['range'","$('#touch-attack').textContent=id==='maze'?'脉冲':['range'")
update('showcase.js',"function start(){if(!current)return;started=true;paused=false;","function start(){if(!current)return;if(currentId==='rhythm'&&!sound)$('#play-sound').click();started=true;paused=false;current.onStart?.();")
update('showcase.js',"paused=!paused;input.release();","paused=!paused;input.release();current.setActive?.(!paused&&presentationVisible&&!document.hidden);")
update('showcase.js',"else legacyVisible=null;if(current&&!document.hidden&&presentationVisible)","else legacyVisible=null;if(current){const visibilityRect=mount.getBoundingClientRect();current.setActive?.(started&&!paused&&presentationVisible&&!document.hidden&&visibilityRect.bottom>0&&visibilityRect.top<innerHeight)}if(current&&!document.hidden&&presentationVisible)")
update('showcase.js',"window.addEventListener('pagehide',save);","window.addEventListener('pagehide',()=>{current?.setActive?.(false);save()});")
update('showcase.js',"if(document.hidden){save();audio?.suspend()}","if(document.hidden){current?.setActive?.(false);save();audio?.suspend()}")

new_items=""" item('duel','钟楼试炼','固定竞技场对战格斗','动作','双人侧面','Street Fighter / 街头霸王','https://www.streetfighter.com/6/','assets/game-forms/duel/scene.webp','在钟楼竞技场控制双方距离，以出拳、踢击、防守和跳跃换边进行三局两胜的试炼。','两个原创成年角色、十六种动作姿态、攻击预兆、距离判定、格挡积能、击停、回合与重赛。','A/D 或左右移动 · 空格跳跃 · J 出拳 · E 踢击 · C 防守 · R 满能量破阵'),
 item('maze','霓虹回路','单屏迷宫追逐','动作','固定俯视棋盘','Pac-Man / 吃豆人','https://www.pacman.com/','assets/game-forms/maze/right.webp','在连通迷宫里转弯、收集信号，避开追踪器，获得强化后发起反追。','固定连通地图、转弯缓冲、路线规划、两种追踪器、强化反追、停滞脉冲与保留信号的续玩。','方向键 / WASD 移动 · J / 空格 脉冲 · 点走廊规划路线'),
 item('rhythm','拍点夜航','音乐节奏轨道','动作','透视音符轨道','Taiko no Tatsujin / 太鼓达人','https://www.bandainamcoent.com/games/taiko-no-tatsujin-drum-session','assets/game-forms/rhythm/scene.webp','听原创电子短曲，在三条轨道上打出左拍、右拍与重拍，感受声画同步与连击反馈。','108 BPM 原创短曲、八十个节拍、同一声音时钟、精准/良好/漏拍判定、触屏键、校准与成绩。','D 左拍 · J 右拍 · 空格重拍 · 或点三个打击键 · 开始即开启音乐'),
"""
update('showcase-catalog.js'," item('range'",new_items+" item('range'")
new_forms=""" {id:'versus-fighting',play:'duel',name:'对战格斗',view:'固定竞技场 / 双方同屏',action:'走位 · 出拳 · 踢击 · 格挡',rhythm:'读预兆 → 控距离 → 防守反击',reference:'街头霸王 / Street Fighter',description:'双方固定在同一竞技场，距离、朝向、攻击姿态与攻防节奏是画面的中心。',compare:'对比清版格斗：这里没有街道推进，双方同屏进行回合对抗。',next:'可继续扩展双人对战、不同角色、空中攻防与立体竞技场。'},
 {id:'maze-chase',play:'maze',name:'迷宫追逐',view:'固定单屏 / 俯视通路',action:'转弯 · 收集 · 躲避 · 反追',rhythm:'选通路 → 避追逐 → 强化反追',reference:'吃豆人 / Pac-Man',description:'全部通路同屏可见，转弯和路线选择决定追逐的局势。',compare:'画面中心转向迷宫结构、收集点与追逐路线，不靠人物演出组织场面。',next:'可继续扩展双人迷宫、滚屏地图、移动通路与方向机关。'},
 {id:'rhythm',play:'rhythm',name:'音乐节奏',view:'透视音符轨道 / 判定线',action:'听拍 · 看轨道 · 准时敲击',rhythm:'跟随音乐 → 准时打击 → 连击反馈',reference:'太鼓达人 / Taiko no Tatsujin',description:'音符轨道和歌曲共用声音时钟，操作时机直接形成节奏反馈。',compare:'目光在即将到来的音符与判定线之间移动，声音承担操作节奏。',next:'可继续扩展圆形谱面、鼓点双键、舞步、乐器与轨道变化。'},
"""
update('game-forms-catalog.js'," {id:'top-action'",new_forms+" {id:'top-action'")
update('forms.html','16 种已接入形态','19 种已接入形态')
update('forms.html','016 FORM SAMPLES','019 FORM SAMPLES')
update('forms.html','forms.js?v=2','forms.js?v=3')
for article in ['<article><h3>对战格斗</h3><p>固定竞技场内的距离、攻防、连招与双方对抗。</p></article>','<article><h3>迷宫追逐</h3><p>固定或滚动迷宫、路径拐弯、收集与追逐。</p></article>','<article><h3>节奏</h3><p>音符轨道、节拍与动作时机的直接对应。</p></article>']:update('forms.html',article,'')
update('forms.html','<div class="new-form-entry">','<div class="new-form-entry"><a href="forms.html?left=versus-fighting&amp;right=maze-chase#compare">新增：对战格斗 × 迷宫追逐 ↗</a><a href="forms.html?left=rhythm&amp;right=board#compare">新增：音乐节奏 × 几何益智 ↗</a>')
update('forms.html','新增：格斗 × 飞行','上一批：清版格斗 × 飞行')
update('forms.html','新增：3D 竞速 × 格斗','上一批：3D 竞速 × 清版格斗')
update('showcase.html','十六个扩展试玩','十九个扩展试玩')
update('showcase.html','25 个入口','28 个入口')
update('showcase.html','<b>16</b>','<b>19</b>')
update('showcase.html','showcase.js?v=6','showcase.js?v=7')
for name in ('forms.html','showcase.html'):update(name,'showcase-arcade.css?v=1','showcase-arcade.css?v=2')
css=web/'showcase-arcade.css'
css.write_text(css.read_text(encoding='utf-8')+"""
.rhythm-pads{position:absolute;left:23%;right:23%;bottom:5px;display:flex;justify-content:center;gap:10px;z-index:2}.rhythm-pads button{flex:1;background:#101d35e8;border:1px solid var(--pad-color);color:var(--pad-color);border-radius:8px;min-height:38px;padding:4px 12px;touch-action:none;user-select:none;cursor:pointer}.rhythm-pads b{font:700 17px sans-serif;margin-right:10px}.rhythm-pads span{font-size:11px}.rhythm-pads button.struck{background:var(--pad-color);color:#10203b;box-shadow:0 0 25px var(--pad-color)}.rhythm-pads button:focus-visible{outline:3px solid #fff;outline-offset:2px}
@media(max-width:760px){.rhythm-pads{left:17%;right:17%;gap:5px;bottom:2px}.rhythm-pads button{min-height:29px;padding:2px 4px}.rhythm-pads b{font-size:13px;margin-right:4px}.rhythm-pads span{font-size:9px}}
""",encoding='utf-8')
print('Integrated three new forms and audio pause lifecycle.')
