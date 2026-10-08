"""Check the real reviewed Ridge release, without replacing its scene or images."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import struct
import subprocess
import sys
import tempfile
import unittest
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from ridge_publish import (
    ARTICLE_FILES, BASELINE, BASELINE_FILE_COUNT, BASELINE_MANIFEST, BASELINE_SHA256,
    COVER, EXPERIMENT_DATE, MANIFEST, PUBLICATION_DATE, RESEARCH_FILES, RUNTIME_ASSETS,
    publish_ridge_explorer, verify_ridge_publication,
)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def complete_image_dimensions(data):
    """Validate PNG chunks/zlib or complete JPEG framing using only the stdlib."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        offset = 8; compressed = []; width = height = channels = bits = None
        while offset < len(data):
            length = struct.unpack(">I", data[offset:offset + 4])[0]
            name = data[offset + 4:offset + 8]
            payload = data[offset + 8:offset + 8 + length]
            crc = data[offset + 8 + length:offset + 12 + length]
            if len(payload) != length or len(crc) != 4:
                raise AssertionError("Truncated PNG chunk")
            if zlib.crc32(name + payload) & 0xffffffff != struct.unpack(">I", crc)[0]:
                raise AssertionError("PNG chunk CRC failed")
            if name == b"IHDR":
                width, height, bits, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
                channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(color)
                if compression or filtering or interlace or not channels:
                    raise AssertionError("Unsupported screenshot PNG encoding")
            elif name == b"IDAT":
                compressed.append(payload)
            offset += length + 12
            if name == b"IEND":
                if offset != len(data) or not width or not height:
                    raise AssertionError("Incomplete PNG framing")
                decoded = zlib.decompress(b"".join(compressed))
                row = (width * channels * bits + 7) // 8 + 1
                if len(decoded) != height * row:
                    raise AssertionError("Incomplete PNG pixel rows")
                return width, height
        raise AssertionError("PNG has no IEND")
    if not data.startswith(b"\xff\xd8") or not data.endswith(b"\xff\xd9"):
        raise AssertionError("Image is neither a complete PNG nor a complete JPEG")
    offset = 2
    while offset < len(data):
        if data[offset] != 0xff:
            raise AssertionError("Invalid JPEG framing before the scan")
        while data[offset] == 0xff:
            offset += 1
        marker = data[offset]; offset += 1
        if marker in {0xd8, 0xd9} or 0xd0 <= marker <= 0xd7:
            continue
        length = struct.unpack(">H", data[offset:offset + 2])[0]
        if marker in {0xc0, 0xc1, 0xc2}:
            height, width = struct.unpack(">HH", data[offset + 3:offset + 7])
            return width, height
        offset += length
    raise AssertionError("JPEG has no image dimensions")


class RidgePublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        real = ROOT / "projects/019-ridge-explorer"
        required = [real / "web/index.html", *(real / "web" / name for name in RUNTIME_ASSETS),
                    *(real / "publication" / name for name in ARTICLE_FILES),
                    *(real / "assets" / name for name in RESEARCH_FILES)]
        required += [real.parent / "018-ridge-atmosphere-lab/releases" / name
                     for name in (BASELINE, BASELINE_MANIFEST)]
        missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
        if missing:
            raise AssertionError("Prepare the actual reviewed 019 publication before checks; missing: "
                                 + ", ".join(missing))
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        cls.workspace = Path(cls.temp.name)
        cls.project = cls.workspace / "projects/019-ridge-explorer"
        cls.destination = cls.workspace / "_site/projects/019-ridge-explorer"
        shutil.copytree(real / "web", cls.project / "web")
        shutil.copytree(real / "publication", cls.project / "publication")
        for name in RESEARCH_FILES:
            target = cls.project / "assets" / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(real / "assets" / name, target)
        cls.baseline = cls.project.parent / "018-ridge-atmosphere-lab/releases"
        cls.baseline.mkdir(parents=True)
        for name in (BASELINE, BASELINE_MANIFEST):
            shutil.copy2(real.parent / "018-ridge-atmosphere-lab/releases" / name, cls.baseline / name)
        cls.private = ("web/.env", "web/private/internal.txt", "web/assets/private.glb",
                       "web/assets/unreviewed.png", "publication/internal.json", "assets/private.jpg")
        for name in cls.private:
            target = cls.project / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(b"private sentinel must not be published")
        cls.manifest = publish_ridge_explorer(cls.project, cls.destination)

    def test_complete_real_scene_models_and_understanding_page_keep_portable_links(self):
        report = verify_ridge_publication(self.project, self.destination)
        self.assertEqual(report["files_checked"], 33)
        self.assertGreater(report["local_references_checked"], 10)
        self.assertEqual(report["publication_date"], PUBLICATION_DATE)
        self.assertEqual(report["experiment_snapshot_date"], EXPERIMENT_DATE)
        self.assertNotEqual(PUBLICATION_DATE, EXPERIMENT_DATE)
        self.assertEqual((self.destination / "index.html").read_bytes(),
                         (self.project / "web/index.html").read_bytes())
        self.assertIn('id="root"', (self.destination / "index.html").read_text(encoding="utf-8"))
        for name in ARTICLE_FILES:
            self.assertEqual((self.destination / name).read_bytes(),
                             (self.project / "publication" / name).read_bytes())
        for name in RUNTIME_ASSETS:
            self.assertEqual((self.destination / name).read_bytes(), (self.project / "web" / name).read_bytes())
            if name.endswith(".glb"):
                data = (self.destination / name).read_bytes()
                self.assertEqual(struct.unpack("<4sII", data[:12]), (b"glTF", 2, len(data)))
                self.assertGreater(len(data), 1000)
        self.assertIn("Attribution-NonCommercial-ShareAlike 3.0",
                      (self.destination / "assets/HORSE-LICENSE.txt").read_text(encoding="utf-8"))
        self.assertIn("Creative Commons Zero",
                      (self.destination / "assets/exploration/License.txt").read_text(encoding="utf-8"))
        article = (self.destination / "understanding.html").read_text(encoding="utf-8")
        self.assertIn("research-assets/explorer-v2-camp-polished.png", article)
        self.assertIn("downloads/" + BASELINE, article)
        self.assertIn("understanding.css", article)

    def test_all_ten_actual_captures_are_complete_and_cover_matches_the_hero(self):
        for name in RESEARCH_FILES:
            with self.subTest(image=name):
                data = (self.destination / "research-assets" / name).read_bytes()
                self.assertEqual(data, (self.project / "assets" / name).read_bytes())
                width, height = complete_image_dimensions(data)
                self.assertGreaterEqual(width, 300); self.assertGreaterEqual(height, 250)
        self.assertEqual((self.destination / COVER).read_bytes(),
                         (self.destination / "research-assets/explorer-v2-camp-polished.png").read_bytes())
        records = self.manifest["files"]
        self.assertEqual(len(records), len({record["path"] for record in records}))
        for record in records:
            data = (self.destination / record["path"]).read_bytes()
            self.assertEqual(len(data), record["bytes"]); self.assertEqual(sha256(data), record["sha256"])

    def test_only_named_resources_ship_and_unexpected_public_files_are_rejected(self):
        actual = {path.relative_to(self.destination).as_posix()
                  for path in self.destination.rglob("*") if path.is_file()}
        self.assertEqual(actual, {record["path"] for record in self.manifest["files"]} | {MANIFEST})
        for name in self.private:
            self.assertNotIn(name, actual)
            self.assertNotIn(name.removeprefix("web/"), actual)
        leaked = self.destination / "private.json"
        leaked.write_bytes(b"not approved")
        try:
            with self.assertRaisesRegex(ValueError, "unexpected or missing"):
                verify_ridge_publication(self.project, self.destination)
            with self.assertRaisesRegex(ValueError, "Unexpected existing"):
                publish_ridge_explorer(self.project, self.destination)
        finally:
            leaked.unlink()

    def test_resource_and_manifest_tampering_cannot_be_hidden_by_updated_metadata(self):
        target = self.destination / "understanding.css"
        original = target.read_bytes()
        manifest_path = self.destination / MANIFEST
        original_manifest = manifest_path.read_bytes()
        try:
            changed = original + b"\n/* unauthorised alteration */\n"
            target.write_bytes(changed)
            forged = json.loads(original_manifest)
            record = next(record for record in forged["files"] if record["path"] == "understanding.css")
            record.update(bytes=len(changed), sha256=sha256(changed))
            manifest_path.write_text(json.dumps(forged), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "resource changed"):
                verify_ridge_publication(self.project, self.destination)
            target.write_bytes(original)
            forged = json.loads(original_manifest)
            forged["experiment_snapshot_date"] = PUBLICATION_DATE
            manifest_path.write_text(json.dumps(forged), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "dates"):
                verify_ridge_publication(self.project, self.destination)
        finally:
            target.write_bytes(original); manifest_path.write_bytes(original_manifest)

    def test_frozen_baseline_has_the_pinned_hash_105_matching_members_and_valid_crc(self):
        archive_data = (self.destination / "downloads" / BASELINE).read_bytes()
        self.assertEqual(sha256(archive_data), BASELINE_SHA256)
        member_manifest = json.loads((self.destination / "downloads" / BASELINE_MANIFEST).read_bytes())
        with zipfile.ZipFile(self.destination / "downloads" / BASELINE) as archive:
            self.assertEqual(len(archive.infolist()), BASELINE_FILE_COUNT)
            self.assertIsNone(archive.testzip())
            for record in member_manifest["files"]:
                data = archive.read(record["path"])
                self.assertEqual(len(data), record["bytes"])
                self.assertEqual(sha256(data), record["sha256"])
        source_zip = self.baseline / BASELINE
        original_zip = source_zip.read_bytes()
        source_manifest = self.baseline / BASELINE_MANIFEST
        original_manifest = source_manifest.read_bytes()
        fresh = self.workspace / "rejected-baseline"
        try:
            source_zip.write_bytes(original_zip + b"still a ZIP, but not the frozen ZIP")
            with self.assertRaisesRegex(ValueError, "ZIP SHA-256 changed"):
                publish_ridge_explorer(self.project, fresh)
            self.assertFalse(fresh.exists(), "all sources must validate before any public write")
            source_zip.write_bytes(original_zip)
            altered = json.loads(original_manifest)
            altered["files"][0]["sha256"] = "0" * 64
            source_manifest.write_text(json.dumps(altered), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "baseline member changed"):
                publish_ridge_explorer(self.project, fresh)
            self.assertFalse(fresh.exists())
        finally:
            source_zip.write_bytes(original_zip); source_manifest.write_bytes(original_manifest)

    def test_symlinked_allowlisted_sources_and_destination_ancestors_are_rejected(self):
        def directory_link(link, target):
            try:
                link.symlink_to(target, target_is_directory=True)
                return "symlink"
            except OSError as error:
                if os.name != "nt":
                    self.skipTest(f"Host does not permit test symlinks: {error}")
            # A Windows junction exercises a real reparse point without requiring
            # the file-symlink privilege. This command creates a temporary link;
            # Python removes only that link, never its target or any source tree.
            result = subprocess.run(["cmd", "/d", "/c", "mklink", "/J", str(link), str(target)],
                                    capture_output=True, text=True, errors="replace")
            reparse = result.returncode == 0 and bool(link.lstat().st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT)
            if not reparse:
                self.skipTest("Host does not permit test directory reparse points")
            return "junction"

        def remove_link(link, kind):
            self.assertTrue(link.absolute().is_relative_to(self.workspace.absolute()))
            if kind == "junction":
                os.rmdir(link)
            else:
                link.unlink()

        source = self.project / "assets"
        backup = self.workspace / "source-captures"
        fresh = self.workspace / "rejected-link"
        source.rename(backup)
        kind = None
        try:
            kind = directory_link(source, backup)
            with self.assertRaisesRegex(ValueError, "symlink or junction"):
                publish_ridge_explorer(self.project, fresh)
            self.assertFalse(fresh.exists())
        finally:
            if kind:
                remove_link(source, kind)
            backup.rename(source)
        target = self.workspace / "write-target"
        target.mkdir(); linked_destination = self.workspace / "linked-destination"
        kind = directory_link(linked_destination, target)
        try:
            with self.assertRaisesRegex(ValueError, "symlink or junction"):
                publish_ridge_explorer(self.project, linked_destination / "019-ridge-explorer")
            self.assertEqual(list(target.iterdir()), [])
        finally:
            remove_link(linked_destination, kind)


if __name__ == "__main__":
    unittest.main()
