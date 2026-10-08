"""Exercise 011's complete publication, not the author's private archive."""

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from soup_publish import RECORDINGS, UNPUBLISHED_LABEL, public_html, publish_soup


class SoupPublicationTests(unittest.TestCase):
    def write(self, root, relative, contents="fixture"):
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(contents, encoding="utf-8")
        return path

    def fixture(self, directory):
        root = Path(directory)
        project = root / "projects/011-combination-soup-studio"
        self.write(project, "web/index.html", '<img src="assets/understanding-map.png"><a href="foundry/showroom.html?example=toilet">马桶</a>')
        return project, root / "_site/projects/011-combination-soup-studio"

    def test_complete_pages_assets_recordings_and_licenses_are_flattened_together(self):
        with tempfile.TemporaryDirectory() as directory:
            project, output = self.fixture(directory)
            pages = ["index.html", "understanding.html", "understanding-map.html", "foundry/index.html", "foundry/studio.html", "foundry/showroom.html"]
            files = ["effects/runtime.js", "effects.css", "vendor/three-r160.min.js", "vendor/THREE-LICENSE.txt", "source-assets/SOURCE-NOTICE.txt", "source-assets/fonts/InstrumentSans-OFL.txt", "source-assets/fonts/IBMPlexMono-OFL.txt", "source-assets/fonts/CaveatBrush-OFL.txt", "source-assets/fonts/BagelFatOne-OFL.txt", "source-assets/fonts/f-caveat-brush-400.woff2", "source-assets/cookie-1.webp", "assets/understanding-map.png", "foundry/assets/headphone-hero-v12.webp", "foundry/assets/toilet-hero-v11.webp", "foundry/headphone-renderer.js", "foundry/toilet-renderer.js", "foundry/planning-contract.js", "foundry/zip.js"]
            for page in pages[1:]:
                self.write(project, "web/" + page, '<link rel="stylesheet" href="../style.css">')
            for asset in files:
                self.write(project, "web/" + asset)
            for recording in RECORDINGS:
                self.write(project, "assets/" + recording, "recording " + recording)
            manifest = publish_soup(project, output, [])
            for relative in pages + files + ["assets/" + name for name in RECORDINGS]:
                self.assertTrue((output / relative).is_file(), relative)
            self.assertFalse((output / "web").exists())
            self.assertCountEqual(manifest["pages"], pages)
            self.assertEqual(manifest["page_count"], 6)

    def test_private_configs_dependencies_notes_and_unreviewed_downloads_are_excluded(self):
        with tempfile.TemporaryDirectory() as directory:
            project, output = self.fixture(directory)
            excluded = ["web/.env", "web/.env.production", "web/.hidden/demo.js", "web/node_modules/dependency.js", "web/server/serve.js", "web/notes/draft.html", "web/downloads/intermediate.png", "web/config.json", "web/settings.json", "web/service.json", "web/credentials.json", "web/api-key.txt", "web/package.json", "web/package-lock.json", "web/unrelated.txt", "web/archive.zip", "notes/report.html", "notes/delivery.zip", "assets/other-recording.mp4", "assets/scene-polish-v8.webm"]
            for path in excluded:
                self.write(project, path, "private material")
            self.write(output, "stale-secret.json", "prior build")
            self.write(output, "web/old-index.html", "prior structure")
            publish_soup(project, output, [])
            for relative in excluded:
                flat = relative[4:] if relative.startswith("web/") else relative
                self.assertFalse((output / flat).exists(), relative)
            self.assertFalse((output / "stale-secret.json").exists())
            self.assertFalse((output / "web").exists())
            text = (output / "publication-manifest.json").read_text(encoding="utf-8")
            self.assertNotIn("private material", text)
            self.assertNotIn("credentials", text)
            self.assertNotIn("node_modules", text)

    def test_own_local_links_preserve_queries_fragments_and_ignore_published_registry(self):
        text, changes = public_html('<!doctype html><a class="button" href="http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/showroom.html?example=toilet&amp;revision=17#select">马桶</a><a href="http://localhost:8951/projects/011-combination-soup-studio/">首页</a><script>const label="Soup & Co";</script>', "foundry/studio.html", [])
        self.assertIn('href="showroom.html?example=toilet&amp;revision=17#select"', text)
        self.assertIn('href="../"', text)
        self.assertNotIn("127.0.0.1", text)
        self.assertNotIn(UNPUBLISHED_LABEL, text)
        self.assertIn('<script>const label="Soup & Co";</script>', text)
        self.assertEqual(changes["relative_links"], 2)

    def test_related_navigation_is_available_only_when_published(self):
        text, changes = public_html('<a href="../002-huashu-design/#source">设计</a><a href="../005-plush-lab/splat.html">毛绒</a><a class="research" href="http://127.0.0.1:8951/projects/008-cellmotion/workshop.html?x=1#motion" target="_blank"><strong>动效</strong>工作台</a><a href="../018-ridge-atmosphere-lab/">云海</a><a href="https://combinationsoupstudio.com.au/">原站</a><a href="./">本项目</a>', "understanding.html", [{"id": 2, "slug": "huashu-design"}, {"id": 5, "slug": "plush-lab"}])
        self.assertIn('href="../002-huashu-design/#source"', text)
        self.assertIn('href="../005-plush-lab/web/splat.html"', text)
        self.assertIn('<span class="research" data-publication="local-only"><strong>动效</strong>工作台', text)
        self.assertNotIn("008-cellmotion/workshop.html", text)
        self.assertNotIn("018-ridge-atmosphere-lab/", text)
        self.assertEqual(text.count(UNPUBLISHED_LABEL), 2)
        self.assertIn('href="https://combinationsoupstudio.com.au/"', text)
        self.assertIn('href="./"', text)
        self.assertEqual(changes["unpublished_links"], 2)

    def test_manifest_tracks_final_bytes_hashes_sources_and_original_is_not_changed(self):
        with tempfile.TemporaryDirectory() as directory:
            project, output = self.fixture(directory)
            original = '<a href="http://127.0.0.1:8951/projects/011-combination-soup-studio/">Home</a>'
            self.write(project, "web/understanding.html", original)
            self.write(project, "web/assets/image.webp", "actual bytes")
            manifest = publish_soup(project, output, [])
            stored = json.loads((output / "publication-manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(stored, manifest)
            self.assertEqual((project / "web/understanding.html").read_text(encoding="utf-8"), original)
            for record in stored["files"]:
                data = (output / record["path"]).read_bytes()
                source = (project / record["source"]).read_bytes()
                self.assertEqual(record["bytes"], len(data))
                self.assertEqual(record["sha256"], hashlib.sha256(data).hexdigest())
                self.assertEqual(record["source_sha256"], hashlib.sha256(source).hexdigest())
                self.assertFalse(Path(record["source"]).is_absolute())
            self.assertEqual(stored["bytes"], sum(record["bytes"] for record in stored["files"]))
            self.assertEqual(stored["file_count"], len(stored["files"]))

    def test_output_scope_is_verified_before_any_cleanup(self):
        with tempfile.TemporaryDirectory() as directory:
            project, output = self.fixture(directory)
            other = self.write(Path(directory), "unrelated/keep.txt", "preserve")
            with self.assertRaises(ValueError):
                publish_soup(project, other.parent, [])
            self.assertEqual(other.read_text(encoding="utf-8"), "preserve")
            with self.assertRaises(ValueError):
                publish_soup(project, project / "web", [])
            self.assertTrue((project / "web/index.html").is_file())


if __name__ == "__main__":
    unittest.main()
