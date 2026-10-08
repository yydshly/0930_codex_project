"""Consolidate the final v7 records without rebuilding or overwriting older revisions."""
import hashlib
import json
from pathlib import Path

project = Path(__file__).resolve().parents[1]
notes = project / 'notes'
bundle = hashlib.sha256((project / 'web/app.js').read_bytes()).hexdigest()
read = lambda name: json.loads((notes / (name + '.json')).read_text(encoding='utf-8'))
names = ['polish-v7-validation', 'v7-browser-validation', 'koi-v7-validation',
         'hand-v7-validation', 'browser-v7-validation']
records = {}
for name in names:
    data = read(name)
    assert data['bundleSha256'] == bundle, name + ': stale bundle'
    assert not data.get('errors') and not data.get('fatal') and not data.get('failures'), name
    records[name] = {'path': 'notes/' + name + '.json', 'passed': len(data['checks']),
                     'bundleSha256': bundle}
package = read('algorithm-v7-package-validation')
assert package['passed'] and package['webBundleSha256'] == bundle
numerical = (notes / 'numerical-v7.tap').read_text(encoding='utf-8')
assert '# pass 47' in numerical and '# fail 0' in numerical
feature = read('v7-browser-validation')['evidence']
polish = read('polish-v7-validation')['evidence']
summary = {
    'clientDate': '2026-10-02', 'timeZone': 'Asia/Shanghai', 'bundleSha256': bundle,
    'numerical': {'passed': 47, 'failed': 0, 'record': 'notes/numerical-v7.tap'},
    'browser': records, 'browserAssertionsPassed': sum(r['passed'] for r in records.values()),
    'package': {'path': 'notes/algorithm-v7-package-validation.json', 'passed': True,
                'publicFilesMatched': package['publicFilesMatched'],
                'upstreamSnapshotsUnchanged': package['upstreamSnapshots'],
                'relativeHtmlReferences': package['relativeHtmlReferences']},
    'collectionTests': {'passed': 13, 'command': 'python -m unittest discover -s tests'},
    'staticDemosBuilt': 15,
    'gpuMirror': polish['gpuMirror'], 'floating': polish['floating'],
    'sampledHistory': polish['history'],
    'aB': {'sameParameters': feature['same']['difference'],
           'changedParameters': feature['changed']['difference'],
           'boundSameParameters': feature['boundSame']},
    'boundSchool': {'simulatedSeconds': 30,
                    'finite': feature['boundBodies']['finite'],
                    'minimumBodyClearance': feature['boundBodies']['minClearance'],
                    'emitted': feature['boundFeed']['emitted'],
                    'consumed': feature['boundFeed']['consumed']},
    'screenshots': ['assets/shoal-polish-v7.png', 'assets/pond-polish-v7.png',
                    'assets/experiment-trajectories-v7.png',
                    'assets/experiment-trajectories-mobile-v7.png',
                    'assets/binding-polish-v7.png', 'assets/binding-edit-mobile-v7.png'],
    'initialCheckIssues': [
        'Repeated demo loading now waits for the async load button to become enabled before capture.',
        'Frozen headless canvas resize now waits for layout, renders a real frame and checks pixel diversity.',
        'Centroid-pruned shoreline triangles were replaced with a complete masked surface grid.'
    ],
    'limitations': ['Procedural garden and demo GLB, not real-world scans',
                    'No hardware performance or photorealism claim',
                    'Horizontal polygon water; uniform depth and cylindrical obstacles',
                    'CPU float32 mirror and GPU half-float wave field have precision differences',
                    'Sampled trajectories every 0.25 seconds, not continuous recorded paths'],
    'published': False
}
(notes / 'v7-validation-summary.json').write_text(
    json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'bundleSha256': bundle, 'numerical': 47,
                  'browserAssertions': summary['browserAssertionsPassed'],
                  'package': True}, ensure_ascii=False))
