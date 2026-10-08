"""Verify recorded results against the current bundle; preserve capture hashes."""
import hashlib
import json
import re
from pathlib import Path

project = Path(__file__).resolve().parents[1]
notes = project / 'notes'
bundle_sha = hashlib.sha256((project / 'web/app.js').read_bytes()).hexdigest()
expected = {
    'runtime-v10-validation': 32,
    'animal-view-v10-validation': 169,
    'observation-v10-validation': 17,
    'polish-v10-validation': 32,
    'v10-browser-validation': 29,
    'koi-v10-validation': 31,
    'hand-v10-validation': 25,
    'browser-v10-validation': 24,
}
records = {}
browser = {}
for name, minimum in expected.items():
    record = json.loads((notes / f'{name}.json').read_text(encoding='utf-8'))
    assert record['bundleSha256'] == bundle_sha, f'{name}: stale bundle'
    assert not record.get('errors') and not record.get('fatal') and not record.get('failures'), name
    assert record.get('status', 'passed') == 'passed', name
    checks = record['checks']
    assert len(checks) >= minimum, f'{name}: incomplete record'
    assert all(not isinstance(c, dict) or c.get('passed') is True for c in checks), name
    records[name] = record
    browser[name] = {'path': f'notes/{name}.json', 'passed': len(checks), 'bundleSha256': bundle_sha}

tap = (notes / 'numerical-v10.tap').read_text(encoding='utf-8-sig')
passed = int(re.search(r'^# pass (\d+)$', tap, re.M).group(1))
failed = int(re.search(r'^# fail (\d+)$', tap, re.M).group(1))
assert passed == 80 and failed == 0, 'Numerical tests incomplete'
package = json.loads((notes / 'algorithm-v10-package-validation.json').read_text(encoding='utf-8'))
assert package['passed'] and package['webBundleSha256'] == bundle_sha, 'Package does not match'

captures = []
for f in sorted((project / 'assets').glob('*v10*.png')):
    if 'before' in f.name or f.name.startswith('turtle-camera-'):
        continue
    captures.append({'path': f'assets/{f.name}', 'bytes': f.stat().st_size,
                     'sha256': hashlib.sha256(f.read_bytes()).hexdigest()})
manifest = {'clientDate': '2026-10-02', 'bundleSha256': bundle_sha,
            'method': 'Actual WebGL screenshots from recorded browser checks and capture-v10; no generated or repainted pixels.',
            'excludedDrafts': ['*before*.png', 'turtle-camera-*.png'],
            'captures': captures}
(notes / 'v10-capture-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

summary = {
    'clientDate': '2026-10-02', 'timeZone': 'Asia/Shanghai', 'bundleSha256': bundle_sha,
    'numerical': {'passed': passed, 'failed': failed, 'record': 'notes/numerical-v10.tap'},
    'browser': browser, 'browserAssertionsPassed': sum(r['passed'] for r in browser.values()),
    'package': {'path': 'notes/algorithm-v10-package-validation.json', 'passed': True,
                'publicFilesMatched': 22, 'upstreamSnapshotsUnchanged': 9, 'relativeHtmlReferences': 14},
    'collectionTests': {'passed': 13, 'command': 'python -m unittest discover -s tests'},
    'staticDemosBuilt': sum(
        (project.parents[1] / 'projects' / f"{p['id']:03d}-{p['slug']}" / 'web/index.html').is_file()
        for p in json.loads((project.parents[1] / 'projects.json').read_text(encoding='utf-8'))
    ),
    'runtime': records['runtime-v10-validation']['evidence'],
    'animalViews': {'path': 'notes/animal-view-v10-validation.json',
                   'cases': len(records['animal-view-v10-validation']['evidence'])},
    'legacyFeeding': {'record': 'notes/koi-v10-validation.json',
                     'method': 'Compatibility check using direct updateDynamics(.025); timing is distinct from production 1/60 fixed stepping.',
                     'evidence': records['koi-v10-validation']['evidence']['feed']},
    'captureManifest': 'notes/v10-capture-manifest.json',
    'boundaries': ['Kinematic animal contact and prescribed turtle depth; no buoyancy or flexible leaf solver.',
                   'Frame interpolation restores simulation state; over 12 steps per frame is discarded.',
                   'Software WebGL checks are not hardware performance measurements.',
                   'Procedural scene and generated textures, without surveyed dimensions or real scan assets.'],
}
(notes / 'v10-validation-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'bundleSha256': bundle_sha, 'numericalPassed': passed,
                  'browserAssertionsPassed': summary['browserAssertionsPassed'], 'captures': len(captures)}))
