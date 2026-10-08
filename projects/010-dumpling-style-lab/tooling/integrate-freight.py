"""Only extend the six authorized navigation HTML pages, preserving all previous games."""
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'web'
entry = '<a href="direction-freight.html?demo=1#play">湾岸货运 ↗</a>'
changes = {
 'directions.html': [
  ('本轮 4 个原创可玩样例', '本轮 5 个原创可玩样例'),
  ('本轮原创试玩有铜谷防线、风湾乐园、雾岭同行与夜航值守四个方向。', '本轮原创试玩有铜谷防线、风湾乐园、雾岭同行、夜航值守与湾岸货运五个方向。'),
  ('<a href="direction-shift.html?demo=1#play">夜航值守 ↗</a>', '<a href="direction-shift.html?demo=1#play">夜航值守 ↗</a>' + entry),
  ('<p><a href="direction-shift.html?demo=1#play">新体验：夜航值守 · 职业协作与事件 →</a></p>', '<p><a href="direction-freight.html?demo=1#play">新体验：湾岸货运 · 交通网络经营 →</a></p>'),
  ('<article class="direction-card"><span class="index">05 / 交通网络经营</span><h3>让整个世界连起来</h3><p>由单点调度扩展到运输网络与公司经营，观察布局怎样影响效率。</p><a href="https://www.openttd.org/about" target="_blank" rel="noopener noreferrer">OpenTTD 官方介绍与入口 ↗</a></article>', '<article class="direction-card featured"><span class="index">05 / 交通网络经营</span><h3>让整个世界连起来</h3><p>由单点调度扩展到地区运输网络。新增湾岸货运：连路建桥、组织车队，将原木加工成建材，并通过中转接驳运送补给。</p><div class="emotion">规划 · 连接 · 运转 · 成就</div><a href="direction-freight.html?demo=1#play">试玩本轮「湾岸货运」 →</a><small><a href="https://www.openttd.org/about" target="_blank" rel="noopener noreferrer">OpenTTD 官方介绍与入口 ↗</a><br>新增样例为原创本地公路货运网络</small></article>')
 ],
 'direction-park.html': [
  ('<a href="direction-shift.html?demo=1#play">夜航值守 ↗</a>', '<a href="direction-shift.html?demo=1#play">夜航值守 ↗</a>' + entry),
  ('4 个原创方向实验', '5 个原创方向实验')
 ],
 'direction-coop.html': [
  ('<a href="direction-shift.html?demo=1#play">夜航值守 ↗</a>', '<a href="direction-shift.html?demo=1#play">夜航值守 ↗</a>' + entry),
  ('FOUR DIFFERENT REASONS TO PLAY', 'FIVE DIFFERENT REASONS TO PLAY'),
  ('建造系统、设计场所、并肩挑战，或共同值守。', '建造系统、设计场所、并肩挑战、共同值守，再连接整个地区。'),
  ('四个原创方向各自保存进度', '五个原创方向各自保存进度'),
  ('<a href="direction-shift.html?demo=1#play">夜航值守 · 职业协作 →</a>', '<a href="direction-shift.html?demo=1#play">夜航值守 · 职业协作 →</a><a href="direction-freight.html?demo=1#play">湾岸货运 · 网络经营 →</a>'),
  ('<span>010 / WORLD & PLAY · 4 个原创方向样例', '<span>010 / WORLD & PLAY · 5 个原创方向样例')
 ],
 'direction-shift.html': [
  ('<a href="direction-coop.html#play">雾岭同行</a>', '<a href="direction-coop.html#play">雾岭同行</a>' + entry),
  ('FOUR DIFFERENT REASONS TO PLAY', 'FIVE DIFFERENT REASONS TO PLAY'),
  ('生产、创造、同行，以及共同值守。', '生产、创造、同行、共同值守，以及连接地区。'),
  ('四个原创方向样例分别保存', '五个原创方向样例分别保存'),
  ('<a href="direction-coop.html#play">雾岭同行 · 并肩闯关 →</a>', '<a href="direction-coop.html#play">雾岭同行 · 并肩闯关 →</a><a href="direction-freight.html?demo=1#play">湾岸货运 · 网络经营 →</a>'),
  ('<span>010 / WORLD & PLAY · 4 个原创方向样例', '<span>010 / WORLD & PLAY · 5 个原创方向样例')
 ],
 'references.html': [
  ('4 个新增方向试玩', '5 个新增方向试玩'),
  ('NEW / FOUR REASONS TO PLAY', 'NEW / FIVE REASONS TO PLAY'),
  ('建设、创造、并肩挑战，以及共同值守。', '建设、创造、并肩挑战、共同值守，以及连接。'),
  ('四个原创短样例可独立试玩', '湾岸货运：连路建桥、地区货运、加工与中转接驳。<br>五个原创短样例可独立试玩'),
  ('<div class="launch-actions"><a class="button primary" href="direction-shift.html?demo=1#play">新增：夜航值守 · 职业协作与事件 →</a>', '<div class="launch-actions"><a class="button primary" href="direction-freight.html?demo=1#play">新增：湾岸货运 · 交通网络经营 →</a><a class="button" href="direction-shift.html?demo=1#play">夜航值守 · 职业协作与事件 →</a>')
 ],
 'forms.html': [
  ('<a class="reference-launch" href="direction-shift.html?demo=1#play">新试玩：职业协作 × 系统事件 →</a>', '<a class="reference-launch" href="direction-freight.html?demo=1#play">新试玩：交通网络 × 中转接驳 →</a>'),
  ('新增铜谷防线、风湾乐园、雾岭同行与夜航值守四个原创试玩', '新增铜谷防线、风湾乐园、雾岭同行、夜航值守与湾岸货运五个原创试玩'),
  ('<a href="direction-shift.html?demo=1#play">夜航值守 →</a><br>', '<a href="direction-shift.html?demo=1#play">夜航值守 →</a> · <a href="direction-freight.html?demo=1#play">湾岸货运 →</a><br>')
 ]
}
for name, pairs in changes.items():
 file = p / name
 with file.open('r', encoding='utf-8', newline='') as f:
  text = f.read()
 for old, new in pairs:
  if new in text:
   continue
  if text.count(old) != 1:
   raise ValueError((name, old, text.count(old)))
  text = text.replace(old, new)
 with file.open('w', encoding='utf-8', newline='') as f:
  f.write(text)
print('Fifth sample integrated into six authorized navigation pages')
