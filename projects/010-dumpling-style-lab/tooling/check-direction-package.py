"""Inspect added direction routes, files and preservation; no browser claim."""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
from urllib.request import urlopen
from PIL import Image

project = Path(__file__).resolve().parents[1]
web = project / 'web'
public = project.parents[1] / '_site/projects/010-dumpling-style-lab'
checks = []

def check(name, valid, **detail):
    checks.append({'name': name, 'passed': bool(valid), **detail})
    if not valid:
        raise AssertionError((name, detail))

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.assets = [], [], []
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'a':
            self.links.append(a)
        if tag == 'script' and 'src' in a:
            self.assets.append(a['src'])
        if tag == 'link' and a.get('rel') == 'stylesheet':
            self.assets.append(a['href'])

for name in ['directions.html', 'references.html']:
    page = Page(web / name)
    check('unique HTML anchors', len(page.ids) == len(set(page.ids)), page=name)
    for item in page.links:
        href = item.get('href', '')
        parts = urlsplit(href)
        if parts.scheme:
            check('external source has secure new-window attributes', parts.scheme == 'https' and item.get('target') == '_blank' and {'noopener', 'noreferrer'} <= set(item.get('rel', '').split()), href=href)
        else:
            dest = web / (unquote(parts.path) or name)
            if dest.is_dir():
                dest /= 'index.html'
            check('local destination exists', dest.is_file(), href=href)
            if parts.fragment:
                check('local fragment exists', parts.fragment in Page(dest).ids, href=href)
    for asset in page.assets:
        check('page resource exists', (web / urlsplit(asset).path).is_file(), resource=asset)

source = (web / 'directions.html').read_text(encoding='utf-8')
check('ten reference directions and three clearly labelled original samples', source.count('class="direction-card') == 10 and '本轮 3 个原创可玩样例' in source and '本轮原创试玩有铜谷防线、风湾乐园与雾岭同行三个方向' in source)
check('original official reference cards retained', {'hypersomnia', 'isocity', 'supertuxkart', 'source', 'priorities', 'candidates', 'standards'} <= set(Page(web / 'references.html').ids))
check('reference and existing forms both connect the direction experiment', 'directions.html' in (web / 'references.html').read_text(encoding='utf-8') and 'directions.html' in (web / 'forms.html').read_text(encoding='utf-8'))

baseline = json.loads((project / 'notes/open-source-reference-preservation-before-20261004.json').read_text(encoding='utf-8-sig'))
changed, missing = [], []
for name, expected in baseline['protected'].items():
    if name == 'README.md':  # Documentation was already updated by the preceding reference integration.
        continue
    file = web / name
    if not file.is_file():
        missing.append(name)
    elif hashlib.sha256(file.read_bytes()).hexdigest().upper() != expected:
        changed.append(name)
check('all previously protected gameplay, versions and assets remain unchanged', not changed and not missing, protected=len(baseline['protected']) - 1, changed=changed, missing=missing)

new_files = ['directions.html', 'directions.css', 'directions.js', 'direction-factory-engine.js', 'direction-factory-render.js', 'references.html', 'references.css', 'forms.html', 'assets/directions/factory/industrial-atlas.png', 'assets/directions/factory/copper-basin.png']
for name in new_files:
    data = (web / name).read_bytes()
    check('bundled file matches source', (public / name).read_bytes() == data, file=name)
    with urlopen('http://127.0.0.1:8962/' + name, timeout=15) as response:
        check('live HTTP route matches source', response.status == 200 and response.read() == data, file=name)

atlas = Image.open(web / 'assets/directions/factory/industrial-atlas.png')
check('generated atlas has real alpha and a valid six-cell layout', atlas.mode == 'RGBA' and atlas.width % 3 == 0 and atlas.height % 2 == 0 and atlas.getchannel('A').getextrema()[0] == 0, size=atlas.size)
css = (web / 'directions.css').read_text(encoding='utf-8')
for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)', css):
    check('CSS asset exists', (web / ref).is_file(), resource=ref)
controller = (web / 'directions.js').read_text(encoding='utf-8')
check('controller uses new independent save key only', "STORAGE = 'world-play-direction-copper-v1'" in controller and 'localStorage.clear' not in controller and 'removeItem' not in controller)
for name in ['direction-factory-rules-20261005.json', 'direction-controller-checks-20261005.json']:
    check('production verification passed', json.loads((project / 'notes' / name).read_text(encoding='utf-8'))['passed'], report=name)

report = {'date': '2026-10-05', 'passed': True, 'checks': checks, 'protected_existing_files': len(baseline['protected']) - 1,
          'browser_acceptance': 'pending', 'browser_failure': 'cua node_repl initialization failed: windows sandbox helper_unknown_error/setup refresh had errors',
          'scope': 'Three original direction experiments (factory defense, theme park and local cooperative creator), ten externally linked reference directions, preserved existing games and save keys; no upstream game port claimed. Park and cooperation checks are recorded separately.'}
(project / 'notes/direction-package-check-20261005.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'package_checks': len(checks), 'protected_existing_files': report['protected_existing_files'], 'browser_acceptance': report['browser_acceptance']}, ensure_ascii=False))
