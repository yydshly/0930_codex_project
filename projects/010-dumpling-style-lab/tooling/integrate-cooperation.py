"""Only update four authorized navigation pages; all existing game code stays untouched."""
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'web'
changes = {
 'directions.html': [
  ('本轮 2 个原创可玩样例', '本轮 3 个原创可玩样例'),
  ('本轮原创试玩有铜谷防线与风湾乐园两个方向。', '本轮原创试玩有铜谷防线、风湾乐园与雾岭同行三个方向。'),
  ('<a href="direction-park.html?demo=1#play">风湾乐园 ↗</a>', '<a href="direction-park.html?demo=1#play">风湾乐园 ↗</a><a href="direction-coop.html?demo=1#play">雾岭同行 ↗</a>'),
  ('<p>DDNet 把合作闯关、地图制作、排名与赛事连接。可以研究互相救援、分享作品和长期挑战。</p><div class="emotion">默契 · 技巧 · 表达 · 分享</div><a href="https://ddnet.org/" target="_blank" rel="noopener noreferrer">DDNet 原作与下载 ↗</a><small>玩家地图 · 合作闯关 · 独立运行</small>', '<p>DDNet 把合作闯关、地图制作与社区挑战连接。新增雾岭同行：开路接应、寒冰救援，并设计能实际试玩的关卡。</p><div class="emotion">默契 · 技巧 · 表达 · 分享</div><a href="direction-coop.html?demo=1#play">试玩本轮「雾岭同行」 →</a><small><a href="https://ddnet.org/" target="_blank" rel="noopener noreferrer">DDNet 官方原作与下载 ↗</a><br>本页新增样例为本地合作与关卡文件分享</small>')
 ],
 'direction-park.html': [
  ('<a href="#play" aria-current="page">风湾乐园</a>', '<a href="#play" aria-current="page">风湾乐园</a><a href="direction-coop.html?demo=1#play">雾岭同行 ↗</a>'),
  ('2 个原创方向实验', '3 个原创方向实验')
 ],
 'references.html': [
  ('2 个新增方向试玩', '3 个新增方向试玩'),
  ('建设防线，或设计一座乐园。', '建设防线、创造乐园，或一起完成挑战。'),
  ('观察游客选择、排队和评价。<br>两个原创短样例', '观察游客选择、排队和评价。<br>雾岭同行：合作开路、寒冰救援、关卡设计与文件分享。<br>三个原创短样例'),
  ('<div class="launch-actions"><a class="button primary" href="direction-park.html?demo=1#play">新增：风湾乐园 · 创造与观赏 →</a>', '<div class="launch-actions"><a class="button primary" href="direction-coop.html?demo=1#play">新增：雾岭同行 · 合作与创作 →</a><a class="button" href="direction-park.html?demo=1#play">风湾乐园 · 创造与观赏 →</a>')
 ],
 'forms.html': [
  ('<a class="reference-launch" href="direction-park.html?demo=1#play">新试玩：主题乐园创造 →</a>', '<a class="reference-launch" href="direction-coop.html?demo=1#play">新试玩：合作闯关 × 关卡创作 →</a>'),
  ('新增铜谷防线与风湾乐园两个原创试玩', '新增铜谷防线、风湾乐园与雾岭同行三个原创试玩'),
  ('<a href="direction-park.html?demo=1#play">风湾乐园 →</a><br>', '<a href="direction-park.html?demo=1#play">风湾乐园 →</a> · <a href="direction-coop.html?demo=1#play">雾岭同行 →</a><br>')
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
print('Integrated cooperation into the four authorized navigation pages')
