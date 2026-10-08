from pathlib import Path
from PIL import Image,ImageOps
import json, hashlib, shutil

ROOT=Path(__file__).resolve().parents[1]
baseline=ROOT/'notes/navigation-preservation-before-20261003.json'
if not baseline.exists():
    files=[p for folder in ('web/assets','web/versions/painted-20261002') for p in (ROOT/folder).rglob('*') if p.is_file()]
    baseline.write_text(json.dumps({'files':[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]},indent=2),encoding='utf-8')
manifest=ROOT/'assets/game-forms/navigation-generation-20261003.json'
if not manifest.exists():
    print('Prior assets recorded; awaiting new images.')
    raise SystemExit(0)
data=json.loads(manifest.read_text(encoding='utf-8'))
source=ROOT/'assets/game-forms/navigation-sources'
source.mkdir(parents=True,exist_ok=True)
for entry in data['entries']:
    target=source/(entry['id']+'.png');shutil.copy2(entry['source'],target);entry['project_source']=str(target)
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
for name,game,asset in [('flightSky','pilot','sky'),('archiveLobby','archive','lobby'),('archiveWorkshop','archive','workshop'),('archiveObservatory','archive','observatory')]:
    im=Image.open(source/(name+'.png')).convert('RGB');im=ImageOps.fit(im,(2048,1024) if name=='flightSky' else (1792,1008),method=Image.Resampling.LANCZOS)
    folder=ROOT/'web/assets/game-forms'/game;folder.mkdir(exist_ok=True);im.save(folder/(asset+'.webp'),quality=94,method=4)
    if asset in ('sky','lobby'):
        preview=ImageOps.fit(im,(720,405),method=Image.Resampling.LANCZOS);preview.save(ROOT/'web/assets/showcase/previews'/((game)+'.webp'),quality=90)
        if asset=='sky':preview.save(ROOT/'web/assets/showcase/previews/rail.webp',quality=90)
im=Image.open(source/'archiveAtlas.png').convert('RGBA');assert im.getchannel('A').getextrema()[0]==0
names=['key','handle','head','lever','fuse','lens'];report=[]
for index,name in enumerate(names):
    col,row=index%3,index//3;bounds=(round(col*im.width/3),round(row*im.height/2),round((col+1)*im.width/3),round((row+1)*im.height/2));cell=im.crop(bounds);box=cell.getchannel('A').getbbox();assert box,name;cell=cell.crop((max(0,box[0]-4),max(0,box[1]-4),min(cell.width,box[2]+4),min(cell.height,box[3]+4)));cell.thumbnail((460,460),Image.Resampling.LANCZOS);cell.save(ROOT/'web/assets/game-forms/archive'/(name+'.webp'),quality=94,method=4);report.append({'name':name,'cell':bounds,'size':cell.size})
(ROOT/'notes/navigation-assets-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('Prepared panorama, three adventure rooms and six alpha inventory objects')
