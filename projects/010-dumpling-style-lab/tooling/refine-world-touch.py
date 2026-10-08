from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
def edit(name,old,new):
    p=root/name;s=p.read_text(encoding='utf-8');assert old in s,name;p.write_text(s.replace(old,new,1),encoding='utf-8')
edit('games/detective.js',"function hit(point){return targets().slice().reverse().find(t=>Math.abs(point.x-t.x)<t.w/2&&Math.abs(point.y-t.y)<t.h/2);}","function hit(point){const radius=22*W/element.getBoundingClientRect().width;return targets().slice().reverse().find(t=>Math.abs(point.x-t.x)<Math.max(t.w/2,radius)&&Math.abs(point.y-t.y)<Math.max(t.h/2,radius));}")
p=root/'games/inn.js';s=p.read_text(encoding='utf-8')
old="Math.abs(p.x-t.x)<t.w/2&&Math.abs(p.y-t.y)<t.h/2"
# The source uses a differently named point in this game; read its exact hit function.
if old in s:
    s=s.replace(old,"Math.abs(p.x-t.x)<Math.max(t.w/2,22*WIDTH/canvas.getBoundingClientRect().width)&&Math.abs(p.y-t.y)<Math.max(t.h/2,22*WIDTH/canvas.getBoundingClientRect().width)",1)
    p.write_text(s,encoding='utf-8')
edit('games/dream.js','if(target?.d<35)','if(target?.d<Math.max(35,22*W/r.width))')
edit('games/wuxia.js','if(t.dist<43)','if(t.dist<Math.max(43,22*960/canvas.getBoundingClientRect().width))')
edit('games/ecology.js','Math.hypot(t.x-x,t.y-y)<44','Math.hypot(t.x-x,t.y-y)<Math.max(44,22*ECO_W/r.width)')
edit('games/ecology.js',"text(p.name,p.x-38,p.y+62,12);text('水'+p.water+' · '+PLANTS[p.plant],p.x-44,p.y+78,10,'#738070');", "ctx.fillStyle='#edf0e1e8';ctx.beginPath();ctx.roundRect(p.x-57,p.y+49,114,36,4);ctx.fill();text(p.name,p.x-38,p.y+62,12,'#365441');text('水'+p.water+' · '+PLANTS[p.plant],p.x-44,p.y+78,10,'#526a55');")
for name,version in [('detective',3),('wuxia',4),('dream',4),('ecology',3),('inn',3)]:
    p=root/'games.js';s=p.read_text(encoding='utf-8');s=s.replace('./games/'+name+'.js?v='+str(version),'./games/'+name+'.js?v='+str(version+1));p.write_text(s,encoding='utf-8')
edit('games.html','games.js?v=19','games.js?v=20')
print('Expanded pointer target areas for small displays and raised field-label contrast.')
