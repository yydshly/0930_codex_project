"""A local, evidence-based research collection service (Python stdlib only).

Only catalogued projects and a fixed set of workspace documents are inspected.
Passing checks establish that research files exist and are indexed; they do not
establish the correctness, originality, completeness or quality of that research.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import re
import sys
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[3]
MAX_TEXT_BYTES = 2 * 1024 * 1024
MIN_CONTENT_CHARS = 100
LEDGER_RELATIVE = "projects/016-chippytea-lab/notes/research-collection.json"
CHECK_LABELS = {
    "directory": "项目目录", "index": "总索引同步", "source": "来源登记",
    "readme": "研究说明", "notes": "实质研究笔记", "cover": "登记封面",
    "web": "展示入口",
}
CRITERIA = {
    "scope": "只核验清单项目的目录、索引、来源字段及预定义文档/封面/入口；不读取其他个人数据。",
    "meaning": "工作区结构核验，不代表研究结论、语义、审美或质量通过。",
    "minimumContentChars": MIN_CONTENT_CHARS,
    "contentRule": "README 和至少一份 notes 顶层 .md：去掉注释、标题、链接地址及已知模板提示后至少 100 个非空白字符；这是粗略结构规则。",
    "rewardRule": "每个项目只入册一次；更新资料可更新同一回执的核验，不增加藏册数量。",
    "optional": "未登记封面或未建立 web/index.html 是可选项；登记了封面但文件不存在则失败。",
}


def _load_catalog_tools():
    spec = importlib.util.spec_from_file_location("research_catalog_tools", ROOT / "scripts/projects.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CATALOG_TOOLS = _load_catalog_tools()


class ResearchError(Exception):
    def __init__(self, message, code="research_error", status=503, project=None):
        super().__init__(message)
        self.code, self.status, self.project = code, status, project


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _digest(value):
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _substantial(text):
    if ("本项目尚未部署。演示源码可放在" in text
            and sum(text.count(phrase) for phrase in ("待补充", "待验证", "待研究后补充")) >= 3):
        return 0
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = re.sub(r"\{\{[^}]*\}\}", "", text)
    text = re.sub(r"^\s*#{1,6}\s+.*$", "", text, flags=re.M)
    text = re.sub(r"\]\([^)]*\)", "]", text)
    text = re.sub(r"https?://\S+", "", text)
    for phrase in (
        "待补充", "待验证", "待研究后补充", "待核实", "待记录", "尚未添加截图",
        "理解项目定位、主要功能和适用边界", "跑通最小示例并记录环境与步骤",
        "梳理架构与关键实现", "总结可复用经验与局限", "本目录为研究记录",
        "待填写", "补充本轮研究发现",
        "记录步骤、预期结果、实际结果，以及遇到的问题和解决方式。",
        "记录关键模块、数据流、设计选择，以及对应的源码文件或链接。",
        "分别记录已验证结论、适用条件、局限和待验证假设。",
    ):
        text = text.replace(phrase, "")
    return len(re.sub(r"\s", "", text))


class ResearchStore:
    def __init__(self, root=ROOT):
        self.root = Path(root).resolve()
        self.ledger_path = self.root / LEDGER_RELATIVE
        self.lock = threading.RLock()

    def _safe(self, relative):
        """Resolve a fixed/catalog path while refusing symlinks escaping root."""
        parts = PurePosixPath(relative).parts
        if (not relative or PurePosixPath(relative).is_absolute() or "\\" in relative
                or ":" in relative or any(part in {".", ".."} for part in parts)):
            raise ResearchError("项目文件路径超出核验范围。", "out_of_scope")
        path = self.root.joinpath(*parts)
        if not path.resolve().is_relative_to(self.root):
            raise ResearchError("项目文件链接指向工作区之外。", "out_of_scope")
        if parts[0] == "projects" and len(parts) >= 2:
            anchor = self.root / "projects" / parts[1]
            if not path.resolve().is_relative_to(anchor):
                raise ResearchError("文件链接指向该项目目录之外。", "out_of_scope")
        elif path.resolve() != path:
            raise ResearchError("固定核验文件不能链接到其他文件。", "out_of_scope")
        return path

    def _catalog(self):
        try:
            path = self._safe("projects.json")
            if path.stat().st_size > MAX_TEXT_BYTES:
                raise ValueError("清单超出大小限制")
            projects = json.loads(path.read_text(encoding="utf-8"))
            CATALOG_TOOLS.validate(projects, self.root, check_files=False)
            return sorted(projects, key=lambda project: project["id"])
        except (OSError, UnicodeError, ValueError, KeyError, TypeError) as error:
            raise ResearchError(f"无法读取有效项目清单：{error}", "catalog_invalid") from error

    def _text(self, relative):
        path = self._safe(relative)
        if not path.is_file():
            return None, None
        try:
            size = path.stat().st_size
            if size > MAX_TEXT_BYTES:
                raise ResearchError(f"文本超过 2 MiB 核验上限：{relative}", "file_too_large")
            data = path.read_bytes()
            return data.decode("utf-8-sig").replace("\r\n", "\n").replace("\r", "\n"), {
                "path": relative, "size": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                "modifiedAt": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
            }
        except (OSError, UnicodeError) as error:
            raise ResearchError(f"核验文件无法读取：{relative}", "file_unreadable") from error

    def _index(self, projects):
        text, _ = self._text("README.md")
        if text is None:
            return False, "主 README 不存在。", ""
        try:
            expected = CATALOG_TOOLS.render_readme(self.root, projects)
        except (ValueError, OSError) as error:
            return False, f"主 README 生成标记无效：{error}", text
        return text == expected, ("生成索引与清单一致。" if text == expected else "生成索引与清单不同；需运行 scripts/projects.py render。"), text

    @staticmethod
    def _project_index_excerpt(text, number):
        row = next((line for line in text.splitlines() if line.startswith(f"| {number:03d} |")), "")
        preview = re.search(rf"^### {number:03d} · .*?(?=^### |<!-- PROJECT_PREVIEWS:END -->|\Z)", text, flags=re.M | re.S)
        return row + "\n" + (preview.group(0).rstrip() if preview else "")

    def _inspect(self, project, index):
        relative = CATALOG_TOOLS.project_path(project)
        checks = []
        files = []

        def check(key, outcome, path, detail, required=True, evidence=None):
            record = {"id": key, "label": CHECK_LABELS[key], "required": required,
                      "outcome": outcome, "path": path, "detail": detail}
            if evidence is not None:
                record["evidence"] = evidence
                entries = evidence if isinstance(evidence, list) else [evidence]
                files.extend({key: item[key] for key in ("path", "size", "sha256") if key in item} for item in entries)
            checks.append(record)

        folder = self._safe(relative)
        exists = folder.is_dir()
        check("directory", "pass" if exists else "fail", relative,
              "已存在清单对应目录。" if exists else "项目目录不存在；不能入册。")
        index_ok, index_detail, index_text = index
        excerpt = self._project_index_excerpt(index_text, project["id"])
        check("index", "pass" if index_ok else "fail", "README.md", index_detail,
              evidence={"path": "README.md#project-" + str(project["id"]),
                        "size": len(excerpt.encode("utf-8")), "sha256": hashlib.sha256(excerpt.encode("utf-8")).hexdigest()})
        source = project["repo"] or project.get("reference", "")
        check("source", "pass", "projects.json", f"清单含有效 HTTPS 来源字段：{source}；未访问或核验上游内容。")

        try:
            text, evidence = self._text(relative + "/README.md")
            count = _substantial(text or "")
            enough = text is not None and count >= MIN_CONTENT_CHARS and "{{" not in text
            check("readme", "pass" if enough else "fail", relative + "/README.md",
                  f"去掉模板提示后 {count} 个非空白字符；阈值 {MIN_CONTENT_CHARS}。只确认材料存在。", evidence=evidence)
        except ResearchError as error:
            check("readme", "fail", relative + "/README.md", str(error))

        notes_relative = relative + "/notes"
        note_evidence, note_counts = [], []
        try:
            notes_path = self._safe(notes_relative)
            if notes_path.is_dir():
                # Top-level Markdown only: no recursion, no arbitrary/user paths.
                for path in sorted(notes_path.glob("*.md"), key=lambda item: item.name):
                    text, evidence = self._text(notes_relative + "/" + path.name)
                    if evidence:
                        note_evidence.append(evidence)
                        note_counts.append((path.name, _substantial(text or "")))
            substantial = [name for name, count in note_counts if count >= MIN_CONTENT_CHARS]
            detail = (f"{len(note_counts)} 份顶层 Markdown；{len(substantial)} 份满足 100 字符粗略阈值。"
                      + ("符合：" + "、".join(substantial) if substantial else "尚无实质笔记。"))
            check("notes", "pass" if substantial else "fail", notes_relative, detail, evidence=note_evidence)
        except ResearchError as error:
            check("notes", "fail", notes_relative, str(error), evidence=note_evidence)

        cover = project["cover"]
        if not cover:
            check("cover", "optional", relative + "/assets", "没有登记封面；按仓库约定为可选项。", required=False)
        else:
            try:
                path = self._safe(relative + "/" + cover)
                if not path.is_file():
                    check("cover", "fail", relative + "/" + cover, "清单登记的封面文件不存在。")
                else:
                    # Hash the declared cover, without interpreting or scanning other assets.
                    digest = hashlib.sha256()
                    with path.open("rb") as stream:
                        for block in iter(lambda: stream.read(65536), b""):
                            digest.update(block)
                    check("cover", "pass", relative + "/" + cover, "登记图片存在且可读取；未判断画面质量。",
                          evidence={"path": relative + "/" + cover, "size": path.stat().st_size, "sha256": digest.hexdigest()})
            except (ResearchError, OSError) as error:
                check("cover", "fail", relative + "/" + cover, str(error))

        try:
            web_relative = relative + "/web/index.html"
            text, evidence = self._text(web_relative)
            web_readme, web_evidence = self._text(relative + "/web/README.md")
            web_files = [item for item in (evidence, web_evidence) if item]
            if text is None:
                check("web", "optional", web_relative, "未建立 Web 入口；研究文档仍可入册。", required=False, evidence=web_files)
            else:
                usable = bool(text.strip())
                check("web", "pass" if usable else "fail", web_relative,
                      "Web 入口文件存在；未证明页面或功能运行通过。" if usable else "Web 入口为空。",
                      evidence=web_files)
        except ResearchError as error:
            check("web", "fail", relative + "/web/index.html", str(error))

        ready = all(item["outcome"] == "pass" for item in checks if item["required"])
        fingerprint = _digest({"catalogEntry": project, "files": files,
                               "outcomes": [(item["id"], item["required"], item["outcome"]) for item in checks]})
        return {"id": project["id"], "slug": project["slug"], "name": project["name"],
                "status": project["status"], "path": relative, "cover": project["cover"],
                "repo": project["repo"], "reference": project.get("reference", ""),
                "checks": checks, "ready": ready,
                "fingerprint": fingerprint, "contentHash": fingerprint, "receipt": None}

    def _ledger(self):
        path = self._safe(LEDGER_RELATIVE)
        if not path.exists():
            return {"version": 1, "receipts": []}
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, dict) or set(data) != {"version", "receipts"} or data["version"] != 1 or not isinstance(data["receipts"], list):
                raise ValueError("未知账本结构或版本")
            project_ids, receipt_ids, serials = set(), set(), set()
            required = {"id", "projectId", "name", "fingerprint", "checkedAt", "firstCollectedAt", "checks", "serial"}
            for receipt in data["receipts"]:
                if not isinstance(receipt, dict) or set(receipt) != required:
                    raise ValueError("回执字段不完整")
                if (type(receipt["projectId"]) is not int or receipt["projectId"] < 1 or receipt["projectId"] in project_ids
                        or type(receipt["serial"]) is not int or receipt["serial"] < 1 or receipt["serial"] in serials
                        or not isinstance(receipt["id"], str) or receipt["id"] in receipt_ids
                        or not isinstance(receipt["name"], str) or not receipt["name"].strip()
                        or not isinstance(receipt["fingerprint"], str) or not re.fullmatch(r"[0-9a-f]{64}", receipt["fingerprint"])):
                    raise ValueError("回执编号或指纹无效")
                uuid.UUID(receipt["id"])
                for field in ("checkedAt", "firstCollectedAt"):
                    datetime.fromisoformat(receipt[field].replace("Z", "+00:00"))
                if not isinstance(receipt["checks"], list) or len(receipt["checks"]) != len(CHECK_LABELS) or {check["id"] for check in receipt["checks"]} != set(CHECK_LABELS):
                    raise ValueError("回执核验项目不完整")
                for check in receipt["checks"]:
                    if (check.get("outcome") not in {"pass", "optional"} or type(check.get("required")) is not bool
                            or check["required"] and check["outcome"] != "pass"):
                        raise ValueError("回执未包含通过的结构核验")
                project_ids.add(receipt["projectId"])
                receipt_ids.add(receipt["id"])
                serials.add(receipt["serial"])
            if serials != set(range(1, len(data["receipts"]) + 1)):
                raise ValueError("回执序号不连续")
            return data
        except (OSError, UnicodeError, ValueError, KeyError, TypeError, AttributeError) as error:
            raise ResearchError("入册账本损坏或无法读取；已保留原文件，未重置。", "ledger_invalid") from error

    def _write_ledger(self, ledger):
        path = self._safe(LEDGER_RELATIVE)
        owner = self._safe("projects/016-chippytea-lab")
        if not owner.is_dir():
            raise ResearchError("入册实验的项目目录不存在。", "ledger_directory_missing")
        path.parent.mkdir(exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="\n", dir=path.parent,
                                             prefix=".research-collection-", suffix=".tmp", delete=False) as stream:
                temporary = Path(stream.name)
                json.dump(ledger, stream, ensure_ascii=False, indent=2)
                stream.write("\n")
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, path)
        except OSError as error:
            raise ResearchError("入册记录未能原子保存；请检查文件权限。", "ledger_write_failed") from error
        finally:
            if temporary and temporary.exists():
                temporary.unlink()

    def state(self):
        with self.lock:
            projects = self._catalog()
            ledger = self._ledger()
            index = self._index(projects)
            inspected = [self._inspect(project, index) for project in projects]
            by_id = {project["id"]: project for project in inspected}
            receipts = []
            for receipt in ledger["receipts"]:
                project = by_id.get(receipt["projectId"])
                decorated = dict(receipt, current=bool(project and project["ready"] and project["fingerprint"] == receipt["fingerprint"]))
                receipts.append(decorated)
                if project:
                    project["receipt"] = decorated
            return {"mode": "live", "scannedAt": _now(), "criteria": CRITERIA,
                    "projects": inspected, "receipts": receipts, "total": len(receipts),
                    "readyCount": sum(project["ready"] for project in inspected),
                    "uncollectedReadyCount": sum(project["ready"] and not project["receipt"] for project in inspected),
                    "ledgerPath": LEDGER_RELATIVE}

    def collect(self, project_id):
        if type(project_id) is not int or project_id < 1:
            raise ResearchError("projectId 必须是清单中的正整数。", "invalid_project", 400)
        with self.lock:
            state = self.state()  # Re-read files and ledger; never trust a client fingerprint.
            project = next((item for item in state["projects"] if item["id"] == project_id), None)
            if project is None:
                raise ResearchError("项目不在当前清单中。", "project_not_found", 404)
            if not project["ready"]:
                raise ResearchError("结构核验未通过；未入册、未增加奖励。", "not_ready", 409, project)
            ledger = self._ledger()
            receipt = next((item for item in ledger["receipts"] if item["projectId"] == project_id), None)
            new_receipt = receipt is None
            updated_receipt = bool(receipt and receipt["fingerprint"] != project["fingerprint"])
            if new_receipt:
                now = _now()
                receipt = {"id": str(uuid.uuid4()), "projectId": project_id, "name": project["name"],
                           "fingerprint": project["fingerprint"], "checkedAt": now, "firstCollectedAt": now,
                           "checks": project["checks"], "serial": len(ledger["receipts"]) + 1}
                ledger["receipts"].append(receipt)
            elif updated_receipt:
                receipt.update(name=project["name"], fingerprint=project["fingerprint"],
                               checkedAt=_now(), checks=project["checks"])
            if new_receipt or updated_receipt:
                self._write_ledger(ledger)
            decorated = dict(receipt, current=True)
            project["receipt"] = decorated
            return {"collected": new_receipt, "newReceipt": new_receipt, "updatedReceipt": updated_receipt,
                    "receipt": decorated, "project": project, "total": len(ledger["receipts"])}


def handler_for(store):
    site = (store.root / "_site").resolve()

    class ResearchHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(site), **kwargs)

        def _json(self, value, status=200):
            body = json.dumps(value, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(body)

        def _error(self, error):
            body = {"error": str(error), "code": error.code}
            if error.project is not None:
                body["project"] = error.project
            self._json(body, error.status)

        def do_GET(self):
            route = urlsplit(self.path).path
            if route == "/api/research/state":
                try:
                    self._json(store.state())
                except ResearchError as error:
                    self._error(error)
                return
            if route.startswith("/api/"):
                self._json({"error": "未知 API。", "code": "not_found"}, 404)
                return
            decoded = unquote(route)
            candidate = site.joinpath(decoded.lstrip("/"))
            if ("\\" in decoded or "\x00" in decoded or ".." in PurePosixPath(decoded).parts
                    or not candidate.resolve().is_relative_to(site)):
                self.send_error(404)
                return
            super().do_GET()

        def do_HEAD(self):
            decoded = unquote(urlsplit(self.path).path)
            candidate = site.joinpath(decoded.lstrip("/"))
            if ("\\" in decoded or "\x00" in decoded or ".." in PurePosixPath(decoded).parts
                    or not candidate.resolve().is_relative_to(site)):
                self.send_error(404)
                return
            super().do_HEAD()

        def list_directory(self, path):
            self.send_error(404, "Directory listing is disabled")
            return None

        def do_POST(self):
            if self.path != "/api/research/collect":
                self._json({"error": "未知 API。", "code": "not_found"}, 404)
                return
            origin = self.headers.get("Origin")
            expected = f"http://127.0.0.1:{self.server.server_port}"
            if origin and origin != expected:
                self._json({"error": "只允许本机页面同源提交。", "code": "origin_rejected"}, 403)
                return
            try:
                if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                    raise ResearchError("请提交 application/json。", "invalid_body", 415)
                length = int(self.headers.get("Content-Length", "0"))
                if length < 1 or length > 2048:
                    raise ResearchError("请求体大小无效。", "invalid_body", 400)
                body = json.loads(self.rfile.read(length).decode("utf-8"))
                if not isinstance(body, dict) or set(body) != {"projectId"}:
                    raise ResearchError("请求只能包含 projectId。", "invalid_body", 400)
                self._json(store.collect(body["projectId"]))
            except ResearchError as error:
                self._error(error)
            except (ValueError, UnicodeError) as error:
                self._error(ResearchError("请求不是有效 JSON。", "invalid_body", 400))

    return ResearchHandler


def main():
    parser = argparse.ArgumentParser(description="本机研究入册：核验真实工作区文件并原子保存唯一回执。")
    parser.add_argument("--port", type=int, default=8977)
    parser.add_argument("--bind", choices=["127.0.0.1"], default="127.0.0.1")
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.bind, args.port), handler_for(ResearchStore()))
    print(f"Research collection: http://{args.bind}:{server.server_port}/projects/016-chippytea-lab/?view=research", flush=True)
    print("Only fixed catalog files are checked. Stop with Ctrl+C.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
