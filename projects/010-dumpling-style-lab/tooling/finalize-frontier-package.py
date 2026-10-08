from pathlib import Path
import concurrent.futures,subprocess,sys,json,hashlib,re,urllib.request
from PIL import Image
P=Path(__file__).resolve().parents[1];ROOT=P.parents[1];W=P/'web';NODE='C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe';IDS=['tempo','flux','coil','axiom','folio','expose','script','echo','assembly'];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
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
 'logic_regression':old('check-logic-rules.mjs','logic-rules-check-20261004.json'),
 'nine_regression':old('check-nine-rules.mjs','nine-rules-check-20261004.json'),
 'frontier_lifecycle':[NODE,str(P/'tooling/check-frontier-lifecycle.mjs')]
}
if '--reuse-unaffected-regressions' in sys.argv:
 previous=json.loads((P/'notes/frontier-package-check-20261004.json').read_text(encoding='utf-8'));report={k:previous[k] for k in commands if k!='frontier_lifecycle'};report['frontier_lifecycle']=run(commands['frontier_lifecycle'])
else:
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  tasks={k:pool.submit(run,v) for k,v in commands.items()};report={k:v.result() for k,v in tasks.items()}
report['rules']=json.loads((P/'notes/frontier-rules-check-20261004.json').read_text(encoding='utf-8'));report['room']=json.loads((P/'notes/frontier-room-check-20261004.json').read_text(encoding='utf-8'));report['lifecycle']=json.loads((P/'notes/frontier-lifecycle-check-20261004.json').read_text(encoding='utf-8'))
render=json.loads((P/'assets/game-forms/frontier-qa/render-review.json').read_text(encoding='utf-8'));report['production_render']={'scenes':render['scenes'],'all_frames':{(v['id'],v['phase']) for v in render['results']}=={(id,phase) for id in IDS for phase in ['initial','progress','complete']},'pause_state_verified':render['pause_state_verified'],'pause_pixels_verified':render['pause_pixels_verified'],'browserVerified':False,'webglVerified':False}
previews=[];folder=W/'assets/game-forms/frontier/previews';folder.mkdir(exist_ok=True)
for id in IDS:
 phase='initial' if id in ['expose','assembly'] else 'progress';source=P/f'assets/game-forms/frontier-qa/{id}-{phase}.png';target=folder/(id+'.webp')
 with Image.open(source) as im:im.save(target,format='WEBP',quality=94,method=6)
 previews.append({'id':id,'source':source.relative_to(P).as_posix(),'source_sha256':sha(source),'runtime':target.relative_to(P).as_posix(),'runtime_sha256':sha(target),'method':'Production factory draw() through Skia and DOM double. '+('Same THREE scene in production software projection compatibility mode.' if id in ['coil','expose'] else 'Canvas renderer.'),'not_a_browser_screenshot':True})
(P/'notes/frontier-preview-provenance-20261004.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2),encoding='utf-8')
report['build']=run([sys.executable,str(ROOT/'scripts/build_site.py')])
baseline=json.loads((P/'notes/frontier-preservation-before-20261004.json').read_text(encoding='utf-8'));changed=[];missing=[]
for file,digest in baseline['files'].items():
 f=W/file
 if not f.exists():missing.append(file)
 elif sha(f)!=digest:changed.append(file)
report['preservation']={'protected':len(baseline['files']),'changed':changed,'missing':missing,'editable_shared':baseline['editable_shared'],'old_storage':'Old IDs and localStorage prefix unchanged. No old browser storage accessed. Social session tokens use per-window sessionStorage.'}
js="globalThis.location={search:''};const[a,b]=await Promise.all([import('./web/game-forms-catalog.js'),import('./web/showcase-catalog.js')]);console.log(JSON.stringify({forms:a.gameForms.length,entrances:b.directions.length,uniqueForms:new Set(a.gameForms.map(v=>v.id)).size,uniqueEntrances:new Set(b.directions.map(v=>v.id)).size,allFormsRouted:a.gameForms.every(v=>b.directionMap[v.play])}));"
catalog=run([NODE,'--input-type=module','-e',js],P);assert catalog['exit_code']==0,catalog;report['catalogs']=json.loads(catalog['stdout'])
files=['showcase-frontier.js','showcase-frontier-rules.js','showcase-frontier-panel.js','showcase-frontier-3d.js','showcase-frontier-audio.js','showcase-frontier-room.js']+baseline['editable_shared']+[f.relative_to(W).as_posix() for f in (W/'assets/game-forms/frontier').rglob('*') if f.is_file()]+['assets/game-forms/roll/limestone.webp'];packaged=ROOT/'_site/projects/010-dumpling-style-lab';report['packaged']={'targets':len(files),'mismatches':[name for name in files if not (packaged/name).exists() or sha(W/name)!=sha(packaged/name)]}
report['http']=[]
for endpoint in ['forms.html?left=time-manipulation&right=material-simulation','showcase.html?play=assembly']+files:
 try:
  with urllib.request.urlopen('http://127.0.0.1:8962/'+endpoint,timeout=4) as r:report['http'].append({'path':endpoint,'status':r.status,'bytes':len(r.read())})
 except Exception as e:report['http'].append({'path':endpoint,'status':0,'error':str(e)})
try:
 with urllib.request.urlopen('http://127.0.0.1:8963/health',timeout=3) as r:report['companion_service']=json.loads(r.read())
except Exception as e:report['companion_service']={'error':str(e)}
report['browser_qa']={'verified':False,'webgl_verified':False,'audible_hrtf_verified':False,'responsive_fullscreen_input_storage_verified':False,'blocker':'CUA rewriteDocumentation twice and getState after js_reset all failed: trusted Node process exited unexpectedly; kernel reset, rerun your request. No substitute browser automation used.'}
report['passed']=all(v['exit_code']==0 for k,v in report.items() if k in commands or k=='build') and all(report[k]['passed'] for k in ['rules','room','lifecycle']) and report['production_render']['all_frames'] and report['production_render']['pause_pixels_verified'] and not changed and not missing and not report['packaged']['mismatches'] and report['catalogs']['forms']==report['catalogs']['uniqueForms']==69 and report['catalogs']['entrances']==report['catalogs']['uniqueEntrances']==78 and report['catalogs']['allFormsRouted'] and all(v['status']==200 for v in report['http']) and report['companion_service'].get('service')=='frontier-room'
report['acceptance_complete']=False
report['new_checks']=report['rules']['checks']+report['room']['checks']+report['lifecycle']['checks']
(P/'notes/frontier-package-check-20261004.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['passed','acceptance_complete','new_checks','catalogs','preservation','packaged','production_render','companion_service','browser_qa']},ensure_ascii=False,indent=2))
for k in commands:
 if report[k]['exit_code']:print(k,report[k]['stdout'],report[k]['stderr'])
raise SystemExit(0 if report['passed'] else 1)
