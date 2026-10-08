"""Publish the reviewed 019 scene, understanding page and frozen 018 download.

Only the named resources below are read. Adding a file to web/, assets/ or the
018 project never makes it public. The scene remains index.html; the article is
an additional entry. Publication-day checks do not replace historical WebGL QA.
An existing destination may contain only this release's allowlisted files.
"""
import argparse
import hashlib
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path, PurePosixPath
import posixpath
import re
import stat
from urllib.parse import unquote, urlsplit
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PUBLICATION_DATE = "2026-10-09"
EXPERIMENT_DATE = "2026-10-03"
BASELINE = "20261003-polished-baseline.zip"
BASELINE_MANIFEST = "20261003-polished-baseline.json"
BASELINE_SHA256 = "b00777aab6da43248644f415f8f23eeca44750ad02fa4d91a82b9b66741a5c7d"
BASELINE_FILE_COUNT = 105
RUNTIME_ASSETS = (
    "assets/horse.glb", "assets/HORSE-LICENSE.txt", "assets/THREE-LICENSE.txt",
    "assets/SOURCE-NOTICE.txt", "assets/POLYHAVEN-LICENSE.txt",
    "assets/foliage-clump.png", "assets/source-frame.jpg",
    "assets/pbr/ground-diff.jpg", "assets/pbr/ground-nor_gl.jpg",
    "assets/pbr/ground-rough.jpg",
    "assets/exploration/tent_detailedOpen.glb",
    "assets/exploration/campfire_stones.glb", "assets/exploration/log.glb",
    "assets/exploration/License.txt", "assets/exploration/NOTICE.txt",
)
ARTICLE_FILES = ("understanding.html", "understanding.css")
RESEARCH_FILES = (
    "explorer-v2-camp-polished.png", "explorer-v2-production.png",
    "explorer-v2-route.png", "explorer-v2-creek-photo.png",
    "explorer-lookout-final.png", "explorer-v2-mobile-final.png",
    "explorer-v2-camp-polished-export.png", "explorer-v2-creek-export.png",
    "explorer-v2-comparison.jpg", "explorer-v2-camp-comparison.jpg",
)
COVER = "assets/explorer-v2-camp-polished.png"
MANIFEST = "publication-manifest.json"
BUNDLE_PATTERN = re.compile(r"assets/index-[A-Za-z0-9_-]+\.(?:js|css)")
OUTSIDE_ENTRIES = {"../../index.html", "../018-ridge-atmosphere-lab/index.html"}


def _sha256(data):
    return hashlib.sha256(data).hexdigest()


def _is_link(path):
    if path.is_symlink() or getattr(path, "is_junction", lambda: False)():
        return True
    # Python 3.10 has no Path.is_junction; lstat still exposes Windows reparse
    # attributes. Refuse all reparse points, including directory junctions.
    if os.name == "nt":
        try:
            return bool(path.lstat().st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT)
        except OSError:
            return False
    return False


def _check_chain(path):
    for part in (path, *path.parents):
        if _is_link(part):
            raise ValueError(f"Ridge publication refuses a symlink or junction: {part}")


def _relative_name(value):
    if (not isinstance(value, str) or not value or "\\" in value or ":" in value
            or "\0" in value or value.startswith("/")
            or any(part in {"", ".", ".."} for part in value.split("/"))):
        raise ValueError(f"Unsafe Ridge publication relative path: {value!r}")
    return value


def _read_public_file(path, boundary):
    path, boundary = Path(path).absolute(), Path(boundary).absolute()
    try:
        relative = path.relative_to(boundary).as_posix()
    except ValueError as error:
        raise ValueError(f"Ridge resource escapes its source boundary: {path}") from error
    _relative_name(relative)
    _check_chain(path)
    if not path.is_file() or not path.resolve().is_relative_to(boundary.resolve()):
        raise ValueError(f"Missing or unsafe Ridge public resource: {path}")
    return path.read_bytes()


class _HTMLReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.ids = set()
        self.bundles = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if attributes.get("id"):
            self.ids.add(attributes["id"])
        for key, value in attrs:
            if value and key in {"src", "href", "poster"}:
                self.references.append(value)
            elif value and key == "srcset" and not value.startswith("data:"):
                self.references.extend(candidate.strip().split()[0]
                                       for candidate in value.split(",") if candidate.strip())
        if tag == "script" and attributes.get("src"):
            self.bundles.append(attributes["src"])
        if tag == "link" and "stylesheet" in attributes.get("rel", "").split():
            self.bundles.append(attributes.get("href", ""))


