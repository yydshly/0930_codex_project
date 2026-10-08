from pathlib import Path
from PIL import Image, ImageOps
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
reports=[f'systems-{name}-check-20261003.json' for name in ('party','district','balance','tandem','shell')]
checks=[];results={};errors=[];missing=[]
for name in reports:
    data=json.loads((ROOT/'notes'/name).read_text(encoding='utf-8'));assert data.get('passed'),name
    for check in data['checks']:
        if check not in checks:checks.append(check)
    results[name.split('-')[1]]=data.get('results',data.get('result'))
    errors.extend(data.get('errors',[]));missing.extend(data.get('missing',[]))
assert not errors and not missing
generic=json.loads((ROOT/'notes/game-forms-check-20261003.json').read_text(encoding='utf-8'))
assert not generic['errors'] and not generic['missing']
assert any('All 36 presentation' in check for check in generic['checks'])
for game in ('party','district','balance','tandem'):
    source=ROOT/'assets/game-forms/systems-qa'/(game+'-playable.png')
    image=ImageOps.fit(Image.open(source).convert('RGB'),(720,405),method=Image.Resampling.LANCZOS)
    image.save(ROOT/'web/assets/showcase/previews'/(game+'.webp'),quality=92,method=4)
before=json.loads((ROOT/'notes/systems-preservation-before-20261003.json').read_text(encoding='utf-8'))
changed=[]
for entry in before['files']:
    file=ROOT/entry['path']
    if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest()!=entry['sha256']:changed.append(entry['path'])
preservation={'passed':not changed,'verifiedExistingFiles':len(before['files']),'changed':changed,'forms':36,'entries':45,'pending':0}
(ROOT/'notes/systems-preservation-20261003.json').write_text(json.dumps(preservation,indent=2),encoding='utf-8');assert not changed,changed
combined={'passed':True,'method':'Combined independently completed fresh browser runs; real UI controls and read-only observations/solvers, no game state injection. Each source report retained.','forms':36,'entries':45,'cooperationClassification':'Participation form combined with platform puzzles, not counted as an independent genre taxonomy.','sourceReports':['notes/'+name for name in reports],'checks':checks,'results':results,'errors':errors,'missing':missing,'regressionReport':'notes/game-forms-check-20261003.json','rulesReport':'notes/worlds-rules-check.json','actualGameplayPreviews':['web/assets/showcase/previews/'+game+'.webp' for game in ('party','district','balance','tandem')],'artworkMode':'built-in image_gen and authored locally bundled Kenney CC0 models','artworkManifest':'assets/game-forms/systems-generation-20261003.json','cityModelManifest':'assets/game-forms/systems-city-sources.json','physicsManifest':'assets/game-forms/systems-balance-sources.json'}
(ROOT/'notes/systems-forms-check-20261003.json').write_text(json.dumps(combined,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'checks':len(checks),**preservation}))
