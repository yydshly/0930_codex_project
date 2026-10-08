"""Check all published Sprite bytes, locally or at the actual HTTPS origin."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser()
parser.add_argument('--site', required=True, type=Path)
parser.add_argument('--url')
parser.add_argument('--report', type=Path)
args = parser.parse_args()
manifest = json.loads((args.site/'publication-manifest.json').read_text(encoding='utf-8'))

def check(record):
    name = record['path']
    if args.url:
        url = args.url.rstrip('/')+'/'+name
        with urlopen(Request(url, headers={'User-Agent':'SpriteResearchPublication/1.0'}), timeout=40) as response:
            content = response.read(); status = response.status
    else:
        content = (args.site/name).read_bytes(); status = None
    digest = hashlib.sha256(content).hexdigest()
    return {'path':name, 'bytes':len(content), 'status':status,
            'sha256':digest, 'passed':len(content)==record['bytes'] and digest==record['sha256']}

with ThreadPoolExecutor(max_workers=6) as pool:
    records = list(pool.map(check, manifest['files']))
report = {'origin':args.url or str(args.site), 'files':records,
          'pages':manifest['pages'], 'guide_sha256':manifest['guide_sha256'],
          'passed':sum(r['passed'] for r in records), 'total':len(records)}
if args.report:
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'passed':report['passed'], 'total':report['total'], 'pages':len(report['pages']),
                  'failed':[r for r in records if not r['passed']]},indent=2))
raise SystemExit(0 if all(r['passed'] for r in records) else 1)
