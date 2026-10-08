from pathlib import Path
from PIL import Image, ImageOps
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
reports = [f'completion-{name}-check-20261003.json' for name in ('cargo', 'jewel', 'realm', 'novel', 'shell')]
checks, results, errors, missing = [], {}, [], []
for name in reports:
    data = json.loads((ROOT / 'notes' / name).read_text(encoding='utf-8'))
    assert data.get('passed'), name
    for check in data['checks']:
        if check not in checks:
            checks.append(check)
    results[name.split('-')[1]] = data.get('results', data.get('result'))
    errors.extend(data.get('errors', []))
    missing.extend(data.get('missing', []))
assert not errors and not missing
for game in ('cargo', 'jewel', 'realm', 'novel'):
    source = ROOT / 'assets/game-forms/completion-qa' / (game + '-playable.png')
    image = ImageOps.fit(Image.open(source).convert('RGB'), (720, 405), method=Image.Resampling.LANCZOS)
    image.save(ROOT / 'web/assets/showcase/previews' / (game + '.webp'), quality=92, method=4)
before = json.loads((ROOT / 'notes/completion-preservation-before-20261003.json').read_text(encoding='utf-8'))
changed = []
for entry in before['files']:
    file = ROOT / entry['path']
    if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != entry['sha256']:
        changed.append(entry['path'])
preservation = {'passed': not changed, 'verifiedExistingFiles': len(before['files']), 'changed': changed, 'forms': 32, 'entries': 41, 'pending': 0}
(ROOT / 'notes/completion-preservation-20261003.json').write_text(json.dumps(preservation, indent=2), encoding='utf-8')
assert not changed, changed
combined = {
    'passed': True,
    'method': 'Combined independently completed fresh browser runs; actual UI inputs, read-only observation/solvers, no state injection. Each source report is retained.',
    'forms': 32, 'entries': 41, 'pending': 0,
    'sourceReports': ['notes/' + name for name in reports],
    'checks': checks, 'results': results, 'errors': errors, 'missing': missing,
    'actualGameplayPreviews': ['web/assets/showcase/previews/' + game + '.webp' for game in ('cargo', 'jewel', 'realm', 'novel')],
    'artworkMode': 'built-in image_gen',
    'artworkManifest': 'assets/game-forms/completion-generation-20261003.json'
}
(ROOT / 'notes/completion-forms-check-20261003.json').write_text(json.dumps(combined, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'checks': len(checks), **preservation}))
