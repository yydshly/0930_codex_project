"""Keep the playable Koi publication complete under the Pages subpath."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from build_site import build


class KoiSiteTests(unittest.TestCase):
    def test_models_bindings_notices_and_selected_guide_reach_the_site(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = root / 'projects/007-koi-scene-lab'
            web = project / 'web'
            (web / 'assets').mkdir(parents=True)
            (web / 'upstream').mkdir()
            (web / 'vendor').mkdir()
            (project / 'assets').mkdir()
            (project / 'README.md').write_text('Research', encoding='utf-8')
            (web / 'index.html').write_text('<script src="app.js"></script>', encoding='utf-8')
            required = [
                'app.js', 'app.js.LEGAL.txt', 'understanding-v21.css',
                'assets/hand-right.glb', 'assets/binding-example.glb',
                'assets/binding-example.json', 'assets/HAND-LICENSE.txt',
                'upstream/koi-pond.html', 'upstream/koi-pond.original.html',
                'upstream/KOI-LICENSE.txt', 'vendor/DAT-GUI-LICENSE.txt',
                'vendor/THREE-LICENSE.txt', 'assets/library-value-map-v21.png',
            ]
            for relative in required:
                (web / relative).write_bytes(b'public fixture')
            for relative in ['assets/private.json', 'assets/unselected.glb', '.env', 'README.md']:
                (web / relative).write_bytes(b'private fixture')
            (project / 'assets/library-value-map-v21.png').write_bytes(b'public fixture')
            (root / 'projects.json').write_text(json.dumps([dict(
                id=7, slug='koi-scene-lab', name='Koi Scene Lab',
                repo='https://github.com/souranyp-stack/koi-pond-garden',
                summary='Original effect, algorithms and user value', status='研究中',
                demo='', cover='assets/library-value-map-v21.png')]), encoding='utf-8')
            build(root)
            output = root / '_site/projects/007-koi-scene-lab'
            for relative in required:
                with self.subTest(relative=relative):
                    self.assertEqual((output / relative).read_bytes(), b'public fixture')
            for relative in ['assets/private.json', 'assets/unselected.glb', '.env', 'README.md']:
                self.assertFalse((output / relative).exists())
            index = (root / '_site/index.html').read_text(encoding='utf-8')
            self.assertIn('./projects/007-koi-scene-lab/assets/library-value-map-v21.png', index)
            self.assertIn('我们的理解总览图', index)
            self.assertIn('照片重建和实物交付仍为规划', index)


if __name__ == '__main__':
    unittest.main()
