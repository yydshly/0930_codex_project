"""Publish the complete 013 research pages and the unchanged original guide."""
from pathlib import Path
import hashlib
import json
import shutil

PAGES = ('index.html', 'understanding.html', 'map.html', 'mechanisms.html',
         'sources.html', 'styles.css', 'app.js')
GUIDES = ('understanding-map.png', 'understanding-map.svg')

def publish_insightface(project, destination):
    project, destination = Path(project), Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    sources = [(project/'web'/name, name) for name in PAGES]
    sources += [(project/'assets'/name, 'assets/'+name) for name in GUIDES]
    records = []
    for source, relative in sources:
        if not source.is_file() or source.is_symlink():
            raise ValueError(f'Missing public InsightFace resource: {source}')
        target = destination/relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        records.append(dict(path=relative, bytes=target.stat().st_size,
                            sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    manifest = dict(project='013-insightface-retrieval', publication_date='2026-10-08',
                    research_snapshot='2026-10-02', files=records,
                    original_guide_unchanged=True, real_recognition_test=False)
    (destination/'publication-manifest.json').write_text(
        json.dumps(manifest,ensure_ascii=False,sort_keys=True,indent=2)+'\n',
        encoding='utf-8',newline='\n')
    return manifest
