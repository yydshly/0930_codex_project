from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
def edit(name,changes):
 p=root/name;s=p.read_text(encoding='utf-8')
 for a,b in changes:
  assert a in s,(name,a[:100]);s=s.replace(a,b,1)
 p.write_text(s,encoding='utf-8')
edit('games/inn.js',[
 ("state.histories[v.person].push(record);", "state.histories[v.person].push(record);state.histories[v.person]=state.histories[v.person].slice(-12);"),
 ("if(state.day>7&&f.good&&state.conversation){", "state.journal=state.journal.slice(-20);\n    if(state.day>7&&f.good&&state.conversation){"),
 ("state.letters.push(letter);", "if(!state.letters.includes(letter))state.letters.push(letter);state.letters=state.letters.slice(-12);"),
 ("if(id==='next-chapter'&&", "if(id==='revisit-chapter'&&state.phase==='finished'&&state.day===10){state.day=7;state.phase='departed';nextDay(true);say('重访回信篇。已经寄来的信、房间和过去的招待保留；这次可以试试不同的回应。','soft');return;}\n    if(id==='next-chapter'&&"),
 ("state.phase==='finished'?'这一章结束。过去的招待已保存，可以继续回信篇或翻看留下的信。'", "state.phase==='finished'?(state.day===7?'第一章结束。房间与招待已保存，可以继续回信篇。':'两章结束。三位来客的回信已保存，可以重访回信篇，尝试另一种回应。')"),
 ("actions.push({id:'journal',label:'翻看回访簿'});", "if(state.phase==='finished'&&state.day===10)actions.push({id:'revisit-chapter',label:'重访回信篇，保留已收到的信',primary:true});\n    actions.push({id:'journal',label:'翻看回访簿'});"),
])
edit('games/detective.js',[
 ("if(id==='next-case'&&", "if(id.startsWith('case-')&&state.phase==='returned'){const i=Number(id.slice(5));if(![0,1].includes(i)||!state.closedCases.some(c=>c.id===i))return;const closedCases=copy(state.closedCases);state=initial();state.caseIndex=i;state.closedCases=closedCases;caseLabels();say('重访已结案件。旧结论保留，新的调查与判断仍需要亲手完成。');return;}if(id==='next-case'&&"),
 ("{id:'reinvestigate',label:'重新打开案件，保留记录'}", "{id:'reinvestigate',label:'重新打开案件，保留记录'},...state.closedCases.filter(c=>c.id!==state.caseIndex).map(c=>({id:'case-'+c.id,label:'重访 · '+c.title}))"),
])
edit('games/islands-art.js',[
 ("const beam=mesh(base,new T.ConeGeometry", "const sweep=new T.Group();sweep.position.set(0,5.2,0);base.add(sweep);const beam=mesh(sweep,new T.ConeGeometry"),
 ("'#f9d58b',4,5.2,0)", "'#f9d58b',4,0,0)"),
 ('refs.beam=beam;', 'refs.beam=sweep;'),
])
p=root/'moving-day.css';s=p.read_text(encoding='utf-8');s+='\n.moving-record button{min-height:44px;padding:8px 13px;border:1px solid #abb599;border-radius:7px;color:#526b49;background:transparent;cursor:pointer;font-size:11px;margin:6px 0 10px}.moving-record button:disabled{opacity:.5;cursor:default}\n';p.write_text(s,encoding='utf-8')
print('Added retained-letter revisits, case selection and a tower-centered light sweep.')
