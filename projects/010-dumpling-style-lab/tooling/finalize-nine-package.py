import concurrent.futures,hashlib,json,re,subprocess,sys,urllib.request
from pathlib import Path
from PIL import Image
P=Path(__file__).resolve().parents[1];ROOT=P.parents[1]
NODE='C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
IDS=['hook','fold','repair','delve','cluster','paint','swarm','kitchen','relay']
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
 'logic_regression':old('check-logic-rules.mjs','logic-rules-check-20261004.json')
}
with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:
 tasks={k:pool.submit(run,v) for k,v in commands.items()};report={k:v.result() for k,v in tasks.items()}
new_checks=json.loads((P/'notes/nine-rules-check-20261004.json').read_text(encoding='utf-8'));assert all(v['passed'] for v in new_checks['checks']);report['new_rules']={'exit_code':0,'stdout':json.dumps(new_checks),'stderr':'','method':'Latest completed checker result; no duplicate run after passing.'}
render=json.loads((P/'assets/game-forms/nine-qa/render-review.json').read_text(encoding='utf-8'))
report['production_render']={'scenes':render['scenes'],'all_nine_initial_progress_complete':render['scenes']==27 and {(v['id'],v['frame']) for v in render['results']}=={(m,f) for m in IDS for f in ['initial','progress','complete']},'pause_state_and_pixels':render['pause_state_and_pixels_verified'],'browser_screenshot':False}
previews=[];(P/'web/assets/game-forms/nine/previews').mkdir(parents=True,exist_ok=True)
for name in IDS:
 frame='initial' if name in ['relay'] else 'progress';source=P/f'assets/game-forms/nine-qa/{name}-{frame}.png';target=P/f'web/assets/game-forms/nine/previews/{name}.webp'
 with Image.open(source) as im:im.save(target,format='WEBP',quality=94,method=6);size=list(im.size)
 previews.append({'id':name,'source':str(source.relative_to(P)).replace('\\','/'),'source_sha256':sha(source),'target':str(target.relative_to(P)).replace('\\','/'),'target_sha256':sha(target),'dimensions':size,'method':'Actual production createNine().draw() through Skia canvas and DOM lifecycle double; WebP encoding only. Not a browser screenshot.'})
(P/'notes/nine-preview-provenance-20261004.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2),encoding='utf-8')
(P/'web/assets/game-forms/nine/ATTRIBUTION.md').write_text('九款原创场景与两套物件图集通过内置 ImageGen 制作；11 份原始 PNG、完整提示词、哈希见项目 assets/game-forms/nine-generation-20261004.json。运行素材保持原尺寸与透明通道。错视桥面复用已有原创 roll/limestone.webp 材质，不修改源文件，其出处见 roll/ATTRIBUTION.md。九款 preview 为实际生产工厂 draw() 的 Skia 画布输出，来源见 notes/nine-preview-provenance-20261004.json；不是浏览器截图。\n',encoding='utf-8')
report['build']=run([sys.executable,str(ROOT/'scripts/build_site.py')])
baseline=json.loads((P/'notes/nine-preservation-before-20261004.json').read_text(encoding='utf-8'));changed=[];missing=[]
for name,digest in baseline['files'].items():
 f=P/'web'/name
 if not f.exists():missing.append(name)
 elif sha(f)!=digest:changed.append(name)
report['preservation']={'files':len(baseline['files']),'changed':changed,'missing':missing,'intentional_shared':baseline['intentional_shared'],'save_migration':'No browser storage accessed. Old save prefix and old route IDs unchanged; new games use their own IDs.'}
js="globalThis.location={search:''};const[a,b]=await Promise.all([import('./web/game-forms-catalog.js'),import('./web/showcase-catalog.js')]);console.log(JSON.stringify({forms:a.gameForms.length,entrances:b.directions.length,uniqueForms:new Set(a.gameForms.map(v=>v.id)).size,uniqueEntrances:new Set(b.directions.map(v=>v.id)).size,allFormsRouted:a.gameForms.every(v=>b.directionMap[v.play]),newCovers:b.newDirections.filter(v=>['hook','fold','repair','delve','cluster','paint','swarm','kitchen','relay'].includes(v.id)).map(v=>({id:v.id,cover:v.cover}))}));"
catalog=run([NODE,'--input-type=module','-e',js],P);assert catalog['exit_code']==0,catalog['stderr'];report['catalogs']=json.loads(catalog['stdout'])
files=['showcase-nine.js','showcase-nine-rules.js']+baseline['intentional_shared']+[str(f.relative_to(P/'web')).replace('\\','/') for f in (P/'web/assets/game-forms/nine').rglob('*') if f.is_file()]+['assets/game-forms/roll/limestone.webp']
packaged=ROOT/'_site/projects/010-dumpling-style-lab';report['packaged']={'targets':len(files),'mismatches':[name for name in files if not(packaged/name).is_file() or sha(P/'web'/name)!=sha(packaged/name)]};report['previews']=previews
endpoints=['forms.html?left=grappling&right=perspective-illusion','showcase.html?play=hook','showcase-nine.js','showcase-nine-rules.js']+[str(f.relative_to(P/'web')).replace('\\','/') for f in (P/'web/assets/game-forms/nine').rglob('*.webp')]+['assets/game-forms/roll/limestone.webp'];report['local_http']=[]
for endpoint in endpoints:
 try:
  with urllib.request.urlopen('http://127.0.0.1:8962/'+endpoint,timeout=10) as r:report['local_http'].append({'path':endpoint,'status':r.status,'bytes':len(r.read())})
 except Exception as e:report['local_http'].append({'path':endpoint,'status':0,'error':str(e)})
report['browser_qa']={'verified':False,'responsive_verified':False,'fullscreen_verified':False,'keyboard_pointer_focus_verified':False,'browser_storage_verified':False,'blocker':'CUA rewriteDocumentation retry fails at kernel initialization: windows sandbox failed, helper_unknown_error, setup refresh had errors. No alternative browser automation used.','earlier_auto_review':'Initial getState was rejected for missing rewriteDocumentation precondition. The required rewriteDocumentation call was attempted and then the kernel failed before connection.'}
report['passed']=all(report[k]['exit_code']==0 for k in commands) and report['build']['exit_code']==0 and report['production_render']['all_nine_initial_progress_complete'] and report['production_render']['pause_state_and_pixels'] and not changed and not missing and not report['packaged']['mismatches'] and report['catalogs']['forms']==report['catalogs']['uniqueForms']==60 and report['catalogs']['entrances']==report['catalogs']['uniqueEntrances']==69 and report['catalogs']['allFormsRouted'] and all(v['status']==200 for v in report['local_http'])
report['acceptance_complete']=report['passed'] and report['browser_qa']['verified']
report['counts']={'site':int(re.search(r'Ran (\d+) tests',report['site_tests']['stderr']).group(1)),'world':len(json.loads(report['world_regression']['stdout'])['checks'])}
for name in ['precision','observation','gesture','logic']:report['counts'][name]=json.loads(report[name+'_regression']['stdout'])['passed']
report['counts']['new']=json.loads(report['new_rules']['stdout'])['passed'];report['counts']['build']=int(re.search(r'Built (\d+) static demo',report['build']['stdout']).group(1))
(P/'notes/nine-package-check-20261004.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['passed','acceptance_complete','catalogs','counts','preservation','packaged','production_render','browser_qa']},ensure_ascii=False,indent=2));sys.exit(0 if report['passed'] else 1)
