"""Check full runtime publication, historical preservation and source boundaries."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from dumpling_publish import publish_dumpling


class DumplingPublicationTests(unittest.TestCase):
    def test_runtime_models_audio_notices_and_history_keep_identical_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            project, output = root / 'project', root / 'output'
            files = {'index.html': b'<h1>Study</h1>',
                     'assets/project-overview-20261006.jpg': b'existing guide',
                     'assets/directions/vehicle/truck-flat.glb': b'model',
                     'assets/directions/vehicle/SOURCE-NOTICE.json': b'{}',
                     'assets/game-forms/exchange/atlas.json': b'{}',
                     'assets/game-forms/polish/ATTRIBUTION.md': b'Credits',
                     'assets/showcase/audio/jump.ogg': b'sound',
                     'vendor/physics/LICENSE': b'MIT',
                     'versions/painted-20261002/index.html': b'old page',
                     'versions/painted-20261002/assets/worlds/manifest.json': b'{}'}
            for name, data in files.items():
                path = project / 'web' / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            for name in ['notes/private.json', 'assets/intermediate.png',
                         'web/.env', 'web/config.json', 'web/README.md',
                         'web/private/receipt.json', 'web/node_modules/unused.js']:
                path = project / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b'not public')
            manifest = publish_dumpling(project, output)
            self.assertEqual(set(files), {item['path'] for item in manifest['files']})
            for item in manifest['files']:
                data = (output / item['path']).read_bytes()
                self.assertEqual(data, files[item['path']])
                self.assertEqual(len(data), item['bytes'])
                self.assertEqual(hashlib.sha256(data).hexdigest(), item['sha256'])
            self.assertEqual(manifest, json.loads((output / 'publication-manifest.json').read_text()))

    def test_missing_entry_fails_before_publication(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError):
                publish_dumpling(Path(folder) / 'missing', Path(folder) / 'output')


if __name__ == '__main__':
    unittest.main()
