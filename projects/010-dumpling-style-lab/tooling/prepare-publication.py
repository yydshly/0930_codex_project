"""Copy this study into an isolated checkout, preserving other published studies."""
import argparse
import json
import re
import shutil
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--workspace', type=Path, required=True)
parser.add_argument('--checkout', type=Path, required=True)
args = parser.parse_args()
workspace, checkout = args.workspace.resolve(), args.checkout.resolve()
if checkout == workspace or not (checkout / '.git').is_file():
    raise SystemExit('Use a separate Git worktree for publication')
relative = Path('projects/010-dumpling-style-lab')
source, destination = workspace / relative, checkout / relative
if not destination.resolve().is_relative_to(checkout):
    raise SystemExit('Destination must stay inside the selected checkout')
patterns = [re.compile(r'(?:gh[pousr]_[A-Za-z0-9]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{24,}|AKIA[0-9A-Z]{16})')]
copied, size = 0, 0
scope = json.loads((source / 'notes/publication-source-scope-20261008.json').read_text(encoding='utf-8'))
source_evidence = {item['path'] for item in scope['files'] if item['git_evidence']}
for asset in sorted(source.rglob('*')):
    name = asset.relative_to(source)
    if any(part.startswith('.') or part in {'node_modules', '__pycache__'} for part in name.parts):
        continue
    if not asset.is_file() or asset.suffix.lower() in {'.log', '.pyc', '.db', '.sqlite', '.key', '.pem'}:
        continue
    if name.parts[0] == 'assets' and name.as_posix() not in source_evidence:
        continue
    if asset.is_symlink() or not asset.resolve().is_relative_to(source):
        raise SystemExit('Symlink/outside source refused: ' + str(name))
    if asset.stat().st_size > 100 * 1024 * 1024:
        raise SystemExit('Oversize source file: ' + str(name))
    if asset.suffix.lower() in {'.md', '.json', '.py', '.js', '.mjs', '.html', '.txt'}:
        text = asset.read_text(encoding='utf-8', errors='replace')
        if any(pattern.search(text) for pattern in patterns):
            raise SystemExit('Credential-like text needs review: ' + str(name))
    target = destination / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(asset, target)
    copied += 1
    size += asset.stat().st_size
for name in ['scripts/dumpling_publish.py', 'tests/test_dumpling_publish.py']:
    shutil.copy2(workspace / name, checkout / name)
shutil.copy2(source / '.gitattributes', destination / '.gitattributes')
shutil.copy2(source / '.gitignore', destination / '.gitignore')
catalog_path = checkout / 'projects.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
local = json.loads((workspace / 'projects.json').read_text(encoding='utf-8'))
record = next(p for p in local if p['id'] == 10)
catalog = sorted([p for p in catalog if p['id'] != 10] + [record], key=lambda p: p['id'])
catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'copied_files': copied, 'copied_bytes': size, 'catalog_ids': [p['id'] for p in catalog]}))
