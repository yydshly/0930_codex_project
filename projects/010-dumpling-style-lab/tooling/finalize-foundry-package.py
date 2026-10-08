from pathlib import Path
import subprocess,sys,json,hashlib,urllib.request,concurrent.futures,struct
from PIL import Image
P=Path(__file__).resolve().parents[1];ROOT=P.parents[1];W=P/'web';NODE='C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe';IDS=['rigworks','drift','levelsmith'];sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
def run(command,cwd=ROOT):
 r=subprocess.run(command,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace');return {'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
wrapper="""import fs from'node:fs';import path from'node:path';import{pathToFileURL,fileURLToPath}from'node:url';const write=fs.writeFileSync,notes=path.resolve(process.argv[2]);fs.writeFileSync=function(dest,...args){const local=dest instanceof URL?fileURLToPath(dest):dest;if(typeof local==='string'&&path.resolve(local).startsWith(notes+path.sep)&&fs.existsSync(local))return;return write.call(this,dest,...args)};await import(pathToFileURL(process.argv[1]).href);"""
def old(checker,vm=False):return [NODE]+(['--experimental-vm-modules'] if vm else [])+['--input-type=module','-e',wrapper,str(P/'tooling'/checker),str(P/'notes')]
commands={'site_tests':[sys.executable,'-m','unittest','discover','-s','tests','-p','test_site.py']}
for name in ['world','precision','observation','gesture','logic','nine','frontier','studio','horizons','voyages','kinetics','thresholds','circuitry','parlor','trajectories']:
 for kind in (['rules','lifecycle'] if name in ['frontier','studio','horizons','voyages','kinetics','thresholds','circuitry','parlor','trajectories'] else ['rules']):commands[name+'_'+kind]=old('check-'+name+'-'+kind+'.mjs',name=='world')
target=P/'notes/foundry-package-check-20261004.json'
if '--refresh' in sys.argv:
 previous=json.loads(target.read_text(encoding='utf-8'));report={k:previous[k] for k in commands};assert all(v['exit_code']==0 for v in report.values());report['site_tests']=run(commands['site_tests'])
else:
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  pending={k:pool.submit(run,v) for k,v in commands.items()};report={k:v.result() for k,v in pending.items()}
report['new_rules']=json.loads((P/'notes/foundry-rules-checks-20261004.json').read_text(encoding='utf-8'));report['new_lifecycle']=json.loads((P/'notes/foundry-lifecycle-checks-20261004.json').read_text(encoding='utf-8'));report['default_templates']=run([NODE,str(P/'tooling/check-maker-templates.mjs')]);report['scene_geometry']=json.loads((P/'notes/foundry-scene-checks-20261004.json').read_text(encoding='utf-8'))
previews=[]
for id in IDS:
 phase='progress' if id=='levelsmith' else 'initial';source=P/f'assets/game-forms/foundry-qa/{id}-{phase}.png';out=W/f'assets/game-forms/foundry/previews/{id}.webp';out.parent.mkdir(exist_ok=True);Image.open(source).save(out,quality=94,method=6)
 previews.append({'id':id,'source':source.relative_to(P).as_posix(),'source_sha256':sha(source),'runtime':out.relative_to(P).as_posix(),'runtime_sha256':sha(out),'method':'Actual production Canvas via Skia' if id=='levelsmith' else 'Production scene models/cameras, independent depth-buffered diagnostic projection; approximated lighting and overlay','not_a_browser_screenshot':True})
(P/'notes/foundry-preview-provenance-20261004.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2),encoding='utf-8')
manifest_path=P/'assets/game-forms/foundry-generation.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
model_paths=['assets/game-forms/foundry/'+n+'.glb' for n in ['rover','machine_generatorLarge','corridor_detailed','hangar_largeB','pitsGarage','pylon','lightPostModern']]+['assets/game-forms/pilot/'+n+'.glb' for n in ['craft_speederA','satelliteDish','meteor_detailed']]+['assets/showcase/blaster/crate-medium.glb']
manifest['used_authored_models']=[{'runtime':'web/'+v,'sha256':sha(W/v),'license':'Kenney CC0, original license retained with each source pack'} for v in model_paths];manifest['preview_methods']=previews;manifest['detail_geometry']='Smooth tire/rim/tread geometry; authored palette textures retained on original model surfaces; generated alloy texture applied to added chassis, load bed and workshop plates. GLB originals unchanged.';manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
report['assets']={'images':len(manifest['images']),'authored_models_used':len(model_paths),'mode':manifest['mode'],'hash_mismatches':[]}
for asset in manifest['images']:
 for key,digest in [('source_png','source_sha256'),('runtime_webp','runtime_sha256')]:
  if sha(P/asset[key])!=asset[digest]:report['assets']['hash_mismatches'].append(asset['key']+':'+key)
report['glb_external_dependencies']=[]
for name in model_paths:
 f=W/name;b=f.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n])
 for im in j.get('images',[]):
  if 'uri' in im and not im['uri'].startswith('data:'):
   dependency=f.parent/im['uri'];report['glb_external_dependencies'].append({'path':dependency.relative_to(W).as_posix(),'exists':dependency.exists()})
