import hashlib,json,re,shutil
from pathlib import Path
from PIL import Image
P=Path(__file__).resolve().parents[1]
file=P/'assets/game-forms/gesture-generation-20261004.json'
data=json.loads(file.read_text(encoding='utf-8'))
raw=P/'assets/game-forms/gesture-sources';raw.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for asset in data['assets']:
    source=Path(re.search(r'as (D:\\[^\n]+?\.png)',asset['output_hint']).group(1))
    target=raw/(asset['key']+'.png');shutil.copy2(source,target)
    module='trace' if asset['key']=='mural' else 'swing'
    directory=P/f'web/assets/game-forms/{module}';directory.mkdir(exist_ok=True)
    output=directory/(asset['key']+'.webp')
    with Image.open(source) as im:
        im.save(output,format='WEBP',quality=94,method=6)
        asset['dimensions']=list(im.size);asset['mode']=im.mode
        if im.mode=='RGBA':asset['alpha_extrema']=list(im.getchannel('A').getextrema());asset['alpha_corners']=[im.getpixel(p)[3] for p in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]]
    asset.update(raw_file=str(target.relative_to(P)).replace('\\','/'),raw_sha256=sha(target),runtime_file=str(output.relative_to(P)).replace('\\','/'),runtime_sha256=sha(output),conversion='WebP encoding only, original dimensions and alpha preserved.')
file.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{k:a.get(k) for k in ['key','dimensions','mode','alpha_extrema','alpha_corners']} for a in data['assets']],indent=2))
