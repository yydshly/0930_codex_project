"""Check the sixth sample's delivery and preservation; browser QA is separate."""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
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
  self.ids, self.links, self.assets, self.nav_links = [], [], [], []
  self.in_nav = False
  self.feed(file.read_text(encoding='utf-8'))

 def handle_starttag(self, tag, attrs):
  a = dict(attrs)
  if tag == 'nav':
   self.in_nav = True
  if 'id' in a:
   self.ids.append(a['id'])
  if tag == 'a':
   self.links.append(a)
   if self.in_nav:
    self.nav_links.append(a)
  if tag == 'script' and 'src' in a:
   self.assets.append(a['src'])
  if tag == 'link' and a.get('rel') == 'stylesheet':
   self.assets.append(a['href'])

 def handle_endtag(self, tag):
  if tag == 'nav':
   self.in_nav = False


nav = ['directions.html', 'direction-park.html', 'direction-coop.html',
       'direction-shift.html', 'direction-freight.html', 'references.html', 'forms.html']
for name in ['direction-dungeon.html'] + nav:
 page = Page(web / name)
 check('page anchors unique', len(page.ids) == len(set(page.ids)), page=name)
 for a in page.links:
  parts = urlsplit(a.get('href', ''))
  if parts.scheme:
   check('secure external reference', parts.scheme == 'https' and a.get('target') == '_blank'
         and {'noopener', 'noreferrer'} <= set(a.get('rel', '').split()), href=a['href'])
  else:
   dest = web / (unquote(parts.path) or name)
   if dest.is_dir():
    dest /= 'index.html'
   check('local destination exists', dest.is_file(), page=name, href=a['href'])
   if parts.fragment:
    check('local fragment exists', unquote(parts.fragment) in Page(dest).ids, page=name, href=a['href'])
 for asset in page.assets:
  check('page resource exists', (web / urlsplit(asset).path).is_file(), page=name, resource=asset)

baseline = json.loads((project / 'notes/dungeon-preservation-before-20261005.json').read_text(encoding='utf-8'))
check('only the seven authorized navigation pages excluded from protection', set(baseline['authorized_navigation']) == set(nav))
changed, missing = [], []
for name, expected in baseline['protected'].items():
 file = web / name
 if not file.is_file():
  missing.append(name)
 elif hashlib.sha256(file.read_bytes()).hexdigest().lower() != expected.lower():
  changed.append(name)
check('all prior games, art, versions and five direction runtimes retained unchanged',
      not changed and not missing, protected=len(baseline['protected']), changed=changed, missing=missing)

images = ['stone-atlas.png', 'chambers-atlas.png', 'overhead-actors.png', 'front-actors.png']
files = ['direction-dungeon.html', 'direction-dungeon.css', 'direction-dungeon.js',
         'direction-dungeon-engine.js', 'direction-dungeon-render.js'] \
        + ['assets/directions/dungeon/' + n for n in images] + nav
for name in files:
 data = (web / name).read_bytes()
 check('public build matches source', (public / name).is_file() and (public / name).read_bytes() == data, file=name)
 with urlopen('http://127.0.0.1:8962/' + name, timeout=15) as r:
  check('live HTTP route matches source', r.status == 200 and r.read() == data, file=name)

stone = Image.open(web / 'assets/directions/dungeon/stone-atlas.png')
check('opaque square stone atlas', stone.mode == 'RGB' and stone.width == stone.height and stone.width >= 700,
      file='stone-atlas.png', mode=stone.mode, size=stone.size)
for name, cols, rows in [('chambers-atlas.png', 3, 2), ('overhead-actors.png', 4, 2), ('front-actors.png', 4, 2)]:
 bitmap = Image.open(web / 'assets/directions/dungeon' / name)
 valid = bitmap.mode == 'RGBA' and bitmap.getchannel('A').getextrema()[0] == 0 \
         and bitmap.getchannel('A').getextrema()[1] > 0 and bitmap.width % cols == 0 \
         and bitmap.height % rows == 0 and bitmap.width >= 700 and bitmap.height >= 700
 check('genuine alpha atlas with usable grid dimensions', valid, file=name, size=bitmap.size, grid=[cols, rows])

css = (web / 'direction-dungeon.css').read_text(encoding='utf-8')
for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)', css):
 parts = urlsplit(ref)
 if not parts.scheme and not ref.startswith('data:'):
  check('stylesheet asset exists', (web / parts.path).is_file(), resource=ref)
for name in ['direction-dungeon.js', 'direction-dungeon-render.js', 'direction-dungeon-engine.js']:
 text = (web / name).read_text(encoding='utf-8')
 for ref in re.findall(r'(?:from\s*|import\s*)[\'\"](\./[^\'\"]+)[\'\"]', text):
  check('local JavaScript import exists', (web / urlsplit(ref).path).is_file(), module=name, resource=ref)

