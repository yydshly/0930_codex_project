"""Verify the fifth sample and its delivery resources, without claiming browser acceptance."""
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
nav = ['direction-coop.html', 'direction-park.html', 'direction-shift.html', 'directions.html', 'references.html', 'forms.html']
for name in ['direction-freight.html'] + nav:
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
baseline = json.loads((project / 'notes/freight-preservation-before-20261005.json').read_text(encoding='utf-8'))
changed, missing = [], []
for name, expected in baseline['protected'].items():
 file = web / name
 if not file.is_file():
  missing.append(name)
 elif hashlib.sha256(file.read_bytes()).hexdigest().lower() != expected.lower():
  changed.append(name)
check('all prior game code, art, versions and the four direction runtimes retained unchanged', not changed and not missing, protected=len(baseline['protected']), changed=changed, missing=missing)
files = ['direction-freight.html', 'direction-freight.css', 'direction-freight.js', 'direction-freight-engine.js', 'direction-freight-render.js'] + ['assets/directions/freight/' + n for n in ['coastal-valley.png', 'stations-atlas.png', 'loaded-trucks.png', 'empty-fleet.png']] + nav
for name in files:
 data = (web / name).read_bytes()
 check('public build matches source', (public / name).read_bytes() == data, file=name)
 with urlopen('http://127.0.0.1:8962/' + name, timeout=15) as r:
  check('live HTTP route matches source', r.status == 200 and r.read() == data, file=name)
for name, cols in [('stations-atlas.png', 3), ('loaded-trucks.png', 4), ('empty-fleet.png', 4)]:
 image = Image.open(web / 'assets/directions/freight' / name)
 check('usable genuine-alpha atlas', image.mode == 'RGBA' and image.getchannel('A').getextrema()[0] == 0 and image.width % cols == 0 and image.height >= 700, file=name, size=image.size)
for ref in re.findall(r'url\([\'"]?([^\)\'"]+)', (web / 'direction-freight.css').read_text(encoding='utf-8')):
 check('stylesheet asset exists', (web / ref).is_file(), resource=ref)
for name in nav:
 check('fifth direction integrated', 'direction-freight.html' in (web / name).read_text(encoding='utf-8'), page=name)
direction = (web / 'directions.html').read_text(encoding='utf-8')
check('five originals separately labelled from ten reference directions', '本轮 5 个原创可玩样例' in direction and direction.count('class="direction-card') == 10)
check('prior curated references retained', {'hypersomnia', 'isocity', 'supertuxkart', 'source', 'priorities', 'candidates', 'standards'} <= set(Page(web / 'references.html').ids))
check('original collection counts retained', '107 种已接入形态' in (web / 'forms.html').read_text(encoding='utf-8') and '116 个入口' in (web / 'references.html').read_text(encoding='utf-8'))
controller = (web / 'direction-freight.js').read_text(encoding='utf-8')
check('independent save key without old storage deletion', "STORAGE = 'world-play-direction-freight-v1'" in controller and 'localStorage.clear' not in controller and 'removeItem' not in controller)
generation = json.loads((project / 'assets/directions/freight-generation-20261005.json').read_text(encoding='utf-8'))
active = [i for i in generation['images'] if i.get('final', True)]
check('four active bitmap assets with all prompts and source paths recorded', generation['mode'] == 'built-in ImageGen' and len(active) == 4 and all(len(i['prompt']) > 500 and (project / i['file']).is_file() for i in generation['images']))
for name in ['direction-freight-rules-20261005.json', 'direction-freight-controller-20261005.json', 'direction-shift-rules-20261005.json', 'direction-shift-controller-20261005.json', 'direction-coop-rules-20261005.json', 'direction-coop-controller-20261005.json', 'direction-factory-rules-20261005.json', 'direction-controller-checks-20261005.json', 'direction-park-rules-20261005.json', 'direction-park-controller-20261005.json']:
 check('production rules and callbacks passed', json.loads((project / 'notes' / name).read_text(encoding='utf-8'))['passed'], report=name)
frames = list((project / 'assets/directions/freight-qa').glob('*.png'))
check('six actual production frames retained', len(frames) == 6 and all(Image.open(f).size == (1440, 900) for f in frames))
report = {'date': '2026-10-05', 'passed': True, 'checks': checks, 'source_resources': len(files), 'protected_prior_files': len(baseline['protected']), 'browser_acceptance': 'pending', 'browser_failure': 'CUA exited twice: trusted Node process exited; then Windows sandbox helper_unknown_error, setup refresh had errors.', 'scope': 'Fifth original direction sample: six stations, road and bridge construction, timber processing, grain transfers, purchasable route-specific vehicles with loading/travel/unloading/return, bridge closure rerouting, real inventory conservation and budget balance, independent paused restore. Original bitmap art plus Canvas2D infrastructure. No OpenTTD port, rail/water/air traffic, persistent regional growth or online multiplayer claimed.'}
(project / 'notes/direction-freight-package-20261005.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'passed': True, 'package_checks': len(checks), 'source_resources': len(files), 'protected_prior_files': len(baseline['protected']), 'browser_acceptance': 'pending'}, ensure_ascii=False))
