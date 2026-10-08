"""Record raw production archives while selecting all cited source evidence."""
import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit

project = Path(__file__).resolve().parents[1]
assets = project / 'assets'
selected = {p for p in assets.iterdir() if p.is_file()}
selected.update(p for p in assets.rglob('*') if p.is_file() and
                (p.suffix.lower() in {'.json', '.txt', '.md'} or p.name == 'LICENSE'))
for md in [project / 'README.md', project / 'web/README.md', *(project / 'notes').rglob('*.md')]:
    for ref in re.findall(r'\]\(([^\s)]+)\)', md.read_text(encoding='utf-8', errors='replace')):
        parsed = urlsplit(ref)
        if parsed.scheme or parsed.netloc:
            continue
        target = (md.parent / unquote(parsed.path)).resolve()
        if target.is_file() and target.is_relative_to(assets.resolve()):
            selected.add(target)
records = []
for asset in sorted(p for p in assets.rglob('*') if p.is_file()):
    relative = asset.relative_to(project).as_posix()
    records.append({'path': relative, 'bytes': asset.stat().st_size,
                    'sha256': hashlib.sha256(asset.read_bytes()).hexdigest(),
                    'git_evidence': asset in selected,
                    'scope': 'source evidence' if asset in selected else 'local production intermediate'})
scope = {'date': '2026-10-08', 'runtime': 'Complete web/ committed and deployed with its own manifest',
         'research': 'Complete README, notes and tooling committed; all cited source evidence retained',
         'raw_archive': 'Uncited raw models, downloads and render intermediates stay in the original local assets/; no website resources are removed',
         'files': records}
report = project / 'notes/publication-source-scope-20261008.json'
report.write_text(json.dumps(scope, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'source_evidence_files': len(selected),
                  'source_evidence_bytes': sum(p.stat().st_size for p in selected),
                  'local_archive_files': len(records) - len(selected)}, ensure_ascii=False))
