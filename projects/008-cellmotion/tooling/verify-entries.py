"""Verify public research entrances and the previously published project URLs."""
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT = Path(__file__).resolve().parents[1]
REPOSITORY = PROJECT.parents[1]
SITE = "https://yydshly.github.io/0930_codex_project/"
CATALOG = json.loads((REPOSITORY / "projects.json").read_text(encoding="utf-8"))
urls = [SITE]
urls += [project["demo"] for project in CATALOG if project["id"] != 8 and project["demo"]]
urls += [
    SITE + "projects/008-cellmotion/assets/understanding-map.png",
    "https://github.com/yydshly/0930_codex_project/tree/main/projects/008-cellmotion",
    "https://github.com/yydshly/0930_codex_project/blob/main/projects/008-cellmotion/notes/understanding-summary.md",
    "https://opc8838-hub.github.io/font-animation/cellmotion.html#stories",
]


def check(url):
    request = Request(url, method="HEAD", headers={"User-Agent": "CellMotion-Publication-Verification/1.0"})
    try:
        with urlopen(request, timeout=40) as response:
            return {"url": url, "status": response.status, "passed": response.status == 200}
    except OSError as error:
        return {"url": url, "passed": False, "error": str(error)}


with ThreadPoolExecutor(max_workers=6) as pool:
    checks = list(pool.map(check, urls))
report = {"date": "2026-10-08", "method": "HEAD", "scope": "Public entrances and availability of existing projects; not full regression of their interactions.",
          "checks": checks, "passed": all(item["passed"] for item in checks)}
(PROJECT / "notes/publication-entries.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Public entrances: {sum(item['passed'] for item in checks)}/{len(checks)} available")
for item in checks:
    if not item["passed"]:
        print(item)
if not report["passed"]:
    raise SystemExit(1)
