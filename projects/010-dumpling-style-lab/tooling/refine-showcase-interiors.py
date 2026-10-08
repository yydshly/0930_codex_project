from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
def replace(file,old,new):
 p=root/file;t=p.read_text(encoding='utf-8');assert t.count(old)==1,(file,old[:65],t.count(old));p.write_text(t.replace(old,new),encoding='utf-8')

replace('showcase-2d.js',"over:false,bag:sevenBag()","over:false,hold:null,heldThisTurn:false,bag:sevenBag()")
replace('showcase-2d.js',"s.x=3;s.y=0;s.over=collides", "s.x=3;s.y=0;s.heldThisTurn=false;s.over=collides")
replace('showcase-2d.js'," function move(dx)",""" function hold(){
  if(s.over||s.heldThisTurn)return;const current=s.type;
  if(s.hold===null){s.type=s.next;if(!s.bag.length)s.bag=sevenBag();s.next=s.bag.pop()}else s.type=s.hold;
  s.hold=current;s.matrix=structuredClone(SHAPES[s.type]);s.x=3;s.y=0;s.heldThisTurn=true;timer=0;s.over=collides(s.board,s.matrix,s.x,s.y);sfx('turn');
 }
 function move(dx)""")
replace('showcase-2d.js',"action('直接落底',hard,s.over)","action('直接落底',hard,s.over),action('暂存 / 交换 C',hold,s.over||s.heldThisTurn)")
replace('showcase-2d.js',"if(input.pressed.has('Space'))hard();", "if(input.pressed.has('KeyC'))hold();if(input.pressed.has('Space'))hard();")
replace('showcase-2d.js',"label(ctx,'下一枚',785,130", "label(ctx,'暂存 C',170,130,'#b5c7d9',21);if(s.hold!==null)SHAPES[s.hold].forEach((row,j)=>row.forEach((v,i)=>{if(v)block(110+i*33,160+j*33,s.hold,s.heldThisTurn?.5:1)}));label(ctx,'下一枚',785,130")
replace('showcase-2d.js',"hits:0,won:false}),platforms=", "hits:0,won:false,movingClock:0}),platforms=")
replace('showcase-2d.js',"coins=[{x:475,y:348},{x:1090,y:325},{x:1750,y:345}];let t=0", "coins=[{x:475,y:348},{x:1090,y:325},{x:1750,y:345}],moving={x:685+Math.sin(s.movingClock*.8)*45,y:510,w:100};platforms.push(moving);let t=s.movingClock")
replace('showcase-2d.js',"tick(dt){t+=dt;invuln=", "tick(dt){t+=dt;s.movingClock=t;const oldX=moving.x;moving.x=685+Math.sin(t*.8)*45;if(ground&&Math.abs(s.y-moving.y)<1&&s.x+22>oldX&&s.x-22<oldX+moving.w)s.x+=moving.x-oldX;invuln=")

replace('showcase-table.js',"cardButton('出牌','剩余 '+s.hands+' 次',play,!s.selected.length)", "cardButton('出牌','剩余 '+s.hands+' 次',play,!preview.score)")
replace('showcase-table.js',"goal:s.phase==='won'?'五轮交易已完成'", "preview:scoreHand(s.selected.map(i=>s.hand[i]),s.upgrade,s),goal:s.phase==='won'?'五轮交易已完成'")
replace('showcase-table.js',"history:[],field:null,end:null", "history:[],field:null,end:null,lastDecision:null")
replace('showcase-table.js',"s.phase='result';s.field=null;", "s.lastDecision={kind,valid,correct,name:t.name};s.phase='result';s.field=null;")
replace('showcase-table.js',"}else s.phase='inspect';render()}", "}else s.phase='inspect';s.lastDecision=null;render()}")
replace('showcase-table.js',"docs.append(passport,permit);desk.append", """docs.append(passport,permit);
 if(s.phase==='inspect'&&s.field){const checks=inspectTraveler(t),review=n('div','field-review '+(checks[s.field]?'valid':'invalid'));review.setAttribute('role','status');review.append(n('b','',checks[s.field]?'字段符合规则':'字段需要注意'),n('span','',fieldReview().text));docs.append(review)}
 if(s.phase==='result'&&s.lastDecision){const stamp=n('span','document-stamp stamp-'+s.lastDecision.kind,{allow:'准许通行',deny:'退回申请',exception:'例外放行'}[s.lastDecision.kind]);permit.append(stamp)}
 desk.append""")
replace('showcase-table.js'," function decide(kind)",""" function fieldReview(){if(s.phase!=='inspect'||!s.field)return null;const t=TRAVELERS[s.index],ok=inspectTraveler(t)[s.field];return {ok,text:s.field==='name'?'护照「'+t.name+'」 / 许可「'+t.permit+'」':s.field==='date'?'证件截止 '+t.expires+' / 今日 2026-10-03':'来源「'+t.origin+'」 / 今日准许北岸与灰堡居民'};}
 function decide(kind)""")
replace('showcase-table.js',"goal:s.phase==='ended'?'今天的值班已结算'", "fieldReview:fieldReview(),goal:s.phase==='ended'?'今天的值班已结算'")

