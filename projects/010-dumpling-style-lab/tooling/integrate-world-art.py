from pathlib import Path
import shutil
p=Path(__file__).resolve().parents[1];games=p/'web/games';backup=p/'assets/worlds-product/source-before/games';backup.mkdir(parents=True,exist_ok=True)
def read(name):
    path=games/(name+'.js')
    if not (backup/path.name).exists():shutil.copy2(path,backup/path.name)
    s=path.read_text(encoding='utf-8');assert 'useWorldArt' not in s
    return "import {useWorldArt} from './worlds-art.js?v=1';\n"+s
def write(name,s):
    s=s.replace("'./world-draw.js'","'./world-draw.js?v=2'")
    (games/(name+'.js')).write_text(s,encoding='utf-8')

# Shared characters keep the original feet coordinates, so walking and interaction ranges do not change.
s=read('world-draw');s=s.replace("const c=canvas.getContext('2d');","const c=canvas.getContext('2d'),art=useWorldArt(c,mount.dataset.world);")
s=s.replace("const person=(x,y,coat='#867966',stride=0,parcel=false)=>{", "const person=(x,y,coat='#867966',stride=0,parcel=false)=>{const kind=mount.dataset.world;const name=kind==='wuxia'?({'#805a49':'wuxia-hero','#756557':'merchant','#697c6a':'porter','#967b62':'messenger'}[coat]||'wuxia-hero'):kind==='wasteland'?({'#a19278':'ferryman','#758387':'ecologist'}[coat]||'survivor'):null;if(name&&art.ready(name)){art.shadow(x,y,15,.2);art.sprite(name,x,y,kind==='wuxia'?82:87,{bob:stride?Math.sin(stride)*1.4:0});return}")
s=s.replace('return {canvas,c,rect,poly,line,ellipse,text,person,point};','return {canvas,c,rect,poly,line,ellipse,text,person,point,art};');write('world-draw',s)

s=read('detective');s=s.replace("const c=element.getContext('2d');", "const c=element.getContext('2d'),art=useWorldArt(c,'detective');")
s=s.replace("function adult(x,y,type='agent',scale=1){", "function adult(x,y,type='agent',scale=1){if(art.ready(type)){art.shadow(x,y,18*scale,.35);art.sprite(type,x,y,119*scale,{bob:type==='agent'&&state.walk?Math.sin(time*9)*1.6:Math.sin(time*1.3)*.3,flip:type==='agent'&&state.walk?.x<x});return}")
s=s.replace("function city(){", "function city(){if(art.background('detective-street')){paintedCity();return}")
s=s.replace("function office(){", "function office(){if(art.background('detective-office')){paintedOffice();return}")
insert='''
  function tag(t,x,y){c.save();c.font='12px "Microsoft YaHei",sans-serif';const w=c.measureText(t).width+20;rect(x-w/2,y-17,w,24,'#101820bf','#afb5a240');text(t,x,y,12,'#e1dfc9','center');c.restore()}
  function paintedCity(){tag('旧电影院',260,260);tag('剪辑室',575,263);tag('南岸码头',823,297);tag('失物局 ←',67,361);
    rect(391,502,46,21,'#d8c8a8','#665f50');line([[398,507],[428,510]],'#756953');line([[398,515],[424,518]],'#8d7d61');tag('交接单',415,548);
    rect(620,258,42,31,'#c4c1b1','#918a76');line([[626,280],[638,265],[650,277],[657,267]],'#414b49',2);tag('工作样片',641,316);
    for(const [x,y,who]of[[320,454,'shen'],[562,458,'lin'],[790,461,'ji']]){adult(x,y,who);tag(NAMES[who].split(' · ')[0],x,y-134)}
    for(let i=0;i<150;i++){const x=(noise(i+80)*1100-time*87)%1100,y=(noise(i+610)*700+time*375)%700;line([[x,y],[x-7,y+24]],'#d6e0e21a',1)}
  }
  function paintedOffice(){glow(464,306,130,.15);ellipse(318,289,39,10,'#050b11b0');ellipse(318,282,39,12,'#c5c5b5');ellipse(318,280,31,9,'#6e7975');for(let i=0;i<3;i++)ellipse(301+i*17,280,5,3,'#243333');tag('旧电影盒',318,321);
    rect(598,271,84,37,'#d7cdb0','#797868');for(let i=0;i<3;i++)line([[605,278+i*8],[670-i*6,278+i*8]],'#938971');tag('器材簿',642,337);
    rect(100,291,69,24,'#61736b','#98aa96');rect(107,294,54,16,'#d9d0b0');tag('案件簿',134,345);tag('雨巷 →',868,337);
    const cols=Object.keys(EVIDENCE);for(let i=0;i<cols.length;i++){const id=cols[i],x=287+i*118;if(!state.clues[id])continue;const active=state.selectedEvidence.includes(id);rect(x-55,529,110,45,active?'#cec5aa':'#14232bea',active?'#f5e8c0':'#8a9e9855');text(EVIDENCE[id],x,556,13,active?'#253332':'#dadcc6','center')}text('证据桌 · 选两件，再对照',474,518,12,'#c9cbb6','center');
    if(state.phase==='returned'){adult(380,473,'lin');tag('托管回执已签',475,448)}
  }
'''
s=s.replace('  function draw(){',insert+'  function draw(){')
s=s.replace("id:'film',x:318,y:378,w:86,h:56", "id:'film',x:318,y:art.ready('detective-office')?285:378,w:86,h:56")
s=s.replace("id:'ledger',x:641,y:377,w:90,h:60", "id:'ledger',x:641,y:art.ready('detective-office')?292:377,w:90,h:60")
s=s.replace("id:'casebook',x:133,y:368,w:83,h:74", "id:'casebook',x:133,y:art.ready('detective-office')?304:368,w:83,h:74")
write('detective',s)

