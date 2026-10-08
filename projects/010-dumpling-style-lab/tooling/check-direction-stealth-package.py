"""Check the seventh sample's delivery and preservation; browser scope stays explicit."""
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
       'direction-shift.html', 'direction-freight.html', 'direction-dungeon.html',
       'references.html', 'forms.html']
entry = 'direction-stealth.html?demo=1#play'
for name in ['direction-stealth.html'] + nav:
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

baseline = json.loads((project / 'notes/stealth-preservation-before-20261005.json').read_text(encoding='utf-8'))
check('only the eight authorized navigation pages excluded from protection',
      set(baseline['authorized_navigation']) == set(nav))
check('all 2587 prior web files included in preservation baseline', len(baseline['protected']) == 2587)
changed, missing = [], []
for name, expected in baseline['protected'].items():
 file = web / name
 if not file.is_file():
  missing.append(name)
 elif hashlib.sha256(file.read_bytes()).hexdigest().lower() != expected.lower():
  changed.append(name)
check('all prior games, art, versions and six direction runtimes retained unchanged',
      not changed and not missing, protected=len(baseline['protected']), changed=changed, missing=missing)

images = ['materials-atlas.png', 'estate-props.png', 'covert-actors.png', 'moonlit-estate.png', 'state-variants.png']
files = ['direction-stealth.html', 'direction-stealth.css', 'direction-stealth.js',
         'direction-stealth-engine.js', 'direction-stealth-render.js'] \
        + ['assets/directions/stealth/' + n for n in images] + nav
check('eighteen source resources checked against build and HTTP', len(files) == 18)
for name in files:
 data = (web / name).read_bytes()
 check('public build matches source', (public / name).is_file() and (public / name).read_bytes() == data, file=name)
 with urlopen('http://127.0.0.1:8962/' + name, timeout=15) as r:
  check('live HTTP route matches source', r.status == 200 and r.read() == data, file=name)

for name, cols, rows in [('materials-atlas.png', 3, 2), ('moonlit-estate.png', 1, 1)]:
 bitmap = Image.open(web / 'assets/directions/stealth' / name)
 opaque = bitmap.mode == 'RGB' or (bitmap.mode == 'RGBA' and bitmap.getchannel('A').getextrema() == (255, 255))
 check('opaque original material atlas or narrative banner', opaque and bitmap.width >= 768
       and bitmap.height >= 512 and bitmap.width / cols >= 128 and bitmap.height / rows >= 128,
       file=name, mode=bitmap.mode, size=bitmap.size, grid=[cols, rows])
for name, cols, rows in [('estate-props.png', 3, 2), ('covert-actors.png', 4, 2), ('state-variants.png', 3, 2)]:
 bitmap = Image.open(web / 'assets/directions/stealth' / name)
 alpha = bitmap.getchannel('A').getextrema() if bitmap.mode == 'RGBA' else None
 check('genuine alpha atlas with usable actual crop dimensions', bitmap.mode == 'RGBA'
       and alpha[0] == 0 and alpha[1] > 0 and bitmap.width / cols >= 128 and bitmap.height / rows >= 128,
       file=name, mode=bitmap.mode, size=bitmap.size, grid=[cols, rows], alpha=alpha)

css = (web / 'direction-stealth.css').read_text(encoding='utf-8')
for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)', css):
 parts = urlsplit(ref)
 if not parts.scheme and not ref.startswith('data:'):
  check('stylesheet asset exists', (web / parts.path).is_file(), resource=ref)
for name in ['direction-stealth.js', 'direction-stealth-render.js', 'direction-stealth-engine.js']:
 source = (web / name).read_text(encoding='utf-8')
 for ref in re.findall(r'(?:from\s*|import\s*)[\'\"](\./[^\'\"]+)[\'\"]', source):
  check('local JavaScript import exists', (web / urlsplit(ref).path).is_file(), module=name, resource=ref)

for name in nav:
 count = sum(a.get('href') == entry for a in Page(web / name).nav_links)
 check('seventh direction integrated exactly once into header navigation', count == 1, page=name, count=count)
