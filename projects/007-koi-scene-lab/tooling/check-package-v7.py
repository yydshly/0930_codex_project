"""Read-only upstream/resource checks after the collection's local static build."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


def digest(path):
    data = path.read_bytes()
    return len(data), hashlib.sha256(data).hexdigest()


class ResourceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in {'href', 'src', 'data-src', 'poster'} and value:
                split = urlsplit(value)
                if not split.scheme and not split.netloc and split.path and not split.path.startswith('/'):
                    self.references.append({'tag': tag, 'attribute': name, 'reference': value,
                                            'path': unquote(split.path)})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--expected-bundle')
    args = parser.parse_args()
    project = Path(__file__).resolve().parents[1]
    workspace = project.parents[1]
    web = project / 'web'
    public = workspace / '_site' / project.relative_to(workspace)
    errors = []
    lock = json.loads((project / 'notes/upstream-lock.json').read_text(encoding='utf-8'))
    snapshots = []
    for entry in lock['files']:
        path = project / entry['path']
        if not path.is_file():
            errors.append('Missing upstream: ' + entry['path'])
            continue
        size, sha = digest(path)
        passed = size == entry['bytes'] and sha == entry['sha256']
        snapshots.append({'path': entry['path'], 'bytes': size, 'sha256': sha, 'matched': passed})
        if not passed:
            errors.append('Upstream bytes/hash changed: ' + entry['path'])

    original = (web / 'upstream/koi-pond.original.html').read_bytes()
    runtime = (web / 'upstream/koi-pond.html').read_bytes()
    substitutions = [
        ('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js', '../vendor/three-r160.min.js'),
        ('https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.9/dat.gui.min.js', '../vendor/dat.gui-0.7.9.min.js'),
    ]
    expected = original
    for source, target in substitutions:
        if original.count(source.encode()) != 1:
            errors.append('Unexpected upstream dependency count: ' + source)
        expected = expected.replace(source.encode(), target.encode())
    runtime_exact = expected == runtime
    if not runtime_exact:
        errors.append('Original runtime has edits beyond the two local dependency substitutions')

    html = ResourceParser()
    html.feed((web / 'index.html').read_text(encoding='utf-8'))
    references = []
    for entry in html.references:
        path = web / entry['path']
        passed = path.is_file() and (public / entry['path']).is_file()
        references.append({**entry, 'exists': path.is_file(), 'publicExists': (public / entry['path']).is_file()})
        if not passed:
            errors.append('Missing relative HTML resource: ' + entry['reference'])

    matched, source_only = [], []
    public_suffixes = {'.html', '.css', '.js', '.svg', '.png', '.jpg', '.webp', '.woff2'}
    public_names = {'THREE-LICENSE.txt', 'app.js.LEGAL.txt', 'KOI-LICENSE.txt',
                    'DAT-GUI-LICENSE.txt', 'HAND-LICENSE.txt', 'hand-right.glb', 'binding-example.glb', 'binding-example.json'}
    # Match build_site.py's public policy for 007; source README is documentation, not a shipped asset.
    for path in sorted(p for p in web.rglob('*') if p.is_file()):
        name = path.relative_to(web).as_posix()
        if path.suffix.lower() not in public_suffixes and path.name not in public_names:
            source_only.append(name)
            continue
        target = public / name
        if not target.is_file():
            errors.append('Missing static package asset: ' + name)
            continue
        size, sha = digest(path)
        public_size, public_sha = digest(target)
        passed = size == public_size and sha == public_sha
        matched.append({'path': name, 'bytes': size, 'sha256': sha, 'matched': passed})
        if not passed:
            errors.append('Static package differs: ' + name)

    bundle_bytes, bundle_sha = digest(web / 'app.js')
    if args.expected_bundle and bundle_sha != args.expected_bundle:
        errors.append('Bundle differs from the expected final build')
    record = {
        'date': datetime.now(timezone.utc).isoformat(), 'clientDate': '2026-10-02', 'timeZone': 'Asia/Shanghai',
        'upstreamCommit': lock['commit'], 'upstreamSnapshots': len(snapshots),
        'upstreamSnapshotChecks': snapshots, 'originalRuntimeOnlyTwoLocalScriptSubstitutions': runtime_exact,
        'substitutions': [{'from': source, 'to': target} for source, target in substitutions],
        'relativeHtmlReferences': len(references), 'relativeHtmlReferenceChecks': references,
        'publicFilesMatched': len(matched), 'publicFileChecks': matched,
        'sourceOnlyFilesExcludedByBuildPolicy': source_only,
        'webBundleBytes': bundle_bytes, 'webBundleSha256': bundle_sha,
        'expectedBundleSha256': args.expected_bundle, 'publicOutput': str(public),
        'errors': errors, 'passed': not errors,
        'method': 'Byte/SHA-256 comparison and HTML parsing after local scripts/build_site.py. No app rebuild, interaction rerun, Git push or publication.',
    }
    (project / 'notes/algorithm-v7-package-validation.json').write_text(
        json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'upstream': len(snapshots), 'runtimeExact': runtime_exact,
                      'relativeHtmlReferences': len(references), 'publicFiles': len(matched),
                      'bundleSha256': bundle_sha, 'passed': not errors, 'errors': errors}, ensure_ascii=False))
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
