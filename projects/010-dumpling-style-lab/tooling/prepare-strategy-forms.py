from pathlib import Path
from PIL import Image
from collections import deque
import numpy as np
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'web/assets/game-forms';SOURCE=ROOT/'assets/game-forms/strategy-sources';SOURCE.mkdir(parents=True,exist_ok=True)
before=ROOT/'notes/strategy-preservation-before-20261003.json'
if not before.exists():
    files=[p for folder in ('web/assets','web/versions/painted-20261002') for p in (ROOT/folder).rglob('*') if p.is_file()]
    before.write_text(json.dumps({'files':[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]},indent=2),encoding='utf-8')
manifest_path=ROOT/'assets/game-forms/strategy-generation-20261003.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
names={'commandScene':'exec-47c8406d-f135-46de-bd68-bf9877f376ba.png','bastionScene':'exec-f6082e4e-89cb-4451-b367-fc6acdb17c64.png','tacticsScene':'exec-ba7828d2-cd49-43ad-8490-17bf56b2679e.png','strategyAtlas':'exec-bae8795b-fee2-480e-a67c-ff0cdb524a6b.png'}
for entry in manifest['entries']:
    src=Path('D:/codex/home/generated_images/01a0f829-1d38-7672-a112-e0a52908ac0c')/names[entry['id']]
    target=SOURCE/(entry['id']+'.png');shutil.copy2(src,target);entry.update(source=str(src),project_source=str(target))
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
for game in ('command','bastion','tactics'):
    target=PUBLIC/game;target.mkdir(parents=True,exist_ok=True)
    im=Image.open(SOURCE/(game+'Scene.png')).convert('RGB');im.thumbnail((1800,1800),Image.Resampling.LANCZOS);im.save(target/'scene.webp',quality=94,method=4)
    im.thumbnail((720,405),Image.Resampling.LANCZOS);im.save(ROOT/'web/assets/showcase/previews'/(game+'.webp'),quality=90)
im=Image.open(SOURCE/'strategyAtlas.png').convert('RGBA');assert im.getchannel('A').getextrema()[0]==0
scale=4;mask=np.array(im.getchannel('A').resize((im.width//scale,im.height//scale),Image.Resampling.BOX))>40
boxes=[]
for sy,sx in np.argwhere(mask):
    if not mask[sy,sx]:continue
    queue=deque([(int(sy),int(sx))]);mask[sy,sx]=False;left=right=int(sx);top=bottom=int(sy);area=0
    while queue:
        y,x=queue.popleft();area+=1;left=min(left,x);right=max(right,x);top=min(top,y);bottom=max(bottom,y)
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx]:mask[ny,nx]=False;queue.append((ny,nx))
    if area>220:boxes.append((left*scale,top*scale,(right+1)*scale,(bottom+1)*scale))
assert len(boxes)==16,(im.size,boxes)
boxes.sort(key=lambda b:(int((b[1]+b[3])/2/im.height*4),(b[0]+b[2])/2))
target=PUBLIC/'strategy';target.mkdir(exist_ok=True)
sprites=['rover','drone','base','walker','beacon','outpost','ore','wagon','bolt','frost','mortar','beetle','guard','scout','medic','raider'];report=[]
for name,box in zip(sprites,boxes):
    crop=(max(0,box[0]-4),max(0,box[1]-4),min(im.width,box[2]+4),min(im.height,box[3]+4));asset=im.crop(crop);asset.thumbnail((500,500),Image.Resampling.LANCZOS);asset.save(target/(name+'.webp'),quality=94,method=4);report.append({'name':name,'crop':crop,'size':asset.size})
(ROOT/'notes/strategy-assets-20261003.json').write_text(json.dumps({'sprites':report},indent=2),encoding='utf-8')
print('Prepared three original maps and',len(report),'transparent miniature assets')
