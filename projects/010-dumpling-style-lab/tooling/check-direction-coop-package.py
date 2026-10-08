"""Check the third direction package, actual HTTP resources and preservation. Not browser QA."""
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
for name in ['direction-coop.html', 'directions.html', 'direction-park.html', 'references.html', 'forms.html']:
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
baseline = json.loads((project / 'notes/cooperation-preservation-before-20261005.json').read_text(encoding='utf-8'))
changed, missing = [], []
for name, expected in baseline['protected'].items():
 file = web / name
 if not file.is_file():
  missing.append(name)
 elif hashlib.sha256(file.read_bytes()).hexdigest().lower() != expected.lower():
  changed.append(name)
check('all prior games, art, versions and both direction engines unchanged', not changed and not missing, protected=len(baseline['protected']), changed=changed, missing=missing)
files = ['direction-coop.html', 'direction-coop.css', 'direction-coop.js', 'direction-coop-engine.js', 'direction-coop-render.js', 'assets/directions/cooperation/mist-ridge.png', 'assets/directions/cooperation/props-atlas.png', 'assets/directions/cooperation/explorers-atlas.png', 'directions.html', 'direction-park.html', 'references.html', 'forms.html']
for name in files:
 data = (web / name).read_bytes()
 check('public build matches source', (public / name).read_bytes() == data, file=name)
 with urlopen('http://127.0.0.1:8962/' + name, timeout=15) as r:
  check('live HTTP route matches source', r.status == 200 and r.read() == data, file=name)
for name, cols in [('props-atlas.png', 3), ('explorers-atlas.png', 4)]:
 image = Image.open(web / 'assets/directions/cooperation' / name)
 check('usable alpha atlas dimensions', image.mode == 'RGBA' and image.getchannel('A').getextrema()[0] == 0 and image.width % cols == 0 and image.height % 2 == 0, file=name, size=image.size)
for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)', (web / 'direction-coop.css').read_text(encoding='utf-8')):
 check('stylesheet asset exists', (web / ref).is_file(), resource=ref)
for page in ['directions.html', 'direction-park.html', 'references.html', 'forms.html']:
 check('new direction integrated', 'direction-coop.html' in (web / page).read_text(encoding='utf-8'), page=page)
direction = (web / 'directions.html').read_text(encoding='utf-8')
check('three original samples separately labelled from ten reference directions', '本轮 3 个原创可玩样例' in direction and direction.count('class="direction-card') == 10)
check('all prior curated references retained', {'hypersomnia', 'isocity', 'supertuxkart', 'source', 'priorities', 'candidates', 'standards'} <= set(Page(web / 'references.html').ids))
check('original collection counts retained', '107 种已接入形态' in (web / 'forms.html').read_text(encoding='utf-8') and '116 个入口' in (web / 'references.html').read_text(encoding='utf-8'))
controller = (web / 'direction-coop.js').read_text(encoding='utf-8')
check('new independent save key only and no deletion of old storage', "STORAGE = 'world-play-direction-cooperation-v1'" in controller and 'localStorage.clear' not in controller and 'removeItem' not in controller)
generation = json.loads((project / 'assets/directions/cooperation-generation-20261005.json').read_text(encoding='utf-8'))
check('all full prompts and saved source paths recorded', generation['mode'] == 'built-in ImageGen' and len(generation['images']) == 3 and all(len(i['prompt']) > 500 and (project / i['file']).is_file() for i in generation['images']))
for name in ['direction-coop-rules-20261005.json', 'direction-coop-controller-20261005.json', 'direction-factory-rules-20261005.json', 'direction-controller-checks-20261005.json', 'direction-park-rules-20261005.json', 'direction-park-controller-20261005.json']:
 check('production rules and callbacks passed', json.loads((project / 'notes' / name).read_text(encoding='utf-8'))['passed'], report=name)
frames = list((project / 'assets/directions/cooperation-qa').glob('*.png'))
check('five actual production frames retained', len(frames) == 5 and all(Image.open(f).size == (1440, 900) for f in frames))
report = {'date': '2026-10-05', 'passed': True, 'checks': checks, 'protected_prior_files': len(baseline['protected']), 'browser_acceptance': 'pending', 'browser_failure': 'CUA kernel exited: Windows sandbox helper_unknown_error; setup refresh had errors.', 'scope': 'Third original direction sample: three local cooperative platform maps, freezing/rescue, pressure gates, checkpoints, two-role controls, collision-driven creator, import/export of level files and layout-specific own completion records. No online multiplayer, community service, DDNet port or true 3D claimed.'}
(project / 'notes/direction-coop-package-20261005.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'passed': True, 'package_checks': len(checks), 'protected_prior_files': len(baseline['protected']), 'browser_acceptance': 'pending'}, ensure_ascii=False))
