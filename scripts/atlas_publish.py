"""Publish only the reviewed Visual Atlas snapshot, never its local workspace."""
import hashlib
import json
import shutil
from pathlib import Path, PurePosixPath

EXTENSIONS = {'.html', '.css', '.js', '.mjs', '.svg', '.png', '.jpg', '.webp',
              '.gif', '.mp4', '.json', '.txt', '.md', '.woff', '.woff2'}


def publish_atlas(project_root, destination):
    project_root, destination = Path(project_root), Path(destination)
    source = project_root / 'publication'
    if source.is_symlink() or not source.resolve().is_relative_to(project_root.resolve()):
        raise ValueError('Publication root must remain inside the project')
    manifest = source / 'manifest.json'
    if not manifest.is_file() or manifest.is_symlink():
        raise ValueError('Visual Atlas requires a reviewed publication manifest')
    try:
        payload = json.loads(manifest.read_text(encoding='utf-8'))
    except (ValueError, OSError) as exc:
        raise ValueError('Invalid publication manifest') from exc
    records = payload.get('files')
    if not isinstance(records, list) or not records:
        raise ValueError('The publication file list must not be empty')
    validated, names = [], set()
    for item in records:
        if not isinstance(item, dict) or not isinstance(item.get('path'), str):
            raise ValueError('Invalid file record')
        name = item['path']
        path = PurePosixPath(name)
        if (not name or '\\' in name or ':' in name or path.is_absolute()
                or name != path.as_posix() or name in names
                or any(part in {'.', '..'} or part.startswith('.') for part in path.parts)
                or path.suffix.lower() not in EXTENSIONS
                or name in {'manifest.json', 'publication-manifest.json'}):
            raise ValueError('Unsafe or duplicate publication path')
        asset = source / name
        if (not asset.is_file() or asset.is_symlink()
                or any(parent.is_symlink() for parent in asset.parents if parent != source and parent.is_relative_to(source))
                or not asset.resolve().is_relative_to(source.resolve())):
            raise ValueError('Publication file missing or outside the snapshot')
        if (type(item.get('bytes')) is not int or not 0 <= item['bytes'] <= 100*1024*1024
                or not isinstance(item.get('sha256'), str)
                or asset.stat().st_size != item['bytes']
                or hashlib.sha256(asset.read_bytes()).hexdigest() != item['sha256']):
            raise ValueError('Publication bytes or SHA-256 changed since review')
        names.add(name)
        validated.append((name, asset))
    if 'index.html' not in names:
        raise ValueError('The public index is required')
    # Refuse stale unreviewed assets rather than deleting or shipping them.
    if destination.is_symlink():
        raise ValueError('The publication destination must not be a symlink')
    if destination.exists():
        for old in destination.rglob('*'):
            if old.is_symlink():
                raise ValueError('The publication destination contains a symlink')
            if old.is_file() and old.relative_to(destination).as_posix() not in names | {'publication-manifest.json'}:
                raise ValueError('The destination contains an unreviewed stale asset')
    destination.mkdir(parents=True, exist_ok=True)
    for name, asset in validated:
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(asset, target)
    public = dict(payload)
    public['publisher'] = 'Explicit file list, byte size and SHA-256 verification'
    (destination / 'publication-manifest.json').write_text(
        json.dumps(public, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    return public
