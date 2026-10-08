"""Final actual source/build/live, art, browser and preservation checks."""
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import quote,urlsplit,unquote
from html.parser import HTMLParser
from PIL import Image
import json,hashlib,base64,argparse
p=Path(__file__).resolve().parents[1]
web=p/'web'
parser=argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=8962)
parser.add_argument('--build-root',type=Path,default=p.parents[1]/'_site/projects/010-dumpling-style-lab')
args=parser.parse_args()
checks=[]
def check(name,valid):
    assert valid,name
    checks.append(name)
sha=lambda data:hashlib.sha256(data).hexdigest()
read=lambda file:json.loads(file.read_text('utf-8'))
baseline=read(p/'notes/landscape-preservation-before-20261006.json')
check('All protected old web files retain exact bytes',all((web/name).is_file() and sha((web/name).read_bytes())==h for name,h in baseline['protected'].items()))
check('Full old README suffix retained',sha((p/'README.md').read_bytes()[-baseline['readme_suffix_bytes']:])==baseline['readme_suffix_sha256'])
check('All historical reports retained',all(sha((p/'notes'/name).read_bytes())==h for name,h in baseline['historical_reports'].items()))
for section in baseline['preserved_expansion_sections']:
    check('Previous independent section retained: '+section['file']+'/'+str(section['direction']),base64.b64decode(section['base64']).decode('utf-8') in (web/section['file']).read_text('utf-8'))
url='direction-landscape.html?demo=1#play'
for filename in baseline['mutable_navigation']:
    check('Appended new nav: '+filename,url in (web/filename).read_text('utf-8'))
directions=(web/'directions.html').read_text('utf-8')
references=(web/'references.html').read_text('utf-8')
forms=(web/'forms.html').read_text('utf-8')
check('Fourteen direction count and old first ten retained','14 个原创方向试玩' in directions and '首批 10 条参考已完成' in directions)
check('All four independent commercial expansions retained',all(f'id="{n}-reference"' in references for n in ['deckbuilding','wildlife','investigation','landscape']))
check('Old 107/116 counters retained','107 种形态' in references and '116 个入口' in references and '107 种／116 个入口' in forms)
check('Current launch is the fourteenth direction',f'class="reference-launch" href="{url}"' in forms and f'class="button primary" href="{url}"' in references)
manifest=read(p/'assets/directions/landscape-generation-20261006.json')
check('Built-in generation full provenance',manifest['mode']=='built-in image_gen' and len(manifest['assets'])==2 and all(len(a['prompt'])>300 for a in manifest['assets']))
for asset in manifest['assets']:
    file=p/asset['file']
    check('Original asset copied identically: '+asset['key'],file.read_bytes()==Path(asset['source']).read_bytes())
    with Image.open(file) as im:
        check('Actual opaque original PNG: '+asset['key'],im.format=='PNG' and im.mode=='RGB' and min(im.size)>=1000)
        if asset['key']=='atlas':
            check('Four native square runtime frames fit actual atlas',all(x>=0 and y>=0 and w==h==512 and x+w<=im.width and y+h<=im.height for x,y,w,h in manifest['atlas_runtime_frames'].values()))
resources=['direction-landscape.html','direction-landscape.css','direction-landscape.js','direction-landscape-render.js','direction-landscape-engine.js','directions.css',*baseline['mutable_navigation'],*[a['file'].removeprefix('web/') for a in manifest['assets']]]
for relative in resources:
    source=(web/relative).read_bytes()
    check('Built resource identical: '+relative,(args.build_root/relative).read_bytes()==source)
    with urlopen(f'http://127.0.0.1:{args.port}/'+quote(relative,safe='/'),timeout=12) as response:
        check('Live HTTP identical: '+relative,response.status==200 and response.read()==source)
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__();self.links=[];self.ids=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.append(attrs['id'])
        for a in ['href','src']:
            if attrs.get(a):self.links.append(attrs[a])
pages={n:Page((web/n).read_text('utf-8')) for n in ['direction-landscape.html',*baseline['mutable_navigation']]}
link_count=0
for filename,page in pages.items():
    check('No duplicate native DOM ids: '+filename,len(set(page.ids))==len(page.ids))
    for link in page.links:
        parts=urlsplit(link)
        if parts.scheme or parts.netloc:continue
        target=(web/filename).parent/unquote(parts.path) if parts.path else web/filename
        if target.is_dir():target=target/'index.html'
        check('Local linked resource exists: '+filename+'/'+link,target.is_file())
        if parts.fragment and target.suffix=='.html':check('Local fragment exists: '+filename+'/'+link,unquote(parts.fragment) in Page(target.read_text('utf-8')).ids)
        link_count+=1
reports={n:read(p/f'notes/direction-landscape-{n}-20261006.json') for n in ['rules','controller','regressions','browser']}
new_counts={n:reports[n].get('count',reports[n].get('checkCount',0)) for n in ['rules','controller']}
check('Current new rules and production controller reports pass',all(reports[n].get('passed',reports[n].get('overallpassed',False)) and new_counts[n]>=20 and new_counts[n]==len(reports[n]['checks']) for n in ['rules','controller']))
reg=reports['regressions']
check('All thirteen prior directions actually rerun',reg['passed'] and reg['script_count']==26 and reg['total_checks']==650 and reg['historical_reports_unchanged'] and all(r['exit_code']==0 and r['count']>0 for r in reg['runs']))
browser=reports['browser']
check('Actual browser interaction evidence passes',browser['passed'] and len(browser['checks'])>=10 and all(c['passed'] is True for c in browser['checks']) and len(browser['method'])>80)
check('Distinct actual native screenshots accepted',len(browser['screenshots'])>=3 and len(set(c['file'] for c in browser['screenshots']))>=3)
for capture in browser['screenshots']:
    with Image.open(capture['file']) as im:
        check('Screenshot dimensions format and hash actual: '+capture['file'],im.format in ['PNG','JPEG'] and im.format==capture['format'] and list(im.size)==capture['capture_size'] and im.width>=320 and im.height>=400 and sha(Path(capture['file']).read_bytes())==capture['sha256'])
check('Quality scope tied to actual browser/art reports',read(p/'notes/direction-landscape-quality-20261006.json')['passed'] and read(p/'notes/landscape-art-inspection-20261006.json')['passed'])
result={'date':'2026-10-06','passed':True,'count':len(checks),'checks':checks,'protected_files':baseline['protected_count'],'old_readme_bytes':baseline['readme_suffix_bytes'],'old_sections':len(baseline['preserved_expansion_sections']),'historical_reports':len(baseline['historical_reports']),'source_build_live_resources':len(resources),'local_links':link_count,'rules':new_counts['rules'],'controller':new_counts['controller'],'old_regressions':reg['total_checks'],'browser_checks':len(browser['checks']),'browser_captures':len(browser['screenshots'])}
(p/'notes/direction-landscape-package-20261006.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='checks'},ensure_ascii=False))
