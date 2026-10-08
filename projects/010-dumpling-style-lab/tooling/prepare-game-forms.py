from pathlib import Path
from PIL import Image
import json
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/game-forms/sources'
DEST=ROOT/'web/assets/game-forms/breach'
DEST.mkdir(parents=True,exist_ok=True)
for name in ['harbor','reactor']:
    im=Image.open(SOURCE/(name+'.png')).convert('RGB')
    im.thumbnail((1680,945),Image.Resampling.LANCZOS)
    im.save(DEST/(name+'.webp'),quality=93,method=4)
atlas=Image.open(SOURCE/'sprites.png').convert('RGBA')
assert atlas.size==(1448,1086) and atlas.getchannel('A').getextrema()[0]==0
# Different silhouettes cross the requested equal grid. Crop complete figures
# using inspected source regions instead of chopping into equal cells.
regions={
 'idle':(0,0,362,426),'run-a':(362,0,730,426),'run-b':(730,0,1095,426),'jump':(1095,0,1448,340),
 'crouch':(0,430,362,787),'drone':(362,430,718,787),'turret':(718,430,1095,787),'boss':(1095,340,1448,787),
 'crate':(0,795,362,1086),'power':(400,787,635,1086),'platform':(635,797,1170,1086),'shield':(1170,787,1448,1086)
}
report=[]
for name,region in regions.items():
    im=atlas.crop(region);box=im.getchannel('A').point(lambda a:255 if a>48 else 0).getbbox()
    assert box,name
    x0,y0,x1,y1=box;box=(max(0,x0-2),max(0,y0-2),min(im.width,x1+2),min(im.height,y1+2))
    im=im.crop(box);im.thumbnail((500,480),Image.Resampling.LANCZOS);im.save(DEST/(name+'.webp'),quality=94,method=4)
    report.append(dict(name=name,region=region,crop=box,size=im.size,alpha=im.getchannel('A').getextrema()))
(ROOT/'notes/game-forms-assets-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('Prepared 14 original run-and-gun assets without repainting or replacing alpha.')
