from pathlib import Path
from PIL import Image
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
for game in ('sports','stealth','pinball'):
    im=Image.open(ROOT/'assets/game-forms/action-qa'/(game+'-playable.png')).convert('RGB')
    im.thumbnail((720,405),Image.Resampling.LANCZOS)
    im.save(ROOT/'web/assets/showcase/previews'/(game+'.webp'),quality=92,method=4)
before=json.loads((ROOT/'notes/action-preservation-before-20261003.json').read_text(encoding='utf-8'))
changed=[]
for entry in before['files']:
    p=ROOT/entry['path']
    if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=entry['sha256']:changed.append(entry['path'])
report={'passed':not changed,'verifiedExistingFiles':len(before['files']),'changed':changed,'forms':25,'entries':34,'pending':7}
(ROOT/'notes/action-preservation-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
assert not changed,changed
reports=['action-sports-check-20261003.json','action-stealth-check-20261003.json','action-pinball-check-20261003.json','action-forms-pinball-check-20261003.json']
results={};checks=[];errors=[];missing=[]
for name in reports:
    data=json.loads((ROOT/'notes'/name).read_text(encoding='utf-8'));assert data.get('passed'),name
    for check in data['checks']:
        if check not in checks:checks.append(check)
    errors.extend(data.get('errors',[]));missing.extend(data.get('missing',[]))
    if 'results' in data:results.update(data['results'])
    else:results[name.split('-')[1]]=data['result']
combined={'passed':True,'method':'Combined independently completed fresh browser runs; actual UI controls, no state injection. Each source report retained.','sourceReports':['notes/'+n for n in reports],'checks':checks,'results':results,'errors':errors,'missing':missing}
assert not errors and not missing
(ROOT/'notes/action-forms-check-20261003.json').write_text(json.dumps(combined,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report))
