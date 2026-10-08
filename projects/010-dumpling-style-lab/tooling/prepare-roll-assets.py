"""Package authored limestone and preserve its built-in ImageGen source.

Only encoding and resizing are performed; no painting or image editing.
"""
from pathlib import Path
import json, shutil, hashlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('D:/codex/home/generated_images/01a102b4-6018-73d2-9a2d-4e3683ea76ec/exec-ec7440b7-a6d2-469b-a844-12989ed5a71d.png')
OUT = ROOT / 'web/assets/game-forms/roll'
ARCHIVE = ROOT / 'assets/game-forms/roll'
PROMPT = 'Use case: stylized-concept. Asset type: seamless tileable albedo texture for a premium miniature 3D game, stone walkway and architecture. Primary request: finely authored warm ivory limestone, elegant barely visible cream and cool grey veins, tiny natural pores, subtle broad tonal clouds, matte honed finish. Top-down flat material scan with fully uniform diffuse light. A single contiguous square limestone surface, no tile grid, no mortar, no borders, no objects, no text, no lettering, no perspective or bevels, no directional shadows, no bright highlights. Restrained low contrast, mostly off-white and warm cream, no yellow saturation. Opposing edges should match for seamless tiling. Texture only, not scene concept art. 1024 by 1024.'
OUT.mkdir(parents=True, exist_ok=True)
ARCHIVE.mkdir(parents=True, exist_ok=True)
shutil.copy2(SOURCE, ARCHIVE/'limestone-generated.png')
im = Image.open(SOURCE).convert('RGB')
im.resize((1024,1024),Image.Resampling.LANCZOS).save(OUT/'limestone.webp', quality=90, method=6)
manifest = {'generator':'builtin image_gen', 'prompt':PROMPT,'original':str(SOURCE),'archive':'assets/game-forms/roll/limestone-generated.png','runtime':'web/assets/game-forms/roll/limestone.webp','original_size':im.size,'runtime_size':[1024,1024],'original_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'conversion':'RGB, Lanczos 1024², WebP quality 90; no image edit'}
(ROOT/'notes/roll-assets-20261004.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'runtime':str(OUT/'limestone.webp'),'bytes':(OUT/'limestone.webp').stat().st_size}))
