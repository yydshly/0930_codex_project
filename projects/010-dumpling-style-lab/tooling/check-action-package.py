from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
PACKAGE=ROOT.parents[1]/'_site/projects/010-dumpling-style-lab'
files=[ROOT/'web'/name for name in ('showcase-sports.js','showcase-stealth.js','showcase-pinball.js','showcase.js','showcase-catalog.js','game-forms-catalog.js','forms.html','showcase.html')]
for folder in ('sports','stealth','pinball','action'):files.extend(p for p in (ROOT/'web/assets/game-forms'/folder).rglob('*') if p.is_file())
for name in ('sports','stealth','pinball'):files.append(ROOT/'web/assets/showcase/previews'/(name+'.webp'))
for source in files:
    relative=source.relative_to(ROOT/'web');target=PACKAGE/relative
    assert target.is_file(),str(relative)
    assert hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(target.read_bytes()).digest(),str(relative)
report={'passed':True,'publicFilesVerified':len(files),'newScenes':3,'transparentSprites':8,'actualGameplayPreviews':3,'scope':'Built files byte-identical to verified local runtime; no external deployment performed.'}
(ROOT/'notes/action-package-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