replace('showcase-table.js',"tool:'belt',dir:0,won:false", "tool:'belt',dir:0,won:false,productionPaused:false,edits:[]")
replace('showcase-table.js',"if(old&&BUILD_COST[old.type]){s.budget", "if(old&&BUILD_COST[old.type]){s.edits.push({key:k,before:structuredClone(old),after:null,delta:BUILD_COST[old.type]});s.edits=s.edits.slice(-20);s.budget")
replace('showcase-table.js',"s.cells[k]={type:s.tool,dir:s.dir};s.budget-=cost;", "s.cells[k]={type:s.tool,dir:s.dir};s.edits.push({key:k,before:null,after:structuredClone(s.cells[k]),delta:-cost});s.edits=s.edits.slice(-20);s.budget-=cost;")
replace('showcase-table.js'," return {element,getState:()=>s,getStatus:()=>({goal:s.won?'十件铜锭", """ function undo(){const edit=s.edits.pop();if(!edit||s.won)return;if(edit.before)s.cells[edit.key]=edit.before;else delete s.cells[edit.key];s.budget-=edit.delta;s.items=s.items.filter(p=>p.x+':'+p.y!==edit.key);notify('已撤销上一处设施编辑。已交付铜锭与生产时间保留。');sfx('pickup')}
 return {element,getState:()=>s,getStatus:()=>({goal:s.won?'十件铜锭""")
replace('showcase-table.js',"action('拆除并回收',()=>s.tool='remove')", "action('拆除并回收',()=>s.tool='remove'),action(s.productionPaused?'恢复输送':'暂停输送 · 施工',()=>s.productionPaused=!s.productionPaused,s.won),action('撤销上次编辑',undo,!s.edits.length||s.won)")
replace('showcase-table.js',"if(s.won)return;timer+=dt", "if(s.won||s.productionPaused)return;timer+=dt")
replace('showcase-table.js'," for(const p of s.items){const c=s.cells", """ const hover=input.hover;if(hover&&!s.won){const x=Math.floor((hover.x-bx)/cell),y=Math.floor((hover.y-by)/cell);if(x>=0&&x<10&&y>=0&&y<6){const old=s.cells[x+':'+y],valid=s.tool==='remove'?!!BUILD_COST[old?.type]:!old&&s.budget>=BUILD_COST[s.tool];ctx.save();ctx.globalAlpha=.55;if(s.tool!=='remove')ctx.drawImage(art['machine-'+({belt:1,smelt:2,generator:4}[s.tool])],bx+x*cell+2,by+y*cell-8,81,84);ctx.globalAlpha=1;ctx.strokeStyle=valid?'#b7edbc':'#ed9f94';ctx.lineWidth=3;ctx.strokeRect(bx+x*cell+2,by+y*cell+2,cell-5,cell-5);ctx.restore();label(ctx,valid?(s.tool==='remove'?'拆除回收 +'+BUILD_COST[old.type]:'建设费用 '+BUILD_COST[s.tool]):old?'已有设施':'预算不足',bx+x*cell+42,by+y*cell-14,valid?'#cbe7bd':'#edac9e',13)}}
 for(const p of s.items){const c=s.cells""")

replace('showcase-table.js',"getStatus:()=>({goal:s.phase==='ended'?'三日农场", "command(id){if(id.startsWith('plot-')){const i=Number(id.slice(5));if(Number.isInteger(i)&&i>=0&&i<6)s.selected=i}},getStatus:()=>({goal:s.phase==='ended'?'三日农场")
replace('showcase-table.js',"action('播种',()=>", "action('播种所选田地',()=>")
replace('showcase-table.js',"action('浇水',()=>", "action('浇水所选田地',()=>")
replace('showcase-table.js',"action('收获',()=>", "action('收获所选田地',()=>")
replace('showcase-table.js',"action('结束一天',endDay,s.phase!=='play')", "action('结束一天 · '+s.plots.filter(p=>p.seed&&p.water&&p.growth<2).length+' 块将生长',endDay,s.phase!=='play')")
replace('showcase-table.js',"if(p.seed||s.seeds<=0)return;", "if(p.seed||s.seeds<=0){notify(p.seed?'所选田地已经播种。先选择空田再播种。':'种子已经用完。');return}")
replace('showcase-table.js',"if(!p.seed||p.water||p.growth>=2)return;", "if(!p.seed||p.water||p.growth>=2){notify(!p.seed?'所选田地还没有种子。':p.growth>=2?'这块田地已经成熟，可以收获。':'这块田地今天已经浇水。');return}")
replace('showcase-landscape.js',"camYaw:.65,stones:", "camYaw:.65,camDistance:10.2,camPitch:.546,stones:")
replace('showcase-landscape.js',"camera.position.set(s.x+Math.sin(s.camYaw)*10.2,7.2+s.py*.45,s.z+Math.cos(s.camYaw)*10.2);", "camera.position.set(s.x+Math.sin(s.camYaw)*s.camDistance,1+Math.tan(s.camPitch)*s.camDistance+s.py*.45,s.z+Math.cos(s.camYaw)*s.camDistance);")
replace('showcase-landscape.js',"actions:builder?[action('建造方块'", "actions:[...(builder?[action('建造方块'")
replace('showcase-landscape.js',"[action('激活归航门 E',interact,s.won)]", "[action('激活归航门 E',interact,s.won)]),action('拉近镜头',()=>s.camDistance=clamp(s.camDistance-1.5,6,16)),action('拉远镜头',()=>s.camDistance=clamp(s.camDistance+1.5,6,16)),action('镜头复位',()=>{s.camYaw=.65;s.camDistance=10.2;s.camPitch=.546})]")
replace('showcase-landscape.js',"s.camYaw-=input.look.x*.004;", "s.camYaw-=input.look.x*.004;s.camPitch=clamp(s.camPitch+input.look.y*.003,.25,1.05);")
replace('showcase-spatial.js',"reload,s.reload>0||s.won)", "reload,s.reload>0||s.won||s.hp<=0||s.ammo===12)")
print('Refined controls and feedback without changing art assets.')
