from pathlib import Path
import hashlib,json
P=Path(__file__).resolve().parents[1];W=P/'web';skip={'forms.html','forms.js','game-forms-catalog.js','showcase-catalog.js','showcase.html','showcase.js'};target=P/'notes/trajectories-preservation-before-20261004.json';assert not target.exists()
files={f.relative_to(W).as_posix():hashlib.sha256(f.read_bytes()).hexdigest() for f in W.rglob('*') if f.is_file() and f.relative_to(W).as_posix() not in skip}
target.write_text(json.dumps({'files':files,'editable_shared':sorted(skip),'shared_before':{f:(W/f).read_text(encoding='utf-8') for f in skip}},ensure_ascii=False,indent=2),encoding='utf-8');print('Protected existing files:',len(files))
