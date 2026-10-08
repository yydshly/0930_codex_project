"""Package, serving, original-file preservation and verification provenance. No browser claim."""
import hashlib
import json
import re
import runpy
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
    def __init__(self, file):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.assets = [], [], []
        self.feed(file.read_text(encoding='utf-8'))
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

for name in ['direction-park.html', 'directions.html', 'references.html', 'forms.html']:
    page = Page(web / name)
    check('unique page anchors', len(page.ids) == len(set(page.ids)), page=name)
    for a in page.links:
        parts = urlsplit(a.get('href', ''))
        if parts.scheme:
            check('secure external reference', parts.scheme == 'https' and a.get('target') == '_blank' and {'noopener', 'noreferrer'} <= set(a.get('rel', '').split()), href=a['href'])
        else:
            dest = web / (unquote(parts.path) or name)
            if dest.is_dir():
                dest /= 'index.html'
            check('existing local link', dest.is_file(), href=a['href'])
            if parts.fragment:
                check('existing local fragment', parts.fragment in Page(dest).ids, href=a['href'])
    for asset in page.assets:
        check('page resource exists', (web / urlsplit(asset).path).is_file(), resource=asset)

baseline = json.loads((project / 'notes/park-preservation-before-20261005.json').read_text(encoding='utf-8-sig'))
changed, missing = [], []
for name, expected in baseline['protected'].items():
    file = web / name
    if not file.is_file():
        missing.append(name)
    elif hashlib.sha256(file.read_bytes()).hexdigest().lower() != expected.lower():
        changed.append(name)
check('all prior gameplay, factory sample, saved versions and art unchanged', not changed and not missing, protected=len(baseline['protected']), changed=changed, missing=missing)

new_files = ['direction-park.html', 'direction-park.css', 'direction-park.js', 'direction-park-engine.js', 'direction-park-render.js', 'assets/directions/park/park-atlas.png', 'assets/directions/park/garden-terrain.png', 'assets/directions/park/visitors-atlas.png', 'directions.html', 'references.html', 'forms.html']
for name in new_files:
    source = (web / name).read_bytes()
    check('build matches source', (public / name).read_bytes() == source, file=name)
    with urlopen('http://127.0.0.1:8962/' + name, timeout=15) as response:
        check('running route matches source', response.status == 200 and response.read() == source, file=name)

for file, cols, rows in [('park-atlas.png', 3, 2), ('visitors-atlas.png', 4, 2)]:
    atlas = Image.open(web / 'assets/directions/park' / file)
    check('generated atlas has transparency and usable cell dimensions', atlas.mode == 'RGBA' and atlas.width % cols == 0 and atlas.height % rows == 0 and atlas.getchannel('A').getextrema()[0] == 0, file=file, size=atlas.size)
terrain = Image.open(web / 'assets/directions/park/garden-terrain.png')
check('garden scene has production-sized bitmap', terrain.width >= 1440 and terrain.height >= 900, size=terrain.size)
css = (web / 'direction-park.css').read_text(encoding='utf-8')
for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)', css):
    check('stylesheet asset exists', (web / ref).is_file(), resource=ref)
for name in ['directions.html', 'references.html', 'forms.html']:
    source = (web / name).read_text(encoding='utf-8')
    check('park entry integrated alongside factory', 'direction-park.html' in source and (name == 'directions.html' or 'directions.html' in source), page=name)
controller = (web / 'direction-park.js').read_text(encoding='utf-8')
check('independent park save key; no deletion of existing storage', "STORAGE = 'world-play-direction-park-v1'" in controller and 'removeItem' not in controller and 'localStorage.clear' not in controller)
generation = json.loads((project / 'assets/directions/park-generation-20261005.json').read_text(encoding='utf-8'))
check('all three full image generation prompts saved', generation['mode'] == 'built-in ImageGen' and len(generation['images']) == 3 and all(len(item['prompt']) > 500 and (project / item['file']).is_file() for item in generation['images']))
for name in ['direction-park-rules-20261005.json', 'direction-park-controller-20261005.json']:
    check('actual rules and page callbacks passed', json.loads((project / 'notes' / name).read_text(encoding='utf-8'))['passed'], report=name)
frames = list((project / 'assets/directions/park-qa').glob('*.png'))
check('five actual production render frames retained', len(frames) == 5 and all(Image.open(file).size == (1440, 900) for file in frames))

# Recheck the factory and previously retained references without modifying their gameplay.
runpy.run_path(str(project / 'tooling/check-direction-package.py'), run_name='__main__')
report = {'date': '2026-10-05', 'passed': True, 'checks': checks, 'protected_existing_files': len(baseline['protected']), 'browser_acceptance': 'pending', 'browser_failure': 'CUA kernel exited: Windows sandbox helper_unknown_error/setup refresh had errors', 'scope': 'Original isometric park sample with six facility types, true road routes, visitor choice and queues, timed service, daily closing/report, layout-preserving new day and independent saved progress. Preserved prior factory and all earlier playable forms; not a port of IsoCoaster/OpenRCT2; not true 3D.'}
(project / 'notes/direction-park-package-20261005.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'park_package_checks': len(checks), 'protected_files': report['protected_existing_files'], 'browser_acceptance': 'pending'}, ensure_ascii=False))