original_pages = ['directions.html', 'direction-park.html', 'direction-coop.html',
                  'direction-shift.html', 'direction-freight.html', 'direction-dungeon.html']
new_nav = Page(web / 'direction-stealth.html').nav_links
for name in original_pages:
 count = sum(urlsplit(a.get('href', '')).path == name and urlsplit(a.get('href', '')).fragment == 'play'
             for a in new_nav)
 check('earlier original entrance present exactly once in new header navigation', count == 1, page=name, count=count)
direction = (web / 'directions.html').read_text(encoding='utf-8')
check('seven originals separately labelled from ten reference directions',
      '本轮 7 个原创可玩样例' in direction and direction.count('class="direction-card') == 10)
check('The Dark Mod reference retained alongside original environmental stealth',
      '<article class="direction-card featured"><span class="index">10 / 环境潜行与多种解法</span>' in direction
      and 'https://www.thedarkmod.com/main/' in direction and '观察 · 紧张 · 机智 · 脱身' in direction
      and '新增样例为原创本地俯视潜行体验' in direction)
references = Page(web / 'references.html')
check('all seven original entrances retained in reference launch',
      set(original_pages + ['direction-stealth.html']) <= {urlsplit(a.get('href', '')).path for a in references.links})
check('prior curated references retained',
      {'hypersomnia', 'isocity', 'supertuxkart', 'source', 'priorities', 'candidates', 'standards'} <= set(references.ids))
check('original collection counts retained', '107 种已接入形态' in (web / 'forms.html').read_text(encoding='utf-8')
      and '116 个入口' in (web / 'references.html').read_text(encoding='utf-8'))
for name, ordinal in [('directions.html', 'DIRECTION STUDY 01 /'),
                      ('direction-park.html', '第 2 个原创方向样例'),
                      ('direction-coop.html', '第 3 个原创方向样例'),
                      ('direction-shift.html', '第四个原创样例'),
                      ('direction-freight.html', '第五个原创样例'),
                      ('direction-dungeon.html', '第六个原创样例')]:
 check('earlier sample ordinal retained', ordinal in (web / name).read_text(encoding='utf-8'), page=name, ordinal=ordinal)
controller = (web / 'direction-stealth.js').read_text(encoding='utf-8')
check('independent save key without deleting prior storage', 'world-play-direction-stealth-v1' in controller
      and 'localStorage.clear' not in controller and 'removeItem' not in controller)

generation = json.loads((project / 'assets/directions/stealth-generation-20261005.json').read_text(encoding='utf-8'))
active = [i for i in generation['images'] if i.get('final', True)]
expected_images = {'web/assets/directions/stealth/' + n for n in images}
check('five active original bitmaps with full prompts and provenance', generation['mode'] == 'built-in ImageGen'
      and len(active) == 5 and {i['file'].replace('\\', '/') for i in active} == expected_images
      and all(len(i['prompt']) >= 100 and (i.get('source') or i.get('source_output')) and (project / i['file']).is_file()
              for i in generation['images']))

new_reports = ['direction-stealth-rules-20261005.json', 'direction-stealth-controller-20261005.json']
prior_reports = ['direction-dungeon-rules-20261005.json', 'direction-dungeon-controller-20261005.json',
                 'direction-freight-rules-20261005.json', 'direction-freight-controller-20261005.json',
                 'direction-shift-rules-20261005.json', 'direction-shift-controller-20261005.json',
                 'direction-coop-rules-20261005.json', 'direction-coop-controller-20261005.json',
                 'direction-factory-rules-20261005.json', 'direction-controller-checks-20261005.json',
                 'direction-park-rules-20261005.json', 'direction-park-controller-20261005.json']
prior_checks = 0
new_check_counts = {}
for name in new_reports + prior_reports:
 result = json.loads((project / 'notes' / name).read_text(encoding='utf-8'))
 check('production rules and callbacks passed', result['passed'] is True and not result.get('failures'), report=name)
 if name in prior_reports:
  prior_checks += len(result['checks'])
 else:
  new_check_counts[name] = len(result['checks'])
