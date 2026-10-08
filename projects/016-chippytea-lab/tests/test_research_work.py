"""Real file evidence, reward uniqueness and scope checks for Chippytea Lab."""

import importlib.util
import io
import json
import shutil
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[3]
SPEC = importlib.util.spec_from_file_location(
    "research_work", ROOT / "projects/016-chippytea-lab/tooling/research_server.py")
research = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(research)


class ResearchWorkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / "projects/001-example"
        self.project.mkdir(parents=True)
        (self.project / "notes").mkdir()
        (self.project / "assets").mkdir()
        (self.root / "projects/016-chippytea-lab").mkdir()
        self.catalog = [{"id": 1, "slug": "example", "name": "真实研究例子",
                         "repo": "https://github.com/owner/repo", "summary": "文件结构与证据研究",
                         "status": "研究中", "demo": "", "cover": ""}]
        self.text = "本轮使用真实文件研究源码模块的调用关系，并记录实验环境、观察结果和仍然存在的限制。" * 6
        (self.project / "README.md").write_text("# 实际研究\n\n" + self.text, encoding="utf-8")
        (self.project / "notes/research.md").write_text("# 观察\n\n" + self.text, encoding="utf-8")
        (self.root / "README.md").write_text(
            "# 索引\n\n<!-- PROJECT_INDEX:START -->\n<!-- PROJECT_INDEX:END -->\n"
            "<!-- PROJECT_PREVIEWS:START -->\n<!-- PROJECT_PREVIEWS:END -->\n", encoding="utf-8")
        self.sync()
        self.store = research.ResearchStore(self.root)

    def sync(self):
        (self.root / "projects.json").write_text(json.dumps(self.catalog, ensure_ascii=False), encoding="utf-8")
        rendered = research.CATALOG_TOOLS.render_readme(self.root, self.catalog)
        (self.root / "README.md").write_text(rendered, encoding="utf-8")

    def item(self):
        return self.store.state()["projects"][0]

    def test_missing_documents_and_directory_block_collection(self):
        (self.project / "notes/research.md").unlink()
        self.assertFalse(self.item()["ready"])
        with self.assertRaises(research.ResearchError) as context:
            self.store.collect(1)
        self.assertEqual(context.exception.status, 409)
        self.assertFalse(self.store.ledger_path.exists())
        shutil.rmtree(self.project)
        self.assertFalse(self.item()["ready"])
        self.assertEqual(self.item()["checks"][0]["outcome"], "fail")
        with self.assertRaises(research.ResearchError):
            self.store.collect(1)

    def test_template_notes_do_not_count_as_research(self):
        template = (ROOT / "templates/project/notes/research.md").read_text(encoding="utf-8")
        (self.project / "notes/research.md").write_text(template, encoding="utf-8")
        self.assertLess(research._substantial(template), research.MIN_CONTENT_CHARS)
        self.assertFalse(self.item()["ready"])

    def test_generated_readme_template_is_not_substantial(self):
        template = (ROOT / "templates/project/README.md").read_text(encoding="utf-8")
        template = template.replace("{{ID}}", "001").replace("{{NAME}}", "example").replace("{{SUMMARY}}", self.text)
        template = template.replace("{{REPO}}", "https://github.com/owner/repo")
        (self.project / "README.md").write_text(template, encoding="utf-8")
        self.assertFalse(self.item()["ready"])

    def test_duplicate_collect_preserves_unique_receipt_and_first_time(self):
        first = self.store.collect(1)
        second = self.store.collect(1)
        self.assertTrue(first["collected"])
        self.assertFalse(second["collected"])
        self.assertFalse(second["updatedReceipt"])
        self.assertEqual(first["receipt"], second["receipt"])
        self.assertEqual(second["total"], 1)
        ledger = json.loads(self.store.ledger_path.read_text(encoding="utf-8"))
        self.assertEqual(len(ledger["receipts"]), 1)
        self.assertNotIn("current", ledger["receipts"][0])

    def test_content_change_updates_evidence_but_gives_no_new_reward(self):
        first = self.store.collect(1)
        (self.project / "notes/research.md").write_text(self.text + "实际修正：记录新的观察。", encoding="utf-8")
        self.assertFalse(self.item()["receipt"]["current"])
        second = self.store.collect(1)
        self.assertTrue(second["updatedReceipt"])
        self.assertFalse(second["newReceipt"])
        self.assertFalse(second["collected"])
        self.assertEqual(second["total"], 1)
        for key in ("id", "serial", "firstCollectedAt"):
            self.assertEqual(first["receipt"][key], second["receipt"][key])
        self.assertNotEqual(first["receipt"]["fingerprint"], second["receipt"]["fingerprint"])
        self.assertTrue(self.item()["receipt"]["current"])

    def test_failed_recheck_does_not_replace_existing_receipt(self):
        first = self.store.collect(1)
        before = self.store.ledger_path.read_bytes()
        (self.project / "README.md").unlink()
        with self.assertRaises(research.ResearchError) as context:
            self.store.collect(1)
        self.assertEqual(context.exception.status, 409)
        self.assertEqual(before, self.store.ledger_path.read_bytes())
        self.assertEqual(first["receipt"]["serial"], 1)

    def test_corrupt_ledger_is_preserved_and_never_reset(self):
        self.store.collect(1)
        for content in ("not-json", '{"version":1,"receipts":[{}]}'):
            self.store.ledger_path.write_text(content, encoding="utf-8")
            with self.assertRaises(research.ResearchError) as context:
                self.store.state()
            self.assertEqual(context.exception.code, "ledger_invalid")
            with self.assertRaises(research.ResearchError):
                self.store.collect(1)
            self.assertEqual(self.store.ledger_path.read_text(encoding="utf-8"), content)

    def test_empty_cover_and_absent_web_are_optional_but_missing_declared_cover_fails(self):
        item = self.item()
        self.assertTrue(item["ready"])
        self.assertEqual(item["cover"], "")
        self.assertEqual([c["outcome"] for c in item["checks"] if c["id"] in {"cover", "web"}], ["optional", "optional"])
        self.catalog[0]["cover"] = "assets/missing.jpg"
        self.sync()
        self.assertFalse(self.item()["ready"])
        self.assertEqual(next(c for c in self.item()["checks"] if c["id"] == "cover")["outcome"], "fail")

    def test_stale_index_blocks_then_sync_restores(self):
        self.catalog[0]["summary"] += "，已更新"
        (self.root / "projects.json").write_text(json.dumps(self.catalog, ensure_ascii=False), encoding="utf-8")
        self.assertFalse(self.item()["ready"])
        self.sync()
        self.assertTrue(self.item()["ready"])

    def test_path_traversal_and_non_catalog_ids_are_rejected(self):
        for project_id in ("../README.md", True, 0):
            with self.assertRaises(research.ResearchError) as context:
                self.store.collect(project_id)
            self.assertEqual(context.exception.status, 400)
        with self.assertRaises(research.ResearchError) as context:
            self.store.collect(99)
        self.assertEqual(context.exception.status, 404)
        for field, value in (("slug", "../outside"), ("cover", "assets/../../secret.png")):
            original = self.catalog[0][field]
            self.catalog[0][field] = value
            (self.root / "projects.json").write_text(json.dumps(self.catalog), encoding="utf-8")
            with self.assertRaises(research.ResearchError) as context:
                self.store.state()
            self.assertEqual(context.exception.code, "catalog_invalid")
            self.catalog[0][field] = original

    def test_parallel_collects_create_exactly_one_receipt(self):
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda _: self.store.collect(1), range(12)))
        self.assertEqual(sum(result["newReceipt"] for result in results), 1)
        self.assertEqual(self.store.state()["total"], 1)
        self.assertFalse(list(self.store.ledger_path.parent.glob(".research-collection-*.tmp")))

    def test_atomic_replace_failure_preserves_previous_ledger(self):
        self.store.collect(1)
        before = self.store.ledger_path.read_bytes()
        (self.project / "notes/research.md").write_text(self.text + "新的实测记录。", encoding="utf-8")
        with patch.object(research.os, "replace", side_effect=OSError("simulated locked target")):
            with self.assertRaises(research.ResearchError) as context:
                self.store.collect(1)
        self.assertEqual(context.exception.code, "ledger_write_failed")
        self.assertEqual(before, self.store.ledger_path.read_bytes())
        self.assertFalse(list(self.store.ledger_path.parent.glob(".research-collection-*.tmp")))

    def test_api_accepts_only_project_id_and_same_origin(self):
        Handler = research.handler_for(self.store)
        handler = Handler.__new__(Handler)
        handler.path = "/api/research/collect"
        handler.server = SimpleNamespace(server_port=8977)
        responses = []
        handler._json = lambda value, status=200: responses.append((status, value))

        def request(body, origin="http://127.0.0.1:8977"):
            encoded = json.dumps(body).encode("utf-8")
            handler.headers = {"Content-Type": "application/json", "Content-Length": str(len(encoded)), "Origin": origin}
            handler.rfile = io.BytesIO(encoded)
            handler.do_POST()
            return responses[-1]

        self.assertEqual(request({"projectId": 1}, "https://unrelated.example")[0], 403)
        self.assertEqual(request({"projectId": 1, "path": "../outside"})[0], 400)
        self.assertFalse(self.store.ledger_path.exists())
        status, body = request({"projectId": 1})
        self.assertEqual(status, 200)
        self.assertTrue(body["newReceipt"])
        handler.path = "/api/research/state"
        handler.do_GET()
        self.assertEqual(responses[-1][1]["mode"], "live")
        self.assertEqual(responses[-1][1]["total"], 1)

    def test_static_path_traversal_rejected_without_starting_server(self):
        Handler = research.handler_for(self.store)
        handler = Handler.__new__(Handler)
        errors = []
        handler.send_error = lambda status, *args: errors.append(status)
        for path in ("/../README.md", "/%2e%2e/README.md", "/..%5cREADME.md"):
            handler.path = path
            handler.do_GET()
            handler.do_HEAD()
        self.assertEqual(errors, [404] * 6)

    def test_snapshot_is_read_only_and_labels_its_limit(self):
        snapshot_spec = importlib.util.spec_from_file_location(
            "research_snapshot_test", ROOT / "projects/016-chippytea-lab/tooling/research_snapshot.py")
        snapshot = importlib.util.module_from_spec(snapshot_spec)
        with patch.dict(sys.modules, {"research_server": research}):
            snapshot_spec.loader.exec_module(snapshot)
        (self.root / "projects/016-chippytea-lab/web").mkdir()
        with patch.object(snapshot, "ROOT", self.root), patch.object(snapshot, "ResearchStore", return_value=self.store):
            self.assertEqual(snapshot.main(), 0)
        data = json.loads((self.root / "projects/016-chippytea-lab/web/research-state.json").read_text(encoding="utf-8"))
        self.assertEqual(data["mode"], "snapshot")
        self.assertIn("无法", data["snapshotNotice"])
        self.assertFalse(self.store.ledger_path.exists())

    def test_note_link_outside_project_is_not_read(self):
        (self.root / "personal.md").write_text(self.text, encoding="utf-8")
        link = self.project / "notes/external.md"
        try:
            link.symlink_to(self.root / "personal.md")
        except OSError:
            self.skipTest("This Windows account cannot create symbolic links")
        self.assertFalse(self.item()["ready"])
        notes = next(check for check in self.item()["checks"] if check["id"] == "notes")
        self.assertEqual(notes["outcome"], "fail")
        self.assertIn("目录之外", notes["detail"])


if __name__ == "__main__":
    unittest.main()
