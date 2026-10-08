import {inspectWorld} from './world-inspection.js';
// Read the same persisted rules that drive each world; these are goals, not a walkthrough.
const task=(label,done)=>({label,done:!!done});
export function withWorldProgress(id,s,ui){
 let tasks=[],hint='',action=null;
 switch(id){
 case 'detective':
  tasks=[task('现场与证词',Object.keys(s.clues).length===4&&Object.keys(s.testimony).length>=2),task(s.caseIndex===1?'核对用途与片号':'核对保管关系',s.comparisons.ownership&&(s.caseIndex!==1||s.comparisons.reused)),task('归还与回应',s.phase==='returned')];
  hint=s.phase==='returned'?'旧案保留在案卷里。第二案需要重新核对新的底片与约定。':!s.comparisons.ownership?'在失物局点选两件证据，再对照编号、签名与用途。':'你的推理已留下证据。选择对象和理由后，人物会回应这个判断。';break;
 case 'wuxia':
  tasks=[task('调查两处险路',s.inspected.includes('river')&&s.inspected.includes('cliff')),task('接通一条路',s.route),task('分完两份补给',s.rations===0),task('写下安排',s.phase==='finished')];
  hint=s.phase==='finished'?'翌日回音会说明救援之后发生了什么；旧安排可与另一条路径对照。':s.route?'补给需要走到人身边亲手递送。粮车需一份，山客需两份，信使需一份。':'先看清两处困境。唯一长绳一旦使用，今夜就不能换路。';
  if(s.phase!=='finished'){const target=!s.inspected.includes('river')?'river':!s.inspected.includes('cliff')?'cliff':null;if(target)action={id:target,label:'前往'+(target==='river'?'断桥':'落石山道')};}break;
 case 'ecology':
  tasks=[task('春融观察',s.season>=1),task('旱夏观察',s.season>=2),task('秋汛与年报',s.complete)];
  hint=s.work?'调查员正在完成这次劳动，完成后再安排下一项。':s.complete?'年度课题以存活生境评估；继续新一年会保留树木与湿地。':'先选年度课题，再安排三点劳动。留出劳动调闸，才能应对旱夏和秋汛。';break;
 case 'wasteland':
  tasks=[task('第一轮晴窗',s.day>=1),task(s.scenario==='signal'?'回应求援与沙尘':'第二轮沙尘',s.day>=2),task('第三轮寒夜',s.status==='survived')];
  hint=s.status==='failed'?'值守中止的收支仍在档案里，下一次可以比较维修顺序。':s.scenario==='signal'&&s.day===1&&!s.visitor?'门外的人还在等。接应或无线电联络都会立即扣除显示的库存。':'预测会先显示下一轮剩余库存与活力。居民或种苗到零，值守便会中止。';break;
 case 'dream':{
  const m=id=>s.memories.find(v=>v.id===id);
  tasks=[task('渡过月下两岸',s.stage>=1),task('露出廊桥、开启门',s.stage===2||(m('watch').node==='stone'&&m('ticket').node==='echo')),task('选择带走什么',s.stage===2)];
  hint=s.stage===2?'两种解释都可以留在渡船记事里。重访时，旧结局会保留。':s.stage===0?'双手只能托住一段记忆。让物件成为路，再亲手把远岸的怀表带到船边。':'怀表有重量，船票有方向。观察水位和门的变化，再去彼岸选择。';break;}
 case 'arcade':
  tasks=[task('开始这一单',s.status!=='ready'),task('抵达最后屋顶',s.checkpoint>=(s.course===1?4:3)),task('亲手投递',s.status==='delivered')];
  hint=s.status==='delivered'?'收件人的回信和三条路线成绩会留下。可以接下一单或重访已完成路线。':'落地前可提前140毫秒预备跳跃。自动前进只管跑，你仍需控制起跳、冲刺和投递。';break;
 case 'inn':
  tasks=[task('听清这次需要',s.current.read),task('让来客安顿',!!s.current.room&&s.current.settled>=1.2),task('送别、留下回信',['departed','finished'].includes(s.phase))];
  hint=s.day>7?'回信篇里的来客也带着心事。倾听或一起计划会留下不同的信；舒服的房间仍需你准备。':'过去的招待会改变回访时的话。入住后仍可调整房间与布置，等安顿好再送别。';break;
 case 'islands':
  tasks=s.towerStarted?[task('校准风向、接通右岸',s.windAligned),task('让星纹对齐',s.starAligned),task('点亮归航灯',s.beaconLit),task('回营归档',s.towerReported)]:[task('工具与绳桥',s.bridgeOpen&&s.tools.includes('lantern')),task('两份遗迹发现',s.discoveries.length===2),task('回营归档',s.reported)];
  hint=s.towerStarted?'守灯人的留言与旧星纹是校准依据。机关会改变真正可走的桥，归航灯点亮后还要回营归档。':'工具决定哪里能走。带回两份发现，航图会定位第二章的云塔岛。';break;
 }
 return {...ui,inspection:inspectWorld(id,s,ui),tasks,hint,hintAction:action,metrics:id==='wasteland'?['水 '+s.water,'电 '+s.power,'零件 '+s.parts,'居民 '+s.people+'/5','种苗 '+s.crops+'/5']:[]};
}
