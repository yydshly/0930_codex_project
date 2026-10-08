from pathlib import Path
from PIL import Image
import json,hashlib,shutil
P=Path(__file__).resolve().parents[1];A=P/'assets/game-forms/exchange-sources';W=P/'web/assets/game-forms/exchange'
A.mkdir(parents=True,exist_ok=True);W.mkdir(parents=True,exist_ok=True);(W/'previews').mkdir(exist_ok=True)
records=[];atlas={}
for spec in json.loads((P/'tooling/exchange-asset-inputs.json').read_text(encoding='utf-8')):
 key=spec['key'];source=Path(spec['source']);target=A/(key+'.png');runtime=W/(key+'.webp');assert not target.exists();shutil.copy2(source,target);im=Image.open(target);im.save(runtime,quality=95,method=6)
 alpha=im.getchannel('A') if im.mode=='RGBA' else None
 rec={**spec,'source_png':target.relative_to(P).as_posix(),'runtime_webp':runtime.relative_to(P).as_posix(),'dimensions':im.size,'mode':im.mode,'alpha_extrema':alpha.getextrema() if alpha else None,'source_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'runtime_sha256':hashlib.sha256(runtime.read_bytes()).hexdigest()};records.append(rec)
 if key in ['pack-items','auction-lots']:
  cols=3;rows=2 if key=='pack-items' else 1;frames=[]
  if not alpha or alpha.getextrema()[0]>0:raise SystemExit('Transparent atlas alpha missing: '+key)
  for y in range(rows):
   for x in range(cols):
    cell=(round(x*im.width/cols),round(y*im.height/rows),round((x+1)*im.width/cols),round((y+1)*im.height/rows));box=alpha.crop(cell).point(lambda p:255 if p>24 else 0).getbbox();assert box
    frames.append([box[0]+cell[0],box[1]+cell[1],box[2]-box[0],box[3]-box[1]])
  atlas[key]=frames
(P/'assets/game-forms/exchange-generation.json').write_text(json.dumps({'mode':'built-in image_gen','images':records,'atlas_frames':atlas,'transform':'Original PNG copied unchanged; WebP format conversion; sprite rectangles derived from alpha only.'},ensure_ascii=False,indent=2),encoding='utf-8')
(W/'atlas.json').write_text(json.dumps(atlas),encoding='utf-8');print(json.dumps([{'key':r['key'],'mode':r['mode'],'alpha':r['alpha_extrema']} for r in records]))
