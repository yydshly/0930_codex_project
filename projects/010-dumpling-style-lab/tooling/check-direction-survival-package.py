"""Audit the ninth original sample's resources and preservation without inventing browser QA."""
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
remote_dependencies = set()


def check(name, valid, **detail):
 checks.append({'name': name, 'passed': bool(valid), **detail})
 if not valid:
  raise AssertionError((name, detail))


class Page(HTMLParser):
 def __init__(self, file):
  super().__init__(convert_charrefs=True)
  self.ids, self.links, self.assets, self.nav_links = [], [], [], []
  self.comparison_links = []
  self.in_nav = False
  self.in_comparison = False
  self.import_map_text = None
  self.imports = {}
  self.feed(file.read_text(encoding='utf-8'))

 def handle_starttag(self, tag, attrs):
  a = dict(attrs)
  if tag == 'nav':
   self.in_nav = True
  if tag == 'section' and 'survival-compare' in a.get('class', '').split():
   self.in_comparison = True
  if 'id' in a:
   self.ids.append(a['id'])
  if tag == 'a':
   self.links.append(a)
   if self.in_nav:
    self.nav_links.append(a)
   if self.in_comparison:
    self.comparison_links.append(a)
  if tag == 'script':
   if 'src' in a:
    self.assets.append(a['src'])
   if a.get('type') == 'importmap':
    self.import_map_text = ''
  if tag == 'link' and a.get('rel') == 'stylesheet':
   self.assets.append(a['href'])

 def handle_data(self, data):
  if self.import_map_text is not None:
   self.import_map_text += data

 def handle_endtag(self, tag):
  if tag == 'nav':
   self.in_nav = False
  if tag == 'section':
   self.in_comparison = False
  if tag == 'script' and self.import_map_text is not None:
   self.imports.update(json.loads(self.import_map_text).get('imports', {}))
   self.import_map_text = None


def local_target(reference, origin):
 parts = urlsplit(reference)
 if parts.scheme:
  check('runtime dependency uses secure HTTP', parts.scheme == 'https', reference=reference)
  remote_dependencies.add(reference)
  return None
 path = unquote(parts.path)
 target = (web / path.lstrip('/') if path.startswith('/') else origin.parent / path).resolve()
 check('local resource resolves inside the web project', target.is_relative_to(web.resolve()), reference=reference)
 check('local resource exists', target.is_file(), reference=reference)
 return target


def javascript_imports(source):
 """Read import/re-export tokens, excluding comments, text, templates and regex literals."""
 tokens, cursor = [], 0
 regex_prefix = {'(', '[', '{', '=', ':', ',', ';', '!', '?', '&', '|', 'return', 'throw', 'case', 'yield', '=>'}
 while cursor < len(source):
  char = source[cursor]
  if char.isspace():
   cursor += 1
  elif source.startswith('//', cursor):
   ending = source.find('\n', cursor + 2)
   cursor = len(source) if ending < 0 else ending + 1
  elif source.startswith('/*', cursor):
   ending = source.find('*/', cursor + 2)
   cursor = len(source) if ending < 0 else ending + 2
  elif char in "'\"`":
   quote, value = char, []
   cursor += 1
   while cursor < len(source):
    char = source[cursor]
    cursor += 1
    if char == '\\' and cursor < len(source):
     value.append(source[cursor])
     cursor += 1
    elif char == quote:
     break
    else:
     value.append(char)
   tokens.append(('template' if quote == '`' else 'string', ''.join(value)))
  elif char == '/' and (not tokens or tokens[-1][1] in regex_prefix):
   cursor += 1
   in_class = False
   while cursor < len(source):
    char = source[cursor]
    cursor += 1
    if char == '\\':
     cursor += 1
    elif char == '[':
     in_class = True
    elif char == ']':
     in_class = False
    elif char == '/' and not in_class:
     break
   while cursor < len(source) and source[cursor].isalpha():
    cursor += 1
   tokens.append(('regex', 'regex'))
  elif char.isalpha() or char in '_$':
   begin = cursor
   cursor += 1
   while cursor < len(source) and (source[cursor].isalnum() or source[cursor] in '_$'):
    cursor += 1
   tokens.append(('identifier', source[begin:cursor]))
  else:
   tokens.append(('punctuation', char))
   cursor += 1
 imports = []
 for index, (kind, value) in enumerate(tokens):
  if kind != 'identifier' or value not in {'import', 'export'}:
   continue
  if index and tokens[index - 1][1] == '.':
   continue
  following = tokens[index + 1:]
  if not following:
   continue
  if value == 'import' and following[0][0] == 'string':
   imports.append(following[0][1])
  elif value == 'import' and following[0][1] == '(':
   if len(following) > 2 and following[1][0] == 'string' and following[2][1] in {')', ','}:
    imports.append(following[1][1])
  elif following[0][1] in {'{', '*'} or (value == 'import' and following[0][0] == 'identifier'):
   for offset, token in enumerate(following[:-1]):
    if token[1] == ';' or (offset and token[1] in {'import', 'export'}):
     break
    if token == ('identifier', 'from') and following[offset + 1][0] == 'string':
     imports.append(following[offset + 1][1])
     break
 return imports