for name in nav:
 check('sixth direction integrated into navigation', any(a.get('href') == 'direction-dungeon.html?demo=1#play'
       for a in Page(web / name).nav_links), page=name)
direction = (web / 'directions.html').read_text(encoding='utf-8')
check('six originals separately labelled from ten reference directions',
      '本轮 6 个原创可玩样例' in direction and direction.count('class="direction-card') == 10)
check('KeeperFX reference retained alongside original local sample',
      '<article class="direction-card featured"><span class="index">08 / 地下城经营与附身</span>' in direction
      and 'https://keeperfx.net/' in direction and '新增样例为原创本地地下城体验' in direction)
references = Page(web / 'references.html')
check('all earlier original sample entrances retained in reference launch',
      {'directions.html', 'direction-park.html', 'direction-coop.html', 'direction-shift.html',
       'direction-freight.html', 'direction-dungeon.html'} <= {urlsplit(a.get('href', '')).path for a in references.links})
check('prior curated references retained',
      {'hypersomnia', 'isocity', 'supertuxkart', 'source', 'priorities', 'candidates', 'standards'} <= set(references.ids))
check('original collection counts retained', '107 种已接入形态' in (web / 'forms.html').read_text(encoding='utf-8')
      and '116 个入口' in (web / 'references.html').read_text(encoding='utf-8'))
for name, ordinal in [('direction-coop.html', '第 3 个原创方向样例'),
                      ('direction-shift.html', '第四个原创样例'), ('direction-freight.html', '第五个原创样例')]:
 check('earlier sample ordinal retained', ordinal in (web / name).read_text(encoding='utf-8'), page=name, ordinal=ordinal)
controller = (web / 'direction-dungeon.js').read_text(encoding='utf-8')
check('independent save key without deleting prior storage', 'world-play-direction-dungeon-v1' in controller
      and 'localStorage.clear' not in controller and 'removeItem' not in controller)

generation = json.loads((project / 'assets/directions/dungeon-generation-20261005.json').read_text(encoding='utf-8'))
active = [i for i in generation['images'] if i.get('final', True)]
expected_images = {'web/assets/directions/dungeon/' + n for n in images}
check('four active original bitmaps with full prompts and provenance', generation['mode'] == 'built-in ImageGen'
      and len(active) == 4 and {i['file'].replace('\\', '/') for i in active} == expected_images
      and all(len(i['prompt']) >= 100 and (i.get('source') or i.get('source_output')) and (project / i['file']).is_file()
              for i in generation['images']))

reports = ['direction-dungeon-rules-20261005.json', 'direction-dungeon-controller-20261005.json',
           'direction-freight-rules-20261005.json', 'direction-freight-controller-20261005.json',
           'direction-shift-rules-20261005.json', 'direction-shift-controller-20261005.json',
           'direction-coop-rules-20261005.json', 'direction-coop-controller-20261005.json',
           'direction-factory-rules-20261005.json', 'direction-controller-checks-20261005.json',
           'direction-park-rules-20261005.json', 'direction-park-controller-20261005.json']
for name in reports:
 check('production rules and callbacks passed',
       json.loads((project / 'notes' / name).read_text(encoding='utf-8'))['passed'], report=name)
frames = list((project / 'assets/directions/dungeon-qa').glob('*.png'))
check('at least six actual production frames retained', len(frames) >= 6 and all(Image.open(f).size == (1440, 900) for f in frames), actual_count=len(frames))
browser_file = project / 'notes/direction-dungeon-browser-20261005.json'
browser = json.loads(browser_file.read_text(encoding='utf-8')) if browser_file.is_file() else None
browser_status = ('passed' if browser.get('passed') is True else 'failed' if browser.get('passed') is False
                  else browser.get('status', 'pending')) if browser is not None else 'pending'
report = {'date': '2026-10-05', 'passed': True, 'checks': checks, 'source_resources': len(files),
          'protected_prior_files': len(baseline['protected']), 'render_frame_count': len(frames),
          'browser_acceptance': browser_status, 'browser_checks': browser.get('checks', []) if browser else [],
          'browser_report': 'notes/direction-dungeon-browser-20261005.json' if browser else None,
          'scope': 'Sixth original game direction: dungeon management and possession, with original bitmap art. '
                   'This resource package check verifies delivery, navigation, evidence and preservation; '
                   'it does not constitute browser interaction acceptance or a KeeperFX source port.'}
(project / 'notes/direction-dungeon-package-20261005.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'package_checks': len(checks), 'source_resources': len(files),
                  'protected_prior_files': len(baseline['protected']), 'render_frame_count': len(frames),
                  'browser_acceptance': browser_status}, ensure_ascii=False))
