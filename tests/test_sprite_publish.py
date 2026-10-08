"""Downloads, actual evidence and the existing guide must survive publication."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from sprite_publish import publish_sprite, EXPORTS


class SpritePublicationTests(unittest.TestCase):
    def test_complete_site_retains_downloads_and_evidence_but_excludes_unselected_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); project=root/'projects/009-sprite-destruction-lab'; web=project/'web'
            names={'index.html','lab.html','avatar/index.html','avatar-anywhere/index.html',
                   'avatar-anywhere/sample.html','products/index.html','toolbox/index.html',
                   'toolbox/install.html','licenses.html','research/overview.svg','research/overview.png'}|EXPORTS
            for name in names|{'.env','node_modules/private.js','unused.zip','unused.webm','README.md'}:
                target=web/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b'fixture')
            guide=project/'assets/research-overview.png';guide.parent.mkdir();guide.write_bytes(b'fixture')
            destination=root/'_site/projects/009-sprite-destruction-lab'
            with patch('sprite_publish.ORIGINAL_MAP_SHA256',hashlib.sha256(b'fixture').hexdigest()):
                manifest=publish_sprite(project,destination)
            self.assertEqual(set(r['path'] for r in manifest['files']), names|{'assets/research-overview.png'})
            self.assertTrue((destination/'avatar-anywhere/assets/github-run.webm').is_file())
            self.assertFalse((destination/'unused.zip').exists())
            self.assertFalse((destination/'node_modules').exists())
            self.assertEqual(json.loads((destination/'publication-manifest.json').read_text())['pages'],manifest['pages'])

    def test_refuses_output_outside_the_projects_own_site(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); project=root/'projects/009-sprite-destruction-lab'
            with self.assertRaises(ValueError):
                publish_sprite(project,root/'elsewhere')