nav = ['directions.html', 'direction-park.html', 'direction-coop.html',
       'direction-shift.html', 'direction-freight.html', 'direction-dungeon.html',
       'direction-stealth.html', 'direction-space.html', 'references.html', 'forms.html']
original_pages = nav[:8]
entry = 'direction-survival.html?demo=1#play'
for name in ['direction-survival.html'] + nav:
 page = Page(web / name)
 check('page anchors unique', len(page.ids) == len(set(page.ids)), page=name)
 for anchor in page.links:
  parts = urlsplit(anchor.get('href', ''))
  if parts.scheme:
   check('secure external reference', parts.scheme == 'https' and anchor.get('target') == '_blank'
         and {'noopener', 'noreferrer'} <= set(anchor.get('rel', '').split()), href=anchor['href'])
  else:
   destination = web / (unquote(parts.path).lstrip('/') or name)
   if destination.is_dir():
    destination /= 'index.html'
   check('local destination exists', destination.is_file(), page=name, href=anchor['href'])
   if parts.fragment:
    check('local fragment exists', unquote(parts.fragment) in Page(destination).ids,
          page=name, href=anchor['href'])
 for reference in page.assets:
  local_target(reference, web / name)

baseline_file = project / 'notes/survival-preservation-before-20261005.json'
baseline = json.loads(baseline_file.read_text(encoding='utf-8'))
check('only the ten authorized old navigation pages excluded from protection',
      set(baseline['mutable_navigation']) == set(nav) and len(baseline['mutable_navigation']) == 10)
changed, missing = [], []
for name, expected in baseline['files'].items():
 file = web / name
 if not file.is_file():
  missing.append(name)
 elif hashlib.sha256(file.read_bytes()).hexdigest().lower() != expected.lower():
  changed.append(name)
check('all prior games, art, versions and eight original direction runtimes retained unchanged',
      not changed and not missing, protected=len(baseline['files']), changed=changed, missing=missing)

asset_dir = web / 'assets/directions/survival'
asset_files = sorted(file for file in asset_dir.rglob('*') if file.is_file())
required_pngs = {'valley.png', 'ground-atlas.png', 'props-atlas.png', 'actors-atlas.png'}
asset_names = [file.name for file in asset_files]
check('four intended original survival PNGs included', set(asset_names) == required_pngs,
      actual=asset_names)
check('each intended survival bitmap has one unambiguous path',
      all(asset_names.count(name) == 1 for name in required_pngs))
for bitmap_file in asset_files:
 with Image.open(bitmap_file) as bitmap:
  check('survival art is a usable actual PNG bitmap', bitmap.format == 'PNG' and min(bitmap.size) >= 512
        and bitmap.mode in {'RGB', 'RGBA'}, file=bitmap_file.relative_to(web).as_posix(),
        mode=bitmap.mode, size=bitmap.size)

