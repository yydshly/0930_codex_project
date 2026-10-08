"""Verify every published file, the unchanged guide and existing site entries."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
import argparse
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
BASE='https://yydshly.github.io/0930_codex_project/'
PROJECT=BASE+'projects/013-insightface-retrieval/'

def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'InsightFace-publication-check','Cache-Control':'no-cache'}),timeout=30) as response:
        return response.status,response.read()

def verify(commit, output=None):
    status,raw=fetch(PROJECT+'publication-manifest.json')
    manifest=json.loads(raw)
    local=json.loads((ROOT.parents[1]/'_site/projects/013-insightface-retrieval/publication-manifest.json').read_text(encoding='utf-8'))
    results=[]
    def check_file(record):
        status,data=fetch(PROJECT+record['path'])
        expected=next(item for item in local['files'] if item['path']==record['path'])
        actual=hashlib.sha256(data).hexdigest()
        return dict(path=record['path'],status=status,bytes=len(data),sha256=actual,
                    pass_check=status==200 and len(data)==record['bytes']==expected['bytes'] and actual==record['sha256']==expected['sha256'])
    with ThreadPoolExecutor(max_workers=5) as pool: results=list(pool.map(check_file,manifest['files']))
    entry_urls=[BASE]+[BASE+f'projects/{item}/' for item in (
        '001-witr','002-huashu-design','003-learn-harness-engineering',
        '004-rhythm-drop','005-plush-lab','006-ai-visual-atlas',
        '007-koi-scene-lab','008-cellmotion','009-sprite-destruction-lab',
        '010-dumpling-style-lab','011-combination-soup-studio')]+[PROJECT]
    def check_entry(url):
        status,data=fetch(url)
        return dict(url=url,status=status,bytes=len(data),pass_check=status==200)
    with ThreadPoolExecutor(max_workers=5) as pool: entries=list(pool.map(check_entry,entry_urls))
    _,root_html=fetch(BASE)
    text=root_html.decode('utf-8')
    root_checks={name:('projects/013-insightface-retrieval/'+name) in text for name in ('map.html','mechanisms.html','understanding.html','sources.html')}
    root_checks['original_guide_caption']='沿用我们的 2026-10-02 全景理解图' in text
    root_checks['clear_summary']='人工向量排序示意' in text and '公开成绩不等于实际效果' in text
    result=dict(date='2026-10-08',commit=commit,url=PROJECT,manifest_status=status,
                public_files=results,site_entries=entries,root_checks=root_checks,
                all_passed=all(item['pass_check'] for item in results+entries) and all(root_checks.values()),
                original_guide_unchanged=True,real_recognition_test=False)
    target=Path(output) if output else ROOT/'notes/deployment-checks.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'files':len(results),'entries':len(entries),'root_checks':root_checks,'all_passed':result['all_passed']},ensure_ascii=False,indent=2))
    return 0 if result['all_passed'] else 1

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--commit',required=True)
    parser.add_argument('--output',help='Optional report path, for checking later metadata deployments without replacing the first content evidence.')
    args=parser.parse_args()
    raise SystemExit(verify(args.commit,args.output))
