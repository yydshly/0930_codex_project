"""Publish the complete 012 demonstration, recorded audio and research reader."""
from pathlib import Path
import hashlib
import json
import shutil

PAGES = ('index.html', 'research.html', 'styles.css', 'app.js', 'course.js',
         'narration.js', 'model.js', 'physics.js', 'shaders.js')
ASSETS = ('summary-effect.png', 'understanding-map.png', 'understanding-map.svg')
AUDIO = tuple(f'{chapter:02d}-{cue:02d}.mp3' for chapter in range(10)
              for cue in range(3)) + ('full-course.mp3',)
GUIDE_SHA256 = '73a859b1ad6a710c4aa19706ba1828849b49169a368a57ff65cf6d4779908c54'


def publish_black_hole(project, destination):
    project, destination = Path(project), Path(destination)
    sources = [(project/'web'/name, name) for name in PAGES]
    sources += [(project/'web/assets'/name, 'assets/'+name) for name in ASSETS]
    sources += [(project/'web/audio/narration'/name, 'audio/narration/'+name)
                for name in AUDIO]
    # Validate the entire set before writing any public resource.
    for source, relative in sources:
        if not source.is_file() or source.is_symlink():
            raise ValueError(f'Missing public Black Hole Lab resource: {relative}')
    original = project/'web/assets/understanding-map.png'
    if hashlib.sha256(original.read_bytes()).hexdigest() != GUIDE_SHA256:
        raise ValueError('The original Black Hole Lab understanding guide changed')
    destination.mkdir(parents=True, exist_ok=True)
    records = []
    for source, relative in sources:
        target = destination/relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        records.append(dict(path=relative, bytes=target.stat().st_size,
                            sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    manifest = dict(project='012-black-hole-lab', publication_date='2026-10-08',
                    research_snapshot='2026-10-02', original_guide_unchanged=True,
                    audio=dict(provider='MiniMax', chapters=10, segments=30,
                               total_seconds=782.82, runtime_generation=False),
                    scope='Static teaching demonstration and restricted external model; not a complete stellar collapse or human journey simulation.',
                    files=records)
    (destination/'publication-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2)+'\n',
        encoding='utf-8', newline='\n')
    return manifest
