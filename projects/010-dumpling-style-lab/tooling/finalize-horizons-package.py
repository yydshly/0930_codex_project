from pathlib import Path
import concurrent.futures,subprocess,sys,json,hashlib,urllib.request
from PIL import Image
P=Path(__file__).resolve().parents[1];ROOT=P.parents[1];W=P/'web';NODE='C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe';IDS=['desktop','inkwell','atelier','submersible'];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(command,cwd=ROOT):
 r=subprocess.run(command,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace');return {'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
wrapper="import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';const write=fs.writeFileSync,notes=path.resolve(process.argv[2]);fs.writeFileSync=function(dest,...args){if(typeof dest==='string'&&path.resolve(dest).startsWith(notes+path.sep)&&fs.existsSync(dest))return;return write.call(this,dest,...args)};await import(pathToFileURL(process.argv[1]).href);"
def old(checker,vm=False):return [NODE]+(['--experimental-vm-modules'] if vm else [])+['--input-type=module','-e',wrapper,str(P/'tooling'/checker),str(P/'notes')]
commands={'site_tests':[sys.executable,'-m','unittest','discover','-s','tests','-p','test_site.py']}
for name,checker in [('world','check-world-rules.mjs'),('precision','check-precision-rules.mjs'),('observation','check-observation-rules.mjs'),('gesture','check-gesture-rules.mjs'),('logic','check-logic-rules.mjs'),('nine','check-nine-rules.mjs'),('frontier_rules','check-frontier-rules.mjs'),('frontier_lifecycle','check-frontier-lifecycle.mjs'),('studio_rules','check-studio-rules.mjs'),('studio_lifecycle','check-studio-lifecycle.mjs')]:commands[name+'_regression']=old(checker,name=='world')
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 tasks={k:pool.submit(run,v) for k,v in commands.items()};report={k:v.result() for k,v in tasks.items()}
report['rules']=json.loads((P/'notes/horizons-rule-checks-20261004.json').read_text(encoding='utf-8'));report['lifecycle']=json.loads((P/'notes/horizons-lifecycle-checks-20261004.json').read_text(encoding='utf-8'));frames=json.loads((P/'notes/horizons-production-frames-20261004.json').read_text(encoding='utf-8'))
report['production_render']={'frames':len(frames['frames']),'all_phases':{(v['id'],v['phase']) for v in frames['frames']}=={(id,phase) for id in IDS for phase in ['initial','progress','complete']},'pause_state_unchanged':all(v['pausedStateUnchanged'] for v in frames['frames']),'method':frames['method']}
previews=[]
for id in IDS:
 source=P/f'assets/game-forms/horizons-qa/{id}-progress.png';target=W/f'assets/game-forms/horizons/previews/{id}.webp'
 with Image.open(source) as im:im.save(target,format='WEBP',quality=94,method=6)
 method='Native interface-state drawing; HTML windows are not browser screenshots.' if id=='desktop' else 'Actual THREE meshes and camera through software projection.' if id=='atelier' else 'Production Canvas2D draw through Skia.'
 previews.append({'id':id,'source':source.relative_to(P).as_posix(),'source_sha256':sha(source),'runtime':target.relative_to(P).as_posix(),'runtime_sha256':sha(target),'method':method,'not_a_browser_screenshot':True})
(P/'notes/horizons-preview-provenance-20261004.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2),encoding='utf-8')
report['build']=run([sys.executable,str(ROOT/'scripts/build_site.py')])
baseline=json.loads((P/'notes/horizons-preservation-before-20261004.json').read_text(encoding='utf-8'));changed=[];missing=[]
for file,digest in baseline['files'].items():
 f=W/file
 if not f.exists():missing.append(file)
 elif sha(f)!=digest:changed.append(file)
report['preservation']={'protected':len(baseline['files']),'changed':changed,'missing':missing,'editable_shared':baseline['editable_shared'],'old_storage':'No browser storage read, cleared or migrated. Prior IDs, edition routes and storage prefixes are compared against the baseline.'}
catalog=run([NODE,str(P/'tooling/check-horizons-catalogs.mjs')]);assert catalog['exit_code']==0,catalog;report['catalogs']=json.loads(catalog['stdout'])
files=['showcase-horizons.js','showcase-horizons-rules.js','showcase-horizons-panel.js','showcase-horizons-3d.js']+baseline['editable_shared']+[f.relative_to(W).as_posix() for f in (W/'assets/game-forms/horizons').rglob('*') if f.is_file()]
packaged=ROOT/'_site/projects/010-dumpling-style-lab';report['packaged']={'targets':len(files),'mismatches':[name for name in files if not (packaged/name).exists() or sha(W/name)!=sha(packaged/name)]}
report['http']=[]
endpoints=['forms.html?left=desktop-investigation&right=parser-adventure','forms.html?left=voxel-sculpture&right=vehicle-stations']+['showcase.html?play='+id for id in IDS]+files
for endpoint in endpoints:
 try:
  with urllib.request.urlopen('http://127.0.0.1:8962/'+endpoint,timeout=4) as r:
   data=r.read();expected=W/endpoint.split('?')[0];report['http'].append({'path':endpoint,'status':r.status,'bytes':len(data),'served_matches_workspace':hashlib.sha256(data).hexdigest()==sha(expected)})
 except Exception as e:report['http'].append({'path':endpoint,'status':0,'error':str(e)})
try:
 with urllib.request.urlopen('http://127.0.0.1:8963/health',timeout=3) as r:report['companion_service']=json.loads(r.read())
except Exception as e:report['companion_service']={'error':str(e)}
report['syntax_errors']=[]
for f in files:
 if f.endswith('.js'):
  result=run([NODE,'--check',str(W/f)])
  if result['exit_code']:report['syntax_errors'].append({'file':f,**result})
report['browser_qa']={'verified':False,'responsive_fullscreen_native_input_storage_webgl_verified':False,'attempts':['Fresh js_reset succeeded','cua.getState failed before browser connection: trusted Node process exited unexpectedly; kernel reset, rerun your request'],'blocker':'Browser control kernel exits before returning browser state. No alternate browser automation used.'}
report['new_checks']=report['rules']['count']+report['lifecycle']['count'];c=report['catalogs']
report['passed']=all(report[k]['exit_code']==0 for k in commands) and report['build']['exit_code']==0 and report['rules']['passed'] and report['lifecycle']['passed'] and report['production_render']['all_phases'] and report['production_render']['pause_state_unchanged'] and not changed and not missing and not report['packaged']['mismatches'] and not report['syntax_errors'] and c['forms']==c['uniqueForms']==79 and c['entrances']==c['uniqueEntrances']==88 and c['allFormsRouted'] and not c['changedPreviousForms'] and not c['changedPreviousEntrances'] and c['storagePrefixesPreserved'] and all(v['status']==200 and v['served_matches_workspace'] for v in report['http']) and report['companion_service'].get('service')=='frontier-room'
report['acceptance_complete']=False
(P/'notes/horizons-package-check-20261004.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['passed','new_checks','catalogs','preservation','packaged','production_render']},ensure_ascii=False,indent=2))
for k in commands:
 if report[k]['exit_code']:print(k,report[k]['stdout'],report[k]['stderr'])
raise SystemExit(0 if report['passed'] else 1)
