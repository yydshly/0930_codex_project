"""Check the deployable artifact, including subpath links and asset filtering."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build_site import build


class StaticSiteTests(unittest.TestCase):
    def test_bundle_has_subpath_entry_and_excludes_private_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = root / "projects/001-demo"
            web = project / "web"
            web.mkdir(parents=True)
            (project / "README.md").write_text("Research", encoding="utf-8")
            (web / "index.html").write_text('<script src="app.js"></script>', encoding="utf-8")
            (web / "app.js").write_text("'use strict';", encoding="utf-8")
            (web / ".env").write_text("SECRET=example", encoding="utf-8")
            (web / "README.md").write_text("Not a public asset", encoding="utf-8")
            (web / "node_modules").mkdir()
            (web / "node_modules/unused.js").write_text("private", encoding="utf-8")
            downloads = web / "cases/example/downloads"
            downloads.mkdir(parents=True)
            for extension in ["pdf", "pptx", "mp4"]:
                (downloads / f"demo.{extension}").write_bytes(b"exported artifact")
            (web / "cases/example/validation.json").write_text("{}", encoding="utf-8")
            (web / "cases/example/config.json").write_text("{}", encoding="utf-8")
            (root / "projects.json").write_text(json.dumps([dict(id=1, slug="demo", name="A & B", repo="https://github.com/example/demo", summary="A < B", status="已完成", demo="", cover="")]), encoding="utf-8")
            build(root)
            output = root / "_site"
            self.assertTrue((output / "projects/001-demo/app.js").is_file())
            self.assertTrue((output / ".nojekyll").is_file())
            self.assertFalse((output / "projects/001-demo/.env").exists())
            self.assertFalse((output / "projects/001-demo/README.md").exists())
            self.assertFalse((output / "projects/001-demo/node_modules").exists())
            for extension in ["pdf", "pptx", "mp4"]:
                self.assertTrue((output / f"projects/001-demo/cases/example/downloads/demo.{extension}").is_file())
            self.assertTrue((output / "projects/001-demo/cases/example/validation.json").is_file())
            self.assertFalse((output / "projects/001-demo/cases/example/config.json").exists())
            index = (output / "index.html").read_text(encoding="utf-8")
            self.assertIn('./projects/001-demo/', index)
            self.assertIn('A &amp; B', index)
            self.assertIn('A &lt; B', index)


if __name__ == "__main__":
    unittest.main()
