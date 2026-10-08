"""Audit the eighth original sample's resources and preservation without inventing browser QA."""
import hashlib
import json
import re
import struct
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
  if tag == 'section' and 'space-compare' in a.get('class', '').split():
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
       'direction-stealth.html', 'references.html', 'forms.html']
entry = 'direction-space.html?demo=1#play'
for name in ['direction-space.html'] + nav:
 page = Page(web / name)
 check('page anchors unique', len(page.ids) == len(set(page.ids)), page=name)
 for a in page.links:
  parts = urlsplit(a.get('href', ''))
  if parts.scheme:
   check('secure external reference', parts.scheme == 'https' and a.get('target') == '_blank'
         and {'noopener', 'noreferrer'} <= set(a.get('rel', '').split()), href=a['href'])
  else:
   destination = web / (unquote(parts.path).lstrip('/') or name)
   if destination.is_dir():
    destination /= 'index.html'
   check('local destination exists', destination.is_file(), page=name, href=a['href'])
   if parts.fragment:
    check('local fragment exists', unquote(parts.fragment) in Page(destination).ids, page=name, href=a['href'])
 for resource in page.assets:
  local_target(resource, web / name)

baseline_file = project / 'notes/space-preservation-before-20261005.json'
baseline = json.loads(baseline_file.read_text(encoding='utf-8'))
check('only the nine authorized navigation pages excluded from protection',
      set(baseline['mutable_navigation']) == set(nav))
changed, missing = [], []
for name, expected in baseline['files'].items():
 file = web / name
 if not file.is_file():
  missing.append(name)
 elif hashlib.sha256(file.read_bytes()).hexdigest().lower() != expected.lower():
  changed.append(name)
check('all prior games, art, versions and seven original direction runtimes retained unchanged',
      not changed and not missing, protected=len(baseline['files']), changed=changed, missing=missing)

asset_dir = web / 'assets/directions/space'
asset_files = sorted(file for file in asset_dir.rglob('*') if file.is_file())
required_pngs = {'nebula.png', 'planet-ocean.png', 'planet-arid.png'}
required_models = {'craft_cargoB.glb', 'craft_speederB.glb', 'hangar_roundGlass.glb',
                   'satelliteDish_detailed.glb', 'meteor_detailed.glb'}
required_notices = {'License-space-kit.txt', 'SOURCE-NOTICE.txt'}
asset_names = [file.name for file in asset_files]
check('all required space images, models and source notices retained',
      required_pngs | required_models | required_notices <= set(asset_names), actual=asset_names)
check('each required space resource has a single unambiguous path',
      all(asset_names.count(name) == 1 for name in required_pngs | required_models | required_notices))
models = [file for file in asset_files if file.suffix.lower() == '.glb']
check('five intended CC0 models included', {file.name for file in models} == required_models,
      files=[file.relative_to(web).as_posix() for file in models])
resource_paths = {web / name for name in ['direction-space.html', 'direction-space.css', 'direction-space.js',
                                         'direction-space-engine.js', 'direction-space-render.js'] + nav}
resource_paths.update(asset_files)

for bitmap_file in [file for file in asset_files if file.name in required_pngs]:
 with Image.open(bitmap_file) as bitmap:
  opaque = bitmap.mode == 'RGB' or (bitmap.mode == 'RGBA' and bitmap.getchannel('A').getextrema() == (255, 255))
  check('space environment texture is an opaque usable two-to-one bitmap', opaque and min(bitmap.size) >= 512
        and bitmap.width == bitmap.height * 2,
        file=bitmap_file.relative_to(web).as_posix(), mode=bitmap.mode, size=bitmap.size)

