from pathlib import Path
import json,hashlib,shutil
from PIL import Image
P=Path(__file__).resolve().parents[1];f=P/'assets/game-forms/voyages-generation.json';d=json.loads(f.read_text(encoding='utf-8'))
raw=P/'assets/game-forms/voyages-sources';web=P/'web/assets/game-forms/voyages';raw.mkdir(exist_ok=True);web.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for a in d['entries']:
 source=Path(a['source']);target=raw/(a['key']+'.png');runtime=web/(a['key']+'.webp');assert not target.exists() and not runtime.exists();shutil.copy2(source,target)
 with Image.open(source) as im:
  im.save(runtime,format='WEBP',quality=94,method=6);a.update(dimensions=list(im.size),pixel_mode=im.mode)
  if im.mode=='RGBA':
   alpha=im.getchannel('A');a.update(alpha_extrema=list(alpha.getextrema()),alpha_bbox=list(alpha.getbbox()),solid_bbox=list(alpha.point(lambda x:255 if x>200 else 0).getbbox()))
   if a['key']=='messenger':print('Fox alpha probes:',[im.getpixel(pt)[3] for pt in [(0,0),(750,50),(1200,30),(200,400),(100,900),(500,900)]])
 a.update(raw_file=target.relative_to(P).as_posix(),runtime_file=runtime.relative_to(P).as_posix(),raw_sha256=sha(target),runtime_sha256=sha(runtime),conversion='WebP encoding only; original image retained.')
f.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(web/'ATTRIBUTION.md').write_text('Seven original images made with built-in ImageGen. Prompts, edit source, originals, sizes and hashes: assets/game-forms/voyages-generation.json. No reference-game artwork used.\n',encoding='utf-8')
print('Saved original assets:',len(d['entries']))
