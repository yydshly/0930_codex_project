"""Publish the complete Chippytea runtime, reviewed guide and previews."""
from pathlib import Path
import hashlib, json, shutil
GUIDE_SHA256="b3420ebbed9fef286436c1adbfe731ef2673e8e3ec095d3175b13380dd81bf2e"
EXTENSIONS={".html",".css",".js",".txt",".svg",".png",".jpg",".webp",".woff2",".json",".mp3",".mp4"}
def publish_chippytea(project,destination):
    project,destination=Path(project),Path(destination)
    web=project/"web"
    files=[p for p in sorted(web.rglob("*")) if p.is_file() and p.suffix.lower() in EXTENSIONS and not any(x.startswith(".") or x=="node_modules" for x in p.relative_to(web).parts)]
    for p in files:
        if p.is_symlink():raise ValueError("Symlink in Chippytea publication")
    guide=web/"assets/chippytea-understanding-map-v1.png"
    if hashlib.sha256(guide.read_bytes()).hexdigest()!=GUIDE_SHA256:raise ValueError("Original understanding guide changed")
    if len(list((web/"worlds").rglob("*.png")))!=29:raise ValueError("Incomplete original world art")
    for name in ["index.html","research.html","source-notice.html","app.js","overview.css","audio/gravity-minimax.mp3","audio/shadow-minimax.mp3","assets/previews/gravity-v10.mp4","assets/previews/moon-v10.mp4","assets/previews/shadow-v10.mp4"]:
        if not (web/name).is_file():raise ValueError("Missing Chippytea runtime "+name)
    destination.mkdir(parents=True,exist_ok=True)
    records=[]
    for p in files:
        rel=p.relative_to(web).as_posix()
        q=destination/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
        records.append(dict(path=rel,bytes=q.stat().st_size,sha256=hashlib.sha256(q.read_bytes()).hexdigest()))
    manifest=dict(project="016-chippytea-lab",publication_date="2026-10-08",upstream_snapshot="f245695",world_version=10,original_guide_unchanged=True,guide_sha256=GUIDE_SHA256,music=dict(provider="MiniMax",gravity="generated",shadow="generated",moon="pending",runtime_generation=False),previews="v10 offline render with original playback music where available; not browser recordings",scope="Static overview, complete research reader, original source comparison, three interactive worlds, historical folio and read-only workspace snapshot. Real business integration, native cleanup and product benefit validation are not implemented.",files=records)
    (destination/"publication-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    return manifest