resource_paths = {web / name for name in ['direction-survival.html', 'direction-survival.css',
                                         'direction-survival.js', 'direction-survival-engine.js',
                                         'direction-survival-render.js'] + nav}
resource_paths.update(asset_files)
survival_page = Page(web / 'direction-survival.html')
for reference in survival_page.assets:
 target = local_target(reference, web / 'direction-survival.html')
 if target is not None:
  resource_paths.add(target)
module_queue = [web / name for name in ['direction-survival.js', 'direction-survival-engine.js',
                                      'direction-survival-render.js']]
visited_modules = set()
while module_queue:
 module = module_queue.pop().resolve()
 if module in visited_modules:
  continue
 visited_modules.add(module)
 source = module.read_text(encoding='utf-8')
 for reference in javascript_imports(source):
  mapped_reference, origin = reference, module
  if not reference.startswith(('./', '../', '/', 'https://')):
   matches = [key for key in survival_page.imports if reference == key
              or (key.endswith('/') and reference.startswith(key))]
   check('bare JavaScript import has a declared import map', bool(matches), module=module.name,
         reference=reference)
   key = max(matches, key=len)
   mapped_reference = survival_page.imports[key] + reference[len(key):]
   origin = web / 'direction-survival.html'
  target = local_target(mapped_reference, origin)
  if target is not None:
   resource_paths.add(target)
   if target.suffix in {'.js', '.mjs'}:
    module_queue.append(target)
css = (web / 'direction-survival.css').read_text(encoding='utf-8')
for reference in re.findall(r'url\([\'\"]?([^\)\'\"]+)', css):
 if not reference.startswith('data:'):
  target = local_target(reference, web / 'direction-survival.css')
  if target is not None:
   resource_paths.add(target)
files = sorted({file.resolve().relative_to(web.resolve()).as_posix() for file in resource_paths})
for name in files:
 data = (web / name).read_bytes()
 check('public build matches source', (public / name).is_file() and (public / name).read_bytes() == data,
       file=name)
 with urlopen('http://127.0.0.1:8962/' + name, timeout=15) as response:
  check('live HTTP route matches source', response.status == 200 and response.read() == data, file=name)

for name in nav:
 count = sum(anchor.get('href') == entry for anchor in Page(web / name).nav_links)
 check('ninth direction integrated exactly once into old header navigation', count == 1,
       page=name, count=count)
for name in original_pages:
 count = sum(urlsplit(anchor.get('href', '')).path == name
             and urlsplit(anchor.get('href', '')).fragment == 'play'
             for anchor in survival_page.comparison_links)
 check('each earlier original entrance appears once in the new sample comparison', count == 1,
       page=name, count=count)
direction = (web / 'directions.html').read_text(encoding='utf-8')
check('nine originals separately labelled from ten reference directions',
      '本轮 9 个原创可玩样例' in direction and direction.count('class="direction-card') == 10)
check('survival reference 07 links both original local survival and the official Cataclysm project',
      '<article class="direction-card featured"><span class="index">07 / 持续世界生存</span>' in direction
      and 'https://github.com/CleverRaven/Cataclysm-DDA' in direction
      and '新增样例为原创本地二维俯视生存体验' in direction)
check('final vehicle physics direction 09 remains reference-only',
      '<article class="direction-card"><span class="index">09 / 车辆物理与工程协作</span>' in direction
      and 'https://www.rigsofrods.org/' in direction
      and direction.count('class="direction-card featured"') == 9)
references = Page(web / 'references.html')
check('all nine original entrances retained in reference launch',
      set(original_pages + ['direction-survival.html'])
      <= {urlsplit(anchor.get('href', '')).path for anchor in references.links})
check('prior curated reference sections retained',
      {'hypersomnia', 'isocity', 'supertuxkart', 'source', 'priorities', 'candidates', 'standards'}
      <= set(references.ids))
