from pathlib import Path
import json,hashlib,shutil,zipfile,struct
from PIL import Image
P=Path(__file__).resolve().parents[1];W=P/'web';S=P/'assets/game-forms/foundry-sources';A=W/'assets/game-forms/foundry';S.mkdir(exist_ok=True);A.mkdir(exist_ok=True)
manifest=[]
for item in json.loads((P/'tooling/foundry-asset-inputs.json').read_text(encoding='utf-8')):
 key=item['key'];original=S/(key+'.png');assert not original.exists();shutil.copy2(item['source'],original);im=Image.open(original);runtime=A/(key+'.webp');im.save(runtime,quality=94,method=6)
 manifest.append({**item,'source_png':original.relative_to(P).as_posix(),'runtime_webp':runtime.relative_to(P).as_posix(),'size':list(im.size),'mode':im.mode,'alpha_extrema':im.getchannel('A').getextrema() if 'A' in im.getbands() else None,'source_sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'runtime_sha256':hashlib.sha256(runtime.read_bytes()).hexdigest()})
im=Image.open(S/'maker-pieces.png').convert('RGBA');frames=[]
for y in range(2):
 for x in range(3):
  box=(round(x*im.width/3),round(y*im.height/2),round((x+1)*im.width/3),round((y+1)*im.height/2));alpha=im.crop(box).getchannel('A');bbox=alpha.point(lambda v:255 if v>18 else 0).getbbox();assert bbox
  frames.append([box[0]+bbox[0],box[1]+bbox[1],box[0]+bbox[2],box[1]+bbox[3]])
(W/'showcase-foundry-sprites.js').write_text('export const MAKER_SPRITES='+json.dumps(frames)+';\n',encoding='utf-8')
z=zipfile.ZipFile(P/'assets/game-forms/navigation-sources/kenney-space-kit.zip');models=[]
for name in ['rover','corridor_detailed','hangar_largeB','machine_generatorLarge']:
 b=z.read('Models/GLTF format/'+name+'.glb');(S/(name+'.glb')).write_bytes(b);(A/(name+'.glb')).write_bytes(b);models.append({'name':name,'source':'Existing original Kenney Space Kit zip','runtime':'web/assets/game-forms/foundry/'+name+'.glb','sha256':hashlib.sha256(b).hexdigest()})
shutil.copy2(W/'assets/game-forms/pilot/License.txt',A/'License-space-kit.txt')
(P/'assets/game-forms/foundry-generation.json').write_text(json.dumps({'mode':'built-in image_gen','images':manifest,'models':models,'sprite_frames':frames,'originals_unchanged':True},ensure_ascii=False,indent=2),encoding='utf-8')
b=(S/'rover.glb').read_bytes();j=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]]);print('rover nodes',j['nodes']);print('rover materials',[m.get('name') for m in j['materials']]);print('rover accessors',[(a.get('min'),a.get('max')) for a in j['accessors'] if a.get('type')=='VEC3']);print('Prepared',len(manifest),'images and',len(models),'authored 3D models')
