from pathlib import Path
from PIL import Image,ImageOps
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1]
baseline=ROOT/'notes/completion-preservation-before-20261003.json'
if not baseline.exists():
    files=[p for folder in ('web/assets','web/versions/painted-20261002') for p in (ROOT/folder).rglob('*') if p.is_file()]
    baseline.write_text(json.dumps({'files':[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]},indent=2),encoding='utf-8')
manifest=ROOT/'assets/game-forms/completion-generation-20261003.json'
if not manifest.exists():
    print('Existing assets recorded. Awaiting artwork.')
    raise SystemExit(0)
data=json.loads(manifest.read_text(encoding='utf-8'));folder=ROOT/'assets/game-forms/completion-sources';folder.mkdir(parents=True,exist_ok=True)
for e in data['entries']:
    target=folder/(e['id']+'.png');shutil.copy2(e['source'],target);e['project_source']=str(target)
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
for name,game,asset in [('cargoRoom','cargo','room'),('jewelRoom','jewel','room'),('realmMap','realm','map'),('novelStation','novel','station'),('novelControl','novel','control')]:
    src=folder/(name+'.png')
    if not src.exists():continue
    dest=ROOT/'web/assets/game-forms'/game;dest.mkdir(parents=True,exist_ok=True)
    im=ImageOps.fit(Image.open(src).convert('RGB'),(1792,1008),method=Image.Resampling.LANCZOS);im.save(dest/(asset+'.webp'),quality=94,method=4)
    preview=ImageOps.fit(im,(720,405),method=Image.Resampling.LANCZOS);preview.save(ROOT/'web/assets/showcase/previews'/(game+'.webp'),quality=92)
report=[]
for name,game,names,cols,rows in [('cargoAtlas','cargo',['crate','worker','plate','wall'],2,2),('jewelAtlas','jewel',['amber','jade','rose','violet','blue','pearl'],3,2),('novelAtlas','novel',['lin','zhou'],2,1)]:
    src=folder/(name+'.png')
    if not src.exists():continue
    im=Image.open(src).convert('RGBA');assert im.getchannel('A').getextrema()[0]==0,name
    dest=ROOT/'web/assets/game-forms'/game;dest.mkdir(parents=True,exist_ok=True)
    for i,item in enumerate(names):
        col,row=i%cols,i//cols;cell=im.crop((round(col*im.width/cols),round(row*im.height/rows),round((col+1)*im.width/cols),round((row+1)*im.height/rows)));box=cell.getchannel('A').getbbox();assert box,item
        cell=cell.crop((max(0,box[0]-4),max(0,box[1]-4),min(cell.width,box[2]+4),min(cell.height,box[3]+4)));cell.thumbnail((900,1000) if game=='novel' else (460,460),Image.Resampling.LANCZOS);cell.save(dest/(item+'.webp'),quality=94,method=4);report.append({'asset':game+'/'+item,'size':cell.size})
(ROOT/'notes/completion-assets-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('Prepared available completion artwork')