def _client_bundles(index):
    parser = _HTMLReferences()
    parser.feed(index.decode("utf-8"))
    bundles = []
    for url in parser.bundles:
        parsed = urlsplit(url)
        relative = unquote(parsed.path)
        if relative.startswith("./"):
            relative = relative[2:]
        if parsed.scheme or parsed.netloc or not BUNDLE_PATTERN.fullmatch(relative):
            raise ValueError(f"The Ridge client must use its current relative hashed bundle: {url}")
        bundles.append(relative)
    if (len(bundles) != 2 or len(set(bundles)) != 2
            or sum(name.endswith(".js") for name in bundles) != 1
            or sum(name.endswith(".css") for name in bundles) != 1):
        raise ValueError("The Ridge client must reference exactly one current JS and one current CSS bundle")
    return tuple(bundles)


def _validate_baseline(archive_data, manifest_data):
    if _sha256(archive_data) != BASELINE_SHA256:
        raise ValueError("The frozen 018 baseline ZIP SHA-256 changed")
    try:
        manifest = json.loads(manifest_data)
        if not isinstance(manifest, dict):
            raise ValueError("The 018 baseline manifest must be a JSON object")
        files = manifest.get("files", [])
        if (manifest.get("archive") != BASELINE
                or manifest.get("source_project") != "projects/018-ridge-atmosphere-lab"
                or manifest.get("version") != "018-polished-baseline-20261003"
                or manifest.get("file_count") != BASELINE_FILE_COUNT
                or not isinstance(files, list) or len(files) != BASELINE_FILE_COUNT):
            raise ValueError("The 018 baseline manifest must identify all 105 frozen members")
        records = {}
        for record in files:
            if not isinstance(record, dict):
                raise ValueError("Invalid 018 baseline member record")
            name = _relative_name(record.get("path"))
            if (name in records or type(record.get("bytes")) is not int or record["bytes"] < 0
                    or not re.fullmatch(r"[0-9a-f]{64}", str(record.get("sha256", "")))):
                raise ValueError(f"Invalid or duplicated 018 baseline member: {name}")
            records[name] = record
        with zipfile.ZipFile(io.BytesIO(archive_data)) as archive:
            members = archive.infolist()
            if (len(members) != BASELINE_FILE_COUNT
                    or {member.filename for member in members} != set(records)):
                raise ValueError("The frozen 018 ZIP and its 105-member manifest disagree")
            if archive.testzip() is not None:
                raise ValueError("The frozen 018 ZIP failed its CRC check")
            for member in members:
                _relative_name(member.filename)
                if (member.is_dir() or stat.S_ISLNK(member.external_attr >> 16)
                        or member.flag_bits & 1):
                    raise ValueError(f"Unsafe 018 ZIP member: {member.filename}")
                data = archive.read(member)
                record = records[member.filename]
                if (len(data) != record["bytes"] or member.file_size != record["bytes"]
                        or _sha256(data) != record["sha256"]):
                    raise ValueError(f"The 018 baseline member changed: {member.filename}")
    except (UnicodeError, json.JSONDecodeError, zipfile.BadZipFile, KeyError, TypeError) as error:
        raise ValueError(f"Invalid frozen 018 baseline: {error}") from error


def _resources(project):
    project = Path(project).absolute()
    _check_chain(project)
    if not project.is_dir():
        raise ValueError(f"Missing Ridge Explorer project: {project}")
    index = _read_public_file(project / "web/index.html", project)
    resources = {"index.html": index}
    for relative in (*_client_bundles(index), *RUNTIME_ASSETS):
        resources[relative] = _read_public_file(project / "web" / relative, project)
    for relative in ARTICLE_FILES:
        resources[relative] = _read_public_file(project / "publication" / relative, project)
    for name in RESEARCH_FILES:
        resources["research-assets/" + name] = _read_public_file(project / "assets" / name, project)
    # Catalog cover and the article hero retain the identical actual capture.
    resources[COVER] = resources["research-assets/explorer-v2-camp-polished.png"]
    baseline = project.parent / "018-ridge-atmosphere-lab/releases"
    archive = _read_public_file(baseline / BASELINE, project.parent)
    checksum = _read_public_file(baseline / BASELINE_MANIFEST, project.parent)
    _validate_baseline(archive, checksum)
    resources["downloads/" + BASELINE] = archive
    resources["downloads/" + BASELINE_MANIFEST] = checksum
    _verify_references(resources)
    return resources


