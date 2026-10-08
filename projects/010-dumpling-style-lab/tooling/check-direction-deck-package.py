"""Check actual deck sample resources, current evidence, and preserved old files."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from urllib.request import urlopen
from html.parser import HTMLParser
from PIL import Image
import hashlib, json, argparse

p = Path(__file__).resolve().parents[1]
web = p / 'web'
built = p.parents[1] / '_site/projects/010-dumpling-style-lab'
checks = []
def check(name, valid, **details):
    checks.append(dict(name=name, passed=bool(valid), **details))
    if not valid: raise AssertionError((name, details))
def sha(data): return hashlib.sha256(data).hexdigest()

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.ids=[]; self.links=[]; self.assets=[]; self.feed(text)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag=='a' and a.get('href'): self.links.append(a['href'])
        if tag in ['script','img'] and a.get('src'): self.assets.append(a['src'])
        if tag=='link' and a.get('rel')=='stylesheet': self.assets.append(a['href'])

parser=argparse.ArgumentParser(); parser.add_argument('--browser-pending',action='store_true'); args=parser.parse_args()
baseline=json.loads((p/'notes/deck-preservation-before-20261005.json').read_text('utf-8'))
check('protected baseline size', baseline['protected_count']==2635)
for file,digest in baseline['protected'].items():
    check('previous runtime/asset preserved', (web/file).is_file() and sha((web/file).read_bytes())==digest, file=file)
readme=(p/'README.md').read_bytes()
check('entire previous README preserved as suffix',sha(readme[-baseline['readme_suffix_bytes']:])==baseline['readme_suffix_sha256'])
html=(web/'direction-deck.html').read_text('utf-8'); page=Page(html)
check('new page IDs unique',len(page.ids)==len(set(page.ids)))
for reference in page.links+page.assets:
    parts=urlsplit(reference)
    if parts.scheme:
        check('secure external link',parts.scheme=='https',reference=reference); continue
    target=(web/unquote(parts.path or 'direction-deck.html')).resolve()
    check('local page dependency within project',target.is_relative_to(web.resolve()),reference=reference)
    check('local page dependency exists',target.is_file(),reference=reference)
    if parts.fragment and target.suffix=='.html':
        check('local anchor exists',unquote(parts.fragment) in Page(target.read_text('utf-8')).ids,reference=reference)
for name in baseline['mutable_navigation']:
    text=(web/name).read_text('utf-8')
    check('old page has new playable link', 'direction-deck.html?demo=1#play' in text,file=name)
check('original ten-reference batch remains explicit','首批' in (web/'directions.html').read_text('utf-8') and '10' in (web/'directions.html').read_text('utf-8'))
check('new commercial genre reference is explicitly separated', 'https://www.megacrit.com/games/' in html and '商业' in html and '十个' in html and '不移植' in html)
check('new direction is appended beyond first ten', '11 / 牌组构筑' in (web/'directions.html').read_text('utf-8') and '10 / 环境潜行' in (web/'directions.html').read_text('utf-8'))
check('old forms catalog untouched',sha((web/'game-forms-catalog.js').read_bytes())==baseline['protected']['game-forms-catalog.js'])
generation=json.loads((p/'assets/directions/deck-generation-20261005.json').read_text('utf-8'))
check('built-in original art provenance',generation['mode']=='built-in image_gen' and len(generation['assets'])==3)
for a in generation['assets']:
    file=p/a['file']; check('full prompt saved',len(a['prompt'])>300, file=a['file'])
    check('original generated bitmap copied unchanged',file.read_bytes()==Path(a['source']).read_bytes(),file=a['file'])
    with Image.open(file) as image:
        check('bitmap sufficient actual size',min(image.size)>=900,file=a['file'],size=list(image.size))
        if a['transparent_background']:
            check('actual transparent alpha',image.mode=='RGBA' and image.getextrema()[3][0]==0,file=a['file'])
resources=['direction-deck.html','direction-deck.css','direction-deck.js','direction-deck-engine.js','directions.css',*baseline['mutable_navigation'],*[a['file'].removeprefix('web/') for a in generation['assets']]]
resources=list(dict.fromkeys(resources))
for relative in resources:
    source=(web/relative).read_bytes()
    check('built resource byte-identical', (built/relative).is_file() and (built/relative).read_bytes()==source,file=relative)
    with urlopen('http://127.0.0.1:8962/'+relative,timeout=12) as response:
        actual=response.read()
        check('live HTTP serves same file',response.status==200 and actual==source,file=relative)
for name,minimum in [('rules',51),('controller',28)]:
    data=json.loads((p/f'notes/direction-deck-{name}-20261005.json').read_text('utf-8'))
    check('current actual '+name+' checks',data['passed'] and data['count']==len(data['checks']) and len(data['checks'])>=minimum and all(isinstance(x,str) and len(x)>20 for x in data['checks']),count=len(data['checks']))
reg=json.loads((p/'notes/direction-deck-regressions-20261005.json').read_text('utf-8'))
check('all ten old directions actually rerun',reg['passed'] and reg['script_count']==20 and reg['total_checks']==440)
check('old rerun records have actual successful output',len(reg['runs'])==20 and all(x['passed'] and x['exit_code']==0 and x['stdout'] and x['count']>0 for x in reg['runs']) and sum(x['count'] for x in reg['runs'])==440)
browser=None
if not args.browser_pending:
    browser=json.loads((p/'notes/direction-deck-browser-20261005.json').read_text('utf-8'))
    check('actual browser acceptance',browser['passed'] and len(browser['checks'])>=10 and all(x['passed'] for x in browser['checks']))
    for capture in browser['screenshots']:
        with Image.open(capture['file']) as im:
            check('actual screenshot dimensions recorded',list(im.size)==capture['capture_size'],file=capture['file'])
report={'date':'2026-10-05','passed':True,'count':len(checks),'checks':checks,'source_build_live_resources':len(resources),'protected_files':baseline['protected_count'],'readme_suffix_bytes':baseline['readme_suffix_bytes'],'browser_evidence': 'pending' if args.browser_pending else 'actual recorded interactions','scope':'Eleventh original local finite deckbuilding sample; initial ten-reference batch retained separately from new genre research. Source, build, HTTP and previous files actually read.'}
(p/'notes/direction-deck-package-20261005.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},ensure_ascii=False))
