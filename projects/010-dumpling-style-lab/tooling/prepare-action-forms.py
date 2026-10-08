from pathlib import Path
from PIL import Image, ImageOps
import hashlib, json, shutil

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / 'assets/game-forms/action-generation-20261003.json'
before = ROOT / 'notes/action-preservation-before-20261003.json'
if not before.exists():
    files = [p for folder in ('web/assets', 'web/versions/painted-20261002') for p in (ROOT / folder).rglob('*') if p.is_file()]
    before.write_text(json.dumps({'files': [{'path': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}, indent=2), encoding='utf-8')
if not manifest_path.exists():
    print('Existing art baseline saved; awaiting generated originals.')
    raise SystemExit(0)
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
source = ROOT / 'assets/game-forms/action-sources'
source.mkdir(parents=True, exist_ok=True)
for entry in manifest['entries']:
    destination = source / (entry['id'] + '.png')
    shutil.copy2(entry['source'], destination)
    entry['project_source'] = str(destination)
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
for game in ('sports', 'stealth', 'pinball'):
    folder = ROOT / 'web/assets/game-forms' / game
    folder.mkdir(parents=True, exist_ok=True)
    im = ImageOps.fit(Image.open(source / (game + 'Scene.png')).convert('RGB'), (1792, 1008), method=Image.Resampling.LANCZOS)
    im.save(folder / 'scene.webp', quality=94, method=4)
    preview = im.resize((720, 405), Image.Resampling.LANCZOS)
    preview.save(ROOT / 'web/assets/showcase/previews' / (game + '.webp'), quality=90)
im = Image.open(source / 'actionAtlas.png').convert('RGBA')
assert im.getchannel('A').getextrema()[0] == 0, 'Sprite atlas requires true transparency'
folder = ROOT / 'web/assets/game-forms/action'
folder.mkdir(exist_ok=True)
names = ['teal-run', 'teal-kick', 'coral-run', 'coral-keeper', 'operative', 'crouch', 'patrol', 'ball']
report = []
for index, name in enumerate(names):
    col, row = index % 4, index // 4
    bounds = (round(col * im.width / 4), round(row * im.height / 2), round((col + 1) * im.width / 4), round((row + 1) * im.height / 2))
    cell = im.crop(bounds)
    box = cell.getchannel('A').getbbox()
    assert box, name
    cell = cell.crop((max(0, box[0]-4), max(0, box[1]-4), min(cell.width, box[2]+4), min(cell.height, box[3]+4)))
    cell.thumbnail((460, 460), Image.Resampling.LANCZOS)
    cell.save(folder / (name + '.webp'), quality=94, method=4)
    report.append({'name': name, 'cell': bounds, 'size': cell.size})
(ROOT / 'notes/action-assets-20261003.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('Prepared three backgrounds and eight true-alpha sprites')
