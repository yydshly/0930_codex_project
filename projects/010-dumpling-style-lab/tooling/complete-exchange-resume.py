from pathlib import Path
P=Path(__file__).resolve().parents[1];f=P/'web/showcase-exchange.js';s=f.read_text(encoding='utf-8')
old="if(code&&key)result=networkCall('read',{code,key},incoming?'carrier':'author');else s.message='先发布路线或输入接力码。';"
new="if(code&&key)result=networkCall('read',{code,key},incoming?'carrier':'author');else if(!incoming&&s.ownerKey)result=networkCall('lookup',{key:s.ownerKey},'author');else s.message='先发布路线或输入接力码。';"
assert old in s;s=s.replace(old,new)
old="if(id==='postway'&&(s.outgoing||s.receiveCode)&&!s.pending)command('refresh');"
new="if(id==='postway'&&!s.pending){if(s.role==='carrier'&&s.receiveCode)command('receive');else if(s.outgoing||s.ownerKey)command('refresh');}"
assert old in s;s=s.replace(old,new).replace("if(!disposed){queued={error:","if(!disposed){s.online=false;queued={error:")
s=s.replace("el=surface.element;","el=surface.element;el.setAttribute('aria-label',id==='satchel'?'行囊摆放舞台：点击或拖动装备，R 旋转，方向键调整，Enter 放置，下方有完整按钮。':id==='gavel'?'拍卖舞台：下方按钮查看鉴定和出价，可暂停观察，落槌后查看成交结果。':'异步接力地图：方向键或点按相邻格规划和行走，下方可发布路线、输入接力码和打开另一窗口。');")
f.write_text(s,encoding='utf-8')
