"""Verify every selected Koi asset and existing catalog entry on GitHub Pages."""
import argparse
import hashlib
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--commit', required=True)
    parser.add_argument('--run', required=True)
    args = parser.parse_args()
    project = Path(__file__).resolve().parents[1]
    root = project.parents[1]
    prefix = 'projects/007-koi-scene-lab/'
    base = 'https://yydshly.github.io/0930_codex_project/'
    package = json.loads((project / 'notes/package-publication-20261008.json').read_text(encoding='utf-8'))
    items = []
    for entry in package['publicFileChecks']:
        path = entry['path']
        expected = subprocess.check_output(['git', 'show', args.commit + ':' + prefix + 'web/' + path], cwd=root)
        items.append((prefix + path, expected, 'selected Koi runtime asset'))
    items.append((prefix, next(b for p, b, _ in items if p == prefix + 'index.html'), 'Koi entry alias'))
    items.append(('', (root / '_site/index.html').read_bytes().replace(b'\r\n', b'\n'), 'research catalog'))
    catalog = json.loads((root / 'projects.json').read_text(encoding='utf-8'))
    for entry in catalog:
        if entry['id'] >= 7:
            continue
        path = f"projects/{entry['id']:03d}-{entry['slug']}/"
        expected = (root / '_site' / path / 'index.html').read_bytes().replace(b'\r\n', b'\n')
        items.append((path, expected, 'previously published entry'))

    def check(item):
        path, expected, scope = item
        url = base + path + '?v=' + args.commit[:12]
        try:
            with urlopen(Request(url, headers={'User-Agent': 'Koi-Publication-Verification'}), timeout=25) as response:
                data = response.read()
                return dict(path=path or 'index.html', url=url, scope=scope,
                            status=response.status, bytes=len(data),
                            sha256=hashlib.sha256(data).hexdigest(),
                            expectedSha256=hashlib.sha256(expected).hexdigest(),
                            matched=data == expected, passed=response.status == 200 and data == expected)
        except Exception as error:
            return dict(path=path or 'index.html', url=url, scope=scope, passed=False, error=str(error))

    with ThreadPoolExecutor(max_workers=8) as pool:
        checks = list(pool.map(check, items))
    record = dict(clientDate='2026-10-08', timezone='Asia/Shanghai',
                  recordedAt=datetime.now(timezone.utc).isoformat(),
                  deploymentCommit=args.commit, pagesRun=args.run,
                  baseURL=base + prefix, checks=checks,
                  passed=sum(bool(c['passed']) for c in checks),
                  failed=sum(not c['passed'] for c in checks),
                  method='HTTP 200 and exact SHA-256. Koi resources use committed Git bytes; generated catalog and prior entry text use Linux line endings. Does not measure hardware performance or repeat 3D gameplay.')
    (project / 'notes/deployment-checks.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': record['passed'], 'failed': record['failed'],
                      'errors': [c for c in checks if not c['passed']]}, ensure_ascii=False))
    return int(record['failed'] > 0)


if __name__ == '__main__':
    raise SystemExit(main())
