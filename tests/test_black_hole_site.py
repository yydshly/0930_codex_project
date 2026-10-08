"""Check the complete 012 public package and prominent catalog entrances."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
from black_hole_publish import AUDIO, ASSETS, PAGES, GUIDE_SHA256, publish_black_hole
from build_site import build


class BlackHolePublicationTests(unittest.TestCase):
    def fixture(self, root):
        project = root/'projects/012-black-hole-lab'
        web = project/'web'
        for name in PAGES:
            target = web/name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text('<!doctype html><html lang="zh-CN"></html>' if name.endswith('.html') else '', encoding='utf-8')
        for name in ASSETS:
            target = web/'assets'/name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT/'projects/012-black-hole-lab/web/assets'/name).read_bytes())
        for name in AUDIO:
            target = web/'audio/narration'/name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(b'packaging-test-audio')
        (web/'README.md').write_text('private configuration must not be copied', encoding='utf-8')
        (web/'.env').write_text('PLACEHOLDER_ONLY', encoding='utf-8')
        (web/'assets/unused.png').write_bytes(b'unreviewed')
        return project

    def test_complete_public_set_and_unchanged_guide(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            project = self.fixture(root)
            manifest = publish_black_hole(project, root/'public')
            paths = {f['path'] for f in manifest['files']}
            self.assertEqual(len(paths), 43)
            self.assertEqual(len([p for p in paths if p.endswith('.mp3')]), 31)
            self.assertIn('research.html', paths)
            for f in manifest['files']:
                data = (root/'public'/f['path']).read_bytes()
                self.assertEqual(len(data), f['bytes'])
                self.assertEqual(hashlib.sha256(data).hexdigest(), f['sha256'])
            self.assertEqual(hashlib.sha256((root/'public/assets/understanding-map.png').read_bytes()).hexdigest(), GUIDE_SHA256)
            for excluded in ('README.md', '.env', 'assets/unused.png'):
                self.assertFalse((root/'public'/excluded).exists())

    def test_missing_audio_fails_before_copying(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            project = self.fixture(root)
            (project/'web/audio/narration/09-02.mp3').unlink()
            with self.assertRaisesRegex(ValueError, '09-02.mp3'):
                publish_black_hole(project, root/'public')
            self.assertFalse((root/'public').exists())

    def test_catalog_links_and_guide(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            project = self.fixture(root)
            (project/'README.md').write_text('Black Hole Lab', encoding='utf-8')
            (project/'assets').mkdir()
            (project/'assets/understanding-map.png').write_bytes((project/'web/assets/understanding-map.png').read_bytes())
            record = dict(id=12, slug='black-hole-lab', name='Black Hole Lab', repo='',
                          summary='效果、原理、时空与寿命、价值及边界', status='已完成', demo='',
                          cover='assets/understanding-map.png',
                          reference='https://www.reddit.com/r/SoloDevelopment/comments/1wr6jr4/my_black_hole_shader_for_my_game/',
                          reference_name='VOLDR_dev')
            (root/'projects.json').write_text(json.dumps([record], ensure_ascii=False), encoding='utf-8')
            build(root)
            index = (root/'_site/index.html').read_text(encoding='utf-8')
            for link in ('?view=effect#experiment', '#understanding', '#entries',
                         '#references', 'research.html', 'audio/narration/full-course.mp3',
                         'assets/understanding-map.svg'):
                self.assertIn(link, index)
            self.assertIn('非观测照片', index)


if __name__ == '__main__':
    unittest.main()
