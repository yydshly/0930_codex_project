from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'web'
changes={
 'showcase.js':[("['roll','chain','watch']","['roll','chain','watch','cue','prism']"),("watch:'createWatch'","watch:'createWatch',cue:'createCue',prism:'createPrism'"),("['roll','chain','watch','putt'","['roll','chain','watch','cue','prism','putt'"),("20261004-expansion-3","20261004-precision-1"),("showcase-catalog.js?v=20261004-4","showcase-catalog.js?v=20261004-5")],
 'forms.js':[("game-forms-catalog.js?v=20261004-1","game-forms-catalog.js?v=20261004-2"),("showcase-catalog.js?v=20261004-4","showcase-catalog.js?v=20261004-5")],
 'showcase.html':[("四十三个扩展","四十五个扩展"),("52 个入口","54 个入口"),("<b>43</b>","<b>45</b>"),("<b>3</b>本轮新增","<b>2</b>本轮新增"),("showcase.js?v=24","showcase.js?v=25")],
 'forms.html':[("43 种","45 种"),("043 FORM","045 FORM"),("forms.js?v=14","forms.js?v=15"),("本轮新增：惯性滚球","上一批：惯性滚球"),("本轮新增：监控室","上一批：监控室"),("<div class=\"new-form-entry\">","<div class=\"new-form-entry\"><a href=\"forms.html?left=billiards&amp;right=breakout#compare\">本轮新增：台球清台 × 街机打砖块 ↗</a>")]
}
prepared={}
for filename,replacements in changes.items():
 text=(ROOT/filename).read_text(encoding='utf-8')
 for before,after in replacements:
  if before not in text:raise SystemExit(f'Missing expected source in {filename}: {before}')
  text=text.replace(before,after)
 prepared[filename]=text
for filename,text in prepared.items():(ROOT/filename).write_text(text,encoding='utf-8')
print('Integrated cue and prism; catalogs now contain 45 forms and 54 entrances.')
