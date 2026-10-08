"""Transcode accepted browser captures; preserve originals and crop only the recorded scene bounds."""
from pathlib import Path
from PIL import Image
import json

project=Path(__file__).resolve().parents[1]
captures=project/'assets/product'
for path in captures.glob('*.png'):
    image=Image.open(path).convert('RGB')
    image.save(path.with_suffix('.webp'),'WEBP',quality=94,method=6)
bounds=json.loads((captures/'capture-bounds.json').read_text(encoding='utf-8'))
image=Image.open(captures/'02-after.png').convert('RGB')
box=(max(0,round(bounds['left'])),max(0,round(bounds['top'])),min(image.width,round(bounds['right'])),min(image.height,round(bounds['bottom'])))
assert box[0]<box[2] and box[1]<box[3]
scene=image.crop(box)
scene.save(project/'web/assets/extension-moving-day.webp','WEBP',quality=94,method=6)
runtime=list((project/'web/assets/moving-day').glob('*.webp'))
assert len(runtime)==14
for path in runtime:
    frame=Image.open(path)
    if path.name.startswith('worker-'):
        assert frame.size==(256,256) and frame.mode=='RGBA'
        assert frame.getchannel('A').getextrema()[0]==0
print(json.dumps({'runtimeAssets':len(runtime),'runtimeBytes':sum(p.stat().st_size for p in runtime),'sceneCrop':box,'sourceScreenshot':image.size},ensure_ascii=False))
