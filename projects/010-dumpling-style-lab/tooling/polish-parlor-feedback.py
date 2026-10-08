from pathlib import Path
P=Path(__file__).resolve().parents[1]
f=P/'web/showcase-parlor-kit.js';s=f.read_text(encoding='utf-8')
changes=[
 ("s.running?'持续下落':s.failed?'堆叠到顶':'准备开始'","s.won?'消行完成':s.running?'持续下落':s.failed?'堆叠到顶':'准备开始'"),
 ("if(ok&&!['draft','letter','delete','move','down','select'].includes(actual))sfx('turn');","if(ok&&!['draft','letter','delete','down','select'].includes(actual)&&!(id==='cascade'&&actual==='move'))sfx('turn');"),
 ("if(pressed.has('KeyQ'))run('rotate',-1);if(pressed.has('ShiftLeft')||pressed.has('ShiftRight'))run('hold');","")]
for a,b in changes:
 assert a in s,a;s=s.replace(a,b)
f.write_text(s,encoding='utf-8')
f=P/'web/showcase-parlor-rules.js';s=f.read_text(encoding='utf-8')
a="  if(k==='undo'&&s.history.length)"
b="  if(k==='move'&&!ok)s.message=!selectedCards(s).length?'先选一张明牌，或一组相连的明牌。':v?.type==='foundation'?'归位区要按同花 A、2、3、4、5 依次放入单张牌。':'叠牌要红黑交替、点数递减；空列从 5 开始。';\n"+a
assert a in s;s=s.replace(a,b);f.write_text(s,encoding='utf-8')
print('Polished completion status, card move feedback and keyboard event ownership')
