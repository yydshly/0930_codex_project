from pathlib import Path
import json,struct,zipfile
P=Path(__file__).resolve().parents[1];W=P/'web';A=W/'assets/game-forms/foundry'
for f in list(A.glob('*.glb'))+[W/'assets/showcase/blaster/crate-medium.glb']:
 b=f.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);print(f.name,j.get('images',[]))
 for im in j.get('images',[]):
  if 'uri' in im and not im['uri'].startswith('data:'):
   target=f.parent/im['uri']
   if not target.exists():
    z=zipfile.ZipFile(P/'assets/game-forms/navigation-sources/kenney-space-kit.zip');name='Models/GLTF format/'+im['uri'];assert name in z.namelist(),name;target.parent.mkdir(exist_ok=True,parents=True);target.write_bytes(z.read(name))
p=P/'tooling/export-foundry-scenes.mjs';s=p.read_text(encoding='utf-8');s=s.replace("new URL(typeof req==='string'?req:req.url)", "new URL(typeof req==='string'?req:req.url,'http://assets.local/')");p.write_text(s,encoding='utf-8')
print('Resolved every external GLB image dependency')
