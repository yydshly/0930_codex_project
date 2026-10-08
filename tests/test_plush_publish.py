"""Verify the complete study ships safely at a GitHub Pages subpath."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build_site import build
from plush_publish import public_text, publish_plush


class PlushPublicationTests(unittest.TestCase):
    def write(self, project, path, contents="public"):
        target = project / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(contents, encoding="utf-8")
        return target

    def fixture(self, root):
        project = root / "projects/005-plush-lab"
        self.write(project, "README.md", "Research")
        self.write(project, "public-index.html", '<a href="web/project.html">Overview</a>')
        self.write(project, "web/index.html", '<script src="app.js"></script>')
        self.write(project, "web/project.html", '<img src="../artifacts/summary.png">')
        self.write(project, "web/engineering.html", "Native projects remain local")
        self.write(project, "web/app.js", "console.info('plush');")
        (root / "projects.json").write_text(json.dumps([dict(
            id=5, slug="plush-lab", name="Plush Lab", repo="https://github.com/mrdoob/three.js",
            summary="Plush research", status="研究中", demo="", cover=""
        )]), encoding="utf-8")
        return project

    def test_original_structure_retains_all_pages_and_linked_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = self.fixture(root)
            files = [
                "web/world.html", "web/studio.html", "web/splat.html", "web/reference-plush.html",
                "artifacts/reference-comparison.html", "artifacts/cycles-material-study.html",
                "artifacts/world-page-audit/report.html", "artifacts/summary.png",
                "artifacts/groom-report.json", "artifacts/render.log", "artifacts/generate.py",
                "notes/research.md", "notes/engineering-assets.json", "src/plush.js", "src/world-config.js",
                "tests/plush.test.mjs", "tests/world-config.test.mjs", "server/companion-server.mjs", "server/README.md",
                "tooling/build.mjs", "tooling/blender/groom.py", "tooling/package.json",
                "assets/guide.svg", "web/assets/reference-plush/manifest.json",
                "web/assets/reference-plush/part-0.sog", "web/app.js.LEGAL.txt",
                "web/THREE-LICENSE.txt", "web/reference-plush.js.LEGAL.txt",
                "web/assets/gaussian-sample.ply",
            ]
            for path in files:
                self.write(project, path)
            build(root)
            output = root / "_site/projects/005-plush-lab"
            for path in files:
                self.assertTrue((output / path).is_file(), path)
            self.assertTrue((output / "web/index.html").is_file())
            self.assertFalse((output / "app.js").exists())
            self.assertEqual((output / "index.html").read_text(encoding="utf-8"),
                             (output / "public-index.html").read_text(encoding="utf-8"))
            manifest = json.loads((output / "notes/publication-manifest.json").read_text(encoding="utf-8"))
            self.assertIn("artifacts/cycles-material-study.html", manifest["pages"])
            self.assertIn("src/plush.js", manifest["files"])

    def test_dependencies_configuration_native_projects_and_stale_output_are_excluded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = self.fixture(root)
            excluded = [
                "web/.env", "web/.private/picture.png", "tooling/node_modules/library.js",
                "tooling/__pycache__/helper.py", "server/credentials.json", "server/secret-key.txt",
                "server/private.json", "server/private/session.json", "server/settings.yaml",
                "server/config.json", "server/settings.json",
                "artifacts/character.blend", "artifacts/character.blend1", "notes/key.pem",
            ]
            for path in excluded:
                self.write(project, path, "private fixture")
            output = root / "_site/projects/005-plush-lab"
            self.write(output, "stale-secret.json", "stale")
            self.write(output, "app.js", "previous flat build")
            build(root)
            for path in excluded:
                self.assertFalse((output / path).exists(), path)
            self.assertFalse((output / "stale-secret.json").exists())
            self.assertFalse((output / "app.js").exists())
            manifest = (output / "notes/publication-manifest.json").read_text(encoding="utf-8")
            self.assertNotIn("secret-key", manifest)
            self.assertNotIn("credentials", manifest)
            self.assertNotIn("node_modules", manifest)

    def test_blend_links_open_inventory_without_download_attribute(self):
        html, changes = public_text(
            '<a href="cycles-study/character.blend" download="character.blend">工程</a>'
            '<a href="cycles-study/render.png" download>PNG</a>'
            '<a href="https://example.org/model.blend" download>External</a>',
            "artifacts/cycles-material-study.html",
        )
        self.assertIn('href="../web/engineering.html?asset=artifacts/cycles-study/character.blend">工程', html)
        self.assertNotIn('download="character.blend"', html)
        self.assertIn('href="cycles-study/render.png" download', html)
        self.assertIn('href="https://example.org/model.blend" download', html)
        self.assertEqual(changes["engineering_links"], 1)
        markdown, _ = public_text('[工程](../artifacts/character.blend)', "notes/study.md")
        self.assertEqual(markdown, '[工程](../web/engineering.html?asset=artifacts/character.blend)')

    def test_local_navigation_preserves_pages_subpath_queries_and_fragments(self):
        result, changes = public_text(
            '[世界](http://localhost:8875/projects/005-plush-lab/web/world.html?plushView=reference#actor)'
            '\n[首页](http://127.0.0.1:8875/projects/005-plush-lab/web/)'
            '\n本地接口 http://127.0.0.1:8876/api/health', "README.md",
        )
        self.assertIn('[世界](web/world.html?plushView=reference#actor)', result)
        self.assertIn('[首页](web/)', result)
        self.assertIn('http://127.0.0.1:8876/api/health', result)
        self.assertEqual(changes["local_links"], 2)
        nested, _ = public_text(
            '<a href="http://localhost:8875/projects/005-plush-lab/web/project.html#methods">研究</a>',
            "artifacts/audit/report.html",
        )
        self.assertIn('href="../../web/project.html#methods"', nested)

    def test_output_scope_is_checked_before_cleaning(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = self.fixture(root)
            preserved = self.write(root, "unrelated/sentinel.txt", "keep")
            with self.assertRaises(ValueError):
                publish_plush(project, root / "unrelated")
            self.assertEqual(preserved.read_text(encoding="utf-8"), "keep")

    def test_repository_backlink_targets_html_catalog_only_in_public_copy(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = self.fixture(root)
            original = "[返回研究集](../../README.md)\n[本项目](README.md)"
            self.write(project, "README.md", original)
            build(root)
            output = root / "_site/projects/005-plush-lab"
            self.assertEqual((project / "README.md").read_text(encoding="utf-8"), original)
            rendered = (output / "README.md").read_text(encoding="utf-8")
            self.assertIn("[返回研究集](../../index.html)", rendered)
            self.assertIn("[本项目](README.md)", rendered)
            self.assertTrue((output / "../../index.html").resolve().is_file())


if __name__ == "__main__":
    unittest.main()