check('all 184 prior direction rule and callback checks retained', prior_checks == 184, actual_count=prior_checks)
check('twenty-two stealth rule and twenty-four controller checks passed',
      new_check_counts[new_reports[0]] == 22 and new_check_counts[new_reports[1]] == 24,
      rules=new_check_counts[new_reports[0]], callbacks=new_check_counts[new_reports[1]])
frames = list((project / 'assets/directions/stealth-qa').glob('*.png'))
check('at least six actual production frames retained', len(frames) >= 6
      and all(Image.open(f).size == (1440, 960) for f in frames), actual_count=len(frames))
frame_report = project / 'notes/direction-stealth-frames-20261005.json'
frame_evidence = json.loads(frame_report.read_text(encoding='utf-8'))
check('production frame report retained separately from browser evidence',
      isinstance(frame_evidence.get('frames'), list) and len(frame_evidence['frames']) >= 6)
for capture in frame_evidence['frames']:
 capture_path = capture.get('file') if isinstance(capture, dict) else capture
 valid = isinstance(capture_path, str) and capture_path.replace('\\', '/').startswith('assets/directions/stealth-qa/')
 check('reported production frame retained in its own evidence directory', valid
       and (project / capture_path).is_file() and Image.open(project / capture_path).size == (1440, 960),
       file=capture_path)
quality_file = project / 'notes/direction-stealth-quality-20261005.json'
quality = json.loads(quality_file.read_text(encoding='utf-8'))
check('quality and scope review retained as its own report', bool(quality.get('scope')) and bool(quality.get('status')))

browser_file = project / 'notes/direction-stealth-browser-20261005.json'
browser = json.loads(browser_file.read_text(encoding='utf-8')) if browser_file.is_file() else None
browser_status = browser.get('status', 'passed' if browser.get('passed') is True else
                             'failed' if browser.get('passed') is False else 'pending') if browser else 'pending'
if browser:
 for capture in browser.get('screenshots', []):
  capture_path = capture.get('file') if isinstance(capture, dict) else capture
  check('reported browser screenshot retained', isinstance(capture_path, str)
        and (project / capture_path).is_file(), file=capture_path)
report = {'date': '2026-10-05', 'passed': True, 'checks': checks, 'source_resources': len(files),
          'protected_prior_files': len(baseline['protected']), 'prior_direction_checks': prior_checks,
          'new_rule_checks': new_check_counts[new_reports[0]], 'new_callback_checks': new_check_counts[new_reports[1]],
          'total_direction_checks': prior_checks + sum(new_check_counts.values()),
          'render_frame_count': len(frames), 'browser_acceptance': browser_status,
          'browser_passed': browser.get('passed') if browser else None,
          'browser_method': browser.get('method') if browser else None,
          'browser_checks': browser.get('checks', []) if browser else [],
          'browser_screenshots': browser.get('screenshots', []) if browser else [],
          'browser_remaining': browser.get('remaining', []) if browser else [],
          'browser_scope': browser.get('scope') if browser else None,
          'browser_report': 'notes/direction-stealth-browser-20261005.json' if browser else None,
          'quality_report': 'notes/direction-stealth-quality-20261005.json',
          'scope': 'Seventh original game direction: environmental stealth with real light, sound and guard systems, '
                   'three solutions, original bitmap art and a separate local save. '
                   'This resource package check verifies delivery, navigation, evidence and preservation; '
                   'browser acceptance is reported verbatim within its recorded scope. '
                   'It does not constitute a The Dark Mod source port or human emotional/product acceptance.'}
(project / 'notes/direction-stealth-package-20261005.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'package_checks': len(checks), 'source_resources': len(files),
                  'protected_prior_files': len(baseline['protected']), 'prior_direction_checks': prior_checks,
                  'total_direction_checks': prior_checks + sum(new_check_counts.values()),
                  'render_frame_count': len(frames), 'browser_acceptance': browser_status}, ensure_ascii=False))
