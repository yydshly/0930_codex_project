"""Verify every published byte and all static page navigation under a subpath."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlsplit, unquote
from html.parser import HTMLParser
import argparse
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.ids = set(); self.links = []; self.cards = 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.add(a['id'])
        if 'entry-card' in a.get('class', '').split(): self.cards += 1
        if tag in {'a', 'img', 'script', 'link'}:
            value = a.get('href') if tag in {'a', 'link'} else a.get('src')
            if value: self.links.append(value)


def verify(base):
    base = base.rstrip('/') + '/'
    def read(path):
        with urlopen(Request(urljoin(base, path), headers={'User-Agent': 'CreativeLibraryPublicationCheck/1.0'}), timeout=60) as response:
            return response.status, response.read()
    status, raw = read('publication-manifest.json')
    manifest = json.loads(raw)
    def check(record):
        status, data = read(record['path'])
        digest = hashlib.sha256(data).hexdigest()
        assert status == 200 and len(data) == record['bytes'] and digest == record['sha256'], record['path']
        return dict(path=record['path'], status=status, bytes=len(data), sha256=digest), data
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(check, manifest['files']))
    payloads = {r['path']: data for r, data in results}
    pages = {path: Page(data.decode('utf-8')) for path, data in payloads.items() if path.endswith('.html')}
    checked_links = 0
    for path, page in pages.items():
        for link in page.links:
            absolute = urljoin(urljoin(base, path), link)
            if not absolute.startswith(base): continue
            parsed = urlsplit(absolute)
            relative = unquote(parsed.path[len(urlsplit(base).path):])
            if not relative or relative.endswith('/'): relative += 'index.html'
            assert relative in payloads, (path, link, relative)
            if parsed.fragment and relative in pages:
                route = relative == 'index.html' and re.fullmatch(r'(effects|cases|capabilities|products|demo|compare|roadmap|case-\d{2}|demo-\d{2}|product-[\w-]+)', parsed.fragment)
                assert parsed.fragment in pages[relative].ids or route, (path, link, 'missing anchor')
            checked_links += 1
    assert pages['index.html'].cards == 10
    assert all(f'case-{n:02d}' in pages['research.html'].ids for n in range(1, 11))
    assert manifest['original_guide_unchanged']
    return dict(date='2026-10-08', base_url=base, public_files=len(results),
                bytes_verified=sum(r['bytes'] for r, _ in results), static_links_checked=checked_links,
                ten_current_effects=True, ten_case_explanations=True, original_guide_unchanged=True,
                files=[r for r, _ in results], errors=[])


if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--base-url', required=True); p.add_argument('--report', required=True)
    args = p.parse_args(); result = verify(args.base_url)
    target = Path(args.report); target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({key: value for key, value in result.items() if key != 'files'}, ensure_ascii=False))
