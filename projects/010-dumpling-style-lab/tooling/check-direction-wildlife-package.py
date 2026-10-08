"""Final REEDLIGHT acceptance: actual preserved files, art, evidence and HTTP bytes.

Run only after the source, build, current rules/controller reports and real browser
acceptance are ready. This command has no browser-pending success mode.
"""
from pathlib import Path
from urllib.parse import urlsplit, unquote, quote
from urllib.request import urlopen
from html.parser import HTMLParser
from PIL import Image
import argparse
import base64
import hashlib
import json
import re

p = Path(__file__).resolve().parents[1]
web = p / 'web'
checks = []
details = []

def check(name, valid, **evidence):
    if not valid:
        raise AssertionError((name, evidence))
    checks.append(name)
    if evidence:
        details.append({'name': name, **evidence})

def sha(data):
    return hashlib.sha256(data).hexdigest()

def passed(report):
    return report.get('passed') is True or report.get('overallpassed') is True

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = []
        self.links = []
        self.assets = []
        self.anchors = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
            self.anchors.append(attrs)
        if tag in ['script', 'img'] and attrs.get('src'):
            self.assets.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.assets.append(attrs['href'])

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8962)
parser.add_argument('--build-root', type=Path, default=p.parents[1] / '_site/projects/010-dumpling-style-lab')
args = parser.parse_args()
baseline = json.loads((p / 'notes/wildlife-preservation-before-20261005.json').read_text('utf-8'))
check('Actual protected baseline count agrees with captured files', baseline['protected_count'] == len(baseline['protected']) and baseline['protected_count'] > 0, count=baseline['protected_count'])
check('Exactly thirteen legacy navigation pages were authorized', len(baseline['mutable_navigation']) == len(set(baseline['mutable_navigation'])) == 13)
for file, digest in baseline['protected'].items():
    target = web / file
    check('Previous protected web file preserved: ' + file, target.is_file() and sha(target.read_bytes()) == digest)
readme = (p / 'README.md').read_bytes()
previous_readme = base64.b64decode(baseline['readme_suffix_base64'], validate=True)
check('Captured complete old README bytes and digest agree', len(previous_readme) == baseline['readme_suffix_bytes'] and sha(previous_readme) == baseline['readme_suffix_sha256'])
check('Entire old README remains an exact byte suffix', readme.endswith(previous_readme))

url = 'direction-wildlife.html?demo=1#play'
new_html = (web / 'direction-wildlife.html').read_text('utf-8')
pages = {}
for name in ['direction-wildlife.html', *baseline['mutable_navigation']]:
    text = (web / name).read_text('utf-8')
    page = Page(text)
    pages[name] = page
    check('Page IDs remain unique: ' + name, len(page.ids) == len(set(page.ids)))
    for reference in page.links + page.assets:
        parts = urlsplit(reference)
        if parts.scheme:
            check('Page external reference uses HTTPS: ' + name + ' / ' + reference, parts.scheme == 'https')
            continue
        target = (web / unquote(parts.path or name)).resolve()
        if target.is_dir():
            target = target / 'index.html'
        check('Local page dependency remains in project: ' + name + ' / ' + reference, target.is_relative_to(web.resolve()))
        check('Local page dependency exists: ' + name + ' / ' + reference, target.is_file())
        if parts.fragment and target.suffix == '.html':
            check('Local page anchor exists: ' + name + ' / ' + reference, unquote(parts.fragment) in Page(target.read_text('utf-8')).ids)
    if name != 'direction-wildlife.html':
        nav = re.search(r'<nav\b[^>]*>(.*?)</nav>', text, re.S)
        check('Legacy navigation links to actual wildlife play: ' + name, nav is not None and url in nav.group(1))

