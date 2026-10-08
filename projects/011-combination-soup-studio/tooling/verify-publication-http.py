"""Verify the deployed Soup manifest and complete public file set."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

BASE = 'https://yydshly.github.io/0930_codex_project/projects/011-combination-soup-studio/'
ROOT = Path(__file__).resolve().parents[1]


def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'Soup-Publication-Verification/1.0'}), timeout=40) as response:
        return response.status, response.read()


def verify(base):
    status, data = fetch(urljoin(base, 'publication-manifest.json'))
    manifest = json.loads(data)
    assert status == 200 and manifest['page_count'] == 6

    def file_check(entry):
        try:
            path = PurePosixPath(entry['path'])
            assert not path.is_absolute() and '..' not in path.parts
            status, data = fetch(urljoin(base, entry['path']))
            digest = hashlib.sha256(data).hexdigest()
            ok = status == 200 and len(data) == entry['bytes'] and digest == entry['sha256']
            return {'path': entry['path'], 'status': status, 'bytes': len(data), 'sha256': digest, 'matchesManifest': ok}
        except Exception as error:
            return {'path': entry['path'], 'matchesManifest': False, 'error': str(error)}

    with ThreadPoolExecutor(max_workers=6) as pool:
        files = list(pool.map(file_check, manifest['files']))
    assert all(item['matchesManifest'] for item in files), [f for f in files if not f['matchesManifest']]

    class Links(HTMLParser):
        def handle_starttag(self, tag, attributes):
            for key, value in attributes:
                if key in {'href', 'src', 'poster'} and value:
                    target = urljoin(current, value)
                    if target.startswith(urljoin(base, '../../')) and urlsplit(target).scheme == 'https':
                        urls.add(target.split('#')[0])

    urls = {urljoin(base, '../../')}
    for name in manifest['pages']:
        current = urljoin(base, name)
        _, data = fetch(current)
        Links().feed(data.decode('utf-8'))
    for name in ['001-witr', '002-huashu-design', '003-learn-harness-engineering', '004-rhythm-drop',
                 '005-plush-lab', '006-ai-visual-atlas', '007-koi-scene-lab']:
        urls.add(urljoin(base, '../' + name + '/'))

    def route_check(url):
        try:
            status, _ = fetch(url)
            return {'url': url, 'status': status}
        except Exception as error:
            return {'url': url, 'status': None, 'error': str(error)}

    with ThreadPoolExecutor(max_workers=6) as pool:
        routes = list(pool.map(route_check, sorted(urls)))
    assert all(item['status'] == 200 for item in routes), [r for r in routes if r['status'] != 200]
    _, image = fetch(urljoin(base, 'assets/understanding-map.png'))
    assert hashlib.sha256(image).hexdigest() == hashlib.sha256((ROOT / 'web/assets/understanding-map.png').read_bytes()).hexdigest()
    record = {'completed': True, 'date': '2026-10-08', 'verifiedAtUTC': datetime.now(timezone.utc).isoformat(),
              'base': base, 'pageCount': 6, 'files': files, 'routes': routes, 'guideMatchesExistingPNG': True,
              'limits': 'HTTP and byte integrity checks; visual/interaction evidence is recorded separately. No model service was called.'}
    (ROOT / 'notes/deployment-checks.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'completed': True, 'pages': 6, 'files': len(files), 'routes': len(routes), 'guideMatches': True}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default=BASE)
    verify(parser.parse_args().base)