check('original collection counts retained separately',
      '107 种已接入形态' in (web / 'forms.html').read_text(encoding='utf-8')
      and '116 个入口' in (web / 'references.html').read_text(encoding='utf-8'))
for name, ordinal in [('directions.html', 'DIRECTION STUDY 01 /'),
                      ('direction-park.html', '第 2 个原创方向样例'),
                      ('direction-coop.html', '第 3 个原创方向样例'),
                      ('direction-shift.html', '第四个原创样例'),
                      ('direction-freight.html', '第五个原创样例'),
                      ('direction-dungeon.html', '第六个原创样例'),
                      ('direction-stealth.html', '第七个原创样例'),
                      ('direction-space.html', '原创方向 / 08')]:
 check('earlier sample ordinal retained', ordinal in (web / name).read_text(encoding='utf-8'),
       page=name, ordinal=ordinal)
for name in original_pages[1:]:
 source = (web / name).read_text(encoding='utf-8')
 check('current collection count does not mislabel the ninth direction as eighth',
       '8 个原创方向' not in source and '八个原创' not in source
       and 'EIGHT DIFFERENT REASONS' not in source, page=name)
controller = (web / 'direction-survival.js').read_text(encoding='utf-8')
check('independent survival save key without deleting prior storage',
      'world-play-direction-survival-v1' in controller and 'localStorage.clear' not in controller
      and 'removeItem' not in controller)

generation = json.loads((project / 'assets/directions/survival-generation-20261005.json')
                        .read_text(encoding='utf-8'))
active = [item for item in generation['assets'] if item.get('final', True)]
expected_images = {'web/assets/directions/survival/' + name for name in required_pngs}
check('four original survival bitmaps have full ImageGen prompts and provenance',
      generation['mode'] == 'built-in image_gen; generate new original bitmap assets'
      and {item['output'].replace('\\', '/') for item in active} == expected_images
      and len(active) == len(expected_images)
      and all(item.get('key') and len(item.get('prompt', '')) >= 100 and item.get('source_path')
              and Path(item['source_path']).is_file() and (project / item['output']).is_file()
              for item in active))

new_reports = ['direction-survival-rules-20261005.json', 'direction-survival-controller-20261005.json']
prior_reports = ['direction-space-rules-20261005.json', 'direction-space-controller-20261005.json',
                 'direction-stealth-rules-20261005.json', 'direction-stealth-controller-20261005.json',
                 'direction-dungeon-rules-20261005.json', 'direction-dungeon-controller-20261005.json',
                 'direction-freight-rules-20261005.json', 'direction-freight-controller-20261005.json',
                 'direction-shift-rules-20261005.json', 'direction-shift-controller-20261005.json',
                 'direction-coop-rules-20261005.json', 'direction-coop-controller-20261005.json',
                 'direction-factory-rules-20261005.json', 'direction-controller-checks-20261005.json',
                 'direction-park-rules-20261005.json', 'direction-park-controller-20261005.json']
rule_reports = {}
for name in new_reports + prior_reports:
 result = json.loads((project / 'notes' / name).read_text(encoding='utf-8'))
 check('recorded production rules and actual controller callbacks passed', result.get('passed') is True
       and not result.get('failures') and isinstance(result.get('checks'), list)
       and all(not isinstance(item, dict) or item.get('passed') is True for item in result['checks']),
       report=name)
 rule_reports[name] = {'passed': result['passed'], 'check_count': len(result['checks']),
                       'method': result.get('method')}
prior_checks = sum(rule_reports[name]['check_count'] for name in prior_reports)
check('eight prior original directions retain their 282 recorded checks', prior_checks == 282,
      actual=prior_checks)
new_rule_count, new_callback_count = [rule_reports[name]['check_count'] for name in new_reports]
quality_file = project / 'notes/direction-survival-quality-20261005.json'
quality = json.loads(quality_file.read_text(encoding='utf-8'))
check('quality and explicit scope review retained as its own report',
      bool(quality.get('scope')) and bool(quality.get('status')))
