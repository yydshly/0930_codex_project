"""Check actual source/build/live resources, art, browser evidence and preservation."""
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import quote,urlsplit,unquote
from html.parser import HTMLParser
from PIL import Image
import json,hashlib,base64,argparse
p=Path(__file__).resolve().parents[1];web=p/'web'
parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8962);parser.add_argument('--build-root',type=Path,default=p.parents[1]/'_site/projects/010-dumpling-style-lab');args=parser.parse_args()
checks=[]
def check(name,valid):
    assert valid,name
    checks.append(name)
sha=lambda data:hashlib.sha256(data).hexdigest()
read=lambda file:json.loads(file.read_text('utf-8'))
baseline=read(p/'notes/language-preservation-before-20261006.json')
check('All old protected files retain exact bytes',all((web/n).is_file() and sha((web/n).read_bytes())==h for n,h in baseline['protected'].items()))
check('Entire old README suffix retained',sha((p/'README.md').read_bytes()[-baseline['readme_suffix_bytes']:])==baseline['readme_suffix_sha256'])
check('All historical reports retain exact bytes',all(sha((p/'notes'/n).read_bytes())==h for n,h in baseline['historical_reports'].items()))
for s in baseline['preserved_expansion_sections']:check('Previous independent section retained: '+s['file']+'/'+str(s['direction']),base64.b64decode(s['base64']).decode('utf-8') in (web/s['file']).read_text('utf-8'))
url='direction-language.html?demo=1#play'
for name in baseline['mutable_navigation']:check('Appended new navigation: '+name,url in (web/name).read_text('utf-8'))
directions=(web/'directions.html').read_text('utf-8');refs=(web/'references.html').read_text('utf-8');forms=(web/'forms.html').read_text('utf-8')
check('Fifteen directions with first ten separate','15 个原创方向试玩' in directions and '首批 10 条参考已完成' in directions)
check('All five independent commercial references retained',all(f'id="{n}-reference"' in refs for n in ['deckbuilding','wildlife','investigation','landscape','language']))
check('Old 107 forms and 116 entrances retained','107 种形态' in refs and '116 个入口' in refs and '107 种／116 个入口' in forms)
check('Current launch points to new language experience',f'class="reference-launch" href="{url}"' in forms and f'class="button primary" href="{url}"' in refs)
manifest=read(p/'assets/directions/language-generation-20261006.json')
check('Four original built-in assets with full prompts',manifest['mode']=='built-in image_gen' and len(manifest['assets'])==4 and all(len(a['prompt'])>300 for a in manifest['assets']))
for a in manifest['assets']:
    file=p/a['file'];check('Original bitmap copied identically: '+a['key'],file.read_bytes()==Path(a['source']).read_bytes())
    with Image.open(file) as im:
        check('Actual original PNG dimensions: '+a['key'],im.format=='PNG' and min(im.size)>=1000)
        if a['key']=='props':
            alpha=im.getchannel('A') if im.mode=='RGBA' else None
            check('Actual transparent props atlas',alpha is not None and alpha.getextrema()[0]==0 and alpha.getextrema()[1]>=250 and alpha.histogram()[0]/(im.width*im.height)>.4)
            frames=manifest['props_runtime_frames']
            check('Eight equal native frames fit actual atlas',len(frames)==8 and all(w==im.width/4 and h==im.height/2 and x>=0 and y>=0 and x+w<=im.width and y+h<=im.height for x,y,w,h in frames.values()))
        else:check('Opaque original environment: '+a['key'],im.mode in ['RGB','RGBA'] and (im.mode=='RGB' or im.getchannel('A').getextrema()==(255,255)))
resources=['direction-language.html','direction-language.css','direction-language.js','direction-language-render.js','direction-language-engine.js','directions.css',*baseline['mutable_navigation'],*[a['file'].removeprefix('web/') for a in manifest['assets']]]
for rel in resources:
    data=(web/rel).read_bytes();check('Built resource identical: '+rel,(args.build_root/rel).read_bytes()==data)
    with urlopen(f'http://127.0.0.1:{args.port}/'+quote(rel,safe='/'),timeout=12) as r:check('Live HTTP identical: '+rel,r.status==200 and r.read()==data)
class Page(HTMLParser):
    def __init__(self,text):super().__init__();self.links=[];self.ids=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.append(attrs['id'])
        for k in ['href','src']:
            if attrs.get(k):self.links.append(attrs[k])
pages={n:Page((web/n).read_text('utf-8')) for n in ['direction-language.html',*baseline['mutable_navigation']]};link_count=0
for name,page in pages.items():
    check('No duplicate DOM IDs: '+name,len(page.ids)==len(set(page.ids)))
    for link in page.links:
        parts=urlsplit(link)
        if parts.scheme or parts.netloc:continue
        target=(web/name).parent/unquote(parts.path) if parts.path else web/name
        if target.is_dir():target=target/'index.html'
        check('Local link exists: '+name+'/'+link,target.is_file())
        if parts.fragment and target.suffix=='.html':check('Local fragment exists: '+name+'/'+link,unquote(parts.fragment) in Page(target.read_text('utf-8')).ids)
        link_count+=1
reports={n:read(p/f'notes/direction-language-{n}-20261006.json') for n in ['rules','controller','regressions','browser']}
counts={n:reports[n].get('count',reports[n].get('checkCount',0)) for n in ['rules','controller']}
check('New rules and actual production controller pass',all(reports[n]['passed'] and counts[n]>=25 and counts[n]==len(reports[n]['checks']) for n in ['rules','controller']))
reg=reports['regressions'];check('All fourteen old directions actually rerun',reg['passed'] and reg['script_count']==28 and reg['total_checks']==720 and reg['historical_reports_unchanged'] and all(r['exit_code']==0 and r['count']>0 for r in reg['runs']))
browser=reports['browser'];check('Actual browser interactions pass',browser['passed'] and len(browser['checks'])>=10 and all(c['passed'] is True for c in browser['checks']) and len(browser['method'])>80)
check('Three distinct native browser captures',len(browser['screenshots'])>=3 and len(set(c['file'] for c in browser['screenshots']))>=3)
for c in browser['screenshots']:
    with Image.open(c['file']) as im:check('Actual screenshot dimensions codec and hash: '+c['file'],im.format in ['PNG','JPEG'] and im.format==c['format'] and list(im.size)==c['capture_size'] and im.width>=320 and im.height>=400 and sha(Path(c['file']).read_bytes())==c['sha256'])
check('Quality and art inspection tied to actual files',read(p/'notes/direction-language-quality-20261006.json')['passed'] and read(p/'notes/language-art-inspection-20261006.json')['passed'])
result={'date':'2026-10-06','passed':True,'count':len(checks),'checks':checks,'protected_files':baseline['protected_count'],'old_readme_bytes':baseline['readme_suffix_bytes'],'old_sections':len(baseline['preserved_expansion_sections']),'historical_reports':len(baseline['historical_reports']),'source_build_live_resources':len(resources),'local_links':link_count,'rules':counts['rules'],'controller':counts['controller'],'old_regressions':reg['total_checks'],'browser_checks':len(browser['checks']),'browser_captures':len(browser['screenshots'])}
(p/'notes/direction-language-package-20261006.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='checks'},ensure_ascii=False))
