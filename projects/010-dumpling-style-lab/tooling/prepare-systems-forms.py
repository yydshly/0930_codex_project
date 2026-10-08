from pathlib import Path
from PIL import Image, ImageOps
import json, shutil
ROOT=Path(__file__).resolve().parents[1]
manifest=ROOT/'assets/game-forms/systems-generation-20261003.json'
data=json.loads(manifest.read_text(encoding='utf-8'))
folder=ROOT/'assets/game-forms/systems-sources';folder.mkdir(parents=True,exist_ok=True)
report=[]
for entry in data['entries']:
    target=folder/(entry['id']+'.png');shutil.copy2(entry['source'],target);entry['project_source']=str(target)
    destination=ROOT/'web/assets/game-forms'/entry['game'];destination.mkdir(parents=True,exist_ok=True)
    image=Image.open(target)
    if not entry['transparent_background']:
        size=(1024,1024) if entry['asset']=='stone' else (1792,1008)
        ImageOps.fit(image.convert('RGB'),size,method=Image.Resampling.LANCZOS).save(destination/(entry['asset']+'.webp'),quality=94,method=4)
    else:
        names={'partyHeroes':['captain','mage','healer'],'partyEnemies':['sentinel','hound','orb'],'tandemEngineers':['lin','zhou']}[entry['id']]
        image=image.convert('RGBA');assert image.getchannel('A').getextrema()[0]==0
        for i,name in enumerate(names):
            cell=image.crop((round(i*image.width/len(names)),0,round((i+1)*image.width/len(names)),image.height))
            box=cell.getchannel('A').getbbox();assert box,name
            cell=cell.crop((max(0,box[0]-4),max(0,box[1]-4),min(cell.width,box[2]+4),min(cell.height,box[3]+4)))
            cell.thumbnail((720,900),Image.Resampling.LANCZOS);cell.save(destination/(name+'.webp'),quality=94,method=4)
            report.append({'asset':entry['game']+'/'+name,'size':cell.size})
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'notes/systems-assets-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
for game,source in [('party','party/scene.webp'),('tandem','tandem/scene.webp'),('balance','balance/stone.webp'),('district','party/scene.webp')]:
    preview=ROOT/'web/assets/showcase/previews'/(game+'.webp')
    if not preview.exists():ImageOps.fit(Image.open(ROOT/'web/assets/game-forms'/source).convert('RGB'),(720,405),method=Image.Resampling.LANCZOS).save(preview,quality=92,method=4)
print('Copied six sources and prepared three backgrounds/textures and eight transparent runtime sprites.')
