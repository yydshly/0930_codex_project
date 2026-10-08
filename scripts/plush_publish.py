"""Publish the complete Plush Lab study without flattening its relative paths.

The site carries runnable demos and public research evidence. Native Blender
projects stay on the author's machine; links to them lead to an honest inventory
page instead of a missing or misleading download.
"""

import html
import json
import posixpath
import re
import shutil
from pathlib import Path, PurePosixPath
from urllib.parse import quote, unquote, urlsplit


PUBLIC_DIRECTORIES = {
    "web", "assets", "notes", "src", "tests", "server", "tooling", "artifacts",
}
PUBLIC_ROOT_FILES = {"README.md", "public-index.html"}
PUBLIC_EXTENSIONS = {
    ".html", ".css", ".js", ".mjs", ".json", ".md", ".txt", ".log", ".py",
    ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".woff", ".woff2",
    ".sog", ".ply",
}
EXCLUDED_DIRECTORIES = {"node_modules", "__pycache__", "private", "secrets"}
SENSITIVE_FILENAME = re.compile(
    r"(?:^|[._-])(?:secrets?|credentials?|tokens?|api[-_]?keys?|private|env)(?:[._-]|$)",
    re.IGNORECASE,
)
PRIVATE_CONFIGURATION = {"config.json", "settings.json"}
LOCAL_PROJECT_URL = re.compile(
    r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?/projects/005-plush-lab/"
    r"[^\s\"'<>\)\]]*", re.IGNORECASE,
)
ANCHOR = re.compile(r"<a\b[^>]*>", re.IGNORECASE)
HREF = re.compile(r"\bhref\s*=\s*([\"'])(.*?)\1", re.IGNORECASE)
DOWNLOAD = re.compile(
    r"\s+download(?:\s*=\s*(?:\"[^\"]*\"|'[^']*'|[^\s>]+))?", re.IGNORECASE,
)
MARKDOWN_LINK = re.compile(r"(?<!!)\[([^\]]+)\]\(([^\s\)]+)\)")
MAX_PUBLIC_FILE_BYTES = 100 * 1024 * 1024


def public_file(path, project_root):
    """Use explicit directories, types and names; never ship arbitrary config."""
    relative = path.relative_to(project_root)
    if (not path.is_file() or path.is_symlink()
            or not path.resolve().is_relative_to(project_root.resolve())):
        return False
    if any(part.startswith(".") or part.lower() in EXCLUDED_DIRECTORIES
           for part in relative.parts):
        return False
    if (relative.parts[0] not in PUBLIC_DIRECTORIES
            and relative.as_posix() not in PUBLIC_ROOT_FILES):
        return False
    if (SENSITIVE_FILENAME.search(path.name)
            or path.name.lower() in PRIVATE_CONFIGURATION):
        return False
    return (path.suffix.lower() in PUBLIC_EXTENSIONS
            and path.stat().st_size <= MAX_PUBLIC_FILE_BYTES)


def local_page_url(url, relative):
    """Convert project navigation, keeping query/hash and the Pages subpath."""
    parsed = urlsplit(url)
    prefix = "/projects/005-plush-lab/"
    if parsed.hostname not in {"localhost", "127.0.0.1"} or not parsed.path.startswith(prefix):
        return url
    target = parsed.path[len(prefix):]
    result = posixpath.relpath(target or ".", str(relative.parent))
    if parsed.path.endswith("/") and not result.endswith("/"):
        result += "/"
    if parsed.query:
        result += "?" + parsed.query
    if parsed.fragment:
        result += "#" + parsed.fragment
    return result


def engineering_url(url, relative):
    parsed = urlsplit(html.unescape(url))
    if parsed.scheme or parsed.netloc:
        return None
    path = unquote(parsed.path).replace("\\", "/")
    if not re.search(r"\.blend\d*$", path, re.IGNORECASE):
        return None
    if path.startswith("/projects/005-plush-lab/"):
        asset = path[len("/projects/005-plush-lab/"):]
    elif path.startswith("/"):
        return None
    else:
        asset = posixpath.normpath(posixpath.join(str(relative.parent), path))
    if asset == ".." or asset.startswith("../"):
        return None
    page = posixpath.relpath("web/engineering.html", str(relative.parent))
    return page + "?asset=" + quote(asset, safe="/")


