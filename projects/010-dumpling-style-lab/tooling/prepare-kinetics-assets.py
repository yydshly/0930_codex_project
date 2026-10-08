from pathlib import Path
from PIL import Image
import json, shutil, hashlib
P=Path(__file__).resolve().parents[1]
spec=json.loads((P/'tooling/kinetics-assets-input.json').read_text(encoding='utf-8'))
extra=P/'tooling/kinetics-assets-extra.json'
if extra.exists():spec+=json.loads(extra.read_text(encoding='utf-8'))
raw=P/'assets/game-forms/kinetics-sources'; runtime=P/'web/assets/game-forms/kinetics'
raw.mkdir(parents=True,exist_ok=True);runtime.mkdir(parents=True,exist_ok=True)
records=[];sprites={}
old=P/'assets/game-forms/kinetics-generation.json'
previous={v['key']:v for v in json.loads(old.read_text(encoding='utf-8'))['assets']} if old.exists() else {}
for v in spec:
 source=Path(v['source']);dest=raw/(v['key']+'.png');shutil.copy2(source,dest)
 im=Image.open(dest);out=runtime/(v['key']+'.webp')
 if not out.exists() or previous.get(v['key'],{}).get('sourceSHA256')!=hashlib.sha256(dest.read_bytes()).hexdigest():im.save(out,'WEBP',quality=95,method=6)
 record={**v,'savedSource':str(dest.relative_to(P)).replace('\\','/'),'runtime':str(out.relative_to(P)).replace('\\','/'),'size':im.size,'mode':im.mode,'sourceSHA256':hashlib.sha256(dest.read_bytes()).hexdigest(),'runtimeSHA256':hashlib.sha256(out.read_bytes()).hexdigest()}
 if v['key'] in ['courier','crew','explorer','clockbridge']:
  assert im.mode=='RGBA',(v['key'],'transparent source required')
  alpha=im.getchannel('A');record['alphaExtrema']=alpha.getextrema();record['alphaBounds']=alpha.getbbox()
  outline=alpha.point(lambda v:255 if v>=16 else 0);record['spriteBoundsThreshold']=16;record['spriteBounds']=outline.getbbox()
  assert alpha.getextrema()[0]==0,(v['key'],'background is not transparent')
  if v['key'] in ['crew','explorer']:
   cw=im.width//4;ch=im.height//2;bounds=[]
   for i in range(8):
    x=i%4*cw;y=i//4*ch;b=outline.crop((x,y,x+cw,y+ch)).getbbox();assert b
    bounds.append([b[0]+x,b[1]+y,b[2]+x,b[3]+y])
   record['frames']=bounds;sprites[v['key']]=bounds
  else:sprites[v['key']]=record['spriteBounds']
 if v.get('edit_source'):
  r=raw/(v['key']+'-before-edit.png');shutil.copy2(v['edit_source'],r);record['savedEditReference']=str(r.relative_to(P)).replace('\\','/')
 records.append(record)
(P/'assets/game-forms/kinetics-generation.json').write_text(json.dumps({'mode':'builtin image_gen','processing':'Copy unchanged PNG originals; WebP encoding only; alpha bounds metadata only.','assets':records},ensure_ascii=False,indent=2),encoding='utf-8')
(P/'web/showcase-kinetics-sprites.js').write_text('export const KINETICS_SPRITES='+json.dumps(sprites)+';\n',encoding='utf-8')
print(json.dumps([{'key':r['key'],'size':r['size'],'mode':r['mode'],'alpha':r.get('alphaExtrema')} for r in records]))
