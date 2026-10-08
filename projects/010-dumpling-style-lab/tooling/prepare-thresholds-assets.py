from pathlib import Path
from PIL import Image
import json,shutil,hashlib
P=Path(__file__).resolve().parents[1]
spec=json.loads((P/'tooling/thresholds-asset-inputs.json').read_text(encoding='utf-8'))+json.loads((P/'tooling/thresholds-asset-extra.json').read_text(encoding='utf-8'))
raw=P/'assets/game-forms/thresholds-sources';runtime=P/'web/assets/game-forms/thresholds'
raw.mkdir(parents=True,exist_ok=True);runtime.mkdir(parents=True,exist_ok=True)
records=[];sprites={}
for v in spec:
 dest=raw/(v['key']+'.png');shutil.copy2(v['source'],dest);im=Image.open(dest);out=runtime/(v['key']+'.webp');im.save(out,'WEBP',quality=95,method=6)
 r={**v,'savedSource':dest.relative_to(P).as_posix(),'runtime':out.relative_to(P).as_posix(),'size':im.size,'mode':im.mode,'sourceSHA256':hashlib.sha256(dest.read_bytes()).hexdigest(),'runtimeSHA256':hashlib.sha256(out.read_bytes()).hexdigest()}
 if v['key'] in ['walker','vessel','sphere','ledge']:
  assert im.mode=='RGBA';alpha=im.getchannel('A');assert alpha.getextrema()[0]==0;r['alphaExtrema']=alpha.getextrema();outline=alpha.point(lambda x:255 if x>=16 else 0);r['spriteBoundsThreshold']=16;r['spriteBounds']=outline.getbbox()
  if v['key']=='walker':
   cw=im.width//4;ch=im.height//2;bounds=[]
   for i in range(8):
    x=i%4*cw;y=i//4*ch;b=outline.crop((x,y,x+cw,y+ch)).getbbox();assert b;bounds.append([b[0]+x,b[1]+y,b[2]+x,b[3]+y])
   r['frames']=bounds;sprites[v['key']]=bounds
  else:sprites[v['key']]=r['spriteBounds']
 records.append(r)
(P/'assets/game-forms/thresholds-generation.json').write_text(json.dumps({'mode':'builtin image_gen','processing':'Unchanged PNG copies; WebP encoding only; alpha bounds metadata only.','assets':records},ensure_ascii=False,indent=2),encoding='utf-8')
(P/'web/showcase-thresholds-sprites.js').write_text('export const THRESHOLDS_SPRITES='+json.dumps(sprites)+';\n',encoding='utf-8')
print(json.dumps([{'key':r['key'],'size':r['size'],'mode':r['mode'],'alpha':r.get('alphaExtrema')} for r in records]))
