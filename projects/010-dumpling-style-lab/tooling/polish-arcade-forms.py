from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
restarts={
 'showcase-brawler.js':(" function hurt()", " function restart(){Object.assign(s,structuredClone(defaults));s.enemies=enemies();camera=0;attack=null;attackCD=comboWindow=invulnerable=dodgeTime=dodgeCD=hitStop=shake=hurtPose=throwPose=0;particles.length=0;stageBanner=2;notify('新的清场开始了，先看对手走在哪条路面上。')}\n function hurt()", "s.won?[]:[action('连击", "s.won?[action('再清场一次',restart)]:[action('连击"),
 'showcase-flight.js':(" function hurt()", " function restart(){Object.assign(s,structuredClone(defaults));shootCD=invulnerable=shock=shake=0;target=null;bullets.length=hostile.length=particles.length=0;notify('新的航路开始了，留意编队和补给。')}\n function hurt()", "s.won?[]:[action('冲击波", "s.won?[action('再飞一次',restart)]:[action('冲击波"),
 'showcase-racing.js':(" function tick(dt)", " function restart(){Object.assign(s,structuredClone(defaults));hitCD=boostLatch=shake=engineTick=lastStage=0;viewReady=false;syncWorld();notify('新的海岸赛段开始了，按住 W 或向前加速。')}\n function tick(dt)", "s.won?[]:[action('加速推进", "s.won?[action('再跑一次',restart)]:[action('加速推进")
}
for name,(old,new,old_action,new_action) in restarts.items():
    path=WEB/name;s=path.read_text(encoding='utf-8');assert s.count(old)==1 and s.count(old_action)==1,name
    path.write_text(s.replace(old,new).replace(old_action,new_action),encoding='utf-8')
p=WEB/'index.html';s=p.read_text(encoding='utf-8');s=s.replace('十二种新方向，亲手走进去。','十六种游戏形态，亲手体验。').replace('进入 21 个试玩入口','进入 25 个试玩入口');s=s.replace('再探索平台跳跃、射击、立体冒险、建造、经营和自动化。原有九款继续保留。','再体验清版格斗、纵向飞行射击与三维竞速，以及平台、建造、经营和自动化。原有九款继续保留。');p.write_text(s,encoding='utf-8')
p=ROOT/'README.md';s=p.read_text(encoding='utf-8');intro='''2026-10-03 本轮新增 **清版格斗、纵向飞行射击、真实三维竞速**：夜港清场、群岛航线、海岸疾驰。展厅共 25 个入口，形态对照页有 16 种实际可玩形态，待制作区剩余 9 种。原有游戏、美术画风与存档保留。

[格斗 × 飞行并列试玩](http://127.0.0.1:8962/forms.html?left=beat-em-up&right=vertical-shooter#compare) · [三维竞速 × 格斗](http://127.0.0.1:8962/forms.html?left=racing&right=beat-em-up#compare) · [新增内容、素材与范围](notes/arcade-forms-20261003.md) · [真实操作验证](notes/arcade-forms-check-20261003.json)

''';p.write_text(intro+s,encoding='utf-8')
from PIL import Image
for name in ['brawler','skyline','coast']:
    im=Image.open(ROOT/('assets/game-forms/arcade-qa/'+name+'-playable.png')).convert('RGB')
    im.resize((960,540),Image.Resampling.LANCZOS).save(WEB/('assets/showcase/previews/'+name+'.webp'),quality=94,method=4)
print('Replay actions, current counts, and actual playable previews updated.')
