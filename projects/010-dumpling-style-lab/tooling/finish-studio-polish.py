from pathlib import Path
P=Path(__file__).resolve().parents[1]
def change(f,a,b):
 p=P/f;s=p.read_text(encoding='utf-8');assert a in s,(f,a);p.write_text(s.replace(a,b),encoding='utf-8')
change('web/showcase-studio.js',"s.completed>s.level?'本片接通，进入下一片':","s.completed>s.level?(s.level===0?'本片接通，进入下一片':'两片镜庭全部接通'):")
change('web/showcase-studio.js',"element.addEventListener('keydown',e=>","host.closest('.play-mount').addEventListener('keydown',e=>")
change('tooling/check-studio-lifecycle.mjs',"canvas.emit('keydown',{code:'KeyQ'","host.emit('keydown',{code:'KeyQ'")
change('tooling/check-studio-lifecycle.mjs',"button('restart').click();assert.equal(JSON.stringify(game.getState()),disposed);","button('restart').click();game.tick(.1);host.emit('keydown',{code:'KeyQ'});assert.equal(JSON.stringify(game.getState()),disposed);")
change('web/showcase-studio-rules.js',"export function lineCandidates(clues,known){const n=known.length,result=[];for(let mask=0;mask<(1<<n);mask++){const line=Array.from({length:n},(_,i)=>(mask>>i)&1);if(!line.every((v,i)=>known[i]===0||known[i]===(v?1:2)))continue;if(JSON.stringify(runs(line))===JSON.stringify(clues))result.push(line)}return result}","const LINE_CACHE=new Map();\nexport function lineCandidates(clues,known){const n=known.length,key=n+':'+clues.join(',');if(!LINE_CACHE.has(key)){const choices=[];for(let mask=0;mask<(1<<n);mask++){const line=Array.from({length:n},(_,i)=>(mask>>i)&1);if(JSON.stringify(runs(line))===JSON.stringify(clues))choices.push(line)}LINE_CACHE.set(key,choices)}return LINE_CACHE.get(key).filter(line=>line.every((v,i)=>known[i]===0||known[i]===(v?1:2)))}")
change('web/showcase-studio-rules.js',"export function commandStudio(s,key,arg){if(s.won","export function commandStudio(s,key,arg){if(['rotate','pitch'].includes(key)&&(!Number.isInteger(arg)||Math.abs(arg)!==1))return false;if(key==='tempo'&&!Number.isFinite(arg))return false;if(s.won")
print('Polished mirror completion label, root focus handling and deduction performance')
