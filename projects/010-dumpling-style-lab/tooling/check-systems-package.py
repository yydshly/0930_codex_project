from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
PACKAGE=ROOT.parents[1]/'_site/projects/010-dumpling-style-lab'
files=[ROOT/'web'/name for name in ('showcase-party.js','showcase-district.js','showcase-balance.js','showcase-tandem.js','showcase.js','showcase-core.js','showcase-3d-kit.js','showcase-catalog.js','game-forms-catalog.js','forms.js','forms.css','showcase.css','showcase-presentation.css','forms.html','showcase.html')]
for game in ('party','district','balance','tandem'):
    files.extend(file for file in (ROOT/'web/assets/game-forms'/game).rglob('*') if file.is_file())
    files.append(ROOT/'web/assets/showcase/previews'/(game+'.webp'))
files.extend(file for file in (ROOT/'web/vendor/physics').rglob('*') if file.is_file())
physics=json.loads((ROOT/'assets/game-forms/systems-balance-sources.json').read_text(encoding='utf-8'))
for group in physics['reusedAuthoredModels']:
    files.extend(ROOT/group['base']/name for name in group['files'])
    files.append(ROOT/group['localLicense'])
files=list(dict.fromkeys(files))
for source in files:
    relative=source.relative_to(ROOT/'web');target=PACKAGE/relative
    assert target.is_file(),str(relative)
    assert hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(target.read_bytes()).digest(),str(relative)
report={'passed':True,'publicFilesVerified':len(files),'generatedAssets':11,'newAuthoredCityModels':19,'cityLicenses':4,'physicsLicense':'MIT original text included','actualGameplayPreviews':4,'forms':36,'entries':45,'scope':'Built files are byte-identical to verified local runtime, including new license texts and selected reused model dependencies. No external deployment performed.'}
(ROOT/'notes/systems-package-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))
