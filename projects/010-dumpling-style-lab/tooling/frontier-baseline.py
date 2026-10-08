from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parents[1];W=P/'web'
skip={'forms.html','forms.js','game-forms-catalog.js','showcase-catalog.js','showcase.html','showcase.js'}
out=P/'notes/frontier-preservation-before-20261004.json'
assert not out.exists()
files={f.relative_to(W).as_posix():hashlib.sha256(f.read_bytes()).hexdigest() for f in W.rglob('*') if f.is_file() and f.relative_to(W).as_posix() not in skip}
out.write_text(json.dumps({'files':files,'editable_shared':sorted(skip)},ensure_ascii=False,indent=2),encoding='utf-8')
print('Protected files:',len(files))