for model in models:
 data = model.read_bytes()
 header = struct.unpack_from('<4sII', data) if len(data) >= 12 else None
 check('model is a complete glTF2 binary', header == (b'glTF', 2, len(data)), file=model.name, size=len(data))
 cursor, document, binary_size = 12, None, 0
 while cursor < len(data):
  check('GLB chunk header is complete', cursor + 8 <= len(data), file=model.name)
  length, kind = struct.unpack_from('<I4s', data, cursor)
  cursor += 8
  check('GLB chunk lies within file', length % 4 == 0 and cursor + length <= len(data), file=model.name)
  chunk = data[cursor:cursor + length]
  if kind == b'JSON':
   document = json.loads(chunk.decode('utf-8').rstrip(' \0'))
  elif kind == b'BIN\0':
   binary_size += length
  cursor += length
 check('GLB contains actual mesh geometry and binary data', document is not None and binary_size > 0
       and bool(document.get('meshes')) and bool(document.get('nodes'))
       and all('POSITION' in primitive.get('attributes', {})
               for mesh in document.get('meshes', []) for primitive in mesh.get('primitives', [])), file=model.name)
 for item in document.get('buffers', []) + document.get('images', []):
  uri = item.get('uri')
  if uri and not uri.startswith('data:'):
   target = local_target(uri, model)
   if target is not None:
    resource_paths.add(target)

license_file = next(file for file in asset_files if file.name == 'License-space-kit.txt')
notice_file = next(file for file in asset_files if file.name == 'SOURCE-NOTICE.txt')
license_text = license_file.read_text(encoding='utf-8-sig')
notice_text = notice_file.read_text(encoding='utf-8-sig')
check('CC0 license retained with the models', 'CC0' in license_text)
check('model source is recorded alongside original sample art', 'https://kenney.nl/assets/space-kit' in notice_text)

space_page = Page(web / 'direction-space.html')
module_queue = [web / name for name in ['direction-space.js', 'direction-space-engine.js', 'direction-space-render.js']]
visited_modules = set()
while module_queue:
 module = module_queue.pop().resolve()
 if module in visited_modules:
  continue
 visited_modules.add(module)
 source = module.read_text(encoding='utf-8')
 for reference in javascript_imports(source):
  mapped_reference = reference
  origin = module
  if not reference.startswith(('./', '../', '/', 'https://')):
   matches = [key for key in space_page.imports if reference == key or (key.endswith('/') and reference.startswith(key))]
   check('bare JavaScript import has a declared import map', bool(matches), module=module.name, reference=reference)
   key = max(matches, key=len)
   mapped_reference = space_page.imports[key] + reference[len(key):]
   origin = web / 'direction-space.html'
  target = local_target(mapped_reference, origin)
  if target is not None:
   resource_paths.add(target)
   if target.suffix in {'.js', '.mjs'}:
    module_queue.append(target)
css = (web / 'direction-space.css').read_text(encoding='utf-8')
for reference in re.findall(r'url\([\'\"]?([^\)\'\"]+)', css):
 if not reference.startswith('data:'):
  target = local_target(reference, web / 'direction-space.css')
  if target is not None:
   resource_paths.add(target)

files = sorted({file.resolve().relative_to(web.resolve()).as_posix() for file in resource_paths})
for name in files:
 data = (web / name).read_bytes()
 check('public build matches source', (public / name).is_file() and (public / name).read_bytes() == data, file=name)
 with urlopen('http://127.0.0.1:8962/' + name, timeout=15) as response:
  check('live HTTP route matches source', response.status == 200 and response.read() == data, file=name)

for name in nav:
 count = sum(a.get('href') == entry for a in Page(web / name).nav_links)
 check('eighth direction integrated exactly once into header navigation', count == 1, page=name, count=count)
original_pages = ['directions.html', 'direction-park.html', 'direction-coop.html', 'direction-shift.html',
                  'direction-freight.html', 'direction-dungeon.html', 'direction-stealth.html']
for name in original_pages:
 count = sum(urlsplit(a.get('href', '')).path == name and urlsplit(a.get('href', '')).fragment == 'play'
             for a in space_page.comparison_links)
 check('earlier original entrance present exactly once in the new sample comparison', count == 1, page=name, count=count)
