"""Keep the 017 Pages package complete, reproducible, and isolated from private data."""
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "projects/017-waterfalls-lab"
sys.path.insert(0, str(ROOT / "scripts"))
from build_site import build
from waterfalls_publish import (
    EXPERIMENT_DATE, FOUNDATION, FOUNDATION_SHA256, GUIDE_HASHES,
    PROJECT_DOWNLOADS, PUBLICATION_DATE, PUBLIC_WEB_FILES,
    publish_waterfalls, verify_waterfalls_publication,
)


class WaterfallsPublicationTests(unittest.TestCase):
    def fixture(self, root):
        project = root / "projects/017-waterfalls-lab"
        for relative in PUBLIC_WEB_FILES:
            target = project / "web" / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(PROJECT / "web" / relative, target)
        for relative in (
            "assets/understanding-map.png", "assets/understanding-map.svg",
            *("assets/" + name for name in PROJECT_DOWNLOADS),
            "artifacts/" + FOUNDATION, "artifacts/" + FOUNDATION + ".sha256",
        ):
            target = project / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(PROJECT / relative, target)
        (project / "README.md").write_text("Waterfalls research fixture", encoding="utf-8")
        for relative in ("private.json", "README.md", ".env", "node_modules/unused.js",
                         ".internal/private.png", "upstream/scenes/private.json", "unreviewed.html"):
            target = project / "web" / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("private fixture only", encoding="utf-8")
        return project

    def test_actual_runtime_dependency_closure_downloads_and_original_guides(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "public"
            manifest = publish_waterfalls(PROJECT, output)
            result = verify_waterfalls_publication(PROJECT, output)
            self.assertEqual(result["files_checked"], len(PUBLIC_WEB_FILES) + 6)
            self.assertGreater(result["runtime_references_checked"], 80)
            self.assertEqual(manifest["publication_date"], PUBLICATION_DATE)
            self.assertEqual(manifest["experiment_snapshot_date"], EXPERIMENT_DATE)
            self.assertNotEqual(PUBLICATION_DATE, EXPERIMENT_DATE)
            for record in manifest["files"]:
                data = (output / record["path"]).read_bytes()
                self.assertEqual(record["bytes"], len(data))
                self.assertEqual(record["sha256"], hashlib.sha256(data).hexdigest())
            for suffix, digest in GUIDE_HASHES.items():
                original = (PROJECT / f"assets/understanding-map.{suffix}").read_bytes()
                self.assertEqual(hashlib.sha256(original).hexdigest(), digest)
                self.assertEqual(original, (output / f"research-assets/understanding-map.{suffix}").read_bytes())
                self.assertEqual(original, (output / f"assets/understanding-map.{suffix}").read_bytes())
            for name in PROJECT_DOWNLOADS:
                self.assertEqual((PROJECT / "assets" / name).read_bytes(), (output / "downloads" / name).read_bytes())
            self.assertEqual((output / "downloads" / FOUNDATION).read_bytes(), (PROJECT / "artifacts" / FOUNDATION).read_bytes())
            self.assertEqual(hashlib.sha256((output / "downloads" / FOUNDATION).read_bytes()).hexdigest(), FOUNDATION_SHA256)
            paths = {record["path"] for record in manifest["files"]}
            self.assertEqual(len([path for path in paths if path.endswith(".wgsl")]), 14)
            self.assertEqual(len([path for path in paths if path.startswith("upstream/scenes/") and path.endswith(".json")]), 7)
            for name in ("EA-PBMPM-LICENSE.txt", "BREAKPOINT-LICENSE.txt", "THREE-LICENSE.txt", "app.js.LEGAL.txt", "upstream/LICENSE.md"):
                self.assertIn(name, paths)

    def test_allowlist_excludes_private_and_unreviewed_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            project = self.fixture(root)
            output = root / "public"
            publish_waterfalls(project, output)
            verify_waterfalls_publication(project, output)
            for relative in ("private.json", "README.md", ".env", "node_modules/unused.js",
                             ".internal/private.png", "upstream/scenes/private.json", "unreviewed.html"):
                self.assertFalse((output / relative).exists(), relative)

    def test_missing_shader_fails_before_any_public_copy(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            project = self.fixture(root)
            (project / "web/upstream/shaders/g2p2g.wgsl").unlink()
            with self.assertRaisesRegex(ValueError, "g2p2g.wgsl"):
                publish_waterfalls(project, root / "public")
            self.assertFalse((root / "public").exists())

    def test_changed_original_guide_fails_before_copying(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            project = self.fixture(root)
            (project / "assets/understanding-map.png").write_bytes(b"changed original")
            with self.assertRaisesRegex(ValueError, "guide changed"):
                publish_waterfalls(project, root / "public")
            self.assertFalse((root / "public").exists())

    def test_runtime_wgsl_includes_are_checked(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            project = self.fixture(root)
            with (project / "web/upstream/shaders/g2p2g.wgsl").open("a", encoding="utf-8") as shader:
                shader.write("\n//!include missing-runtime-include\n")
            publish_waterfalls(project, root / "public")
            with self.assertRaisesRegex(ValueError, "missing-runtime-include"):
                verify_waterfalls_publication(project, root / "public")

    def test_manifest_detects_corruption_and_extra_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            output = root / "public"
            publish_waterfalls(PROJECT, output)
            (output / "upstream/scenes/damBreak.json").write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "resource changed"):
                verify_waterfalls_publication(PROJECT, output)
            publish_waterfalls(PROJECT, output)
            (output / "private.json").write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "unexpected or missing"):
                verify_waterfalls_publication(PROJECT, output)

    def test_catalog_build_keeps_017_complete_and_other_project_filtering(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.fixture(root)
            other = root / "projects/001-demo"
            (other / "web").mkdir(parents=True)
            (other / "README.md").write_text("Other demo", encoding="utf-8")
            (other / "web/index.html").write_text("<script src='app.js'></script>", encoding="utf-8")
            (other / "web/app.js").write_text("'use strict';", encoding="utf-8")
            (other / "web/private.json").write_text("{}", encoding="utf-8")
            records = [
                dict(id=1, slug="demo", name="Other demo", repo="https://github.com/example/demo",
                     summary="Independent demo", status="已完成", demo="", cover=""),
                dict(id=17, slug="waterfalls-lab", name="Waterfalls Lab", repo="https://github.com/electronicarts/pbmpm",
                     reference="https://x.com/mogmek/status/2105966008720900321", reference_name="Mogmek",
                     summary="能力：三维水景；原理：PB-MPM；方向：按业务扩展；价值：复用基座；边界：SDK 尚需封装",
                     status="已完成", demo="", cover="assets/understanding-map.png"),
            ]
            (root / "projects.json").write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
            build(root)
            output = root / "_site/projects/017-waterfalls-lab"
            verify_waterfalls_publication(root / "projects/017-waterfalls-lab", output)
            self.assertTrue((root / "_site/projects/001-demo/app.js").is_file())
            self.assertFalse((root / "_site/projects/001-demo/private.json").exists())
            self.assertFalse((root / "_site/projects/001-demo/publication-manifest.json").exists())
            index = (root / "_site/index.html").read_text(encoding="utf-8")
            self.assertIn("./projects/017-waterfalls-lab/understanding.html", index)
            self.assertIn("./projects/017-waterfalls-lab/assets/understanding-map.png", index)
            self.assertIn("汇总图", index)


if __name__ == "__main__":
    unittest.main()