def _verify_references(resources):
    parsers = {}
    for relative, data in resources.items():
        if relative.endswith(".html"):
            parser = _HTMLReferences()
            parser.feed(data.decode("utf-8"))
            parsers[relative] = parser
    checked = 0
    outside = set()
    for relative, data in resources.items():
        suffix = PurePosixPath(relative).suffix
        references = []
        if suffix == ".html":
            references = parsers[relative].references
        elif suffix == ".css":
            text = data.decode("utf-8")
            references = re.findall(r"url\(\s*['\"]?([^'\"\)]+)['\"]?\s*\)", text)
            references += re.findall(r"@import\s+['\"]([^'\"]+)['\"]", text)
        elif suffix == ".js":
            text = data.decode("utf-8")
            imports = re.findall(r"(?:\bfrom\s*|\bimport\s*|\bimport\(\s*)['\"]([^'\"]+)['\"]", text)
            references = [url for url in imports if url.startswith(("./", "../"))]
        for url in references:
            parsed = urlsplit(url)
            if parsed.netloc or parsed.scheme in {"http", "https", "mailto", "data"}:
                continue
            if parsed.scheme:
                raise ValueError(f"Unsupported Ridge page reference in {relative}: {url}")
            path = unquote(parsed.path)
            if path.startswith("/") or "\\" in path or "\0" in path:
                raise ValueError(f"Ridge reference is not portable beneath the project subpath: {url}")
            if not path:
                target = relative
            else:
                target = posixpath.normpath(posixpath.join(posixpath.dirname(relative), path))
                if path.endswith("/") or target == ".":
                    target = posixpath.join(target, "index.html")
                    target = posixpath.normpath(target)
            if target in OUTSIDE_ENTRIES:
                outside.add(target)
                continue  # Existing catalog / 018 runtime are published by their own builder.
            if target == MANIFEST:
                checked += 1  # Generated only after all source resources have validated.
                continue
            if target not in resources:
                raise ValueError(f"Missing or unreviewed Ridge page dependency in {relative}: {url}")
            if parsed.fragment and target in parsers and parsed.fragment not in parsers[target].ids:
                raise ValueError(f"Missing Ridge page anchor in {relative}: {url}")
            checked += 1
    return {"local_references_checked": checked, "separate_site_entries": sorted(outside)}


def _destination_files(destination):
    _check_chain(destination)
    if not destination.exists():
        return set()
    if not destination.is_dir():
        raise ValueError(f"Ridge destination must be a directory: {destination}")
    files = set()
    for directory, directories, filenames in os.walk(destination, followlinks=False):
        for name in (*directories, *filenames):
            path = Path(directory) / name
            if _is_link(path):
                raise ValueError(f"Ridge publication refuses a symlink or junction: {path}")
        for name in filenames:
            path = Path(directory) / name
            if not path.is_file():
                raise ValueError(f"Unsupported Ridge publication filesystem entry: {path}")
            files.add(path.relative_to(destination).as_posix())
    return files


def publish_ridge_explorer(project, destination):
    """Validate every named source before writing a portable, exact public set."""
    project, destination = Path(project).absolute(), Path(destination).absolute()
    if destination == project or project.is_relative_to(destination) or destination.is_relative_to(project):
        raise ValueError("Ridge publication destination must be separate from its source project")
    baseline_project = project.parent / "018-ridge-atmosphere-lab"
    if destination == baseline_project or destination.is_relative_to(baseline_project):
        raise ValueError("Ridge publication cannot write into the frozen 018 source project")
    resources = _resources(project)
    allowed = set(resources) | {MANIFEST}
    unexpected = _destination_files(destination) - allowed
    if unexpected:
        raise ValueError("Unexpected existing Ridge publication files; use a clean destination: "
                         + ", ".join(sorted(unexpected)))
    records = []
    for relative, data in sorted(resources.items()):
        target = destination / relative
        _check_chain(target)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        records.append(dict(path=relative, bytes=len(data), sha256=_sha256(data)))
    manifest = dict(
        project="019-ridge-explorer", publication_date=PUBLICATION_DATE,
        experiment_snapshot_date=EXPERIMENT_DATE,
        entrypoints=dict(scene="index.html", understanding="understanding.html",
                         saved_scene="../018-ridge-atmosphere-lab/"),
        scope="Finite independent browser ridge exploration scene, connected trails, landmark stops, optional ride recovery, photography and opt-in procedural audio; retained runtime, licenses, actual historical captures and the frozen 018 source/client baseline. Product directions are proposals, not a delivered game engine or hosted platform.",
        historical_validation="43 automated scene checks and local browser captures from 2026-10-03; publication checks verify packaged bytes and links, not new cross-device or acoustic measurements.",
        baseline=dict(path="downloads/" + BASELINE, manifest="downloads/" + BASELINE_MANIFEST,
                      sha256=BASELINE_SHA256, file_count=BASELINE_FILE_COUNT,
                      recorded_date=EXPERIMENT_DATE, unchanged=True, crc_checked=True),
        hero=dict(path="research-assets/explorer-v2-camp-polished.png", cover=COVER,
                  sha256=_sha256(resources[COVER]), recorded_date=EXPERIMENT_DATE),
        files=records,
    )
    (destination / MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                                        encoding="utf-8", newline="\n")
    return manifest


