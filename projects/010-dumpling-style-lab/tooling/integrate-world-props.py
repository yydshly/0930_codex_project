from pathlib import Path
p=Path(__file__).resolve().parents[1];g=p/'web/games'
path=g/'detective.js';s=path.read_text(encoding='utf-8');assert "art.image('film-can'" not in s
start=s.index("rect(391,502,46,21,");end=s.index("tag('交接单'",start)
s=s[:start]+"if(!art.image('torn-receipt',391,499,46,25)){"+s[start:end]+"}"+s[end:]
start=s.index("rect(620,258,42,31,");end=s.index("tag('工作样片'",start)
s=s[:start]+"if(!art.image('contact-proof',618,255,46,35)){"+s[start:end]+"}"+s[end:]
start=s.index("ellipse(318,289,39,10,");end=s.index("tag('旧电影盒'",start)
s=s[:start]+"if(!art.image('film-can',278,267,80,31)){"+s[start:end]+"}"+s[end:]
start=s.index("rect(598,271,84,37,");end=s.index("tag('器材簿'",start)
s=s[:start]+"if(!art.image('equipment-ledger',599,268,86,42)){"+s[start:end]+"}"+s[end:]
start=s.index("rect(100,291,69,24,");end=s.index("tag('案件簿'",start)
s=s[:start]+"if(!art.image('equipment-ledger',99,288,69,29)){"+s[start:end]+"}"+s[end:]
path.write_text(s,encoding='utf-8')

path=g/'wasteland.js';s=path.read_text(encoding='utf-8');assert "art.image('water-pump'" not in s
start=s.index('for(let row=0;row<2;row++)');end=s.index(" rect(184,356,72,99,",start)
old=s[start:end];s=s[:start]+"if(art.ready('seedling-bench')){c.save();if(s.crops<=1)c.filter='saturate(.25)';art.image('seedling-bench',287,295,221,53);art.image('seedling-bench',287,351,221,53);c.restore()}else{"+old+"}"+s[end:]
start=s.index("rect(184,356,72,99,");end=s.index("line([[254,424]",start)
s=s[:start]+"if(!art.image('water-pump',183,355,74,100)){"+s[start:end]+"}"+s[end:]
start=s.index("rect(478,378,57,77,");end=s.index("if(s.plan.heat",start)
s=s[:start]+"if(!art.image('radiator',474,378,65,77)){"+s[start:end]+"}"+s[end:]
start=s.index("rect(76,466,88,37,");end=s.index("text(s.salvaged",start)
s=s[:start]+"if(!art.image('salvage-crate',76,457,88,46)){"+s[start:end]+"}"+s[end:]
path.write_text(s,encoding='utf-8')

path=g/'dream.js';s=path.read_text(encoding='utf-8');assert "art.image('moon-ferry'" not in s
s=s.replace("function ferry(x,y){", "function ferry(x,y){if(art.image('moon-ferry',x-68,y-42,171,93)){const glow=c.createRadialGradient(x+30,y+6,1,x+30,y+6,62);glow.addColorStop(0,'#efcf9220');glow.addColorStop(1,'#efcf9200');c.fillStyle=glow;c.fillRect(x-32,y-56,124,124);return}")
start=s.index('const x=620,y=211;');end=s.index('  if(!gate())',start)
old=s[start:end];s=s[:start]+"const x=620,y=211;if(!art.image('archive-pavilion',581,191,257,142)){"+old.replace('const x=620,y=211;','')+"}"+s[end:]
start=s.index("poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],shade");end=s.index("poly([[x,y+h]",start)
old=s[start:end];s=s[:start]+old+"const surface=art.pattern('moon-stone',.2);if(surface){c.save();c.globalAlpha=.42;rect(x,y,w,h,surface);c.restore()}"+s[end:]
path.write_text(s,encoding='utf-8')

# Version all consumers together so an open browser sees the new assets and shared renderer.
for path in list(g.glob('*.js'))+[p/'web/worlds-interface.js']:
    s=path.read_text(encoding='utf-8').replace('worlds-art.js?v=1','worlds-art.js?v=3').replace('world-draw.js?v=2','world-draw.js?v=3');path.write_text(s,encoding='utf-8')
path=p/'web/games.js';s=path.read_text(encoding='utf-8').replace('worlds-interface.js?v=2','worlds-interface.js?v=3')
for name in ['detective','wuxia','ecology','wasteland','dream','arcade','inn','islands']:s=s.replace(name+'.js?v=2',name+'.js?v=3')
path.write_text(s,encoding='utf-8')
path=p/'web/games.html';s=path.read_text(encoding='utf-8').replace('games.js?v=15','games.js?v=16').replace('worlds-product.css?v=2','worlds-product.css?v=3');path.write_text(s,encoding='utf-8')
print('Connected tangible evidence, equipment and memory-world props.')
