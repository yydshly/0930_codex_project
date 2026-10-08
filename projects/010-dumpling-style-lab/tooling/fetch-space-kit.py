from pathlib import Path
import urllib.request,re,zipfile,json
ROOT=Path(__file__).resolve().parents[1]
url='https://kenney.nl/assets/space-kit'
page=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=35).read().decode()
links=re.findall(r'href=[\"\x27]([^\"\x27]+\.zip[^\"\x27]*)',page)
if not links:
    print('\n'.join(line.strip() for line in page.splitlines() if 'download' in line.lower() or '.zip' in line))
    raise SystemExit('Could not locate official archive')
archive=ROOT/'assets/game-forms/navigation-sources/kenney-space-kit.zip';archive.parent.mkdir(parents=True,exist_ok=True)
download=urllib.request.urljoin(url,links[0])
if not archive.exists():
    with urllib.request.urlopen(urllib.request.Request(download,headers={'User-Agent':'Mozilla/5.0'}),timeout=80) as response:archive.write_bytes(response.read())
with zipfile.ZipFile(archive) as z:
    models=[n for n in z.namelist() if n.lower().endswith('.glb')]
    print('\n'.join(models))
    licences=[n for n in z.namelist() if n.lower().endswith('license.txt')]
    target=ROOT/'web/assets/game-forms/pilot';target.mkdir(exist_ok=True)
    names=['craft_speederA','craft_speederB','craft_speederD','meteor_detailed','satelliteDish','turret_single','machine_generator','hangar_roundGlass']
    copied=[]
    for name in names:
        matches=[n for n in models if Path(n).stem==name]
        if matches:(target/(name+'.glb')).write_bytes(z.read(matches[0]));copied.append(name)
    for name in licences:(target/'License.txt').write_bytes(z.read(name))
    for name in z.namelist():
        if '/Textures/' in name and name.lower().endswith('.png') and '/GLTF' in name:
            texture=target/'Textures'/Path(name).name;texture.parent.mkdir(exist_ok=True);texture.write_bytes(z.read(name))
    print('Copied:',copied)
    (ROOT/'notes/navigation-models-20261003.json').write_text(json.dumps({'source':url,'download':download,'license':'CC0','archive':str(archive),'models':copied,'licenseSaved':bool(licences)},indent=2),encoding='utf-8')
