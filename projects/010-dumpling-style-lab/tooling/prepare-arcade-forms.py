"""Copy original generated art and prepare transparent runtime sprites."""
from pathlib import Path
from PIL import Image
import json, shutil, urllib.request, zipfile
import numpy as np
from collections import deque

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/game-forms/arcade-sources'
PUBLIC = ROOT / 'web/assets/game-forms'
SOURCE.mkdir(parents=True, exist_ok=True)
generation = json.loads((ROOT / 'assets/game-forms/arcade-generation-20261003.json').read_text(encoding='utf-8'))
for asset in generation['assets']:
    shutil.copy2(asset['source'], SOURCE / (asset['id'] + '.png'))

report = []
def scene(source, game, name):
    destination = PUBLIC / game
    destination.mkdir(parents=True, exist_ok=True)
    im = Image.open(SOURCE / (source + '.png')).convert('RGB')
    im.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
    im.save(destination / (name + '.webp'), quality=94, method=4)

def atlas(source, game, names, rows, cols):
    im = Image.open(SOURCE / (source + '.png')).convert('RGBA')
    assert im.getchannel('A').getextrema()[0] == 0, 'Source must contain genuine alpha'
    # Locate whole silhouettes, so irregular generated gutters do not cut limbs.
    scale = 4
    alpha = im.getchannel('A')
    mask = np.array(alpha.resize((im.width//scale, im.height//scale), Image.Resampling.BOX)) > 40
    boxes = []
    for sy,sx in np.argwhere(mask):
        if not mask[sy,sx]: continue
        queue = deque([(int(sy),int(sx))]); mask[sy,sx] = False
        left=right=int(sx); top=bottom=int(sy); area=0
        while queue:
            y,x=queue.popleft(); area+=1
            left=min(left,x); right=max(right,x); top=min(top,y); bottom=max(bottom,y)
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=y+dy,x+dx
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx]:
                    mask[ny,nx]=False; queue.append((ny,nx))
        if area > 220:
            boxes.append((left*scale,top*scale,(right+1)*scale,(bottom+1)*scale))
    assert len(boxes) == len(names), (source, im.size, boxes)
    boxes.sort(key=lambda b: (int(((b[1]+b[3])/2) / im.height * rows), (b[0]+b[2])/2))
    destination = PUBLIC / game
    destination.mkdir(parents=True, exist_ok=True)
    for name, box in zip(names, boxes):
        x0,y0,x1,y1 = box
        crop = (max(0,x0-4),max(0,y0-4),min(im.width,x1+4),min(im.height,y1+4))
        sprite = im.crop(crop)
        sprite.thumbnail((540, 510), Image.Resampling.LANCZOS)
        sprite.save(destination / (name+'.webp'), quality=94, method=4)
        report.append({'game':game, 'name':name, 'source':source, 'crop':crop, 'size':sprite.size})

scene('alley', 'brawler', 'street')
atlas('brawler-atlas', 'brawler', ['idle','walk-a','walk-b','jab','hook','kick','jump','hurt','enemy','enemy-attack','heavy','heavy-attack'], 3, 4)
scene('ocean', 'skyline', 'ocean')
atlas('flight-atlas', 'skyline', ['plane','bank-left','bank-right','fighter','bomber','carrier','supply','cloud'], 2, 4)

url = 'https://kenney.nl/media/pages/assets/racing-kit/933b8fd9fd-1677580949/kenney_racing-kit.zip'
archive = SOURCE / 'kenney-racing-kit.zip'
if not archive.exists():
    req = urllib.request.Request(url, headers={'User-Agent':'GameStyleLab/1.0'})
    with urllib.request.urlopen(req, timeout=90) as response:
        archive.write_bytes(response.read())
destination = PUBLIC / 'coast'
destination.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(archive) as z:
    extracted = []
    for name in z.namelist():
        if name.lower().endswith('.glb') or name.endswith('/Textures/colormap.png') or 'license' in Path(name).name.lower():
            target = destination / ('Textures' if '/Textures/' in name else '') / Path(name).name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(z.read(name))
            extracted.append(str(target.relative_to(destination)))
(ROOT / 'notes/arcade-forms-assets-20261003.json').write_text(json.dumps({'generated':report,'racing':{'url':url,'source':'https://kenney.nl/assets/racing-kit','license':'CC0-1.0','files':extracted}}, indent=2), encoding='utf-8')
print('Original sprites prepared:', len(report))
print('Racing kit:', ', '.join(extracted))
