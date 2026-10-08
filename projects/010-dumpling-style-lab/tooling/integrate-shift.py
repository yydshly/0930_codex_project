"""Connect the fourth sample through the five authorized navigation pages."""
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'web'
new = '<a href="direction-shift.html?demo=1#play">夜航值守 ↗</a>'
changes = {
 'directions.html': [
  ('本轮 3 个原创可玩样例', '本轮 4 个原创可玩样例'),
  ('本轮原创试玩有铜谷防线、风湾乐园与雾岭同行三个方向。', '本轮原创试玩有铜谷防线、风湾乐园、雾岭同行与夜航值守四个方向。'),
  ('<a href="direction-coop.html?demo=1#play">雾岭同行 ↗</a>', '<a href="direction-coop.html?demo=1#play">雾岭同行 ↗</a>' + new),
  ('<p><a href="direction-park.html?demo=1#play">新体验：风湾乐园 · 主题乐园创造 →</a></p>', '<p><a href="direction-shift.html?demo=1#play">新体验：夜航值守 · 职业协作与事件 →</a></p>'),
  ('<p>参考 Space Station 14 的职业分工和设施系统。不同玩家各司其职，灾难与行动共同产生故事。</p><div class="emotion">依赖 · 信任 · 混乱 · 救援</div><a href="https://store.steampowered.com/app/1255460/Space_Station_14/" target="_blank" rel="noopener noreferrer">原作介绍与 Playtest 申请 ↗</a><small>Space Station 14 · 独立运行</small>', '<p>参考 Space Station 14 的职业分工和设施系统。新增夜航值守：切换工程、医护与调度，让并行工作共同完成一次站点救援。</p><div class="emotion">依赖 · 信任 · 意外 · 救援</div><a href="direction-shift.html?demo=1#play">试玩本轮「夜航值守」 →</a><small><a href="https://spacestation14.com/" target="_blank" rel="noopener noreferrer">Space Station 14 官方介绍 ↗</a><br><a href="https://store.steampowered.com/app/1255460/Space_Station_14/" target="_blank" rel="noopener noreferrer">原作 Playtest 申请 ↗</a><br>新增样例为本地三角色切换，原作独立运行</small>')
 ],
 'direction-park.html': [
  ('<a href="direction-coop.html?demo=1#play">雾岭同行 ↗</a>', '<a href="direction-coop.html?demo=1#play">雾岭同行 ↗</a>' + new),
  ('3 个原创方向实验', '4 个原创方向实验')
 ],
 'direction-coop.html': [
  ('<a href="#play" aria-current="page">雾岭同行</a>', '<a href="#play" aria-current="page">雾岭同行</a>' + new),
  ('THREE DIFFERENT REASONS TO PLAY', 'FOUR DIFFERENT REASONS TO PLAY'),
  ('建造系统、设计场所，或一起完成挑战。', '建造系统、设计场所、并肩挑战，或共同值守。'),
  ('三个原创方向各自保存进度', '四个原创方向各自保存进度'),
  ('<a href="direction-park.html#play">风湾乐园 · 创造与观赏 →</a>', '<a href="direction-park.html#play">风湾乐园 · 创造与观赏 →</a><a href="direction-shift.html?demo=1#play">夜航值守 · 职业协作 →</a>'),
  ('<span>010 / WORLD & PLAY · 3 个原创方向样例', '<span>010 / WORLD & PLAY · 4 个原创方向样例')
 ],
 'references.html': [
  ('3 个新增方向试玩', '4 个新增方向试玩'),
  ('NEW / TWO WAYS TO CREATE', 'NEW / FOUR REASONS TO PLAY'),
  ('建设防线、创造乐园，或一起完成挑战。', '建设、创造、并肩挑战，以及共同值守。'),
  ('三个原创短样例可独立试玩', '夜航值守：三职业并行、系统依赖与全员撤离。<br>四个原创短样例可独立试玩'),
  ('<div class="launch-actions"><a class="button primary" href="direction-coop.html?demo=1#play">新增：雾岭同行 · 合作与创作 →</a>', '<div class="launch-actions"><a class="button primary" href="direction-shift.html?demo=1#play">新增：夜航值守 · 职业协作与事件 →</a><a class="button" href="direction-coop.html?demo=1#play">雾岭同行 · 合作与创作 →</a>')
 ],
 'forms.html': [
  ('<a class="reference-launch" href="direction-coop.html?demo=1#play">新试玩：合作闯关 × 关卡创作 →</a>', '<a class="reference-launch" href="direction-shift.html?demo=1#play">新试玩：职业协作 × 系统事件 →</a>'),
  ('新增铜谷防线、风湾乐园与雾岭同行三个原创试玩', '新增铜谷防线、风湾乐园、雾岭同行与夜航值守四个原创试玩'),
  ('<a href="direction-coop.html?demo=1#play">雾岭同行 →</a><br>', '<a href="direction-coop.html?demo=1#play">雾岭同行 →</a> · <a href="direction-shift.html?demo=1#play">夜航值守 →</a><br>')
 ]
}
for name, pairs in changes.items():
 file = p / name
 with file.open('r', encoding='utf-8', newline='') as f:
  text = f.read()
 for old, replacement in pairs:
  if replacement in text:
   continue
  if text.count(old) != 1:
   raise ValueError((name, old, text.count(old)))
  text = text.replace(old, replacement)
 with file.open('w', encoding='utf-8', newline='') as f:
  f.write(text)
print('Fourth sample integrated into five authorized navigation pages')
