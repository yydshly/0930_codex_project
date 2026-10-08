"""Verify the tenth original vehicle sample and actual delivery/evidence scope."""
import argparse
import hashlib
import json
import re
import struct
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit
from urllib.request import urlopen
from zipfile import ZipFile
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
  if tag == 'section' and 'vehicle-compare' in a.get('class', '').split():
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


def read_report(name):
 file = project / 'notes' / name
 check('required evidence report exists', file.is_file(), report=name)
 return json.loads(file.read_text(encoding='utf-8'))


def glb_document(file):
 data = file.read_bytes()
 check('model is a complete GLB v2 binary', len(data) >= 20 and data[:4] == b'glTF'
       and struct.unpack_from('<I', data, 4)[0] == 2
       and struct.unpack_from('<I', data, 8)[0] == len(data), file=file.relative_to(web).as_posix())
 length, kind = struct.unpack_from('<II', data, 12)
 check('model retains a valid glTF JSON chunk', kind == 0x4e4f534a and 20 + length <= len(data),
       file=file.relative_to(web).as_posix())
 document = json.loads(data[20:20 + length])
 check('model contains actual triangle meshes and accessor data', bool(document.get('meshes'))
       and bool(document.get('accessors'))
       and all(primitive.get('mode', 4) == 4 and primitive.get('attributes', {}).get('POSITION') is not None
               for mesh in document['meshes'] for primitive in mesh.get('primitives', [])),
       file=file.relative_to(web).as_posix())
 return document


