"""Verify the complete reviewed Creative library ships without source leakage."""

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "projects/015-ai-creative-products"
sys.path.insert(0, str(ROOT / "scripts"))
from creative_publish import GUIDE, GUIDE_SHA256, TEXT_SUFFIXES, publish_creative


class CreativePublicationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.project = self.root / "projects/015-ai-creative-products"
        self.web = self.project / "web"
        self.destination = self.root / "_site/projects/015-ai-creative-products"
        self.web.mkdir(parents=True)
        self.paths = ["index.html", GUIDE]
        self.write("index.html", b"<!doctype html><title>Creative library</title>\r\n")
        self.write(GUIDE, (PROJECT / "web" / GUIDE).read_bytes())
        self.save_inventory()

    def write(self, relative, data):
        target = self.web / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return target

    def save_inventory(self, paths=None):
        (self.project / "publication-files.json").write_text(
            json.dumps({"files": self.paths if paths is None else paths}),
            encoding="utf-8",
        )

    def publish(self):
        return publish_creative(self.project, self.destination)

    def assert_refused_before_writes(self):
        with self.assertRaises(ValueError):
            self.publish()
        self.assertFalse(self.destination.exists())

    def test_real_reviewed_inventory_copies_every_resource_with_correct_size_and_hash(self):
        inventory = json.loads((PROJECT / "publication-files.json").read_text(
            encoding="utf-8"))["files"]
        result = publish_creative(PROJECT, self.destination)

        self.assertEqual([item["path"] for item in result["files"]], inventory)
        actual = {path.relative_to(self.destination).as_posix()
                  for path in self.destination.rglob("*") if path.is_file()}
        self.assertEqual(actual, set(inventory) | {"publication-manifest.json"})
        self.assertTrue(result["original_guide_unchanged"])
        self.assertEqual(json.loads((self.destination / "publication-manifest.json")
                                   .read_text(encoding="utf-8")), result)

        for item in result["files"]:
            with self.subTest(resource=item["path"]):
                source = PROJECT / "web" / item["path"]
                expected = source.read_bytes()
                if source.suffix.lower() in TEXT_SUFFIXES:
                    expected = expected.replace(b"\r\n", b"\n")
                output = (self.destination / item["path"]).read_bytes()
                self.assertEqual(output, expected)
                self.assertEqual(item["bytes"], len(output))
                self.assertEqual(item["sha256"], hashlib.sha256(output).hexdigest())
                self.assertNotIn("__pycache__", Path(item["path"]).parts)
                self.assertNotIn("private", Path(item["path"]).parts)
                self.assertFalse(any(part.startswith(".") for part in Path(item["path"]).parts))

        self.assertEqual((self.destination / GUIDE).read_bytes(),
                         (PROJECT / "web" / GUIDE).read_bytes())
        self.assertEqual(hashlib.sha256((self.destination / GUIDE).read_bytes()).hexdigest(),
                         GUIDE_SHA256)

        # These are necessary to run the 3D scenes, inspect a produced video,
        # and download the explicit offline music recipe after deployment.
        required = {
            "labs/assets/boulder/boulder_01-lod.bin",
            "labs/assets/boulder/geometry.js",
            "labs/assets/pbr/kloofendal_48d_partly_cloudy_puresky.hdr",
            "labs/assets/pbr/studio_small_09.hdr",
            "labs/assets/three-module.js",
            "labs/assets/essay-type/noto-serif-sc.woff2",
            "labs/pipeline/music_blender.py",
            "labs/vendor/webm-muxer-5.1.4.mjs",
            "media/field-duet-v15.webm",
            "assets/library-overview/creative-products-capability-overview-v16.svg",
            "research.html", "index.html", "labs/index.html", "demo/index.html",
        }
        self.assertTrue(required.issubset(actual), sorted(required - actual))
        for relative in required:
            self.assertGreater((self.destination / relative).stat().st_size, 0, relative)

    def test_unreviewed_private_and_cache_files_are_not_copied(self):
        excluded = ["__pycache__/helper.pyc", "private/notes.json",
                    ".private/key.txt", "node_modules/dependency.js",
                    "unreviewed-recording.webm"]
        for relative in excluded:
            self.write(relative, b"local private fixture")
        (self.project / "local-notes.md").write_text("private fixture", encoding="utf-8")

        self.publish()

        for relative in excluded + ["local-notes.md", "publication-files.json"]:
            self.assertFalse((self.destination / relative).exists(), relative)
        published = (self.destination / "publication-manifest.json").read_text(encoding="utf-8")
        for relative in excluded:
            self.assertNotIn(relative, published)

    def test_parent_traversal_absolute_hidden_and_cache_paths_are_rejected(self):
        invalid = ["../outside.txt", "media/../../outside.txt", "..\\outside.txt",
                   "/outside.txt", "C:/outside.txt", "C:\\outside.txt",
                   ".private/secret.json", "media/.hidden.png",
                   "__pycache__/helper.pyc", "media/__pycache__/helper.pyc",
                   "node_modules/library.js"]
        for relative in invalid:
            with self.subTest(path=relative):
                self.save_inventory(self.paths + [relative])
                self.assert_refused_before_writes()

    def test_missing_reviewed_resource_stops_the_whole_publication(self):
        self.save_inventory(self.paths + ["media/missing-effect.webp"])
        self.assert_refused_before_writes()

    def test_missing_guide_or_duplicate_inventory_is_rejected(self):
        for paths in [[], ["index.html"], self.paths + ["index.html"]]:
            with self.subTest(paths=paths):
                self.save_inventory(paths)
                self.assert_refused_before_writes()

    def test_changed_original_guide_is_rejected_before_writes(self):
        self.write(GUIDE, b"replacement guide fixture")
        self.assert_refused_before_writes()

    def test_text_newlines_are_normalized_but_binary_data_is_preserved(self):
        binary = b"\x00\x01binary\r\nresource\xff"
        self.write("labs/assets/model.bin", binary)
        self.paths.append("labs/assets/model.bin")
        self.save_inventory()

        self.publish()

        self.assertEqual((self.destination / "index.html").read_bytes(),
                         (self.web / "index.html").read_bytes().replace(b"\r\n", b"\n"))
        self.assertEqual((self.destination / "labs/assets/model.bin").read_bytes(), binary)

    def create_symlink(self, link, target, is_directory=False):
        try:
            link.symlink_to(target, target_is_directory=is_directory)
        except (OSError, NotImplementedError) as exc:
            self.skipTest("Symlinks are unavailable in this environment "
                          f"({type(exc).__name__}, errno={getattr(exc, 'errno', None)}).")

    def test_source_symlink_cannot_publish_an_unreviewed_target(self):
        outside = self.root / "outside.txt"
        outside.write_bytes(b"private fixture")
        self.create_symlink(self.web / "linked.txt", outside)
        self.save_inventory(self.paths + ["linked.txt"])
        self.assert_refused_before_writes()
        self.assertEqual(outside.read_bytes(), b"private fixture")

    def test_symlinked_directory_cannot_escape_the_web_root(self):
        outside = self.root / "private-assets"
        outside.mkdir()
        (outside / "hidden.bin").write_bytes(b"private fixture")
        self.create_symlink(self.web / "linked-assets", outside, is_directory=True)
        self.save_inventory(self.paths + ["linked-assets/hidden.bin"])
        self.assert_refused_before_writes()


if __name__ == "__main__":
    unittest.main()
