"""Verify Atlas publication uses reviewed bytes and a strict file inventory."""

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from atlas_publish import publish_atlas


class AtlasPublicationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.project = self.root / "projects/006-ai-visual-atlas"
        self.publication = self.project / "publication"
        self.destination = self.root / "_site/projects/006-ai-visual-atlas"
        self.publication.mkdir(parents=True)
        self.entries = []
        self.register("index.html", b"<!doctype html><title>Public Atlas</title>")

    @staticmethod
    def write(base, relative, contents):
        target = base / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(contents)
        return target

    def register(self, relative, contents):
        self.write(self.publication, relative, contents)
        entry = {
            "path": relative,
            "sha256": hashlib.sha256(contents).hexdigest(),
            "bytes": len(contents),
        }
        self.entries.append(entry)
        return entry

    def save_manifest(self, entries=None):
        manifest = {"files": self.entries if entries is None else entries}
        (self.publication / "manifest.json").write_text(
            json.dumps(manifest), encoding="utf-8"
        )

    def publish(self):
        return publish_atlas(self.project, self.destination)

    def test_registered_binary_media_and_unicode_evidence_copy_exactly(self):
        # The publisher copies bytes; decoding/quality checks belong to production.
        png = b"\x89PNG\r\n\x1a\npublic-poster-fixture"
        mp4 = bytes.fromhex("000000186674797069736f6d0000020069736f6d69736f32")
        evidence = json.dumps({"subject": "网页宣传片", "frames": 576},
                              ensure_ascii=False).encode("utf-8")
        self.register("media/overview.png", png)
        self.register("media/demo.mp4", mp4)
        self.register("evidence/render.json", evidence)
        self.save_manifest()

        self.publish()

        for entry in self.entries:
            relative = entry["path"]
            self.assertEqual((self.destination / relative).read_bytes(),
                             (self.publication / relative).read_bytes(), relative)
        actual = {p.relative_to(self.destination).as_posix()
                  for p in self.destination.rglob("*") if p.is_file()}
        self.assertEqual(actual, {e["path"] for e in self.entries}
                         | {"publication-manifest.json"})
        self.assertFalse((self.destination / "manifest.json").exists())

    def test_unregistered_publication_and_original_local_files_are_not_copied(self):
        self.write(self.publication, "unreviewed-recording.wav", b"local fixture")
        self.write(self.publication, ".private/notes.txt", b"private fixture")
        self.write(self.project, "web/media/user-song.mp3", b"original audio fixture")
        self.write(self.project, "tooling/upstream/original.js", b"upstream fixture")
        self.save_manifest()

        self.publish()

        for relative in ["unreviewed-recording.wav", ".private/notes.txt",
                         "web/media/user-song.mp3", "tooling/upstream/original.js"]:
            self.assertFalse((self.destination / relative).exists(), relative)
        self.assertEqual((self.project / "web/media/user-song.mp3").read_bytes(),
                         b"original audio fixture")

    def test_hidden_absolute_and_parent_traversal_paths_are_rejected(self):
        bad_paths = ["../outside.txt", "media/../../outside.txt",
                     "..\\outside.txt", "/outside.txt", "C:/outside.txt",
                     "C:\\outside.txt", ".private/data.json", "media/.hidden.png"]
        for relative in bad_paths:
            with self.subTest(path=relative):
                bad = {"path": relative, "sha256": hashlib.sha256(b"fixture").hexdigest(),
                       "bytes": len(b"fixture")}
                self.save_manifest(self.entries + [bad])
                with self.assertRaises(ValueError):
                    self.publish()
                self.assertFalse(self.destination.exists())

    def test_hash_drift_is_rejected_before_any_destination_writes(self):
        self.register("media/demo.mp4", b"reviewed video fixture")
        self.save_manifest()
        (self.publication / "media/demo.mp4").write_bytes(b"REVIEWED video fixture")

        with self.assertRaises(ValueError):
            self.publish()

        self.assertFalse(self.destination.exists())

    def test_byte_count_drift_is_rejected_even_with_matching_hash(self):
        entry = self.register("evidence/result.json", b'{"checked":true}')
        entry["bytes"] += 1
        self.save_manifest()

        with self.assertRaises(ValueError):
            self.publish()

        self.assertFalse(self.destination.exists())

    def test_empty_inventory_is_rejected(self):
        self.save_manifest([])

        with self.assertRaises(ValueError):
            self.publish()

        self.assertFalse(self.destination.exists())

    def test_missing_registered_index_is_rejected(self):
        self.register("evidence/result.json", b"{}")
        self.save_manifest([self.entries[-1]])

        with self.assertRaises(ValueError):
            self.publish()

        self.assertFalse(self.destination.exists())

    def test_missing_registered_source_is_rejected(self):
        self.register("media/demo.mp4", b"reviewed fixture")
        self.save_manifest()
        (self.publication / "media/demo.mp4").unlink()

        with self.assertRaises(ValueError):
            self.publish()

        self.assertFalse(self.destination.exists())

    def create_symlink(self, link, target, is_directory=False):
        try:
            link.symlink_to(target, target_is_directory=is_directory)
        except (OSError, NotImplementedError) as exc:
            self.skipTest("Symlinks are unavailable in this test environment "
                          f"({type(exc).__name__}, errno={getattr(exc, 'errno', None)}).")

    def test_source_symlink_is_rejected_even_when_target_is_inside_publication(self):
        contents = b"reviewed fixture"
        target = self.write(self.publication, "media/actual.png", contents)
        link = self.publication / "media/linked.png"
        self.create_symlink(link, target)
        self.entries.append({"path": "media/linked.png",
                             "sha256": hashlib.sha256(contents).hexdigest(),
                             "bytes": len(contents)})
        self.save_manifest()

        with self.assertRaises(ValueError):
            self.publish()

        self.assertFalse(self.destination.exists())

    def test_symlinked_parent_cannot_escape_the_publication_root(self):
        contents = b"outside fixture"
        outside = self.root / "outside-assets"
        self.write(outside, "demo.png", contents)
        self.create_symlink(self.publication / "media", outside, is_directory=True)
        self.entries.append({"path": "media/demo.png",
                             "sha256": hashlib.sha256(contents).hexdigest(),
                             "bytes": len(contents)})
        self.save_manifest()

        with self.assertRaises(ValueError):
            self.publish()

        self.assertFalse(self.destination.exists())
        self.assertEqual((outside / "demo.png").read_bytes(), contents)

    def test_symlinked_parent_is_rejected_when_it_points_inside_publication(self):
        contents = b"inside fixture"
        self.write(self.publication, "actual-assets/demo.png", contents)
        self.create_symlink(self.publication / "media",
                            self.publication / "actual-assets", is_directory=True)
        self.entries.append({"path": "media/demo.png",
                             "sha256": hashlib.sha256(contents).hexdigest(),
                             "bytes": len(contents)})
        self.save_manifest()

        with self.assertRaises(ValueError):
            self.publish()

        self.assertFalse(self.destination.exists())

    def test_publication_directory_cannot_be_replaced_by_a_symlink(self):
        self.save_manifest()
        alternate = self.root / "alternate-project"
        alternate.mkdir()
        self.create_symlink(alternate / "publication", self.publication,
                            is_directory=True)

        with self.assertRaises(ValueError):
            publish_atlas(alternate, self.destination)

        self.assertFalse(self.destination.exists())

    def test_registered_destination_symlink_is_not_followed(self):
        self.save_manifest()
        self.destination.mkdir(parents=True)
        outside = self.write(self.root, "outside-output.html", b"keep unrelated fixture")
        self.create_symlink(self.destination / "index.html", outside)

        with self.assertRaises(ValueError):
            self.publish()

        self.assertEqual(outside.read_bytes(), b"keep unrelated fixture")
        self.assertFalse((self.destination / "publication-manifest.json").exists())

    def test_empty_existing_destination_is_allowed(self):
        self.destination.mkdir(parents=True)
        self.save_manifest()

        self.publish()

        self.assertEqual((self.destination / "index.html").read_bytes(),
                         (self.publication / "index.html").read_bytes())

    def test_existing_registered_files_and_generated_inventory_can_be_replaced(self):
        self.save_manifest()
        self.write(self.destination, "index.html", b"previous public page")
        self.write(self.destination, "publication-manifest.json", b"{}")

        self.publish()

        self.assertEqual((self.destination / "index.html").read_bytes(),
                         (self.publication / "index.html").read_bytes())
        self.assertIsInstance(json.loads(
            (self.destination / "publication-manifest.json").read_text(encoding="utf-8")), dict)

    def test_unknown_destination_file_causes_refusal_without_removing_anything(self):
        self.save_manifest()
        old_index = b"previous public page"
        old_unknown = b"unrelated old fixture"
        self.write(self.destination, "index.html", old_index)
        self.write(self.destination, "nested/unknown-old.txt", old_unknown)

        with self.assertRaises(ValueError):
            self.publish()

        self.assertEqual((self.destination / "index.html").read_bytes(), old_index)
        self.assertEqual((self.destination / "nested/unknown-old.txt").read_bytes(), old_unknown)
        self.assertFalse((self.destination / "publication-manifest.json").exists())

    def test_failed_source_validation_preserves_preexisting_registered_output(self):
        entry = self.register("media/demo.mp4", b"reviewed video fixture")
        self.save_manifest()
        (self.publication / entry["path"]).write_bytes(b"REVIEWED video fixture")
        self.write(self.destination, "index.html", b"previous public page")

        with self.assertRaises(ValueError):
            self.publish()

        self.assertEqual((self.destination / "index.html").read_bytes(), b"previous public page")
        self.assertFalse((self.destination / "media/demo.mp4").exists())
        self.assertFalse((self.destination / "publication-manifest.json").exists())


if __name__ == "__main__":
    unittest.main()
