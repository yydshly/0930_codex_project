from pathlib import Path
file=Path(__file__).resolve().parents[1]/'web/showcase-table.js'
text=file.read_text(encoding='utf-8')
def swap(old,new):
    global text
    assert old in text,old[:80]
    text=text.replace(old,new,1)
swap("credits:0,history:[]}),targets", "credits:0,history:[],supportBonus:0,routeBonus:0,relics:[]}),targets")
swap("targets=[36,70,105,150,200];let rendered='';", "targets=[36,70,105,150,200],contracts=[['重新开张','把第一趟货送到夜市，让熄灯的摊位重新开门。'],['工坊的冬天','供暖管还缺零件，工坊等着下一班车。'],['山路来信','山里需要药，也需要一条有人继续走的路。'],['桥那边的人','旧桥修好了。让两岸重新做起生意。'],['守住约定','最后一趟货送达，商队终于能一起回家。']];let rendered='';")
swap("scoreHand(s.selected.map(i=>s.hand[i]),s.upgrade)","scoreHand(s.selected.map(i=>s.hand[i]),s.upgrade,s)")
swap("if(i===1)s.credits+=8;if(i===2)s.upgrade+=2;", "if(i===1){s.credits+=8;s.supportBonus+=6}if(i===2){s.upgrade+=2;s.routeBonus+=.15}s.relics.push(['货仓扩建','同行商队','灵活调度'][i]);sfx('success');")
swap("element.append(top);", """element.append(top);
 const contract=node('div','round-contract');contract.append(node('b','',contracts[s.round-1][0]),node('span','',contracts[s.round-1][1]));element.append(contract);
 const progress=node('div','contract-progress');progress.setAttribute('role','progressbar');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',String(targets[s.round-1]));progress.setAttribute('aria-valuenow',String(Math.min(s.score,targets[s.round-1])));progress.setAttribute('aria-label','本轮货款进度');const fill=node('i','');fill.style.width=Math.min(100,s.score/targets[s.round-1]*100)+'%';progress.append(fill);element.append(progress);
 if(s.relics.length){const perks=node('div','run-upgrades');s.relics.forEach((text,i)=>{const item=node('span','',text),im=node('img','');im.src='assets/showcase/card-'+[2,8,6][['货仓扩建','同行商队','灵活调度'].indexOf(text)] +'.webp';im.alt='';item.prepend(im);perks.append(item)});element.append(perks)}
""")
old="panel.append(cardButton('货仓扩建','每张货物的基础收入 +4',()=>upgrade(0)),cardButton('多跑一趟','下一轮多一次出牌，获得 8 信誉',()=>upgrade(1)),cardButton('灵活调度','货物收入 +2，下一轮多一次弃牌',()=>upgrade(2)));"
new="""[['货仓扩建','每张货物收入 +4，持续到最后一轮',2],['同行商队','支援收入永久 +6；下一轮多一次出牌',8],['灵活调度','路线倍率永久 +0.15、货物 +2；下一轮多一次弃牌',6]].forEach(([title,detail,art],i)=>{const button=cardButton(title,detail,()=>upgrade(i)),im=node('img','');im.src='assets/showcase/card-'+art+'.webp';im.alt='';button.prepend(im);panel.append(button)});"""
swap(old,new)
swap("element.append(end);return", "const log=node('details','trade-log');log.append(node('summary','','回看这五趟交易'));s.history.forEach(text=>log.append(node('p','',text)));end.append(log);element.append(end);return")
swap("const preview=scoreHand(s.selected.map(i=>s.hand[i]),s.upgrade)","const preview=scoreHand(s.selected.map(i=>s.hand[i]),s.upgrade,s)")
swap("'路线倍率 '+c.value.toFixed(2):'支援收入 '+c.value", "'路线倍率 '+(c.value+s.routeBonus).toFixed(2):'支援收入 '+(c.value+s.supportBonus)")
swap("c.kind==='route'?'× '+c.value.toFixed(2):'+ '+(c.value+(c.kind==='cargo'?s.upgrade:0))", "c.kind==='route'?'× '+(c.value+s.routeBonus).toFixed(2):'+ '+(c.value+(c.kind==='cargo'?s.upgrade:s.supportBonus))")
swap("element.append(buttons)}", "element.append(buttons);if(s.history.length){const log=node('div','recent-trade');log.append(node('small','','上一笔交易'),node('span','',s.history.at(-1)));element.append(log)}}")
swap("'货仓加成 +'+s.upgrade", "'货仓 +'+s.upgrade,'支援 +'+s.supportBonus,'路线 +'+s.routeBonus.toFixed(2)")
file.write_text(text,encoding='utf-8')
