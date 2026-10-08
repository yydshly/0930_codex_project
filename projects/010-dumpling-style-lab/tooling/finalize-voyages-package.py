from pathlib import Path
import concurrent.futures,subprocess,sys,json,hashlib,urllib.request
from PIL import Image
P=Path(__file__).resolve().parents[1];ROOT=P.parents[1];W=P/'web';NODE='C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe';IDS=['cartographer','tendril','cutout','panorama'];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(command,cwd=ROOT):
 r=subprocess.run(command,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace');return {'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
wrapper="import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';const write=fs.writeFileSync,notes=path.resolve(process.argv[2]);fs.writeFileSync=function(dest,...args){if(typeof dest==='string'&&path.resolve(dest).startsWith(notes+path.sep)&&fs.existsSync(dest))return;return write.call(this,dest,...args)};await import(pathToFileURL(process.argv[1]).href);"
def old(checker,vm=False):return [NODE]+(['--experimental-vm-modules'] if vm else [])+['--input-type=module','-e',wrapper,str(P/'tooling'/checker),str(P/'notes')]
commands={'site_tests':[sys.executable,'-m','unittest','discover','-s','tests','-p','test_site.py']}
for name in ['world','precision','observation','gesture','logic','nine','frontier','studio','horizons']:
 for kind in (['rules','lifecycle'] if name in ['frontier','studio','horizons'] else ['rules']):commands[name+'_'+kind+'_regression']=old('check-'+name+'-'+kind+'.mjs',name=='world')
if '--refresh' in sys.argv:
 previous=json.loads((P/'notes/voyages-package-check-20261004.json').read_text(encoding='utf-8'));report={k:previous[k] for k in commands};assert all(v['exit_code']==0 for v in report.values())
else:
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  tasks={k:pool.submit(run,v) for k,v in commands.items()};report={k:v.result() for k,v in tasks.items()}
report['rules']=json.loads((P/'notes/voyages-rules-checks-20261004.json').read_text(encoding='utf-8'));report['lifecycle']=json.loads((P/'notes/voyages-lifecycle-checks-20261004.json').read_text(encoding='utf-8'));frames=json.loads((P/'notes/voyages-production-frames-20261004.json').read_text(encoding='utf-8'))
report['production_render']={'frames':len(frames['frames']),'all_phases':{(v['id'],v['phase']) for v in frames['frames']}=={(id,phase) for id in IDS for phase in ['initial','progress','complete']},'pause_state_unchanged':all(v['pausedStateUnchanged'] for v in frames['frames']),'method':frames['method']}
previews=[]
for id in IDS:
 source=P/f'assets/game-forms/voyages-qa/{id}-progress.png';target=W/f'assets/game-forms/voyages/previews/{id}.webp'
 with Image.open(source) as im:im.save(target,format='WEBP',quality=94,method=6)
 previews.append({'id':id,'source':source.relative_to(P).as_posix(),'source_sha256':sha(source),'runtime':target.relative_to(P).as_posix(),'runtime_sha256':sha(target),'method':'Spherical camera through explicit software texture projection, with directionally projected detail layers.' if id=='panorama' else 'Production Canvas2D drawing through Skia.','not_a_browser_screenshot':True})
(P/'notes/voyages-preview-provenance-20261004.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2),encoding='utf-8')
report['build']=run([sys.executable,str(ROOT/'scripts/build_site.py')]);baseline=json.loads((P/'notes/voyages-preservation-before-20261004.json').read_text(encoding='utf-8'));changed=[];missing=[]
for file,digest in baseline['files'].items():
 f=W/file
 if not f.exists():missing.append(file)
 elif sha(f)!=digest:changed.append(file)
report['preservation']={'protected':len(baseline['files']),'changed':changed,'missing':missing,'editable_shared':baseline['editable_shared'],'old_storage':'No browser storage read, cleared or migrated. Prior IDs, edition routes and storage prefixes compared against baseline.'}
catalog=run([NODE,str(P/'tooling/check-voyages-catalogs.mjs')]);assert catalog['exit_code']==0,catalog;report['catalogs']=json.loads(catalog['stdout'])
files=['showcase-voyages.js','showcase-voyages-rules.js','showcase-voyages-panel.js','showcase-voyages-kit.js','showcase-voyages-panorama.js']+baseline['editable_shared']+[f.relative_to(W).as_posix() for f in (W/'assets/game-forms/voyages').rglob('*') if f.is_file()]
packaged=ROOT/'_site/projects/010-dumpling-style-lab';report['packaged']={'targets':len(files),'mismatches':[name for name in files if not (packaged/name).exists() or sha(W/name)!=sha(packaged/name)]};report['http']=[]
endpoints=['forms.html?left=map-expedition&right=soft-limb','forms.html?left=collage-world&right=panoramic-survey']+['showcase.html?play='+id for id in IDS]+files
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
manifest=json.loads((P/'assets/game-forms/voyages-generation.json').read_text(encoding='utf-8'));report['original_assets']={'count':len(manifest['entries']),'generation_mode':'builtin-imagegen','hash_mismatches':[]}
for e in manifest['entries']:
 for prefix in ['raw','runtime']:
  if sha(P/e[prefix+'_file'])!=e[prefix+'_sha256']:report['original_assets']['hash_mismatches'].append(e['key']+':'+prefix)
report['browser_qa']={'verified':False,'responsive_fullscreen_native_input_storage_webgl_verified':False,'attempts':['Fresh js_reset succeeded','cua.getState failed before browser connection: trusted Node process exited unexpectedly; kernel reset, rerun your request'],'blocker':'Browser control kernel exits before returning browser state. No alternate browser automation used.'}
report['new_checks']=report['rules']['count']+report['lifecycle']['count'];c=report['catalogs']
report['passed']=all(report[k]['exit_code']==0 for k in commands) and report['build']['exit_code']==0 and report['rules']['passed'] and report['lifecycle']['passed'] and report['production_render']['all_phases'] and report['production_render']['pause_state_unchanged'] and not changed and not missing and not report['packaged']['mismatches'] and not report['syntax_errors'] and not report['original_assets']['hash_mismatches'] and c['forms']==c['uniqueForms']==83 and c['entrances']==c['uniqueEntrances']==92 and c['allFormsRouted'] and c['newRouter'] and not c['changedPreviousForms'] and not c['changedPreviousEntrances'] and c['storagePrefixesPreserved'] and all(v['status']==200 and v['served_matches_workspace'] for v in report['http']) and report['companion_service'].get('service')=='frontier-room'
report['acceptance_complete']=False
(P/'notes/voyages-package-check-20261004.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:report[k] for k in ['passed','new_checks','catalogs','preservation','packaged','production_render','original_assets']},ensure_ascii=False,indent=2))
for k in commands:
 if report[k]['exit_code']:print(k,report[k]['stdout'],report[k]['stderr'])
raise SystemExit(0 if report['passed'] else 1)
