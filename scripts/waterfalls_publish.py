"""Publish the reviewed complete 017 runtime and its reproducible V9 foundation.

This is a static allowlist: adding a file to web/ does not publish it implicitly.
Runtime WGSL, EA scene JSON, and the two reviewed project downloads are included
explicitly. Historical V9 measurements are not publication-day measurements.
"""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit
import zipfile

PUBLICATION_DATE = "2026-10-09"
EXPERIMENT_DATE = "2026-10-03"
GUIDE_HASHES = {
    "png": "c2537617473a3ae17ecd21d842285c7cefbbc57a26d58945ce8d86d4965fecf1",
    "svg": "9d094e0e2be76dbeee66f755682778b9c1138e8c293dcb06303673e58c43c5dd",
}
FOUNDATION = "waterfalls-lab-studio09-foundation.zip"
FOUNDATION_SHA256 = "f7ce08ac9db02109493167be518a92244523f5c8de1b4072efb3fd5f68cd008d"
PROJECT_DOWNLOADS = ("river-cavern.waterfalls.json", "river-confluence.waterfalls.json")
RUNTIME_FILES = (
    "index.html", "style.css", "app.js", "terrain-worker.js",
    "understanding.html", "understanding.css", "understanding.js",
    "source-notice.html", "EA-PBMPM-LICENSE.txt", "BREAKPOINT-LICENSE.txt",
    "THREE-LICENSE.txt", "app.js.LEGAL.txt",
)
UPSTREAM_FILES = (
    "index.html", "style.css", "LICENSE.md",
    "src/main.js", "src/gpu.js", "src/sim.js", "src/shader.js", "src/render.js",
    "src/ui.js", "src/time.js", "src/v.js", "src/buffer_factory.js",
    "data/SEED.jpg", "data/SEED_logo.png", "data/SEED_inverted.png", "data/rotate.svg",
    "shaders/g2p2g.wgsl", "shaders/bukkitCount.wgsl", "shaders/bukkitAllocate.wgsl",
    "shaders/bukkitInsert.wgsl", "shaders/particleEmit.wgsl", "shaders/setIndirectArgs.wgsl",
    "shaders/particleRender.wgsl", "shaders/bukkit.inc.wgsl", "shaders/dispatch.inc.wgsl",
    "shaders/matrix.inc.wgsl", "shaders/particle.inc.wgsl", "shaders/random.inc.wgsl",
    "shaders/shapes.inc.wgsl", "shaders/simConstants.inc.wgsl",
    "scenes/manifest.json", "scenes/damBreak.json", "scenes/seedLogo.json",
    "scenes/sillyRubber.json", "scenes/plasticPress.json", "scenes/boxFracture.json",
    "scenes/folding.json",
)
RESEARCH_FILES = (
    "understanding-map.png", "understanding-map.svg", "landscape-v9.png",
    "confluence-v9.jpg", "mobile-v9.jpg", "immersive-mobile-v9.jpg",
)
PUBLIC_WEB_FILES = tuple(sorted(
    list(RUNTIME_FILES)
    + ["upstream/" + path for path in UPSTREAM_FILES]
    + ["research-assets/" + path for path in RESEARCH_FILES]
))


def _sha256(data):
    return hashlib.sha256(data).hexdigest()


def _read_public_file(path, boundary):
    if (not path.is_file() or path.is_symlink()
            or not path.resolve().is_relative_to(boundary.resolve())
            or any(part.startswith(".") or part in {"node_modules", "__pycache__"}
                   for part in path.relative_to(boundary).parts)):
        raise ValueError(f"Missing or unsafe Waterfalls public resource: {path}")
    return path.read_bytes()


def _resources(project):
    web = project / "web"
    resources = {relative: _read_public_file(web / relative, web)
                 for relative in PUBLIC_WEB_FILES}
    for suffix, expected in GUIDE_HASHES.items():
        relative = f"assets/understanding-map.{suffix}"
        data = _read_public_file(project / relative, project)
        if (_sha256(data) != expected
                or data != resources[f"research-assets/understanding-map.{suffix}"]):
            raise ValueError(f"Original Waterfalls understanding guide changed: {relative}")
        resources[relative] = data
    for name in PROJECT_DOWNLOADS:
        data = _read_public_file(project / "assets" / name, project)
        record = json.loads(data)
        if record.get("format") != "waterfalls-lab" or record.get("version") != 2:
            raise ValueError(f"Invalid Waterfalls V2 project download: {name}")
        resources["downloads/" + name] = data
    archive = _read_public_file(project / "artifacts" / FOUNDATION, project)
    checksum = _read_public_file(project / "artifacts" / (FOUNDATION + ".sha256"), project)
    if _sha256(archive) != FOUNDATION_SHA256:
        raise ValueError("The frozen STUDIO 09 foundation ZIP changed")
    if checksum.decode("utf-8").strip().split() != [FOUNDATION_SHA256, FOUNDATION]:
        raise ValueError("The STUDIO 09 ZIP checksum does not match the frozen baseline")
    resources["downloads/" + FOUNDATION] = archive
    resources["downloads/" + FOUNDATION + ".sha256"] = checksum
    return resources


