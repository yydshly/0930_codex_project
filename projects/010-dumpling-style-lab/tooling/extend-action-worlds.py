from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'web'
def edit(name,changes):
    p=ROOT/'games'/name;s=p.read_text(encoding='utf-8')
    for old,new in changes:
        assert old in s,(name,old[:90]);s=s.replace(old,new,1)
    p.write_text(s,encoding='utf-8')

edit('arcade.js',[
    ("delivery:{x:1530,y:400},par:24}","delivery:{x:1530,y:400},par:24},\n {name:'清晨回信',width:1440,platforms:[{x:20,w:230,y:480},{x:340,w:220,y:450},{x:650,w:240,y:450},{x:990,w:380,y:415}],delivery:{x:1260,y:415},par:22}"),
    ("falls:0,best:[null,null],completed:[false,false]","falls:0,autoForward:false,best:[null,null,null],completed:[false,false,false]"),
    ("coyote=.12,dash=0", "coyote=.12,jumpBuffer=0,dash=0"),
    ("s.course=clamp(s.course,0,1);const course", "s.course=clamp(Math.floor(s.course)||0,0,2);s.best=courses.map((_,i)=>Number.isFinite(s.best?.[i])?s.best[i]:null);s.completed=courses.map((_,i)=>!!s.completed?.[i]);s.autoForward=false;const course"),
    ("index=next?1:s.course", "index=next?Math.min(s.course+1,2):s.course"),
    ("dash=0;cooldown=0;coyote=.12;camera=0;", "dash=0;cooldown=0;coyote=.12;jumpBuffer=0;camera=0;s.autoForward=false;"),
    ("if(id==='next-route'&&s.status==='delivered'&&s.course===0)", "if(id==='next-route'&&s.status==='delivered'&&s.course<2)"),
    ("if(s.status==='delivered')return;if(id==='jump'){", "if(id.startsWith('route-')&&s.status==='delivered'){const i=Number(id.slice(6));if(!Number.isInteger(i)||i<0||i>=courses.length||!s.completed[i])return;s.course=i;return restart();}if(s.status==='delivered')return;if(id==='auto-forward'){s.autoForward=!s.autoForward;say(s.autoForward?'自动前进已开启。你仍需判断起跳、冲刺与投递；点一次可停下。':'自动前进已停下，可以用方向键接手。');return;}if(id==='jump'){jumpBuffer=.14;"),
    ("s.player.grounded=false;coyote=0;emit('jump')", "s.player.grounded=false;coyote=0;jumpBuffer=0;emit('jump')"),
    ("else say('在屋顶上起跳；离开边缘后仍有一小段起跳宽限。','bump')", "else say('起跳已预备：落地前140毫秒按下，也能接上下一跳。')"),
    ("s.status='delivered';s.completed", "s.status='delivered';s.autoForward=false;s.completed"),
    ("say(grade+'。用时 '", "const replies=['收件人把医院寄来的旧照片收好：“谢谢你今晚跑这一趟，家里一直在等。”','夜班技术员接过零件：“这班检修能赶上了。灯亮起来的时候，你也有一份。”','门口的人接过回信：“我以为要再等一天。谢谢你把这个清晨送过来。”'];s.journal.push(replies[s.course]);say(replies[s.course]+' '+grade+'。用时 '"),
    ("cooldown=Math.max(0,cooldown-dt);if(s.status", "cooldown=Math.max(0,cooldown-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);if(s.status"),
    ("dx=input.x||0;if(dx)", "dx=input.x||(s.autoForward?1:0);if(dx)"),
    ("stride+=Math.abs(p.vx)", "if(jumpBuffer>0&&p.grounded){p.vy=-570;p.grounded=false;coyote=0;jumpBuffer=0;emit('jump')}\n stride+=Math.abs(p.vx)"),
    ("s.falls++;s.runTime+=4;dash=0;", "s.falls++;s.runTime+=4;dash=0;jumpBuffer=0;s.autoForward=false;"),
    ("(s.course===0?'旧城路线已送达；继续高架急件，或练习更快的起跳节奏。':'高架急件已送达；两条路线的成绩会分别保留。')", "(s.course<2?'这一单已签收，下一位收件人仍在等；也可以选择已完成的路线。':'三份快递都留有回信，路线成绩分别保留。')"),
    ("...(s.course===0?[{id:'next-route',label:'挑战高架急件',primary:true}]:[])", "...(s.course<2?[{id:'next-route',label:'接下一单 · '+courses[s.course+1].name,primary:true}]:[]),...courses.flatMap((r,i)=>s.completed[i]&&i!==s.course?[{id:'route-'+i,label:'重访 · '+r.name}]:[])"),
    ("[{id:'jump',label:'跳跃',disabled:!s.player.grounded&&coyote<=0}", "[{id:'auto-forward',label:s.autoForward?'停下自动前进':'开启自动前进（手动跳跃）'},{id:'jump',label:'跳跃 / 预备下一跳'}"),
    ("手机按钮可组合按住方向与跳跃/冲刺。", "也可开启自动前进，专心掌握跳跃与冲刺；跌落后会停下。"),
])

edit('movers.js',[
    ("if(id==='reload-art')", "if(id.startsWith('order-')&&state.orderDone){const i=Number(id.slice(6));if(!Number.isInteger(i)||i<0||i>=ORDERS.length||!state.records.some(r=>r.order===i))return;state=newState(i,state.completedOrders,state.records,state.journal);coyote=.12;return;}\n    if(id==='reload-art')"),
    ("{id:'retry',label:'练习当前委托'}]:!playing", "{id:'retry',label:'练习当前委托'},...state.records.filter(r=>r.order!==state.orderIndex).map(r=>({id:'order-'+r.order,label:'重访 · '+ORDERS[r.order].client}))]:!playing"),
    ("journal:state.journal,complete", "journal:[...state.journal,...state.records.map(r=>ORDERS[r.order].client+' · 最佳评价 '+r.score+' / '+(r.score===100?'无投掷、无补包装交付':'下一次可挑战无投掷、无补包装交付'))],complete"),
])

edit('moving-interface.js',[
    ("<p>${escapeText(r.thanks)}</p></article>", "<p>${escapeText(r.thanks)}</p>${button('order-'+r.order,'重访这份委托',true,!s.orderDone)}</article>"),
    ("${button('return',s.orderDone?'回到交付结果':'继续这一单')}</div>", "${button('return',s.orderDone?'回到交付结果':'继续这一单')}</div>${!s.orderDone?'<p class=\"moving-footnote\">完成当前搬运后，可以选择已完成的委托；正在搬运的进度会保留。</p>':''}"),
    ("<span>交付评价</span></div></div><div", "<span>交付评价</span></div></div><p class=\"moving-footnote\">${s.throws===0&&s.recoveries===0?'本次达成：无投掷、无补包装，完整送达。':'本次投掷 '+s.throws+' 次 / 补包装 '+s.recoveries+' 次。重访可挑战更稳妥的搬运。'}</p><div"),
])
print('Extended rooftop routes, input buffering and commission selection.')
