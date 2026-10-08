from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
file=ROOT/'web/showcase-2d.js';text=file.read_text(encoding='utf-8')
old='actions:s.choice?[action'
assert old in text
text=text.replace(old,"actions:s.end?[action('重走这一夜',()=>{Object.assign(s,{chapter:0,x:100,y:412,vy:0,battery:false,power:false,log:false,end:null,choice:null,alerts:0,exposure:0,decision:null});cooldown=flash=0})]:s.choice?[action",1)
file.write_text(text,encoding='utf-8')
file=ROOT/'web/showcase-table.js';text=file.read_text(encoding='utf-8')
old="end.append(log);element.append(end);return"
assert old in text
text=text.replace(old,"end.append(log,cardButton('再做一轮生意','重新选择成长路线',()=>{Object.assign(s,{round:1,score:0,hands:3,discards:2,hand:[0,6,2,18,24,4,20],selected:[],upgrade:0,phase:'play',seed:4292,credits:0,history:[],supportBonus:0,routeBonus:0,relics:[]});render()}));element.append(end);return",1)
file.write_text(text,encoding='utf-8')
file=ROOT/'web/showcase.js';text=file.read_text(encoding='utf-8')
text=text.replace("finished=!!(restored.won", "finished=!!records[id]?.completed&&!!(restored.won",1)
old="$('#player-frame').append(spatialEnding);"
assert old in text
text=text.replace(old,old+"\nconst replay=document.createElement('button');replay.type='button';replay.textContent='再玩一次';replay.onclick=async()=>{await choose(currentId,false,true);start()};spatialEnding.append(replay);",1)
file.write_text(text,encoding='utf-8')
