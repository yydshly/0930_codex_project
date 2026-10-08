"""Publish the complete Sprite research site and its reviewed downloads."""
import hashlib
import json
import shutil
from pathlib import Path

PROJECT = '009-sprite-destruction-lab'
STATIC = {'.html', '.css', '.js', '.svg', '.png', '.jpg', '.webp', '.woff2'}
EXPORTS = {
    'avatar-anywhere/assets/github-run.webm',
    'avatar-anywhere/downloads/avatar-anywhere.zip',
    'toolbox/downloads/forma-web-toolbox.zip',
}
ORIGINAL_MAP_SHA256 = 'ca0958efadbd064261d69dab1c4e46962a6b3f521ee681692711d91f4f9e3b30'


def publish_sprite(project, destination):
    project, destination = Path(project), Path(destination)
    expected = project.resolve().parent.parent / '_site/projects' / PROJECT
    if project.name != PROJECT or destination.resolve() != expected or destination.is_symlink():
        raise ValueError('Sprite publication must stay inside its own _site directory')
    web = project / 'web'
    selected = []
    for source in sorted(web.rglob('*')):
        relative = source.relative_to(web)
        if (source.is_file() and not source.is_symlink()
                and source.resolve().is_relative_to(web.resolve())
                and not any(part.startswith('.') or part == 'node_modules' for part in relative.parts)
                and (source.suffix.lower() in STATIC or relative.as_posix() in EXPORTS)):
            selected.append((source, relative))
    names = {relative.as_posix() for _, relative in selected}
    required = {'index.html', 'lab.html', 'avatar/index.html', 'avatar-anywhere/index.html',
                'avatar-anywhere/sample.html', 'products/index.html', 'toolbox/index.html',
                'toolbox/install.html', 'licenses.html', 'research/overview.png',
                'research/overview.svg'} | EXPORTS
    if not required <= names:
        raise ValueError('Missing public Sprite pages or downloads: ' + str(sorted(required-names)))
    digest = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
    if digest(web/'research/overview.png') != ORIGINAL_MAP_SHA256:
        raise ValueError('The previously generated research map must remain unchanged')
    destination.mkdir(parents=True, exist_ok=True)
    for source, relative in selected:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    guide = project / 'assets/research-overview.png'
    if digest(guide) != ORIGINAL_MAP_SHA256:
        raise ValueError('The catalog guide must use the same original research map')
    guide_target = destination/'assets/research-overview.png'
    guide_target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(guide, guide_target)
    selected.append((guide, Path('assets/research-overview.png')))
    records = [{'path': rel.as_posix(), 'bytes': source.stat().st_size,
                'sha256': digest(source)} for source, rel in selected]
    manifest = {'project': PROJECT, 'research_snapshot': '2026-10-02',
                'publication_date': '2026-10-08', 'files': records,
                'pages': [r['path'] for r in records if r['path'].endswith('.html')],
                'policy': 'Complete static demos, actual GitHub recording and two reviewed extensions; source and notes remain in the repository.',
                'guide_sha256': ORIGINAL_MAP_SHA256}
    (destination/'publication-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(f"Published Sprite: {len(manifest['pages'])} pages, {len(records)} files")
    return manifest
