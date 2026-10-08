"""Prepare this existing study for publication and verify its public files."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor

PROJECT = Path(__file__).resolve().parents[1]
REPOSITORY = PROJECT.parents[1]
PUBLIC_EXTENSIONS = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".webp", ".woff2"}
SUMMARY = (
    "定位：可编辑动效与代码驱动内容制作研究；"
    "能力：固定版本37个已完成动效、19项原作视频和3支成片案例；"
    "效果：字符重组、逐字强调、图文接力、图片对比与切换；"
    "原理：JS算法与时间计算元素状态，Canvas/WebGL绘制及逐帧编码；"
    "场景：品牌标题、产品说明、作品对比、课程章节与日报模板；"
    "价值：用画面语言指导制作，把内容、视觉与节奏保存为可复用配方；"
    "比较：CellMotion提供具体动效，Remotion组织代码视频，HeyGen提供AI视频服务；"
    "扩展：四种原创演示、图片替换、需求生成、PNG/JSON保存与完整理解总览；"
    "边界：实验室未接入AI、音轨或视频编码，自动日报尚未实现，原作媒体需联网。"
)


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def prepare(demo=None):
    catalog_path = REPOSITORY / "projects.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    entry = next((p for p in catalog if p["id"] == 8), None)
    if entry is None:
        entry = {"id": 8, "slug": "cellmotion", "name": "CellMotion · 可编辑动效研究",
                 "repo": "https://github.com/opc8838-hub/font-animation", "status": "已完成", "demo": ""}
        catalog.append(entry)
    if entry["slug"] != "cellmotion":
        raise ValueError("Existing project 008 has another identity")
    entry.update(summary=SUMMARY, cover="assets/understanding-map.png")
    if demo:
        if not demo.startswith("https://yydshly.github.io/0930_codex_project/projects/008-cellmotion/"):
            raise ValueError("Unexpected verified deployment URL")
        entry["demo"] = demo
    save(catalog_path, sorted(catalog, key=lambda p: p["id"]))
    for path in (PROJECT / "web").rglob("*"):
        if path.is_file() and path.suffix in {".html", ".css", ".js", ".svg"}:
            path.write_bytes(path.read_bytes().replace(b"\r\n", b"\n"))
    original = PROJECT / "assets/understanding-map.png"
    published = PROJECT / "web/assets/understanding-map.png"
    expected = "d982837123f17f1f83e9e7a664f9e31cbedf6d5d603553b8f874b21b5d822ffe"
    if any(hashlib.sha256(path.read_bytes()).hexdigest() != expected for path in (original, published)):
        raise ValueError("The requested existing overview image changed")
    files = []
    for path in sorted((PROJECT / "web").rglob("*")):
        if path.is_file() and path.suffix in PUBLIC_EXTENSIONS:
            raw = path.read_bytes()
            files.append({"path": path.relative_to(PROJECT / "web").as_posix(), "bytes": len(raw),
                          "sha256": hashlib.sha256(raw).hexdigest()})
    save(PROJECT / "notes/publication-manifest.json", {
        "date": "2026-10-08", "entry": "index.html", "pages": ["index.html", "workshop.html", "summary.html"],
        "guide": "assets/understanding-map.png", "guide_sha256": expected, "files": files,
        "external_media": "Original videos, covers and editors stream from the credited upstream site; they are not republished.",
        "excluded": ["build outputs", "dependencies", "local-only test downloads"],
    })
    print(f"Prepared project 008: {len(files)} public files; existing guide image preserved")


def verify(base_url, commit):
    manifest = json.loads((PROJECT / "notes/publication-manifest.json").read_text(encoding="utf-8"))
    if not base_url.endswith("/"):
        base_url += "/"

    def fetch(item):
        url = urljoin(base_url, item["path"])
        request = Request(url, headers={"User-Agent": "CellMotion-Publication-Verification/1.0", "Cache-Control": "no-cache"})
        try:
            with urlopen(request, timeout=40) as response:
                raw = response.read()
                digest = hashlib.sha256(raw).hexdigest()
                return {"path": item["path"], "url": url, "status": response.status, "bytes": len(raw),
                        "sha256": digest, "passed": response.status == 200 and digest == item["sha256"]}
        except Exception as error:
            return {"path": item["path"], "url": url, "passed": False, "error": str(error)}

    with ThreadPoolExecutor(max_workers=6) as pool:
        files = list(pool.map(fetch, manifest["files"]))
    report = {"date": "2026-10-08", "base_url": base_url, "commit": commit, "files": files,
              "passed": all(f["passed"] for f in files)}
    save(PROJECT / "notes/deployment-checks.json", report)
    print(f"Verified {sum(f['passed'] for f in files)}/{len(files)} public file hashes")
    for item in files:
        if not item["passed"]:
            print(item)
    if not report["passed"]:
        raise SystemExit(1)


def verify_upstream():
    """Check the original media/editor addresses without downloading media."""
    original = json.loads((PROJECT / "notes/resource-checks.json").read_text(encoding="utf-8"))

    def fetch(item):
        result = {key: item[key] for key in ("effect", "kind", "url")}
        for _ in range(2):
            try:
                request = Request(item["url"], method="HEAD", headers={"User-Agent": "CellMotion-Publication-Verification/1.0"})
                with urlopen(request, timeout=25) as response:
                    result.update(status=response.status, passed=response.status == 200)
                return result
            except OSError as error:
                result.update(passed=False, error=str(error))
        return result

    with ThreadPoolExecutor(max_workers=8) as pool:
        resources = list(pool.map(fetch, original["resources"]))
    save(PROJECT / "notes/publication-upstream-checks.json", {
        "date": "2026-10-08", "method": "HEAD", "resources": resources,
        "scope": "Availability only; complete editor features are not verified by HEAD.",
        "passed": all(item["passed"] for item in resources),
    })
    print(f"Checked {sum(item['passed'] for item in resources)}/{len(resources)} original media and editor addresses")
    for item in resources:
        if not item["passed"]:
            print(item)
    if not all(item["passed"] for item in resources):
        raise SystemExit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["prepare", "verify", "upstream"])
    parser.add_argument("--demo")
    parser.add_argument("--url")
    parser.add_argument("--commit", default="")
    args = parser.parse_args()
    if args.mode == "prepare":
        prepare(args.demo)
    elif args.mode == "upstream":
        verify_upstream()
    else:
        if not args.url:
            parser.error("verify requires --url")
        verify(args.url, args.commit)