s=read('wuxia');s=s.replace('text,person}=d','text,person,art}=d')
start=s.index("rect(0,0,960,600,'#e8e5d8');");end=s.index(" for(const [a,b]of roads)",start)
s=s[:start]+"if(!art.background('wuxia-landscape')){"+s[start:end]+"}"+s[end:]
write('wuxia',s)

s=read('wasteland');s=s.replace('text,person}=d','text,person,art}=d')
start=s.index("const w=weather(),f=forecast(),sky=");end=s.index('for(let i=0;i<74;i++)',start)
prefix=s[start:end].replace('const w=weather(),f=forecast(),sky=', 'const sky=')
s=s[:start]+"const w=weather(),f=forecast();if(!art.background('wasteland-horizon')){"+prefix+"}"+s[end:]
start=s.index("ellipse(463,507,378,40,");end=s.index("if(!s.devices.seal)",start)
s=s[:start]+"if(!art.image('wasteland-frame',119,133,721,356)){"+s[start:end]+"}"+s[end:]
write('wasteland',s)

s=read('arcade');s=s.replace('text,person}=d','text,person,art}=d')
start=s.index('const sky=c.createLinearGradient');end=s.index(' for(let i=0;i<35;i++)',start)
s=s[:start]+"if(!art.background('arcade-city',camera*.12)){"+s[start:end]+"}"+s[end:]
s=s.replace("person(s.player.x,s.player.y,'#c18c77',stride,s.status!=='delivered');", "const pose=dash>0?3:!s.player.grounded?2:Math.abs(s.player.vx)>1?1:0;art.shadow(s.player.x,s.player.y,13,.32);if(!art.sprite('runner-'+pose,s.player.x,s.player.y,78,{flip:s.player.facing<0,bob:s.player.grounded&&Math.abs(s.player.vx)>1?Math.sin(stride)*1.1:0}))person(s.player.x,s.player.y,'#c18c77',stride,s.status!=='delivered');")
write('arcade',s)

s=read('dream');s=s.replace("const c=canvas.getContext('2d');", "const c=canvas.getContext('2d'),art=useWorldArt(c,'dream');")
s=s.replace("function atmosphere(){", "function atmosphere(){if(art.background('dream-water')){for(let i=0;i<30;i++){const y=300+i*10,x=590+Math.sin(s.time*.5+i)*35,w=12+i*2;line(x-w,y,x+w,y,'#cfddbe20',i%4===0?2:1)}for(let i=0;i<8;i++){const x=90+i*107+Math.sin(s.time*.2+i)*10,y=210-((s.time*4+i*31)%153);c.save();c.translate(x,y);c.rotate(Math.sin(s.time*.2+i)*.2);rect(-6,-9,12,18,'#c4cdc232',1);c.restore()}return}")
s=s.replace("function person(x,y,facing=0,walker=false,coat='#a37f63'){", "function person(x,y,facing=0,walker=false,coat='#a37f63'){const name=coat==='#344c57'?'ferryman':'traveler';if(art.ready(name)){art.shadow(x,y,15,.3);art.sprite(name,x,y,91,{flip:walker&&Math.cos(facing)<0,bob:walker?Math.sin(stride)*1.2:Math.sin(s.time*1.2)*.4});if(s.holding&&name==='traveler'){c.save();c.translate(x,y);drawMemory(mem(s.holding),{x:17,y:-39},.65);c.restore()}return}")
# Retain the same rectangle footprints while adding light and material to the live puzzle platforms.
s=s.replace("function ground(x,y,w,h){poly", "function ground(x,y,w,h){const shade=c.createLinearGradient(0,y,0,y+h);shade.addColorStop(0,'#53767a');shade.addColorStop(1,'#294e58');poly")
s=s.replace("[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],'#547276'", "[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],shade")
write('dream',s)

