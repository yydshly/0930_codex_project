from pathlib import Path
from PIL import Image
import subprocess,sys,json,hashlib,urllib.request,concurrent.futures
P=Path(__file__).resolve().parents[1];ROOT=P.parents[1];W=P/'web';NODE='C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe';sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();target=P/'notes/exchange-package-check-20261004.json'
def run(cmd):
 r=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace');return {'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
wrapper="""import fs from'node:fs';import path from'node:path';import{pathToFileURL,fileURLToPath}from'node:url';const write=fs.writeFileSync,notes=path.resolve(process.argv[2]);fs.writeFileSync=function(dest,...args){const local=dest instanceof URL?fileURLToPath(dest):dest;if(typeof local==='string'&&path.resolve(local).startsWith(notes+path.sep)&&fs.existsSync(local))return;return write.call(this,dest,...args)};await import(pathToFileURL(process.argv[1]).href);"""
commands={'site_tests':[sys.executable,'-m','unittest','discover','-s','tests','-p','test_site.py']}
for name in ['world','precision','observation','gesture','logic','nine','frontier','studio','horizons','voyages','kinetics','thresholds','circuitry','parlor','trajectories','foundry']:
 for kind in (['rules','lifecycle'] if name in ['frontier','studio','horizons','voyages','kinetics','thresholds','circuitry','parlor','trajectories','foundry'] else ['rules']):commands[name+'_'+kind]=[NODE]+(['--experimental-vm-modules'] if name=='world' else [])+['--input-type=module','-e',wrapper,str(P/f'tooling/check-{name}-{kind}.mjs'),str(P/'notes')]
if '--refresh' in sys.argv:
 previous=json.loads(target.read_text(encoding='utf-8'));report={k:previous[k] for k in commands};assert all(v['exit_code']==0 for v in report.values())
else:
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  pending={k:pool.submit(run,v) for k,v in commands.items()};report={k:v.result() for k,v in pending.items()}
for key in ['rules','lifecycle','service','slot']:report['new_'+key]=json.loads((P/f'notes/exchange-{key}-checks-20261004.json').read_text(encoding='utf-8'))
report['new_checks']=sum(report['new_'+key]['count'] for key in ['rules','lifecycle','service','slot']);report['production_frames']=json.loads((P/'notes/exchange-production-frames-20261004.json').read_text(encoding='utf-8'))
previews=[]
for id in ['satchel','gavel','postway']:
 source=P/f'assets/game-forms/exchange-qa/{id}-progress.png';runtime=W/f'assets/game-forms/exchange/previews/{id}.webp';Image.open(source).save(runtime,quality=95,method=6);previews.append({'id':id,'source':source.relative_to(P).as_posix(),'sha256':sha(source),'runtime':runtime.relative_to(P).as_posix(),'runtime_sha256':sha(runtime),'method':'Actual production Canvas2D via Skia. Not a browser screenshot.'})
(P/'notes/exchange-preview-provenance-20261004.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2),encoding='utf-8')
manifest_path=P/'assets/game-forms/exchange-generation.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'));manifest['previews']=previews;manifest['reused_art']=[{'path':'web/assets/game-forms/foundry/maker-pieces.webp','sha256':sha(W/'assets/game-forms/foundry/maker-pieces.webp'),'role':'Previously generated original explorer; image unchanged'}];manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
report['assets']={'images':len(manifest['images']),'mode':manifest['mode'],'hash_mismatches':[]}
for a in manifest['images']:
 for file,hash in [('source_png','source_sha256'),('runtime_webp','runtime_sha256')]:
  if sha(P/a[file])!=a[hash]:report['assets']['hash_mismatches'].append(a['key']+':'+file)
baseline=json.loads((P/'notes/exchange-preservation-before-20261004.json').read_text(encoding='utf-8'));report['preservation']={'protected':len(baseline['files']),'changed':[],'missing':[]}
for name,digest in baseline['files'].items():
 if not (W/name).exists():report['preservation']['missing'].append(name)
 elif sha(W/name)!=digest:report['preservation']['changed'].append(name)
