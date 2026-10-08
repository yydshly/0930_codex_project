"""Publish the complete, reviewed Soup demo without local service material.

The web directory becomes the project's flat public directory. Source and font
licenses travel with the runnable assets; five reviewed recordings are added
from the project archive. Unpublished research remains visible as labelled text.
"""

import hashlib
import html
import json
import posixpath
import re
import shutil
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit


PROJECT_DIRECTORY = "011-combination-soup-studio"
RECORDINGS = {
    "product-showcase-refined.mp4", "business-scenes-v5.mp4",
    "business-scenes-v6.mp4", "scene-polish-v7.mp4", "scene-polish-v8.mp4",
}
STATIC_EXTENSIONS = {
    ".html", ".css", ".js", ".mjs", ".json", ".svg", ".png", ".jpg",
    ".jpeg", ".gif", ".webp", ".avif", ".ico", ".woff", ".woff2",
    ".ttf", ".otf", ".mp4", ".webm", ".mp3", ".wav", ".ogg",
    ".glb", ".gltf", ".bin", ".wasm", ".webmanifest",
}
EXCLUDED_DIRECTORIES = {
    "node_modules", "__pycache__", "private", "secrets", "server", "notes",
    "tooling", "downloads",
}
SENSITIVE_FILENAME = re.compile(
    r"(?:^|[._-])(?:secrets?|credentials?|tokens?|api[-_]?keys?|private|env)"
    r"(?:[._-]|$)", re.IGNORECASE,
)
PRIVATE_CONFIGURATION = {
    "config.json", "settings.json", "service.json", "server.json",
    "package.json", "package-lock.json", "publication-manifest.json",
}
NOTICE_FILENAME = re.compile(r"(?:license|licence|ofl|source[-_]notice|attribution)", re.I)
LOCAL_PROJECT_URL = re.compile(
    r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?/projects/"
    r"[^\s\"'<>\)\]]*", re.I,
)
ATTRIBUTES = re.compile(
    r"(?P<space>\s+)(?P<name>[^\s=/>]+)"
    r"(?:\s*=\s*(?P<value>\"[^\"]*\"|'[^']*'|[^\s>]+))?",
)
UNPUBLISHED_LABEL = "本机研究 · 暂未公开部署"


def _identities(projects):
    """Accept catalog records or project directory names, always including 011."""
    identities = {PROJECT_DIRECTORY, "011"}
    for project in projects:
        if isinstance(project, dict):
            identities.add(f"{int(project['id']):03d}-{project['slug']}")
        elif isinstance(project, int):
            identities.add(f"{project:03d}")
        else:
            identities.add(str(project).rstrip("/").split("/")[-1])
    return identities


def _target(url, relative):
    parsed = urlsplit(html.unescape(url))
    if (parsed.scheme or parsed.netloc) and parsed.hostname not in {"localhost", "127.0.0.1"}:
        return None
    path = unquote(parsed.path).replace("\\", "/")
    if not path:
        return None
    if path.startswith("/"):
        target = posixpath.normpath(path.lstrip("/"))
    else:
        parent = PurePosixPath("projects") / PROJECT_DIRECTORY / relative.parent
        target = posixpath.normpath(posixpath.join(parent.as_posix(), path))
    parts = PurePosixPath(target).parts
    if len(parts) < 2 or parts[0] != "projects" or not re.fullmatch(r"\d{3}-.+", parts[1]):
        return None
    # Plush's publication intentionally retains web/, unlike the flat demos.
    if (parts[1] == "005-plush-lab" and len(parts) == 3
            and parts[2].endswith(".html") and parts[2] not in {"index.html", "public-index.html"}):
        target = f"projects/{parts[1]}/web/{parts[2]}"
    parent = PurePosixPath("projects") / PROJECT_DIRECTORY / relative.parent
    rewritten = posixpath.relpath(target, parent.as_posix())
    if parsed.path.endswith("/") and not rewritten.endswith("/"):
        rewritten += "/"
    if parsed.query:
        rewritten += "?" + parsed.query
    if parsed.fragment:
        rewritten += "#" + parsed.fragment
    return parts[1], rewritten


def _published(directory, identities):
    return directory in identities or directory[:3] in identities


