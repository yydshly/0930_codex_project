"""Fetch pinned engine sources and CC0 art packs; never execute downloaded tools."""
from pathlib import Path
import urllib.request, zipfile, json, re

ROOT=Path(__file__).resolve().parents[1]
SOURCES=ROOT/'assets/showcase/sources'
PUBLIC=ROOT/'web/assets/showcase'
SOURCES.mkdir(parents=True,exist_ok=True)
PUBLIC.mkdir(parents=True,exist_ok=True)

def get(url,dest):
    dest.parent.mkdir(parents=True,exist_ok=True)
    if not dest.exists():
        req=urllib.request.Request(url,headers={'User-Agent':'GameStyleLab/1.0'})
        with urllib.request.urlopen(req,timeout=90) as response:
            dest.write_bytes(response.read())
    return dest

packs={
 'blaster':'https://kenney.nl/media/pages/assets/blaster-kit/261d80a716-1753959510/kenney_blaster-kit_2.1.zip',
 'station':'https://kenney.nl/media/pages/assets/space-station-kit/6475288f2e-1712749919/kenney_space-station-kit.zip',
 'platform3d':'https://kenney.nl/media/pages/assets/platformer-kit/1585cf62b4-1775122253/kenney_platformer-kit.zip',
 'platform2d':'https://kenney.nl/media/pages/assets/new-platformer-pack/1896103897-1764756702/kenney_new-platformer-pack-1.1.zip',
 'town':'https://kenney.nl/media/pages/assets/tiny-town/a415fbeb49-1735736916/kenney_tiny-town.zip',
 'farm':'https://kenney.nl/media/pages/assets/tiny-farm/dfded1ae3e-1782913588/kenney_tiny-farm.zip'
}
manifest={}
for name,url in packs.items():
    archive=get(url,SOURCES/(name+'.zip'))
    with zipfile.ZipFile(archive) as z:
        names=z.namelist()
        chosen=[n for n in names if not n.endswith('/') and (n.lower().endswith('.glb') or n.endswith('/Textures/colormap.png') or 'license' in n.lower() or (name=='platform2d' and n.startswith('Sprites/')) or (name in ['town','farm'] and (n.startswith('Tiles/') or n.startswith('Tilemap/'))))]
        for n in chosen:
            target=PUBLIC/name/('Textures' if '/Textures/' in n else '')/Path(n).name
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(z.read(n))
        manifest[name]={'url':url,'license':'CC0-1.0','files':[Path(n).name for n in chosen]}
        print(name, len(chosen), 'files')
engine=ROOT/'web/vendor/showcase'
for name,url in {
 'three.module.js':'https://raw.githubusercontent.com/mrdoob/three.js/r160/build/three.module.js',
 'GLTFLoader.js':'https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/jsm/loaders/GLTFLoader.js',
 'BufferGeometryUtils.js':'https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/jsm/utils/BufferGeometryUtils.js',
 'SkeletonUtils.js':'https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/jsm/utils/SkeletonUtils.js',
 'LICENSE':'https://raw.githubusercontent.com/mrdoob/three.js/r160/LICENSE'
}.items():
    dest=get(url,engine/name)
    if name.endswith('.js'):
        source=dest.read_text(encoding='utf-8').replace("from 'three'","from './three.module.js'").replace("from '../utils/BufferGeometryUtils.js'","from './BufferGeometryUtils.js'")
        dest.write_text(source,encoding='utf-8')
(PUBLIC/'imported-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
