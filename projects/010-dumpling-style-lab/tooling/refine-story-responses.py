from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
def edit(name,changes):
 p=root/name;s=p.read_text(encoding='utf-8')
 for a,b in changes:
  assert a in s,(name,a[:100]);s=s.replace(a,b,1)
 p.write_text(s,encoding='utf-8')
edit('games/inn.js',[("journal:[...journal,...state.letters],complete", "journal,letters:state.letters.slice(),complete")])
edit('worlds-interface.js',[("else{body.append(el('p','worlds-opening',ui.message));const pocket", "else{body.append(el('p','worlds-opening',ui.message));if(ui.letters?.length){const letters=el('div','worlds-letters');letters.append(el('h3','','旅人后来寄来的信'));ui.letters.forEach(t=>letters.append(el('p','worlds-letter',t)));body.append(letters);}const pocket")])
edit('games/ecology.js',[
 ("goal:s.complete?'比较三季结果：保留存活布局，回退修正或继续新一年':'第'", "goal:s.complete?'年度课题 · '+researchGoals[s.research].name+'：'+(researchResult()?'已达成':'尚未达成')+'。保留布局继续观察，或回退做对照。':'课题 · '+researchGoals[s.research].name+' / 第'"),
])
edit('games/wasteland.js',[
 ("rect(25,20,470,72", "if(s.scenario==='signal'){if(s.day===1&&!s.visitor){person(92,433,'#b7a180');rect(32,337,129,30,'#272a30db',3,'#ad9672');text('门外有求援',97,358,12,'#dec59d','center');}if(s.visitor==='help'){person(782,455,'#b7a180');ellipse(820,420,5,5,'#eccd8b');line([[820,431],[820,447]],'#dfc086',2);}if(s.visitor==='radio'){rect(549,449,25,14,'#596768',2);ellipse(566,455,2,2,'#d2bf8a');}}\n rect(25,20,470,72"),
])
p=root/'worlds-product.css';s=p.read_text(encoding='utf-8');s+='\n.worlds-letters h3{font:500 17px Georgia,"Songti SC",serif;margin:12px 0}.worlds-letter{background:var(--paper);border-left:2px solid var(--accent);padding:13px 15px;font-size:12px;line-height:1.9;color:var(--ink);margin:10px 0}\n';p.write_text(s,encoding='utf-8')
print('Made returned letters, annual objectives and the person asking for shelter visible.')
