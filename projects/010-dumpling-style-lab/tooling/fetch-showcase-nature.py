"""Download artist-authored CC0 scenery, retaining its license and provenance."""
from pathlib import Path
import urllib.request, zipfile, json
ROOT=Path(__file__).resolve().parents[1]
url='https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip'
archive=ROOT/'assets/showcase/sources/nature.zip'
if not archive.exists():
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=60) as response:
        archive.write_bytes(response.read())
with zipfile.ZipFile(archive) as pack:
    names=pack.namelist()
    models=[n for n in names if n.endswith('.glb')]
    print(json.dumps([Path(n).name for n in models]))
    chosen=[n for n in names if n.endswith('.glb') or n.endswith('/Textures/colormap.png') or n.endswith('License.txt')]
    for n in chosen:
        target=ROOT/'web/assets/showcase/nature'/('Textures' if '/Textures/' in n else '')/Path(n).name
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(pack.read(n))
metadata=ROOT/'notes/showcase-art.json'
data=json.loads(metadata.read_text(encoding='utf-8'))
if not any(a['pack']=='nature' for a in data['imports']):
    data['imports'].append({'pack':'nature','author':'Kenney','license':'CC0-1.0','source':'https://kenney.nl/assets/nature-kit'})
metadata.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
manifest=ROOT/'web/assets/showcase/imported-manifest.json'
data=json.loads(manifest.read_text(encoding='utf-8'))
data['nature']={'url':url,'license':'CC0-1.0','files':[Path(n).name for n in chosen]}
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
