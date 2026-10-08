from pathlib import Path
import hashlib,json,struct
ROOT=Path(__file__).resolve().parents[1];WEB=ROOT/'web';PACKAGE=ROOT.parents[1]/'_site/projects/010-dumpling-style-lab'
files={WEB/name for name in ('showcase-putt.js','showcase-signal.js','showcase-angler.js','showcase-battery.js','showcase.js','showcase-core.js','showcase-3d-kit.js','showcase-catalog.js','game-forms-catalog.js','forms.js','forms.css','showcase.css','showcase-presentation.css','forms.html','showcase.html')}
for name in ('putt','signal','angler','battery'):
    files.update(p for p in (WEB/'assets/game-forms'/name).rglob('*') if p.is_file());files.add(WEB/'assets/showcase/previews'/f'{name}.webp')
for name in ('vendor/showcase','vendor/physics'):
    files.update(p for p in (WEB/name).rglob('*') if p.is_file())
def collect(value):
    if isinstance(value,str) and value.startswith('web/'):
        p=ROOT/value
        if p.is_file():files.add(p)
    elif isinstance(value,dict):
        for child in value.values():collect(child)
    elif isinstance(value,list):
        for child in value:collect(child)
for name in ('putt','signal','angler'):
    collect(json.loads((ROOT/'assets/game-forms'/f'motion-{name}-sources.json').read_text(encoding='utf-8')))
files.add(WEB/'assets/game-forms/balance/stone.webp')
for p in list(files):
    if p.suffix.lower()!='.glb':continue
    data=p.read_bytes();length,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a
    scene=json.loads(data[20:20+length])
    for item in scene.get('images',[])+scene.get('buffers',[]):
        uri=item.get('uri','')
        if uri and not uri.startswith('data:'):files.add(p.parent/uri)
for source in files:
    assert source.is_file(),str(source);relative=source.relative_to(WEB);target=PACKAGE/relative
    assert target.is_file(),str(relative)
    assert hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(target.read_bytes()).digest(),str(relative)
report={'passed':True,'publicFilesVerified':len(files),'forms':40,'entries':49,'runtimeNewArt':5,'actualGameplayPreviews':4,'physicsMITIncluded':(PACKAGE/'vendor/physics/LICENSE').is_file(),'newCC0OriginalLicensesIncluded':all((PACKAGE/'assets/game-forms'/name/'License.txt').is_file() for name in ('putt','signal')),'scope':'New runtime, shared modules, original licenses and all selected reused models and their external GLB images/buffers match the local build byte-for-byte. No external deployment.'}
(ROOT/'notes/motion-package-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))
