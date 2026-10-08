import argparse
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("catalog", ROOT / "scripts/projects.py")
catalog = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(catalog)


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copytree(ROOT / "templates", self.root / "templates")
        shutil.copy(ROOT / "README.md", self.root / "README.md")
        (self.root / "projects").mkdir()
        (self.root / "projects.json").write_text("[]", encoding="utf-8")
        catalog.run(argparse.Namespace(command="render"), self.root)

    def add(self, slug="example"):
        catalog.run(argparse.Namespace(command="add", slug=slug, name="示例 | 项目",
                    repo="https://github.com/owner/repo", summary="研究 [核心] 功能"), self.root)
        return json.loads((self.root / "projects.json").read_text(encoding="utf-8"))

    def test_add_and_stable_order(self):
        self.add()
        projects = self.add("second")
        self.assertTrue((self.root / "projects/001-example/notes/research.md").is_file())
        self.assertTrue((self.root / "projects/002-second/web/README.md").is_file())
        readme = catalog.render_readme(self.root, list(reversed(projects)))
        self.assertLess(readme.index("| 001 |"), readme.index("| 002 |"))
        self.assertIn(r"示例 \| 项目", readme)
        self.assertIn('[owner/repo](https://github.com/owner/repo)', readme)
        self.assertNotIn('[GitHub](https://github.com/owner/repo)', readme)
        self.assertNotIn("{{", (self.root / "projects/001-example/README.md").read_text(encoding="utf-8"))
        catalog.run(argparse.Namespace(command="check"), self.root)

    def test_duplicate_slug_does_not_modify_files(self):
        self.add()
        before = (self.root / "projects.json").read_bytes()
        with self.assertRaises(ValueError):
            self.add()
        self.assertEqual(before, (self.root / "projects.json").read_bytes())
        self.assertFalse((self.root / "projects/002-example").exists())

    def test_cover_and_missing_image(self):
        projects = self.add()
        projects[0]["cover"] = "assets/overview.svg"
        with self.assertRaises(ValueError):
            catalog.validate(projects, self.root)
        (self.root / "projects/001-example/assets/overview.svg").write_text(
            '<svg xmlns="http://www.w3.org/2000/svg"/>', encoding="utf-8")
        catalog.validate(projects, self.root)
        self.assertIn("assets/overview.svg", catalog.render_readme(self.root, projects))
        projects[0]["cover"] = "assets/../../outside.png"
        with self.assertRaises(ValueError):
            catalog.validate(projects, self.root)

    def test_stale_index_detected(self):
        projects = self.add()
        projects[0]["status"] = "研究中"
        (self.root / "projects.json").write_text(json.dumps(projects), encoding="utf-8")
        with self.assertRaises(ValueError):
            catalog.run(argparse.Namespace(command="check"), self.root)

    def test_effect_reference_is_distinct_from_library_and_requires_valid_pair(self):
        projects = self.add()
        projects[0].update(reference="https://x.com/creator/status/123", reference_name="原效果")
        catalog.validate(projects, self.root)
        readme = catalog.render_readme(self.root, projects)
        self.assertIn('[原效果](https://x.com/creator/status/123)', readme)
        self.assertIn('技术：[owner/repo]', readme)
        projects[0]['reference'] = 'javascript:alert(1)'
        with self.assertRaises(ValueError):
            catalog.validate(projects, self.root)
        del projects[0]['reference_name']
        with self.assertRaises(ValueError):
            catalog.validate(projects, self.root)

    def test_duplicate_id_and_unregistered_directory(self):
        projects = self.add()
        with self.assertRaises(ValueError):
            catalog.validate(projects + projects, self.root)
        (self.root / "projects/002-unregistered").mkdir()
        with self.assertRaises(ValueError):
            catalog.validate(projects, self.root)

    def test_reference_only_project_preserves_source_without_inventing_repository(self):
        catalog.run(argparse.Namespace(command="add", slug="web-study", name="网页研究",
                    repo="", summary="原生浏览器交互", reference="https://example.com/game/",
                    reference_name="游戏原作"), self.root)
        projects = json.loads((self.root / "projects.json").read_text(encoding="utf-8"))
        catalog.validate(projects, self.root)
        readme = catalog.render_readme(self.root, projects)
        self.assertIn('[游戏原作](https://example.com/game/)', readme)
        self.assertIn('公开仓库未确认', readme)
        self.assertNotIn('技术：[]', readme)
        projects[0].pop('reference')
        projects[0].pop('reference_name')
        with self.assertRaises(ValueError):
            catalog.validate(projects, self.root)


if __name__ == "__main__":
    unittest.main()