s=read('ecology');s=s.replace("const ctx=canvas.getContext('2d');", "const ctx=canvas.getContext('2d'),art=useWorldArt(ctx,'ecology');")
start=s.index("ctx.fillStyle='#e9e8dd';");end=s.index("  ctx.beginPath();ctx.moveTo(298,162)",start)
old=s[start:end]
s=s[:start]+"if(!art.background('ecology-terrain')){"+old+"}else{ctx.fillStyle='#f4f4e8dd';ctx.fillRect(24,22,912,104);text('小小生态岛',45,60,25,'#385840','Georgia');text('第'+s.year+'年 · '+(s.complete?'三季记录完成':SEASONS[s.season].name)+'  /  水闸 '+GATES[s.gate].name,47,88,12);text('劳动 '+s.labor+' / 3 · 每次干预影响下一季',47,111,11,'#617b60');}"+s[end:]
for name,height in [('reed',"p.age?68:39"),('flower',"p.age?52:29"),('tree',"p.age?Math.min(108,57+p.age*13):42")]:
    plant={'reed':'reed','flower':'flowers','tree':'wood'}[name]
    s=s.replace('function '+name+'(p){', 'function '+name+"(p){const stage=p.health===0?2:p.age?1:0;if(art.sprite('"+plant+"-'+stage,p.x+Math.sin(s.time*1.1)*.6,p.y+12,"+height+"))return;")
start=s.index("const a=s.avatar,bob=");end=s.index("if(s.work){text",start)
old=s[start:end];a=old.index('ellipse(a.x')
s=s[:start]+old[:a]+"if(art.ready('ecologist')){art.shadow(a.x,a.y,9,.2);art.sprite('ecologist',a.x,a.y,59,{bob})}else{"+old[a:]+"}"+s[end:]
write('ecology',s)

s=read('inn');s=s.replace("const c=canvas.getContext('2d');", "const c=canvas.getContext('2d'),art=useWorldArt(c,'inn');")
s=s.replace("function actor(x,y,type,scale=1,mode='idle'){", "function actor(x,y,type,scale=1,mode='idle'){const activity=['tea','read','sketch'].includes(mode),name=activity?type+'-activity':type;const walking=type!=='keeper'&&Math.hypot(guestAim.x-guest.x,guestAim.y-guest.y)>4;if(art.ready(name)){art.shadow(x,y,14*scale,.2);art.sprite(name,x,y,(activity?91:111)*scale,{bob:walking?Math.sin(time*8)*1.4:Math.sin(time*1.3)*.25});if(mode==='uneasy')text('…',x+25,y-79,18,'#70533c','center');return}")
s=s.replace("function room(room,x){", "function room(room,x){if(art.ready('inn-interior')){if(state.furnishings.plant===room)plant(x+130,216,.76);if(state.furnishings.tea===room)teaTable(x+75,261,.72);if(state.furnishings.books===room)bookshelf(x+318,212,.72);rounded(x+112,111,124,23,4,'#f1e3c4d9');text(ROOM_NAMES[room],x+174,127,12,'#72593f','center');if(state.selected===room){c.strokeStyle='#cfac7166';c.lineWidth=2;c.strokeRect(x-2,110,342,186)}if(state.phase==='stay'&&state.current.room===room){rounded(x+8,115,61,20,4,'#d9e3bce8');text('已入住',x+38,129,10,'#607046','center')}return}")
start=s.index('const sky=c.createLinearGradient',s.index('function draw()'));end=s.index("    actor(state.keeper.x",start)
old=s[start:end]
painted="""if(art.background('inn-interior')){room('window',100);room('quiet',520);const fire=c.createRadialGradient(310,384,4,310,384,82);fire.addColorStop(0,'#ffd38422');fire.addColorStop(1,'#ffd38400');c.fillStyle=fire;c.fillRect(228,302,164,164);for(let i=0;i<3;i++){const x=301+i*10,h=11+Math.sin(time*3+i)*4;path([[x,388],[x+3,388-h]],'#f2c178bb',4)}for(let i=0;i<state.souvenirs.length;i++){const x=591+(i%6)*20;rounded(x,366-(i>=6?10:0),14,8,2,['#b38c69','#a1a982','#8b9caa'][i%3])}rounded(748,334,92,55,5,'#f1e4c6e0');text('第 '+state.day+' 日',794,357,16,'#77563c','center');text(visit().occasion,794,378,9,'#957356','center');text('每一次停留，都留下记忆',480,476,12,'#9c7b51','center');}else{"""
s=s[:start]+painted+old+"}"+s[end:];write('inn',s)
print('Connected live game worlds to original art; preserved fallback drawings and saves.')
