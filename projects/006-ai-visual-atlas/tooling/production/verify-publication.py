"""Verify the reviewed static publication over HTTPS; makes no generation calls."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import ssl
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads((ROOT / 'publication/manifest.json').read_text(encoding='utf-8'))
BASE = MANIFEST['publicUrl']
CONTEXT = ssl.create_default_context()


def fetch(url):
    last_error = None
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'VisualAtlas-PublicationCheck/1.0',
                'Cache-Control': 'no-cache',
            })
            with urllib.request.urlopen(req, timeout=30, context=CONTEXT) as response:
                return response.status, response.headers.get('Content-Type'), response.read()
        except (OSError, ValueError) as exc:
            last_error = exc
    raise last_error


def verify(rec):
    try:
        status, content_type, data = fetch(BASE + rec['path'])
        digest = hashlib.sha256(data).hexdigest()
        return {
            'path': rec['path'], 'url': BASE + rec['path'], 'status': status,
            'bytes': len(data), 'sha256': digest, 'contentType': content_type,
            'matchesReviewedFile': status == 200 and len(data) == rec['bytes'] and digest == rec['sha256'],
        }
    except Exception as exc:
        return {'path': rec['path'], 'error': str(exc), 'matchesReviewedFile': False}


def main():
    checks = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for future in as_completed([pool.submit(verify, rec) for rec in MANIFEST['files']]):
            checks.append(future.result())
    entry_checks = []
    catalog_url = BASE.split('projects/', 1)[0]
    paths = ['', 'projects/001-witr/', 'projects/002-huashu-design/',
             'projects/003-learn-harness-engineering/', 'projects/004-rhythm-drop/',
             'projects/005-plush-lab/', 'projects/006-ai-visual-atlas/',
             'projects/006-ai-visual-atlas/publication-manifest.json']
    for path in paths:
        try:
            status, _, data = fetch(catalog_url + path)
            if path == '':
                text = data.decode('utf-8')
                assert '我们的十项目能力与技术总览' in text and '十项目源库列表' in text
            if path.endswith('publication-manifest.json'):
                assert json.loads(data)['files'] == MANIFEST['files']
            entry_checks.append({'path': path, 'status': status, 'bytes': len(data), 'passed': status == 200})
        except Exception as exc:
            entry_checks.append({'path': path, 'error': str(exc), 'passed': False})
    evidence = {
        'checkedAt': datetime.now(timezone.utc).isoformat(), 'publicUrl': BASE,
        'revision': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'publicFiles': len(checks), 'totalBytes': sum(c.get('bytes', 0) for c in checks),
        'checks': sorted(checks, key=lambda c: c['path']), 'entryChecks': entry_checks,
    }
    notes = ROOT / 'notes'
    notes.mkdir(exist_ok=True)
    (notes / 'deployment-checks.json').write_bytes((json.dumps(evidence, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    failed = [c for c in checks if not c['matchesReviewedFile']] + [e for e in entry_checks if not e['passed']]
    print(json.dumps({'matchedPublicFiles': len(checks) - sum(not c['matchesReviewedFile'] for c in checks),
                      'files': len(checks), 'entryChecks': len(entry_checks), 'failures': failed}, ensure_ascii=False))
    if failed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
