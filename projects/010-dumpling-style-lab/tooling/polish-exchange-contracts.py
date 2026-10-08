from pathlib import Path
P=Path(__file__).resolve().parents[1];f=P/'web/showcase-exchange.js';s=f.read_text(encoding='utf-8')
s=s.replace("stats:id==='satchel'?{攻击:packStats(s.items).attack,格挡:packStats(s.items).defence}:id==='gavel'?{预算:s.cash,收益:auctionProfit(s)}:{路线:s.route.length,角色:s.role==='author'?'制图人':'接棒人'}", "stats:id==='satchel'?[`攻击 ${packStats(s.items).attack}`,`格挡 ${packStats(s.items).defence}`]:id==='gavel'?[`预算 ${s.cash}`,`收益 ${auctionProfit(s)}`]:[`路线 ${s.route.length}`,s.role==='author'?'制图人':'接棒人']")
s=s.replace('hover=hit;}else if(id',"hover=hit.kind==='board'?{...hit,x:hit.x-offset.x,y:hit.y-offset.y}:hit;}else if(id")
s=s.replace("const codeInput", "const codeInput")
f.write_text(s,encoding='utf-8')
f=P/'web/showcase-exchange-draw.js';s=f.read_text(encoding='utf-8').replace('if(point.x+a>=6||point.y+b>=5)continue;','if(point.x+a<0||point.y+b<0||point.x+a>=6||point.y+b>=5)continue;');f.write_text(s,encoding='utf-8')
