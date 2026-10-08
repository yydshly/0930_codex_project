"""One-time content migration; edits stay inside project 010."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'web'
def edit(name, changes):
    p = ROOT / 'games' / name
    s = p.read_text(encoding='utf-8')
    for old, new in changes:
        assert old in s, (name, old[:100])
        s = s.replace(old, new, 1)
    p.write_text(s, encoding='utf-8')

edit('inn.js', [
    ("occasion:'第七日，一封回信'}", "occasion:'第七日，一封回信'},\n  {person:'writer',room:'window',items:['books','plant'],need:'编辑催我写远方，但我最近只想写窗边这些小事。今晚想借窗光、翻翻书，看看植物。',occasion:'第八日，未交的稿'},\n  {person:'courier',room:'quiet',items:['tea'],need:'有人等我的回信，可我不知道怎么开头。想安静喝杯茶，今晚先把邮包放下。',occasion:'第九日，未寄的信'},\n  {person:'botanist',room:'quiet',items:['plant','books'],need:'温室里的试种失败了。我想安静看看植物和旧书，再决定是否回去继续。',occasion:'第十日，重新发芽'}"),
    ("souvenirs:[],message:", "souvenirs:[],conversation:null,letters:[],message:"),
    ("1,7);s.phase", "1,10);s.phase"),
    (".slice(-7):[]", ".slice(-12):[]"),
    (".slice(-12):[];", ".slice(-20):[];\n  s.conversation=['listen','encourage'].includes(saved.conversation)?saved.conversation:null;s.letters=Array.isArray(saved.letters)?saved.letters.filter(x=>typeof x==='string').slice(-12):[];"),
    ("const feedback=f.good?goodText:", "const answer=state.day>7?state.conversation==='listen'?{writer:'“你说，写眼前的小事也值得。我把旅店写成了新稿的第一段。”',courier:'“你陪我读完草稿，没有催我。我终于给那个人回了信。”',botanist:'“你愿意听我讲失败的试种。我把原因重新记下来，带着问题回温室。”'}[v.person]:state.conversation==='encourage'?{writer:'“你替我留好了明早的窗房。我决定先给编辑寄一页，再慢慢写完。”',courier:'“你帮我把明早的路记清楚。我愿意亲自把回信送过去。”',botanist:'“你帮我列出下一次试种的准备。我带着新计划回去了。”'}[v.person]:'“你替我留了舒服的房间。那件心事，我还想自己慢慢想。”':goodText;\n    const feedback=f.good?answer:"),
    ("state.phase='departed';leaveAge=0;", "if(state.day>7&&f.good&&state.conversation){const letter='第'+state.day+'日 · '+p.name+'：'+answer;state.letters.push(letter);const gift={writer:'窗边的新稿',courier:'寄出的回信',botanist:'第二次试种计划'}[v.person];if(!state.souvenirs.includes(gift))state.souvenirs.push(gift);}\n    state.phase='departed';leaveAge=0;"),
    ("if(state.day===7){state.phase='finished';say(`七日结束", "if(state.day===7||state.day===10){state.phase='finished';say(`${state.day===7?'七日':'回信篇'}结束"),
    ("state.day++;state.phase='arrival';", "state.day++;state.conversation=null;state.phase='arrival';"),
    ("function command(id){if(disposed)return;", "function command(id){if(disposed)return;\n    if(id==='next-chapter'&&state.phase==='finished'&&state.day===7){state.phase='departed';nextDay();say('回信篇开始。熟悉的来客带来了新的心事；房间与过去的招待都保留。点击来客，听听这次的故事。','success');return;}\n    if(id.startsWith('conversation-')&&state.day>7&&state.current.read&&!['departed','finished'].includes(state.phase)){const choice=id.slice(13);if(!['listen','encourage'].includes(choice))return;state.conversation=choice;say(choice==='listen'?'你拉了一张椅子，让来客慢慢说。今晚不必马上找到答案。':'你们一起写下明早能做的第一件小事。来客把纸折好放进口袋。','soft');return;}"),
    ("七日的相遇已经留在这里。你可以翻看回访簿，或从网页重新开始。", "房间和相遇都留下了。翻看回访簿，继续回信篇。"),
    ("七日章节结束。每次相遇的房间、留言和纪念物已经保存。", "这一章结束。过去的招待已保存，可以继续回信篇或翻看留下的信。"),
    ("actions.push({id:'journal',label:'翻看回访簿'});", "if(state.day>7&&!after&&state.current.read)actions.push({id:'conversation-listen',label:(state.conversation==='listen'?'✓ ':'')+'坐下来，听完这件心事'},{id:'conversation-encourage',label:(state.conversation==='encourage'?'✓ ':'')+'一起安排明早的第一步'});\n    if(state.phase==='finished'&&state.day===7)actions.push({id:'next-chapter',label:'继续第二章 · 留下的信',primary:true});\n    actions.push({id:'journal',label:'翻看回访簿'});"),
    ("title:'七日小旅店',goal", "title:state.day>7?'小旅店 · 留下的信':'七日小旅店',goal"),
    ("/ 7 日 · ${p.name}", "/ ${state.day>7?10:7} 日 · ${p.name}"),
    ("journal,complete:state.phase", "journal:[...journal,...state.letters],complete:state.phase"),
])

edit('dream.js', [
    ("ending:null,changes:0", "ending:null,endings:[],changes:0"),
    ("s.stage=clamp", "s.endings=Array.isArray(saved.endings)?saved.endings.filter(e=>['time','departure'].includes(e.ending)).slice(-8):s.ending?[{ending:s.ending,changes:s.changes}]:[];s.stage=clamp"),
    ("event('success');\n }\n function command", "s.endings=[...s.endings.filter(e=>e.ending!==ending),{ending,changes:s.changes,text:s.message}];event('success');\n }\n function command"),
    ("if(disposed)return;if(id==='choose-time')", "if(disposed)return;if(id==='revisit'&&s.stage===2){const endings=s.endings.slice(),previous=s.ending;s=initial();s.endings=endings;route=[];pending=null;transition=1;log('重访渡口：上一次'+(previous==='time'?'带走了怀表':'保留了船票')+'。旧解释保留在记事中。');say('摆渡人认出了你：“这次走同样的路，也可以带着不同的答案回去。”');return;}if(id==='choose-time')"),
    ("actions:s.stage===2?[]:", "actions:s.stage===2?[{id:'revisit',label:'重访渡口，保留两个结局',primary:true}]:"),
    ("journal:[...s.journal],complete", "journal:[...s.endings.map(e=>'已留下的解释 · '+(e.ending==='time'?'带走时间':'仍可出发')+'：'+(e.text||'上次的渡河记忆已保存。')),...s.journal],complete"),
])

edit('wuxia.js', [
    ("phase:'journey',ending:null", "phase:'journey',reports:[],ending:null"),
    ("function command(id){if(disposed)return;", "function command(id){if(disposed)return;\n  if(id==='retrace'&&s.phase==='finished'){const reports=copy(s.reports),journal=s.journal.slice();s=initial();s.reports=reports;s.journal=journal;route=[];pending=null;say('带着上次的安排重走暮雨。旧结果保留，这次可以试试另一条路。');return;}\n  if(id==='aftermath'&&s.phase==='finished'){const t=s.route==='river'?'第二天，北岸送来的粮食进了村。'+(s.supplied.runner?'陆青替你把信交给山客家人，向导午后出发。':'陆青仍在驿站，山客家人直到午后才收到消息。'):'第二天，沈梁'+(s.supplied.porter===2?'带着你给的干粮下山，为粮车找来绕行的向导。':'仍留在避风处，驿站另派向导接应。')+'粮车晚了一天，村里借粮应急。';log('翌日回音 · '+t);say(t,'success');return;}"),
    ("s.phase='finished';s.ending=", "if(s.rations>0)return say('还有未分配的干粮。走近等候的人，完成两份补给的安排后再结案。','bump');s.phase='finished';s.ending="),
    ("say(s.ending,'success');return}", "s.reports=[...(s.reports||[]),{route:s.route,supplied:copy(s.supplied),ending:s.ending}].slice(-12);say(s.ending,'success');return}"),
    ("s.phase==='finished'?[]:", "s.phase==='finished'?[{id:'aftermath',label:'读读第二天的回音',primary:true},{id:'retrace',label:'重走暮雨，比较另一条安排'}]:"),
    ("disabled:!s.route||!s.inspected.includes('river')", "disabled:s.rations>0||!s.route||!s.inspected.includes('river')"),
    ("journal:s.journal,complete", "journal:[...(s.reports||[]).slice(-4).map((r,i)=>'旧安排 '+(i+1)+' · '+r.ending),...s.journal],complete"),
])

edit('ecology.js', [
    ("selected:'plot-upland',avatar", "selected:'plot-upland',research:'mosaic',annualReports:[],avatar"),
    ("function chapterSnapshot()", "const researchGoals={mosaic:{name:'让三种生境共存',test:()=>['reed','flowers','wood'].every(k=>s.patches.some(p=>p.plant===k&&p.health>0&&p.age>0))&&s.observations.length>=3},wetland:{name:'让泽蛙返回双湿地',test:()=>s.observations.some(o=>o.id==='frog')},canopy:{name:'让林栖鸟留在双林冠',test:()=>s.patches.filter(p=>p.plant==='wood'&&p.age>=2&&p.health>0&&p.water>=2&&p.water<=6).length>=2}};\n if(!researchGoals[s.research])s.research='mosaic';\n function researchResult(){return researchGoals[s.research].test()}\n function chapterSnapshot()"),
    ("s.complete=s.season>=3;s.work=null;", "s.complete=s.season>=3;if(s.complete){const r={year:s.year,research:s.research,success:researchResult(),species:s.observations.map(o=>o.name),alive:s.patches.filter(p=>p.plant!=='bare'&&p.health>0).length};s.annualReports=[...(s.annualReports||[]).filter(a=>a.year!==s.year),r].slice(-12);log('年度课题 · '+researchGoals[s.research].name+'：'+(r.success?'已达成':'尚未达成')+'；存活地块 '+r.alive+'/4。');}s.work=null;"),
    ("if(disposed)return false;if(s.work", "if(disposed)return false;if(id.startsWith('research-')){const key=id.slice(9);if(!researchGoals[key]||s.work||s.season!==0||s.checkpoint)return false;s.research=key;say('今年的观察课题：'+researchGoals[key].name+'。它将按季末实际生境评估；开始劳动后不可更换。');return true;}if(s.work"),
    ("actions:[...['reed'", "actions:[...Object.entries(researchGoals).map(([k,g])=>({id:'research-'+k,label:(s.research===k?'✓ ':'')+g.name,disabled:!!s.work||s.season!==0||!!s.checkpoint})),...['reed'"),
    ("inventory:['芦苇苗", "inventory:['年度课题：'+researchGoals[s.research].name+' / '+(researchResult()?'当前已达成':'仍在观察'),'芦苇苗"),
    ("journal:[...s.journal],complete", "journal:[...(s.annualReports||[]).map(r=>'第'+r.year+'年课题 · '+researchGoals[r.research].name+'：'+(r.success?'达成':'未达成')+' / '+r.species.join('、')),...s.journal],complete"),
])

edit('wasteland.js', [
    ("rounds:[],journal:", "rounds:[],scenario:'shelter',visitor:null,journal:"),
    ("if(id==='retry'){const archive=copy(s.archive);s=initial(archive);", "if(id==='storm-contract'&&s.status!=='planning'){const archive=copy(s.archive);s=initial(archive);s.scenario='signal';s.water=6;s.power=6;s.parts=5;s.journal=['通讯台恢复了。你接下第二次值守：库存水6、电6、零件5，沙尘到来时会有人求援。'];say('第二次值守 · 风暴求援。第一轮之后会收到一个真实消耗物资的请求。');return;}if(id==='retry'){const archive=copy(s.archive),scenario=s.scenario;s=initial(archive);if(scenario==='signal'){s.scenario=scenario;s.water=6;s.power=6;s.parts=5;}"),
    ("if(s.status!=='planning')return;", "if(s.status!=='planning')return;\n if(id==='visitor-help'||id==='visitor-radio'){if(s.scenario!=='signal'||s.day!==1||s.visitor)return;if(id==='visitor-help'){if(s.water<2||s.parts<1)return say('接应要水2、零件1。现有库存不足，可以改用无线电。','bump');s.water-=2;s.parts--;s.visitor='help';log('求援接应：水−2，零件−1。维修员带来一格备用电，电+1。');s.power++;say('你为门外的维修员留出温水和干燥的床位。他把备用电接入温室，窗外多了一盏回应灯。','success');}else{if(s.power<1)return say('无线电联络要电1。','bump');s.power--;s.visitor='radio';log('无线电求援：电−1。邻站同意接应；你保留了水，但没能让他进温室。');say('邻站回应了坐标。你守住库存，也把那个人送往另一个避风处。','soft');}return;}"),
    ("if(id==='advance'){const w=weather()", "if(id==='advance'){if(s.scenario==='signal'&&s.day===1&&!s.visitor)return say('无线电里还有一个未回应的求援。先决定接应，或请邻站帮助。','bump');const w=weather()"),
    ("if(s.status!=='planning')s.archive.push({status:s.status", "if(s.status!=='planning'){if(s.scenario==='signal')log(s.visitor==='help'?'风暴后，维修员留下电路图与一封致谢。':'风暴后，邻站报告维修员已抵达。他托无线电向你道谢。');s.archive.push({scenario:s.scenario,visitor:s.visitor,status:s.status"),
    ("power:s.power});return}", "power:s.power});}return}"),
    ("off?[{id:'retry',label:'重开值守，保留结局档案',primary:true}]:[", "off?[{id:'storm-contract',label:'接下一次值守 · 风暴求援',primary:true},{id:'retry',label:'重开当前值守，保留结局档案'}]:[...(s.scenario==='signal'&&s.day===1&&!s.visitor?[{id:'visitor-help',label:'接应维修员（水2 / 零件1 → 电1）',disabled:s.water<2||s.parts<1,primary:true},{id:'visitor-radio',label:'请邻站接应（电1）',disabled:s.power<1}]:[]),"),
    ("label:'按当前安排推进气候',primary:true", "label:'按当前安排推进气候',disabled:s.scenario==='signal'&&s.day===1&&!s.visitor,primary:true"),
    ("title:'最后一座温室',goal", "title:s.scenario==='signal'?'最后一座温室 · 风暴求援':'最后一座温室',goal"),
    ("else say('这一轮已经结算。下一轮 '", "else if(s.scenario==='signal'&&s.day===1)say('沙尘前，门外有人呼叫。他带着备用电，但需要水2和零件1；或耗电1请邻站接应。先作回应，再安排气候。');else say('这一轮已经结算。下一轮 '"),
])

print('Extended inn, dream, wuxia, ecology and wasteland.')
