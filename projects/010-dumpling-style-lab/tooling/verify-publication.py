"""Verify deployed paths, complete runtime bytes and preserved guide image."""
import argparse
import concurrent.futures
import hashlib
import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from urllib.request import Request, urlopen


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.references, self.links = set(), [], []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        for attribute in ('src', 'href', 'poster'):
            if attribute in attrs:
                self.references.append(attrs[attribute])
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', type=Path, required=True)
    parser.add_argument('--online')
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    site = args.site.resolve()
    source = Path(__file__).resolve().parents[1] / 'web'
    manifest = json.loads((site / 'publication-manifest.json').read_text(encoding='utf-8'))
    records = manifest['files']
    checks, failures = [], []

    def check(name, passed, **data):
        entry = dict(name=name, passed=bool(passed), **data)
        checks.append(entry)
        if not passed:
            failures.append(entry)

    for item in records:
        target = site / item['path']
        data = target.read_bytes() if target.is_file() else b''
        check('runtime file preserved', target.is_file() and len(data) == item['bytes']
              and digest(data) == item['sha256'] and data == (source / item['path']).read_bytes(),
              path=item['path'])
    pages = {p.relative_to(site).as_posix(): Page(p.read_text(encoding='utf-8'))
             for p in site.rglob('*.html')}
    check('all current and historical HTML pages published', len(pages) == 23, count=len(pages))
    reached = set()
    for name, page in pages.items():
        for ref in page.references:
            parsed = urlsplit(ref)
            if parsed.scheme or parsed.netloc or parsed.path.startswith('/'):
                continue
            target = (site / name).parent / unquote(parsed.path) if parsed.path else site / name
            target = target.resolve()
            if target.is_dir():
                target /= 'index.html'
            check('HTML link or resource exists', target.is_file(), page=name, target=ref)
            if parsed.fragment and target.suffix == '.html' and target.is_relative_to(site):
                target_name = target.relative_to(site).as_posix()
                check('HTML anchor exists', parsed.fragment in pages.get(target_name, Page('')).ids,
                      page=name, target=ref)
            if name == 'index.html' and target.is_file() and target.suffix == '.html' and target.is_relative_to(site):
                reached.add(target.relative_to(site).as_posix())
    check('homepage directly reaches every game-related page', set(pages) <= reached,
          missing=sorted(set(pages) - reached))
    for path in site.rglob('*'):
        if path.suffix not in {'.js', '.css'} or not path.is_file():
            continue
        text = path.read_text(encoding='utf-8')
        refs = re.findall(r'''(?:from\s*|import\s*\(|import\s*)['"](\.[^'"]+)''', text) if path.suffix == '.js' else re.findall(r'''url\(\s*['"]?([^)'"\s]+)''', text)
        for ref in refs:
            parsed = urlsplit(ref)
            if parsed.scheme or parsed.netloc or parsed.path.startswith('/'):
                continue
            # A concatenated dynamic import prefix is not a complete pathname.
            if path.suffix == '.js' and not Path(parsed.path).suffix:
                continue
            check('module or CSS dependency exists', (path.parent / unquote(parsed.path)).is_file(),
                  path=path.relative_to(site).as_posix(), target=ref)
    check('original summary guide bytes unchanged',
          (site / manifest['guide']).read_bytes() == (source / manifest['guide']).read_bytes(),
          sha256=digest((source / manifest['guide']).read_bytes()))

    if args.online:
        base = args.online.rstrip('/') + '/'

        def verify_online(item):
            error = ''
            for attempt in range(3):
                try:
                    request = Request(urljoin(base, item['path']), headers={'User-Agent': 'Dumpling-publication-verifier'})
                    with urlopen(request, timeout=40) as response:
                        data = response.read()
                        return dict(name='public HTTPS file and hash', path=item['path'], status=response.status,
                                    bytes=len(data), passed=response.status == 200 and len(data) == item['bytes']
                                    and digest(data) == item['sha256'])
                except Exception as exc:
                    error = str(exc)
                    if attempt < 2:
                        time.sleep(attempt + 1)
            return dict(name='public HTTPS file and hash', path=item['path'], passed=False, error=error)

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            for number, entry in enumerate(pool.map(verify_online, records), 1):
                checks.append(entry)
                if not entry['passed']:
                    failures.append(entry)
                if number % 200 == 0:
                    print(f'HTTPS checked {number}/{len(records)}, failures {len(failures)}', flush=True)
        with urlopen(urljoin(base, 'publication-manifest.json'), timeout=40) as response:
            check('public manifest matches reviewed build', json.load(response) == manifest)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    report = {'date': '2026-10-08', 'passed': not failures, 'public_url': args.online,
              'pages': len(pages), 'files': len(records), 'bytes': sum(x['bytes'] for x in records),
              'checks': checks, 'failures': failures}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k not in {'checks'}}, ensure_ascii=False), flush=True)
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