def main(base_url):
 nav = ['directions.html', 'direction-park.html', 'direction-coop.html', 'direction-shift.html',
        'direction-freight.html', 'direction-dungeon.html', 'direction-stealth.html',
        'direction-space.html', 'direction-survival.html', 'references.html', 'forms.html']
 originals = nav[:9]
 entry = 'direction-vehicle.html?demo=1#play'
 for name in ['direction-vehicle.html'] + nav:
  page = Page(web / name)
  check('page anchors unique', len(page.ids) == len(set(page.ids)), page=name)
  for anchor in page.links:
   parts = urlsplit(anchor.get('href', ''))
   if parts.scheme:
    check('external reference securely opens its own page', parts.scheme == 'https'
          and anchor.get('target') == '_blank'
          and {'noopener', 'noreferrer'} <= set(anchor.get('rel', '').split()),
          page=name, href=anchor.get('href'))
   else:
    destination = web / (unquote(parts.path).lstrip('/') or name)
    if destination.is_dir():
     destination /= 'index.html'
    check('local destination exists', destination.is_file(), page=name, href=anchor.get('href'))
    if parts.fragment:
     check('local fragment exists', unquote(parts.fragment) in Page(destination).ids,
           page=name, href=anchor.get('href'))
  for reference in page.assets:
   local_target(reference, web / name)

 baseline = read_report('vehicle-preservation-before-20261005.json')
 check('exactly eleven authorized prior navigation pages are mutable',
       set(baseline['mutable_navigation']) == set(nav) and len(baseline['mutable_navigation']) == 11)
 changed, missing = [], []
 for name, expected in baseline['files'].items():
  file = web / name
  if not file.is_file():
   missing.append(name)
  elif hashlib.sha256(file.read_bytes()).hexdigest() != expected.lower():
   changed.append(name)
 check('all 2618 prior art game version and nine direction resources remain unchanged',
       len(baseline['files']) == 2618 and not changed and not missing,
       protected=len(baseline['files']), changed=changed, missing=missing)
 history_bytes = baseline['readme_historical_suffix_bytes']
 check('historical 80349 byte README suffix remains byte exact', history_bytes == 80349
       and hashlib.sha256((project / 'README.md').read_bytes()[-history_bytes:]).hexdigest()
       == baseline['readme_historical_suffix_sha256'], suffix_bytes=history_bytes)

 asset_dir = web / 'assets/directions/vehicle'
 asset_files = sorted(file for file in asset_dir.rglob('*') if file.is_file())
 required_models = {'truck-flat.glb', 'wheel-truck.glb', 'box.glb', 'cone.glb',
                    'debris-drivetrain-axle.glb', 'nature/tree_pineTallA_detailed.glb',
                    'nature/rock_largeA.glb'}
 expected_assets = required_models | {'Textures/colormap.png', 'landscape.png', 'terrain-atlas.png',
                                    'License-car-kit.txt', 'nature/License-nature-kit.txt',
                                    'SOURCE-NOTICE.json'}
 actual_assets = {file.relative_to(asset_dir).as_posix() for file in asset_files}
 check('all seven authored GLBs texture original bitmaps and license records are present once',
       actual_assets == expected_assets, actual=sorted(actual_assets))
 image_sizes = {}
 for name in ['landscape.png', 'terrain-atlas.png', 'Textures/colormap.png']:
  with Image.open(asset_dir / name) as image:
   check('vehicle image is an actual usable PNG', image.format == 'PNG'
         and image.mode in {'RGB', 'RGBA'} and min(image.size) >= 512, file=name,
         mode=image.mode, size=list(image.size))
   image_sizes[name] = {'mode': image.mode, 'size': list(image.size)}
 check('landscape and terrain atlas retain their intended generated dimensions',
       image_sizes['landscape.png']['size'] == [1672, 941]
       and image_sizes['terrain-atlas.png']['size'] == [1254, 1254]
       and image_sizes['Textures/colormap.png']['size'] == [512, 512])
 glb_inventory = []
 for name in sorted(required_models):
  model = asset_dir / name
  doc = glb_document(model)
  images = []
  for image in doc.get('images', []):
   if image.get('uri'):
    target = local_target(image['uri'], model)
    check('GLB external colormap dependency resolves beside authored models',
          target == (asset_dir / 'Textures/colormap.png').resolve(), model=name, uri=image['uri'])
    images.append(image['uri'])
   else:
    check('embedded GLB image references a real buffer view',
          isinstance(image.get('bufferView'), int)
          and 0 <= image['bufferView'] < len(doc.get('bufferViews', [])), model=name)
  glb_inventory.append({'file': name, 'bytes': model.stat().st_size,
                        'mesh_count': len(doc['meshes']), 'external_images': images})
  for buffer in doc.get('buffers', []):
   if buffer.get('uri') and not buffer['uri'].startswith('data:'):
    local_target(buffer['uri'], model)

 notice = json.loads((asset_dir / 'SOURCE-NOTICE.json').read_text(encoding='utf-8'))
 check('licensed car and nature models retain primary creator URLs and CC0 notices',
       notice.get('source') == 'https://kenney.nl/assets/car-kit' and notice.get('license') == 'CC0'
       and notice.get('nature', {}).get('source') == 'https://kenney.nl/assets/nature-kit'
       and notice['nature'].get('license') == 'CC0'
       and set(notice['files']) == {name for name in required_models if '/' not in name}
       and set(notice['nature']['files']) == {name.split('/')[-1] for name in required_models if '/' in name})
 for name in ['License-car-kit.txt', 'nature/License-nature-kit.txt']:
  license_text = (asset_dir / name).read_text(encoding='utf-8')
  check('bundled author license explicitly grants CC0', 'Creative Commons Zero, CC0' in license_text
        and 'Kenney' in license_text, file=name)
 archive_file = project / 'assets/directions/vehicle-sources/kenney_car-kit.zip'
 check('original car source archive retained', archive_file.is_file())
 with ZipFile(archive_file) as archive:
  for name in notice['files']:
   check('licensed authored car GLB is unchanged from original source archive',
         archive.read('Models/GLB format/' + name) == (asset_dir / name).read_bytes(), file=name)
  check('authored external colormap is unchanged from source archive',
        archive.read('Models/GLB format/Textures/colormap.png')
        == (asset_dir / 'Textures/colormap.png').read_bytes())
 for name in notice['nature']['files']:
  check('licensed nature GLB copy matches protected prior authored model',
        (asset_dir / 'nature' / name).read_bytes()
        == (web / 'assets/showcase/nature' / name).read_bytes(), file=name)

 generation = json.loads((project / 'assets/directions/vehicle-generation-20261005.json').read_text(encoding='utf-8'))
 active = [item for item in generation['assets'] if item.get('final', True)]
 check('two original vehicle bitmaps retain complete ImageGen prompts and real source paths',
       generation.get('mode') == 'built-in image_gen; generate new original bitmap assets'
       and len(active) == 2
       and {item['output'].replace('\\', '/') for item in active}
       == {'web/assets/directions/vehicle/landscape.png', 'web/assets/directions/vehicle/terrain-atlas.png'}
       and all(item.get('key') and len(item.get('prompt', '')) >= 100
               and Path(item.get('source_path', '')).is_file()
               and (project / item['output']).is_file() for item in active))

 vehicle_page = Page(web / 'direction-vehicle.html')
 runtime_names = ['direction-vehicle.html', 'direction-vehicle.css', 'direction-vehicle.js',
                  'direction-vehicle-engine.js', 'direction-vehicle-render.js']
 resources = {web / name for name in runtime_names + nav} | set(asset_files)
 for reference in vehicle_page.assets:
  target = local_target(reference, web / 'direction-vehicle.html')
  if target:
   resources.add(target)
 modules, visited = [web / name for name in runtime_names if name.endswith('.js')], set()
 while modules:
  module = modules.pop().resolve()
  if module in visited:
   continue
  visited.add(module)
  for reference in javascript_imports(module.read_text(encoding='utf-8')):
   mapped, origin = reference, module
   if not reference.startswith(('./', '../', '/', 'https://')):
    matches = [key for key in vehicle_page.imports if key == reference
               or key.endswith('/') and reference.startswith(key)]
    check('bare import resolves through declared import map', bool(matches),
          module=module.relative_to(web).as_posix(), reference=reference)
    key = max(matches, key=len)
    mapped = vehicle_page.imports[key] + reference[len(key):]
    origin = web / 'direction-vehicle.html'
   target = local_target(mapped, origin)
   if target:
    resources.add(target)
    if target.suffix in {'.js', '.mjs'}:
     modules.append(target)
 for reference in re.findall(r'url\([\'\"]?([^\)\'\"]+)', (web / 'direction-vehicle.css').read_text(encoding='utf-8')):
  if not reference.startswith('data:'):
   target = local_target(reference, web / 'direction-vehicle.css')
   if target:
    resources.add(target)
 files = sorted(file.resolve().relative_to(web.resolve()).as_posix() for file in resources)
 for name in files:
  source_bytes = (web / name).read_bytes()
  check('public build matches actual source bytes', (public / name).is_file()
        and (public / name).read_bytes() == source_bytes, file=name)
  with urlopen(base_url.rstrip('/') + '/' + quote(name), timeout=15) as response:
   check('live HTTP delivery matches actual source bytes', response.status == 200
         and response.read() == source_bytes, file=name)
 check('runtime dependencies are entirely retained locally', not remote_dependencies,
       remote=sorted(remote_dependencies))

 for name in nav:
  count = sum(anchor.get('href') == entry for anchor in Page(web / name).nav_links)
  check('tenth original entrance appears once in each authorized prior header', count == 1,
        page=name, count=count)
 for name in originals:
  count = sum(urlsplit(anchor.get('href', '')).path == name
              and urlsplit(anchor.get('href', '')).fragment == 'play'
              for anchor in vehicle_page.comparison_links)
  check('each of nine earlier original entrances appears once in vehicle comparison', count == 1,
        page=name, count=count)
 direction = (web / 'directions.html').read_text(encoding='utf-8')
 check('ten local originals remain separately counted from ten references',
       bool(re.search(r'本(?:轮|批)\s*10\s*个原创可玩样例', direction))
       and direction.count('class="direction-card') == 10
       and direction.count('class="direction-card featured"') == 10)
 check('vehicle reference card retains official Rigs of Rods and original playable entrance',
       bool(re.search(r'<article class="direction-card featured"><span class="index">09 / 车辆物理与工程(?:协作)?</span>', direction))
       and entry in direction and 'https://www.rigsofrods.org/' in direction)
 reference_page = Page(web / 'references.html')
 check('all ten original entrances remain accessible from reference collection',
       set(originals + ['direction-vehicle.html'])
       <= {urlsplit(anchor.get('href', '')).path for anchor in reference_page.links})
 check('previous curated reference anchors and original collection counts are retained',
       {'hypersomnia', 'isocity', 'supertuxkart', 'source', 'priorities', 'candidates', 'standards'}
       <= set(reference_page.ids)
       and '107 种已接入形态' in (web / 'forms.html').read_text(encoding='utf-8')
       and '116 个入口' in (web / 'references.html').read_text(encoding='utf-8'))
 check('vehicle page links directly to primary engineering inspiration with honest scope',
       any(anchor.get('href') == 'https://www.rigsofrods.org/' for anchor in vehicle_page.links)
       and all(text in (web / 'direction-vehicle.html').read_text(encoding='utf-8')
               for text in ['原创', '四轮', '载重', '不实现软体车辆、联机或上游项目移植']))
 for name, ordinal in [('directions.html', 'DIRECTION STUDY 01 /'),
                       ('direction-park.html', '第 2 个原创方向样例'),
                       ('direction-coop.html', '第 3 个原创方向样例'),
                       ('direction-shift.html', '第四个原创样例'),
                       ('direction-freight.html', '第五个原创样例'),
                       ('direction-dungeon.html', '第六个原创样例'),
                       ('direction-stealth.html', '第七个原创样例'),
                       ('direction-space.html', '原创方向 / 08'),
                       ('direction-survival.html', '原创方向 / 09')]:
  check('earlier original sample ordinal retained', ordinal in (web / name).read_text(encoding='utf-8'),
        page=name, ordinal=ordinal)
 controller = (web / 'direction-vehicle.js').read_text(encoding='utf-8')
 check('vehicle saves use independent key and never clear prior progress',
       'world-play-direction-vehicle-v1' in controller and 'localStorage.clear' not in controller
       and 'removeItem' not in controller)
 renderer = (web / 'direction-vehicle-render.js').read_text(encoding='utf-8')
 check('production renderer uses local WebGL perspective scene and actual suspension telemetry',
       all(token in renderer for token in ['THREE.WebGLRenderer', 'THREE.PerspectiveCamera',
                                          'GLTFLoader', 'terrainHeight', 'car.wheels', 'telemetry.centerY'])
       and all(name in renderer for name in required_models))

 prior_reports = ['direction-factory-rules-20261005.json', 'direction-controller-checks-20261005.json',
                  'direction-park-rules-20261005.json', 'direction-park-controller-20261005.json',
                  'direction-coop-rules-20261005.json', 'direction-coop-controller-20261005.json',
                  'direction-shift-rules-20261005.json', 'direction-shift-controller-20261005.json',
                  'direction-freight-rules-20261005.json', 'direction-freight-controller-20261005.json',
                  'direction-dungeon-rules-20261005.json', 'direction-dungeon-controller-20261005.json',
                  'direction-stealth-rules-20261005.json', 'direction-stealth-controller-20261005.json',
                  'direction-space-rules-20261005.json', 'direction-space-controller-20261005.json',
                  'direction-survival-rules-20261005.json', 'direction-survival-controller-20261005.json']
 new_reports = ['direction-vehicle-rules-20261005.json', 'direction-vehicle-controller-20261005.json']
 rule_reports = {}
 for name in prior_reports + new_reports:
  result = read_report(name)
  check('recorded production rules and controller callbacks all passed', result.get('passed') is True
        and not result.get('failures') and isinstance(result.get('checks'), list)
        and all(not isinstance(item, dict) or item.get('passed') is True for item in result['checks']),
        report=name)
  rule_reports[name] = {'passed': result['passed'], 'check_count': len(result['checks']),
                        'method': result.get('method')}
 prior_count = sum(rule_reports[name]['check_count'] for name in prior_reports)
 check('nine previous directions retain all 356 recorded rule and callback assertions', prior_count == 356,
       count=prior_count)
 regression = read_report('direction-vehicle-regressions-20261005.json')
 check('actual rerun of all eighteen prior rule and controller scripts passed 356 checks',
       regression.get('passed') is True and regression.get('script_count') == 18
       and regression.get('directions') == 9 and regression.get('total_checks') == 356
       and len(regression.get('runs', [])) == 18
       and all(run.get('passed') is True and run.get('exit_code') == 0 and run.get('count', 0) > 0
               and run.get('stdout') for run in regression['runs'])
       and sum(run['count'] for run in regression['runs']) == 356)
 new_rules, new_callbacks = [rule_reports[name]['check_count'] for name in new_reports]
 check('vehicle engine retains at least 49 meaningful rule assertions', new_rules >= 49, count=new_rules)
 check('new production UI retains at least 35 actual controller callback assertions',
       new_callbacks >= 35, count=new_callbacks)
 quality = read_report('direction-vehicle-quality-20261005.json')
 check('scoped quality review retains explicit honest boundaries', bool(quality.get('scope'))
       and bool(quality.get('status')) and quality.get('passed') is True)
 browser_path = project / 'notes/direction-vehicle-browser-20261005.json'
 browser = json.loads(browser_path.read_text(encoding='utf-8')) if browser_path.is_file() else None
 browser_status = browser.get('status', 'passed' if browser.get('passed') is True else
                              'failed' if browser.get('passed') is False else 'pending') if browser else 'pending'
 captures = []
 if browser:
  for capture in browser.get('screenshots', []):
   reference = capture.get('file') if isinstance(capture, dict) else capture
   file = Path(reference) if isinstance(reference, str) else None
   if file is not None and not file.is_absolute():
    file = project / file
   check('actual reported browser screenshot retained', file is not None and file.is_file(), file=reference)
   with Image.open(file) as image:
    actual = list(image.size)
    check('browser evidence is a usable captured bitmap', min(image.size) > 0, file=reference, size=actual)
    expected = capture.get('capture_size', capture.get('size')) if isinstance(capture, dict) else None
    if isinstance(expected, dict) and {'width', 'height'} <= expected.keys():
     expected = [expected['width'], expected['height']]
    if isinstance(expected, (list, tuple)) and len(expected) == 2:
     check('actual capture dimensions agree with recorded pixel size', actual == list(expected), file=reference)
    captures.append({'file': reference, 'actual_size': actual,
                     'viewport': capture.get('viewport') if isinstance(capture, dict) else None,
                     'capture_scope': capture.get('capture_scope', capture.get('scope')) if isinstance(capture, dict) else None})

 report = {'date': '2026-10-05', 'passed': True, 'checks': checks,
           'source_resources': len(files), 'resource_inventory': files,
           'vehicle_asset_inventory': sorted(actual_assets), 'glb_inventory': glb_inventory,
           'image_dimensions': image_sizes, 'remote_runtime_dependencies': sorted(remote_dependencies),
           'protected_prior_files': len(baseline['files']), 'readme_historical_suffix_bytes': history_bytes,
           'prior_direction_checks': prior_count, 'actual_prior_regression_checks': regression['total_checks'],
           'new_rule_checks': new_rules, 'new_callback_checks': new_callbacks,
           'total_recorded_direction_checks': prior_count + new_rules + new_callbacks,
           'rule_and_callback_reports': rule_reports, 'quality_status': quality['status'],
           'browser_acceptance': browser_status, 'browser_evidence': browser,
           'browser_screenshot_count': len(captures), 'browser_screenshot_dimensions': captures,
           'browser_report': 'notes/direction-vehicle-browser-20261005.json' if browser else None,
           'quality_report': 'notes/direction-vehicle-quality-20261005.json',
           'primary_reference': 'https://www.rigsofrods.org/',
           'scope': 'Tenth original local direction: a real Three.js/WebGL finite off-road test ground, '
                    'continuous x/z vehicle motion, four independently sampled spring/damper contacts and '
                    'sprung chassis heave/pitch/roll, 320 kg cargo and comfort/firm tuning, real stopped '
                    'garage/depot/site handoffs and an actual bridge return. This package check audits '
                    'resource structure, seven authored CC0 GLBs and external texture dependencies, original '
                    'ImageGen PNG provenance, source/build/live HTTP bytes, 2618 protected old files, '
                    'navigation, README preservation and actual recorded rules/callback evidence. Browser '
                    'acceptance is copied from its actual evidence report within the recorded interaction '
                    'and capture scope; missing browser evidence remains pending. No softbody deformation, '
                    'damage, multiplayer, upstream code port, or human emotional/commercial acceptance is claimed.'}
 (project / 'notes/direction-vehicle-package-20261005.json').write_text(
  json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
 print(json.dumps({'passed': True, 'package_checks': len(checks), 'source_resources': len(files),
                   'protected_prior_files': len(baseline['files']), 'prior_direction_checks': prior_count,
                   'new_rule_checks': new_rules, 'new_callback_checks': new_callbacks,
                   'browser_acceptance': browser_status, 'browser_screenshot_count': len(captures)},
                  ensure_ascii=False))


if __name__ == '__main__':
 parser = argparse.ArgumentParser()
 parser.add_argument('--base-url', default='http://127.0.0.1:8962')
 main(parser.parse_args().base_url)


