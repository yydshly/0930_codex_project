from pathlib import Path
import hashlib,json
P=Path(__file__).resolve().parents[1];W=P/'web';shared={'forms.html','forms.js','game-forms-catalog.js','showcase-catalog.js','showcase.html','showcase.js'}
out=P/'notes/foundry-preservation-before-20261004.json'
assert not out.exists()
files={f.relative_to(W).as_posix():hashlib.sha256(f.read_bytes()).hexdigest() for f in W.rglob('*') if f.is_file() and f.relative_to(W).as_posix() not in shared}
out.write_text(json.dumps({'files':files,'editable_shared':sorted(shared),'shared_before':{f:(W/f).read_text(encoding='utf-8') for f in shared}},ensure_ascii=False,indent=2),encoding='utf-8')
print('Protected existing web files:',len(files))