directions = (web / 'directions.html').read_text('utf-8')
references = (web / 'references.html').read_text('utf-8')
forms = (web / 'forms.html').read_text('utf-8')
check('Direction map reports twelve originals and completed first ten', '12 个原创方向试玩 · 首批 10 条参考已完成' in directions)
check('Reference summary reports twelve originals and completed first ten', '12 个原创方向试玩' in references and '首批 10 条参考已完成' in references)
check('Forms summary reports twelve originals with the old 107 / 116 catalog', '方向试玩现在共十二种' in forms and '107 种／116 个入口' in forms and '107 种已接入形态' in forms)
check('Independent eleventh and twelfth expansion cards remain visible', '11 / 牌组构筑' in directions and '12 / 自然摄影 × 野外观察' in directions and '10 / 环境潜行' in directions)
check('New wildlife direction is the current reference primary launch', any(a.get('href') == url and 'primary' in a.get('class', '').split() for a in pages['references.html'].anchors))
check('New wildlife direction is the current forms primary launch', f'class="reference-launch" href="{url}"' in forms)
check('New wildlife direction leads the map introduction launch', directions.index('新体验：芦湾观鸟') < directions.index('雾海牌航 · 构筑牌组与航路抉择'))
check('Commercial wildlife reference is a separate section', 'id="wildlife-reference"' in references and 'id="deckbuilding-reference"' in references)
wildlife_reference = re.search(r'<section\b[^>]*id="wildlife-reference"[^>]*>(.*?)</section>', references, re.S)
check('Alba official reference explicitly preserves the old open-source batch', wildlife_reference is not None and all(text in wildlife_reference.group(1) for text in ['https://www.albawildlife.com/', '商业', '原先十条开源参考', '不移植原作代码、素材', '有限 120 秒二维', '移动镜头、调整焦距、等待三种动物活动', '不宣称迁移完整原作或无限世界']))
check('New sample includes official commercial reference and original scope', 'https://www.albawildlife.com/' in new_html and '商业原作只作类型参考' in new_html and '不使用原作代码或素材' in new_html)
check('Old forms catalog and controller remain byte identical', all(sha((web / name).read_bytes()) == baseline['protected'][name] for name in ['game-forms-catalog.js', 'forms.js']))

generation = json.loads((p / 'assets/directions/wildlife-generation-20261005.json').read_text('utf-8'))
check('Built-in original bitmap generation provenance saved', generation['mode'] == 'built-in image_gen' and len(generation['assets']) == 2)
check('Exactly the wetland landscape and animal atlas were generated', {a['key'] for a in generation['assets']} == {'landscape', 'animals-atlas'})
for asset in generation['assets']:
    file = p / asset['file']
    check('Full original art prompt retained: ' + asset['key'], isinstance(asset['prompt'], str) and len(asset['prompt']) > 300)
    check('Generated original bitmap copied byte-identically: ' + asset['key'], file.is_file() and Path(asset['source']).is_file() and file.read_bytes() == Path(asset['source']).read_bytes())
    with Image.open(file) as image:
        check('Original bitmap is a sufficient-size PNG: ' + asset['key'], image.format == 'PNG' and min(image.size) >= 900, size=list(image.size), mode=image.mode)
        if asset['key'] == 'animals-atlas':
            check('Animal atlas requested and contains genuine transparent alpha', asset['transparent_background'] is True and image.mode == 'RGBA' and image.getextrema()[3][0] == 0 and image.getextrema()[3][1] == 255)
        else:
            check('Wetland landscape is opaque original scenery', asset['transparent_background'] is False and image.mode in ['RGB', 'RGBA'])

resources = ['direction-wildlife.html', 'direction-wildlife.css', 'direction-wildlife.js', 'direction-wildlife-engine.js', 'direction-wildlife-render.js', 'directions.css', *baseline['mutable_navigation'], *[a['file'].removeprefix('web/') for a in generation['assets']]]
check('Exactly twenty-one actual source-build-live resources are covered', len(resources) == len(set(resources)) == 21)
for relative in resources:
    source = (web / relative).read_bytes()
    built = args.build_root / relative
    check('Built resource is byte-identical: ' + relative, built.is_file() and built.read_bytes() == source)
    with urlopen(f'http://127.0.0.1:{args.port}/' + quote(relative, safe='/'), timeout=12) as response:
        check('Live HTTP resource is byte-identical: ' + relative, response.status == 200 and response.read() == source)

