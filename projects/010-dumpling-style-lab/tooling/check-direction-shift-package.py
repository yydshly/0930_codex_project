"""Source/build/HTTP, references and preservation checks. Browser acceptance is separate."""
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
nav = ['direction-coop.html', 'direction-park.html', 'directions.html', 'references.html', 'forms.html']
for name in ['direction-shift.html'] + nav:
 page = Page(web / name)
 check('page anchors unique', len(page.ids) == len(set(page.ids)), page=name)
 for a in page.links:
  parts = urlsplit(a.get('href', ''))
  if parts.scheme:
   check('secure external reference', parts.scheme == 'https' and a.get('target') == '_blank' and {'noopener', 'noreferrer'} <= set(a.get('rel', '').split()), href=a['href'])
  else:
   dest = web / (unquote(parts.path) or name)
   if dest.is_dir():
    dest /= 'index.html'
   check('local destination exists', dest.is_file(), href=a['href'])
   if parts.fragment:
    check('local fragment exists', parts.fragment in Page(dest).ids, href=a['href'])
 for asset in page.assets:
  check('page resource exists', (web / urlsplit(asset).path).is_file(), resource=asset)
baseline = json.loads((project / 'notes/shift-preservation-before-20261005.json').read_text(encoding='utf-8'))
changed, missing = [], []
for name, expected in baseline['protected'].items():
 file = web / name
 if not file.is_file():
  missing.append(name)
 elif hashlib.sha256(file.read_bytes()).hexdigest().lower() != expected.lower():
  changed.append(name)
check('prior games, art, versions and all three previous direction runtimes unchanged', not changed and not missing, protected=len(baseline['protected']), changed=changed, missing=missing)
files = ['direction-shift.html', 'direction-shift.css', 'direction-shift.js', 'direction-shift-engine.js', 'direction-shift-render.js'] + ['assets/directions/shift/' + n for n in ['orbital-night.png', 'rooms-atlas.png', 'equipment-atlas.png', 'crew-atlas.png']] + nav
for name in files:
 data = (web / name).read_bytes()
 check('public build matches source', (public / name).read_bytes() == data, file=name)
 with urlopen('http://127.0.0.1:8962/' + name, timeout=15) as r:
  check('live HTTP route matches source', r.status == 200 and r.read() == data, file=name)
for name, cols in [('rooms-atlas.png', 3), ('equipment-atlas.png', 3), ('crew-atlas.png', 4)]:
 image = Image.open(web / 'assets/directions/shift' / name)
 check('usable alpha atlas dimensions', image.mode == 'RGBA' and image.getchannel('A').getextrema()[0] == 0 and image.width % cols == 0 and image.height % 2 == 0, file=name, size=image.size)
for ref in re.findall(r'url\([\'"]?([^\)\'"]+)', (web / 'direction-shift.css').read_text(encoding='utf-8')):
 check('stylesheet asset exists', (web / ref).is_file(), resource=ref)
for name in nav:
 check('new direction integrated', 'direction-shift.html' in (web / name).read_text(encoding='utf-8'), page=name)
direction = (web / 'directions.html').read_text(encoding='utf-8')
check('four original samples separate from ten reference directions', '本轮 4 个原创可玩样例' in direction and direction.count('class="direction-card') == 10)
check('prior curated references retained', {'hypersomnia', 'isocity', 'supertuxkart', 'source', 'priorities', 'candidates', 'standards'} <= set(Page(web / 'references.html').ids))
check('original collection counts retained', '107 种已接入形态' in (web / 'forms.html').read_text(encoding='utf-8') and '116 个入口' in (web / 'references.html').read_text(encoding='utf-8'))
controller = (web / 'direction-shift.js').read_text(encoding='utf-8')
check('independent save key without old storage deletion', "STORAGE = 'world-play-direction-shift-v1'" in controller and 'localStorage.clear' not in controller and 'removeItem' not in controller)
generation = json.loads((project / 'assets/directions/shift-generation-20261005.json').read_text(encoding='utf-8'))
check('all four full prompts and source paths recorded', generation['mode'] == 'built-in ImageGen' and len(generation['images']) == 4 and all(len(i['prompt']) > 500 and (project / i['file']).is_file() for i in generation['images']))
for name in ['direction-shift-rules-20261005.json', 'direction-shift-controller-20261005.json', 'direction-coop-rules-20261005.json', 'direction-coop-controller-20261005.json', 'direction-factory-rules-20261005.json', 'direction-controller-checks-20261005.json', 'direction-park-rules-20261005.json', 'direction-park-controller-20261005.json']:
 check('production rules and callbacks passed', json.loads((project / 'notes' / name).read_text(encoding='utf-8'))['passed'], report=name)
frames = list((project / 'assets/directions/shift-qa').glob('*.png'))
check('six actual production frames retained', len(frames) == 6 and all(Image.open(f).size == (1440, 900) for f in frames))
report = {'date': '2026-10-05', 'passed': True, 'checks': checks, 'protected_prior_files': len(baseline['protected']), 'browser_acceptance': 'pending', 'browser_failure': 'CUA kernel exited: Windows sandbox helper_unknown_error; setup refresh had errors.', 'scope': 'Fourth original direction sample: three local professions with simultaneous jobs, connected power/air/medical/evacuation systems, actual BFS travel and fire rerouting, two scenarios and independent paused restore. Original painted assets with Canvas2D. No online multiplayer, true 3D, SS14 port or upstream contribution claimed.'}
(project / 'notes/direction-shift-package-20261005.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'passed': True, 'package_checks': len(checks), 'protected_prior_files': len(baseline['protected']), 'browser_acceptance': 'pending'}, ensure_ascii=False))
