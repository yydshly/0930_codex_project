"""Package the user-invoked Manifest V3 extension without external dependencies."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import struct
import zipfile
import zlib

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "web" / "toolbox"
EXTENSION = PROJECT / "extension"
DESTINATION = SOURCE / "downloads" / "forma-web-toolbox.zip"
ASSETS = ("toolbox.js", "toolbox.css", "translation.js", "data.js")


def icon_png(size: int) -> bytes:
    """A small F mark rendered with plain PNG primitives, no imaging package."""
    pixels = bytearray()
    for y in range(size):
        pixels.append(0)
        for x in range(size):
            u, v = x / size, y / size
            rounded = (u < .1 or u > .9) and (v < .1 or v > .9)
            letter = .28 <= u < .4 and .22 <= v < .78 or .28 <= u < .75 and .22 <= v < .34 or .28 <= u < .65 and .45 <= v < .57
            pixels.extend((242, 246, 232, 255) if letter else (41, 106, 89, 0 if rounded else 255))
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(pixels))) + chunk(b"IEND", b"")


def manifest_files() -> list[Path]:
    manifest = json.loads((EXTENSION / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["manifest_version"] == 3
    assert manifest["host_permissions"] == ["https://api.mymemory.translated.net/*"]
    assert "content_scripts" not in manifest
    files = [EXTENSION / name for name in ("manifest.json", "service-worker.js", "content-loader.js", "README.md", "LICENSE")]
    files.extend(EXTENSION / "icons" / f"{size}.png" for size in (16, 32, 48, 128))
    files.extend(EXTENSION / "assets" / name for name in ASSETS)
    return files


def verify() -> dict:
    files = manifest_files()
    missing = [str(path.relative_to(PROJECT)) for path in files if not path.is_file()]
    if missing:
        raise RuntimeError("Missing extension files: " + ", ".join(missing))
    stale = [name for name in ASSETS if (SOURCE / name).read_bytes() != (EXTENSION / "assets" / name).read_bytes()]
    if stale:
        raise RuntimeError("Extension assets are stale: " + ", ".join(stale))
    if not DESTINATION.is_file():
        raise RuntimeError("Extension ZIP has not been generated")
    with zipfile.ZipFile(DESTINATION) as archive:
        expected = {str(path.relative_to(EXTENSION)).replace("\\", "/") for path in files}
        if set(archive.namelist()) != expected:
            raise RuntimeError("ZIP content does not match the extension file list")
        for file in files:
            name = str(file.relative_to(EXTENSION)).replace("\\", "/")
            if archive.read(name) != file.read_bytes():
                raise RuntimeError("ZIP is stale: " + name)
    return {"extension": str(EXTENSION), "zip": str(DESTINATION), "files": len(files), "bytes": DESTINATION.stat().st_size, "sha256": hashlib.sha256(DESTINATION.read_bytes()).hexdigest()}


def package() -> dict:
    missing = [name for name in ASSETS if not (SOURCE / name).is_file()]
    if missing:
        raise RuntimeError("Toolbox source is not ready: " + ", ".join(missing))
    (EXTENSION / "assets").mkdir(parents=True, exist_ok=True)
    (EXTENSION / "icons").mkdir(parents=True, exist_ok=True)
    for name in ASSETS:
        shutil.copyfile(SOURCE / name, EXTENSION / "assets" / name)
    for size in (16, 32, 48, 128):
        (EXTENSION / "icons" / f"{size}.png").write_bytes(icon_png(size))
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(DESTINATION, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in manifest_files():
            name = str(file.relative_to(EXTENSION)).replace("\\", "/")
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 2, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, file.read_bytes())
    return verify()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check generated assets and ZIP without changing files")
    args = parser.parse_args()
    print(json.dumps(verify() if args.check else package(), ensure_ascii=False, indent=2))
