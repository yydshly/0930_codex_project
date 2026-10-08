from pathlib import Path
import struct,json,zipfile,shutil,hashlib
P=Path(__file__).resolve().parents[1];W=P/'web';A=W/'assets/game-forms/foundry'
p=W/'showcase-foundry-scenes.js';s=p.read_text(encoding='utf-8');s=s.replace('scene.backgroundRotation.y=.55;','');s=s.replace("...await modelsAt('assets/game-forms/coast/',['pitsGarage','pylon','lightPostModern'])", "...await modelsAt(base,['pitsGarage','pylon','lightPostModern'])");p.write_text(s,encoding='utf-8')
for name in ['pitsGarage','pylon','lightPostModern']:
 f=W/'assets/game-forms/coast'/(name+'.glb');shutil.copy2(f,A/f.name);b=f.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);print(name,'image dependencies:',j.get('images',[]))
shutil.copy2(W/'assets/game-forms/coast/License.txt',A/'License-racing-kit.txt')
p=P/'tooling/export-foundry-scenes.mjs';s=p.read_text(encoding='utf-8').replace('skyRotation:.55','skyRotation:0');p.write_text(s,encoding='utf-8')
