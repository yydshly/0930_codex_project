"""Inspect original scene PNGs without altering generated pixels."""
from pathlib import Path
from PIL import Image
import json, hashlib

p=Path(__file__).resolve().parents[1]
manifest=json.loads((p/'assets/directions/investigation-generation-20261005.json').read_text('utf-8'))
result={'date':'2026-10-05','mode':'read-only pixel size, source-byte identity and visually assigned normalized native hotspot mapping','assets':[]}
for item in manifest['assets']:
    file=p/item['file']
    source=Path(item['source'])
    with Image.open(file) as im:
        record={'key':item['key'],'file':item['file'],'size':list(im.size),'mode':im.mode,'format':im.format,'source_identical':source.read_bytes()==file.read_bytes(),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
        assert record['source_identical'] and record['format']=='PNG'
        assert im.width>=1280 and im.height>=700
    result['assets'].append(record)
result['hotspots']=manifest['hotspots']
result['notes']=['Generated illustrated records are not relied on for exact legible words, clock hands or clue content; each inspected object presents the authoritative original Chinese clue text in the native casebook.', 'Hotspots map to the actual image content coordinate system, not its letterboxed container.', 'No generated bitmap was resampled, composited or edited by this inspection script.']
(p/'notes/investigation-art-inspection-20261005.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
