import concurrent.futures,hashlib,json,re,subprocess,sys
from pathlib import Path
from PIL import Image,ImageChops
P=Path(__file__).resolve().parents[1];ROOT=P.parents[1]
NODE='C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
previews=[]
for module in ['trace','swing']:
    source=P/f'assets/game-forms/gesture-qa/{module}-preview.png';target=P/f'web/assets/game-forms/{module}/preview.webp'
    with Image.open(source) as im:im.save(target,format='WEBP',quality=94,method=6);size=list(im.size)
    previews.append({'source':str(source.relative_to(P)).replace('\\','/'),'source_sha256':sha(source),'target':str(target.relative_to(P)).replace('\\','/'),'target_sha256':sha(target),'dimensions':size,'method':'Actual CUA canvas screenshot, WebP encoding only; no repaint or resize.'})
    (P/f'web/assets/game-forms/{module}/ATTRIBUTION.md').write_text('原创场景及道具由内置 ImageGen 制作，原始 PNG、完整提示词和哈希见项目 assets/game-forms/gesture-generation-20261004.json。运行资源仅编码为 WebP；preview 取自实际浏览器画布截图，出处见 notes/gesture-preview-provenance-20261004.json。\n',encoding='utf-8')
(P/'notes/gesture-preview-provenance-20261004.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2),encoding='utf-8')
def run(command,cwd=ROOT):
    r=subprocess.run(command,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace')
    return {'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
wrapper="import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';const write=fs.writeFileSync,note=path.resolve(process.argv[2]);fs.writeFileSync=function(dest,...args){if(typeof dest==='string'&&path.resolve(dest)===note)return;return write.call(this,dest,...args)};await import(pathToFileURL(process.argv[1]).href);"
def old(checker,note,vm=False):return [NODE]+(['--experimental-vm-modules'] if vm else [])+['--input-type=module','-e',wrapper,str(P/'tooling'/checker),str(P/'notes'/note)]
commands={
 'site_tests':[sys.executable,'-m','unittest','discover','-s','tests','-p','test_site.py'],
 'world_regression':old('check-world-rules.mjs','worlds-rules-check.json',True),
 'precision_regression':old('check-precision-rules.mjs','precision-rules-check-20261004.json'),
 'observation_regression':old('check-observation-rules.mjs','observation-rules-check-20261004.json'),
 'new_rules':[NODE,str(P/'tooling/check-gesture-rules.mjs')]
}
if '--package-only' in sys.argv:
    previous=json.loads((P/'notes/gesture-package-check-20261004.json').read_text(encoding='utf-8'));report={k:previous[k] for k in commands}
    report['new_rules']=run(commands['new_rules'])
    report['validation_note']='Previous passed unchanged legacy/site checks retained; new checks rerun, rebuilt and preservation/package hashes verified after final changes.'
else:
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures={k:pool.submit(run,c) for k,c in commands.items()};report={k:f.result() for k,f in futures.items()}
report['build']=run([sys.executable,str(ROOT/'scripts/build_site.py')])
baseline=json.loads((P/'notes/gesture-preservation-before-20261004.json').read_text(encoding='utf-8'));changed=[];missing=[]
for n,d in baseline['files'].items():
    f=P/'web'/n
    if not f.exists():missing.append(n)
    elif sha(f)!=d:changed.append(n)
report['preservation']={'files':len(baseline['files']),'changed':changed,'missing':missing,'intentional_shared':baseline['intentional_shared']}
js="globalThis.location={search:''};const[a,b]=await Promise.all([import('./web/game-forms-catalog.js'),import('./web/showcase-catalog.js')]);console.log(JSON.stringify({forms:a.gameForms.length,entrances:b.directions.length,uniqueForms:new Set(a.gameForms.map(v=>v.id)).size,uniqueEntrances:new Set(b.directions.map(v=>v.id)).size,newCovers:b.newDirections.filter(v=>['trace','swing'].includes(v.id)).map(v=>v.cover)}));"
catalog=run([NODE,'--input-type=module','-e',js],P)
if catalog['exit_code']:raise RuntimeError(catalog['stderr'])
report['catalogs']=json.loads(catalog['stdout'])
files=['showcase-trace.js','showcase-swing.js','showcase-gesture-kit.js']+baseline['intentional_shared']
files += [str(f.relative_to(P/'web')).replace('\\','/') for module in ['trace','swing'] for f in (P/f'web/assets/game-forms/{module}').rglob('*') if f.is_file()]
packaged=ROOT/'_site/projects/010-dumpling-style-lab'
report['packaged']={'targets':len(files),'mismatches':[n for n in files if not (packaged/n).is_file() or sha(P/'web'/n)!=sha(packaged/n)]}
report['previews']=previews
report['site_test_count']=int(re.search(r'Ran (\d+) tests',report['site_tests']['stderr']).group(1)) if report['site_tests']['exit_code']==0 else 0
report['world_check_count']=len(json.loads(report['world_regression']['stdout'])['checks']) if report['world_regression']['exit_code']==0 else 0
for name in ['precision','observation']:report[name+'_check_count']=json.loads(report[name+'_regression']['stdout'])['passed'] if report[name+'_regression']['exit_code']==0 else 0
report['new_check_count']=json.loads(report['new_rules']['stdout'])['passed'] if report['new_rules']['exit_code']==0 else 0
report['build_demo_count']=int(re.search(r'Built (\d+) static demo',report['build']['stdout']).group(1)) if report['build']['exit_code']==0 else 0
with Image.open(P/'assets/game-forms/gesture-qa/trace-pause-a.png') as a,Image.open(P/'assets/game-forms/gesture-qa/trace-pause-b.png') as b:
    report['pause_pixels_identical']=a.size==b.size and ImageChops.difference(a.convert('RGB'),b.convert('RGB')).getbbox() is None
report['passed']=all(report[k]['exit_code']==0 for k in commands) and report['build']['exit_code']==0 and not changed and not missing and not report['packaged']['mismatches'] and report['catalogs']['forms']==49 and report['catalogs']['entrances']==58 and report['pause_pixels_identical']
(P/'notes/gesture-package-check-20261004.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['passed','catalogs','site_test_count','world_check_count','precision_check_count','observation_check_count','new_check_count','build_demo_count','preservation','packaged','pause_pixels_identical']},ensure_ascii=False,indent=2))
sys.exit(0 if report['passed'] else 1)
