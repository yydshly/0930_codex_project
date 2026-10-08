from pathlib import Path
import json,hashlib,shutil
from PIL import Image
P=Path(__file__).resolve().parents[1]
f=P/'assets/game-forms/horizons-generation.json';d=json.loads(f.read_text(encoding='utf-8'))
raw=P/'assets/game-forms/horizons-sources';web=P/'web/assets/game-forms/horizons'
raw.mkdir(exist_ok=True);web.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for a in d['entries']:
 source=Path(a['source']);target=raw/(a['key']+'.png');runtime=web/(a['key']+'.webp')
 assert not target.exists() and not runtime.exists()
 shutil.copy2(source,target)
 with Image.open(source) as im:
  im.save(runtime,format='WEBP',quality=94,method=6)
  a.update(dimensions=list(im.size),pixel_mode=im.mode)
  if im.mode=='RGBA':a.update(alpha_extrema=list(im.getchannel('A').getextrema()),alpha_bbox=list(im.getchannel('A').getbbox()))
 a.update(raw_file=target.relative_to(P).as_posix(),runtime_file=runtime.relative_to(P).as_posix(),raw_sha256=sha(target),runtime_sha256=sha(runtime),conversion='WebP encoding only; original art retained without repainting.')
f.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(web/'ATTRIBUTION.md').write_text('Seven original assets made with built-in ImageGen. Complete prompts, edit provenance, source PNG paths and hashes: assets/game-forms/horizons-generation.json. No third-party game art.\n',encoding='utf-8')
print('Saved original assets:',len(d['entries']))
