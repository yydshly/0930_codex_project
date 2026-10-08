from pathlib import Path
P=Path(__file__).resolve().parents[1];f=P/'web/showcase-exchange-rules.js';s=f.read_text(encoding='utf-8')
s=s.replace("s.phase='done';s.won=auctionProfit(s)>=30;s.failed=!s.won;", "s.phase='done';s.price=s.records.at(-1).price;s.leader=s.records.at(-1).winner;s.won=auctionProfit(s)>=30;s.failed=!s.won;")
s=s.replace("s.message='拍卖与成交账目已恢复。';return s;", "s.message=typeof raw.message==='string'?raw.message.slice(0,200):'拍卖与成交账目已恢复。';return s;")
s=s.replace("'继续检验当前配装。';}return s;", "'继续检验当前配装。';if(typeof raw.message==='string')s.message=raw.message.slice(0,200);}return s;")
f.write_text(s,encoding='utf-8')
f=P/'web/showcase-exchange-draw.js';s=f.read_text(encoding='utf-8').replace("text(c,s.phase==='round'?s.remaining.toFixed(1)+' 秒':'本轮已结算',566,575", "plate(c,510,557,112,22,'#112832ed');text(c,s.phase==='round'?s.remaining.toFixed(1)+' 秒':'本轮已结算',566,573");f.write_text(s,encoding='utf-8')
