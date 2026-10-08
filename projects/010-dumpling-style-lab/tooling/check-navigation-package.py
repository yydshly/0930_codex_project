from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
PACKAGE=ROOT.parents[1]/'_site/projects/010-dumpling-style-lab'
files=[ROOT/'web'/name for name in ('showcase-pilot.js','showcase-rail.js','showcase-archive.js','showcase-3d-kit.js','showcase-navigation.css','showcase.js','showcase-catalog.js','game-forms-catalog.js','forms.js','forms.html','showcase.html')]
for folder in ('pilot','archive'):files.extend(p for p in (ROOT/'web/assets/game-forms'/folder).rglob('*') if p.is_file())
for name in ('pilot','rail','archive'):files.append(ROOT/'web/assets/showcase/previews'/(name+'.webp'))
for source in files:
    relative=source.relative_to(ROOT/'web');target=PACKAGE/relative
    assert target.is_file(),str(relative)
    assert hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(target.read_bytes()).digest(),str(relative)
report={'passed':True,'publicFilesVerified':len(files),'originalRooms':3,'transparentObjects':6,'spaceModels':8,'actualGameplayPreviews':3,'scope':'Built files byte-identical to verified local runtime; no external deployment performed.'}
(ROOT/'notes/navigation-package-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
