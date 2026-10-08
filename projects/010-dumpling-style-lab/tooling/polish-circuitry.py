from pathlib import Path
p=Path(__file__).resolve().parents[1]
f=p/'tooling/circuitry-playthroughs.mjs'
s=f.read_text(encoding='utf-8').replace('if(next&&s.lane!==next.lane)','if(s.elapsed>=4&&next&&s.lane!==next.lane)').replace('if(!snapshots.progress&&s.kills>=5)','if(!snapshots.progress&&s.elapsed>=4.04&&s.enemies.length>=2)')
f.write_text(s,encoding='utf-8')
f=p/'web/showcase-circuitry.js'
s=f.read_text(encoding='utf-8').replace('ORBIT_RADIUS+25','ORBIT_RADIUS+19').replace('ship.x,ship.y,46','ship.x,ship.y,58').replace("(u.team?'敌':u.id+1)+' · '+UNIT_TYPES[u.kind].name","(u.team?'敌':u.id+1)+['守','弩','修'][kind]")
f.write_text(s,encoding='utf-8')
f=p/'web/showcase-circuitry-panel.js'
s=f.read_text(encoding='utf-8').replace("s.won&&!['restart','select','orbit','mute'].includes(k)","s.won&&!(k==='restart'||k==='mute'||id==='prismcube'&&['select','orbit'].includes(k))")
f.write_text(s,encoding='utf-8')
