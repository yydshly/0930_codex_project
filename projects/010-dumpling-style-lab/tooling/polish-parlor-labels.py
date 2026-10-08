from pathlib import Path
P=Path(__file__).resolve().parents[1];f=P/'web/showcase-parlor.js';s=f.read_text(encoding='utf-8')
a="text(c,SUITS[suit]+' 同花归位',x,105,12"
b="text(c,SUITS[suit]+' 归位 '+s.foundations[suit]+'/5',x,105,12"
assert a in s;s=s.replace(a,b)
a="text(c,`${s.foundations[suit]} / 5`,x,v.top+v.h+22,11,'#c5d9d1','center');"
assert a in s;s=s.replace(a,'')
f.write_text(s,encoding='utf-8');print('Moved foundation counts into their headings; tableau labels stay separate')
