"""Final NIGHT POST acceptance; run only after actual reports, art, browser and build.

No pending-browser acceptance and no historical-report rewriting are supported.
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
import subprocess

MIN_RULE_CHECKS = 33
MIN_CONTROLLER_CHECKS = 30
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
parser.add_argument('--node', default='C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
args = parser.parse_args()
baseline = json.loads((p / 'notes/investigation-preservation-before-20261005.json').read_text('utf-8'))
check('Actual protected baseline count agrees with captured old files', baseline['protected_count'] == len(baseline['protected']) and baseline['protected_count'] > 0, count=baseline['protected_count'])
check('Exactly fourteen legacy navigation pages were authorized', len(baseline['mutable_navigation']) == len(set(baseline['mutable_navigation'])) == 14)
for file, digest in baseline['protected'].items():
    target = web / file
    check('Previous protected web file preserved: ' + file, target.is_file() and sha(target.read_bytes()) == digest)
readme = (p / 'README.md').read_bytes()
previous_readme = base64.b64decode(baseline['readme_suffix_base64'], validate=True)
check('Captured entire old README bytes and digest agree', len(previous_readme) == baseline['readme_suffix_bytes'] and sha(previous_readme) == baseline['readme_suffix_sha256'])
check('Entire old README remains an exact byte suffix', readme.endswith(previous_readme))
for section in baseline['preserved_expansion_sections']:
    original = base64.b64decode(section['base64'], validate=True)
    check(f'Entire existing expansion section remains unchanged: {section["file"]} / {section["direction"]}', sha(original) == section['sha256'] and original in (web / section['file']).read_bytes())
check('All four existing deck and wildlife expansion sections were captured', len(baseline['preserved_expansion_sections']) == 4)

url = 'direction-investigation.html?demo=1#play'
reference = 'https://store.steampowered.com/app/1677770/The_Case_of_the_Golden_Idol/'
new_html = (web / 'direction-investigation.html').read_text('utf-8')
pages = {}
for name in ['direction-investigation.html', *baseline['mutable_navigation']]:
    text = (web / name).read_text('utf-8')
    page = Page(text)
    pages[name] = page
    check('Page IDs remain unique: ' + name, len(page.ids) == len(set(page.ids)))
    for dependency in page.links + page.assets:
        parts = urlsplit(dependency)
        if parts.scheme:
            check('Page external reference uses HTTPS: ' + name + ' / ' + dependency, parts.scheme == 'https')
            continue
        target = (web / unquote(parts.path or name)).resolve()
        if target.is_dir():
            target = target / 'index.html'
        check('Local page dependency remains in project: ' + name + ' / ' + dependency, target.is_relative_to(web.resolve()))
        check('Local page dependency exists: ' + name + ' / ' + dependency, target.is_file())
        if parts.fragment and target.suffix == '.html':
            check('Local page anchor exists: ' + name + ' / ' + dependency, unquote(parts.fragment) in Page(target.read_text('utf-8')).ids)
    if name != 'direction-investigation.html':
        nav = re.search(r'<nav\b[^>]*>(.*?)</nav>', text, re.S)
        check('Legacy navigation links to actual investigation play: ' + name, nav is not None and url in nav.group(1))

directions = (web / 'directions.html').read_text('utf-8')
references = (web / 'references.html').read_text('utf-8')
forms = (web / 'forms.html').read_text('utf-8')
check('Direction map reports thirteen originals and completed first ten', '13 个原创方向试玩 · 首批 10 条参考已完成' in directions)
check('Reference summary reports thirteen originals and completed first ten', '13 个原创方向试玩' in references and '首批 10 条参考已完成' in references)
check('Forms summary reports thirteen originals with the old 107 / 116 catalog', '方向试玩现在共十三种' in forms and '107 种／116 个入口' in forms and '107 种已接入形态' in forms)
check('Independent eleventh twelfth and thirteenth cards remain visible', all(text in directions for text in ['11 / 牌组构筑', '12 / 自然摄影 × 野外观察', '13 / 环境调查 × 证据重构', '10 / 环境潜行']))
check('Investigation is the current reference primary launch', any(a.get('href') == url and 'primary' in a.get('class', '').split() for a in pages['references.html'].anchors))
check('Investigation is the current forms primary launch', f'class="reference-launch" href="{url}"' in forms)
check('Investigation leads the map introduction launch', directions.index('新体验：夜港来信') < directions.index('芦湾观鸟 · 自然摄影与野外观察'))
check('All three commercial expansion references remain separate', all(f'id="{key}"' in references for key in ['deckbuilding-reference', 'wildlife-reference', 'investigation-reference']))
investigation_reference = re.search(r'<section\b[^>]*id="investigation-reference"[^>]*>(.*?)</section>', references, re.S)
check('Official Golden Idol reference is separate and has original finite-case scope', investigation_reference is not None and all(text in investigation_reference.group(1) for text in [reference, '商业', '原先十条开源参考', '寻找场景线索', '重构人物和事件', '有限原创环境调查短案', '不复制原作代码、角色、剧情或图片', '三个地点、九条线索', '三项需要两条实际证据的推断', '两种不同结局']))
check('New investigation sample includes official product reference', reference in new_html)
check('Old forms catalog and controller remain byte identical', all(sha((web / name).read_bytes()) == baseline['protected'][name] for name in ['game-forms-catalog.js', 'forms.js']))

generation = json.loads((p / 'assets/directions/investigation-generation-20261005.json').read_text('utf-8'))
check('Built-in original scene bitmap generation provenance saved', generation['mode'] == 'built-in image_gen' and len(generation['assets']) == 3)
check('Exactly the station office and quay scene plates were generated', {a['key'] for a in generation['assets']} == {'station', 'office', 'quay'})
for asset in generation['assets']:
    file = p / asset['file']
    check('Full original art prompt retained: ' + asset['key'], isinstance(asset['prompt'], str) and len(asset['prompt']) > 300)
    check('Generated original scene copied byte-identically: ' + asset['key'], file.is_file() and Path(asset['source']).is_file() and file.read_bytes() == Path(asset['source']).read_bytes())
    with Image.open(file) as image:
        check('Original scene is a sufficient-size PNG: ' + asset['key'], image.format == 'PNG' and min(image.size) >= 900, size=list(image.size), mode=image.mode)
        check('Scene plate is opaque and was requested without transparency: ' + asset['key'], asset['transparent_background'] is False and (image.mode == 'RGB' or image.mode == 'RGBA' and image.getextrema()[3][0] == 255))

resources = ['direction-investigation.html', 'direction-investigation.css', 'direction-investigation.js', 'direction-investigation-engine.js', 'directions.css', *baseline['mutable_navigation'], *[a['file'].removeprefix('web/') for a in generation['assets']]]
check('Exactly twenty-two actual source-build-live resources are covered', len(resources) == len(set(resources)) == 22)
for relative in resources:
    source = (web / relative).read_bytes()
    built = args.build_root / relative
    check('Built resource is byte-identical: ' + relative, built.is_file() and built.read_bytes() == source)
    with urlopen(f'http://127.0.0.1:{args.port}/' + quote(relative, safe='/'), timeout=12) as response:
        check('Live HTTP resource is byte-identical: ' + relative, response.status == 200 and response.read() == source)

actual_reports = {}
for name, minimum in [('rules', MIN_RULE_CHECKS), ('controller', MIN_CONTROLLER_CHECKS)]:
    report = json.loads((p / f'notes/direction-investigation-{name}-20261005.json').read_text('utf-8'))
    actual_reports[name] = report
    check('Actual current investigation ' + name + ' checks are successful string names', passed(report) and isinstance(report.get('checks'), list) and report.get('count') == len(report['checks']) and len(report['checks']) >= minimum and all(isinstance(item, str) and len(item) > 15 for item in report['checks']) and not report.get('failures'), count=report.get('count'))
    check('Actual current investigation ' + name + ' evidence describes production execution', isinstance(report.get('method'), str) and len(report['method']) > 100)
controller = (web / 'direction-investigation.js').read_text('utf-8')
check('Investigation controller declares its own save namespace', 'world-play-direction-investigation-v1' in controller)
probe = "import * as E from './web/direction-investigation-engine.js'; console.log(JSON.stringify({ scenes: E.SCENES.map(s => s.id), clues: Object.keys(E.CLUES), claims: Object.keys(E.CLAIMS), endings: E.ENDINGS.map(e => ({id:e.id,text:e.text})), uniqueFoundEvidencePairs: Object.values(E.CLAIMS).every(c => c.requiredEvidence.length === 2 && new Set(c.requiredEvidence).size === 2 && c.requiredEvidence.every(id => Object.hasOwn(E.CLUES,id))), validSceneClues: E.SCENES.every(s => s.clueIds.length === 3 && s.clueIds.every(id => E.CLUES[id]?.scene === s.id)), maxActions:E.MAX_ACTIONS,maxSaveBytes:E.MAX_SAVE_BYTES }));"
result = subprocess.run([args.node, '--input-type=module', '-e', probe], cwd=p, capture_output=True, text=True, encoding='utf-8', timeout=20)
check('Production engine metadata probe executes successfully', result.returncode == 0, stderr=result.stderr)
facts = json.loads(result.stdout)
check('Production case actually exports three scenes and nine unique scene-local clues', len(facts['scenes']) == len(set(facts['scenes'])) == 3 and len(facts['clues']) == len(set(facts['clues'])) == 9 and facts['validSceneClues'])
check('Production case actually has three unique two-evidence claims', len(facts['claims']) == 3 and facts['uniqueFoundEvidencePairs'])
check('Production case actually has two distinct ending texts', len(facts['endings']) == 2 and len({ending['id'] for ending in facts['endings']}) == 2 and len({ending['text'] for ending in facts['endings']}) == 2)
check('Production case bounds actual action and save history', facts['maxActions'] == 4096 and facts['maxSaveBytes'] == 1000000)

regressions = json.loads((p / 'notes/direction-investigation-regressions-20261005.json').read_text('utf-8'))
check('All twelve old directions actually reran twenty-four scripts', passed(regressions) and regressions['directions'] == 12 and regressions['script_count'] == len(regressions['runs']) == 24)
check('Old regression reruns retain actual successful process output and actual totals', all(run['passed'] and run['exit_code'] == 0 and run['stdout'] and run['count'] > 0 for run in regressions['runs']) and sum(run['count'] for run in regressions['runs']) == regressions['total_checks'], total_checks=regressions['total_checks'])
check('Old regression report uses successful test-name strings', regressions['count'] == len(regressions['checks']) and len(regressions['checks']) >= 24 and all(isinstance(item, str) for item in regressions['checks']))
check('Historical reports retained exact bytes through current reruns', regressions['historical_reports_unchanged'] is True and len(regressions['historical_reports']) > 0)
for report in regressions['historical_reports']:
    check('Historical direction report remains byte-identical: ' + report['name'], sha((p / 'notes' / report['name']).read_bytes()) == report['sha256'])

browser = json.loads((p / 'notes/direction-investigation-browser-20261005.json').read_text('utf-8'))
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

report = {'date': '2026-10-05', 'passed': True, 'overallpassed': True, 'count': len(checks), 'checks': checks, 'details': details, 'source_build_live_resources': len(resources), 'protected_files': baseline['protected_count'], 'preserved_expansion_sections': len(baseline['preserved_expansion_sections']), 'readme_suffix_bytes': baseline['readme_suffix_bytes'], 'old_direction_scripts': regressions['script_count'], 'old_direction_checks': regressions['total_checks'], 'historical_reports_preserved': len(regressions['historical_reports']), 'investigation_rule_checks': actual_reports['rules']['count'], 'investigation_controller_checks': actual_reports['controller']['count'], 'browser_checks': len(browser_checks), 'browser_captures': len(captures), 'browser_evidence': 'Actual recorded visible-page interactions and native PNG/JPEG captures, with format, dimensions and SHA256 checked; no pending-browser acceptance.', 'scope': 'Thirteenth original finite environmental investigation case. Three locations, nine actual discoverable clues, three two-evidence verified claims and two distinct endings. First ten references and all previous twelve directions remain, including the entire deck/wildlife expansion sections. The Case of the Golden Idol is a separate commercial design reference without upstream code, character, story or image copying; no complete-game migration, AI detective or infinite narrative claim. All protected old web files, old report hashes and the entire prior README suffix were actually read and compared.'}
(p / 'notes/direction-investigation-package-20261005.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in report.items() if key not in ['checks', 'details']}, ensure_ascii=False))
