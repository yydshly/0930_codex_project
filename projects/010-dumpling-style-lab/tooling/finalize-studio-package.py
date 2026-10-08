from pathlib import Path
import concurrent.futures,subprocess,sys,json,hashlib,urllib.request
from PIL import Image
P=Path(__file__).resolve().parents[1];ROOT=P.parents[1];W=P/'web';NODE='C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe';IDS=['mosaic','span','lumen','sonata','afterimage','weave'];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(command,cwd=ROOT):
 r=subprocess.run(command,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace');return {'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
wrapper="import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';const write=fs.writeFileSync,notes=path.resolve(process.argv[2]);fs.writeFileSync=function(dest,...args){if(typeof dest==='string'&&path.resolve(dest).startsWith(notes+path.sep)&&fs.existsSync(dest))return;return write.call(this,dest,...args)};await import(pathToFileURL(process.argv[1]).href);"
def old(checker,vm=False):return [NODE]+(['--experimental-vm-modules'] if vm else [])+['--input-type=module','-e',wrapper,str(P/'tooling'/checker),str(P/'notes')]
commands={'site_tests':[sys.executable,'-m','unittest','discover','-s','tests','-p','test_site.py']}
for name,checker in [('world','check-world-rules.mjs'),('precision','check-precision-rules.mjs'),('observation','check-observation-rules.mjs'),('gesture','check-gesture-rules.mjs'),('logic','check-logic-rules.mjs'),('nine','check-nine-rules.mjs'),('frontier_rules','check-frontier-rules.mjs'),('frontier_lifecycle','check-frontier-lifecycle.mjs')]:commands[name+'_regression']=old(checker,name=='world')
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 tasks={k:pool.submit(run,v) for k,v in commands.items()};report={k:v.result() for k,v in tasks.items()}
report['rules']=json.loads((P/'notes/studio-rules-check-20261004.json').read_text(encoding='utf-8'));report['lifecycle']=json.loads((P/'notes/studio-lifecycle-check-20261004.json').read_text(encoding='utf-8'));frames=json.loads((P/'notes/studio-production-frames-20261004.json').read_text(encoding='utf-8'));report['production_render']={'frames':len(frames['frames']),'all_phases':{(v['id'],v['phase']) for v in frames['frames']}=={(id,phase) for id in IDS for phase in ['initial','progress','complete']},'pause_pixels_unchanged':all(v['pausedPixelsUnchanged'] for v in frames['frames']),'method':frames['method']}
previews=[];folder=W/'assets/game-forms/studio/previews';folder.mkdir(exist_ok=True)
for id in IDS:
 source=P/f'assets/game-forms/studio-qa/{id}-progress.png';target=folder/(id+'.webp')
 with Image.open(source) as im:im.save(target,format='WEBP',quality=94,method=6)
 previews.append({'id':id,'source':source.relative_to(P).as_posix(),'source_sha256':sha(source),'runtime':target.relative_to(P).as_posix(),'runtime_sha256':sha(target),'method':'Production createStudio factory draw(), Canvas2D through Skia and DOM lifecycle double.','not_a_browser_screenshot':True})
(P/'notes/studio-preview-provenance-20261004.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2),encoding='utf-8')
report['build']=run([sys.executable,str(ROOT/'scripts/build_site.py')])
baseline=json.loads((P/'notes/studio-preservation-before-20261004.json').read_text(encoding='utf-8'));changed=[];missing=[]
for file,digest in baseline['files'].items():
 f=W/file
 if not f.exists():missing.append(file)
 elif sha(f)!=digest:changed.append(file)
report['preservation']={'protected':len(baseline['files']),'changed':changed,'missing':missing,'editable_shared':baseline['editable_shared'],'old_storage':'Old IDs, edition routes, and localStorage prefixes unchanged. No existing browser storage accessed.'}
js="globalThis.location={search:''};const[a,b]=await Promise.all([import('./web/game-forms-catalog.js'),import('./web/showcase-catalog.js')]);console.log(JSON.stringify({forms:a.gameForms.length,entrances:b.directions.length,uniqueForms:new Set(a.gameForms.map(v=>v.id)).size,uniqueEntrances:new Set(b.directions.map(v=>v.id)).size,allFormsRouted:a.gameForms.every(v=>b.directionMap[v.play]),newForms:a.gameForms.filter(v=>"+json.dumps(IDS)+".includes(v.play)).map(v=>({id:v.id,play:v.play}))}));"
catalog=run([NODE,'--input-type=module','-e',js],P);assert catalog['exit_code']==0,catalog;report['catalogs']=json.loads(catalog['stdout'])
files=['showcase-studio.js','showcase-studio-rules.js','showcase-studio-panel.js','showcase-studio-audio.js','showcase-studio-atlas.js']+baseline['editable_shared']+[f.relative_to(W).as_posix() for f in (W/'assets/game-forms/studio').rglob('*') if f.is_file()]
packaged=ROOT/'_site/projects/010-dumpling-style-lab';report['packaged']={'targets':len(files),'mismatches':[name for name in files if not (packaged/name).exists() or sha(W/name)!=sha(packaged/name)]}
report['http']=[]
endpoints=['forms.html?left=jigsaw-puzzle&right=bridge-building','forms.html?left=light-reflection&right=music-composition','forms.html?left=action-replay&right=nonogram']+['showcase.html?play='+id for id in IDS]+files
for endpoint in endpoints:
 try:
  with urllib.request.urlopen('http://127.0.0.1:8962/'+endpoint,timeout=4) as r:report['http'].append({'path':endpoint,'status':r.status,'bytes':len(r.read())})
 except Exception as e:report['http'].append({'path':endpoint,'status':0,'error':str(e)})
try:
 with urllib.request.urlopen('http://127.0.0.1:8963/health',timeout=3) as r:report['companion_service']=json.loads(r.read())
except Exception as e:report['companion_service']={'error':str(e)}
for f in files:
 if f.endswith('.js'):
  result=run([NODE,'--check',str(W/f)])
  if result['exit_code']:report['syntax_error']={'file':f,**result}
report['browser_qa']={'verified':False,'audible_output_verified':False,'responsive_fullscreen_input_storage_verified':False,'blocker':'CUA rewriteDocumentation failed before connecting: windows sandbox failed: helper_unknown_error: setup refresh had errors; node_repl kernel exited unexpectedly. No substitute browser automation used.'}
report['new_checks']=report['rules']['count']+report['lifecycle']['count']
report['passed']=all(report[k]['exit_code']==0 for k in commands) and report['build']['exit_code']==0 and report['rules']['passed'] and report['lifecycle']['passed'] and report['production_render']['all_phases'] and report['production_render']['pause_pixels_unchanged'] and not changed and not missing and not report['packaged']['mismatches'] and 'syntax_error' not in report and report['catalogs']['forms']==report['catalogs']['uniqueForms']==75 and report['catalogs']['entrances']==report['catalogs']['uniqueEntrances']==84 and report['catalogs']['allFormsRouted'] and all(v['status']==200 for v in report['http']) and report['companion_service'].get('service')=='frontier-room'
report['acceptance_complete']=False
(P/'notes/studio-package-check-20261004.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['passed','new_checks','catalogs','preservation','packaged','production_render']},ensure_ascii=False,indent=2))
for k in commands:
 if report[k]['exit_code']:print(k,report[k]['stdout'],report[k]['stderr'])
raise SystemExit(0 if report['passed'] else 1)
