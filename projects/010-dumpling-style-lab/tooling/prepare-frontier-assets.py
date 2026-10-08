from pathlib import Path
import json,re,hashlib,shutil
from PIL import Image
P=Path(__file__).resolve().parents[1];f=P/'assets/game-forms/frontier-generation-20261004.json';d=json.loads(f.read_text(encoding='utf-8'))
raw=P/'assets/game-forms/frontier-sources';web=P/'web/assets/game-forms/frontier';raw.mkdir(exist_ok=True);web.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for a in d['assets']:
 source=Path(re.search(r'as (D:\\[^\n]+?\.png)',a['output_hint']).group(1));target=raw/(a['key']+'.png');assert not target.exists();shutil.copy2(source,target)
 runtime=web/(a['key']+'.webp')
 with Image.open(source) as im:
  im.save(runtime,format='WEBP',quality=94,method=6);a.update(dimensions=list(im.size),mode=im.mode)
  if im.mode=='RGBA':a['alpha_extrema']=list(im.getchannel('A').getextrema())
 a.update(raw_file=target.relative_to(P).as_posix(),raw_sha256=sha(target),runtime_file=runtime.relative_to(P).as_posix(),runtime_sha256=sha(runtime),conversion='WebP encoding only; no repainting or compositing of the art.')
f.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(web/'ATTRIBUTION.md').write_text('Ten original environment, panel, sprite and material assets made with built-in ImageGen. Full prompts, source PNGs and hashes: assets/game-forms/frontier-generation-20261004.json. Three-dimensional scenes also reuse original limestone material from assets/game-forms/roll/limestone.webp; its existing source and attribution are preserved.\n',encoding='utf-8')
print('Original frontier assets:',len(d['assets']))
