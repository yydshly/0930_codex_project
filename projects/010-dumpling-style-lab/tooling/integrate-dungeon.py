"""Extend only the seven authorized navigation pages; retain every prior sample."""
from pathlib import Path

web = Path(__file__).resolve().parents[1] / 'web'
entry = '<a href="direction-dungeon.html?demo=1#play">深岩堡垒 ↗</a>'
changes = {
 'directions.html': [
  ('本轮 5 个原创可玩样例', '本轮 6 个原创可玩样例'),
  ('本轮原创试玩有铜谷防线、风湾乐园、雾岭同行、夜航值守与湾岸货运五个方向。', '本轮原创试玩有铜谷防线、风湾乐园、雾岭同行、夜航值守、湾岸货运与深岩堡垒六个方向。'),
  ('<p><a href="direction-freight.html?demo=1#play">新体验：湾岸货运 · 交通网络经营 →</a></p>', '<p><a href="direction-dungeon.html?demo=1#play">新体验：深岩堡垒 · 地下城经营与角色附身 →</a></p>'),
  ('<article class="direction-card"><span class="index">08 / 地下城经营与附身</span><h3>进入自己设计的空间</h3><p>在管理者和具体角色之间切换，研究规划与直接操控怎样相互影响。</p><a href="https://keeperfx.net/" target="_blank" rel="noopener noreferrer">KeeperFX 原作说明 · 需原游戏数据 ↗</a></article>', '<article class="direction-card featured"><span class="index">08 / 地下城经营与附身</span><h3>进入自己设计的空间</h3><p>新增深岩堡垒：挖掘通路、规划房间、安排角色，再附身进入自己设计的地下城。比较管理视角与角色视角怎样改变空间感受。</p><div class="emotion">掌控 · 营造 · 附身 · 沉浸</div><a href="direction-dungeon.html?demo=1#play">试玩本轮「深岩堡垒」 →</a><small><a href="https://keeperfx.net/" target="_blank" rel="noopener noreferrer">KeeperFX 原作说明 · 需原游戏数据 ↗</a><br>新增样例为原创本地地下城体验</small></article>')
 ],
 'direction-park.html': [
  ('5 个原创方向实验', '6 个原创方向实验')
 ],
 'direction-coop.html': [
  ('FIVE DIFFERENT REASONS TO PLAY', 'SIX DIFFERENT REASONS TO PLAY'),
  ('建造系统、设计场所、并肩挑战、共同值守，再连接整个地区。', '建造系统、设计场所、并肩挑战、共同值守、连接地区，再进入自己的地下城。'),
  ('五个原创方向各自保存进度', '六个原创方向各自保存进度'),
  ('<a href="directions.html#directions">十条方向地图 →</a>', '<a href="direction-dungeon.html?demo=1#play">深岩堡垒 · 经营与附身 →</a><a href="directions.html#directions">十条方向地图 →</a>'),
  ('5 个原创方向样例', '6 个原创方向样例')
 ],
 'direction-shift.html': [
  ('FIVE DIFFERENT REASONS TO PLAY', 'SIX DIFFERENT REASONS TO PLAY'),
  ('生产、创造、同行、共同值守，以及连接地区。', '生产、创造、同行、共同值守、连接地区，以及进入地下城。'),
  ('五个原创方向样例分别保存', '六个原创方向样例分别保存'),
  ('<a href="directions.html#directions">十条方向地图 →</a>', '<a href="direction-dungeon.html?demo=1#play">深岩堡垒 · 经营与附身 →</a><a href="directions.html#directions">十条方向地图 →</a>'),
  ('5 个原创方向样例', '6 个原创方向样例')
 ],
 'direction-freight.html': [
  ('FIVE DIFFERENT REASONS TO PLAY', 'SIX DIFFERENT REASONS TO PLAY'),
  ('建设、创造、同行、值守，以及连接。', '建设、创造、同行、值守、连接，以及附身。'),
  ('五个原创方向分别保存', '六个原创方向分别保存'),
  ('<a href="directions.html#directions">十条方向地图 →</a>', '<a href="direction-dungeon.html?demo=1#play">深岩堡垒 · 经营与附身 →</a><a href="directions.html#directions">十条方向地图 →</a>'),
  ('5 个原创方向样例', '6 个原创方向样例')
 ],
 'references.html': [
  ('5 个新增方向试玩', '6 个新增方向试玩'),
  ('NEW / FIVE REASONS TO PLAY', 'NEW / SIX REASONS TO PLAY'),
  ('建设、创造、并肩挑战、共同值守，以及连接。', '建设、创造、并肩挑战、共同值守、连接，以及附身。'),
  ('五个原创短样例可独立试玩', '深岩堡垒：地下城经营、通路挖掘与角色附身。<br>六个原创短样例可独立试玩'),
  ('<div class="launch-actions"><a class="button primary" href="direction-freight.html?demo=1#play">新增：湾岸货运 · 交通网络经营 →</a>', '<div class="launch-actions"><a class="button primary" href="direction-dungeon.html?demo=1#play">新增：深岩堡垒 · 地下城经营与角色附身 →</a><a class="button" href="direction-freight.html?demo=1#play">湾岸货运 · 交通网络经营 →</a>')
 ],
 'forms.html': [
  ('<a class="reference-launch" href="direction-freight.html?demo=1#play">新试玩：交通网络 × 中转接驳 →</a>', '<a class="reference-launch" href="direction-dungeon.html?demo=1#play">新试玩：地下城经营 × 角色附身 →</a>'),
  ('新增铜谷防线、风湾乐园、雾岭同行、夜航值守与湾岸货运五个原创试玩', '新增铜谷防线、风湾乐园、雾岭同行、夜航值守、湾岸货运与深岩堡垒六个原创试玩'),
  ('<a href="direction-freight.html?demo=1#play">湾岸货运 →</a><br>', '<a href="direction-freight.html?demo=1#play">湾岸货运 →</a> · <a href="direction-dungeon.html?demo=1#play">深岩堡垒 →</a><br>')
 ]
}

# Validate the entire edit first. Keep original newlines and do not touch runtime files.
prepared = {}
for name, pairs in changes.items():
 with (web / name).open('r', encoding='utf-8', newline='') as f:
  text = f.read()
 for old, new in pairs:
  if new in text:
   continue
  if text.count(old) != 1:
   raise ValueError((name, old, text.count(old)))
  text = text.replace(old, new)
 header_end = text.index('</header>')
 if entry not in text[:header_end]:
  nav_end = text.index('</nav>')
  if nav_end > header_end:
   raise ValueError((name, 'missing header navigation'))
  text = text[:nav_end] + entry + text[nav_end:]
 prepared[name] = text
for name, text in prepared.items():
 with (web / name).open('w', encoding='utf-8', newline='') as f:
  f.write(text)
print('Sixth sample integrated into seven authorized navigation pages; earlier ordinals retained')
