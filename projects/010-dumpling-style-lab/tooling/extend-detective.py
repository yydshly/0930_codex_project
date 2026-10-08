from pathlib import Path
p=Path(__file__).resolve().parents[1]/'web/games/detective.js'
s=p.read_text(encoding='utf-8')
def replace(a,b):
    global s
    assert a in s,a[:100];s=s.replace(a,b,1)
replace("phase:'investigation',player", "phase:'investigation',caseIndex:0,closedCases:[],player")
replace("s.scene=['office'", "s.caseIndex=saved.caseIndex===1?1:0;s.closedCases=Array.isArray(saved.closedCases)?copy(saved.closedCases).slice(-8):[];s.scene=['office'")
# Keep validation against the stable evidence keys, but render the current case's labels.
start=s.index('export function createDetectiveGame')
s=s[:start]+s[start:].replace('EVIDENCE','evidence').replace('REASONS','reasons')
replace("const paper=document", "const evidence={...EVIDENCE},reasons={...REASONS};\n  function caseLabels(){Object.assign(evidence,state.caseIndex===1?{can:'封存的电影盒',receipt:'停映申请',register:'捐赠登记',contact:'删改后的样片'}:EVIDENCE);Object.assign(reasons,state.caseIndex===1?{label:'有捐赠登记，应直接交给影院',memory:'尊重撤回公开的签名与用途约定',trust:'剪辑师可以代替当事人决定放映'}:REASONS);}\n  caseLabels();\n  const paper=document")
replace("function inspect(id){", """function inspect(id){
    if(state.caseIndex===1&&['film','ledger','receipt','contact','shen','lin','ji'].includes(id)){
      const lines={film:'封存盒仍写着 K17，里面的新底片却刻着 K22。两次项目用了同一只旧盒；盒号不能代替片号。',ledger:'捐赠登记只列 K17：季远同意它在社区口述展放映。新片 K22 没有签署公开用途；影像来源相同，约定也不能自动延续。',receipt:'雨槽里的停映申请写着 K22，签名是季远。他撤回公开妻子病中影像的许可，但同意原片留存于个人档案。',contact:'林岚交出的 K22 工作样片：争议段落已经剪掉，片尾备注“删改版本仍需季远复核”。这一版不等于自动获得放映许可。',shen:'沈放：“旧捐赠登记在影院，今晚的展映也排好了。可那张登记只写 K17；我不能替季远同意新的片子。”',lin:'林岚：“我按要求删掉那一段，但删改只是准备。该不该公开，还得季远亲口决定；原底也由他保留。”',ji:'季远：“我不是要抹掉她的一生，只是不愿让那段病中的影像被公开。把 K22 原底还给我吧，今后是否再放映，我会重新答复。”'};
      if(id==='contact'&&!state.testimony.lin){say('先问林岚，删改后的样片为什么还没有放映。','bump');return;}
      if(NAMES[id]){state.testimony[id]=true;record(lines[id]);say(lines[id]);}else clue({film:'can',ledger:'register',receipt:'receipt',contact:'contact'}[id],lines[id]);return;
    }""")
replace("if(pair==='contact/receipt'){state.comparisons", """if(state.caseIndex===1){if(pair==='contact/receipt'){state.comparisons.ownership=true;record('对照：K22 停映申请与删改样片同号；删掉争议段落仍需重新取得同意。');say('停映申请与样片都指向 K22。季远仍未同意公开，新片原底应按他的要求封存。','success');}else if(pair==='can/register'){state.comparisons.reused=true;record('对照：盒号 K17 与片号 K22 不同，旧捐赠登记不能覆盖新的底片。');say('旧盒和旧登记都写 K17，原底是 K22。这个差别解释了影院的误会。','success');}else say('先核对片号、公开用途和当事人的签名。旧约定不能自动替新版本作决定。');return;}if(pair==='contact/receipt'){state.comparisons""")
replace("let feedback,correct=false;", """let feedback,correct=false;
    if(state.caseIndex===1){
      correct=state.person==='ji'&&state.reason==='memory'&&state.comparisons.ownership&&state.comparisons.reused&&state.testimony.ji;
      feedback=correct?'季远收下 K22 原底。林岚封存样片，沈放撤下今晚的场次。取消一场放映并没有抹掉那个人；他们约好，等季远准备好再共同决定。':state.person!=='ji'?'旧捐赠只覆盖 K17，剪辑工作也不能替当事人同意。K22 原底应留给签名要求封存的人。':!state.comparisons.ownership||!state.comparisons.reused?'对象已经找到，还要证明旧登记为何不能覆盖新片，以及删改后为何仍需同意。先完成两组证据对照。':'季远要你依据用途约定与撤回签名，而不是替他决定什么最好。听完他的证词，再核对判断理由。';
      if(correct){state.phase='returned';state.walk=null;record('第二案结案：K22 归还季远，删改样片封存；公开用途留待重新约定。');state.closedCases=[...state.closedCases.filter(x=>x.id!==1),{id:1,title:'未放映的那一晚',result:feedback}];}
      state.attempts.push({person:state.person,reason:state.reason,correct,feedback});record((correct?'结案':'修正判断')+'：'+NAMES[state.person]+' / '+reasons[state.reason]);say(feedback,correct?'success':'bump');return;
    }""")
replace("state.phase='returned';state.scene='office';", "state.phase='returned';state.closedCases=[...state.closedCases.filter(x=>x.id!==0),{id:0,title:'雨夜的原底',result:feedback}];state.scene='office';")
replace("function command(id){if(disposed)return;", "function command(id){if(disposed)return;if(id==='next-case'&&state.phase==='returned'&&state.caseIndex===0){const closedCases=state.closedCases.length?copy(state.closedCases):[{id:0,title:'雨夜的原底',result:state.message}];state=initial();state.caseIndex=1;state.closedCases=closedCases;caseLabels();say('第二案 · 未放映的那一晚。同一只旧盒装着新的底片。今晚影院要开场，但有人送来了停映申请；旧案的答案不能直接套用。','success');return;}")
replace("...(complete?[{id:'reinvestigate'", "...(complete?[...(state.caseIndex===0?[{id:'next-case',label:'接第二案 · 未放映的那一晚',primary:true}]:[]),{id:'reinvestigate'")
replace("title:'黑白侦探 · 旧城失物局'", "title:'旧城失物局 · '+(state.caseIndex===1?'未放映的那一晚':'雨夜的原底')")
replace("journal:state.journal.slice(-14)", "journal:[...state.closedCases.map(x=>'已结案 · '+x.title+'：'+x.result),...state.journal.slice(-14)]")
replace("goal:complete?'案件已结", "goal:state.caseIndex===1?(complete?'第二案已结：原底封存，是否公开留待当事人重新决定。':'核对旧捐赠登记与新片用途；比较两组证据，再判断谁能决定 K22 的去处。'):complete?'案件已结")
replace("tag('旧电影盒',318,321)", "tag(evidence.can,318,321)")
replace("tag('器材簿',642,337)", "tag(evidence.register,642,337)")
replace("adult(380,473,'lin');tag('托管回执已签'", "adult(380,473,state.caseIndex===1?'ji':'lin');tag(state.caseIndex===1?'原底封存交接':'托管回执已签'")
p.write_text(s,encoding='utf-8')
print('Added a second case with different evidence and consent decision.')
