import hashlib, json, shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'assets/game-forms/observation-generation-20261004.json'
manifest=json.loads(path.read_text(encoding='utf-8'))
for asset in manifest['assets']:
    raw,runtime=ROOT/asset['raw'],ROOT/asset['runtime']
    raw.parent.mkdir(parents=True,exist_ok=True)
    runtime.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(asset['source'],raw)
    with Image.open(raw) as im:
        im.save(runtime,format='WEBP',quality=94,method=6)
        asset['dimensions']=list(im.size)
        if im.mode=='RGBA':asset['alpha_bbox']=list(im.getchannel('A').getbbox())
    asset['source_sha256']=hashlib.sha256(raw.read_bytes()).hexdigest()
    asset['runtime_sha256']=hashlib.sha256(runtime.read_bytes()).hexdigest()
path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'role':a['role'],'dimensions':a['dimensions'],'bbox':a.get('alpha_bbox')} for a in manifest['assets']],indent=2))
