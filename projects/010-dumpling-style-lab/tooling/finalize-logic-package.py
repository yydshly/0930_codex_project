import concurrent.futures,hashlib,json,re,subprocess,sys,urllib.request
from pathlib import Path
from PIL import Image
P=Path(__file__).resolve().parents[1];ROOT=P.parents[1]
NODE='C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(command,cwd=ROOT):
    r=subprocess.run(command,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace');return {'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
wrapper="import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';const write=fs.writeFileSync,note=path.resolve(process.argv[2]);fs.writeFileSync=function(dest,...args){if(typeof dest==='string'&&path.resolve(dest)===note)return;return write.call(this,dest,...args)};await import(pathToFileURL(process.argv[1]).href);"
def old(checker,note,vm=False):return [NODE]+(['--experimental-vm-modules'] if vm else [])+['--input-type=module','-e',wrapper,str(P/'tooling'/checker),str(P/'notes'/note)]
commands={
 'site_tests':[sys.executable,'-m','unittest','discover','-s','tests','-p','test_site.py'],
 'world_regression':old('check-world-rules.mjs','worlds-rules-check.json',True),
 'precision_regression':old('check-precision-rules.mjs','precision-rules-check-20261004.json'),
 'observation_regression':old('check-observation-rules.mjs','observation-rules-check-20261004.json'),
 'gesture_regression':old('check-gesture-rules.mjs','gesture-rules-check-20261004.json'),
 'new_rules':[NODE,str(P/'tooling/check-logic-rules.mjs')],
 'production_render':[NODE,str(P/'tooling/render-logic-scenes.mjs')]
}
with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:
    tasks={k:pool.submit(run,v) for k,v in commands.items()};report={k:v.result() for k,v in tasks.items()}
previews=[]
for module,frame in [('bubble','initial'),('sonar','progress')]:
    source=P/f'assets/game-forms/logic-qa/{module}-{frame}.png';target=P/f'web/assets/game-forms/{module}/preview.webp'
    with Image.open(source) as im:im.save(target,format='WEBP',quality=94,method=6);size=list(im.size)
    previews.append({'source':str(source.relative_to(P)).replace('\\','/'),'source_sha256':sha(source),'target':str(target.relative_to(P)).replace('\\','/'),'target_sha256':sha(target),'dimensions':size,'method':'Production game.draw() through Skia canvas and DOM lifecycle double; WebP encoding only. Not a browser screenshot.'})
    (P/f'web/assets/game-forms/{module}/ATTRIBUTION.md').write_text('原创场景与物件通过内置 ImageGen 制作，原始 PNG、完整提示词与哈希见项目 assets/game-forms/logic-generation-20261004.json。运行素材保持原尺寸和透明通道。preview 由实际生产模块 draw() 在 Skia 画布绘制，编码为 WebP，来源见 notes/logic-preview-provenance-20261004.json；不是浏览器实机截图。\n',encoding='utf-8')
(P/'notes/logic-preview-provenance-20261004.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2),encoding='utf-8')
report['build']=run([sys.executable,str(ROOT/'scripts/build_site.py')])
baseline=json.loads((P/'notes/logic-preservation-before-20261004.json').read_text(encoding='utf-8'));changed=[];missing=[]
for n,d in baseline['files'].items():
    f=P/'web'/n
    if not f.exists():missing.append(n)
    elif sha(f)!=d:changed.append(n)
report['preservation']={'files':len(baseline['files']),'changed':changed,'missing':missing,'intentional_shared':baseline['intentional_shared']}
js="globalThis.location={search:''};const[a,b]=await Promise.all([import('./web/game-forms-catalog.js'),import('./web/showcase-catalog.js')]);console.log(JSON.stringify({forms:a.gameForms.length,entrances:b.directions.length,uniqueForms:new Set(a.gameForms.map(v=>v.id)).size,uniqueEntrances:new Set(b.directions.map(v=>v.id)).size,allFormsRouted:a.gameForms.every(v=>b.directionMap[v.play]),newCovers:b.newDirections.filter(v=>['bubble','sonar'].includes(v.id)).map(v=>v.cover)}));"
catalog=run([NODE,'--input-type=module','-e',js],P)
if catalog['exit_code']:raise RuntimeError(catalog['stderr'])
report['catalogs']=json.loads(catalog['stdout'])
files=['showcase-bubble.js','showcase-sonar.js','showcase-logic-kit.js']+baseline['intentional_shared']+[str(f.relative_to(P/'web')).replace('\\','/') for m in ['bubble','sonar'] for f in (P/f'web/assets/game-forms/{m}').rglob('*') if f.is_file()]
packaged=ROOT/'_site/projects/010-dumpling-style-lab'
report['packaged']={'targets':len(files),'mismatches':[n for n in files if not(packaged/n).is_file() or sha(P/'web'/n)!=sha(packaged/n)]}
report['previews']=previews
endpoints=['forms.html?left=bubble-shooter&right=mine-deduction','showcase.html?play=bubble','showcase.html?play=sonar','showcase-bubble.js','showcase-sonar.js','showcase-logic-kit.js']+[str(f.relative_to(P/'web')).replace('\\','/') for m in ['bubble','sonar'] for f in (P/f'web/assets/game-forms/{m}').glob('*.webp')]
report['local_http']=[]
for endpoint in endpoints:
    with urllib.request.urlopen('http://127.0.0.1:8962/'+endpoint,timeout=10) as r:report['local_http'].append({'path':endpoint,'status':r.status,'bytes':len(r.read())})
report['browser_qa']={'verified':False,'responsive_verified':False,'fullscreen_verified':False,'blocker':'CUA kernel fails before browser connection: windows sandbox failed, helper_unknown_error, setup refresh had errors. File commands recovered with approved ordinary terminal execution. No alternative browser automation used.','production_render_verified':report['production_render']['exit_code']==0}
report['passed']=all(report[k]['exit_code']==0 for k in commands) and report['build']['exit_code']==0 and not changed and not missing and not report['packaged']['mismatches'] and report['catalogs']['forms']==report['catalogs']['uniqueForms']==51 and report['catalogs']['entrances']==report['catalogs']['uniqueEntrances']==60 and report['catalogs']['allFormsRouted']
report['acceptance_complete']=report['passed'] and report['browser_qa']['verified']
report['counts']={'site':int(re.search(r'Ran (\d+) tests',report['site_tests']['stderr']).group(1)),'world':len(json.loads(report['world_regression']['stdout'])['checks'])}
for name in ['precision','observation','gesture']:report['counts'][name]=json.loads(report[name+'_regression']['stdout'])['passed']
report['counts']['new']=json.loads(report['new_rules']['stdout'])['passed']
report['counts']['build']=int(re.search(r'Built (\d+) static demo',report['build']['stdout']).group(1))
(P/'notes/logic-package-check-20261004.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['passed','acceptance_complete','catalogs','counts','preservation','packaged','browser_qa']},ensure_ascii=False,indent=2));sys.exit(0 if report['passed'] else 1)