catalog_source=(P/'tooling/check-foundry-catalogs.mjs').read_text(encoding='utf-8').replace('foundry-preservation-before-20261004.json','exchange-preservation-before-20261004.json').replace("ids=['rigworks','drift','levelsmith']","ids=['satchel','gavel','postway']").replace('if(foundryIds.has(id))','if(exchangeIds.has(id))');checker=P/'tooling/check-exchange-catalogs.mjs';checker.write_text(catalog_source,encoding='utf-8');catalog=run([NODE,str(checker)]);assert catalog['exit_code']==0,catalog;report['catalogs']=json.loads(catalog['stdout'])
report['build']=run([sys.executable,str(ROOT/'scripts/build_site.py')]);files=[p.relative_to(W).as_posix() for p in W.glob('showcase-exchange*.js')]+['showcase-relay-storage.js']+baseline['editable_shared']+[p.relative_to(W).as_posix() for p in (W/'assets/game-forms/exchange').rglob('*') if p.is_file()];pack=ROOT/'_site/projects/010-dumpling-style-lab';report['packaged']={'targets':len(files),'mismatches':[n for n in files if not (pack/n).exists() or sha(W/n)!=sha(pack/n)]};report['http']=[]
for endpoint in ['forms.html?left=inventory-loadout&right=auction-bidding','forms.html?left=asynchronous-relay&right=co-op']+['showcase.html?play='+id for id in ['satchel','gavel','postway']]+['showcase.html?play=postway&role=carrier']+files:
 try:
  with urllib.request.urlopen('http://127.0.0.1:8962/'+endpoint,timeout=4) as response:report['http'].append({'path':endpoint,'status':response.status,'matches_workspace':hashlib.sha256(response.read()).hexdigest()==sha(W/endpoint.split('?')[0])})
 except Exception as e:report['http'].append({'path':endpoint,'status':0,'error':str(e)})
report['services']={}
for port,service in [(8963,'frontier-room'),(8971,'exchange-relay')]:
 try:
  with urllib.request.urlopen(f'http://127.0.0.1:{port}/health',timeout=4) as response:report['services'][service]=json.loads(response.read())
 except Exception as e:report['services'][service]={'error':str(e)}
report['syntax_errors']=[]
for name in files:
 if name.endswith('.js'):
  r=run([NODE,'--check',str(W/name)])
  if r['exit_code']:report['syntax_errors'].append({'file':name,**r})
c=report['catalogs'];v=report['preservation'];report['passed']=all(report[k]['exit_code']==0 for k in commands) and all(report['new_'+key]['passed'] for key in ['rules','lifecycle','service','slot']) and report['production_frames']['passed'] and report['build']['exit_code']==0 and not v['changed'] and not v['missing'] and not report['assets']['hash_mismatches'] and not report['packaged']['mismatches'] and not report['syntax_errors'] and c['forms']==c['uniqueForms']==107 and c['entrances']==c['uniqueEntrances']==116 and c['allFormsRouted'] and c['newRouter'] and not c['changedPreviousForms'] and not c['changedPreviousEntrances'] and c['storagePrefixesPreserved'] and all(e['status']==200 and e['matches_workspace'] for e in report['http']) and all(report['services'][name].get('service')==name for name in ['frontier-room','exchange-relay'])
report['browser_qa']={'verified':False,'blocker':'cua.getState failed: trusted Node process exited unexpectedly; kernel reset, rerun your request.','alternate_browser_automation_used':False,'actual_responsive_touch_fullscreen_storage_acceptance':False};report['browser_acceptance_complete']=False
target.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:report[k] for k in ['passed','new_checks','catalogs','preservation','packaged','assets','services']},ensure_ascii=False,indent=2))
for k in commands:
 if report[k]['exit_code']:print(k,report[k]['stdout'],report[k]['stderr'])
raise SystemExit(0 if report['passed'] else 1)
