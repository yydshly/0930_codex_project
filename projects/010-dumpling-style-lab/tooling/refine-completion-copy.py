from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
p=root/'games/wasteland.js';s=p.read_text(encoding='utf-8')
s=s.replace("say('三轮气候过去，居民和种苗都保住了。设备、库存与活力留下了这次安排的代价。','success')", "say('三轮气候过去，居民和种苗都保住了。设备、库存与活力留下了这次安排的代价。'+(s.scenario==='signal'?(s.visitor==='help'?' 维修员把电路图留在桌上：“谢谢你留的床位，下次修泵的时候，我也会回来。”':' 邻站报告维修员平安抵达，他托无线电向你道谢。'):''),'success')")
s=s.replace("'太阳补电 +'+weather().solar,'预测水 '+f.water+' / 电 '+f.power,...s.archive.slice(-3).map(a=>'旧档案：'+(a.status==='survived'?'存活':'中止')+' '+a.days+'轮')", "...(!off?['太阳补电 +'+weather().solar,'预测水 '+f.water+' / 电 '+f.power]:[]),...s.archive.slice(-3).map(a=>(a.scenario==='signal'?'求援值守':'首次值守')+'：'+(a.status==='survived'?'存活':'中止')+' '+a.days+'轮 / 居民'+a.people+' / 种苗'+a.crops)")
p.write_text(s,encoding='utf-8')
p=root/'worlds-product.css';s=p.read_text(encoding='utf-8')+'\nbody[data-game=movers] .worlds-stocks{display:none}\n';p.write_text(s,encoding='utf-8')
print('Clarified completed survival results and hid unused counters in Moving Day.')
