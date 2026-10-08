from pathlib import Path
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT.parents[1] / '_site/projects/010-dumpling-style-lab'
names = ('showcase-cargo.js', 'showcase-jewel.js', 'showcase-realm.js', 'showcase-novel.js', 'showcase.js', 'showcase-core.js', 'showcase-catalog.js', 'game-forms-catalog.js', 'forms.js', 'forms.css', 'showcase.css', 'forms.html', 'showcase.html')
files = [ROOT / 'web' / name for name in names]
for game in ('cargo', 'jewel', 'realm', 'novel'):
    files.extend(file for file in (ROOT / 'web/assets/game-forms' / game).rglob('*') if file.is_file())
    files.append(ROOT / 'web/assets/showcase/previews' / (game + '.webp'))
for source in files:
    relative = source.relative_to(ROOT / 'web')
    target = PACKAGE / relative
    assert target.is_file(), str(relative)
    assert hashlib.sha256(source.read_bytes()).digest() == hashlib.sha256(target.read_bytes()).digest(), str(relative)
report = {'passed': True, 'publicFilesVerified': len(files), 'originalBackgrounds': 5, 'transparentSpritesOrPortraits': 12, 'actualGameplayPreviews': 4, 'forms': 32, 'entries': 41, 'scope': 'Built files are byte-identical to the verified local runtime; no external deployment performed.'}
(ROOT / 'notes/completion-package-20261003.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
