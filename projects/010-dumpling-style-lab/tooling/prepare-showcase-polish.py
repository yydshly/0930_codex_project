"""Prepare v2 authored bitmap props and selected CC0 audio samples."""
from pathlib import Path
from PIL import Image
import shutil, json, urllib.request, zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/showcase/sources'
OUT = ROOT / 'web/assets/showcase'
original = Path('D:/codex/home/generated_images/01a0f829-1d38-7672-a112-e0a52908ac0c/exec-08e81593-a301-4c08-9eeb-8851a37ad6f5.png')
shutil.copy2(original, SOURCE / 'afterdark-props-v2.png')
atlas = Image.open(original).convert('RGBA')
print('Prop alpha:', atlas.getchannel('A').getextrema())
for row in range(2):
    for col in range(3):
        cell = atlas.crop((col*atlas.width//3, row*atlas.height//2, (col+1)*atlas.width//3, (row+1)*atlas.height//2))
        bounds = cell.getchannel('A').getbbox()
        if bounds:
            cell = cell.crop(bounds)
        cell.save(OUT / f'rail-prop-{row*3+col}.webp', quality=94, method=6)

PACKS = {
    'rpg-audio': 'https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip',
    'interface-sounds': 'https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip'
}
SELECTED = {
    'rpg-audio':['knifeSlice.ogg','drawKnife1.ogg','metalPot1.ogg','metalLatch.ogg','doorOpen_1.ogg','bookFlip1.ogg','bookPlace1.ogg','handleCoins.ogg','footstep00.ogg','footstep01.ogg'],
    'interface-sounds':['confirmation_002.ogg','error_002.ogg','drop_002.ogg','switch_002.ogg','glass_002.ogg','click_002.ogg']
}
for name, url in PACKS.items():
    archive = SOURCE / (name+'.zip')
    if not archive.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=45) as response:
            archive.write_bytes(response.read())
    with zipfile.ZipFile(archive) as pack:
        files = [n for n in pack.namelist() if n.endswith(('.ogg', '.wav'))]
        print(name, json.dumps(files))
        target = OUT / 'audio' / name
        target.mkdir(parents=True, exist_ok=True)
        for n in pack.namelist():
            if n.endswith('License.txt'):
                (target/'License.txt').write_bytes(pack.read(n))
            elif Path(n).name in SELECTED[name]:
                (target/Path(n).name).write_bytes(pack.read(n))

metadata = ROOT/'notes/showcase-art.json'
data = json.loads(metadata.read_text(encoding='utf-8'))
data['provenance'] = 'Seven original AI-generated bitmap sheets; runtime images are cropped/compressed copies. Three-dimensional meshes, native pixel sprites and selected audio samples are imported from Kenney CC0 packs. Game layouts, effects and rules are implemented in code.'
if not any(a['name']=='afterdark-props-v2' for a in data['generatedAssets']):
    data['generatedAssets'].append({'name':'afterdark-props-v2', 'source':'assets/showcase/sources/afterdark-props-v2.png', 'runtimePattern':'web/assets/showcase/rail-prop-{0..5}.webp', 'generationBrief':'Transparent 3x2 adult cinematic railway prop atlas, using the original night scene as style reference. Teal battery, amber control cabinet, weathered freight crate, cloth evidence dossier, radio transmitter and railway warning lamp. Side-on crafted material details and isolated silhouettes.'})
for name in PACKS:
    if not any(a['pack']==name for a in data['imports']):
        data['imports'].append({'pack':name,'author':'Kenney','license':'CC0-1.0','source':'https://kenney.nl/assets/'+name})
metadata.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
