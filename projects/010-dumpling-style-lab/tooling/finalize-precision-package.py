import concurrent.futures, hashlib, json, re, subprocess, sys
from pathlib import Path
from PIL import Image

PROJECT=Path(__file__).resolve().parents[1]
ROOT=PROJECT.parents[1]
NODE=Path('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
previews=[]
for module in ['cue','prism']:
 source=PROJECT/f'assets/game-forms/precision-qa/{module}-preview.png'
 target=PROJECT/f'web/assets/game-forms/{module}/preview.webp'
 with Image.open(source) as im:
  im.save(target,format='WEBP',quality=94,method=6)
  dimensions=list(im.size)
 previews.append({'source':str(source.relative_to(PROJECT)).replace('\\','/'),'source_sha256':sha(source),'target':str(target.relative_to(PROJECT)).replace('\\','/'),'target_sha256':sha(target),'dimensions':dimensions,'method':'Exact CUA canvas-region screenshot, WebP encoding only; no repainting or resizing.'})
(PROJECT/'notes/precision-preview-provenance-20261004.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2),encoding='utf-8')
def run(command):
 result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
 return {'exit_code':result.returncode,'stdout':result.stdout,'stderr':result.stderr}
wrapper="""import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';const write=fs.writeFileSync;const protectedNote=path.resolve(process.argv[2]);fs.writeFileSync=function(dest,...args){if(typeof dest==='string'&&path.resolve(dest)===protectedNote)return;return write.call(this,dest,...args)};await import(pathToFileURL(process.argv[1]).href);"""
commands={
 'site_tests':[sys.executable,'-m','unittest','discover','-s','tests','-p','test_site.py'],
 'world_regression':[str(NODE),'--experimental-vm-modules','--input-type=module','-e',wrapper,str(PROJECT/'tooling/check-world-rules.mjs'),str(PROJECT/'notes/worlds-rules-check.json')],
 'new_rules':[str(NODE),str(PROJECT/'tooling/check-precision-rules.mjs')]
}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 futures={k:pool.submit(run,c) for k,c in commands.items()}
 report={k:f.result() for k,f in futures.items()}
report['build']=run([sys.executable,str(ROOT/'scripts/build_site.py')])
baseline=json.loads((PROJECT/'notes/arcade-preservation-before-20261004.json').read_text(encoding='utf-8'))
changed=[];missing=[]
for path,digest in baseline['files'].items():
 file=PROJECT/'web'/path
 if not file.exists():missing.append(path)
 elif sha(file)!=digest:changed.append(path)
report['preservation']={'files':len(baseline['files']),'changed':changed,'missing':missing,'intentional_shared':baseline['intentional_shared']}
js="globalThis.location={search:''};const [a,b]=await Promise.all([import('./web/game-forms-catalog.js'),import('./web/showcase-catalog.js')]);console.log(JSON.stringify({forms:a.gameForms.length,entrances:b.directions.length,uniqueForms:new Set(a.gameForms.map(v=>v.id)).size,uniqueEntrances:new Set(b.directions.map(v=>v.id)).size,newCovers:b.newDirections.filter(v=>['cue','prism'].includes(v.id)).map(v=>v.cover)}));"
catalog=subprocess.run([str(NODE),'--input-type=module','-e',js],cwd=PROJECT,capture_output=True,text=True,encoding='utf-8')
if catalog.returncode:raise RuntimeError(catalog.stderr)
report['catalogs']=json.loads(catalog.stdout)
files=['showcase-cue.js','showcase-prism.js','showcase-precision-kit.js']+baseline['intentional_shared']
files += [str(p.relative_to(PROJECT/'web')).replace('\\','/') for folder in ['cue','prism'] for p in (PROJECT/f'web/assets/game-forms/{folder}').rglob('*') if p.is_file()]
packaged=ROOT/'_site/projects/010-dumpling-style-lab'
report['packaged']={'targets':len(files),'mismatches':[p for p in files if not (packaged/p).is_file() or sha(PROJECT/'web'/p)!=sha(packaged/p)]}
report['previews']=previews
report['site_test_count']=int(re.search(r'Ran (\d+) tests',report['site_tests']['stderr']).group(1)) if report['site_tests']['exit_code']==0 else 0
report['world_check_count']=len(json.loads(report['world_regression']['stdout'])['checks']) if report['world_regression']['exit_code']==0 else 0
report['new_check_count']=json.loads(report['new_rules']['stdout'])['passed'] if report['new_rules']['exit_code']==0 else 0
report['build_demo_count']=int(re.search(r'Built (\d+) static demo',report['build']['stdout']).group(1)) if report['build']['exit_code']==0 else 0
report['passed']=all(report[k]['exit_code']==0 for k in commands) and report['build']['exit_code']==0 and not changed and not missing and not report['packaged']['mismatches'] and report['catalogs']['forms']==45 and report['catalogs']['entrances']==54
(PROJECT/'notes/precision-package-check-20261004.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['passed','catalogs','site_test_count','world_check_count','new_check_count','build_demo_count','preservation','packaged']},ensure_ascii=False,indent=2))
sys.exit(0 if report['passed'] else 1)
