"""Require matching final bundle fingerprints before consolidating v9 evidence."""
import hashlib
import json
import re
from pathlib import Path

project = Path(__file__).resolve().parents[1]
notes = project / 'notes'
bundle = hashlib.sha256((project / 'web/app.js').read_bytes()).hexdigest()
read = lambda name: json.loads((notes / (name + '.json')).read_text(encoding='utf-8'))
names = ['observation-v9-validation', 'polish-v9-validation', 'v9-browser-validation',
         'koi-v9-validation', 'hand-v9-validation', 'browser-v9-validation']
records = {}
for name in names:
    data = read(name)
    assert data['bundleSha256'] == bundle, name + ': stale bundle'
    assert not data.get('errors') and not data.get('fatal') and not data.get('failures'), name
    records[name] = {'path': 'notes/' + name + '.json', 'passed': len(data['checks']),
                     'bundleSha256': bundle}
package = read('algorithm-v9-package-validation')
assert package['passed'] and package['webBundleSha256'] == bundle
tap = (notes / 'numerical-v9.tap').read_text(encoding='utf-8')
assert '# pass 60' in tap and '# fail 0' in tap
observation = read(names[0])['evidence']
feature = read('v9-browser-validation')['evidence']
fish = read('koi-v9-validation')['evidence']
summary = {
    'clientDate': '2026-10-02', 'timeZone': 'Asia/Shanghai', 'bundleSha256': bundle,
    'numerical': {'passed': 60, 'failed': 0, 'record': 'notes/numerical-v9.tap'},
    'browser': records, 'browserAssertionsPassed': sum(r['passed'] for r in records.values()),
    'package': {'path': 'notes/algorithm-v9-package-validation.json', 'passed': True,
                'publicFilesMatched': package['publicFilesMatched'],
                'upstreamSnapshotsUnchanged': package['upstreamSnapshots'],
                'relativeHtmlReferences': package['relativeHtmlReferences']},
    'collectionTests': {'passed': 13, 'command': 'python -m unittest discover -s tests'},
    'staticDemosBuilt': 15,
    'observation': observation,
    'aB': {'sameParameters': feature['same']['difference'],
           'changedParameters': feature['changed']['difference'],
           'boundSameParameters': feature['boundSame']},
    'boundSchool': {'simulatedSeconds': 30, 'bodies': feature['boundBodies'],
                    'feeding': feature['boundFeed']},
    'naturalFeeding': fish['feed'],
    'screenshots': ['assets/shoal-before-v9.png', 'assets/shoal-v9.png',
                    'assets/koi-whole-v9.png', 'assets/koi-whole-mobile-v9.png',
                    'assets/koi-detail-v9.png', 'assets/feeding-v9.png',
                    'assets/experiment-trajectories-v9.png',
                    'assets/binding-edit-mobile-v9.png'],
    'archivalCorrection': 'The v9 initial capture reused v8-before names. New captures were renamed before-v9. Original v8 full before screenshots are unavailable; the original before crop remains in detail-comparison-v8.png. See v8-image-comparison.json.',
    'limitations': ['Procedural garden and demo GLB, not real-world scans',
                    'Surface dipole sources are a wave approximation, not fluid/body hydrodynamics',
                    'GPU half-float and CPU float32 precision differences',
                    'Framing projection probe applies spine shear; small fin rotations and membrane motion use sphere margin and actual visual checks',
                    'Software WebGL verification does not establish hardware performance or photorealism',
                    'Sampled A/B history every 0.25 seconds, not continuous trajectories'],
    'published': False
}
for filename in summary['screenshots']:
    assert (project / filename).is_file(), filename
(notes / 'v9-validation-summary.json').write_text(
    json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'bundleSha256': bundle, 'numerical': 60,
                  'browserAssertions': summary['browserAssertionsPassed'], 'package': True}))
