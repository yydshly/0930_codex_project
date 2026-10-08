"""Check author-hosted URLs with HEAD only; does not download or redistribute media."""
import concurrent.futures
import json
from pathlib import Path
import urllib.error
import urllib.request
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://opc8838-hub.github.io/font-animation/'
source = (ROOT / 'web/catalog.js').read_text(encoding='utf-8')
catalog = json.loads(source.split('window.CELLMOTION_CATALOG = ', 1)[1].rsplit(';', 1)[0])
resources = []
for effect in catalog['effects']:
    if effect['status'] != 'ready':
        continue
    for field in ['href', 'poster', 'video']:
        if effect.get(field):
            resources.append(dict(effect=effect['id'], kind=field, url=urljoin(BASE, effect[field])))
for number in [1, 2, 3]:
    for suffix, kind in [('.mp4', 'case-video'), ('-poster.jpg', 'case-poster')]:
        resources.append(dict(effect=f'case-{number}', kind=kind, url=urljoin(BASE, f'assets/cellmotion/cases/case-{number}{suffix}')))

def check(resource):
    result = dict(resource)
    for attempt in range(2):
        try:
            request = urllib.request.Request(resource['url'], method='HEAD', headers={'User-Agent': 'CellMotion-Research/1.0'})
            with urllib.request.urlopen(request, timeout=20) as response:
                result.update(status=response.status, contentType=response.headers.get('Content-Type'), bytes=response.headers.get('Content-Length'))
            result['passed'] = result['status'] == 200
            return result
        except (OSError, urllib.error.URLError) as error:
            result.update(passed=False, error=str(error))
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results = list(pool.map(check, resources))
report = dict(date='2026-10-02', method='HEAD', scope='URL availability only, not complete editor functionality', resources=results)
(ROOT / 'notes/resource-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
failed = [row for row in results if not row['passed']]
print(json.dumps(dict(checked=len(results), passed=len(results)-len(failed), failures=failed), ensure_ascii=False))
if failed:
    raise SystemExit(1)
