from pathlib import Path
import json,re,shutil,hashlib
from PIL import Image
P=Path(__file__).resolve().parents[1];M=P/'assets/game-forms/voyages-generation.json';manifest=json.loads(M.read_text(encoding='utf-8'))
for entry in json.loads((P/'assets/game-forms/voyages-detail-requests.json').read_text(encoding='utf-8')):
 key=entry['key'];hint=entry['result']['output_hint'];source=Path(re.search(r'as (D:.*?\.png) by default',hint).group(1));raw=P/f'assets/game-forms/voyages-sources/{key}.png';runtime=P/f'web/assets/game-forms/voyages/{key}.webp';assert not raw.exists() and not runtime.exists();shutil.copy2(source,raw)
 with Image.open(raw) as im:
  dimensions=list(im.size);mode=im.mode;im.save(runtime,format='WEBP',quality=95,method=6)
 manifest['entries'].append({'key':key,'prompt':entry['prompt'],'transparent':False,'output_hint':hint,'source':str(source),'referenced_source':'assets/game-forms/voyages-sources/panorama.png','dimensions':dimensions,'pixel_mode':mode,'raw_file':raw.relative_to(P).as_posix(),'raw_sha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'runtime_file':runtime.relative_to(P).as_posix(),'runtime_sha256':hashlib.sha256(runtime.read_bytes()).hexdigest()})
M.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');print('Saved three directional detail tiles; originals preserved')
