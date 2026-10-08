from pathlib import Path
from PIL import Image,ImageOps
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
reports=[f'motion-{name}-check-20261003.json' for name in ('putt','signal','angler','battery','shell')]
checks=[];results={};errors=[];missing=[]
for name in reports:
    data=json.loads((ROOT/'notes'/name).read_text(encoding='utf-8'));assert data.get('passed'),name
    checks.extend(data['checks']);results[name.split('-')[1]]=data.get('results',data.get('result'));errors.extend(data.get('errors',[]));missing.extend(data.get('missing',[]))
assert not errors and not missing
generic=json.loads((ROOT/'notes/motion-regression-check-20261003.json').read_text(encoding='utf-8'));assert not generic['errors'] and not generic['missing'];assert any('All 40 presentation' in c for c in generic['checks'])
for game in ('putt','signal','angler','battery'):
    source=ROOT/'assets/game-forms/motion-qa'/(game+'-playable.png');img=Image.open(source).convert('RGB')
    if game=='angler' and img.height>img.width*9/16:img=img.crop((0,0,img.width,round(img.width*9/16)))
    ImageOps.fit(img,(720,405),method=Image.Resampling.LANCZOS).save(ROOT/'web/assets/showcase/previews'/(game+'.webp'),quality=92,method=4)
before=json.loads((ROOT/'notes/motion-preservation-before-20261003.json').read_text(encoding='utf-8'));changed=[]
for entry in before['files']:
    p=ROOT/entry['path']
    if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=entry['sha256']:changed.append(entry['path'])
preservation={'passed':not changed,'verifiedExistingFiles':len(before['files']),'changed':changed,'forms':40,'entries':49,'pending':0}
(ROOT/'notes/motion-preservation-20261003.json').write_text(json.dumps(preservation,indent=2),encoding='utf-8');assert not changed,changed
combined={'passed':True,'method':'Fresh real keyboard, pointer and touchscreen UI runs with read-only state observations, no injected game progress. Per-game source reports retained.','forms':40,'entries':49,'checks':checks,'results':results,'errors':errors,'missing':missing,'sourceReports':['notes/'+name for name in reports],'regressionReport':'notes/motion-regression-check-20261003.json','preservationReport':'notes/motion-preservation-20261003.json','actualGameplayPreviews':['web/assets/showcase/previews/'+game+'.webp' for game in ('putt','signal','angler','battery')],'artworkMode':'built-in image_gen for battery; authored Kenney CC0 GLB plus original interaction geometry for 3D games','artworkManifest':'assets/game-forms/motion-generation-20261003.json','modelManifests':['assets/game-forms/motion-'+name+'-sources.json' for name in ('putt','signal','angler')]}
(ROOT/'notes/motion-forms-check-20261003.json').write_text(json.dumps(combined,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'checks':len(checks),**preservation}))
