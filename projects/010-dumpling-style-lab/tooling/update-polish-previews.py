"""Encode reviewed, real browser screenshots as gallery covers; no repainting."""
from pathlib import Path
import hashlib
import json
from PIL import Image

root = Path(__file__).resolve().parents[1]
captures = root / "assets/game-forms/polish-qa"
destination = root / "web/assets/game-forms/polish/previews"
destination.mkdir(parents=True, exist_ok=True)
records = []
for game in ("angler", "battery", "putt", "signal"):
    source = captures / f"{game}-scene.jpg"
    target = destination / f"{game}.webp"
    with Image.open(source) as image:
        image.convert("RGB").save(target, "WEBP", quality=90, method=6)
    records.append({
        "game": game,
        "source": str(source.relative_to(root)).replace("\\", "/"),
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "cover": str(target.relative_to(root)).replace("\\", "/"),
        "cover_sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "method": "CUA screenshot of running canvas; WEBP encoding only",
        "viewport": "default desktop viewport; DOM canvas bounds",
    })
(root / "assets/game-forms/polish-preview-sources.json").write_text(
    json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(f"Encoded {len(records)} actual runtime covers. Original covers preserved.")