report['build']=run([sys.executable,str(ROOT/'scripts/build_site.py')]);baseline=json.loads((P/'notes/foundry-preservation-before-20261004.json').read_text(encoding='utf-8'));changed=[];missing=[]
for name,digest in baseline['files'].items():
 f=W/name
 if not f.exists():missing.append(name)
 elif sha(f)!=digest:changed.append(name)
report['preservation']={'protected':len(baseline['files']),'changed':changed,'missing':missing,'editable_shared':baseline['editable_shared'],'storage':'Existing IDs and storage prefixes retained; browser storage has not been inspected, cleared or migrated.'}
catalog=run([NODE,str(P/'tooling/check-foundry-catalogs.mjs')]);assert catalog['exit_code']==0,catalog;report['catalogs']=json.loads(catalog['stdout'])
files=[p.name for p in W.glob('showcase-foundry*.js')]+baseline['editable_shared']+[f.relative_to(W).as_posix() for f in (W/'assets/game-forms/foundry').rglob('*') if f.is_file()];packaged=ROOT/'_site/projects/010-dumpling-style-lab';report['packaged']={'targets':len(files),'mismatches':[name for name in files if not (packaged/name).exists() or sha(W/name)!=sha(packaged/name)]};report['http']=[]
endpoints=['forms.html?left=machine-construction&right=six-dof','forms.html?left=level-authoring&right=platform']+['showcase.html?play='+id for id in IDS]+files+[v['path'] for v in report['glb_external_dependencies']]
for endpoint in endpoints:
 try:
  with urllib.request.urlopen('http://127.0.0.1:8962/'+endpoint,timeout=4) as response:
   b=response.read();report['http'].append({'path':endpoint,'status':response.status,'bytes':len(b),'matches_workspace':hashlib.sha256(b).hexdigest()==sha(W/endpoint.split('?')[0])})
 except Exception as e:report['http'].append({'path':endpoint,'status':0,'error':str(e)})
try:
 with urllib.request.urlopen('http://127.0.0.1:8963/health',timeout=3) as response:report['companion_service']=json.loads(response.read())
except Exception as e:report['companion_service']={'error':str(e)}
report['syntax_errors']=[]
for f in files:
 if f.endswith('.js'):
  result=run([NODE,'--check',str(W/f)])
  if result['exit_code']:report['syntax_errors'].append({'file':f,**result})
report['browser_qa']={'verified':False,'blocker':'cua.getState initialization failed: trusted Node process exited unexpectedly; kernel reset, rerun your request.','actual_WebGL_render_responsive_touch_fullscreen_storage_acceptance':False,'alternate_browser_automation_used':False}
c=report['catalogs'];report['new_checks']=report['new_rules']['checks']+report['new_lifecycle']['count'];report['passed']=all(report[k]['exit_code']==0 for k in commands) and report['build']['exit_code']==0 and report['default_templates']['exit_code']==0 and report['new_lifecycle']['passed'] and report['scene_geometry']['passed'] and not changed and not missing and not report['assets']['hash_mismatches'] and not report['syntax_errors'] and not report['packaged']['mismatches'] and c['forms']==c['uniqueForms']==104 and c['entrances']==c['uniqueEntrances']==113 and c['allFormsRouted'] and c['newRouter'] and not c['changedPreviousForms'] and not c['changedPreviousEntrances'] and c['storagePrefixesPreserved'] and all(v['status']==200 and v['matches_workspace'] for v in report['http']) and all(v['exists'] for v in report['glb_external_dependencies']) and report['companion_service'].get('service')=='frontier-room';report['browser_acceptance_complete']=False
target.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:report[k] for k in ['passed','new_checks','catalogs','preservation','packaged','assets']},ensure_ascii=False,indent=2))
for k in commands:
 if report[k]['exit_code']:print(k,report[k]['stdout'],report[k]['stderr'])
raise SystemExit(0 if report['passed'] else 1)
