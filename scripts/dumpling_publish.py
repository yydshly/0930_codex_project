"""Publish the complete, existing Dumpling game study at one Pages subpath."""
import hashlib
import json
import shutil
from pathlib import Path

PUBLIC_EXTENSIONS = {'.html', '.css', '.js', '.svg', '.png', '.jpg', '.jpeg',
                     '.webp', '.gif', '.woff', '.woff2', '.glb', '.json',
                     '.ogg', '.wav', '.txt', '.md'}
PRIVATE_NAMES = {'config.json', 'settings.json', 'README.md'}


def publish_dumpling(project_root, destination):
    """Keep all runtime modules, assets, notices and saved historical pages.

    Research intermediates outside web/ remain source records, rather than
    being accidentally exposed by the static hosting process.
    """
    project_root, destination = Path(project_root), Path(destination)
    source = project_root / 'web'
    if source.is_symlink() or not (source / 'index.html').is_file():
        raise ValueError('Dumpling publication requires a regular web/index.html')
    if destination.is_symlink():
        raise ValueError('Dumpling publication destination cannot be a symlink')
    destination.mkdir(parents=True, exist_ok=True)
    records = []
    for asset in sorted(source.rglob('*'), key=lambda item: item.relative_to(source).parts):
        relative = asset.relative_to(source)
        if any(part.startswith('.') or part in {'node_modules', '__pycache__',
                'private', 'secrets'} for part in relative.parts):
            continue
        if not asset.is_file():
            continue
        if asset.is_symlink() or not asset.resolve().is_relative_to(source.resolve()):
            raise ValueError('Runtime asset must stay inside web/: ' + str(relative))
        if asset.name in PRIVATE_NAMES or (asset.suffix.lower() not in PUBLIC_EXTENSIONS
                                          and asset.name != 'LICENSE'):
            continue
        if asset.stat().st_size > 100 * 1024 * 1024:
            raise ValueError('Runtime asset exceeds publication limit: ' + str(relative))
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(asset, target)
        records.append({'path': relative.as_posix(), 'bytes': asset.stat().st_size,
                        'sha256': hashlib.sha256(asset.read_bytes()).hexdigest()})
    payload = {
        'project': '010-dumpling-style-lab',
        'snapshot': '2026-10-08',
        'scope': 'All public runtime files in web/, including 23 pages and historical versions',
        'guide': 'assets/project-overview-20261006.jpg',
        'forms': 107, 'earlier_games': 9, 'showcase_entries': 116,
        'independent_directions': 15, 'future_notes_not_started': 12,
        'backend_boundary': 'assembly and postway retain local-only backend mechanisms; public pages do not contact visitor loopback services',
        'files': records,
    }
    (destination / 'publication-manifest.json').write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return payload
