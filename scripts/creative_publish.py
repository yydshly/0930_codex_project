"""Publish the reviewed complete 015 browser library, preserving relative paths."""
from pathlib import Path
import hashlib
import json

GUIDE = 'assets/library-overview/creative-products-capability-overview-v16.png'
GUIDE_SHA256 = '173461d051ae406ef058cc077b26ad959cec3144332d66ce1628a02152cde2bd'
TEXT_SUFFIXES = {'.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.md', '.py'}


def publish_creative(project, destination):
    project, destination = Path(project), Path(destination)
    web = project / 'web'
    paths = json.loads((project / 'publication-files.json').read_text(encoding='utf-8'))['files']
    if len(paths) != len(set(paths)) or GUIDE not in paths:
        raise ValueError('Creative library publication paths are incomplete or duplicated')
    resources = []
    for relative in paths:
        path = Path(relative)
        if (path.is_absolute() or '\\' in relative or ':' in relative
                or any(part.startswith('.') or part in {'node_modules', '__pycache__'} for part in path.parts)):
            raise ValueError(f'Invalid public Creative library path: {relative}')
        source = web / path
        if not source.is_file() or source.is_symlink() or not source.resolve().is_relative_to(web.resolve()):
            raise ValueError(f'Missing public Creative library resource: {relative}')
        data = source.read_bytes()
        if path.suffix.lower() in TEXT_SUFFIXES:
            data = data.replace(b'\r\n', b'\n')
        resources.append((relative, data))
    if hashlib.sha256((web / GUIDE).read_bytes()).hexdigest() != GUIDE_SHA256:
        raise ValueError('The original Creative library guide changed')
    records = []
    for relative, data in resources:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        records.append(dict(path=relative, bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
    manifest = dict(project='015-ai-creative-products', publication_date='2026-10-08',
                    effect_snapshot='2026-10-03', original_guide_unchanged=True,
                    scope='10 independent original browser prototypes based on the ten attributed Opus community cases; no AI generation backend.',
                    source_media='Original author videos load on request from video.twimg.com; all prototype runtime resources are local.',
                    files=records)
    (destination / 'publication-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    return manifest
