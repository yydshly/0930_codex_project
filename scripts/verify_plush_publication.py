"""Verify the Plush Lab publication without browser automation or dependencies.

Local:  python scripts/verify_plush_publication.py --site-dir _site
Public: python scripts/verify_plush_publication.py --site-dir _site \
          --base-url https://yydshly.github.io/0930_codex_project/

HTTP checks are opt-in. They verify delivery, signatures and asset sizes, not
WebGL rendering, interaction, mobile performance or external viewer availability.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import posixpath
import re
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urljoin, urlsplit
from urllib.request import Request, urlopen


PROJECT = "projects/005-plush-lab"
ORIGINAL_PAGES = (
    "web/index.html", "web/world.html", "web/studio.html", "web/splat.html",
    "web/reference-plush.html", "web/project.html",
    "artifacts/cycles-material-study.html", "artifacts/reference-comparison.html",
    "artifacts/world-page-audit-20261003/report.html",
    "artifacts/source-viewer-public.html",
)
PAGES = ORIGINAL_PAGES + ("web/engineering.html", "index.html")
GUIDE = "assets/plush-capabilities-principles.png"
ORIGINAL_GUIDE = "artifacts/project-overview-20261003/capabilities-principles-summary.png"
ASSET_MANIFEST = "web/assets/reference-plush/manifest.json"
GIT_LIMIT = 100 * 1024 * 1024
SKIP_DIRECTORIES = {"node_modules", "__pycache__", ".git", ".tmp"}
TEXT_SUFFIXES = {".html", ".md", ".css"}
LICENSE_FILES = (
    "web/THREE-LICENSE.txt", "web/SPARK-LICENSE.txt", "web/app.js.LEGAL.txt",
    "web/project.js.LEGAL.txt", "web/world.js.LEGAL.txt", "web/splat.js.LEGAL.txt",
)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def project_files(root):
    """Do not enumerate dependency trees or private/temporary directories."""
    for child in root.iterdir():
        if child.is_symlink() or child.name in SKIP_DIRECTORIES or child.name.startswith("."):
            continue
        if child.is_dir():
            yield from project_files(child)
        elif child.is_file():
            yield child


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.ids = set()
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "a" and "name" in attrs:
            self.ids.add(attrs["name"])
        for key in ("href", "src", "poster"):
            if attrs.get(key):
                self.links.append((attrs[key], tag, key))
        if attrs.get("srcset") and not attrs["srcset"].startswith("data:"):
            self.links.extend((item.strip().split()[0], tag, "srcset")
                              for item in attrs["srcset"].split(",") if item.strip())
        if tag == "meta" and attrs.get("http-equiv", "").lower() == "refresh":
            match = re.search(r"\burl\s*=\s*(.+)", attrs.get("content", ""), re.I)
            if match:
                self.links.append((match.group(1).strip("\"' "), tag, "refresh"))
        if tag == "script":
            self.scripts.append(attrs)


def parsed_page(path):
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def local_target(site, page, link):
    parsed = urlsplit(unescape(link))
    if parsed.scheme or parsed.netloc:
        return None
    value = unquote(parsed.path)
    if value.startswith("/"):
        # Public links may include the GitHub Pages repository prefix.
        value = value.removeprefix("/0930_codex_project/")
        target = site / value.lstrip("/")
    elif value:
        target = page.parent / value
    else:
        target = page
    target = target.resolve()
    if not target.is_relative_to(site.resolve()):
        return target, parsed.fragment, "outside_site"
    if target.is_dir():
        target /= "index.html"
    return target, unquote(parsed.fragment), None


def supported_runtime_fragment(project, target, fragment):
    """Accept state routes only when the published source implements them."""
    try:
        relative = target.relative_to(project.resolve()).as_posix()
    except ValueError:
        return False
    routes = {
        "web/studio.html": ("reference", "src/studio-avatar-view.js", "window.location.hash==='#reference'"),
        "web/splat.html": ("splat=", "src/splat-main.js", "location.hash.startsWith('#splat=')"),
    }
    route = routes.get(relative)
    if route is None:
        return False
    value, filename, evidence = route
    matches = fragment == value if relative == "web/studio.html" else fragment.startswith(value)
    source = project / filename
    return matches and source.is_file() and evidence in source.read_text(encoding="utf-8")


def check_local_links(site, project):
    missing, invalid_fragments, count, skipped, runtime_fragments = [], [], 0, 0, 0
    pages = {path.resolve(): parsed_page(path)
             for path in project.rglob("*.html") if path.is_file()}
    for page in project_files(project):
        if page.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = page.read_text(encoding="utf-8")
        if page.suffix == ".html":
            links = pages[page.resolve()].links
        elif page.suffix == ".md":
            links = [(link, "markdown", "link")
                     for link in re.findall(r"\]\(([^\s)]+)", text)]
        else:
            links = [(link.strip("\"' "), "css", "url")
                     for link in re.findall(r"url\(([^)]+)\)", text)]
        for link, tag, attr in links:
            result = local_target(site, page, link)
            if result is None:
                skipped += 1
                continue
            count += 1
            target, fragment, error = result
            item = {"page": page.relative_to(project).as_posix(), "link": link}
            if error or not target.is_file():
                missing.append({**item, "reason": error or "missing"})
            elif fragment and target.suffix == ".html" and fragment not in pages.get(target, PageParser()).ids:
                if supported_runtime_fragment(project, target, fragment):
                    runtime_fragments += 1
                else:
                    invalid_fragments.append(item)
    # Overview/journal link records are resolved by pages under web/, not src/.
    for filename in ("project-overview-data.js", "project-journal-data.js"):
        path = project / "src" / filename
        if not path.is_file():
            continue
        for link in re.findall(r"\burl\s*:\s*['\"]([^'\"]+)['\"]", path.read_text(encoding="utf-8")):
            result = local_target(site, project / "web/project.html", link)
            if result is None:
                skipped += 1
                continue
            count += 1
            target, fragment, error = result
            if error or not target.is_file():
                missing.append({"page": "src/" + filename, "link": link,
                                "reason": error or "missing_dynamic_link"})
    return {"checked": count, "external_skipped": skipped, "missing": missing,
            "invalid_html_fragments": invalid_fragments, "runtime_fragments_checked": runtime_fragments}


def http_probe(spec, base_url, timeout):
    relative, expected, method = spec
    url = urljoin(base_url, quote(PROJECT + "/" + relative, safe="/"))
    request = Request(url, headers={"User-Agent": "Plush-Publication-Verify/1.0",
                                   "Accept-Encoding": "identity"}, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            status = response.status
            length = response.headers.get("Content-Length")
            content_type = response.headers.get("Content-Type", "")
            body = response.read() if expected.get("sha256") else response.read(512)
        errors = []
        if status != 200:
            errors.append("expected HTTP 200")
        if expected.get("bytes") is not None and (length is None or int(length) != expected["bytes"]):
            errors.append("Content-Length differs from local manifest")
        if expected.get("sha256") and hashlib.sha256(body).hexdigest() != expected["sha256"]:
            errors.append("remote SHA-256 differs from locally verified asset")
        if method != "HEAD":
            if relative.endswith(".html") and b"<html" not in body.lower() and b"<!doctype" not in body.lower():
                errors.append("response is not HTML")
            if relative.endswith(".png") and not body.startswith(b"\x89PNG\r\n\x1a\n"):
                errors.append("response is not PNG")
            if relative.endswith(".js") and body.lstrip().lower().startswith((b"<!doctype", b"<html")):
                errors.append("JavaScript URL returned HTML")
        return {"path": relative, "url": url, "ok": not errors, "status": status,
                "method": method, "content_type": content_type,
                "content_length": length, "errors": errors}
    except (HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
        return {"path": relative, "url": url, "ok": False, "method": method,
                "error": str(exc)}


def verify(args):
    repository = Path(__file__).resolve().parent.parent
    source = repository / PROJECT
    site = (repository / args.site_dir).resolve()
    project = site / PROJECT
    result = {"project": PROJECT, "site_dir": str(site), "checks": [],
              "scope": "Static files and opt-in HTTP delivery; no browser or interaction tests."}

    def record(name, ok, details):
        result["checks"].append({"name": name, "ok": bool(ok), "details": details})

    missing_pages = [page for page in PAGES if not (project / page).is_file()]
    record("all_12_public_entries", not missing_pages,
           {"original_pages": 10, "engineering_and_root": 2, "missing": missing_pages})
    if not project.is_dir():
        result["ok"] = False
        return result

    guide_paths = [source / GUIDE, source / ORIGINAL_GUIDE, project / GUIDE, project / ORIGINAL_GUIDE]
    if args.source_dir:
        original = Path(args.source_dir).resolve()
        if original.name != "005-plush-lab":
            original /= PROJECT
        guide_paths.append(original / ORIGINAL_GUIDE)
    hashes = {str(path): sha256(path) if path.is_file() else None for path in guide_paths}
    guide_hash = hashes[str(source / ORIGINAL_GUIDE)]
    record("guide_matches_source_original", all(hashes.values()) and len(set(hashes.values())) == 1, hashes)

    missing_licenses = [path for path in LICENSE_FILES if not (project / path).is_file()]
    spark = (project / "web/SPARK-LICENSE.txt").read_text(encoding="utf-8") if not missing_licenses else ""
    record("third_party_licenses", not missing_licenses and "WORLD LABS" in spark and "MIT" in spark,
           {"files": list(LICENSE_FILES), "missing": missing_licenses})

    manifest_path = project / ASSET_MANIFEST
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}
    chunks, chunk_checks = manifest.get("chunks", []), []
    for chunk in chunks:
        file = manifest_path.parent / chunk["file"]
        actual = sha256(file) if file.is_file() else None
        ok = file.is_file() and file.stat().st_size == chunk["bytes"] and actual == chunk["sha256"]
        chunk_checks.append({"file": chunk["file"], "ok": ok, "bytes": chunk["bytes"], "sha256": actual})
    record("six_sog_chunks_and_attribution", len(chunks) == 6 and all(c["ok"] for c in chunk_checks)
           and sum(c["count"] for c in chunks) == 3493379 and manifest.get("count") == 3493379
           and manifest.get("author") == "abstrakt" and manifest.get("license") == "CC BY 4.0"
           and bool(manifest.get("source")) and bool(manifest.get("licenseUrl")) and bool(manifest.get("adaptation")),
           {"count": manifest.get("count"), "author": manifest.get("author"),
            "license": manifest.get("license"), "chunks": chunk_checks})

    files = list(project_files(project))
    big_files = [{"path": path.relative_to(project).as_posix(), "bytes": path.stat().st_size}
                 for path in files if path.stat().st_size > GIT_LIMIT]
    blends = [path.relative_to(project).as_posix() for path in files if re.search(r"\.blend\d*$", path.name, re.I)]
    record("public_size_and_blender_exclusion", not big_files and not blends,
           {"file_count": len(files), "bytes": sum(path.stat().st_size for path in files),
            "over_100_mib": big_files, "blend_files": blends,
            "largest": max(({"path": path.relative_to(project).as_posix(), "bytes": path.stat().st_size}
                            for path in files), key=lambda file: file["bytes"], default=None)})
    tracked = subprocess.run(["git", "ls-files", "-z"], cwd=repository, capture_output=True, check=True).stdout
    tracked_big = []
    for filename in tracked.decode("utf-8").split("\0"):
        path = repository / filename
        if filename and path.is_file() and path.stat().st_size > GIT_LIMIT:
            tracked_big.append({"path": filename, "bytes": path.stat().st_size})
    # Also include new release files, which may not yet have been staged.
    release_big = [{"path": PROJECT + "/" + path.relative_to(source).as_posix(), "bytes": path.stat().st_size}
                   for path in project_files(source) if path.stat().st_size > GIT_LIMIT]
    record("git_file_size_limit", not tracked_big and not release_big,
           {"limit_bytes": GIT_LIMIT, "tracked_over_limit": tracked_big,
            "new_project_files_over_limit": release_big})

    links = check_local_links(site, project)
    record("local_static_and_record_link_closure", not links["missing"] and not links["invalid_html_fragments"], links)
    source_page = project / "artifacts/source-viewer-public.html"
    parser = parsed_page(source_page) if source_page.is_file() else PageParser()
    source_text = source_page.read_text(encoding="utf-8") if source_page.is_file() else ""
    record("source_explanation_does_not_execute_upstream", source_page.is_file() and not parser.scripts
           and "sentry" not in source_text.lower() and "/assets/main-" not in source_text
           and "abstrakt" in source_text and "CC BY 4.0" in source_text,
           {"script_tags": len(parser.scripts), "source_and_license": "abstrakt" in source_text and "CC BY 4.0" in source_text})
    archive = project / "notes/engineering-assets.json"
    engineering = json.loads(archive.read_text(encoding="utf-8")) if archive.is_file() else {}
    archives = engineering.get("files", [])
    record("engineering_archive_is_honest", len(archives) == 54
           and all(file.get("bytes", 0) > 0 and re.fullmatch(r"[0-9a-f]{64}", file.get("sha256", "")) for file in archives),
           {"count": len(archives), "bytes": sum(file.get("bytes", 0) for file in archives),
            "downloads_published": bool(blends)})

    if args.base_url:
        parsed = urlsplit(args.base_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("--base-url must be an HTTP(S) repository site URL")
        base_url = args.base_url.rstrip("/") + "/"
        specs = [(page, {}, "GET") for page in PAGES]
        specs += [(GUIDE, {"sha256": guide_hash}, "GET"),
                  (ORIGINAL_GUIDE, {"sha256": guide_hash}, "GET"),
                  (ASSET_MANIFEST, {"sha256": sha256(manifest_path)}, "GET")]
        specs += [("web/assets/reference-plush/" + chunk["file"], {"bytes": chunk["bytes"]}, "HEAD")
                  for chunk in chunks]
        specs += [("web/" + name, {}, "GET")
                  for name in ("app.js", "project.js", "world.js", "studio.js", "splat.js", "reference-plush.js")]
        samples = sorted((project / "artifacts/cycles-study").glob("*.png"))
        if samples:
            specs.append((samples[0].relative_to(project).as_posix(), {}, "GET"))
        specs.append(("artifacts/reference-native-creation-export.png", {}, "GET"))
        with ThreadPoolExecutor(max_workers=6) as executor:
            http_results = list(executor.map(lambda spec: http_probe(spec, base_url, args.timeout), specs))
        record("public_http_delivery", all(item["ok"] for item in http_results),
               {"base_url": base_url, "requests": len(http_results), "results": http_results,
                "sog_verification": "HTTP HEAD status and manifest byte sizes; local files independently SHA-256 verified."})
    result["ok"] = all(check["ok"] for check in result["checks"])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--site-dir", default="_site", help="Built site directory, relative to repository root or absolute")
    parser.add_argument("--source-dir", help="Optional original repository/project directory for guide SHA comparison")
    parser.add_argument("--base-url", help="Explicitly opt in to HTTP checks of the deployed repository site")
    parser.add_argument("--timeout", type=float, default=30, help="HTTP timeout in seconds")
    parser.add_argument("--output", help="Optional JSON report file (stdout always contains the full JSON)")
    args = parser.parse_args()
    try:
        result = verify(args)
    except (ValueError, OSError, subprocess.CalledProcessError, KeyError) as exc:
        result = {"ok": False, "error": str(exc)}
    output = json.dumps(result, ensure_ascii=True, indent=2) + "\n"
    if args.output:
        path = Path(args.output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(output, encoding="utf-8")
    sys.stdout.write(output)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