actual_reports = {}
for name, minimum in [('rules', 35), ('controller', 33)]:
    report = json.loads((p / f'notes/direction-wildlife-{name}-20261005.json').read_text('utf-8'))
    actual_reports[name] = report
    check('Actual current wildlife ' + name + ' checks are successful string names', passed(report) and isinstance(report.get('checks'), list) and report.get('count') == len(report['checks']) and len(report['checks']) >= minimum and all(isinstance(item, str) and len(item) > 15 for item in report['checks']) and not report.get('failures'), count=report.get('count'))
    check('Actual current wildlife ' + name + ' evidence describes production execution', isinstance(report.get('method'), str) and len(report['method']) > 100)
engine = (web / 'direction-wildlife-engine.js').read_text('utf-8')
check('Production engine contains the finite observation time and real framing/photo actions', '120' in engine and re.search(r'fram', engine, re.I) is not None and re.search(r'phot|shutter|shoot', engine, re.I) is not None)
check('Production page identifies all three original observed species', all(f'data-wildlife-species="{species}"' in new_html for species in ['heron', 'kingfisher', 'deer']))
regressions = json.loads((p / 'notes/direction-wildlife-regressions-20261005.json').read_text('utf-8'))
check('All eleven old directions actually reran twenty-two scripts', passed(regressions) and regressions['directions'] == 11 and regressions['script_count'] == len(regressions['runs']) == 22 and regressions['total_checks'] == 519)
check('Old regression reruns retain actual successful process output', all(run['passed'] and run['exit_code'] == 0 and run['stdout'] and run['count'] > 0 for run in regressions['runs']) and sum(run['count'] for run in regressions['runs']) == regressions['total_checks'])
check('Old regression report uses successful test-name strings', regressions['count'] == len(regressions['checks']) == 22 and all(isinstance(item, str) for item in regressions['checks']))

browser = json.loads((p / 'notes/direction-wildlife-browser-20261005.json').read_text('utf-8'))
browser_checks = browser.get('checks', [])
check('Actual browser acceptance contains at least ten successful interactions', passed(browser) and len(browser_checks) >= 10 and all(isinstance(item, str) or isinstance(item, dict) and item.get('passed') is True for item in browser_checks))
check('Browser acceptance identifies real visible-page interactions', isinstance(browser.get('method'), str) and len(browser['method']) > 80)
captures = browser.get('screenshots', browser.get('captures', []))
check('Actual browser acceptance includes at least three distinct captures', len(captures) >= 3 and len({capture['file'] for capture in captures}) >= 3)
for capture in captures:
    file = Path(capture['file'])
    if not file.is_absolute():
        file = p / file
    with Image.open(file) as image:
        recorded = capture.get('capture_size', capture.get('size'))
        check('Actual browser screenshot format, size and bytes match: ' + str(file), image.format in ['PNG', 'JPEG'] and image.format == capture.get('format') and image.size[0] >= 320 and image.size[1] >= 400 and list(image.size) == recorded and sha(file.read_bytes()) == capture.get('sha256'), size=list(image.size), format=image.format)

report = {'date': '2026-10-05', 'passed': True, 'overallpassed': True, 'count': len(checks), 'checks': checks, 'details': details, 'source_build_live_resources': len(resources), 'protected_files': baseline['protected_count'], 'readme_suffix_bytes': baseline['readme_suffix_bytes'], 'old_direction_scripts': regressions['script_count'], 'old_direction_checks': regressions['total_checks'], 'wildlife_rule_checks': actual_reports['rules']['count'], 'wildlife_controller_checks': actual_reports['controller']['count'], 'browser_checks': len(browser_checks), 'browser_captures': len(captures), 'browser_evidence': 'Actual recorded visible-page interactions and native PNG/JPEG captures, with format, dimensions and SHA256 checked; no browser-pending acceptance.', 'scope': 'Twelfth original finite 120-second local 2D wildlife observation and actual framing/photography sample. Three original animal species. First ten references and eleventh deck direction remain; Alba is a separate commercial reference, without upstream code/assets migration or infinite-world claims. All protected old web files and the entire previous README suffix were actually read and compared.'}
(p / 'notes/direction-wildlife-package-20261005.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in report.items() if key not in ['checks', 'details']}, ensure_ascii=False))
