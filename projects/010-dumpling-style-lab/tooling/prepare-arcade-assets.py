import hashlib, json, shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
shared = {'showcase.js','showcase-catalog.js','game-forms-catalog.js','forms.js','forms.html','showcase.html'}
baseline_path = ROOT/'notes/arcade-preservation-before-20261004.json'
if not baseline_path.exists():
    baseline = {str(p.relative_to(ROOT/'web')).replace('\\','/'): hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'web').rglob('*') if p.is_file() and str(p.relative_to(ROOT/'web')).replace('\\','/') not in shared}
    baseline_path.write_text(json.dumps({'intentional_shared':sorted(shared),'files':baseline},indent=2),encoding='utf-8')
manifest_path = ROOT/'assets/game-forms/arcade-generation-20261004.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
for asset in manifest['assets']:
    raw, runtime = ROOT/asset['raw'], ROOT/asset['runtime']
    raw.parent.mkdir(parents=True,exist_ok=True)
    runtime.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(asset['source'],raw)
    with Image.open(raw) as im:
        # Encode only; preserve the pixels' layout, generated alpha and source dimensions.
        im.save(runtime,format='WEBP',quality=94,method=6)
        asset['dimensions'] = list(im.size)
        if im.mode=='RGBA':
            asset['alpha_bbox'] = list(im.getchannel('A').getbbox())
    asset['source_sha256'] = hashlib.sha256(raw.read_bytes()).hexdigest()
    asset['runtime_sha256'] = hashlib.sha256(runtime.read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'role':a['role'],'size':a['dimensions'],'bbox':a.get('alpha_bbox'),'bytes':(ROOT/a['runtime']).stat().st_size} for a in manifest['assets']],indent=2))
