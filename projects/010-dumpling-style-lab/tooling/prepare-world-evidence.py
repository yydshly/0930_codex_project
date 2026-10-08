from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, urllib.request
root=Path(__file__).resolve().parents[1]
assets=root/'assets/worlds-product'
rows=[
 ('detective','旧城失物局','雨夜黑色电影 · 调查与归还','detective-street-canvas.png'),
 ('wuxia','山间小驿站','水墨行旅 · 救援与取舍','wuxia-final-canvas.png'),
 ('ecology','小小生态岛','自然微缩 · 水源与演替','ecology-final-canvas.png'),
 ('wasteland','最后一座温室','废土生存 · 维修与分配','wasteland-final-canvas.png'),
 ('dream','记忆渡船','诗性梦境 · 记忆改变通路','dream-final-canvas.png'),
 ('arcade','屋顶快递赛','都市动作 · 跳跃与冲刺','arcade-final-canvas.png'),
 ('inn','七日小旅店','生活叙事 · 接待与回访','inn-stay-canvas.png'),
 ('islands','浮岛探险社','立体幻想 · 工具与探险','islands-final-canvas.png')]
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',22)
small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',15)
title=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',30)
tile_w,tile_h,gap,heading=400,320,12,90
canvas=Image.new('RGB',(4*tile_w+5*gap,2*tile_h+3*gap+heading),'#12252b');draw=ImageDraw.Draw(canvas)
draw.text((24,19),'八个世界 · 实际可玩画面',font=title,fill='#eee4cf')
draw.text((24,59),'每种画风，都有自己能亲手完成的故事与规则',font=small,fill='#a7b6b3')
for i,(id,name,style,source)in enumerate(rows):
    image=Image.open(assets/source).convert('RGB')
    assert image.width>300 and abs(image.width/image.height-1.6)<.02
    thumbnail=image.resize((640,400),Image.Resampling.LANCZOS)
    thumbnail.save(root/'web/assets'/('extension-'+id+'.webp'),'WEBP',quality=90,method=6)
    x=gap+(i%4)*(tile_w+gap);y=heading+gap+(i//4)*(tile_h+gap)
    canvas.paste(image.resize((400,250),Image.Resampling.LANCZOS),(x,y))
    draw.rectangle((x,y+250,x+400,y+320),fill='#20373d')
    draw.text((x+14,y+262),name,font=font,fill='#f0e8d8')
    draw.text((x+14,y+292),style,font=small,fill='#b0c1ba')
canvas.save(assets/'overview.webp','WEBP',quality=92,method=6)

manifest=json.loads((root/'web/assets/worlds/manifest.json').read_text(encoding='utf-8'))
resources=[]
for id in manifest['assets']:
    p=root/'web/assets/worlds'/(id+'.webp')
    with Image.open(p)as image:
        assert image.width>0 and image.height>0
        if image.mode=='RGBA':assert image.getchannel('A').getextrema()[0]==0,id
    with urllib.request.urlopen('http://127.0.0.1:8962/assets/worlds/'+id+'.webp')as response:
        assert response.status==200 and len(response.read())==p.stat().st_size,id
        resources.append({'name':id,'http':200,'bytes':p.stat().st_size})
report={'date':'2026-10-02','generatedSources':len(list((assets/'sources').glob('*-source.png'))),'runtimeAssets':len(resources),'bytes':sum(p['bytes']for p in resources),'allHTTP200':True,'alphaPreserved':True,'screenshots':'Actual CUA browser screenshots; crops and contact sheet only','resources':resources}
(root/'notes/worlds-assets-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items()if k!='resources'},ensure_ascii=False))