class _PublicHTML(HTMLParser):
    """Change navigation while retaining literal markup, scripts and entities."""

    def __init__(self, relative, published_projects):
        super().__init__(convert_charrefs=False)
        self.relative = PurePosixPath(relative)
        self.identities = _identities(published_projects)
        self.parts = []
        self.anchors = []
        self.changes = {"relative_links": 0, "unpublished_links": 0}

    def handle_starttag(self, tag, attrs):
        raw = self.get_starttag_text()
        attributes = dict(attrs)
        target = _target(attributes.get("href", ""), self.relative) if tag == "a" else None
        unavailable = bool(target and not _published(target[0], self.identities))
        if tag == "a":
            self.anchors.append(unavailable)

        def replace_attribute(match):
            name, value = match.group("name").lower(), match.group("value")
            if unavailable and name in {"href", "target", "rel", "download"}:
                return ""
            if not value or name not in {"href", "src", "poster", "action"}:
                return match.group()
            bare = value[1:-1] if value[0] in "\"'" else value
            resolved = _target(bare, self.relative)
            if resolved is None:
                return match.group()
            rewritten = html.escape(resolved[1], quote=True)
            if html.unescape(bare) != resolved[1]:
                self.changes["relative_links"] += 1
            return f'{match.group("space")}{match.group("name")}="{rewritten}"'

        raw = ATTRIBUTES.sub(replace_attribute, raw)
        if unavailable:
            raw = re.sub(r"^<a\b", "<span", raw, count=1, flags=re.I)
            raw = raw[:-1] + ' data-publication="local-only">'
            self.changes["unpublished_links"] += 1
        self.parts.append(raw)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "a" and self.anchors:
            if self.anchors.pop():
                self.parts.append(f' <small class="publication-note">{UNPUBLISHED_LABEL}</small></span>')
                return
        self.parts.append(f"</{tag}>")

    def handle_data(self, data):
        self.parts.append(data)

    def handle_entityref(self, name):
        self.parts.append(f"&{name};")

    def handle_charref(self, name):
        self.parts.append(f"&#{name};")

    def handle_comment(self, data):
        self.parts.append(f"<!--{data}-->")

    def handle_decl(self, decl):
        self.parts.append(f"<!{decl}>")

    def handle_pi(self, data):
        self.parts.append(f"<?{data}>")


def public_html(text, relative, published_projects):
    parser = _PublicHTML(relative, published_projects)
    parser.feed(text)
    parser.close()
    content = "".join(parser.parts)

    def replace_local(match):
        resolved = _target(match.group(), PurePosixPath(relative))
        if resolved is None:
            return match.group()
        parser.changes["relative_links"] += 1
        return resolved[1]

    return LOCAL_PROJECT_URL.sub(replace_local, content), parser.changes


def _public_web_file(path, web):
    relative = path.relative_to(web)
    if (not path.is_file() or path.is_symlink()
            or not path.resolve().is_relative_to(web.resolve())):
        return False
    if any(part.startswith(".") or part.lower() in EXCLUDED_DIRECTORIES for part in relative.parts):
        return False
    if SENSITIVE_FILENAME.search(path.name) or path.name.lower() in PRIVATE_CONFIGURATION:
        return False
    if path.suffix.lower() == ".txt":
        return bool(NOTICE_FILENAME.search(path.stem))
    return path.suffix.lower() in STATIC_EXTENSIONS


def _digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def publish_soup(project, destination, published_projects):
    """Publish 011 to its checked _site path and return its public manifest."""
    project, destination = Path(project), Path(destination)
    repository = project.resolve().parent.parent
    expected = repository / "_site/projects" / PROJECT_DIRECTORY
    if (project.name != PROJECT_DIRECTORY or destination.resolve() != expected.resolve()
            or not destination.resolve().is_relative_to(repository)):
        raise ValueError("Soup output must remain inside its repository's _site/projects/011-combination-soup-studio")
    web = project / "web"
    if not (web / "index.html").is_file():
        raise ValueError("Soup publication requires web/index.html")
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True, exist_ok=True)
    manifest = {
        "project": PROJECT_DIRECTORY,
        "structure": "web/ becomes the flat public project directory; five reviewed recordings are added to assets/.",
        "research_policy": "Unpublished related research is labelled as local-only; 011's complete pages remain linked.",
        "files": [], "pages": [], "rewrites": [],
    }
    selected = [(path, path.relative_to(web)) for path in sorted(web.rglob("*")) if _public_web_file(path, web)]
    for name in sorted(RECORDINGS):
        path = project / "assets" / name
        if path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(project.resolve()):
            selected.append((path, Path("assets") / name))
    for source, relative in selected:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.suffix.lower() == ".html":
            content, changes = public_html(source.read_text(encoding="utf-8"), relative.as_posix(), published_projects)
            target.write_text(content, encoding="utf-8")
            manifest["pages"].append(relative.as_posix())
            if any(changes.values()):
                manifest["rewrites"].append({"path": relative.as_posix(), **changes})
        else:
            shutil.copy2(source, target)
        manifest["files"].append({
            "source": source.relative_to(project).as_posix(),
            "path": relative.as_posix(), "bytes": target.stat().st_size,
            "sha256": _digest(target), "source_sha256": _digest(source),
        })
    manifest["file_count"] = len(manifest["files"])
    manifest["page_count"] = len(manifest["pages"])
    manifest["bytes"] = sum(record["bytes"] for record in manifest["files"])
    (destination / "publication-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    print(f"Published Soup: {manifest['page_count']} pages, {manifest['file_count']} files")
    return manifest
