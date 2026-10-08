"""Package the real Ridge client and verify model, notices and subpath assets.

The client must already be built. These checks never invoke npm or create a
replacement scene; only non-public sentinels are added to the copied web tree.
"""
import hashlib
import json
import shutil
import struct
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_site import build


class AssetLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("src"):
            self.links.append(attrs["src"])
        if tag == "link" and attrs.get("rel") in {"stylesheet", "modulepreload"}:
            self.links.append(attrs["href"])


class RidgePackagingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        record = next(item for item in json.loads((ROOT / "projects.json").read_text(encoding="utf-8"))
                      if item["slug"] == "ridge-atmosphere-lab")
        cls.relative = Path(f"projects/{record['id']:03d}-{record['slug']}")
        cls.real_project = ROOT / cls.relative
        cls.real_web = cls.real_project / "web"
        required = ["index.html", "assets/horse.glb", "assets/HORSE-LICENSE.txt",
                    "assets/THREE-LICENSE.txt", "assets/SOURCE-NOTICE.txt", "assets/POLYHAVEN-LICENSE.txt",
                    "assets/pbr/ground-diff.jpg", "assets/pbr/ground-nor_gl.jpg", "assets/pbr/ground-rough.jpg", "assets/foliage-clump.png"]
        missing = [name for name in required if not (cls.real_web / name).is_file()]
        if missing:
            raise AssertionError("Build the Ridge client before packaging checks; missing: " + ", ".join(missing))

        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name)
        copied = cls.root / cls.relative
        shutil.copytree(cls.real_web, copied / "web")
        shutil.copy2(cls.real_project / "README.md", copied / "README.md")
        if record["cover"]:
            cover = copied / record["cover"]
            cover.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(cls.real_project / record["cover"], cover)

        # These are deliberately non-public files, not generated scene fixtures.
        for name in ("assets/private-horse.glb", "assets/internal-notes.txt",
                     "other/horse.glb", "other/HORSE-LICENSE.txt"):
            sentinel = copied / "web" / name
            sentinel.parent.mkdir(parents=True, exist_ok=True)
            sentinel.write_bytes(b"must not ship")

        unrelated = dict(record, id=record["id"] + 1, slug="unrelated-ridge-check", cover="")
        unrelated_path = cls.root / f"projects/{unrelated['id']:03d}-{unrelated['slug']}"
        shutil.copytree(cls.real_web, unrelated_path / "web")
        shutil.copy2(cls.real_project / "README.md", unrelated_path / "README.md")
        cls.unrelated_public = cls.root / "_site" / unrelated_path.relative_to(cls.root)
        (cls.root / "projects.json").write_text(json.dumps([record, unrelated], ensure_ascii=False), encoding="utf-8")
        build(cls.root)
        cls.public = cls.root / "_site" / cls.relative

    def test_real_model_and_notices_survive_packaging_byte_for_byte(self):
        for name in ("assets/horse.glb", "assets/HORSE-LICENSE.txt",
                     "assets/THREE-LICENSE.txt", "assets/SOURCE-NOTICE.txt", "assets/POLYHAVEN-LICENSE.txt",
                     "assets/pbr/ground-diff.jpg", "assets/pbr/ground-nor_gl.jpg", "assets/pbr/ground-rough.jpg", "assets/foliage-clump.png"):
            with self.subTest(asset=name):
                original = (self.real_web / name).read_bytes()
                packaged = (self.public / name).read_bytes()
                self.assertEqual(hashlib.sha256(packaged).digest(), hashlib.sha256(original).digest())
        model = (self.public / "assets/horse.glb").read_bytes()
        magic, version, size = struct.unpack("<4sII", model[:12])
        self.assertEqual(magic, b"glTF")
        self.assertEqual(version, 2)
        self.assertEqual(size, len(model))
        self.assertGreater(len(model), 100_000)
        notice = (self.public / "assets/HORSE-LICENSE.txt").read_text(encoding="utf-8")
        self.assertIn("Mirada", notice)
        self.assertIn("ROME", notice)
        self.assertIn("Attribution-NonCommercial-ShareAlike 3.0", notice)
        source = (self.public / "assets/SOURCE-NOTICE.txt").read_text(encoding="utf-8")
        self.assertIn("HORSE-LICENSE.txt", source)
        self.assertIn("https://x.com/tententen_777/status/2106077153293115629", source)

    def test_real_client_asset_paths_work_under_the_project_subpath(self):
        page = (self.public / "index.html").read_text(encoding="utf-8")
        parser = AssetLinks()
        parser.feed(page)
        self.assertTrue(parser.links, "The real client must reference its compiled JS/CSS.")
        for link in parser.links:
            with self.subTest(link=link):
                parts = urlsplit(link)
                self.assertFalse(parts.scheme or parts.netloc, "Client assets must remain local.")
                self.assertFalse(parts.path.startswith("/"), "Root-absolute assets break project hosting.")
                path = (self.public / unquote(parts.path)).resolve()
                self.assertTrue(path.is_relative_to(self.public.resolve()))
                self.assertTrue(path.is_file())
        javascript = "\n".join(path.read_text(encoding="utf-8") for path in self.public.rglob("*.js"))
        self.assertIn("assets/horse.glb", javascript, "The real renderer must use the packaged horse path.")

    def test_allowlist_stays_exact_and_scoped_to_the_ridge_project(self):
        for name in ("assets/private-horse.glb", "assets/internal-notes.txt",
                     "other/horse.glb", "other/HORSE-LICENSE.txt"):
            self.assertFalse((self.public / name).exists(), name)
        for name in ("assets/horse.glb", "assets/HORSE-LICENSE.txt", "assets/SOURCE-NOTICE.txt", "assets/POLYHAVEN-LICENSE.txt"):
            self.assertFalse((self.unrelated_public / name).exists(), name)


if __name__ == "__main__":
    unittest.main()
