from pathlib import Path
from PIL import Image, ImageOps
import json,shutil
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'assets/game-forms/motion-generation-20261003.json').read_text(encoding='utf-8'))
out=ROOT/'web/assets/game-forms/battery';out.mkdir(parents=True,exist_ok=True)
sources={}
for task in data['tasks']:
    dest=ROOT/task['project_source'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(task['source'],dest);sources[task['id']]=dest
scene=Image.open(sources['batteryScene']).convert('RGB');ImageOps.fit(scene,(1792,1008),method=Image.Resampling.LANCZOS).save(out/'scene.webp',quality=94,method=4)
atlas=Image.open(sources['batteryEquipment']).convert('RGBA');records=[]
for i,name in enumerate(('olive','azure','olive-barrel','azure-barrel')):
    box=(round(i*atlas.width/4),0,round((i+1)*atlas.width/4),atlas.height)
    region=atlas.crop(box);alpha=region.getchannel('A');visible=[(x,y) for y in range(region.height) for x in range(region.width) if alpha.getpixel((x,y))>=64];assert visible,name
    bbox=(min(p[0] for p in visible),min(p[1] for p in visible),max(p[0] for p in visible)+1,max(p[1] for p in visible)+1)
    sprite=region.crop(bbox);sprite.thumbnail((720,600),Image.Resampling.LANCZOS);sprite.save(out/(name+'.webp'),quality=96,method=4)
    records.append({'name':name,'region':box,'alphaBox':bbox,'size':sprite.size,'alphaExtrema':sprite.getchannel('A').getextrema()})
(ROOT/'notes/motion-battery-assets-20261003.json').write_text(json.dumps({'sourceSize':atlas.size,'sprites':records},indent=2),encoding='utf-8')
print(json.dumps(records))
