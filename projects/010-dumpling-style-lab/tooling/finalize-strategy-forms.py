from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
for game in ('command','bastion','tactics'):
    source=ROOT/'assets/game-forms/strategy-qa'/(game+'-playable.png')
    if source.exists():
        im=Image.open(source).convert('RGB');im.thumbnail((720,405),Image.Resampling.LANCZOS);im.save(ROOT/'web/assets/showcase/previews'/(game+'.webp'),quality=92,method=4)
baseline=json.loads((ROOT/'notes/strategy-preservation-before-20261003.json').read_text(encoding='utf-8'))
changed=[e['path'] for e in baseline['files'] if hashlib.sha256((ROOT/e['path']).read_bytes()).hexdigest()!=e['sha256']]
assert not changed,changed
(ROOT/'notes/strategy-preservation-20261003.json').write_text(json.dumps({'passed':True,'verifiedExistingFiles':len(baseline['files']),'changed':changed,'forms':22,'entries':31,'pending':3},indent=2),encoding='utf-8')
print('Preserved',len(baseline['files']),'existing art and frozen-version files')

# Keep executable regression checks aligned with the expanded catalog; historical reports remain intact.
path=ROOT/'tooling/check-game-forms.cjs';text=path.read_text(encoding='utf-8').replace('gameShowcase.total),28','gameShowcase.total),31').replace("('.form-card').count(),19","('.form-card').count(),22").replace("rhythm:'rhythm'}","rhythm:'rhythm',rts:'command','tower-defense':'bastion','turn-tactics':'tactics'}").replace('All 19 presentation types','All 22 presentation types');path.write_text(text,encoding='utf-8')
for name in ('check-arcade-forms.cjs','check-interaction-forms.cjs'):
    path=ROOT/'tooling'/name;text=path.read_text(encoding='utf-8').replace('gameShowcase.total),28','gameShowcase.total),31').replace("('.form-card').count(),19","('.form-card').count(),22").replace("('.pending-forms article').count(),6","('.pending-forms article').count(),3").replace("locator('option').count(),19","locator('option').count(),22").replace('Nineteen playable form cards, six genuinely pending forms','Twenty-two playable form cards, three genuinely pending forms').replace("document.querySelectorAll('.form-card').length===19","document.querySelectorAll('.form-card').length===22");path.write_text(text,encoding='utf-8')
