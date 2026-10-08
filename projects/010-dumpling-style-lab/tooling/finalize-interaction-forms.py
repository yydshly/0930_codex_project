from pathlib import Path
from PIL import Image
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]
for name in ('duel','maze','rhythm'):
    source=ROOT/'assets/game-forms/interaction-qa'/(name+('-first.png' if name=='duel' else '-playable.png'))
    if source.exists():
        im=Image.open(source).convert('RGB');im.thumbnail((720,405),Image.Resampling.LANCZOS);im.save(ROOT/'web/assets/showcase/previews'/(name+'.webp'),quality=92,method=4)
# Preserve original art and the frozen version. New runtime art is additive.
baseline=json.loads((ROOT/'notes/style-preservation-20261003.json').read_text(encoding='utf-8'))
changed=[]
for entry in baseline['files']:
    target=ROOT/entry['path']
    if hashlib.sha256(target.read_bytes()).hexdigest()!=entry['sha256']:changed.append(entry['path'])
assert not changed,changed
report={'date':'2026-10-03','originalArtVerified':len(baseline['files']),'changedOriginalArt':changed,'frozenVersionFiles':len(list((ROOT/'web/versions/painted-20261002').rglob('*.*'))),'forms':19,'galleryEntries':28,'pendingForms':6}
(ROOT/'notes/interaction-preservation-20261003.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
test=ROOT/'tooling/check-arcade-forms.cjs';text=test.read_text(encoding='utf-8');text=text.replace('gameShowcase.total),25','gameShowcase.total),28').replace("('.form-card').count(),16","('.form-card').count(),19").replace("('.pending-forms article').count(),9","('.pending-forms article').count(),6").replace("locator('option').count(),16","locator('option').count(),19").replace('Sixteen playable form cards, nine genuinely pending forms','Nineteen playable form cards, six genuinely pending forms');test.write_text(text,encoding='utf-8')
page=ROOT/'web/showcase.html';text=page.read_text(encoding='utf-8').replace('<b>9</b>视角与界面','<b>12</b>视角与界面');page.write_text(text,encoding='utf-8')
print(json.dumps(report))