def verify_ridge_publication(project, destination):
    """Compare published bytes with reviewed sources, ZIP members and local links."""
    project, destination = Path(project).absolute(), Path(destination).absolute()
    resources = _resources(project)
    actual = _destination_files(destination)
    if actual != set(resources) | {MANIFEST}:
        raise ValueError("Ridge publication contains unexpected or missing files")
    try:
        manifest = json.loads(_read_public_file(destination / MANIFEST, destination))
    except (UnicodeError, json.JSONDecodeError) as error:
        raise ValueError("Invalid Ridge publication manifest") from error
    if not isinstance(manifest, dict):
        raise ValueError("Ridge publication manifest must be a JSON object")
    if (manifest.get("project") != "019-ridge-explorer"
            or manifest.get("publication_date") != PUBLICATION_DATE
            or manifest.get("experiment_snapshot_date") != EXPERIMENT_DATE):
        raise ValueError("Ridge publication and historical experiment dates are not correctly separated")
    baseline = manifest.get("baseline", {})
    if (not isinstance(baseline, dict) or baseline.get("path") != "downloads/" + BASELINE
            or baseline.get("manifest") != "downloads/" + BASELINE_MANIFEST
            or baseline.get("sha256") != BASELINE_SHA256
            or baseline.get("file_count") != BASELINE_FILE_COUNT
            or baseline.get("recorded_date") != EXPERIMENT_DATE
            or baseline.get("unchanged") is not True or baseline.get("crc_checked") is not True):
        raise ValueError("Ridge publication does not identify the unchanged 105-member 018 baseline")
    records = manifest.get("files", [])
    if (not isinstance(records, list) or len(records) != len(resources)
            or any(not isinstance(record, dict) or not isinstance(record.get("path"), str)
                   for record in records)
            or {record.get("path") for record in records} != set(resources)):
        raise ValueError("Ridge publication manifest is incomplete or duplicated")
    for record in records:
        relative = record["path"]
        data = _read_public_file(destination / relative, destination)
        if (data != resources[relative] or type(record.get("bytes")) is not int
                or len(data) != record["bytes"] or _sha256(data) != record.get("sha256")):
            raise ValueError(f"Published Ridge resource changed: {relative}")
    if resources[COVER] != resources["research-assets/explorer-v2-camp-polished.png"]:
        raise ValueError("Ridge catalog cover and article hero differ")
    hero = manifest.get("hero", {})
    if (not isinstance(hero, dict) or hero.get("path") != "research-assets/explorer-v2-camp-polished.png"
            or hero.get("cover") != COVER or hero.get("sha256") != _sha256(resources[COVER])):
        raise ValueError("Ridge publication hero does not identify its actual capture")
    _validate_baseline(resources["downloads/" + BASELINE], resources["downloads/" + BASELINE_MANIFEST])
    closure = _verify_references(resources)
    return dict(project="019-ridge-explorer", files_checked=len(resources),
                publication_date=PUBLICATION_DATE, experiment_snapshot_date=EXPERIMENT_DATE,
                baseline_sha256=BASELINE_SHA256, baseline_members_checked=BASELINE_FILE_COUNT,
                baseline_crc_checked=True, source_bytes_unchanged=True, **closure)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=ROOT / "projects/019-ridge-explorer")
    parser.add_argument("--site", type=Path, default=ROOT / "_site/projects/019-ridge-explorer")
    parser.add_argument("--check", action="store_true", help="Verify an already built public package")
    args = parser.parse_args()
    try:
        if not args.check:
            publish_ridge_explorer(args.project, args.site)
        print(json.dumps(verify_ridge_publication(args.project, args.site), ensure_ascii=False, indent=2))
    except (ValueError, OSError) as error:
        parser.exit(2, f"Ridge publication failed: {error}\n")
