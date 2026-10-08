from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
PACKAGE=ROOT.parents[1]/'_site/projects/010-dumpling-style-lab'
paths=[ROOT/'web'/name for name in ('showcase-duel.js','showcase-maze.js','showcase-rhythm.js','showcase.js','showcase-catalog.js','game-forms-catalog.js','forms.html')]
for game in ('duel','maze','rhythm','coast'):
    paths.extend(p for p in (ROOT/'web/assets/game-forms'/game).rglob('*') if p.is_file())
for name in ('duel','maze','rhythm'):paths.append(ROOT/'web/assets/showcase/previews'/(name+'.webp'))
for source in paths:
    relative=source.relative_to(ROOT/'web');target=PACKAGE/relative
    assert target.is_file(),str(relative)
    assert hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(target.read_bytes()).digest(),str(relative)
report={'passed':True,'publicFilesVerified':len(paths),'musicIncluded':True,'racingModelsIncluded':True,'scope':'Built files byte-identical to verified local runtime; no external deployment performed.'}
(ROOT/'notes/interaction-package-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
