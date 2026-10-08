from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
reports=['navigation-pilot-check-20261003.json','navigation-rail-check-20261003.json','navigation-archive-check-20261003.json','navigation-forms-rail-check-20261003.json']
results={};checks=[];errors=[];missing=[]
for name in reports:
    data=json.loads((ROOT/'notes'/name).read_text(encoding='utf-8'));assert data.get('passed'),name
    for check in data['checks']:
        if check not in checks:checks.append(check)
    errors.extend(data.get('errors',[]));missing.extend(data.get('missing',[]))
    if 'results' in data:results.update(data['results'])
    else:results[name.split('-')[1]]=data['result']
assert not errors and not missing
for game in ('pilot','rail','archive'):
    source=ROOT/'assets/game-forms/navigation-qa'/(game+'-preview.png')
    if not source.exists():source=ROOT/'assets/game-forms/navigation-qa'/(game+'-playable.png')
    im=Image.open(source).convert('RGB')
    im.thumbnail((720,405),Image.Resampling.LANCZOS)
    im.save(ROOT/'web/assets/showcase/previews'/(game+'.webp'),quality=92,method=4)
before=json.loads((ROOT/'notes/navigation-preservation-before-20261003.json').read_text(encoding='utf-8'))
changed=[]
for entry in before['files']:
    p=ROOT/entry['path']
    if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=entry['sha256']:changed.append(entry['path'])
preservation={'passed':not changed,'verifiedExistingFiles':len(before['files']),'changed':changed,'forms':28,'entries':37,'pending':4}
(ROOT/'notes/navigation-preservation-20261003.json').write_text(json.dumps(preservation,indent=2),encoding='utf-8')
assert not changed,changed
combined={'passed':True,'method':'Combined independently completed fresh browser runs; actual UI controls, no state injection. Each source report retained.','sourceReports':['notes/'+n for n in reports],'checks':checks,'results':results,'errors':errors,'missing':missing}
(ROOT/'notes/navigation-forms-check-20261003.json').write_text(json.dumps(combined,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(preservation))