def catalog_url(url, relative):
    """The repository README becomes the public catalog's HTML entry."""
    parsed = urlsplit(html.unescape(url))
    if parsed.scheme or parsed.netloc or parsed.path.startswith("/"):
        return None
    target = posixpath.normpath(posixpath.join(str(relative.parent), unquote(parsed.path)))
    if target != "../../README.md":
        return None
    return posixpath.relpath("../../index.html", str(relative.parent))


def public_text(text, relative):
    """Rewrite navigation only; local AI service setup remains documented."""
    relative = PurePosixPath(relative)
    changes = {"local_links": 0, "engineering_links": 0, "catalog_links": 0}

    def replace_local(match):
        changes["local_links"] += 1
        return local_page_url(match.group(), relative)

    text = LOCAL_PROJECT_URL.sub(replace_local, text)
    if relative.suffix.lower() == ".html":
        def replace_anchor(match):
            anchor = match.group()
            href = HREF.search(anchor)
            if not href:
                return anchor
            target = engineering_url(href.group(2), relative)
            engineering = target is not None
            if not engineering:
                target = catalog_url(href.group(2), relative)
            if target is None:
                return anchor
            changes["engineering_links" if engineering else "catalog_links"] += 1
            replacement = "href=" + href.group(1) + html.escape(target, quote=True) + href.group(1)
            rewritten = anchor[:href.start()] + replacement + anchor[href.end():]
            return DOWNLOAD.sub("", rewritten) if engineering else rewritten

        text = ANCHOR.sub(replace_anchor, text)
    elif relative.suffix.lower() == ".md":
        def replace_markdown(match):
            target = engineering_url(match.group(2), relative)
            engineering = target is not None
            if not engineering:
                target = catalog_url(match.group(2), relative)
            if target is None:
                return match.group()
            changes["engineering_links" if engineering else "catalog_links"] += 1
            return "[" + match.group(1) + "](" + target + ")"

        text = MARKDOWN_LINK.sub(replace_markdown, text)
    return text, changes


def publish_plush(project_root, destination):
    """Copy all public study pages, assets, code and evidence to one subtree."""
    project_root, destination = Path(project_root), Path(destination)
    entry = project_root / "public-index.html"
    if not entry.is_file():
        raise ValueError("Plush Lab publication requires public-index.html")
    repository_root = project_root.resolve().parent.parent
    expected = repository_root / "_site/projects/005-plush-lab"
    if (destination.resolve() != expected.resolve()
            or not destination.resolve().is_relative_to(repository_root)):
        raise ValueError("Plush Lab output must remain inside its repository's _site subtree")
    # Validate the resolved target before deleting only this generated project.
    # This prevents stale flat entries or an old excluded file from surviving.
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True, exist_ok=True)
    report = {
        "structure": "Original project directories retained; web pages remain under web/.",
        "engineering_policy": "Blender projects remain local; links open web/engineering.html.",
        "files": [], "excluded": [], "rewrites": [], "pages": [],
    }
    for path in sorted(project_root.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(project_root)
        if not public_file(path, project_root):
            # Do not record private names or dependency trees in a public manifest.
            if not any(part.startswith(".") or part.lower() in EXCLUDED_DIRECTORIES
                       for part in relative.parts) and not SENSITIVE_FILENAME.search(path.name):
                report["excluded"].append(relative.as_posix())
            continue
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if path.suffix.lower() in {".html", ".md"}:
            content, changes = public_text(path.read_text(encoding="utf-8"), relative.as_posix())
            target.write_text(content, encoding="utf-8")
            if any(changes.values()):
                report["rewrites"].append({"path": relative.as_posix(), **changes})
        else:
            shutil.copy2(path, target)
        report["files"].append(relative.as_posix())
        if path.suffix.lower() == ".html":
            report["pages"].append(relative.as_posix())
    # The public entry is at the project root, so its relative paths remain valid.
    shutil.copy2(destination / "public-index.html", destination / "index.html")
    report["files"].append("index.html")
    report["pages"].append("index.html")
    report["file_count"] = len(report["files"])
    report["page_count"] = len(report["pages"])
    report["bytes"] = sum((destination / path).stat().st_size for path in report["files"])
    manifest = destination / "notes/publication-manifest.json"
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Published Plush Lab: {report['page_count']} pages, {report['file_count']} files")
    return report