direction = (web / 'directions.html').read_text(encoding='utf-8')
check('eight originals separately labelled from ten reference directions',
      '本轮 8 个原创可玩样例' in direction and direction.count('class="direction-card') == 10)
check('Endless Sky reference retained alongside original real three-dimensional flight',
      '<article class="direction-card featured"><span class="index">06 / 太空船长与自由职业</span>' in direction
      and 'https://endless-sky.github.io/' in direction and '新增样例为原创本地真实三维航行体验' in direction)
check('two remaining reference directions retained',
      '<article class="direction-card"><span class="index">07 / 持续世界生存</span>' in direction
      and '<article class="direction-card"><span class="index">09 / 车辆物理与工程协作</span>' in direction
      and 'https://github.com/CleverRaven/Cataclysm-DDA' in direction and 'https://www.rigsofrods.org/' in direction)
references = Page(web / 'references.html')
check('all eight original entrances retained in reference launch',
      set(original_pages + ['direction-space.html']) <= {urlsplit(a.get('href', '')).path for a in references.links})
check('prior curated references retained',
      {'hypersomnia', 'isocity', 'supertuxkart', 'source', 'priorities', 'candidates', 'standards'} <= set(references.ids))
check('original collection counts retained separately', '107 种已接入形态' in (web / 'forms.html').read_text(encoding='utf-8')
      and '116 个入口' in (web / 'references.html').read_text(encoding='utf-8'))
for name, ordinal in [('directions.html', 'DIRECTION STUDY 01 /'),
                      ('direction-park.html', '第 2 个原创方向样例'), ('direction-coop.html', '第 3 个原创方向样例'),
                      ('direction-shift.html', '第四个原创样例'), ('direction-freight.html', '第五个原创样例'),
                      ('direction-dungeon.html', '第六个原创样例'), ('direction-stealth.html', '第七个原创样例')]:
 check('earlier sample ordinal retained', ordinal in (web / name).read_text(encoding='utf-8'), page=name, ordinal=ordinal)
controller = (web / 'direction-space.js').read_text(encoding='utf-8')
check('independent space save key without deleting prior storage', 'world-play-direction-space-v1' in controller
      and 'localStorage.clear' not in controller and 'removeItem' not in controller)

generation = json.loads((project / 'assets/directions/space-generation-20261005.json').read_text(encoding='utf-8'))
active = [image for image in generation['assets'] if image.get('final', True)]
expected_images = {'web/assets/directions/space/' + name for name in required_pngs}
check('original space bitmaps have full ImageGen prompts and provenance',
      generation['mode'] == 'built-in image_gen; generate new original opaque bitmap assets'
      and {image['output'].replace('\\', '/') for image in active} == expected_images
      and len(active) == len(expected_images)
      and all(image.get('key') and len(image['prompt']) >= 100 and image.get('source_path')
              and (project / image['output']).is_file() for image in active))

new_reports = ['direction-space-rules-20261005.json', 'direction-space-controller-20261005.json']
prior_reports = ['direction-stealth-rules-20261005.json', 'direction-stealth-controller-20261005.json',
                 'direction-dungeon-rules-20261005.json', 'direction-dungeon-controller-20261005.json',
                 'direction-freight-rules-20261005.json', 'direction-freight-controller-20261005.json',
                 'direction-shift-rules-20261005.json', 'direction-shift-controller-20261005.json',
                 'direction-coop-rules-20261005.json', 'direction-coop-controller-20261005.json',
                 'direction-factory-rules-20261005.json', 'direction-controller-checks-20261005.json',
                 'direction-park-rules-20261005.json', 'direction-park-controller-20261005.json']
rule_reports = {}
for name in new_reports + prior_reports:
 result = json.loads((project / 'notes' / name).read_text(encoding='utf-8'))
 check('recorded production rules and callbacks passed', result.get('passed') is True
       and not result.get('failures') and isinstance(result.get('checks'), list)
       and all(not isinstance(item, dict) or item.get('passed') is True for item in result['checks']), report=name)
 rule_reports[name] = {'passed': result['passed'], 'check_count': len(result['checks']), 'method': result.get('method')}
