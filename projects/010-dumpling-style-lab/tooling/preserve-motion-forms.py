from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
paths=set()
for name in ('web/assets','web/vendor','versions'):
    paths.update(p for p in (ROOT/name).rglob('*') if p.is_file())
paths.update(p for p in (ROOT/'web').glob('*.js') if p.name not in {'showcase.js','showcase-catalog.js','game-forms-catalog.js','forms.js'})
prior=json.loads((ROOT/'notes/systems-preservation-before-20261003.json').read_text(encoding='utf-8'))
paths.update(ROOT/entry['path'] for entry in prior['files'])
files=[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(paths)]
(ROOT/'notes/motion-preservation-before-20261003.json').write_text(json.dumps({'files':files},indent=2),encoding='utf-8')
print(json.dumps({'existingFiles':len(files)}))