history_bytes = quality['preservation']['readme_historical_suffix_bytes']
history = (project / 'README.md').read_bytes()[-history_bytes:]
check('README historical suffix is retained byte for byte',
      hashlib.sha256(history).hexdigest() == quality['preservation']['readme_historical_suffix_sha256'],
      suffix_bytes=history_bytes)

browser_file = project / 'notes/direction-survival-browser-20261005.json'
browser = json.loads(browser_file.read_text(encoding='utf-8')) if browser_file.is_file() else None
browser_status = browser.get('status', 'passed' if browser.get('passed') is True else
                             'failed' if browser.get('passed') is False else 'pending') if browser else 'pending'
capture_sizes = []
if browser:
 for capture in browser.get('screenshots', []):
  capture_path = capture.get('file') if isinstance(capture, dict) else capture
  file = Path(capture_path) if isinstance(capture_path, str) else None
  if file is not None and not file.is_absolute():
   file = project / file
  check('reported actual browser screenshot retained', file is not None and file.is_file(), file=capture_path)
  with Image.open(file) as bitmap:
   actual_size = list(bitmap.size)
   check('reported browser screenshot is a usable image', min(bitmap.size) > 0,
         file=capture_path, size=actual_size)
   expected_size = capture.get('capture_size', capture.get('size')) if isinstance(capture, dict) else None
   if isinstance(expected_size, dict) and {'width', 'height'} <= expected_size.keys():
    expected_size = [expected_size['width'], expected_size['height']]
   if isinstance(expected_size, (list, tuple)) and len(expected_size) == 2:
    check('browser capture dimensions match its recorded size', actual_size == list(expected_size),
          file=capture_path)
   capture_sizes.append({'file': capture_path, 'actual_size': actual_size,
                         'viewport': capture.get('viewport') if isinstance(capture, dict) else None,
                         'capture_scope': capture.get('capture_scope', capture.get('scope'))
                                          if isinstance(capture, dict) else None})
report = {'date': '2026-10-05', 'passed': True, 'checks': checks, 'source_resources': len(files),
          'resource_inventory': files,
          'survival_asset_inventory': [file.relative_to(web).as_posix() for file in asset_files],
          'remote_runtime_dependencies': sorted(remote_dependencies),
          'protected_prior_files': len(baseline['files']), 'prior_direction_checks': prior_checks,
          'new_rule_checks': new_rule_count, 'new_callback_checks': new_callback_count,
          'total_recorded_direction_checks': prior_checks + new_rule_count + new_callback_count,
          'rule_and_callback_reports': rule_reports, 'quality_status': quality['status'],
          'browser_acceptance': browser_status, 'browser_evidence': browser,
          'browser_screenshot_count': len(capture_sizes), 'browser_screenshot_dimensions': capture_sizes,
          'browser_report': 'notes/direction-survival-browser-20261005.json' if browser else None,
          'quality_report': 'notes/direction-survival-quality-20261005.json',
          'scope': 'Ninth original local game direction: painted original bitmap art in a top-down Canvas2D '
                   'survival scene, with resource depletion, changing weather and camp choices. '
                   'The local world advances only while running and restores paused. This package check '
                   'audits actual resources, JavaScript imports, source/build/live HTTP delivery, full ImageGen '
                   'provenance, recorded rules/callbacks, navigation, original collection statistics and '
                   'preservation. Browser status is copied from the actual browser report within its '
                   'recorded capture/interaction scope; absent evidence remains pending. No three-dimensional '
                   'presentation, offline/server world, endless/procedural map, combat, upstream game port '
                   'or human emotional/commercial product acceptance is implied.'}
(project / 'notes/direction-survival-package-20261005.json').write_text(
 json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'package_checks': len(checks), 'source_resources': len(files),
                  'protected_prior_files': len(baseline['files']), 'new_rule_checks': new_rule_count,
                  'new_callback_checks': new_callback_count, 'prior_direction_checks': prior_checks,
                  'browser_acceptance': browser_status, 'browser_screenshot_count': len(capture_sizes)},
                 ensure_ascii=False))