prior_checks = sum(rule_reports[name]['check_count'] for name in prior_reports)
new_rule_count, new_callback_count = [rule_reports[name]['check_count'] for name in new_reports]
quality_file = project / 'notes/direction-space-quality-20261005.json'
quality = json.loads(quality_file.read_text(encoding='utf-8'))
check('quality and scope review retained as its own report', bool(quality.get('scope')) and bool(quality.get('status')))

browser_file = project / 'notes/direction-space-browser-20261005.json'
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
  check('reported real browser screenshot retained', file is not None and file.is_file(), file=capture_path)
  with Image.open(file) as bitmap:
   actual_size = list(bitmap.size)
   check('reported browser screenshot is a usable image', min(bitmap.size) > 0, file=capture_path, size=actual_size)
   expected_size = capture.get('capture_size', capture.get('size')) if isinstance(capture, dict) else None
   if isinstance(expected_size, dict) and {'width', 'height'} <= expected_size.keys():
    expected_size = [expected_size['width'], expected_size['height']]
   if isinstance(expected_size, (list, tuple)) and len(expected_size) == 2:
    check('browser capture dimensions match its recorded size', actual_size == list(expected_size), file=capture_path)
   capture_sizes.append({'file': capture_path, 'actual_size': actual_size,
                         'viewport': capture.get('viewport') if isinstance(capture, dict) else None,
                         'capture_scope': capture.get('capture_scope', capture.get('scope')) if isinstance(capture, dict) else None})
report = {'date': '2026-10-05', 'passed': True, 'checks': checks, 'source_resources': len(files),
          'resource_inventory': files, 'space_asset_inventory': [file.relative_to(web).as_posix() for file in asset_files],
          'remote_runtime_dependencies': sorted(remote_dependencies),
          'protected_prior_files': len(baseline['files']), 'prior_direction_checks': prior_checks,
          'new_rule_checks': new_rule_count, 'new_callback_checks': new_callback_count,
          'total_recorded_direction_checks': prior_checks + new_rule_count + new_callback_count,
          'rule_and_callback_reports': rule_reports, 'quality_status': quality['status'],
          'browser_acceptance': browser_status, 'browser_evidence': browser,
          'browser_screenshot_count': len(capture_sizes), 'browser_screenshot_dimensions': capture_sizes,
          'browser_report': 'notes/direction-space-browser-20261005.json' if browser else None,
          'quality_report': 'notes/direction-space-quality-20261005.json',
          'scope': 'Eighth original local game direction: real Three.js/WebGL chase-camera perspective, '
                   'with flight and mission rules on the x/z plane for transport, trading and exploration. '
                   'Models, spherical planets, lighting and a perspective camera provide the three-dimensional scene; '
                   'the nebula is its environment background. Decorative asteroids do not participate in collisions; '
                   'six-degree-of-freedom motion and combat are outside this sample. '
                   'This package check verifies the actual resource inventory, source/build/HTTP delivery, provenance, '
                   'recorded rule reports, navigation and preservation. Browser acceptance is copied from the actual browser '
                   'report within its recorded capture and interaction scope; a missing report remains pending. '
                   'No Skia rendering is used as three-dimensional production evidence, and no upstream game port '
                   'or human emotional/commercial product acceptance is implied.'}
(project / 'notes/direction-space-package-20261005.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'package_checks': len(checks), 'source_resources': len(files),
                  'protected_prior_files': len(baseline['files']), 'new_rule_checks': new_rule_count,
                  'new_callback_checks': new_callback_count, 'prior_direction_checks': prior_checks,
                  'browser_acceptance': browser_status, 'browser_screenshot_count': len(capture_sizes)}, ensure_ascii=False))
