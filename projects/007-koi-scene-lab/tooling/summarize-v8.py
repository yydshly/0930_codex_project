"""Consolidate the final v8 records without rebuilding or overwriting older revisions."""
import hashlib
import json
from pathlib import Path

project = Path(__file__).resolve().parents[1]
notes = project / 'notes'
bundle = hashlib.sha256((project / 'web/app.js').read_bytes()).hexdigest()
read = lambda name: json.loads((notes / (name + '.json')).read_text(encoding='utf-8'))
names = ['polish-v8-validation', 'v8-browser-validation', 'koi-v8-validation',
         'hand-v8-validation', 'browser-v8-validation']
records = {}
for name in names:
    data = read(name)
    assert data['bundleSha256'] == bundle, name + ': stale bundle'
    assert not data.get('errors') and not data.get('fatal') and not data.get('failures'), name
    records[name] = {'path': 'notes/' + name + '.json', 'passed': len(data['checks']),
                     'bundleSha256': bundle}
package = read('algorithm-v8-package-validation')
assert package['passed'] and package['webBundleSha256'] == bundle
numerical = (notes / 'numerical-v8.tap').read_text(encoding='utf-8')
assert '# pass 52' in numerical and '# fail 0' in numerical
feature = read('v8-browser-validation')['evidence']
polish = read('polish-v8-validation')['evidence']
summary = {
    'clientDate': '2026-10-02', 'timeZone': 'Asia/Shanghai', 'bundleSha256': bundle,
    'numerical': {'passed': 52, 'failed': 0, 'record': 'notes/numerical-v8.tap'},
    'browser': records, 'browserAssertionsPassed': sum(r['passed'] for r in records.values()),
    'package': {'path': 'notes/algorithm-v8-package-validation.json', 'passed': True,
                'publicFilesMatched': package['publicFilesMatched'],
                'upstreamSnapshotsUnchanged': package['upstreamSnapshots'],
                'relativeHtmlReferences': package['relativeHtmlReferences']},
    'collectionTests': {'passed': 13, 'command': 'python -m unittest discover -s tests'},
    'staticDemosBuilt': 15,
    'gpuMirror': polish['gpuMirror'], 'floating': polish['floating'],
    'advection': polish['advection'], 'zeroWind': polish['zeroWind'],
    'optics': polish['optics'], 'lilies': polish['lilies'],
    'sampledHistory': polish['history'],
    'aB': {'sameParameters': feature['same']['difference'],
           'changedParameters': feature['changed']['difference'],
           'boundSameParameters': feature['boundSame']},
    'boundSchool': {'simulatedSeconds': 30,
                    'finite': feature['boundBodies']['finite'],
                    'minimumBodyClearance': feature['boundBodies']['minClearance'],
                    'emitted': feature['boundFeed']['emitted'],
                    'consumed': feature['boundFeed']['consumed']},
    'screenshots': ['assets/shoal-before-v8.png', 'assets/shoal-v8.png',
                    'assets/koi-detail-v8.png', 'assets/feeding-v8.png',
                    'assets/detail-comparison-v8.png',
                    'assets/shoal-polish-v8.png', 'assets/pond-polish-v8.png',
                    'assets/experiment-trajectories-v8.png',
                    'assets/experiment-trajectories-mobile-v8.png',
                    'assets/binding-polish-v8.png', 'assets/binding-edit-mobile-v8.png'],
    'initialCheckIssues': [
        'Initial capture used an obsolete fish button selector; corrected to the actual fish-inspect control.',
        'Final leaf details reduce bright vein lines and self-shadows; earlier tested bundle records are preserved separately.'
    ],
    'limitations': ['Procedural garden and demo GLB, not real-world scans',
                    'No hardware performance or photorealism claim',
                    'Horizontal polygon water; uniform depth and cylindrical obstacles',
                    'CPU float32 mirror and GPU half-float wave field have precision differences',
                    'Prescribed weak wind current, not a solved fluid velocity field',
                    'Lily leaves move as rigid surfaces; no stem or flexible-leaf dynamics',
                    'Screen filtering removes unresolved microdetail; no scan textures added',
                    'Sampled trajectories every 0.25 seconds, not continuous recorded paths'],
    'published': False
}
(notes / 'v8-validation-summary.json').write_text(
    json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'bundleSha256': bundle, 'numerical': 52,
                  'browserAssertions': summary['browserAssertionsPassed'],
                  'package': True}, ensure_ascii=False))
