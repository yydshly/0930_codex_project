"""Build a standalone, user-invoked webpage-avatar extension with stdlib only."""
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
WEB = PROJECT / "web"
EXTENSION = PROJECT / "avatar-extension"
DESTINATION = WEB / "avatar-anywhere" / "downloads" / "avatar-anywhere.zip"
ASSETS = ("engine.js", "model.js", "effects.js", "avatar/character.js", "avatar-anywhere/controller.js", "vendor/matter.min.js")
STATIC = ("manifest.json", "service-worker.js", "content-loader.js", "README.md", "LICENSE", "THIRD_PARTY/LICENSE-MatterJS.txt")
ZIP_ROOT = "avatar-extension/"


def avatar_png(size: int) -> bytes:
    pixels = bytearray()
    for y in range(size):
        pixels.append(0)
        for x in range(size):
            u, v = (x + .5) / size, (y + .5) / size
            head = (u - .5) ** 2 + (v - .29) ** 2 < .13 ** 2
            torso = .37 < u < .63 and .44 < v < .71
            limbs = .25 < u < .37 and .47 < v < .65 or .63 < u < .75 and .47 < v < .65 or .37 < u < .47 and .71 < v < .88 or .53 < u < .63 and .71 < v < .88
            corner = (u < .1 or u > .9) and (v < .1 or v > .9)
            pixels.extend((232, 157, 101, 255) if head else (238, 247, 232, 255) if torso else (123, 201, 198, 255) if limbs else (36, 78, 88, 0 if corner else 255))
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(pixels))) + chunk(b"IEND", b"")


def files() -> list[Path]:
    manifest = json.loads((EXTENSION / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("manifest_version") != 3 or manifest.get("permissions") != ["activeTab", "scripting"] or manifest.get("host_permissions") or manifest.get("content_scripts"):
        raise RuntimeError("Avatar manifest must retain activeTab + scripting only, without persistent host/content-script permissions")
    result = [EXTENSION / name for name in STATIC]
    result.extend(EXTENSION / "icons" / f"{size}.png" for size in (16, 32, 48, 128))
    result.extend(EXTENSION / "assets" / name for name in ASSETS)
    return result


def verify() -> dict:
    packaged = files()
    missing = [str(file.relative_to(PROJECT)) for file in packaged if not file.is_file()]
    if missing:
        raise RuntimeError("Missing avatar extension files: " + ", ".join(missing))
    stale = [name for name in ASSETS if (WEB / name).read_bytes() != (EXTENSION / "assets" / name).read_bytes()]
    if stale:
        raise RuntimeError("Avatar extension assets are stale: " + ", ".join(stale))
    if not DESTINATION.is_file():
        raise RuntimeError("Avatar extension ZIP has not been generated")
    with zipfile.ZipFile(DESTINATION) as archive:
        names = {ZIP_ROOT + file.relative_to(EXTENSION).as_posix() for file in packaged}
        if set(archive.namelist()) != names:
            raise RuntimeError("Avatar ZIP contents differ from the expected file list")
        for file in packaged:
            if archive.read(ZIP_ROOT + file.relative_to(EXTENSION).as_posix()) != file.read_bytes():
                raise RuntimeError("Avatar ZIP is stale: " + file.relative_to(EXTENSION).as_posix())
    return {"extension": str(EXTENSION), "zip": str(DESTINATION), "files": len(packaged), "bytes": DESTINATION.stat().st_size, "sha256": hashlib.sha256(DESTINATION.read_bytes()).hexdigest()}


def package() -> dict:
    missing = [name for name in ASSETS if not (WEB / name).is_file()]
    if missing:
        raise RuntimeError("Avatar source is not ready: " + ", ".join(missing))
    for name in ASSETS:
        target = EXTENSION / "assets" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(WEB / name, target)
    (EXTENSION / "icons").mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        (EXTENSION / "icons" / f"{size}.png").write_bytes(avatar_png(size))
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(DESTINATION, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in files():
            info = zipfile.ZipInfo(ZIP_ROOT + file.relative_to(EXTENSION).as_posix(), date_time=(2026, 10, 2, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, file.read_bytes())
    return verify()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify generated assets and archive without writing files")
    args = parser.parse_args()
    print(json.dumps(verify() if args.check else package(), ensure_ascii=False, indent=2))
