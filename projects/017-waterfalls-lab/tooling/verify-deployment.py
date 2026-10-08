#!/usr/bin/env python3
"""Verify the Waterfalls publication by HTTP; a pass is not browser/GPU QA.

Examples (run after scripts/build_site.py):
  python projects/017-waterfalls-lab/tooling/verify-deployment.py \
      --base-url http://127.0.0.1:8992/projects/017-waterfalls-lab/
  python projects/017-waterfalls-lab/tooling/verify-deployment.py --report

All remote files must match their public manifest. Local/remote differences also
fail by default. --allow-rebuilt-app explicitly permits only app.js to differ
from the local build; its HTTP bytes must still match the remote manifest.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from http.client import HTTPException
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[3]
PROJECT_PATH = "projects/017-waterfalls-lab/"
DEFAULT_BASE = "https://yydshly.github.io/0930_codex_project/" + PROJECT_PATH
CANONICAL_SITE = "https://yydshly.github.io/0930_codex_project/"
SOURCE_URL = "https://github.com/yydshly/0930_codex_project/tree/main/projects/017-waterfalls-lab"
EXPECTED_FILES = 61
PNG_SHA = "c2537617473a3ae17ecd21d842285c7cefbbc57a26d58945ce8d86d4965fecf1"
SVG_SHA = "9d094e0e2be76dbeee66f755682778b9c1138e8c293dcb06303673e58c43c5dd"
ZIP_SHA = "f7ce08ac9db02109493167be518a92244523f5c8de1b4072efb3fd5f68cd008d"
LOCKED = {
    "assets/understanding-map.png": PNG_SHA,
    "research-assets/understanding-map.png": PNG_SHA,
    "assets/understanding-map.svg": SVG_SHA,
    "research-assets/understanding-map.svg": SVG_SHA,
    "downloads/waterfalls-lab-studio09-foundation.zip": ZIP_SHA,
}
SUMMARY_LABELS = ("定位", "能力", "原理", "展示", "场景", "价值", "边界")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str, timeout: float) -> tuple[dict, bytes]:
    request = Request(url, headers={
        "User-Agent": "WaterfallsLab-PublicationVerifier/1.0",
        "Accept-Encoding": "identity", "Cache-Control": "no-cache",
    })
    try:
        with urlopen(request, timeout=timeout) as response:
            body = response.read()
            result = {"url": url, "final_url": response.geturl(),
                      "status": response.status, "bytes": len(body),
                      "sha256": sha256(body)}
            if response.status != 200:
                result["error"] = f"HTTP {response.status}; expected 200"
            return result, body
    except HTTPError as error:
        return {"url": url, "status": error.code, "error": str(error)}, b""
    except (URLError, OSError, ValueError, HTTPException) as error:
        return {"url": url, "status": None, "error": str(error)}, b""


def manifest_entries(manifest: dict) -> dict[str, dict]:
    if not isinstance(manifest, dict):
        raise ValueError("manifest root is not an object")
    if manifest.get("project") != "017-waterfalls-lab":
        raise ValueError("manifest project is not 017-waterfalls-lab")
    files = manifest.get("files")
    if not isinstance(files, list) or len(files) != EXPECTED_FILES:
        raise ValueError(f"manifest must list exactly {EXPECTED_FILES} files")
    entries = {}
    for item in files:
        if not isinstance(item, dict):
            raise ValueError("manifest file entry is not an object")
        path = item.get("path", "")
        parsed = urlsplit(path) if isinstance(path, str) else None
        if (not path or parsed is None or parsed.scheme or parsed.netloc
                or parsed.query or parsed.fragment or "\\" in path
                or path.startswith("/") or ".." in PurePosixPath(path).parts
                or str(PurePosixPath(path)) != path or path in entries):
            raise ValueError(f"invalid or duplicate manifest path: {path!r}")
        size = item.get("bytes")
        if type(size) is not int or size < 0:
            raise ValueError(f"invalid byte size: {path}")
        if not re.fullmatch(r"[0-9a-f]{64}", str(item.get("sha256", ""))):
            raise ValueError(f"invalid SHA256: {path}")
        entries[path] = item
    return entries


def normalized_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


class Homepage(HTMLParser):
    """Retain separate table rows and project cards, including their links."""

    def __init__(self, base: str):
        super().__init__()
        self.base = base
        self.blocks = []
        self.active = []

    def handle_starttag(self, tag, attrs):
        if tag in ("tr", "article"):
            self.active.append({"tag": tag, "text": [], "links": []})
        attributes = dict(attrs)
        if tag == "a" and "href" in attributes:
            link = normalized_url(urljoin(self.base, attributes["href"]))
            for block in self.active:
                block["links"].append(link)

    def handle_data(self, data):
        for block in self.active:
            block["text"].append(data)

    def handle_endtag(self, tag):
        if self.active and self.active[-1]["tag"] == tag:
            block = self.active.pop()
            block["text"] = " ".join(block["text"])
            self.blocks.append(block)


def check_homepage(body: bytes, site_base: str, project_base: str) -> dict:
    page = Homepage(site_base)
    page.feed(body.decode("utf-8-sig"))
    matches = [block for block in page.blocks
               if "Waterfalls Lab" in block["text"] and "017" in block["text"]]
    errors = []
    summaries = []
    for tag in ("tr", "article"):
        blocks = [block for block in matches if block["tag"] == tag]
        if len(blocks) != 1:
            errors.append(f"expected one 017 {tag} block, found {len(blocks)}")
        for block in blocks:
            labels = [label for label in SUMMARY_LABELS
                      if re.search(re.escape(label) + r"\s*[：:]", block["text"])]
            summaries.append({"block": tag, "labels": labels})
            if len(labels) != len(SUMMARY_LABELS):
                errors.append(f"017 {tag} is missing summary labels")
    links = {link for block in matches for link in block["links"]}
    required = {
        "studio": project_base,
        "understanding": urljoin(project_base, "understanding.html"),
        "upstream": urljoin(project_base, "upstream/"),
        "image": urljoin(project_base, "assets/understanding-map.png"),
        "source_notice": urljoin(project_base, "source-notice.html"),
        "github": SOURCE_URL,
    }
    found = {name: normalized_url(url) in links for name, url in required.items()}
    for name, present in found.items():
        if not present:
            errors.append(f"017 homepage link missing: {name}")
    return {"summary_blocks": summaries, "required_links": found,
            "errors": errors, "passed": not errors}


def demo_url(declared: str, site_base: str) -> str:
    """Rebase declared Pages demo routes to the site under examination."""
    original = urlsplit(declared)
    canonical = urlsplit(CANONICAL_SITE)
    if original.netloc != canonical.netloc or not original.path.startswith(canonical.path):
        raise ValueError(f"cannot rebase non-site demo: {declared}")
    relative = original.path[len(canonical.path):]
    return urljoin(site_base, relative) + ("?" + original.query if original.query else "")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default=DEFAULT_BASE, help="017 public directory URL")
    parser.add_argument("--site-root", type=Path, default=REPO_ROOT / "_site", help="local static build directory")
    parser.add_argument("--projects", type=Path, default=REPO_ROOT / "projects.json", help="registry of declared demo URLs")
    parser.add_argument("--workers", type=int, choices=range(1, 9), default=4, metavar="1..8")
    parser.add_argument("--timeout", type=float, default=20, help="per-request seconds")
    parser.add_argument("--report", nargs="?", type=Path,
                        const=REPO_ROOT / "projects/017-waterfalls-lab/notes/deployment-checks.json",
                        help="write full JSON report; optional path")
    parser.add_argument("--allow-rebuilt-app", action="store_true",
                        help="explicitly permit only app.js local/remote build difference; HTTP manifest checks remain strict")
    args = parser.parse_args()
    base = args.base_url.rstrip("/") + "/"
    parsed = urlsplit(base)
    if parsed.scheme not in ("http", "https") or parsed.query or parsed.fragment or not base.endswith(PROJECT_PATH):
        parser.error("--base-url must be an HTTP(S) directory ending in projects/017-waterfalls-lab/")
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    site_base = base[:-len(PROJECT_PATH)]
    local = args.site_root.resolve() / PROJECT_PATH
    failures, warnings = [], []
    report = {"checked_at_utc": datetime.now(timezone.utc).isoformat(),
              "base_url": base, "site_base_url": site_base,
              "mode": "local" if parsed.hostname in ("localhost", "127.0.0.1", "::1") else "public_http",
              "local_site_root": str(args.site_root.resolve()),
              "scope": "HTTP status, publication bytes/hashes, immutable assets, homepage and declared demo routes; no browser or GPU validation",
              "allow_rebuilt_app": args.allow_rebuilt_app}

    local_entries = {}
    try:
        local_manifest = json.loads((local / "publication-manifest.json").read_text(encoding="utf-8"))
        local_entries = manifest_entries(local_manifest)
    except (OSError, ValueError, TypeError) as error:
        failures.append(f"local manifest: {error}")

    remote_fetch, manifest_body = fetch(urljoin(base, "publication-manifest.json"), args.timeout)
    report["manifest_http"] = remote_fetch
    remote_entries = {}
    if remote_fetch.get("error"):
        failures.append("public manifest: " + remote_fetch["error"])
    else:
        try:
            remote_manifest = json.loads(manifest_body)
            remote_entries = manifest_entries(remote_manifest)
            if remote_manifest.get("original_guide_sha256") != {"png": PNG_SHA, "svg": SVG_SHA}:
                failures.append("public manifest original guide metadata differs from locked hashes")
            foundation = remote_manifest.get("foundation", {})
            if foundation.get("sha256") != ZIP_SHA or foundation.get("path") != "downloads/waterfalls-lab-studio09-foundation.zip":
                failures.append("public manifest foundation metadata differs from locked archive")
        except (ValueError, TypeError) as error:
            failures.append(f"public manifest: {error}")
    if set(remote_entries) != set(local_entries):
        failures.append("public/local manifest file sets differ")

    def verify_file(item):
        path, expected = item
        result, _ = fetch(urljoin(base, quote(path, safe="/")), args.timeout)
        result["path"] = path
        result["remote_expected"] = {"bytes": expected["bytes"], "sha256": expected["sha256"]}
        errors = []
        if result.get("error"):
            errors.append(result["error"])
        elif result["bytes"] != expected["bytes"] or result["sha256"] != expected["sha256"]:
            errors.append("HTTP bytes/SHA256 do not match public manifest")
        local_expected = local_entries.get(path)
        if local_expected is None:
            errors.append("path missing from local manifest")
        else:
            result["local_expected"] = {"bytes": local_expected["bytes"], "sha256": local_expected["sha256"]}
            try:
                data = (local / path).read_bytes()
                if len(data) != local_expected["bytes"] or sha256(data) != local_expected["sha256"]:
                    errors.append("local file does not match local manifest")
            except OSError as error:
                errors.append(f"local file: {error}")
            difference = result["local_expected"] != result["remote_expected"]
            result["local_remote_difference"] = difference
            if difference:
                if path == "app.js" and args.allow_rebuilt_app:
                    result["explicitly_allowed_local_app_difference"] = True
                else:
                    errors.append("public/local manifest bytes or SHA256 differ")
        if path in LOCKED:
            result["locked_sha256"] = LOCKED[path]
            if expected["sha256"] != LOCKED[path] or result.get("sha256") != LOCKED[path] or not local_expected or local_expected["sha256"] != LOCKED[path]:
                errors.append("locked original guide/archive SHA256 differs")
        result["errors"] = errors
        result["passed"] = not errors
        return result

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        checks = list(pool.map(verify_file, sorted(remote_entries.items())))
        report["files"] = checks
        for result in checks:
            failures.extend(result["path"] + ": " + error for error in result["errors"])
            if result.get("explicitly_allowed_local_app_difference"):
                warnings.append("app.js differs from local _site; explicitly allowed. HTTP bytes still validated against public manifest.")
        for path in LOCKED:
            if path not in remote_entries:
                failures.append("locked asset missing from public manifest: " + path)

        homepage_fetch, homepage_body = fetch(site_base, args.timeout)
        report["homepage_http"] = homepage_fetch
        if homepage_fetch.get("error"):
            failures.append("homepage: " + homepage_fetch["error"])
        else:
            try:
                report["homepage"] = check_homepage(homepage_body, site_base, base)
                failures.extend("homepage: " + error for error in report["homepage"]["errors"])
            except (ValueError, UnicodeError) as error:
                failures.append(f"homepage parse: {error}")

        tasks = []
        try:
            projects = json.loads(args.projects.read_text(encoding="utf-8"))
            for project in projects:
                if project.get("id") != 17 and project.get("demo"):
                    tasks.append({"id": project["id"], "name": project["name"],
                                  "declared_url": project["demo"],
                                  "url": demo_url(project["demo"], site_base)})
        except (OSError, ValueError, TypeError, KeyError) as error:
            failures.append(f"project demo registry: {error}")

        def verify_demo(task):
            result, _ = fetch(task["url"], args.timeout)
            result.update(task)
            result["passed"] = not result.get("error") and result.get("status") == 200
            return result

        demo_checks = list(pool.map(verify_demo, tasks))
        report["other_declared_demos"] = demo_checks
        for result in demo_checks:
            if not result["passed"]:
                failures.append(f"demo {result['id']}: {result.get('error', 'not HTTP 200')}")

    report["failures"], report["warnings"] = failures, warnings
    report["passed"] = not failures
    report["counts"] = {"manifest_files": len(remote_entries),
                        "verified_files": sum(item["passed"] for item in checks),
                        "other_demos": len(demo_checks),
                        "other_demos_http_200": sum(item["passed"] for item in demo_checks)}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Report:", args.report.resolve())
    print(json.dumps({key: report[key] for key in ("mode", "base_url", "passed", "counts", "warnings", "failures")}, ensure_ascii=False, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