def publish_waterfalls(project, destination):
    """Write only reviewed files, retaining every relative runtime dependency."""
    project, destination = Path(project), Path(destination)
    resources = _resources(project)  # Validate all inputs before writing anything.
    records = []
    for relative, data in sorted(resources.items()):
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        records.append(dict(path=relative, bytes=len(data), sha256=_sha256(data)))
    manifest = dict(
        project="017-waterfalls-lab", publication_date=PUBLICATION_DATE,
        experiment_snapshot_date=EXPERIMENT_DATE, studio_version=9,
        historical_validation="V9 local GPU records and 91 historical automated checks; not a new cross-device measurement on the publication date.",
        original_guide_unchanged=True, original_guide_sha256=GUIDE_HASHES,
        foundation=dict(path="downloads/" + FOUNDATION, sha256=FOUNDATION_SHA256,
                        recorded_date=EXPERIMENT_DATE, unchanged=True),
        scope="Complete independent 3D WebGPU water studio, understanding page, original summary PNG/SVG, historical real-render images, retained EA 2D runtime and WGSL/scenes, licenses, two saved designs and frozen V9 source foundation. Future product directions require business integration; public SDK, cloud platform, video pipeline and engineering-grade precision are not delivered.",
        files=records,
    )
    (destination / "publication-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    return manifest


class _HTMLReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and key in {"src", "href", "poster"}:
                self.references.append(value)


def _local_reference(base, url, destination):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc or not parsed.path or parsed.path.startswith("/"):
        return None
    target = (base / unquote(parsed.path)).resolve()
    # The catalog back link intentionally leaves this subproject.
    if not target.is_relative_to(destination.resolve()):
        return None
    if target.is_dir():
        target /= "index.html"
    return target


def verify_waterfalls_publication(project, destination):
    """Check source-byte integrity plus HTML, module, EA scene and WGSL closure."""
    project, destination = Path(project), Path(destination)
    resources = _resources(project)
    manifest = json.loads((destination / "publication-manifest.json").read_text(encoding="utf-8"))
    if manifest.get("publication_date") != PUBLICATION_DATE or manifest.get("experiment_snapshot_date") != EXPERIMENT_DATE:
        raise ValueError("Publication and historical V9 dates are not correctly separated")
    records = manifest.get("files", [])
    if len(records) != len(resources) or {record["path"] for record in records} != set(resources):
        raise ValueError("Waterfalls publication manifest is incomplete or duplicated")
    actual_files = {path.relative_to(destination).as_posix() for path in destination.rglob("*") if path.is_file()}
    if actual_files != set(resources) | {"publication-manifest.json"}:
        raise ValueError("Waterfalls publication contains unexpected or missing files")
    references_checked = 0
    for record in records:
        relative = record["path"]
        target = destination / relative
        data = _read_public_file(target, destination)
        if data != resources[relative] or len(data) != record["bytes"] or _sha256(data) != record["sha256"]:
            raise ValueError(f"Published Waterfalls resource changed: {relative}")
        references = []
        if target.suffix in {".html", ".css", ".js", ".wgsl"}:
            text = data.decode("utf-8")
            if target.suffix == ".html":
                parser = _HTMLReferences()
                parser.feed(text)
                references += [(target.parent, url) for url in parser.references]
            elif target.suffix == ".css":
                references += [(target.parent, url) for url in re.findall(r"url\(\s*['\"]?([^'\"\)]+)['\"]?\s*\)", text)]
            elif target.suffix == ".js":
                imports = re.findall(r"(?:\bfrom\s*|\bimport\s*)['\"]([^'\"]+)['\"]", text)
                imports += re.findall(r"\bimport\(\s*['\"]([^'\"]+)['\"]\s*\)", text)
                references += [(target.parent, url) for url in imports if url.startswith(".")]
                document_base = destination / "upstream" if relative.startswith("upstream/src/") else destination
                fetches = re.findall(r"\bfetch\(\s*['\"]([^'\"]+)['\"]\s*\)", text)
                references += [(document_base, url) for url in fetches]
                if relative == "upstream/src/shader.js":
                    shader_table = re.search(r"export\s+let\s+Shaders\s*=\s*\{(.*?)\}", text, re.DOTALL)
                    shaders = re.findall(r"^\s*\w+:\s*['\"](\w+)['\"]", shader_table[1] if shader_table else "", re.MULTILINE)
                    references += [(destination / "upstream/shaders", name + ".wgsl") for name in shaders]
            else:
                references += [(target.parent, name + ".wgsl") for name in re.findall(r"^\s*//!include\s+(\S+)", text, re.MULTILINE)]
        for base, url in references:
            resolved = _local_reference(base, url, destination)
            if resolved is not None:
                if not resolved.is_file():
                    raise ValueError(f"Missing Waterfalls dependency referenced by {relative}: {url}")
                references_checked += 1
    scenes = json.loads((destination / "upstream/scenes/manifest.json").read_text(encoding="utf-8"))
    for scene in scenes:
        target = _local_reference(destination / "upstream", scene["scene"], destination)
        if target is None or not target.is_file():
            raise ValueError(f"Missing EA runtime scene: {scene['scene']}")
        json.loads(target.read_text(encoding="utf-8"))
        references_checked += 1
    with zipfile.ZipFile(destination / "downloads" / FOUNDATION) as archive:
        if archive.testzip() is not None:
            raise ValueError("The published foundation ZIP is corrupt")
    return dict(project="017-waterfalls-lab", files_checked=len(records),
                runtime_references_checked=references_checked,
                original_guides_unchanged=True, frozen_foundation_unchanged=True,
                publication_date=PUBLICATION_DATE, experiment_snapshot_date=EXPERIMENT_DATE)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path("projects/017-waterfalls-lab"))
    parser.add_argument("--site", type=Path, default=Path("_site/projects/017-waterfalls-lab"))
    parser.add_argument("--check", action="store_true", help="Verify an already built public package")
    args = parser.parse_args()
    if not args.check:
        publish_waterfalls(args.project, args.site)
    print(json.dumps(verify_waterfalls_publication(args.project, args.site), ensure_ascii=False, indent=2))
